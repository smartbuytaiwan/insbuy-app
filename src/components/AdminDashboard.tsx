
import React, { useState, useMemo, useRef } from 'react';
import { User, Product, View, Order, ShippingRule, ProductVariant, BankInfo, Category } from '../types'; 
import { generateMarketingCopy } from '../geminiService'; 
import API from '../api'; 
import CategoryManagement from './CategoryManagement';
import ShopSettings from './ShopSettings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminDashboardProps {
  user: User;
  products: Product[];
  orders: Order[]; // 賣出的訂單 (Sales)
  buyOrders?: Order[]; // 買入的訂單 (Purchases)
  categories: Category[];
  systemCategories?: Category[];
  onUpdateSystemCategories?: (cats: Category[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status'], cancellationReason?: string) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateUser: (user: User) => void;
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
}

const TAIWAN_BANKS = [
  { code: '004', name: '臺灣銀行' },
  { code: '005', name: '臺灣土地銀行' },
  { code: '006', name: '合作金庫商業銀行' },
  { code: '007', name: '第一商業銀行' },
  { code: '822', name: '中國信託商業銀行' },
  { code: '808', name: '玉山商業銀行' },
  { code: '700', name: '中華郵政' },
];

const COMMON_ORIGINS = ["台灣", "美國", "日本", "韓國", "中國", "馬來西亞", "越南", "印尼", "印度"];

const SHIPPING_PRESETS = [
  { name: '7-11', fee: 60 },
  { name: '全家', fee: 60 },
  { name: '萊爾富', fee: 60 },
  { name: 'OK超商', fee: 60 },
  { name: '蝦皮店到店', fee: 45 },
  { name: '中華郵政', fee: 80 },
  { name: '黑貓宅急便', fee: 170 },
  { name: '賣家宅配', fee: 100 },
  { name: '面交/自取', fee: 0 }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#EE4D2D'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, products, orders, buyOrders = [], categories, systemCategories = [], onUpdateSystemCategories, 
  onUpdateProducts, onUpdateOrderStatus, onUpdateCategories, onUpdateUser, onNavigate 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'create' | 'categories' | 'settings' | 'system_cats' | 'buying_account' | 'buying_orders' | 'buying_reports'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. 日期區間狀態 (新增) ---
  // 經營概況預設過去 7 天
  const [overviewRange, setOverviewRange] = useState({
    start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  // 訂單管理預設過去 30 天
  const [orderRange, setOrderRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // 賣家訂單狀態篩選 (新增)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // 買家功能相關 State
  const [buyOrderStatusFilter, setBuyOrderStatusFilter] = useState<string>('ALL');
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  // System Category State
  const [newSystemCatName, setNewSystemCatName] = useState('');

  const shopId = user.shop_id || user.id;

  // --- 2. 經營概況統計邏輯 (修改為依賴 overviewRange) ---
  const overviewData = useMemo(() => {
    const salesTrend = [];
    const statusCount: Record<string, number> = {};
    let totalSales = 0;
    let totalOrders = 0;

    const startDate = new Date(overviewRange.start);
    const endDate = new Date(overviewRange.end);
    
    // 建立每一天的數據結構
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      const dailyOrders = orders.filter(o => o.created_at.startsWith(dateStr) && o.status !== 'CANCELLED');
      const dailyTotal = dailyOrders.reduce((sum, o) => sum + o.total_amount, 0);
      
      salesTrend.push({ name: dateStr.slice(5), sales: dailyTotal, fullDate: dateStr });
      totalSales += dailyTotal;
      totalOrders += dailyOrders.length;
    }

    // 圓餅圖數據 (基於選取區間)
    orders.forEach(o => {
      const oDate = o.created_at.split('T')[0];
      if (oDate >= overviewRange.start && oDate <= overviewRange.end) {
        statusCount[o.status] = (statusCount[o.status] || 0) + 1;
      }
    });
    
    const pieData = Object.keys(statusCount).map(key => ({ name: key, value: statusCount[key] }));

    return { salesTrend, pieData, totalSales, totalOrders };
  }, [orders, overviewRange]);

  // --- 3. 訂單篩選邏輯 (修改為依賴 orderRange 和 statusFilter) ---
  const filteredOrders = useMemo(() => {
    const s = new Date(orderRange.start).getTime();
    const e = new Date(orderRange.end).getTime() + 86400000; // 包含結束日期的整天
    
    let list = orders.filter(o => {
      const t = new Date(o.created_at).getTime();
      return t >= s && t < e;
    });

    if (orderStatusFilter !== 'ALL') {
      list = list.filter(o => o.status === orderStatusFilter);
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, orderRange, orderStatusFilter]);

  // --- Buyer Logic ---
  const filteredBuyOrders = useMemo(() => {
    let list = [...buyOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (buyOrderStatusFilter !== 'ALL') {
      list = list.filter(o => o.status === buyOrderStatusFilter);
    }
    return list;
  }, [buyOrders, buyOrderStatusFilter]);

  const buyReportData = useMemo(() => {
    const s = new Date(reportStartDate).getTime();
    const e = new Date(reportEndDate).getTime() + 86400000;

    const validOrders = buyOrders.filter(o => {
      const time = new Date(o.created_at).getTime();
      return time >= s && time < e && o.status !== 'CANCELLED';
    });

    const totalSpending = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const dailyData: Record<string, number> = {};
    
    validOrders.forEach(o => {
      const dateStr = o.created_at.split('T')[0];
      dailyData[dateStr] = (dailyData[dateStr] || 0) + o.total_amount;
    });

    const chartData = Object.keys(dailyData).sort().map(date => ({
      date: date.slice(5),
      amount: dailyData[date]
    }));

    return { totalSpending, chartData };
  }, [buyOrders, reportStartDate, reportEndDate]);

  const buyQuickStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);

    const validOrders = buyOrders.filter(o => o.status !== 'CANCELLED');

    const today = validOrders
      .filter(o => o.created_at.startsWith(todayStr))
      .reduce((sum, o) => sum + o.total_amount, 0);

    const month = validOrders
      .filter(o => o.created_at.startsWith(thisMonthStr))
      .reduce((sum, o) => sum + o.total_amount, 0);

    const year = validOrders
      .filter(o => o.created_at.startsWith(thisYearStr))
      .reduce((sum, o) => sum + o.total_amount, 0);

    return { today, month, year };
  }, [buyOrders]);

  const getInitialForm = (): Partial<Product> => {
    const savedBank = localStorage.getItem('insbuy_saved_bank');
    let bankInfo: BankInfo | undefined = undefined;
    if (savedBank) {
      bankInfo = JSON.parse(savedBank);
    } else {
      bankInfo = { bank_name: '臺灣銀行', bank_code: '004', account_name: '', account_number: '' };
    }
    return {
      name: '',
      category_ids: [],
      description: '',
      price: 0,
      original_price: 0,
      images: [],
      status: 'OPEN',
      product_type: 'PHYSICAL', // 強制預設為實體
      digital_files: [],
      variants: [{ name: '預設', price: 0, stock: 100 }],
      shipping_rules: [],
      bank_info: bankInfo,
      questions: [],
      origin: '台灣',
      target_amount: 50000,
      current_amount: 0,
      end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
      is_pinned: false
    };
  };

  const [form, setForm] = useState<Partial<Product>>(getInitialForm());
  const [saveBank, setSaveBank] = useState(!!localStorage.getItem('insbuy_saved_bank'));
  
  const [selectedMainCat, setSelectedMainCat] = useState<string>('');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('');

  const addVariant = () => {
    setForm(prev => ({ ...prev, variants: [...(prev.variants || []), { name: '', price: 0, stock: 10 }] }));
  };

  const removeVariant = (index: number) => {
    setForm(prev => {
      const newVariants = [...(prev.variants || [])];
      newVariants.splice(index, 1);
      return { ...prev, variants: newVariants };
    });
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setForm(prev => {
      const newVariants = [...(prev.variants || [])];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const addShippingRule = (customName?: string, customFee?: number) => {
    const name = customName || '新運送方式';
    const fee = customFee !== undefined ? customFee : 60;
    const newRule: ShippingRule = { name, fee, free_threshold: 1000, limit_qty: 0, pickup_address: '' };
    setForm(prev => ({ ...prev, shipping_rules: [...(prev.shipping_rules || []), newRule] }));
  };

  const updateShippingRule = (index: number, field: keyof ShippingRule, value: any) => {
    setForm(prev => {
      const newRules = [...(prev.shipping_rules || [])];
      newRules[index] = { ...newRules[index], [field]: value };
      return { ...prev, shipping_rules: newRules };
    });
  };

  const removeShippingRule = (index: number) => {
     setForm(prev => {
      const newRules = [...(prev.shipping_rules || [])];
      newRules.splice(index, 1);
      return { ...prev, shipping_rules: newRules };
    });
  };

  const addQuestion = () => {
    setForm(prev => ({
      ...prev,
      questions: [...(prev.questions || []), { title: '', required: false }]
    }));
  };

  const updateQuestion = (index: number, field: 'title' | 'required', value: any) => {
    setForm(prev => {
      const newQs = [...(prev.questions || [])];
      newQs[index] = { ...newQs[index], [field]: value };
      return { ...prev, questions: newQs };
    });
  };

  const removeQuestion = (index: number) => {
    setForm(prev => {
      const newQs = [...(prev.questions || [])];
      newQs.splice(index, 1);
      return { ...prev, questions: newQs };
    });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      fileArray.forEach(file => {
        if (file.size > 100 * 1024 * 1024) return alert(`檔案 ${file.name} 太大`); // 100MB limit for video
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) setForm(prev => ({ ...prev, images: [...(prev.images || []), reader.result as string] }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAddCategoryTag = () => {
    let targetId = '';
    if (selectedSubCat) targetId = selectedSubCat;
    else if (selectedMainCat) targetId = selectedMainCat;
    else return;

    if (!form.category_ids?.includes(targetId)) {
      setForm(prev => ({
        ...prev,
        category_ids: [...(prev.category_ids || []), targetId]
      }));
    }
    setSelectedSubCat('');
    setSelectedMainCat('');
  };

  const removeCategoryTag = (idToRemove: string) => {
    setForm(prev => ({
      ...prev,
      category_ids: prev.category_ids?.filter(id => id !== idToRemove)
    }));
  };

  const getCategoryName = (id: string) => {
    const shopCat = categories.find(c => c.id === id);
    if (shopCat) return shopCat.name;
    const sysCat = systemCategories.find(c => c.id === id);
    if (sysCat) return sysCat.name;
    return id; 
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.price) return alert('請填寫商品名稱與價格');
    if (form.product_type === 'PHYSICAL' && (!form.shipping_rules || form.shipping_rules.length === 0)) {
       if(!confirm('您尚未設定任何運送方式，確定要發布嗎？')) return;
    }

    if (saveBank && form.bank_info) {
      localStorage.setItem('insbuy_saved_bank', JSON.stringify(form.bank_info));
    } else if (!saveBank) {
      localStorage.removeItem('insbuy_saved_bank');
    }

    const productData: Product = {
      ...getInitialForm(),
      ...form,
      id: editingId || `p-${Date.now()}`,
      shop_id: shopId,
      category_id: form.category_ids?.[0] || '',
      total_stock: form.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
    } as Product;

    try {
      if (editingId) {
        await API.updateProduct(productData);
        onUpdateProducts(products.map(p => p.id === editingId ? productData : p));
      } else {
        await API.createProduct(productData);
        onUpdateProducts([productData, ...products]);
      }
      resetForm();
      alert(editingId ? '商品修改成功！' : '商品已成功發布！');
    } catch (error) {
      alert('儲存失敗，請檢查後端連線');
    }
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setEditingId(null);
    setActiveTab('products');
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('確定要刪除此商品嗎？')) {
      try {
        await API.deleteProduct(id);
        onUpdateProducts(products.filter(i => i.id !== id));
      } catch (e) {
        alert('刪除失敗');
      }
    }
  };

  // 通知買家邏輯
  const notifyBuyer = (orderId: string, newStatus: string, receiverPhone: string) => {
    const msgs = JSON.parse(localStorage.getItem('insbuy_chat_messages') || '[]');
    const statusMap: Record<string, string> = {
      'PENDING': '待處理',
      'CONFIRMED': '已確認',
      'SHIPPED': '已出貨',
      'COMPLETED': '已完成',
      'CANCELLED': '已取消'
    };
    
    // 取得訂單資訊，組合訊息內容
    const targetOrder = orders.find(o => o.id === orderId);
    let itemsList = '';
    if (targetOrder) {
      itemsList = targetOrder.items.map(i => `• ${i.name} ${i.selectedVariant ? `(${i.selectedVariant})` : ''} x${i.qty}`).join('\n');
    }

    let text = `[系統通知]\n訂單編號：#${orderId.slice(-6)}\n目前狀態：${statusMap[newStatus] || newStatus}\n商品資訊：\n${itemsList}`;
    
    if (newStatus === 'COMPLETED') text += '\n\n感謝您的購買！收到商品後，請記得給予我們評價喔！';

    const newMessage = {
      id: `sys_${Date.now()}`,
      // 修正：使用 shop_id 作為發送者 (如果有的話)，因為買家是跟 Shop 聊天，不是跟 User ID
      senderId: user.shop_id || user.id, 
      receiverId: receiverPhone, // Buyer ID (Phone)
      text,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    msgs.push(newMessage);
    localStorage.setItem('insbuy_chat_messages', JSON.stringify(msgs));
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    let cancellationReason = '';
    
    if (newStatus === 'CANCELLED') {
      const input = prompt('請輸入取消原因：');
      if (input === null) return; // User cancelled the prompt
      cancellationReason = input;
    }

    onUpdateOrderStatus(orderId, newStatus, cancellationReason);
    
    // 取得該訂單的買家電話 (假設 phone 是買家 ID)
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      notifyBuyer(orderId, newStatus, targetOrder.receiver_phone);
    }
    
    if (newStatus === 'COMPLETED') {
      alert(`訂單 ${orderId} 已完成！\n系統已自動發送聊聊訊息通知買家。`);
    }
  };

  // 系統分類：新增
  const handleAddSystemCategory = (parentId: string | null = null) => {
    const name = parentId ? prompt("請輸入子分類名稱：") : newSystemCatName;
    if (!name || !name.trim()) return;

    const newCat: Category = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      shop_id: 'SYSTEM',
      name: name,
      parent_id: parentId,
      type: 'MANUAL',
      product_ids: [],
      auto_rules: {},
      sort_order: systemCategories.length,
      is_active: true,
      layout_style: 'STANDARD'
    };
    
    if (onUpdateSystemCategories) {
      onUpdateSystemCategories([...systemCategories, newCat]);
    }
    if (!parentId) setNewSystemCatName('');
  };

  // 系統分類：刪除
  const handleDeleteSystemCategory = (id: string) => {
    if (!confirm('確定要刪除此分類嗎？(包含其下所有子分類)')) return;
    
    const getAllChildren = (pId: string): string[] => {
      const children = systemCategories.filter(c => c.parent_id === pId);
      let ids = children.map(c => c.id);
      children.forEach(c => ids = [...ids, ...getAllChildren(c.id)]);
      return ids;
    };
    
    const idsToRemove = [id, ...getAllChildren(id)];
    const newCats = systemCategories.filter(c => !idsToRemove.includes(c.id));
    
    if (onUpdateSystemCategories) onUpdateSystemCategories(newCats);
  };

  // 系統分類：遞迴渲染
  const renderSystemCategoryTree = (parentId: string | null) => {
    const nodes = systemCategories.filter(c => c.parent_id === parentId);
    return nodes.map(node => (
      <div key={node.id} className="ml-4 mb-2">
         <div className="flex items-center gap-2 p-3 border rounded-xl bg-slate-50 hover:bg-white transition hover:shadow-sm">
            <span className="font-bold text-slate-700 flex-1">{node.name}</span>
            <button onClick={() => handleAddSystemCategory(node.id)} className="text-xs text-blue-500 hover:underline font-bold">
               + 子分類
            </button>
            <button onClick={() => handleDeleteSystemCategory(node.id)} className="text-slate-300 hover:text-red-500">
               <i className="fa-solid fa-trash-can"></i>
            </button>
         </div>
         {renderSystemCategoryTree(node.id)}
      </div>
    ));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in pb-20">
      <aside className="w-full md:w-64 space-y-2 shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <img src={user.logo || 'https://placehold.co/100'} className="w-10 h-10 rounded-xl object-cover bg-slate-100 border" />
            <div>
              <div className="font-bold text-slate-800 text-sm truncate">{user.shop_name || user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">ID: {shopId}</div>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'overview', icon: 'fa-chart-pie', label: '經營概況' },
              { id: 'orders', icon: 'fa-receipt', label: '訂單管理' },
              { id: 'products', icon: 'fa-box-open', label: '商品管理' },
              { id: 'categories', icon: 'fa-list-ul', label: '分類管理' },
              { id: 'settings', icon: 'fa-store', label: '商店設定' },
              { id: 'create', icon: 'fa-plus-circle', label: editingId ? '編輯商品' : '新增商品' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); if(item.id !== 'create') setEditingId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <i className={`fa-solid ${item.icon} w-5`}></i>
                {item.label}
              </button>
            ))}
            
            {user.role === 'ADMIN' && (
              <button 
                onClick={() => setActiveTab('system_cats')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'system_cats' ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <i className="fa-solid fa-sitemap w-5"></i>
                平台分類管理
              </button>
            )}

            {/* 個人買家專區分隔線與按鈕 */}
            <div className="pt-4 mt-4 border-t border-slate-100">
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 px-2">個人買家專區</div>
               {[
                 { id: 'buying_account', icon: 'fa-user', label: '我的帳戶' },
                 { id: 'buying_orders', icon: 'fa-bag-shopping', label: '購買清單' },
                 { id: 'buying_reports', icon: 'fa-chart-line', label: '我的報表' }
               ].map(item => (
                 <button 
                   key={item.id}
                   onClick={() => setActiveTab(item.id as any)}
                   className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                   <i className={`fa-solid ${item.icon} w-5`}></i>
                   {item.label}
                 </button>
               ))}
            </div>

            <div className="pt-4">
              <button
                onClick={() => onNavigate(View.SHOP, undefined, shopId)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50 hover:text-[#EE4D2D]"
              >
                <i className="fa-solid fa-shop w-5"></i>
                前往我的賣場
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <div className="flex-1 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2 md:mb-0">
                 <i className="fa-solid fa-chart-simple text-[#EE4D2D]"></i> 經營概況
               </h2>
               <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-500 font-bold px-2">統計區間:</span>
                  <input type="date" value={overviewRange.start} onChange={e => setOverviewRange({...overviewRange, start: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
                  <span className="text-slate-300">~</span>
                  <input type="date" value={overviewRange.end} onChange={e => setOverviewRange({...overviewRange, end: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">區間總銷售額</div>
                <div className="text-2xl font-black text-[#EE4D2D]">${overviewData.totalSales.toLocaleString()}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">區間訂單數</div>
                <div className="text-2xl font-black text-slate-800">{overviewData.totalOrders} <span className="text-sm text-slate-400">筆</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-arrow-trend-up text-[#EE4D2D]"></i> 銷售趨勢</h3>
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overviewData.salesTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip labelFormatter={(label, payload) => payload[0]?.payload.fullDate} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Line type="monotone" dataKey="sales" stroke="#EE4D2D" strokeWidth={3} dot={{r: 4, fill: '#EE4D2D', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-pie text-blue-500"></i> 訂單狀態 (區間內)</h3>
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overviewData.pieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {overviewData.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {overviewData.pieData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs text-slate-500">
                          <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                          {entry.name} ({entry.value})
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <ShopSettings user={user} onUpdateUser={onUpdateUser} />
        )}

        {activeTab === 'categories' && (
          <CategoryManagement 
            shopId={shopId} 
            categories={categories}
            products={products}
            onUpdateCategories={onUpdateCategories} 
          />
        )}

        {activeTab === 'system_cats' && user.role === 'ADMIN' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-sitemap text-[#EE4D2D]"></i> 平台首頁分類管理
            </h2>
            
            <div className="mb-6 flex gap-2">
               <input 
                 type="text" 
                 placeholder="輸入主分類名稱..." 
                 className="flex-1 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#EE4D2D]"
                 value={newSystemCatName}
                 onChange={e => setNewSystemCatName(e.target.value)}
               />
               <button onClick={() => handleAddSystemCategory(null)} className="px-6 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition">
                 <i className="fa-solid fa-plus mr-2"></i>新增主分類
               </button>
            </div>

            <div className="space-y-2">
               {renderSystemCategoryTree(null)}
            </div>
            
            <p className="mt-8 text-xs text-slate-400 text-center">* 您可以無限新增子分類，這些分類將會顯示在平台首頁供所有使用者篩選。</p>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
              <h2 className="text-xl font-bold text-slate-800 font-black">訂單管理系統 (銷售)</h2>
              <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-500 font-bold px-2">訂單日期:</span>
                  <input type="date" value={orderRange.start} onChange={e => setOrderRange({...orderRange, start: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
                  <span className="text-slate-300">~</span>
                  <input type="date" value={orderRange.end} onChange={e => setOrderRange({...orderRange, end: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
               </div>
            </div>

            {/* 新增訂單狀態篩選 */}
            <div className="flex overflow-x-auto pb-2 mb-6 gap-2 scrollbar-hide">
               {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'].map(status => (
                 <button
                   key={status}
                   onClick={() => setOrderStatusFilter(status)}
                   className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${orderStatusFilter === status ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                 >
                   {status === 'ALL' ? '全部' : status}
                 </button>
               ))}
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="py-20 text-center text-slate-300">
                  <i className="fa-regular fa-calendar-xmark text-4xl mb-4 block opacity-20"></i>
                  該日期區間或狀態下無訂單資料
                </div>
              ) : (
                filteredOrders.map(o => (
                  <div key={o.id} className="p-5 border border-slate-100 rounded-3xl hover:bg-slate-50 transition shadow-sm bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 mb-1">单號: {o.id}</div>
                        <div className="font-bold text-slate-800">{o.receiver_name} ({o.ship_method})</div>
                      </div>
                      <select 
                        className={`text-xs font-bold px-4 py-2 rounded-full outline-none border-none cursor-pointer ${
                          o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                          o.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 
                          o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}
                        value={o.status}
                        onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)}
                      >
                        <option value="PENDING">待處理</option>
                        <option value="CONFIRMED">已確認</option>
                        <option value="SHIPPED">已出貨</option>
                        <option value="COMPLETED">已完成</option>
                        <option value="CANCELLED">已取消</option>
                      </select>
                    </div>
                    <div className="space-y-2 mb-4">
                      {o.items.map((it, i) => (
                        <div key={i} className="text-xs text-slate-600 flex justify-between bg-slate-50/50 p-2 rounded-lg">
                          <span>{it.name} | {it.selectedVariant} x {it.qty}</span>
                          <span className="font-bold">${(it.finalPrice * it.qty).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                      <div className="text-[10px] text-slate-400">
                        <i className="fa-regular fa-clock mr-1"></i>
                        {new Date(o.created_at).toLocaleString()}
                      </div>
                      <div className="font-black text-[#EE4D2D] text-lg">總額 ${o.total_amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 font-black">您的商品列表</h2>
              <button onClick={() => setActiveTab('create')} className="px-5 py-2 primary-gradient text-white rounded-xl text-xs font-bold shadow-md">
                + 新增團購
              </button>
            </div>
            <div className="space-y-4">
              {products.length === 0 ? (
                <div className="py-20 text-center text-slate-300">
                   <p className="mb-2">目前沒有商品</p>
                </div>
              ) : (
                products.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition group">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border bg-slate-100">
                       <img src={p.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                         分類: {p.category_ids?.map(id => getCategoryName(id)).join(', ') || '未分類'}
                      </div>
                      <div className="text-xs text-[#EE4D2D] font-black mt-1">${p.price.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => { setEditingId(p.id); setForm(p); setActiveTab('create'); }} className="p-2 text-slate-400 hover:text-blue-500"><i className="fa-solid fa-pen-to-square"></i></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">{editingId ? '編輯商品資訊' : '發布新的團購'}</h2>
            
            <div className="max-w-3xl space-y-10">
              {/* Removed Digital Product Button */}
              
              {/* 1. 基本資訊 */}
              <section className="space-y-6">
                <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 1. 商品基本資訊</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">商品名稱</label>
                    <input type="text" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-[#EE4D2D]" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  
                  {/* 分類選擇 */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">商品分類 (可多選)</label>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                       <div className="flex flex-col md:flex-row gap-3">
                          <select 
                            className="flex-1 h-10 border border-slate-300 rounded-lg px-3 text-sm outline-none"
                            value={selectedMainCat}
                            onChange={(e) => {
                              setSelectedMainCat(e.target.value);
                              setSelectedSubCat('');
                            }}
                          >
                            <option value="">選擇主分類...</option>
                            <optgroup label="平台全域分類">
                              {systemCategories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </optgroup>
                            {categories.length > 0 && (
                              <optgroup label="我的賣場分類">
                                {categories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </optgroup>
                            )}
                          </select>

                          {selectedMainCat && (
                             <select
                               className="flex-1 h-10 border border-slate-300 rounded-lg px-3 text-sm outline-none"
                               value={selectedSubCat}
                               onChange={(e) => setSelectedSubCat(e.target.value)}
                             >
                                <option value="">選擇子分類 (可選)</option>
                                {systemCategories.filter(c => c.parent_id === selectedMainCat).map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                                {categories.filter(c => c.parent_id === selectedMainCat).map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                             </select>
                          )}

                          <button 
                            onClick={handleAddCategoryTag}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 disabled:opacity-50"
                            disabled={!selectedMainCat}
                          >
                            加入
                          </button>
                       </div>

                       <div className="flex flex-wrap gap-2">
                          {form.category_ids?.map(id => (
                            <div key={id} className="bg-white border border-[#EE4D2D] text-[#EE4D2D] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                               <span>{getCategoryName(id)}</span>
                               <button onClick={() => removeCategoryTag(id)} className="hover:text-red-500">
                                 <i className="fa-solid fa-xmark"></i>
                               </button>
                            </div>
                          ))}
                          {(!form.category_ids || form.category_ids.length === 0) && (
                            <span className="text-xs text-slate-400">尚未選擇分類</span>
                          )}
                       </div>
                    </div>
                  </div>

                  {/* 產地選擇 */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">商品產地</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {COMMON_ORIGINS.map(origin => (
                        <button 
                          key={origin}
                          onClick={() => setForm({ ...form, origin })}
                          className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${form.origin === origin ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                          {origin}
                        </button>
                      ))}
                      <button 
                        onClick={() => setForm({ ...form, origin: '' })} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${!COMMON_ORIGINS.includes(form.origin || '') ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                        其他
                      </button>
                    </div>
                    {!COMMON_ORIGINS.includes(form.origin || '') && (
                      <input 
                        type="text" 
                        placeholder="請輸入產地 (例如：泰國、越南...)"
                        className="w-full h-10 border border-slate-200 rounded-xl px-4 text-xs outline-none focus:border-[#EE4D2D]"
                        value={form.origin || ''}
                        onChange={e => setForm({ ...form, origin: e.target.value })}
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">團購基礎價</label>
                    <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm font-black text-[#EE4D2D]" value={form.price} onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">市場參考價</label>
                    <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm text-slate-400 line-through" value={form.original_price} onChange={e => setForm({...form, original_price: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">商品詳情文案</label>
                    <div className="relative">
                      <textarea className="w-full h-40 border border-slate-200 rounded-2xl p-5 text-sm outline-none resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                      <button onClick={async () => { setAiLoading(true); setForm({...form, description: await generateMarketingCopy(form.name || '', form.description || '')}); setAiLoading(false); }} className="absolute bottom-4 right-4 primary-gradient text-white text-[10px] px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                        {aiLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} AI 修飾
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex justify-between items-center border-b pb-2">
                  <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 2. 規格與庫存設定</div>
                  <button onClick={addVariant} className="text-[11px] font-bold text-blue-500 hover:underline">+ 新增規格選項</button>
                </div>
                <div className="space-y-3">
                  {form.variants?.map((v, i) => (
                    <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-center">
                       <input type="text" className="flex-1 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} placeholder="規格名稱" />
                       <input type="number" className="w-32 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.price} onChange={e => updateVariant(i, 'price', parseInt(e.target.value))} placeholder="加價" />
                       <input type="number" className="w-32 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.stock} onChange={e => updateVariant(i, 'stock', parseInt(e.target.value))} placeholder="庫存" />
                       <button onClick={() => removeVariant(i)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                 <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 3. 商品圖片與影片</div>
                 <div className="flex flex-wrap gap-4">
                    {form.images?.map((img, i) => (
                      <div key={i} className="w-24 h-24 border rounded-xl overflow-hidden relative group bg-slate-100">
                        {img.startsWith('data:video') || img.endsWith('.mp4') ? (
                          <video src={img} className="w-full h-full object-cover" />
                        ) : (
                          <img src={img} className="w-full h-full object-cover" />
                        )}
                        <button onClick={() => {
                           const newImgs = [...(form.images || [])];
                           newImgs.splice(i, 1);
                           setForm({...form, images: newImgs});
                        }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fa-solid fa-xmark text-xs"></i></button>
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-[#EE4D2D] hover:text-[#EE4D2D] gap-1">
                      <i className="fa-solid fa-photo-film text-xl"></i>
                      <span className="text-[10px]">新增照片/影片</span>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleMediaUpload} />
                    </button>
                 </div>
              </section>

               {/* Force physical display */}
               <section className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                     <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 4. 運送方式與費用</div>
                  </div>
                  
                  {/* 常用物流按鈕 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {SHIPPING_PRESETS.map((preset) => (
                      <button 
                        key={preset.name}
                        onClick={() => addShippingRule(preset.name, preset.fee)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition flex items-center gap-1"
                      >
                        <i className="fa-solid fa-plus"></i> {preset.name}
                      </button>
                    ))}
                    <button 
                      onClick={() => addShippingRule()} 
                      className="px-3 py-1.5 border border-dashed border-slate-300 text-slate-500 rounded-lg text-xs font-bold hover:border-slate-400 transition"
                    >
                      + 自訂物流
                    </button>
                  </div>

                  <div className="space-y-4">
                     {form.shipping_rules?.map((rule, i) => (
                       <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                             <div className="md:col-span-4">
                               <label className="text-[10px] font-bold text-slate-400 mb-1 block">運送名稱</label>
                               <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.name} onChange={e => updateShippingRule(i, 'name', e.target.value)} placeholder="例如：7-11取貨" />
                             </div>
                             <div className="md:col-span-2">
                               <label className="text-[10px] font-bold text-slate-400 mb-1 block">運費 (NT$)</label>
                               <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.fee} onChange={e => updateShippingRule(i, 'fee', parseInt(e.target.value))} placeholder="0" />
                             </div>
                             <div className="md:col-span-3">
                               <label className="text-[10px] font-bold text-slate-400 mb-1 block">滿多少免運 (0為不免運)</label>
                               <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.free_threshold} onChange={e => updateShippingRule(i, 'free_threshold', parseInt(e.target.value))} placeholder="0" />
                             </div>
                             <div className="md:col-span-2">
                               <label className="text-[10px] font-bold text-slate-400 mb-1 block">每箱限制 (件)</label>
                               <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.limit_qty} onChange={e => updateShippingRule(i, 'limit_qty', parseInt(e.target.value))} placeholder="無限制" />
                             </div>
                             <div className="md:col-span-1 flex justify-center pb-2">
                               <button onClick={() => removeShippingRule(i)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash-can text-lg"></i></button>
                             </div>
                          </div>
                          
                          {/* 自取地址欄位 (當名稱包含「自取」或「面交」時顯示) */}
                          {(rule.name.includes('自取') || rule.name.includes('面交')) && (
                            <div className="pt-2 border-t border-slate-100">
                              <label className="text-[10px] font-bold text-[#EE4D2D] mb-1 block"><i className="fa-solid fa-location-dot mr-1"></i>取貨地址說明</label>
                              <input 
                                type="text" 
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" 
                                value={rule.pickup_address || ''} 
                                onChange={e => updateShippingRule(i, 'pickup_address', e.target.value)} 
                                placeholder="請輸入詳細取貨地址或面交地點..." 
                              />
                            </div>
                          )}
                       </div>
                     ))}
                     {(!form.shipping_rules || form.shipping_rules.length === 0) && (
                       <div className="text-center text-xs text-slate-400 py-4">尚未設定運送方式</div>
                     )}
                  </div>
               </section>

               <section className="space-y-6">
                  <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 5. 匯款帳戶設定</div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2 flex items-center gap-2 mb-2">
                        <input type="checkbox" id="saveBank" checked={saveBank} onChange={e => setSaveBank(e.target.checked)} className="accent-[#EE4D2D]" />
                        <label htmlFor="saveBank" className="text-xs font-bold text-slate-600 cursor-pointer">記住此帳戶資訊供下次使用</label>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1 block">銀行代碼</label>
                       <select 
                         className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none"
                         value={form.bank_info?.bank_code}
                         onChange={e => {
                            const bank = TAIWAN_BANKS.find(b => b.code === e.target.value);
                            setForm(prev => ({...prev, bank_info: {...prev.bank_info!, bank_code: e.target.value, bank_name: bank?.name || ''}}));
                         }}
                       >
                          {TAIWAN_BANKS.map(b => (
                            <option key={b.code} value={b.code}>{b.code} {b.name}</option>
                          ))}
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1 block">銀行帳號</label>
                       <input 
                         type="text" 
                         className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none"
                         value={form.bank_info?.account_number}
                         onChange={e => setForm(prev => ({...prev, bank_info: {...prev.bank_info!, account_number: e.target.value}}))}
                         placeholder="請輸入帳號"
                       />
                     </div>
                     <div className="md:col-span-2">
                       <label className="text-xs font-bold text-slate-500 mb-1 block">戶名</label>
                       <input 
                         type="text" 
                         className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none"
                         value={form.bank_info?.account_name}
                         onChange={e => setForm(prev => ({...prev, bank_info: {...prev.bank_info!, account_name: e.target.value}}))}
                         placeholder="請輸入戶名"
                       />
                     </div>
                  </div>
               </section>

               <section className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 6. 顧客下單提問 (選填)</div>
                    <button onClick={addQuestion} className="text-[11px] font-bold text-blue-500 hover:underline">+ 新增問題</button>
                  </div>
                  <div className="space-y-3">
                     {form.questions?.map((q, i) => (
                       <div key={i} className="flex gap-3 items-center">
                          <input 
                            type="text" 
                            className="flex-1 h-10 border border-slate-200 rounded-xl px-4 text-xs" 
                            value={q.title} 
                            onChange={e => updateQuestion(i, 'title', e.target.value)} 
                            placeholder="例如：請問您從哪裡得知我們？" 
                          />
                          <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                             <input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, 'required', e.target.checked)} />
                             必填
                          </label>
                          <button onClick={() => removeQuestion(i)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                       </div>
                     ))}
                  </div>
               </section>
               
              <div className="flex gap-4 pt-10 border-t">
                <button onClick={resetForm} className="flex-1 h-14 rounded-2xl font-bold text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition">返回</button>
                <button onClick={handleSaveProduct} className="flex-[2] h-14 primary-gradient text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">
                  {editingId ? '確認修改' : '確認發布並開始團購'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ... (other tabs remain the same) ... */}
        {activeTab === 'buying_account' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">我的帳戶資料 (買家)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">會員名稱</label>
                    <div className="text-lg font-bold text-slate-700">{user.name}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">手機號碼</label>
                    <div className="text-lg font-bold text-slate-700">{user.phone}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">電子信箱</label>
                    <div className="text-lg font-bold text-slate-700">{user.email || '未設定'}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">會員 ID</label>
                    <div className="text-sm font-mono text-slate-500 bg-slate-50 px-3 py-1 rounded inline-block">{user.id}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">加入時間</label>
                    <div className="text-sm text-slate-600">{new Date(user.created_at).toLocaleString()}</div>
                 </div>
              </div>
           </div>
        )}

        {/* 2. Buying Orders (Integrated) */}
        {activeTab === 'buying_orders' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[600px]">
              <h2 className="text-2xl font-black text-slate-800 mb-6 border-l-4 border-slate-800 pl-4">購買清單</h2>
              
              <div className="flex overflow-x-auto pb-2 mb-6 gap-2 scrollbar-hide border-b border-slate-100">
                 {[
                   { id: 'ALL', label: '全部' },
                   { id: 'PENDING', label: '待付款' },
                   { id: 'CONFIRMED', label: '待出貨' },
                   { id: 'SHIPPED', label: '待收貨' },
                   { id: 'COMPLETED', label: '已完成' },
                   { id: 'CANCELLED', label: '取消/退款' },
                 ].map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setBuyOrderStatusFilter(tab.id)}
                     className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${buyOrderStatusFilter === tab.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                   >
                     {tab.label}
                   </button>
                 ))}
              </div>

              <div className="space-y-4">
                 {filteredBuyOrders.length === 0 ? (
                   <div className="py-20 text-center text-slate-300">
                      <i className="fa-solid fa-basket-shopping text-4xl mb-4 opacity-30"></i>
                      <p>此分類尚無訂單</p>
                   </div>
                 ) : (
                   filteredBuyOrders.map(order => (
                     <div key={order.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition bg-white">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">#{order.id.slice(-6)}</span>
                              <span className="text-xs font-bold text-slate-700">{order.store_name}</span>
                           </div>
                           <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                              {order.status}
                           </div>
                        </div>
                        <div className="space-y-3 mb-4">
                           {order.items.map((item, idx) => (
                             <div key={idx} className="flex gap-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                   <img src={item.images?.[0]} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="text-sm font-bold text-slate-800 truncate">{item.name}</div>
                                   <div className="text-xs text-slate-400 mt-1">{item.selectedVariant} x {item.qty}</div>
                                </div>
                                <div className="text-right">
                                   <div className="text-sm font-bold text-slate-700">${item.finalPrice.toLocaleString()}</div>
                                </div>
                             </div>
                           ))}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                           <div className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">訂單金額:</span>
                              <span className="text-lg font-black text-slate-800">${order.total_amount.toLocaleString()}</span>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        )}

        {/* 3. Buying Reports (Integrated) */}
        {activeTab === 'buying_reports' && (
           <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg">
                    <div className="text-xs font-bold opacity-80 mb-1">今日消費</div>
                    <div className="text-3xl font-black">${buyQuickStats.today.toLocaleString()}</div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 mb-1">本月消費</div>
                    <div className="text-3xl font-black text-slate-800">${buyQuickStats.month.toLocaleString()}</div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 mb-1">今年度消費</div>
                    <div className="text-3xl font-black text-slate-800">${buyQuickStats.year.toLocaleString()}</div>
                 </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                 <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <i className="fa-solid fa-chart-line text-slate-800"></i> 個人消費趨勢分析
                 </h2>
                 <div className="flex flex-wrap items-center gap-4 mb-8 bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-500">日期區間:</span>
                       <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                       <span className="text-slate-300">~</span>
                       <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <div className="flex-1 text-right">
                       <span className="text-sm font-bold text-slate-500 mr-2">區間總消費:</span>
                       <span className="text-2xl font-black text-slate-800">${buyReportData.totalSpending.toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="h-80 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={buyReportData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Line type="monotone" dataKey="amount" stroke="#1e293b" strokeWidth={3} dot={{r: 4, fill: '#1e293b', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
