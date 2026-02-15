import React, { useState } from 'react';
import { View, User } from '../types';
import API from '../api';

interface AuthHubProps {
  onLogin: (user: User) => void;
  onNavigate: (view: View) => void;
}

const AuthHub: React.FC<AuthHubProps> = ({ onLogin, onNavigate }) => {
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [form, setForm] = useState({ phoneOrEmail: '', password: '' });
  
  // ★ 新增：忘記密碼狀態
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleLogin = () => {
    if (!form.password || !form.phoneOrEmail) return alert('請填寫完整資訊');
    
    const loginData: User = {
      id: '',
      name: '',
      phone: role === 'BUYER' ? form.phoneOrEmail : '',
      email: role === 'SELLER' ? form.phoneOrEmail : '',
      password: form.password,
      role: role,
      level: 1,
      created_at: ''
    };
    onLogin(loginData);
  };

  // ★ 新增：處理忘記密碼
  const handleForgotPassword = async () => {
    if (!forgotEmail) return alert('請輸入 Email');
    try {
      await API.forgotPassword(forgotEmail);
      alert('密碼已發送至您的信箱！(請檢查 Console 如果沒有設定 SMTP)');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (e: any) {
      alert(e.response?.data?.message || '發送失敗，請確認 Email 是否正確或聯繫客服');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-2xl rounded-[2.5rem] mt-10 border border-slate-100 overflow-hidden animate-fade-in-up relative">
      <div className="flex border-b border-slate-50">
        <button 
          className={`flex-1 text-center py-5 font-black text-sm transition-all border-b-4 ${role === 'BUYER' ? 'text-[#EE4D2D] border-[#EE4D2D] bg-orange-50/30' : 'text-slate-300 border-transparent'}`}
          onClick={() => setRole('BUYER')}
        >一般會員登入</button>
        <button 
          className={`flex-1 text-center py-5 font-black text-sm transition-all border-b-4 ${role === 'SELLER' ? 'text-slate-800 border-slate-800 bg-slate-50' : 'text-slate-300 border-transparent'}`}
          onClick={() => setRole('SELLER')}
        >商家夥伴登入</button>
      </div>
      
      <div className="p-10 space-y-6">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-white text-2xl shadow-lg ${role === 'BUYER' ? 'bg-[#EE4D2D]' : 'bg-slate-800'}`}>
            <i className={`fa-solid ${role === 'BUYER' ? 'fa-user' : 'fa-store'}`}></i>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">歡迎回到 InsBuy</h2>
          <p className="text-xs text-slate-400 mt-1">請輸入您的帳號密碼進行驗證</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{role === 'BUYER' ? 'Email' : '註冊信箱 / ID'}</label>
            <input 
              type="text"
              placeholder={role === 'BUYER' ? '09xx-xxx-xxx' : 'example@insbuy.com'}
              className="w-full h-12 border border-slate-200 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
              value={form.phoneOrEmail}
              onChange={(e) => setForm({...form, phoneOrEmail: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">存取密碼</label>
            <input 
              type="password" 
              placeholder="請輸入密碼" 
              className="w-full h-12 border border-slate-200 rounded-2xl px-5 outline-none focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
            />
          </div>
        </div>

        <button 
          onClick={handleLogin}
          className={`w-full h-14 text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] transition active:scale-95 mt-4 text-lg ${role === 'BUYER' ? 'primary-gradient' : 'bg-slate-800 hover:bg-slate-900'}`}
        >
          安全登入
        </button>

        <div className="flex justify-between items-center text-[11px] text-slate-400 px-2 pt-4">
          <button 
            className="hover:text-[#EE4D2D] underline font-bold"
            onClick={() => onNavigate(role === 'BUYER' ? View.REGISTER_BUYER : View.REGISTER_SELLER)}
          >註冊新帳號</button>
          {/* ★ 修改：忘記密碼觸發 */}
          <button 
            className="hover:text-slate-600 cursor-pointer"
            onClick={() => setShowForgotModal(true)}
          >忘記密碼？</button>
        </div>
      </div>
      
      <div 
        className="bg-slate-50 py-5 text-center text-xs text-slate-400 cursor-pointer hover:bg-slate-100 transition border-t border-slate-100 font-bold"
        onClick={() => onNavigate(View.SHOP)}
      >
        <i className="fa-solid fa-arrow-left mr-2"></i> 暫不登入，返回首頁
      </div>

      {/* ★ 新增：忘記密碼彈窗 */}
      {showForgotModal && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 animate-fade-in">
           <h3 className="text-xl font-black text-slate-800 mb-2">找回您的密碼</h3>
           <p className="text-xs text-slate-400 mb-6 text-center">請輸入您註冊時使用的電子信箱<br/>系統將寄送原始密碼給您</p>
           <input 
             type="email" 
             className="w-full h-12 border border-slate-200 rounded-2xl px-5 outline-none mb-4"
             placeholder="輸入 Email"
             value={forgotEmail}
             onChange={e => setForgotEmail(e.target.value)}
           />
           <button onClick={handleForgotPassword} className="w-full h-12 bg-slate-800 text-white rounded-2xl font-bold mb-3 shadow-lg">發送密碼信</button>
           <button onClick={() => setShowForgotModal(false)} className="text-slate-400 text-sm hover:underline">取消返回</button>
        </div>
      )}
    </div>
  );
};

export default AuthHub;