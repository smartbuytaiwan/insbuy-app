import React, { useState } from 'react';
import { User, SiteSettings } from '../types';

interface RegisterBuyerProps {
  onComplete: (user: User) => void;
  onShowTerms: () => void;
  onShowDisclaimer: () => void;
  onShowPrivacy?: () => void;
  siteSettings: SiteSettings;
}

const InputField = ({ label, name, type = "text", placeholder, required = true, icon, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <input
        type={type}
        name={name}
        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#EE4D2D] outline-none transition-all"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
);

const RegisterBuyer: React.FC<RegisterBuyerProps> = ({ onComplete, onShowTerms, onShowDisclaimer, siteSettings }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [agreed, setAgreed] = useState(false);

  // ★ 如果註冊功能關閉，直接返回阻擋畫面
  if (siteSettings?.registrationEnabled === false) {
    return (
      <div className="max-w-md mx-auto my-20 animate-fade-in text-center p-8 bg-white rounded-[2rem] shadow-xl border border-slate-100">
         <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-ban text-4xl text-slate-400"></i>
         </div>
         <h2 className="text-2xl font-black text-slate-800 mb-2">註冊功能暫停</h2>
         <p className="text-slate-500 mb-8">目前系統已暫停開放新會員註冊，<br/>請稍後再試或聯繫客服人員。</p>
         <a href="#/auth" className="inline-block px-8 py-3 bg-slate-800 text-white rounded-xl font-bold">返回登入</a>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ★ 修改：加入密碼強度檢查 (至少8碼，含英數)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
        alert('為確保帳號安全，密碼需符合以下規則：\n\n1. 長度至少 8 碼\n2. 必須包含「英文」與「數字」');
        return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('兩次密碼輸入不一致');
      return;
    }

    if (!agreed) {
      alert('請先閱讀並同意服務條款');
      return;
    }

    const newUser: User = {
      id: '', // Empty ID, server will generate
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      password: formData.password,
      role: 'BUYER',
      level: 1,
      created_at: new Date().toISOString(),
      stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 0, responseTime: '', joinTime: new Date().toISOString(), averageRating: 0 },
      following: []
    };

    onComplete(newUser);
  };

  return (
    <div className="max-w-md mx-auto my-8 animate-fade-in-up">
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-[#EE4D2D] p-8 text-white text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
           <div className="relative z-10">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <i className="fa-solid fa-user-plus text-2xl"></i>
             </div>
             <h2 className="text-2xl font-black tracking-tight">加入 InsBuy 會員</h2>
             <p className="text-white/80 text-xs mt-2 font-medium">享受最優惠的團購價格與優質商品</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <InputField label="真實姓名" name="name" icon="fa-user" placeholder="請輸入中文姓名" value={formData.name} onChange={handleChange} />
          <InputField label="手機號碼 (登入帳號)" name="phone" icon="fa-mobile-screen" placeholder="0912-345-678" value={formData.phone} onChange={handleChange} />
          <InputField label="電子信箱 (選填)" name="email" icon="fa-envelope" placeholder="yourname@example.com" type="email" required={false} value={formData.email} onChange={handleChange} />
          <InputField label="設定密碼" name="password" icon="fa-lock" placeholder="8 位數以上英數字" type="password" value={formData.password} onChange={handleChange} />
          <InputField label="確認密碼" name="confirmPassword" icon="fa-check-double" placeholder="再次輸入密碼" type="password" value={formData.confirmPassword} onChange={handleChange} />

          <div className="flex items-start gap-3 mt-4">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="agreements"
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-[#EE4D2D] checked:bg-[#EE4D2D]"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                <i className="fa-solid fa-check text-xs"></i>
              </div>
            </div>
            <label htmlFor="agreements" className="text-xs text-slate-500 leading-relaxed cursor-pointer select-none">
              我已閱讀並同意
              <span onClick={(e) => { e.preventDefault(); onShowTerms(); }} className="text-[#EE4D2D] font-bold hover:underline mx-1">會員服務條款</span>
              與
              <span onClick={(e) => { e.preventDefault(); onShowDisclaimer(); }} className="text-[#EE4D2D] font-bold hover:underline mx-1">平台免責聲明</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-4 primary-gradient text-white rounded-xl font-black shadow-lg hover:shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-lg"
          >
            立即註冊
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      </div>
      <div className="text-center mt-6 text-slate-400 text-xs">
        已經有帳號了？ <a href="#/auth" className="text-[#EE4D2D] font-bold hover:underline">直接登入</a>
      </div>
    </div>
  );
};

export default RegisterBuyer;