
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Product, View, Order, ShippingRule, ProductVariant, BankInfo } from '../types';
import { generateMarketingCopy } from '../geminiService';

interface AdminDashboardProps {
  user: User;
  products: Product[];
  orders: Order[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onNavigate: (view: View) => void;
}

const TAIWAN_BANKS = [
  { code: '004', name: '臺灣銀行' },
  { code: '005', name: '臺灣土地銀行' },
  { code: '006', name: '合作金庫商業銀行' },
  { code: '007', name: '第一商業銀行' },
  { code: '008', name: '華南商業銀行' },
  { code: '009', name: '彰化商業銀行' },
  { code: '011', name: '上海商業儲蓄銀行' },
  { code: '012', name: '台北富邦商業銀行' },
  { code: '013', name: '國泰世華商業銀行' },
  { code: '017', name: '兆豐國際商業銀行' },
  { code: '700', name: '中華郵政' },
  { code: '812', name: '台新國際商業銀行' },
  { code: '822', name: '中國信託商業銀行' },
  { code: '808', name: '玉山商業銀行' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, products, orders, onUpdateProducts, onUpdateOrderStatus, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'messages' | 'products' | 'create'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 需求 5: 訂單日期篩選狀態 (預設為今天)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // 商家統計數據
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const todaySales = orders
      .filter(o => o.created_at.startsWith(todayStr) && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total_amount, 0);
      
    const monthSales = orders
      .filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && o.status !== 'CANCELLED';
      })
      .reduce((sum, o) => sum + o.total_amount, 0);

    return { todaySales, monthSales };
  }, [orders]);

  // 需求 5: 過濾後的訂單列表與當日小計
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.created_at.startsWith(filterDate));
  }, [orders, filterDate]);

  const dailyTotal = useMemo(() => {
    return filteredOrders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total_amount, 0);
  }, [filteredOrders]);

  // 表單初始狀態
  const getInitialForm = (): Partial<Product> => {
    const savedBank = localStorage.getItem('insbuy_saved_bank');
    let bankInfo = undefined;
    if (savedBank) {
      bankInfo = JSON.parse(savedBank);
    }

    return {
      name: '',
      description: '',
      price: 0,
      original_price: 0,
      images: [],
      status: 'OPEN',
      variants: [{ name: '預設', price: 0, stock: 100 }],
      shipping_rules: [],
      bank_info: bankInfo,
      target_amount: 50000,
      current_amount: 0,
      end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
      is_pinned: false
    };
  };

  const [form, setForm] = useState<Partial<Product>>(getInitialForm());
  const [saveBank, setSaveBank] = useState(!!localStorage.getItem('insbuy_saved_bank'));

  // 規格操作
  const addVariant = () => {
    setForm(prev => ({
      ...prev,
      variants: [...(prev.variants || []), { name: '', price: 0, stock: 10 }]
    }));
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

  // 運費操作
  const addShippingRule = (customName?: string) => {
    const name = customName || '新運送方式';
    const newRule: ShippingRule = { name, fee: 60, free_threshold: 1000, limit_qty: 1 };
    setForm(prev => ({ ...prev, shipping_rules: [...(prev.shipping_rules || []), newRule] }));
  };

  // 圖片上傳
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const newImages = fileArray.map(file => URL.createObjectURL(file));
      setForm(prev => ({ ...prev, images: [...(prev.images || []), ...newImages] }));
    }
  };

  const handleSaveProduct = () => {
    if (!form.name || !form.price) return alert('請填寫商品名稱與價格');
    
    // 儲存銀行資訊
    if (saveBank && form.bank_info) {
      localStorage.setItem('insbuy_saved_bank', JSON.stringify(form.bank_info));
    } else if (!saveBank) {
      localStorage.removeItem('insbuy_saved_bank');
    }

    const productData: Product = {
      ...getInitialForm(),
      ...form,
      id: editingId || `p-${Date.now()}`,
      shop_id: user.shop_id || 'S001',
      total_stock: form.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
    } as Product;

    if (editingId) {
      onUpdateProducts(products.map(p => p.id === editingId ? productData : p));
    } else {
      onUpdateProducts([productData, ...products]);
    }
    resetForm();
    alert(editingId ? '商品修改成功！' : '商品已成功發布！');
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setEditingId(null);
    setActiveTab('products');
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in pb-20">
      {/* 左側導航 */}
      <aside className="w-full md:w-64 space-y-2 shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white font-bold">{user.name[0]}</div>
            <div>
              <div className="font-bold text-slate-800 text-sm truncate">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">ID: {user.shop_id}</div>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'overview', icon: 'fa-chart-pie', label: '經營概況' },
              { id: 'orders', icon: 'fa-receipt', label: '訂單管理' },
              { id: 'products', icon: 'fa-box-open', label: '商品管理' },
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
          </nav>
        </div>
      </aside>

      {/* 右側內容 */}
      <div className="flex-1 space-y-6">
        {activeTab !== 'create' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">今日銷售</div>
              <div className="text-2xl font-black text-[#EE4D2D]">${stats.todaySales.toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">本月銷售</div>
              <div className="text-2xl font-black text-slate-800">${stats.monthSales.toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-rocket text-[#EE4D2D]"></i> 歡迎回來，{user.name}
              </h2>
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
                這裡將顯示您的銷售趨勢圖表與經營分析。
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="p-8">
              {/* 需求 5: 訂單篩選標題與日期選擇器 */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-xl font-bold text-slate-800 font-black">訂單管理系統</h2>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">日期查詢</span>
                  <input 
                    type="date" 
                    className="bg-transparent text-sm font-bold outline-none text-slate-700" 
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                  />
                </div>
              </div>

              {/* 需求 5: 當日統計區塊 */}
              <div className="mb-8 p-4 bg-[#FFEEEC] rounded-2xl border border-[#EE4D2D]/10 flex justify-between items-center">
                <div className="text-xs font-bold text-slate-600">
                  <span className="text-[#EE4D2D]">{filterDate}</span> 訂單總計: <span className="font-black ml-1">{filteredOrders.length} 筆</span>
                </div>
                <div className="text-sm font-black text-[#EE4D2D]">
                  當日營收: ${dailyTotal.toLocaleString()}
                </div>
              </div>

              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="py-20 text-center text-slate-300">
                    <i className="fa-regular fa-calendar-xmark text-4xl mb-4 block opacity-20"></i>
                    該日期尚無訂單資料
                  </div>
                ) : (
                  filteredOrders.map(o => (
                    <div key={o.id} className="p-5 border border-slate-100 rounded-3xl hover:bg-slate-50 transition shadow-sm bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 mb-1">單號: {o.id}</div>
                          <div className="font-bold text-slate-800">{o.receiver_name} ({o.ship_method})</div>
                        </div>
                        <select 
                          className={`text-xs font-bold px-4 py-2 rounded-full outline-none border-none cursor-pointer ${
                            o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                            o.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 
                            o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                          }`}
                          value={o.status}
                          onChange={e => onUpdateOrderStatus(o.id, e.target.value as any)}
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
                          {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {o.store_name}
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
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 font-black">您的商品列表</h2>
                <button onClick={() => setActiveTab('create')} className="px-5 py-2 primary-gradient text-white rounded-xl text-xs font-bold shadow-md">
                  + 新增團購
                </button>
              </div>
              <div className="space-y-4">
                {products.length === 0 ? (
                  <div className="py-20 text-center text-slate-300">目前沒有商品，快去上架吧！</div>
                ) : (
                  products.map(p => (
                    <div key={p.id} className="flex items-center gap-4 p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition group">
                      <img src={p.images[0] || 'https://via.placeholder.com/100'} className="w-16 h-16 object-cover rounded-xl border" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                        <div className="text-xs text-[#EE4D2D] font-black mt-1">${p.price.toLocaleString()}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => { setEditingId(p.id); setForm(p); setActiveTab('create'); }} className="p-2 text-slate-400 hover:text-blue-500"><i className="fa-solid fa-pen-to-square"></i></button>
                        <button onClick={() => onUpdateProducts(products.filter(i => i.id !== p.id))} className="p-2 text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="p-8">
              <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">{editingId ? '編輯商品資訊' : '發布新的團購'}</h2>
              
              <div className="max-w-3xl space-y-10">
                {/* 1. 基本資訊 */}
                <section className="space-y-6">
                  <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 1. 商品基本資訊</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 mb-2 block">商品名稱</label>
                      <input type="text" placeholder="輸入吸引人的商品標題..." className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-[#EE4D2D] transition" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
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
                        <textarea placeholder="描述您的商品特色、尺寸、材質..." className="w-full h-40 border border-slate-200 rounded-2xl p-5 text-sm outline-none focus:border-[#EE4D2D] transition resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        <button onClick={async () => { setAiLoading(true); setForm({...form, description: await generateMarketingCopy(form.name || '', form.description || '')}); setAiLoading(false); }} className="absolute bottom-4 right-4 primary-gradient text-white text-[10px] px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                          {aiLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} AI 修飾文案
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. 規格與庫存 */}
                <section className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 2. 規格與庫存設定</div>
                    <button onClick={addVariant} className="text-[11px] font-bold text-blue-500 hover:underline">+ 新增規格選項</button>
                  </div>
                  <div className="space-y-3">
                    {form.variants?.map((v, i) => (
                      <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-center animate-fade-in-up">
                        <div className="flex-1 min-w-[150px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">規格名稱 (如: 黑色 L)</label>
                          <input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} />
                        </div>
                        <div className="w-32">
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">加價 (0 為原價)</label>
                          <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-xs font-bold text-[#EE4D2D]" value={v.price} onChange={e => updateVariant(i, 'price', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="w-32">
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">庫存量</label>
                          <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.stock} onChange={e => updateVariant(i, 'stock', parseInt(e.target.value) || 0)} />
                        </div>
                        <button onClick={() => removeVariant(i)} className="p-2 text-slate-300 hover:text-red-500 mt-4"><i className="fa-solid fa-xmark"></i></button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3. 圖片展示 */}
                <section className="space-y-6">
                  <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 3. 商品圖片 (支援手機拍照)</div>
                  <div className="flex flex-wrap gap-4">
                    {form.images?.map((img, i) => (
                      <div key={i} className="relative w-24 h-24 border rounded-2xl overflow-hidden shadow-sm group">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => {
                          const newImgs = [...(form.images || [])];
                          newImgs.splice(i, 1);
                          setForm({...form, images: newImgs});
                        }} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-[#EE4D2D] hover:text-[#EE4D2D] transition"
                    >
                      <i className="fa-solid fa-plus text-xl mb-1"></i>
                      <span className="text-[10px] font-bold">上傳/拍照</span>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageUpload} 
                      />
                    </button>
                  </div>
                </section>

                {/* 4. 運費設定 */}
                <section className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 4. 運送方式設定</div>
                    <div className="flex gap-2">
                       {['7-11', '全家', '宅配', '自取', '自定義'].map(t => (
                         <button key={t} onClick={() => addShippingRule(t === '自定義' ? '' : t)} className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full hover:bg-[#EE4D2D] hover:text-white transition">+ {t}</button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {form.shipping_rules?.length === 0 && <div className="text-xs text-slate-400 italic">請至少新增一種運送方式</div>}
                    {form.shipping_rules?.map((rule, i) => (
                      <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4 animate-fade-in-up">
                        <div className="flex justify-between items-center">
                          <input type="text" placeholder="運送名稱 (如: 7-11 取貨)" className="font-bold text-slate-700 outline-none focus:text-[#EE4D2D] border-b border-transparent focus:border-[#EE4D2D]" value={rule.name} onChange={e => {
                            const newRules = [...(form.shipping_rules || [])];
                            newRules[i].name = e.target.value;
                            setForm({ ...form, shipping_rules: newRules });
                          }} />
                          <button onClick={() => {
                            const newRules = [...(form.shipping_rules || [])];
                            newRules.splice(i, 1);
                            setForm({ ...form, shipping_rules: newRules });
                          }} className="text-[10px] text-slate-300 hover:text-red-500 transition font-bold uppercase tracking-widest">移除</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">基本運費</label>
                             <input type="number" className="w-full h-10 border border-slate-100 rounded-xl px-4 text-xs font-bold" value={rule.fee} onChange={e => {
                               const newRules = [...(form.shipping_rules || [])];
                               newRules[i].fee = parseInt(e.target.value) || 0;
                               setForm({ ...form, shipping_rules: newRules });
                             }} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">滿額免運門檻</label>
                             <input type="number" className="w-full h-10 border border-slate-100 rounded-xl px-4 text-xs" value={rule.free_threshold} onChange={e => {
                               const newRules = [...(form.shipping_rules || [])];
                               newRules[i].free_threshold = parseInt(e.target.value) || 0;
                               setForm({ ...form, shipping_rules: newRules });
                             }} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">每筆上限件數</label>
                             <input type="number" className="w-full h-10 border border-slate-100 rounded-xl px-4 text-xs" value={rule.limit_qty} onChange={e => {
                               const newRules = [...(form.shipping_rules || [])];
                               newRules[i].limit_qty = parseInt(e.target.value) || 1;
                               setForm({ ...form, shipping_rules: newRules });
                             }} />
                          </div>
                        </div>
                        {/* 自取地址輸入框：當名稱包含「自取」時顯示 */}
                        {(rule.name.includes('自取') || rule.name.toLowerCase().includes('pickup')) && (
                          <div className="pt-2 animate-fade-in-up">
                            <label className="text-[10px] font-bold text-[#EE4D2D] uppercase tracking-widest block mb-1">
                              <i className="fa-solid fa-location-dot mr-1"></i> 請輸入取貨詳細地點 / 地址
                            </label>
                            <input 
                              type="text" 
                              placeholder="例如：台中市西屯區... (或 面交地點描述)"
                              className="w-full h-11 bg-orange-50/50 border border-orange-100 rounded-xl px-4 text-xs outline-none focus:border-[#EE4D2D]"
                              value={rule.pickup_address || ''}
                              onChange={e => {
                                const newRules = [...(form.shipping_rules || [])];
                                newRules[i].pickup_address = e.target.value;
                                setForm({ ...form, shipping_rules: newRules });
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* 5. 銀行收款 */}
                <section className="space-y-6">
                  <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 5. 收款銀行帳號 (台灣常用銀行)</div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">選擇收款銀行</label>
                        <select 
                          className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none bg-white"
                          value={form.bank_info?.bank_code || ''}
                          onChange={(e) => {
                            const bank = TAIWAN_BANKS.find(b => b.code === e.target.value);
                            setForm(prev => ({
                              ...prev,
                              bank_info: {
                                ...(prev.bank_info || { account_name: '', account_number: '' }),
                                bank_code: bank?.code || '',
                                bank_name: bank?.name || ''
                              } as BankInfo
                            }));
                          }}
                        >
                          <option value="">-- 請選擇銀行 --</option>
                          {TAIWAN_BANKS.map(bank => (
                            <option key={bank.code} value={bank.code}>{bank.code} {bank.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">帳戶姓名 (戶名)</label>
                        <input type="text" placeholder="輸入真實姓名" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none bg-white" value={form.bank_info?.account_name || ''} onChange={e => setForm(prev => ({
                          ...prev,
                          bank_info: {
                            ...(prev.bank_info || { bank_code: '', bank_name: '', account_number: '' }),
                            account_name: e.target.value
                          } as BankInfo
                        }))} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">匯款帳號</label>
                        <input type="text" placeholder="請輸入純數字帳號" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none bg-white font-mono" value={form.bank_info?.account_number || ''} onChange={e => setForm(prev => ({
                          ...prev,
                          bank_info: {
                            ...(prev.bank_info || { bank_code: '', bank_name: '', account_name: '' }),
                            account_number: e.target.value.replace(/\D/g, '')
                          } as BankInfo
                        }))} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                       <input type="checkbox" id="save-bank" checked={saveBank} onChange={e => setSaveBank(e.target.checked)} className="accent-[#EE4D2D] w-4 h-4" />
                       <label htmlFor="save-bank" className="text-xs text-slate-500 font-bold cursor-pointer select-none">儲存此銀行資訊，下次上架時自動帶入</label>
                    </div>
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
