
import React, { useState } from 'react';

interface RegisterSellerProps {
  onComplete: () => void;
}

const RegisterSeller: React.FC<RegisterSellerProps> = ({ onComplete }) => {
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ shopName: '', owner: '', phone: '', email: '', password: '' });

  const handleRegister = () => {
    if (!agreed) return alert('請先同意合作條款');
    if (!form.shopName || !form.email || !form.password) return alert('請填寫完整資訊');
    
    alert('商家申請已提交，將於 1-3 個工作天內審核完畢。');
    onComplete();
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 shadow-md rounded-md mt-10 border border-slate-100 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-8">商家合作申請</h2>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 ml-1">商店名稱</label>
          <input 
            type="text" 
            className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
            value={form.shopName}
            onChange={(e) => setForm({...form, shopName: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">負責人</label>
            <input 
              type="text" 
              className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
              value={form.owner}
              onChange={(e) => setForm({...form, owner: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">連絡電話</label>
            <input 
              type="tel" 
              className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 ml-1">合作信箱 (登入帳號)</label>
          <input 
            type="email" 
            className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 ml-1">設定密碼</label>
          <input 
            type="password" 
            className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
          />
        </div>

        <div className="flex items-start gap-2 pt-4">
          <input 
            type="checkbox" 
            id="seller-terms" 
            className="mt-1 accent-[#EE4D2D]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label htmlFor="seller-terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer select-none">
            我已詳閱、充分瞭解並同意遵守
            <span className="text-[#EE4D2D] underline mx-1 hover:text-[#d73211]">商家服務規範</span>
            及
            <span className="text-[#EE4D2D] underline mx-1 hover:text-[#d73211]">誠信經營聲明</span>
            。
          </label>
        </div>

        <button 
          onClick={handleRegister}
          disabled={!agreed}
          className="w-full h-12 bg-slate-800 text-white rounded font-bold shadow-md hover:bg-slate-900 transition active:scale-95 disabled:opacity-50 mt-4"
        >
          提交開店申請
        </button>
      </div>
      <div 
        className="mt-6 text-center text-xs text-slate-400 cursor-pointer hover:text-slate-800"
        onClick={onComplete}
      >
        已有帳號？返回登入
      </div>
    </div>
  );
};

export default RegisterSeller;
