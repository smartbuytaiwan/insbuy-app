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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#EE4D2D] to-[#FF7337] shadow-lg">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-8">
        
        {/* Logo */}
        <div 
          onClick={() => onNavigate(View.SHOP)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#EE4D2D] text-xl font-bold shadow-lg group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-bag-shopping"></i>
          </div>
          <span className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
            InsBuy
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block relative">
          <input 
            type="text" 
            placeholder="搜尋商品、賣家或品牌..." 
            className="w-full bg-white border-0 rounded-sm py-2.5 px-4 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-800/20 text-slate-800 shadow-sm placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="absolute right-1 top-1 bottom-1 bg-[#EE4D2D] text-white px-4 rounded-sm hover:opacity-90 transition-opacity flex items-center justify-center">
             <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onShowHelp}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition"
            title="幫助中心"
          >
            <i className="fa-regular fa-circle-question text-xl"></i>
          </button>

          <button 
            onClick={() => onNavigate(View.CART)}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition relative"
          >
            <i className="fa-solid fa-cart-shopping text-xl"></i>
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-white text-[#EE4D2D] text-[10px] font-bold rounded-full flex items-center justify-center border border-[#EE4D2D]">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-white/30">
              {/* 已登入區域 */}
              {user.role === 'ADMIN' && (
                <button 
                  onClick={() => onNavigate(View.ADMIN_HOME)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 text-white text-xs font-bold rounded-full shadow hover:bg-white/30 transition mr-2 backdrop-blur-sm"
                >
                  <i className="fa-solid fa-gauge-high"></i>
                  管理後台
                </button>
              )}

              <div 
                onClick={() => user.role === 'BUYER' ? onNavigate(View.BUYER_DASHBOARD) : onNavigate(View.ADMIN_HOME)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
              >
                <div className="w-9 h-9 rounded-full bg-white border-2 border-white/50 overflow-hidden">
                  {user.logo ? <img src={user.logo} alt="avatar" className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-600 font-bold">
                      {user.name[0]}
                    </div>
                  )}
                </div>
                <div className="hidden lg:block text-sm">
                  <p className="font-bold text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-white/80 font-medium">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-9 h-9 rounded-full hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition"
                title="登出"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-4 border-l border-white/30">
              {/* 未登入狀態：只保留登入按鈕 */}
              <button 
                onClick={() => onNavigate(View.AUTH)}
                className="px-5 py-2 text-sm font-bold text-white hover:opacity-80 transition flex items-center gap-2"
              >
                <i className="fa-regular fa-user"></i>
                登入
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;