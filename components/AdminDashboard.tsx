
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, Product, View, ProductVariant, Order, ShippingRule } from '../types';
import { generateMarketingCopy } from '../geminiService';

interface AdminDashboardProps {
  user: User;
  products: Product[];
  orders: Order[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onNavigate: (view: View) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, products, orders, onUpdateProducts, onUpdateOrderStatus, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'messages' | 'products' | 'analytics' | 'create'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // 商家統計數據
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().getMonth();
    
    const todaySales = orders
      .filter(o => o.created_at.startsWith(today) && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total_amount, 0);
      
    const monthSales = orders
      .filter(o => new Date(o.created_at).getMonth() === thisMonth && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total_amount, 0);

    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? Math.floor(monthSales / totalOrders) : 0;
    const totalCustomers = new Set(orders.map(o => o.receiver_phone)).size;

    return { todaySales, monthSales, totalOrders, avgOrderValue, totalCustomers };
  }, [orders]);

  // 新增/編輯商品表單
  const initialForm: Partial<Product> = {
    name: '',
    description: '',
    price: 0,
    original_price: 0,
    images: ['https://picsum.photos/id/100/600/600'],
    status: 'OPEN',
    variants: [{ name: '預設', price: 0, stock: 100 }],
    shipping_rules: [],
    target_amount: 50000,
    current_amount: 0,
    end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    is_pinned: false
  };

  const [form, setForm] = useState<Partial<Product>>(initialForm);
  const [savedPickupAddress, setSavedPickupAddress] = useState(localStorage.getItem('insbuy_pickup_addr') || '');

  const handleSaveProduct = () => {
    if (!form.name || !form.price) return alert('請填寫商品名稱與價格');
    const productData: Product = {
      ...initialForm,
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
    setForm(initialForm);
    setEditingId(null);
    setActiveTab('products');
  };

  const addShippingRule = (name: string) => {
    if (form.shipping_rules?.some(r => r.name === name)) return;
    const newRule: ShippingRule = { 
      name, 
      fee: 60, 
      free_threshold: 1000, 
      limit_qty: 1,
      pickup_address: name === '自取' ? savedPickupAddress : undefined 
    };
    setForm({ ...form, shipping_rules: [...(form.shipping_rules || []), newRule] });
  };

  const updateShippingRule = (idx: number, key: keyof ShippingRule, val: any) => {
    const rules = [...(form.shipping_rules || [])];
    rules[idx] = { ...rules[idx], [key]: val };
    if (rules[idx].name === '自取' && key === 'pickup_address') {
      setSavedPickupAddress(val);
      localStorage.setItem('insbuy_pickup_addr', val);
    }
    setForm({ ...form, shipping_rules: rules });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in pb-20">
      {/* 左側導航欄 */}
      <aside className="w-full md:w-64 space-y-2 shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white font-bold">
              {user.name[0]}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm truncate">{user.name}</div>
              <div className="text-[10px] text-slate-400">商家 ID: {user.shop_id}</div>
            </div>
          </div>
          
          <nav className="space-y-1">
            {[
              { id: 'overview', icon: 'fa-chart-pie', label: '經營概況' },
              { id: 'orders', icon: 'fa-receipt', label: '訂單管理' },
              { id: 'messages', icon: 'fa-comment-dots', label: '訊息中心' },
              { id: 'products', icon: 'fa-box-open', label: '商品管理' },
              { id: 'analytics', icon: 'fa-chart-line', label: '數據分析' },
              { id: 'create', icon: 'fa-plus-circle', label: '新增商品' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); if(item.id !== 'create') setEditingId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === item.id 
                  ? 'bg-[#EE4D2D] text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5`}></i>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* 右側內容區 */}
      <div className="flex-1 space-y-6">
        {/* 頂部數據卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">今日銷售額</div>
            <div className="text-2xl font-black text-[#EE4D2D]">${stats.todaySales.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">本月總銷售</div>
            <div className="text-2xl font-black text-slate-800">${stats.monthSales.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hidden lg:block">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">本月訂單數</div>
            <div className="text-2xl font-black text-slate-800">{stats.totalOrders}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hidden lg:block">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">平均客單價</div>
            <div className="text-2xl font-black text-slate-800">${stats.avgOrderValue.toLocaleString()}</div>
          </div>
        </div>

        {/* 概況內容 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-rocket text-[#EE4D2D]"></i> 近期營運動態
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-700 mb-4">待辦事項</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl text-sm border border-slate-100">
                      <span className="text-slate-600">待處理訂單</span>
                      <span className="font-bold text-red-500">{orders.filter(o => o.status === 'PENDING').length} 筆</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl text-sm border border-slate-100">
                      <span className="text-slate-600">未回覆訊息</span>
                      <span className="font-bold text-orange-500">3 則</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-700 mb-4">銷售目標達成率</h3>
                  <div className="space-y-4">
                    {products.slice(0, 2).map(p => {
                      const percent = Math.min(100, Math.floor((p.current_amount / p.target_amount) * 100));
                      return (
                        <div key={p.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500 truncate">{p.name}</span>
                            <span className="font-bold">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="primary-gradient h-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">商品管理</h2>
                <div className="flex gap-2">
                   <button onClick={() => alert('已連線至外部 API，準備匯入蝦皮資料...')} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition">
                    <i className="fa-solid fa-cloud-arrow-down mr-1"></i> 一鍵匯入
                  </button>
                  <button onClick={() => setActiveTab('create')} className="px-4 py-2 bg-[#EE4D2D] text-white rounded-xl text-xs font-bold shadow-sm">
                    <i className="fa-solid fa-plus mr-1"></i> 新增商品
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition">
                    <img src={p.images[0]} className="w-16 h-16 object-cover rounded-xl border bg-white" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-[#EE4D2D] font-black">${p.price}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.status === 'OPEN' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {p.status === 'OPEN' ? '銷售中' : '已結束'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingId(p.id); setForm(p); setActiveTab('create'); }} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"><i className="fa-solid fa-pen-to-square"></i></button>
                      <button onClick={() => onUpdateProducts(products.filter(item => item.id !== p.id))} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">{editingId ? '編輯商品' : '新增團購商品'}</h2>
              <div className="max-w-3xl space-y-8">
                {/* 基礎資訊 */}
                <section className="space-y-4">
                  <h3 className="font-bold text-slate-700 text-sm mb-4 bg-slate-100 px-3 py-1 inline-block rounded">1. 基礎資訊</h3>
                  <input type="text" placeholder="商品名稱" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-[#EE4D2D] focus:ring-4 focus:ring-[#EE4D2D]/5 transition" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 ml-2">團購價</label>
                      <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm" value={form.price} onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 ml-2">原價</label>
                      <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm" value={form.original_price} onChange={e => setForm({...form, original_price: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="relative">
                    <textarea placeholder="商品描述與特色..." className="w-full h-40 border border-slate-200 rounded-2xl p-5 text-sm outline-none focus:border-[#EE4D2D]" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                    <button onClick={async () => { setAiLoading(true); setForm({...form, description: await generateMarketingCopy(form.name || '', form.description || '')}); setAiLoading(false); }} className="absolute bottom-4 right-4 primary-gradient text-white text-[11px] px-4 py-2 rounded-full font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2">
                      {aiLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} AI 生成文案
                    </button>
                  </div>
                </section>

                {/* 銷售目標 */}
                <section className="space-y-4">
                  <h3 className="font-bold text-slate-700 text-sm mb-4 bg-slate-100 px-3 py-1 inline-block rounded">2. 銷售目標設定</h3>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 ml-2">銷售目標總額 (TWD)</label>
                      <input type="number" placeholder="例如: 100,000" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm" value={form.target_amount} onChange={e => setForm({...form, target_amount: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="flex-1 text-[11px] text-slate-400 pb-3 italic">
                      設定目標後，商品頁面將顯示銷售進度百分比，增加購買緊迫感。
                    </div>
                  </div>
                </section>

                {/* 運費設定 */}
                <section className="space-y-4">
                  <h3 className="font-bold text-slate-700 text-sm mb-4 bg-slate-100 px-3 py-1 inline-block rounded">3. 運送方式與費用</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['7-11', '全家', '宅配', '自取'].map(type => (
                      <button key={type} onClick={() => addShippingRule(type)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:border-[#EE4D2D] hover:text-[#EE4D2D] transition">
                        + {type}
                      </button>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    {form.shipping_rules?.map((rule, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-bold text-slate-700 text-sm">{rule.name}</span>
                          <button onClick={() => setForm({...form, shipping_rules: form.shipping_rules?.filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600 text-xs"><i className="fa-solid fa-xmark"></i> 移除</button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          {rule.name !== '自取' ? (
                            <>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 ml-1">運費</label>
                                <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm" value={rule.fee} onChange={e => updateShippingRule(idx, 'fee', parseInt(e.target.value) || 0)} />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 ml-1">滿額免運門檻</label>
                                <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm" value={rule.free_threshold} onChange={e => updateShippingRule(idx, 'free_threshold', parseInt(e.target.value) || 0)} />
                              </div>
                              <div className="col-span-2 lg:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 ml-1">每筆限購件數</label>
                                <input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm" value={rule.limit_qty} onChange={e => updateShippingRule(idx, 'limit_qty', parseInt(e.target.value) || 1)} />
                              </div>
                            </>
                          ) : (
                            <div className="col-span-full">
                              <label className="text-[10px] font-bold text-slate-400 ml-1">自取詳細地址 (會自動記錄下次使用)</label>
                              <input type="text" placeholder="請輸入自取地址..." className="w-full h-10 border border-slate-200 rounded-xl px-4 text-sm" value={rule.pickup_address} onChange={e => updateShippingRule(idx, 'pickup_address', e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!form.shipping_rules || form.shipping_rules.length === 0) && (
                      <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-sm">請選擇至少一種運送方式</div>
                    )}
                  </div>
                </section>

                <div className="flex gap-4 pt-10 border-t">
                  <button onClick={resetForm} className="flex-1 h-14 rounded-2xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition">取消返回</button>
                  <button onClick={handleSaveProduct} className="flex-[2] h-14 primary-gradient text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">
                    確認{editingId ? '儲存修改' : '立即上架'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
             <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-slate-800">銷售趨勢分析</h2>
                  <select className="bg-slate-100 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none">
                    <option>最近 7 天</option>
                    <option>最近 30 天</option>
                    <option>本月至今</option>
                  </select>
                </div>
                
                <div className="space-y-10">
                  {/* 圖表模擬 */}
                  <div className="h-64 bg-slate-50 rounded-3xl relative flex items-end justify-between p-8 border border-slate-100">
                    {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                      <div key={i} className="flex flex-col items-center gap-3 w-full">
                        <div className="w-8 md:w-12 primary-gradient rounded-t-lg transition-all duration-1000" style={{ height: `${h}%` }}></div>
                        <span className="text-[10px] text-slate-400 font-mono">03/{i+10}</span>
                      </div>
                    ))}
                    <div className="absolute top-4 right-8 flex items-center gap-2">
                       <div className="w-3 h-3 primary-gradient rounded-full"></div>
                       <span className="text-[10px] font-bold text-slate-500 uppercase">Daily Revenue</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-100 rounded-2xl p-6">
                      <h3 className="font-bold text-slate-700 mb-4 text-sm">熱銷排行</h3>
                      <div className="space-y-4">
                        {products.slice(0, 3).map((p, i) => (
                          <div key={p.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">{i+1}</span>
                              <span className="text-xs text-slate-600 truncate max-w-[120px]">{p.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-800">${(p.price * 15).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                       <i className="fa-solid fa-users text-4xl text-slate-200 mb-4"></i>
                       <div className="text-2xl font-black text-slate-800">{stats.totalCustomers}</div>
                       <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">累積消費顧客</div>
                    </div>
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'orders' && (
            <div className="p-8">
               <h2 className="text-xl font-bold text-slate-800 mb-6">訂單列表</h2>
               <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Order ID: {order.id}</div>
                            <div className="font-bold text-slate-800">{order.receiver_name}</div>
                          </div>
                          <select 
                            value={order.status}
                            onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as any)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                          >
                            <option value="PENDING">待處理</option>
                            <option value="PAID">已付款</option>
                            <option value="SHIPPED">已出貨</option>
                            <option value="COMPLETED">已完成</option>
                            <option value="CANCELLED">已取消</option>
                          </select>
                       </div>
                       <div className="space-y-2 mb-4">
                         {order.items.map((item, i) => (
                           <div key={i} className="flex justify-between text-xs text-slate-500">
                             <span>{item.name} x {item.qty}</span>
                             <span className="font-bold">${item.finalPrice * item.qty}</span>
                           </div>
                         ))}
                       </div>
                       <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-3 border-t border-slate-200">
                          <span><i className="fa-solid fa-truck-fast mr-1"></i> {order.ship_method}</span>
                          <span><i className="fa-solid fa-calendar mr-1"></i> {new Date(order.created_at).toLocaleDateString()}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="p-8">
               <h2 className="text-xl font-bold text-slate-800 mb-6">訊息中心</h2>
               <div className="flex flex-col gap-4">
                  {[
                    { name: '王小姐', msg: '請問這款還有貨嗎？', time: '10:30 AM' },
                    { name: '陳先生', msg: '我已經匯款了，請對帳', time: '09:15 AM' },
                  ].map((m, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:shadow-md transition cursor-pointer">
                       <div className="flex gap-4 items-center">
                         <div className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold">{m.name[0]}</div>
                         <div>
                            <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                            <div className="text-xs text-slate-400 mt-1">{m.msg}</div>
                         </div>
                       </div>
                       <div className="text-right">
                          <div className="text-[10px] text-slate-300 font-mono mb-2">{m.time}</div>
                          <button className="px-4 py-1.5 bg-[#EE4D2D] text-white rounded-lg text-xs font-bold">回覆</button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
