
import React, { useState } from 'react';

interface RegisterBuyerProps {
  onComplete: () => void;
}

const RegisterBuyer: React.FC<RegisterBuyerProps> = ({ onComplete }) => {
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });

  const handleRegister = () => {
    if (!agreed) return alert('請先同意會員條款');
    if (!form.name || !form.phone || !form.password) return alert('請填寫完整資訊');
    
    // In a real app, send to API
    alert('註冊成功！請重新登入。');
    onComplete();
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 shadow-md rounded-md mt-10 border border-slate-100 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-8">註冊會員</h2>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 ml-1">姓名</label>
          <input 
            type="text" 
            className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 ml-1">手機號碼</label>
          <input 
            type="tel" 
            className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
            value={form.phone}
            onChange={(e) => setForm({...form, phone: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 ml-1">Gmail (備援聯繫)</label>
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
            id="terms" 
            className="mt-1 accent-[#EE4D2D]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer select-none">
            我已詳閱、充分瞭解並同意遵守
            <span className="text-[#EE4D2D] underline mx-1 hover:text-[#d73211]">會員服務條款</span>
            及
            <span className="text-[#EE4D2D] underline mx-1 hover:text-[#d73211]">平台免責聲明</span>
            。
          </label>
        </div>

        <button 
          onClick={handleRegister}
          disabled={!agreed}
          className="w-full h-12 bg-[#EE4D2D] text-white rounded font-bold shadow-md hover:bg-[#d73211] transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 mt-4"
        >
          立即註冊
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

export default RegisterBuyer;
