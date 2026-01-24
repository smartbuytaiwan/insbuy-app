
import React, { useState, useRef } from 'react';
import { User, Product, View, ProductVariant, BankInfo, Order } from '../types';
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
  const [tab, setTab] = useState<'products' | 'orders' | 'create'>('products');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm: Partial<Product> = {
    name: '',
    description: '',
    price: 0,
    original_price: 0,
    images: [],
    status: 'OPEN',
    variants: [{ name: '預設', price: 0, stock: 100 }],
    shipping_rules: [
      { name: '7-11', fee: 60, free_threshold: 1000 },
      { name: '宅配', fee: 100, free_threshold: 2000 }
    ],
    bank_info: { bank_name: '', bank_code: '', account_name: '', account_number: '' },
    end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    is_pinned: false
  };

  const [form, setForm] = useState<Partial<Product>>(initialForm);

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
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setTab('products');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除此商品嗎？')) {
      onUpdateProducts(products.filter(p => p.id !== id));
    }
  };

  const handleEdit = (p: Product) => {
    setForm({ ...p });
    setEditingId(p.id);
    setTab('create');
  };

  const updateVariant = (idx: number, key: keyof ProductVariant, val: any) => {
    const next = [...(form.variants || [])];
    next[idx] = { ...next[idx], [key]: val };
    setForm({ ...form, variants: next });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
      <div className="bg-[#333] p-5 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-shop"></i> 商家管理中心
          </h2>
          <p className="text-[10px] opacity-60 mt-0.5">商家 ID: {user.shop_id} | {user.name}</p>
        </div>
        <div className="flex bg-white/10 p-1 rounded-lg">
          <button onClick={() => setTab('products')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${tab === 'products' ? 'bg-white text-slate-800' : 'hover:bg-white/10'}`}>商品列表</button>
          <button onClick={() => setTab('orders')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${tab === 'orders' ? 'bg-white text-slate-800' : 'hover:bg-white/10'}`}>
            訂單管理 {orders.filter(o => o.status === 'PENDING').length > 0 && <span className="bg-red-500 text-white text-[8px] px-1 rounded-full ml-1">{orders.filter(o => o.status === 'PENDING').length}</span>}
          </button>
          <button onClick={() => setTab('create')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${tab === 'create' ? 'bg-white text-slate-800' : 'hover:bg-white/10'}`}>{editingId ? '編輯' : '新增'}</button>
        </div>
      </div>

      <div className="p-6">
        {tab === 'products' && (
          <div className="grid gap-4">
            {products.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic">尚未上架商品</div>
            ) : (
              products.map(p => (
                <div key={p.id} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-slate-50 transition">
                  <img src={p.images[0]} className="w-16 h-16 object-cover rounded-lg border bg-white" />
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                    <div className="text-sm text-[#EE4D2D] font-bold">${p.price}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><i className="fa-solid fa-pen-to-square"></i></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><i className="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic">尚無訂單紀錄</div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="border border-slate-100 rounded-xl p-5 hover:shadow-sm transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-1">訂單編號: {order.id}</div>
                      <div className="text-sm font-bold text-slate-800">{order.receiver_name} ({order.receiver_phone})</div>
                    </div>
                    <select 
                      value={order.status}
                      onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full outline-none border-none cursor-pointer ${
                        order.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}
                    >
                      <option value="PENDING">待處理</option>
                      <option value="SHIPPED">已出貨</option>
                      <option value="COMPLETED">已完成</option>
                      <option value="CANCELLED">已取消</option>
                    </select>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-600">{item.name} x {item.qty}</span>
                        <span className="font-bold text-slate-800">${item.finalPrice * item.qty}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-[#EE4D2D]">
                      <span>總額</span>
                      <span>${order.total_amount}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-400">
                    <span><i className="fa-solid fa-truck mr-1"></i> {order.ship_method} - {order.store_name}</span>
                    {order.payment_note && <span><i className="fa-solid fa-money-check mr-1"></i> 末五碼: {order.payment_note}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'create' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <section className="space-y-4">
              <input type="text" placeholder="商品名稱" className="w-full h-11 border rounded-lg px-4 text-sm outline-none focus:border-[#EE4D2D]" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <div className="flex gap-4">
                <input type="number" placeholder="團購價" className="flex-1 h-11 border rounded-lg px-4 text-sm" value={form.price} onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})} />
                <input type="number" placeholder="原始價" className="flex-1 h-11 border rounded-lg px-4 text-sm" value={form.original_price} onChange={e => setForm({...form, original_price: parseInt(e.target.value) || 0})} />
              </div>
              <div className="relative">
                <textarea placeholder="商品描述..." className="w-full h-32 border rounded-lg p-3 text-sm outline-none focus:border-[#EE4D2D]" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <button onClick={async () => { setAiLoading(true); setForm({...form, description: await generateMarketingCopy(form.name || '', form.description || '')}); setAiLoading(false); }} className="absolute bottom-3 right-3 bg-purple-600 text-white text-[10px] px-3 py-1.5 rounded-full font-bold hover:shadow-lg disabled:opacity-50">
                  {aiLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>} AI 文案
                </button>
              </div>
            </section>

            <div className="flex gap-4 pt-4">
              <button onClick={resetForm} className="flex-1 h-12 border rounded-xl font-bold text-slate-500 hover:bg-slate-50">取消</button>
              <button onClick={handleSaveProduct} className="flex-[2] h-12 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-lg hover:bg-[#d73211]">確認{editingId ? '儲存' : '發布'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
