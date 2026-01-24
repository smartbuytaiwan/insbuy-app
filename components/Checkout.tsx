
import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, User, Order, ShippingRule, BankInfo } from '../types';

interface CheckoutProps {
  cart: CartItem[];
  user: User | null;
  onSubmit: (order: Order) => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, user, onSubmit }) => {
  // 從第一件商品取得賣家設定的運費規則
  const availableRules = useMemo(() => {
    return cart[0]?.shipping_rules && cart[0].shipping_rules.length > 0 
      ? cart[0].shipping_rules 
      : [{ name: '宅配', fee: 100, free_threshold: 2000 }];
  }, [cart]);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    method: availableRules[0].name,
    store: '',
    payment_method: 'TRANSFER' as 'TRANSFER' | 'COD',
    payment_note: ''
  });

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.finalPrice * item.qty, 0), [cart]);

  // 需求 3: 根據選擇的運送方式即時計算精確運費
  const shippingFee = useMemo(() => {
    // 尋找當前選擇的規則物件
    const rule = availableRules.find(r => r.name === form.method) || availableRules[0];
    // 檢查是否達到免運門檻
    return cartTotal >= rule.free_threshold ? 0 : rule.fee;
  }, [form.method, cartTotal, availableRules]);

  const currentRule = useMemo(() => availableRules.find(r => r.name === form.method) || availableRules[0], [form.method, availableRules]);

  // 取得該訂單所屬商家的銀行資訊
  const sellerBankInfo: BankInfo = cart[0]?.bank_info || {
    bank_name: '中國信託',
    bank_code: '822',
    account_name: '拍拍購科技股份有限公司',
    account_number: '901540123456'
  };

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.store) return alert('請填寫完整收件資訊');
    if (form.payment_method === 'TRANSFER' && form.payment_note.length < 5) {
      return alert('請填寫匯款帳號末五碼以便對帳');
    }
    
    // 需求 4: 提交訂單時確保夾帶 shop_id
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      items: cart,
      total_amount: cartTotal + shippingFee,
      shipping_fee: shippingFee,
      payment_method: form.payment_method,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      receiver_name: form.name,
      receiver_phone: form.phone,
      ship_method: form.method,
      store_name: form.store,
      payment_note: form.payment_note,
      shop_id: cart[0].shop_id 
    };
    onSubmit(newOrder);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="bg-white p-10 shadow-sm rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black border-l-4 border-[#EE4D2D] pl-3 mb-8 text-slate-800">1. 收件資訊與方式</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">收件人姓名</label>
            <input type="text" placeholder="全名" className="w-full h-12 border rounded-2xl px-5 outline-none focus:border-[#EE4D2D] transition shadow-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">聯絡手機</label>
            <input type="tel" placeholder="09XX-XXX-XXX" className="w-full h-12 border rounded-2xl px-5 outline-none focus:border-[#EE4D2D] transition shadow-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
        </div>
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">選擇運送方式</label>
          <div className="grid grid-cols-3 gap-3">
            {availableRules.map(rule => (
              <button 
                key={rule.name} 
                onClick={() => setForm({...form, method: rule.name})} 
                className={`p-4 border-2 rounded-2xl font-black text-xs flex flex-col items-center gap-1 transition-all ${
                  form.method === rule.name ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] shadow-md' : 'border-slate-50 text-slate-400 hover:border-slate-100'
                }`}
              >
                <span>{rule.name}</span>
                <span className="text-[9px] opacity-60 font-bold">${rule.fee} / 滿 ${rule.free_threshold} 免運</span>
              </button>
            ))}
          </div>
          
          <div className="pt-2">
            {currentRule.pickup_address && (
              <div className="mb-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl text-[11px] font-black text-[#EE4D2D] flex items-center gap-2 animate-fade-in">
                <i className="fa-solid fa-location-dot"></i> 自取地點：{currentRule.pickup_address}
              </div>
            )}
            <input 
              type="text" 
              placeholder={form.method.includes('自取') ? "輸入自取聯絡資訊" : "配送門市名稱或詳細宅配地址"} 
              className="w-full h-12 border rounded-2xl px-5 outline-none focus:border-[#EE4D2D] text-sm shadow-sm" 
              value={form.store} 
              onChange={e => setForm({...form, store: e.target.value})} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-10 shadow-sm rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black border-l-4 border-[#EE4D2D] pl-3 mb-8 text-slate-800">2. 付款資訊</h2>
        <div className="flex gap-4 mb-6">
          <button onClick={() => setForm({...form, payment_method: 'TRANSFER'})} className={`flex-1 py-4 border-2 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${form.payment_method === 'TRANSFER' ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] shadow-md' : 'border-slate-50 text-slate-400'}`}><i className="fa-solid fa-building-columns"></i> 銀行匯款</button>
          <button onClick={() => setForm({...form, payment_method: 'COD'})} className={`flex-1 py-4 border-2 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${form.payment_method === 'COD' ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] shadow-md' : 'border-slate-50 text-slate-400'}`}><i className="fa-solid fa-truck-ramp-box"></i> 貨到付款</button>
        </div>

        {form.payment_method === 'TRANSFER' && (
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl animate-scale-up space-y-6">
            <div>
              <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2">商家匯款帳號</h3>
              <div className="space-y-2 text-sm text-slate-600 bg-white p-5 rounded-2xl shadow-sm font-bold">
                <div className="flex justify-between border-b border-slate-50 pb-2"><span>收款銀行：</span><span>{sellerBankInfo.bank_name} ({sellerBankInfo.bank_code})</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-2"><span>戶名：</span><span>{sellerBankInfo.account_name}</span></div>
                <div className="flex justify-between pt-2"><span>帳號：</span><span className="font-mono text-[#EE4D2D] text-lg">{sellerBankInfo.account_number}</span></div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">請填寫您的匯款帳號末五碼：</label>
              <input type="text" maxLength={5} placeholder="共 5 位數字" className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 text-center font-mono tracking-widest text-lg outline-none focus:border-[#EE4D2D]" value={form.payment_note} onChange={e => setForm({...form, payment_note: e.target.value.replace(/\D/g, '')})} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-10 shadow-sm rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black border-l-4 border-[#EE4D2D] pl-3 mb-6 text-slate-800">3. 結帳金額</h2>
        <div className="space-y-3 pb-6 border-b border-dashed border-slate-100">
          <div className="flex justify-between text-slate-400 font-bold"><span>商品總計</span><span>${cartTotal.toLocaleString()}</span></div>
          <div className="flex justify-between text-slate-400 font-bold"><span>運費 ({form.method})</span><span>{shippingFee === 0 ? '免運' : `$${shippingFee}`}</span></div>
        </div>
        <div className="flex justify-between items-center pt-8">
          <span className="font-black text-slate-800 text-xl">應付總額</span>
          <span className="text-5xl font-black text-[#EE4D2D]">${(cartTotal + shippingFee).toLocaleString()}</span>
        </div>
        <button onClick={handleSubmit} className="w-full h-16 primary-gradient text-white rounded-[1.5rem] font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-10 text-xl flex items-center justify-center gap-3">
          <i className="fa-solid fa-check-to-slot"></i> 提交訂單
        </button>
      </div>
    </div>
  );
};

export default Checkout;
