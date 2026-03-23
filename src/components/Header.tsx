import React, { useState, useEffect } from 'react';
import { View, User, LevelConfig } from '../types'; // ★ 加入 LevelConfig
import API from '../api'; 
import FavoritesModal from './FavoritesModal'; 
import CalendarModal from './CalendarModal'; 
import SavedProductsModal from './SavedProductsModal'; 

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
  permissions?: LevelConfig[]; // ★ 新增：接收權限設定
}

const Header: React.FC<HeaderProps> = ({ user, cartCount, onNavigate, onLogout, searchQuery, setSearchQuery, onShowHelp, onSearch, onReset, permissions }) => {
  const [isListening, setIsListening] = useState(false);

  // ==========================================
  // ★ 我的最愛與行事曆 (彈出視窗開關)
  // ==========================================
  const [isFavOpen, setIsFavOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // ★ 新增：行事曆開關
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // ★ 新增：會員選單開關
  const [isSavedProductsOpen, setIsSavedProductsOpen] = useState(false); // ★ 新增：關注商品開關
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('zh-TW');
  const LANGUAGES = [
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'id', name: 'Bahasa Indonesia' }
  ];

  const handleLanguageChange = (langCode: string) => {
    setCurrentLang(langCode);
    setIsLangOpen(false);
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
    } else {
        document.cookie = `googtrans=/zh-TW/${langCode}; path=/;`;
        window.location.reload();
    }
  };

// 1. 若登出則隱藏最愛視窗
  useEffect(() => {
     if (!user || !user.id) setIsFavOpen(false);
  }, [user]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchQuery);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('您的瀏覽器不支援語音輸入功能，建議使用 Chrome、Edge 或 Safari 瀏覽器。');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW'; 
      recognition.continuous = false; 
      recognition.interimResults = false; 

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
            setSearchQuery(transcript);
            onSearch(transcript); 
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
      {/* ★ 修改：改為 flex-nowrap 強制單行顯示，移除多餘的換行設定 */}
      <div className="container mx-auto px-2 md:px-4 py-2 min-h-[60px] flex flex-nowrap items-center justify-between gap-2 md:gap-6">
        
        {/* Logo */}
        <div 
          onClick={() => { setSearchQuery(''); onSearch(''); onNavigate(View.SHOP); if (onReset) onReset(); }}
          className="flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0"
        >
          <div className="bg-white rounded-full p-0.5 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
             <img src="/logo-new.png" alt="InsBuy" className="h-8 w-8 md:h-11 md:w-11 object-cover rounded-full" />
          </div>
          <span className="text-xl font-black text-white tracking-tight drop-shadow-sm hidden md:block notranslate">InsBuy</span>
        </div>

        {/* Search Bar (加長並佔滿剩餘空間) */}
        <div className="flex-1 min-w-0 relative transition-all duration-300">
          <input 
            type="text" 
            placeholder={isListening ? "聆聽中..." : "搜尋..."}
            className={`w-full bg-white border-0 rounded-full py-2 pl-3 pr-[70px] md:py-2.5 md:pl-5 md:pr-16 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-orange-300 text-slate-800 shadow-sm placeholder:text-slate-400 ${isListening ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          
          <div className="absolute right-1 top-1 bottom-1 flex items-center gap-0.5 md:gap-1">
             <button 
               type="button"
               onClick={handleVoiceSearch}
               className={`w-7 h-7 md:w-8 md:h-8 rounded-full text-slate-400 hover:text-[#EE4D2D] hover:bg-slate-100 transition flex items-center justify-center touch-manipulation ${isListening ? 'text-red-500 bg-red-50' : ''}`}
             >
               <i className={`fa-solid ${isListening ? 'fa-microphone-lines animate-bounce' : 'fa-microphone'}`}></i>
             </button>

             <button 
                type="button"
                onClick={() => onSearch(searchQuery)}
                className="bg-gradient-to-r from-[#EE4D2D] to-[#FF7337] text-white w-8 h-8 md:w-10 md:h-full rounded-full hover:opacity-90 transition flex items-center justify-center shadow-md ml-0.5"
             >
                <i className="fa-solid fa-magnifying-glass text-xs md:text-sm"></i>
             </button>
          </div>
        </div>

        {/* 右側按鈕區塊 (常駐購物車 + 會員專區) */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          {/* 未登入時：顯示語言與幫助中心 */}
          {!user && (
            <div className="hidden md:flex gap-2 relative">
               <button onClick={() => { setIsLangOpen(!isLangOpen); setIsFavOpen(false); }} className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition"><i className="fa-solid fa-globe text-lg"></i></button>
               {isLangOpen && (
                   <div className="absolute top-12 right-10 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[300]">
                       {LANGUAGES.map(lang => (
                           <button key={lang.code} onClick={() => handleLanguageChange(lang.code)} className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-orange-50 transition ${currentLang === lang.code ? 'text-[#EE4D2D] bg-orange-50' : 'text-slate-700'}`}>{lang.name}</button>
                       ))}
                   </div>
               )}
               <button onClick={onShowHelp} className="w-9 h-9 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition"><i className="fa-regular fa-circle-question text-lg"></i></button>
            </div>
          )}

          {/* 購物車 (常駐顯示) */}
          <button 
            onClick={() => onNavigate(View.CART)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition relative"
          >
            <i className="fa-solid fa-cart-shopping text-lg"></i>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 md:top-0 md:right-0 w-4 h-4 md:w-5 md:h-5 bg-white text-[#EE4D2D] text-[10px] font-bold rounded-full flex items-center justify-center border border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* 登入後的會員選單區塊 */}
          {user ? (
            <div className="relative flex items-center pl-2 md:pl-4 border-l border-white/30">
              {/* 頭像按鈕 (移除了會擋住子元素的 overflow-hidden 設定，並調高 z-index) */}
              <div 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border-2 border-white/50 cursor-pointer shadow-sm relative z-50 flex items-center justify-center overflow-hidden"
              >
                {user.logo ? (
                  <img src={user.logo} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-600 font-bold text-xs">
                    {user.name[0]}
                  </div>
                )}
              </div>
              
              {/* ★ 新增下拉選單：絕對定位確保不被擋住，並整合所有功能 */}
              {isUserMenuOpen && (
                 <>
                   {/* 手機版/電腦版的透明背景遮罩，點擊旁邊就會關閉選單 */}
                   <div className="fixed inset-0 z-[200]" onClick={() => setIsUserMenuOpen(false)}></div>
                   
                   <div className="absolute top-12 md:top-14 right-0 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[201] py-2 animate-fade-in-down">
                      <div className="px-4 py-3 border-b border-slate-50 mb-1 bg-slate-50/50">
                         <div className="font-bold text-sm text-slate-800 truncate">{user.name}</div>
                         <div className="flex items-center gap-1 mt-1">
                             <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] border border-slate-200 shadow-sm font-bold flex items-center">
                                <i className="fa-solid fa-crown mr-1 text-yellow-500"></i>Lv.{user.level} {user.role === 'SELLER' ? '商家' : '會員'}
                             </span>
                         </div>
                      </div>

                      {/* ★ 修正：強制點擊後台管理跳轉至主頁，改為乾淨網址 href 跳轉，完美觸發重載 */}
                      <button onClick={() => { setIsUserMenuOpen(false); window.location.href = `/${user.role === 'BUYER' ? View.BUYER_DASHBOARD : View.ADMIN_HOME}/${user.shop_id || user.id}`; }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EE4D2D] transition flex items-center gap-3"><i className="fa-solid fa-gauge w-4 text-center"></i> 後台管理</button>

                      {/* ★ 新增：關注商品 (排在後台管理下方) */}
                      <button onClick={() => { setIsUserMenuOpen(false); setIsSavedProductsOpen(true); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EE4D2D] transition flex items-center gap-3"><i className="fa-solid fa-heart w-4 text-center"></i> 關注商品</button>

                      {/* ★ 修改：將我的最愛改名為 連結外部網頁 */}
                      <button onClick={() => { setIsUserMenuOpen(false); setIsFavOpen(true); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EE4D2D] transition flex items-center gap-3"><i className="fa-solid fa-link w-4 text-center"></i> 連結外部網頁</button>

                      {/* ★ 新增：行事曆按鈕 (依照權限等級判斷是否顯示) */}
                      {(user.role === 'ADMIN' || permissions?.find(p => p.target_role === user.role && p.level === user.level)?.can_use_calendar) && (
                          <button onClick={() => { setIsUserMenuOpen(false); setIsCalendarOpen(true); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EE4D2D] transition flex items-center gap-3"><i className="fa-regular fa-calendar-days w-4 text-center"></i> 行事曆</button>
                      )}

                      <button onClick={() => { setIsUserMenuOpen(false); onShowHelp(); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EE4D2D] transition flex items-center gap-3"><i className="fa-regular fa-circle-question w-4 text-center"></i> 幫助中心</button>

                      <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setIsLangOpen(!isLangOpen); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#EE4D2D] transition flex justify-between items-center"><span className="flex items-center gap-3"><i className="fa-solid fa-globe w-4 text-center"></i> 選擇語言</span> <i className={`fa-solid fa-caret-${isLangOpen ? 'down' : 'left'} text-xs text-slate-300`}></i></button>
                          
                          {/* 語言子選單：改為點擊向下展開 (完美適應手機與電腦，不超出螢幕) */}
                          {isLangOpen && (
                              <div className="w-full bg-slate-50 border-y border-slate-100 overflow-hidden">
                                 {LANGUAGES.map(lang => (
                                    <button key={lang.code} onClick={() => { setIsLangOpen(false); setIsUserMenuOpen(false); handleLanguageChange(lang.code); }} className={`w-full text-left px-10 py-3 text-sm font-bold hover:bg-orange-100 transition ${currentLang === lang.code ? 'text-[#EE4D2D]' : 'text-slate-600'}`}>{lang.name}</button>
                                 ))}
                              </div>
                          )}
                      </div>

                      <div className="border-t border-slate-100 mt-1 pt-1"></div>
                      <button onClick={() => { setIsUserMenuOpen(false); onLogout(); }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-3"><i className="fa-solid fa-arrow-right-from-bracket w-4 text-center"></i> 登出帳號</button>
                   </div>
                 </>
              )}
            </div>
          ) : (
            <div className="flex items-center pl-2 md:pl-4 border-l border-white/30">
              <button 
                onClick={() => onNavigate(View.AUTH)}
                className="px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-bold text-[#EE4D2D] bg-white rounded-full hover:bg-slate-50 transition shadow-sm whitespace-nowrap"
              >
                登入 / 註冊
              </button>
            </div>
          )}
        </div>
      </div>

      {isListening && (
         <div className="absolute top-full left-0 w-full bg-slate-800 text-white text-center py-2 text-xs font-bold animate-pulse">
            <i className="fa-solid fa-microphone-lines mr-2"></i> 正在聆聽您的語音，請說話...
         </div>
      )}

      {/* ★ 我的最愛 獨立模組視窗 */}
      <FavoritesModal 
          isOpen={isFavOpen} 
          onClose={() => setIsFavOpen(false)} 
          user={user} 
      />

     {/* ★ 行事曆 獨立模組視窗 */}
      <CalendarModal 
          isOpen={isCalendarOpen} 
          onClose={() => setIsCalendarOpen(false)} 
          user={user} 
      />

      {/* ★ 關注商品 獨立模組視窗 */}
      <SavedProductsModal 
          isOpen={isSavedProductsOpen} 
          onClose={() => setIsSavedProductsOpen(false)} 
          user={user}
          onNavigate={onNavigate}
      />
    </header> 
  );
};

export default Header;