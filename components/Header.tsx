
import React from 'react';
import { View, User } from '../types';

interface HeaderProps {
  user: User | null;
  cartCount: number;
  onNavigate: (view: View, product?: any, targetId?: string) => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onShowHelp: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, cartCount, onNavigate, onLogout, searchQuery, setSearchQuery, onShowHelp }) => {
  return (
    <header className="flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#d0011b] text-white text-[11px] md:text-[13px] py-1.5 md:py-2">
        <div className="container mx-auto px-4 max-w-6xl flex justify-between">
          <div className="flex gap-4 items-center">
            <button onClick={() => onNavigate(View.REGISTER_SELLER)} className="hover:text-yellow-200 transition-colors font-bold">賣家中心</button>
            <span className="opacity-50">|</span>
            <span className="hover:opacity-80 cursor-pointer">下載 APP</span>
            <span className="opacity-50">|</span>
            <button onClick={onShowHelp} className="hover:text-yellow-200 transition-colors font-bold">幫助中心</button>
          </div>
          <div className="flex gap-4 font-bold">
            {!user ? (
              <span onClick={() => onNavigate(View.AUTH)} className="cursor-pointer hover:opacity-80">
                <i className="fa-regular fa-circle-user mr-1"></i> 註冊 / 登入
              </span>
            ) : (
              <div className="flex gap-3 items-center">
                <span onClick={() => onNavigate(user.role === 'SELLER' ? View.ADMIN_HOME : View.BUYER_DASHBOARD)} className="cursor-pointer hover:opacity-80 flex items-center gap-1">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">{user.name[0]}</div>
                  {user.name}
                </span>
                <span onClick={onLogout} className="cursor-pointer opacity-80 hover:opacity-100 bg-black/10 px-2 py-0.5 rounded">登出</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-[#EE4D2D] py-4 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 max-w-6xl flex items-center gap-3 md:gap-8">
          <div 
            className="text-white font-black text-2xl md:text-3xl italic tracking-tighter flex items-center gap-1 cursor-pointer shrink-0"
            onClick={() => onNavigate(View.SHOP)}
          >
            <i className="fa-solid fa-bag-shopping"></i> 
            <span className="hidden sm:inline">InsBuy</span>
          </div>

          <div className="flex-1 relative">
            <div className="bg-white rounded p-1 flex shadow-lg h-[40px] md:h-[46px] w-full items-center">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 text-sm md:text-base outline-none text-slate-700 bg-transparent placeholder-slate-400" 
                placeholder="搜尋團購好物..."
              />
              <button className="bg-[#EE4D2D] w-12 md:w-16 h-full rounded text-white hover:bg-[#d73211] flex items-center justify-center transition shadow-sm">
                <i className="fa-solid fa-magnifying-glass text-lg"></i>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6 text-white">
            <div 
              className="shrink-0 relative cursor-pointer hover:scale-110 transition active:scale-95"
              onClick={() => onNavigate(View.CHAT)}
            >
              <i className="fa-regular fa-comments text-xl md:text-2xl"></i>
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-800 text-[10px] px-1 rounded-full font-bold border-2 border-[#EE4D2D]">1</span>
            </div>
            
            <div 
              className="shrink-0 relative cursor-pointer hover:scale-110 transition active:scale-95"
              onClick={() => onNavigate(View.CART)}
            >
              <i className="fa-solid fa-cart-shopping text-xl md:text-2xl"></i>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-[#EE4D2D] text-xs px-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full font-bold border-2 border-[#EE4D2D] shadow-sm">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
