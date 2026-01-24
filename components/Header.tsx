import React from 'react';
import { View, User } from '../types';

interface HeaderProps {
  user: User | null;
  cartCount: number;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onShowHelp: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, cartCount, onNavigate, onLogout, searchQuery, setSearchQuery, onShowHelp }) => {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-8">
        {/* Logo */}
        <div 
          onClick={() => onNavigate(View.SHOP)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-bag-shopping"></i>
          </div>
          <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600 tracking-tight">
            InsBuy
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block relative">
          <input 
            type="text" 
            placeholder="搜尋商品、賣家或品牌..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 px-6 pl-12 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onShowHelp}
            className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            title="幫助中心"
          >
            <i className="fa-regular fa-circle-question text-xl"></i>
          </button>

          <button 
            onClick={() => onNavigate(View.CART)}
            className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-600 transition relative"
          >
            <i className="fa-solid fa-cart-shopping text-xl"></i>
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              
              {user.role === 'ADMIN' && (
                <button 
                  onClick={() => onNavigate(View.ADMIN_HOME)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-full shadow hover:bg-slate-700 transition mr-2"
                >
                  <i className="fa-solid fa-gauge-high"></i>
                  管理後台
                </button>
              )}

              <div 
                onClick={() => user.role === 'BUYER' ? onNavigate(View.BUYER_DASHBOARD) : onNavigate(View.ADMIN_HOME)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                  {user.logo ? <img src={user.logo} alt="avatar" className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold">
                      {user.name[0]}
                    </div>
                  )}
                </div>
                <div className="hidden lg:block text-sm">
                  <p className="font-bold text-slate-800 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-9 h-9 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition"
                title="登出"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <button 
                onClick={() => onNavigate(View.AUTH)}
                className="px-5 py-2 text-sm font-bold text-slate-700 hover:text-orange-600 transition"
              >
                登入
              </button>
              <button 
                onClick={() => onNavigate(View.AUTH)}
                className="px-5 py-2 text-sm font-bold bg-slate-900 text-white rounded-full hover:bg-slate-800 transition shadow-lg shadow-slate-200"
              >
                註冊
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;