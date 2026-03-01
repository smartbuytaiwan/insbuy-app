import React, { useState } from 'react';
import { User, SiteSettings } from '../types';
import { verifyGmail } from '../utils/googleAuth'; // ★ 新增：引入低權限的 Gmail 驗證

interface RegisterSellerProps {
  onComplete: (user: User) => void;
  onShowTerms?: () => void;
  onShowDisclaimer?: () => void;
  onShowPrivacy?: () => void;
  siteSettings: SiteSettings;
}

const RegisterSeller: React.FC<RegisterSellerProps> = ({ onComplete, onShowTerms, onShowDisclaimer, onShowPrivacy, siteSettings }) => {
  const [form, setForm] = useState({
    bot_trap_field: '', // ★ 安全防護 6：蜜罐專用假欄位
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    shop_name: '',
    tax_id: '',
    shop_description: ''
  });

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false); // ★ 新增：追蹤 Gmail 驗證狀態

  // ★ 如果註冊功能關閉，直接返回阻擋畫面
  if (siteSettings?.registrationEnabled === false) {
    return (
      <div className="max-w-md mx-auto my-20 animate-fade-in text-center p-8 bg-white rounded-[2rem] shadow-xl border border-slate-100">
         <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-store-slash text-4xl text-slate-400"></i>
         </div>
         <h2 className="text-2xl font-black text-slate-800 mb-2">商家註冊已暫停</h2>
         <p className="text-slate-500 mb-8">目前平台暫停招募新商家，<br/>請密切關注我們的公告。</p>
         <a href="#/auth" className="inline-block px-8 py-3 bg-slate-800 text-white rounded-xl font-bold">返回登入</a>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!form.name || !form.phone || !form.password || !form.shop_name) return alert('請填寫必填欄位');
    
    // 密碼強度檢查
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(form.password)) {
        return alert('為消除瀏覽器安全警告，請設定更安全的密碼：\n\n1. 長度至少 8 碼\n2. 必須包含「英文」與「數字」\n3. 請勿使用連續數字或常見密碼');
    }

    if (form.password !== form.confirmPassword) return alert('兩次密碼輸入不一致');
    if (!isEmailVerified || !form.email) return alert('請先點擊按鈕完成 Gmail 驗證');
    if (!agreeTerms) return alert('請閱讀並同意服務條款與平台免責聲明');

    // ★ 關鍵修復：手動組合符合規格的資料，並排除不需送往後端的 confirmPassword 
    // 這能確保解決 500 報錯問題
    const finalUser: any = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      password: form.password,
      shop_name: form.shop_name,
      tax_id: form.tax_id,
      shop_description: form.shop_description,
      role: 'SELLER',
      level: 1,
      is_suspended: false,
      created_at: new Date().toISOString(),
      following: [],
      stats: {
        ratingCount: 0,
        productCount: 0,
        followerCount: 0,
        responseRate: 100,
        responseTime: '即時',
        joinTime: '剛剛',
        averageRating: 0
      }
    };

    onComplete(finalUser);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-100px)] py-10 px-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        <div className="bg-slate-800 p-8 text-center relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-3xl font-black text-white mb-2">註冊成為商家</h2>
              <p className="text-slate-400 text-sm">加入 InsBuy，開啟您的電商之旅</p>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#EE4D2D] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -ml-10 -mb-10"></div>
        </div>

        <div className="p-8 md:p-12 space-y-8">
           
           {/* Section 1: Account Info */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold">1</div>
                 <h3 className="font-bold text-slate-700">帳戶基本資料</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">負責人姓名 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] transition"
                      placeholder="請輸入真實姓名"
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">手機號碼 (帳號) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] transition"
                      placeholder="09xxxxxxxx"
                      value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                    />
                 </div>
                 {/* ★ 修改：獨立的 Gmail 驗證區塊 */}
                 <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">電子信箱 (Gmail 驗證) <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        className="flex-1 h-12 bg-slate-100 border border-slate-200 rounded-xl px-4 outline-none text-slate-500 cursor-not-allowed"
                        placeholder="請點擊右側按鈕進行驗證"
                        value={form.email}
                        readOnly
                      />
                      <button 
                        type="button"
                        disabled={isEmailVerified}
                        onClick={() => {
                          verifyGmail(
                            (email) => { setForm(prev => ({ ...prev, email })); setIsEmailVerified(true); },
                            (err) => alert(err.message || 'Gmail 驗證失敗，請重試')
                          );
                        }}
                        className={`px-6 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${isEmailVerified ? 'bg-green-50 text-green-600 border border-green-200 cursor-default' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <i className={`fa-brands fa-google ${isEmailVerified ? 'text-green-500' : 'text-blue-500'}`}></i>
                        {isEmailVerified ? '已驗證' : '驗證 Gmail'}
                      </button>
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">登入密碼 <span className="text-red-500">*</span></label>
                    <input 
                      type="password" 
                      autoComplete="new-password"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] transition font-mono"
                      placeholder="設定密碼 (至少8碼，含英數)"
                      value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">確認密碼 <span className="text-red-500">*</span></label>
                    <input 
                      type="password" 
                      autoComplete="new-password"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] transition font-mono"
                      placeholder="再次輸入密碼"
                      value={form.confirmPassword}
                      onChange={e => setForm({...form, confirmPassword: e.target.value})}
                    />
                 </div>
              </div>
           </div>

           {/* Section 2: Shop Info */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold">2</div>
                 <h3 className="font-bold text-slate-700">賣場資訊</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">賣場名稱 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] transition"
                      placeholder="您的商店名稱"
                      value={form.shop_name}
                      onChange={e => setForm({...form, shop_name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">統一編號 (選填)</label>
                    <input 
                      type="text" 
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] transition"
                      placeholder="公司統編"
                      value={form.tax_id}
                      onChange={e => setForm({...form, tax_id: e.target.value})}
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">賣場介紹</label>
                    <textarea 
                      className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-[#EE4D2D] transition resize-none"
                      placeholder="簡單介紹您的賣場..."
                      value={form.shop_description}
                      onChange={e => setForm({...form, shop_description: e.target.value})}
                    />
                 </div>
              </div>
           </div>

           {/* Checkbox */}
           <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input 
                type="checkbox" 
                id="agreeTerms" 
                className="mt-1 w-5 h-5 accent-[#EE4D2D] cursor-pointer"
                checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)}
              />
              <label htmlFor="agreeTerms" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
                 我已閱讀並同意
                 <span onClick={(e) => { e.preventDefault(); onShowTerms && onShowTerms(); }} className="text-[#EE4D2D] font-bold hover:underline mx-1 cursor-pointer">會員服務條款</span>、
                 <span onClick={(e) => { e.preventDefault(); onShowPrivacy && onShowPrivacy(); }} className="text-[#EE4D2D] font-bold hover:underline mx-1 cursor-pointer">隱私權條款</span>
                 與
                 <span onClick={(e) => { e.preventDefault(); onShowDisclaimer && onShowDisclaimer(); }} className="text-[#EE4D2D] font-bold hover:underline mx-1 cursor-pointer">平台免責聲明</span>
              </label>
           </div>

           {/* ★ 安全防護 6：隱形蜜罐陷阱 (真人看不見，機器人會亂填) */}
           <input 
             type="text" 
             name="bot_trap_field"
             value={form.bot_trap_field}
             onChange={(e) => setForm({...form, bot_trap_field: e.target.value})}
             style={{ display: 'none' }} 
             tabIndex={-1} 
             autoComplete="off" 
           />

           <button 
             onClick={handleSubmit}
             className={`w-full h-14 rounded-2xl font-black text-lg shadow-lg transition-all ${agreeTerms ? 'primary-gradient text-white hover:scale-[1.02] active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             disabled={!agreeTerms}
           >
             立即註冊開店
           </button>

        </div>
      </div>
    </div>
  );
};

export default RegisterSeller;