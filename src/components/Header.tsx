import React, { useState } from 'react';
import { View, User } from '../types';

interface HeaderProps {
  user: User | null;
  cartCount: number;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onShowHelp: () => void;
  onSearch: (q: string) => void;
  onReset?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, cartCount, onNavigate, onLogout, searchQuery, setSearchQuery, onShowHelp, onSearch, onReset }) => {
  const [isListening, setIsListening] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchQuery);
    }
  };

  // ★ 修改：增強語音輸入的相容性 (支援 Chrome, Safari, Edge 等手機瀏覽器)
  const handleVoiceSearch = () => {
    // 定義瀏覽器語音 API 介面
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('您的瀏覽器不支援語音輸入功能，建議使用 Chrome、Edge 或 Safari 瀏覽器。');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW'; // 設定語言為繁體中文
      recognition.continuous = false; // 講完一句自動停止
      recognition.interimResults = false; // 不顯示臨時結果

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
            setSearchQuery(transcript);
            onSearch(transcript); // 辨識完成後直接搜尋
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
            alert('請允許瀏覽器使用麥克風權限以進行語音搜尋。');
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      alert('語音輸入啟動失敗，請重試。');
      setIsListening(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#EE4D2D] to-[#FF7337] shadow-lg">
      <div className="container mx-auto px-2 md:px-4 h-16 md:h-20 flex items-center justify-between gap-2 md:gap-8">
        
        {/* Logo */}
        <div 
          onClick={() => {
             setSearchQuery('');
             onSearch(''); 
             onNavigate(View.SHOP);
             if (onReset) onReset();
          }}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="bg-white rounded-full p-0.5 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
             <img 
               src="/logo-new.png" 
               alt="InsBuy" 
               className="h-8 w-8 md:h-12 md:w-12 object-cover rounded-full" 
             />
          </div>
          <span className="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-sm hidden md:block">
            InsBuy
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl relative transition-all duration-300">
          <input 
            type="text" 
            placeholder={isListening ? "聆聽中..." : "搜尋..."}
            className={`w-full bg-white border-0 rounded-full py-2 pl-4 pr-20 md:py-2.5 md:pl-6 md:pr-16 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-orange-300 text-slate-800 shadow-sm placeholder:text-slate-400 ${isListening ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          
          <div className="absolute right-1 top-1 bottom-1 flex items-center gap-0.5 md:gap-1">
             <button 
               onClick={handleVoiceSearch}
               className={`w-8 h-8 rounded-full text-slate-400 hover:text-[#EE4D2D] hover:bg-slate-100 transition flex items-center justify-center ${isListening ? 'text-red-500 bg-red-50' : ''}`}
             >
               <i className={`fa-solid ${isListening ? 'fa-microphone-lines animate-bounce' : 'fa-microphone'}`}></i>
             </button>

             <button 
                onClick={() => onSearch(searchQuery)}
                className="bg-gradient-to-r from-[#EE4D2D] to-[#FF7337] text-white w-8 h-8 md:w-10 md:h-full rounded-full hover:opacity-90 transition-opacity flex items-center justify-center shadow-md ml-1"
             >
                <i className="fa-solid fa-magnifying-glass text-xs md:text-base"></i>
             </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          <button 
            onClick={onShowHelp}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition"
            title="幫助中心"
          >
            <i className="fa-regular fa-circle-question text-lg md:text-xl"></i>
          </button>

          <button 
            onClick={() => onNavigate(View.CART)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition relative"
          >
            <i className="fa-solid fa-cart-shopping text-lg md:text-xl"></i>
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 md:w-5 md:h-5 bg-white text-[#EE4D2D] text-[10px] font-bold rounded-full flex items-center justify-center border border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-white/30">
              <div 
                onClick={() => onNavigate(user.role === 'BUYER' ? View.BUYER_DASHBOARD : View.ADMIN_HOME)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border-2 border-white/50 overflow-hidden cursor-pointer"
              >
                {user.logo ? (
                  <img src={user.logo} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-600 font-bold text-xs">
                    {user.name[0]}
                  </div>
                )}
              </div>
              
              <button 
                onClick={onLogout}
                className="hidden md:flex w-9 h-9 rounded-full hover:bg-white/20 text-white/80 hover:text-white items-center justify-center transition"
                title="登出"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-white/30">
              <button 
                onClick={() => onNavigate(View.AUTH)}
                className="px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-bold text-white hover:opacity-80 transition flex items-center gap-2 border border-white/40 rounded-full bg-white/10"
              >
                <i className="fa-regular fa-user"></i>
                <span className="hidden md:inline">登入</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;