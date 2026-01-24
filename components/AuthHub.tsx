
import React, { useState } from 'react';
import { View, User } from '../types';

interface AuthHubProps {
  onLogin: (user: User) => void;
  onNavigate: (view: View) => void;
}

const AuthHub: React.FC<AuthHubProps> = ({ onLogin, onNavigate }) => {
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [form, setForm] = useState({ phone: '', email: '', password: '' });

  const handleLogin = () => {
    // Mock authentication
    if (!form.password) return alert('請輸入密碼');
    
    const mockUser: User = {
      id: role === 'BUYER' ? 'u1' : 's1',
      name: role === 'BUYER' ? '測試會員' : '頂級團購主',
      phone: form.phone || '0912345678',
      email: form.email || 'test@example.com',
      role,
      shop_id: role === 'SELLER' ? 'S001' : undefined
    };
    onLogin(mockUser);
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded-md mt-10 border border-slate-100 overflow-hidden animate-fade-in">
      <div className="flex border-b border-slate-100">
        <button 
          className={`flex-1 text-center py-4 font-bold transition border-b-2 ${role === 'BUYER' ? 'text-[#EE4D2D] border-[#EE4D2D] bg-orange-50' : 'text-slate-400 border-transparent'}`}
          onClick={() => setRole('BUYER')}
        >一般會員</button>
        <button 
          className={`flex-1 text-center py-4 font-bold transition border-b-2 ${role === 'SELLER' ? 'text-[#EE4D2D] border-[#EE4D2D] bg-orange-50' : 'text-slate-400 border-transparent'}`}
          onClick={() => setRole('SELLER')}
        >商家夥伴</button>
      </div>
      
      <div className="p-8 space-y-4">
        <h2 className="text-xl font-bold text-center mb-6 text-slate-800">
          {role === 'BUYER' ? '會員登入' : '商家登入'}
        </h2>
        
        {role === 'BUYER' ? (
          <input 
            type="tel" 
            placeholder="手機號碼" 
            className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
            value={form.phone}
            onChange={(e) => setForm({...form, phone: e.target.value})}
          />
        ) : (
          <input 
            type="email" 
            placeholder="帳號 (Email)" 
            className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
          />
        )}

        <input 
          type="password" 
          placeholder="密碼" 
          className="w-full h-11 border rounded px-4 outline-none focus:border-[#EE4D2D]"
          value={form.password}
          onChange={(e) => setForm({...form, password: e.target.value})}
        />

        <button 
          onClick={handleLogin}
          className="w-full h-11 bg-[#EE4D2D] text-white rounded font-bold shadow-md hover:bg-[#d73211] transition active:scale-95"
        >
          登入
        </button>

        <div className="flex justify-between text-xs text-slate-400 px-1 pt-2">
          <span 
            className="cursor-pointer hover:text-[#EE4D2D] underline"
            onClick={() => onNavigate(role === 'BUYER' ? View.REGISTER_BUYER : View.REGISTER_SELLER)}
          >註冊新帳號</span>
          <span className="cursor-pointer hover:text-slate-600">忘記密碼？</span>
        </div>
      </div>
      
      <div 
        className="bg-slate-50 p-4 text-center text-xs text-slate-400 cursor-pointer hover:text-[#EE4D2D] transition border-t border-slate-100"
        onClick={() => onNavigate(View.SHOP)}
      >
        暫不登入，返回首頁
      </div>
    </div>
  );
};

export default AuthHub;
