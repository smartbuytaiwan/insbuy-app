
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
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'messages' | 'products' | 'analytics' | 'create'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
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

    const totalOrders = orders.length;
    return { todaySales, monthSales, totalOrders };
  }, [orders]);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 規格操作
  const addVariant = () => {
    setForm({
      ...form,
      variants: [...(form.variants || []), { name: '', price: 0, stock: 10 }]
    });
  };

  const removeVariant = (index: number) => {
    const newVariants = [...(form.variants || [])];
    newVariants.splice(index, 1);
    setForm({ ...form, variants: newVariants });
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...(form.variants || [])];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setForm({ ...form, variants: newVariants });
  };

  // 運費操作
  const addShippingRule = (customName?: string) => {
    const name = customName || '新運送方式';
    const newRule: ShippingRule = { name, fee: 60, free_threshold: 1000, limit_qty: 1 };
    setForm({ ...form, shipping_rules: [...(form.shipping_rules || []), newRule] });
  };

  // 圖片上傳操作 (Mock)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map((file, i) => URL.createObjectURL(file));
      setForm({ ...form, images: [...(form.images || []), ...newImages] });
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
    alert(editingId ? '修改成功' : '商品已成功上架！');
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 sticky top-24">
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
              { id: 'messages', icon: 'fa-comment-dots', label: '訊息中心' },
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
        {/* 頂部數據卡 */}
        {activeTab !== 'create' && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">今日銷售額</div>
              <div className="text-2xl font-black text-[#EE4D2D]">${stats.todaySales.toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">本月總銷售</div>
              <div className="text-2xl font-black text-slate-800">${stats.monthSales.toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hidden lg:block">
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">待處理訂單</div>
              <div className="text-2xl font-black text-slate-800">{orders.filter(o => o.status === 'PENDING').length}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-rocket text-[#EE4D2D]"></i> 商家概況
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-4">銷售趨勢</h3>
                  <div className="h-40 flex items-end justify-between px-2">
                    {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                      <div key={i} className="w-6 primary-gradient rounded-t-lg transition-all hover:opacity-80" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                   <h3 className="font-bold text-slate-700 mb-4">快速捷徑</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setActiveTab('create')} className="p-4 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-600 hover:border-[#EE4D2D] transition">新增商品</button>
                      <button onClick={() => setActiveTab('orders')} className="p-4 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-600 hover:border-[#EE4D2D] transition">查看訂單</button>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">商品管理</h2>
                <button onClick={() => setActiveTab('create')} className="px-6 py-2.5 bg-[#EE4D2D] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#d73211] transition flex items-center gap-2">
                  <i className="fa-solid fa-plus"></i> 新增商品
                </button>
              </div>
              <div className="space-y-4">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition">
                    <img src={p.images[0] || 'https://via.placeholder.com/80'} className="w-16 h-16 object-cover rounded-xl border" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                      <div className="text-xs text-[#EE4D2D] font-black mt-1">${p.price.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(p.id); setForm(p); setActiveTab('create'); }} className="p-2 text-slate-400 hover:text-blue-600 transition"><i className="fa-solid fa-pen-to-square"></i></button>
                      <button onClick={() => onUpdateProducts(products.filter(item => item.id !== p.id))} className="p-2 text-slate-400 hover:text-red-500 transition"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">{editingId ? '編輯商品' : '新增團購商品'}</h2>
              
              <div className="max-w-4xl space-y-12">
                {/* 1. 基本資訊 */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-[#EE4D2D] font-black uppercase tracking-widest text-xs">
                    <i className="fa-solid fa-info-circle"></i> 1. 基本資訊
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">商品名稱</label>
                      <input type="text" placeholder="輸入吸引人的商品名稱" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-[#EE4D2D] transition" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">基礎團購價</label>
                      <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm font-black text-[#EE4D2D]" value={form.price} onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">市售原價</label>
                      <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm text-slate-400 line-through" value={form.original_price} onChange={e => setForm({...form, original_price: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 ml-1">商品描述</label>
                      <div className="relative">
                        <textarea placeholder="詳細說明商品規格、特色、出貨時間等..." className="w-full h-40 border border-slate-200 rounded-2xl p-5 text-sm outline-none focus:border-[#EE4D2D] transition resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        <button onClick={async () => { setAiLoading(true); setForm({...form, description: await generateMarketingCopy(form.name || '', form.description || '')}); setAiLoading(false); }} className="absolute bottom-4 right-4 primary-gradient text-white text-[10px] px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                          {aiLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} AI 生成文案
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. 規格設定 */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#EE4D2D] font-black uppercase tracking-widest text-xs">
                      <i className="fa-solid fa-layer-group"></i> 2. 規格設定
                    </div>
                    <button onClick={addVariant} className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition">+ 新增規格</button>
                  </div>
                  <div className="space-y-3">
                    {form.variants?.map((v, i) => (
                      <div key={i} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-start md:items-center animate-fade-in">
                        <input type="text" placeholder="規格名稱 (如: 經典黑 M)" className="flex-1 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} />
                        <div className="flex gap-3 w-full md:w-auto">
                          <div className="flex-1 md:w-32">
                            <label className="text-[10px] text-slate-400 font-bold ml-1 uppercase">加價金額</label>
                            <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-xs font-bold text-[#EE4D2D]" value={v.price} onChange={e => updateVariant(i, 'price', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="flex-1 md:w-32">
                            <label className="text-[10px] text-slate-400 font-bold ml-1 uppercase">庫存數量</label>
                            <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.stock} onChange={e => updateVariant(i, 'stock', parseInt(e.target.value) || 0)} />
                          </div>
                          <button onClick={() => removeVariant(i)} className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-red-500 mt-5 md:mt-0"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3. 圖片上傳 */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-[#EE4D2D] font-black uppercase tracking-widest text-xs">
                    <i className="fa-solid fa-images"></i> 3. 圖片上傳 (正方形建議)
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {form.images?.map((img, i) => (
                      <div key={i} className="relative w-28 h-28 border rounded-2xl overflow-hidden group">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => {
                          const newImages = [...(form.images || [])];
                          newImages.splice(i, 1);
                          setForm({ ...form, images: newImages });
                        }} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-28 h-28 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-[#EE4D2D] hover:text-[#EE4D2D] transition"
                    >
                      <i className="fa-solid fa-camera text-2xl mb-1"></i>
                      <span className="text-[10px] font-bold">上傳圖片</span>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#EE4D2D] font-black uppercase tracking-widest text-xs">
                      <i className="fa-solid fa-truck-fast"></i> 4. 運送方式設定
                    </div>
                    <div className="flex gap-2">
                       {['7-11', '全家', '宅配', '自取'].map(t => (
                         <button key={t} onClick={() => addShippingRule(t)} className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded border hover:border-[#EE4D2D] transition">+ {t}</button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {form.shipping_rules?.map((rule, i) => (
                      <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <input type="text" className="font-bold text-slate-700 outline-none focus:text-[#EE4D2D]" value={rule.name} onChange={e => {
                            const newRules = [...(form.shipping_rules || [])];
                            newRules[i].name = e.target.value;
                            setForm({ ...form, shipping_rules: newRules });
                          }} />
                          <button onClick={() => {
                            const newRules = [...(form.shipping_rules || [])];
                            newRules.splice(i, 1);
                            setForm({ ...form, shipping_rules: newRules });
                          }} className="text-xs text-slate-300 hover:text-red-500 transition">移除</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">運費金額</label>
                             <input type="number" className="w-full h-10 border border-slate-100 rounded-xl px-4 text-xs font-bold" value={rule.fee} onChange={e => {
                               const newRules = [...(form.shipping_rules || [])];
                               newRules[i].fee = parseInt(e.target.value) || 0;
                               setForm({ ...form, shipping_rules: newRules });
                             }} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">滿額免運</label>
                             <input type="number" className="w-full h-10 border border-slate-100 rounded-xl px-4 text-xs" value={rule.free_threshold} onChange={e => {
                               const newRules = [...(form.shipping_rules || [])];
                               newRules[i].free_threshold = parseInt(e.target.value) || 0;
                               setForm({ ...form, shipping_rules: newRules });
                             }} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">每筆運費限購件數</label>
                             <input type="number" className="w-full h-10 border border-slate-100 rounded-xl px-4 text-xs" value={rule.limit_qty} onChange={e => {
                               const newRules = [...(form.shipping_rules || [])];
                               newRules[i].limit_qty = parseInt(e.target.value) || 1;
                               setForm({ ...form, shipping_rules: newRules });
                             }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 5. 收款資訊 */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-[#EE4D2D] font-black uppercase tracking-widest text-xs">
                    <i className="fa-solid fa-credit-card"></i> 5. 商家收款銀行設定
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">選擇銀行</label>
                        <select 
                          className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none bg-white"
                          value={form.bank_info?.bank_code || ''}
                          onChange={(e) => {
                            const bank = TAIWAN_BANKS.find(b => b.code === e.target.value);
                            setForm({
                              ...form,
                              bank_info: {
                                ...(form.bank_info || { account_name: '', account_number: '' }),
                                bank_code: bank?.code || '',
                                bank_name: bank?.name || ''
                              } as BankInfo
                            });
                          }}
                        >
                          <option value="">請選擇銀行</option>
                          {TAIWAN_BANKS.map(bank => (
                            <option key={bank.code} value={bank.code}>{bank.code} {bank.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">戶名</label>
                        <input type="text" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none bg-white" value={form.bank_info?.account_name || ''} onChange={e => setForm({
                          ...form,
                          bank_info: {
                            ...(form.bank_info || { bank_code: '', bank_name: '', account_number: '' }),
                            account_name: e.target.value
                          } as BankInfo
                        })} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 ml-1">銀行帳號</label>
                        <input type="text" placeholder="輸入銀行帳號 (僅限數字)" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none bg-white font-mono" value={form.bank_info?.account_number || ''} onChange={e => setForm({
                          ...form,
                          bank_info: {
                            ...(form.bank_info || { bank_code: '', bank_name: '', account_name: '' }),
                            account_number: e.target.value.replace(/\D/g, '')
                          } as BankInfo
                        })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                       <input type="checkbox" id="save-bank" checked={saveBank} onChange={e => setSaveBank(e.target.checked)} className="accent-[#EE4D2D]" />
                       <label htmlFor="save-bank" className="text-xs text-slate-500 font-bold cursor-pointer">儲存帳號以便下次填寫</label>
                    </div>
                  </div>
                </section>

                <div className="flex gap-4 pt-10 border-t">
                  <button onClick={resetForm} className="flex-1 h-14 rounded-2xl font-bold text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition">捨棄返回</button>
                  <button onClick={handleSaveProduct} className="flex-[2] h-14 primary-gradient text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">
                    確認發布商品
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
