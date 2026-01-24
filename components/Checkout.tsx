
import React, { useState, useEffect } from 'react';
import { CartItem, User, Order, ShippingRule, BankInfo } from '../types';

interface CheckoutProps {
  cart: CartItem[];
  user: User | null;
  onSubmit: (order: Order) => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, user, onSubmit }) => {
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    method: '7-11',
    store: '',
    payment_method: 'TRANSFER' as 'TRANSFER' | 'COD',
    payment_note: ''
  });

  const [shippingFee, setShippingFee] = useState(60);

  const cartTotal = cart.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);

  // 取得該訂單所屬商家的銀行資訊 (假設同一筆訂單通常來自同一賣家，或取第一件商品)
  const sellerBankInfo: BankInfo = cart[0]?.bank_info || {
    bank_name: '中國信託',
    bank_code: '822',
    account_name: '拍拍購科技股份有限公司',
    account_number: '901540123456'
  };

  useEffect(() => {
    // 根據選擇的運送方式與商品的免運規則計算
    const firstItem = cart[0];
    const rule = firstItem?.shipping_rules?.find(r => r.name === form.method) || { fee: 60, free_threshold: 1000 };
    setShippingFee(cartTotal >= rule.free_threshold ? 0 : rule.fee);
  }, [form.method, cartTotal, cart]);

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.store) return alert('請填寫完整收件資訊');
    if (form.payment_method === 'TRANSFER' && form.payment_note.length < 5) {
      return alert('請填寫匯款帳號末五碼以便對帳');
    }
    
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
      payment_note: form.payment_note
    };
    onSubmit(newOrder);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="bg-white p-8 shadow-sm rounded-xl border border-slate-100">
        <h2 className="text-xl font-bold border-l-4 border-[#EE4D2D] pl-3 mb-8 text-slate-800">1. 收件資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <input type="text" placeholder="收件人全名" className="h-11 border rounded-lg px-4 outline-none focus:border-[#EE4D2D]" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input type="tel" placeholder="手機號碼" className="h-11 border rounded-lg px-4 outline-none focus:border-[#EE4D2D]" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-600">運送方式</label>
          <div className="grid grid-cols-3 gap-3">
            {['7-11', '全家', '宅配'].map(m => (
              <button key={m} onClick={() => setForm({...form, method: m})} className={`p-3 border rounded-lg font-bold text-sm ${form.method === m ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200'}`}>{m}</button>
            ))}
          </div>
          <input type="text" placeholder="門市名稱或宅配地址" className="w-full h-11 border rounded-lg px-4 outline-none focus:border-[#EE4D2D] text-sm" value={form.store} onChange={e => setForm({...form, store: e.target.value})} />
        </div>
      </div>

      <div className="bg-white p-8 shadow-sm rounded-xl border border-slate-100">
        <h2 className="text-xl font-bold border-l-4 border-[#EE4D2D] pl-3 mb-8 text-slate-800">2. 付款方式</h2>
        <div className="flex gap-4 mb-6">
          <button onClick={() => setForm({...form, payment_method: 'TRANSFER'})} className={`flex-1 py-4 border rounded-lg font-bold flex items-center justify-center gap-2 ${form.payment_method === 'TRANSFER' ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200'}`}><i className="fa-solid fa-building-columns"></i> 銀行匯款</button>
          <button onClick={() => setForm({...form, payment_method: 'COD'})} className={`flex-1 py-4 border rounded-lg font-bold flex items-center justify-center gap-2 ${form.payment_method === 'COD' ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200'}`}><i className="fa-solid fa-truck-ramp-box"></i> 貨到付款</button>
        </div>

        {form.payment_method === 'TRANSFER' && (
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl animate-scale-up">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><i className="fa-solid fa-circle-info"></i> 商家匯款帳號</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex justify-between border-b border-blue-100 pb-2"><span>銀行：</span><span className="font-bold">{sellerBankInfo.bank_name} ({sellerBankInfo.bank_code})</span></div>
              <div className="flex justify-between border-b border-blue-100 pb-2"><span>戶名：</span><span className="font-bold">{sellerBankInfo.account_name}</span></div>
              <div className="flex justify-between border-b border-blue-100 pb-2"><span>帳號：</span><span className="font-bold">{sellerBankInfo.account_number}</span></div>
            </div>
            <div className="mt-6 space-y-2">
              <label className="block text-xs font-bold text-blue-800">匯款後請填寫帳號末五碼：</label>
              <input type="text" maxLength={5} placeholder="5 位數字" className="w-full h-11 bg-white border border-blue-200 rounded-lg px-4 text-center font-mono tracking-widest" value={form.payment_note} onChange={e => setForm({...form, payment_note: e.target.value.replace(/\D/g, '')})} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-8 shadow-sm rounded-xl border border-slate-100">
        <h2 className="text-xl font-bold border-l-4 border-[#EE4D2D] pl-3 mb-6 text-slate-800">3. 訂單結算</h2>
        <div className="space-y-3 pb-6 border-b">
          <div className="flex justify-between text-slate-500"><span>商品總額</span><span>${cartTotal}</span></div>
          <div className="flex justify-between text-slate-500"><span>運費 ({form.method})</span><span>{shippingFee === 0 ? '免運' : `$${shippingFee}`}</span></div>
        </div>
        <div className="flex justify-between items-center pt-6">
          <span className="font-black text-slate-800 text-lg">應付總額</span>
          <span className="text-4xl font-black text-[#EE4D2D]">${cartTotal + shippingFee}</span>
        </div>
        <button onClick={handleSubmit} className="w-full h-16 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-xl hover:bg-[#d73211] mt-8 text-xl active:scale-95 transition-transform flex items-center justify-center gap-3"><i className="fa-solid fa-check-to-slot"></i> 確認提交訂單</button>
      </div>
    </div>
  );
};

export default Checkout;
