
import React, { useState } from 'react';
import { User } from '../types';

interface RegisterBuyerProps {
  onComplete: (user: User) => void;
  onShowTerms: () => void;
  onShowDisclaimer: () => void;
}

const RegisterBuyer: React.FC<RegisterBuyerProps> = ({ onComplete, onShowTerms, onShowDisclaimer }) => {
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });

  const handleRegister = () => {
    if (!agreed) return alert('請先同意會員條款');
    if (!form.name || !form.phone || !form.password) return alert('請填寫完整資訊');
    
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: form.name,
      phone: form.phone,
      email: form.email || `${form.phone}@insbuy.user`,
      password: form.password,
      role: 'BUYER',
      level: 1, // 一般會員預設等級 1
      created_at: new Date().toISOString()
    };
    
    onComplete(newUser);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-10 shadow-xl rounded-[2.5rem] mt-10 border border-slate-100 animate-fade-in-up">
      <h2 className="text-3xl font-black text-center mb-8 text-slate-800 tracking-tight">加入拍拍購</h2>
      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">您的全名</label>
          <input 
            type="text" 
            placeholder="輸入真實姓名"
            className="w-full h-12 border border-slate-200 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-[#EE4D2D]/10 focus:border-[#EE4D2D] transition shadow-sm"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">手機號碼 (登入帳號)</label>
          <input 
            type="tel" 
            placeholder="09xx-xxx-xxx"
            className="w-full h-12 border border-slate-200 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-[#EE4D2D]/10 focus:border-[#EE4D2D] transition shadow-sm"
            value={form.phone}
            onChange={(e) => setForm({...form, phone: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">備援電子信箱</label>
          <input 
            type="email" 
            placeholder="example@gmail.com"
            className="w-full h-12 border border-slate-200 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-[#EE4D2D]/10 focus:border-[#EE4D2D] transition shadow-sm"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">設定密碼</label>
          <input 
            type="password" 
            placeholder="至少 6 位字元"
            className="w-full h-12 border border-slate-200 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-[#EE4D2D]/10 focus:border-[#EE4D2D] transition shadow-sm"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
          />
        </div>

        <div className="flex items-start gap-3 pt-4 px-2">
          <input 
            type="checkbox" 
            id="terms" 
            className="mt-1 accent-[#EE4D2D] w-4 h-4"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label htmlFor="terms" className="text-[11px] text-slate-400 leading-relaxed cursor-pointer select-none">
            我已詳閱、充分瞭解並同意遵守
            <span onClick={(e) => { e.preventDefault(); onShowTerms(); }} className="text-[#EE4D2D] underline mx-1 hover:text-[#d73211] font-bold cursor-pointer">會員服務條款</span>
            及
            <span onClick={(e) => { e.preventDefault(); onShowDisclaimer(); }} className="text-[#EE4D2D] underline mx-1 hover:text-[#d73211] font-bold cursor-pointer">平台免責聲明</span>
            。
          </label>
        </div>

        <button 
          onClick={handleRegister}
          disabled={!agreed}
          className="w-full h-14 bg-[#EE4D2D] text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] transition active:scale-95 disabled:opacity-50 mt-4 text-lg"
        >
          立即註冊
        </button>
      </div>
      <div className="mt-8 text-center text-xs text-slate-400 font-medium">
        已經是會員了？ 
        <button onClick={() => window.location.hash = '#/auth'} className="text-[#EE4D2D] font-bold underline ml-1">前往登入</button>
      </div>
    </div>
  );
};

export default RegisterBuyer;
