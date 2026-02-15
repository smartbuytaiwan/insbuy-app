
import React, { useState } from 'react';
import { User } from '../types';

interface RegisterSellerProps {
  onComplete: (user: User) => void;
}

// 將 InputField 移至元件外部，避免每次 render 時重新建立導致輸入中斷
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

const RegisterSeller: React.FC<RegisterSellerProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: '', // 負責人姓名
    phone: '',
    email: '',
    password: '',
    shopName: '',
    shopDescription: '',
    taxId: ''
    // 已移除銀行相關欄位
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 建立新賣家用戶物件
    const newUser: User = {
      id: `s-${Date.now()}`,
      name: formData.shopName, // 顯示名稱使用店鋪名
      phone: formData.phone,
      email: formData.email,
      password: formData.password,
      role: 'SELLER',
      level: 20, // 新商家預設等級 20 (原金級)
      shop_id: `S-${Date.now()}`, // 自動生成店鋪ID
      created_at: new Date().toISOString()
    };

    alert('感謝您的申請！商家帳號已建立。');
    onComplete(newUser);
  };

  return (
    <div className="max-w-4xl mx-auto my-8 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
        
        {/* 左側：行銷資訊 */}
        <div className="w-full md:w-80 bg-slate-900 p-10 text-white flex flex-col">
          <div className="mb-12">
            <div className="bg-[#EE4D2D] w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-lg">
              <i className="fa-solid fa-store text-xl"></i>
            </div>
            <h2 className="text-2xl font-black leading-tight">開始在 <br/><span className="text-[#EE4D2D]">InsBuy</span> 銷售</h2>
            <p className="text-slate-400 text-sm mt-4">與全台百萬團購主建立連結，讓您的好商品被看見。</p>
          </div>

          <div className="space-y-6 flex-1">
            <div className="flex gap-4">
              <i className="fa-solid fa-circle-check text-[#EE4D2D] mt-1"></i>
              <div>
                <p className="text-sm font-bold">免開店費</p>
                <p className="text-[11px] text-slate-400">零成本進駐，成交後才收費</p>
              </div>
            </div>
            <div className="flex gap-4">
              <i className="fa-solid fa-circle-check text-[#EE4D2D] mt-1"></i>
              <div>
                <p className="text-sm font-bold">AI 文案助手</p>
                <p className="text-[11px] text-slate-400">Gemini AI 幫您撰寫爆款文案</p>
              </div>
            </div>
            <div className="flex gap-4">
              <i className="fa-solid fa-circle-check text-[#EE4D2D] mt-1"></i>
              <div>
                <p className="text-sm font-bold">快速撥款</p>
                <p className="text-[11px] text-slate-400">支援多家銀行，資金周轉快</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 mt-8">
            <p className="text-[10px] text-slate-500 italic">已有商家帳號？</p>
            <button onClick={() => window.location.hash = '#/auth'} className="text-sm font-bold hover:text-[#EE4D2D] transition-colors">立即登入管理後台</button>
          </div>
        </div>

        {/* 右側：詳細註冊表單 */}
        <form onSubmit={handleSubmit} className="flex-1 p-10 space-y-10 overflow-y-auto max-h-[85vh] no-scrollbar">
          
          {/* 第1部分：基本資訊 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">1</span>
              <h3 className="font-black text-slate-800 tracking-tight">負責人基本資訊與帳號</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="負責人姓名" name="name" icon="fa-user" placeholder="輸入真實姓名" value={formData.name} onChange={handleChange} />
              <InputField label="手機號碼" name="phone" icon="fa-mobile-screen" placeholder="0912-345-678" value={formData.phone} onChange={handleChange} />
              <InputField label="登入信箱" name="email" icon="fa-envelope" placeholder="shop@example.com" type="email" value={formData.email} onChange={handleChange} />
              <InputField label="設定密碼" name="password" icon="fa-lock" placeholder="至少 8 位字元" type="password" value={formData.password} onChange={handleChange} />
            </div>
          </section>

          {/* 第2部分：店鋪設定 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">2</span>
              <h3 className="font-black text-slate-800 tracking-tight">店鋪設定</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="店鋪名稱" name="shopName" icon="fa-shop" placeholder="例：優質生活百貨旗艦店" value={formData.shopName} onChange={handleChange} />
              <InputField label="統一編號" name="taxId" icon="fa-id-card" placeholder="8位數字 (選填)" required={false} value={formData.taxId} onChange={handleChange} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">店鋪簡介</label>
              <textarea 
                name="shopDescription"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#EE4D2D] outline-none h-24 resize-none"
                placeholder="介紹您的商品特色與經營理念..."
                value={formData.shopDescription}
                onChange={handleChange}
              ></textarea>
            </div>
          </section>

          {/* 提交按鈕 */}
          <div className="pt-6 border-t border-slate-100">
            <button 
              type="submit"
              className="w-full primary-gradient text-white py-4 rounded-xl font-bold shadow-xl hover:shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              提交申請並完成註冊
              <i className="fa-solid fa-arrow-right"></i>
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4">
              點擊提交即代表您同意 InsBuy 拍拍購的 <span className="underline cursor-pointer hover:text-slate-600">服務條款</span> 與 <span className="underline cursor-pointer hover:text-slate-600">隱私權政策</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterSeller;
