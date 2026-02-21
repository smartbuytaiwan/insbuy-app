import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, User, View, Order } from '../types';
import API from '../api';

interface ShopProps {
  products: Product[];
  categories: Category[]; // 商家的自訂分類
  systemCategories?: Category[]; // 系統分類
  currentShop?: User; 
  currentUser?: User | null;
  orders?: Order[]; // 接收訂單以計算銷量
  allSellers?: User[]; // 新增：接收賣家列表以計算等級加權
  searchQuery?: string; // 接收全域搜尋字串，用於自動解除熱銷鎖定
  onOpenProduct: (product: Product) => void;
  onFollowShop: (shopId: string) => void;
  onNavigate?: (view: View, product?: Product, targetId?: string) => void; 
}

const COMMON_ORIGINS = ["台灣", "美國", "日本", "韓國", "中國", "馬來西亞", "越南", "印尼", "印度"];
const PRODUCTS_PER_PAGE = 12; // 每頁顯示 12 個

const Shop: React.FC<ShopProps> = ({ 
  products, 
  categories, 
  systemCategories = [],
  currentShop, 
  currentUser, 
  orders = [],
  allSellers = [],
  onOpenProduct, 
  onFollowShop,
  onNavigate,
  searchQuery // 來自 props 的搜尋字串
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // 熱銷商品模式狀態
  const [isHotMode, setIsHotMode] = useState(true);
  
  // 手機版分類下拉選單狀態
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  
  const [sortBy, setSortBy] = useState<'POPULAR' | 'LATEST' | 'SALES' | 'PRICE_ASC' | 'PRICE_DESC'>('LATEST');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]); // 支援多選
  
  // 手機版篩選頁籤狀態 (三選一)
  const [activeMobileTab, setActiveMobileTab] = useState<'CATEGORY' | 'REGION' | 'PRICE' | null>(null);

  // 本地 Banner 狀態
  const [localBanner, setLocalBanner] = useState<string | undefined>(currentShop?.banner);

  useEffect(() => {
    setLocalBanner(currentShop?.banner);
  }, [currentShop]);

  // 如果有搜尋字串或進入特定商家，自動關閉熱銷模式
  useEffect(() => {
    if (searchQuery || currentShop) {
      setIsHotMode(false);
    }
  }, [searchQuery, currentShop]);

  // 從 URL 獲取初始頁碼
  const getInitialPage = () => {
     const match = window.location.hash.match(/page=(\d+)/);
     return match ? parseInt(match[1]) : 1;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());

  // 檢舉相關 State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<{type: 'SHOP' | 'PRODUCT', targetId: string, targetName: string, subject: string, reason: string}>({
     type: 'SHOP', targetId: '', targetName: '', subject: '', reason: ''
  });

  // 評分相關 State
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | '5' | '4' | '3' | '2' | '1'>('ALL');

  // 監聽瀏覽器上一頁/下一頁 (PopState) 與 URL 變化
  useEffect(() => {
    const handlePopState = () => {
       setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    const handleHashChange = () => {
       setCurrentPage(getInitialPage());
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
       window.removeEventListener('popstate', handlePopState);
       window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // 當篩選條件改變時，重置頁碼並更新 URL
  useEffect(() => {
    if (currentPage !== 1) {
        updatePageUrl(1);
        setCurrentPage(1);
    }
  }, [selectedCategoryId, isHotMode, minPrice, maxPrice, selectedOrigins, sortBy]);

  // 換頁時自動回到頂部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const updatePageUrl = (page: number) => {
      const currentHash = window.location.hash;
      let newHash = currentHash;
      
      if (currentHash.includes('page=')) {
          newHash = currentHash.replace(/page=(\d+)/, `page=${page}`);
      } else {
          const separator = currentHash.includes('?') ? '&' : '?';
          newHash = `${currentHash}${separator}page=${page}`;
      }
      
      if (page !== getInitialPage()) {
          window.history.pushState(null, '', newHash);
      }
  };

  const handlePageChange = (page: number) => {
      setCurrentPage(page);
      updatePageUrl(page);
  };

  const getSoldData = (productId: string) => {
    const validOrders = orders.filter(o => o.status !== 'CANCELLED');
    let totalSold = 0;
    validOrders.forEach(o => {
      o.items.forEach(item => {
        if (item.id === productId) {
          totalSold += item.qty;
        }
      });
    });
    return totalSold;
  };

  // 計算分類下的商品數量 (包含子分類)
  const getCategoryCount = (categoryId: string) => {
    if (!currentShop) return 0;
    const targetIds = [categoryId];
    // 找出所有子分類
    const children = [...categories, ...systemCategories]
        .filter(c => c.parent_id === categoryId)
        .map(c => c.id);
    targetIds.push(...children);

    return products.filter(p => 
        p.shop_id === (currentShop.shop_id || currentShop.id) && 
        (p.category_ids?.some(id => targetIds.includes(id)) || targetIds.includes(p.category_id || ''))
    ).length;
  };

  const shopDisplayCategories = useMemo(() => {
    if (!currentShop) return [];
    const usedCategoryIds = new Set<string>();
    products.forEach(p => {
       if(p.shop_id === (currentShop.shop_id || currentShop.id)) {
           p.category_ids?.forEach(id => usedCategoryIds.add(id));
           if(p.category_id) usedCategoryIds.add(p.category_id);
       }
    });
    const combinedRoots = [
       ...categories.filter(c => !c.parent_id && c.is_active),
       ...systemCategories.filter(sc => usedCategoryIds.has(sc.id) && !sc.parent_id)
    ];
    return combinedRoots.sort((a, b) => a.sort_order - b.sort_order);
  }, [currentShop, products, categories, systemCategories]);

  const availableOrigins = useMemo(() => {
    const origins = new Set<string>();
    products.forEach(p => {
      if (p.origin) origins.add(p.origin.split(/[0-9]/)[0]); // 簡單過濾掉數字(如地址)保留城市
    });
    return Array.from(origins);
  }, [products]);

  const allDisplayOrigins = useMemo(() => {
    const rawOrigins = Array.from(new Set([...COMMON_ORIGINS, ...availableOrigins]));
    return rawOrigins.filter(o => o.trim() !== '');
  }, [availableOrigins]);

  const getSubCategories = (parentId: string) => {
    const shopSubs = categories.filter(c => c.parent_id === parentId && c.is_active);
    const sysSubs = systemCategories.filter(c => c.parent_id === parentId);
    return [...shopSubs, ...sysSubs].sort((a, b) => a.sort_order - b.sort_order);
  };

  const activeCategory = useMemo(() => {
    return categories.find(c => c.id === selectedCategoryId) || systemCategories.find(c => c.id === selectedCategoryId);
  }, [categories, systemCategories, selectedCategoryId]);

  const displayProducts = useMemo(() => {
    let result = [...products];

    // 熱銷商品優先邏輯
    if (isHotMode) {
        // 嚴格篩選：必須有 pin_rank 且 pin_rank 不為 null/undefined 且 pin_rank > 0
        result = result.filter(p => typeof p.pin_rank === 'number' && p.pin_rank !== null && p.pin_rank > 0);
        // 熱銷模式下強制依照 Rank 排序
        result.sort((a, b) => (a.pin_rank || 9999) - (b.pin_rank || 9999));
    } else {
        // 一般模式
        if (selectedCategoryId) {
          const targetIds = [selectedCategoryId];
          const children = [...categories, ...systemCategories]
            .filter(c => c.parent_id === selectedCategoryId)
            .map(c => c.id);
          targetIds.push(...children);
          result = result.filter(p => {
            return p.category_ids?.some(id => targetIds.includes(id)) || targetIds.includes(p.category_id || '');
          });
        }
        
        // 一般模式的排序
        result.sort((a, b) => {
            const rankA = (a.pin_rank !== undefined && a.pin_rank !== null) ? a.pin_rank : 9999;
            const rankB = (b.pin_rank !== undefined && b.pin_rank !== null) ? b.pin_rank : 9999;
            
            if (rankA !== rankB) {
                return rankA - rankB; 
            }

            // 計算商品加權分數 = 總銷售額(銷量*單價) * 賣家等級
            const getProductWeight = (prod: Product) => {
                const seller = allSellers.find(u => u.shop_id === prod.shop_id || u.id === prod.shop_id);
                const level = seller ? seller.level : 1;
                const revenue = getSoldData(prod.id) * prod.price;
                return revenue * level;
            };

            if (sortBy === 'PRICE_ASC') return a.price - b.price;
            if (sortBy === 'PRICE_DESC') return b.price - a.price;
            if (sortBy === 'SALES') return getSoldData(b.id) - getSoldData(a.id);
            if (sortBy === 'LATEST') return (b.id > a.id ? 1 : -1);
            if (sortBy === 'POPULAR') return getProductWeight(b) - getProductWeight(a); // 改為加權分數排序

            return 0;
        });
    }

    // 通用篩選
    if (minPrice) result = result.filter(p => p.price >= Number(minPrice));
    if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));

    if (selectedOrigins.length > 0) {
      result = result.filter(p => p.origin && selectedOrigins.some(o => p.origin?.includes(o)));
    }

    return result;
  }, [products, selectedCategoryId, isHotMode, sortBy, minPrice, maxPrice, categories, systemCategories, orders, selectedOrigins]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return displayProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [displayProducts, currentPage]);

  const totalPages = Math.ceil(displayProducts.length / PRODUCTS_PER_PAGE);

  const isFollowing = useMemo(() => {
    if (!currentUser || !currentShop) return false;
    const targetId = currentShop.shop_id || currentShop.id;
    return currentUser.following?.includes(targetId);
  }, [currentUser, currentShop]);

  const isCategoryExpanded = (catId: string) => {
    if (selectedCategoryId === catId) return true;
    const subCats = getSubCategories(catId);
    return subCats.some(sub => sub.id === selectedCategoryId);
  };

  const handleShareShop = () => {
    if (!currentShop) return;
    const shopId = currentShop.shop_id || currentShop.id;
    const shareUrl = `${window.location.origin}/#/SHOP/${shopId}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert('賣場連結已複製到剪貼簿！'))
            .catch(() => alert(`您的瀏覽器不支援自動複製，請手動複製網址：\n${shareUrl}`));
    } else {
        alert(`請手動複製網址分享：\n${shareUrl}`);
    }
  };

  const openReport = (type: 'SHOP' | 'PRODUCT', id: string, name: string) => {
      setReportData({ type, targetId: id, targetName: name, subject: '', reason: '' });
      setShowReportModal(true);
  };

  const submitReport = async () => {
      if (!reportData.subject || !reportData.reason) return alert('請填寫主題與原因');
      if (!currentUser) return alert('請先登入');

      try {
          await API.createReport({
              ...reportData,
              reporterId: currentUser.id,
              reporterName: currentUser.name
          });

          alert('檢舉已送出，管理員將會進行審核。');
          setShowReportModal(false);
      } catch (e) {
          console.error(e);
          alert('檢舉發送失敗，請確認伺服器已連線');
      }
  };

  const handleUpdateRank = async (product: Product, rank: number) => {
      if (rank < 1 || rank > 99) return;
      try {
          const updated = { ...product, pin_rank: rank };
          await API.updateProduct(updated);
      } catch (e) {
          console.error(e);
      }
  };

  const canRateSeller = useMemo(() => {
    if (!currentUser || !currentShop) return false;
    if (currentUser.id === currentShop.id) return false; 
    return orders.some(o => 
      (o.shop_id === currentShop.shop_id || o.shop_id === currentShop.id) && 
      o.status === 'COMPLETED' && 
      (o.receiver_phone === currentUser.phone || o.receiver_phone === currentUser.id) 
    );
  }, [currentUser, currentShop, orders]);

  const handleSubmitRating = async () => {
    if (!currentUser || !currentShop) return;
    try {
      await API.addShopReview(currentShop.id, {
        userId: currentUser.id,
        userName: currentUser.shop_name || currentUser.name, 
        rating: ratingVal,
        comment: ratingComment
      });
      alert('評分已送出！');
      setShowRateModal(false);
      setRatingComment('');
      window.location.reload(); 
    } catch (e) {
      alert('評分失敗，請檢查網路連線');
    }
  };

  const filteredReviews = useMemo(() => {
    if (!currentShop || !currentShop.shop_reviews) return [];
    if (reviewFilter === 'ALL') return currentShop.shop_reviews;
    return currentShop.shop_reviews.filter(r => r.rating === parseInt(reviewFilter));
  }, [currentShop, reviewFilter]);

  const toggleMobileTab = (tab: 'CATEGORY' | 'REGION' | 'PRICE') => {
     if (activeMobileTab === tab) setActiveMobileTab(null);
     else setActiveMobileTab(tab);
  };

  // Toggle Dropdown for Shop Categories (Mobile)
  const toggleCategoryDropdown = () => setIsCategoryDropdownOpen(!isCategoryDropdownOpen);

  return (
    <div className="space-y-6">
      
      {/* 非商家頁面 (全域搜尋/首頁) 才顯示紅框處的全域搜尋篩選 */}
      {!currentShop && (
        <div className="md:hidden relative z-40">
           <div className="bg-white shadow-md">
               {/* 1. 篩選頁籤 (Category / Region / Price Range) */}
               <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 text-sm font-bold text-slate-600">
                  <button 
                     onClick={() => toggleMobileTab('CATEGORY')} 
                     className={`py-3 flex items-center justify-center gap-1 bg-white ${activeMobileTab === 'CATEGORY' ? 'text-[#EE4D2D]' : ''}`}
                  >
                     商品分類 <i className={`fa-solid fa-caret-down transition-transform ${activeMobileTab === 'CATEGORY' ? 'rotate-180' : ''}`}></i>
                  </button>
                  <button 
                     onClick={() => toggleMobileTab('REGION')} 
                     className={`py-3 flex items-center justify-center gap-1 bg-white ${activeMobileTab === 'REGION' ? 'text-[#EE4D2D]' : ''}`}
                  >
                     區域搜尋 <i className={`fa-solid fa-caret-down transition-transform ${activeMobileTab === 'REGION' ? 'rotate-180' : ''}`}></i>
                  </button>
                  <button 
                     onClick={() => toggleMobileTab('PRICE')} 
                     className={`py-3 flex items-center justify-center gap-1 bg-white ${activeMobileTab === 'PRICE' ? 'text-[#EE4D2D]' : ''}`}
                  >
                     價格範圍 <i className={`fa-solid fa-caret-down transition-transform ${activeMobileTab === 'PRICE' ? 'rotate-180' : ''}`}></i>
                  </button>
               </div>

               {/* 2. 手機版排序功能 */}
               <div className="p-2 bg-slate-50 border-b border-slate-100">
                   <div className="grid grid-cols-4 gap-1">
                       {[
                         { id: 'POPULAR', label: '綜合排名' },
                         { id: 'LATEST', label: '最新上架' },
                         { id: 'SALES', label: '最熱銷' },
                       ].map(opt => (
                         <button 
                           key={opt.id}
                           onClick={() => setSortBy(opt.id as any)}
                           className={`w-full py-1.5 rounded text-[11px] font-bold transition flex items-center justify-center px-0 ${sortBy === opt.id ? 'bg-[#EE4D2D] text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}
                         >
                           {opt.label}
                         </button>
                       ))}
                       <div className="relative">
                          <select 
                              className={`w-full py-1.5 pl-1 pr-3 rounded text-[11px] font-bold outline-none border border-slate-200 appearance-none text-center ${sortBy.includes('PRICE') ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]' : 'bg-white text-slate-600'}`}
                              onChange={(e) => setSortBy(e.target.value as any)}
                              value={sortBy.includes('PRICE') ? sortBy : ''}
                          >
                              <option value="" disabled hidden>價格排序</option>
                              <option value="PRICE_ASC" className="text-slate-800 bg-white">價格:低到高</option>
                              <option value="PRICE_DESC" className="text-slate-800 bg-white">價格:高到低</option>
                          </select>
                          <i className={`fa-solid fa-caret-down absolute right-1 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none ${sortBy.includes('PRICE') ? 'text-white' : 'text-slate-400'}`}></i>
                       </div>
                   </div>
               </div>

               {/* 手機版 下拉內容區域 */}
               {activeMobileTab && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-xl border-t border-slate-100 p-4 animate-fade-in-down max-h-[60vh] overflow-y-auto z-40">
                     {activeMobileTab === 'CATEGORY' && (
                        <div className="grid grid-cols-2 gap-3">
                           <button 
                              onClick={() => { setIsHotMode(true); setSelectedCategoryId(null); setActiveMobileTab(null); }} 
                              className={`p-3 rounded-lg border text-sm font-bold text-center transition flex items-center justify-center gap-2 ${isHotMode ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200 text-slate-600'}`}
                           >
                              <i className="fa-solid fa-fire text-red-500"></i> 熱銷商品
                           </button>
                           <button 
                              onClick={() => { setIsHotMode(false); setSelectedCategoryId(null); setActiveMobileTab(null); }} 
                              className={`p-3 rounded-lg border text-sm font-bold text-center transition ${!isHotMode && selectedCategoryId === null ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200 text-slate-600'}`}
                           >
                              全部商品
                           </button>
                           
                           {systemCategories.filter(c => !c.parent_id).map(cat => (
                              <button 
                                 key={cat.id}
                                 onClick={() => { setIsHotMode(false); setSelectedCategoryId(cat.id); setActiveMobileTab(null); }}
                                 className={`p-3 rounded-lg border text-sm font-bold text-center truncate ${!isHotMode && selectedCategoryId === cat.id ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200 text-slate-600'}`}
                              >
                                 {cat.name}
                              </button>
                           ))}
                        </div>
                     )}

                     {activeMobileTab === 'REGION' && (
                        <div className="space-y-3">
                           {allDisplayOrigins.map(origin => (
                              <label key={origin} className="flex items-center gap-3 p-2 border-b border-slate-50 last:border-0 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-[#EE4D2D]"
                                    checked={selectedOrigins.includes(origin)}
                                    onChange={(e) => {
                                       if(e.target.checked) setSelectedOrigins([...selectedOrigins, origin]);
                                       else setSelectedOrigins(selectedOrigins.filter(o => o !== origin));
                                    }}
                                 />
                                 <span className="text-slate-700 font-bold">{origin}</span>
                              </label>
                           ))}
                           <button onClick={() => setActiveMobileTab(null)} className="w-full py-2 bg-[#EE4D2D] text-white rounded-lg font-bold mt-2">確認</button>
                        </div>
                     )}

                     {activeMobileTab === 'PRICE' && (
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                              <input 
                                 type="number" 
                                 placeholder="$ 最低" 
                                 className="flex-1 min-w-0 w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-[#EE4D2D]"
                                 value={minPrice}
                                 onChange={e => setMinPrice(e.target.value)}
                              />
                              <span className="text-slate-300 shrink-0">-</span>
                              <input 
                                 type="number" 
                                 placeholder="$ 最高" 
                                 className="flex-1 min-w-0 w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-[#EE4D2D]"
                                 value={maxPrice}
                                 onChange={e => setMaxPrice(e.target.value)}
                              />
                           </div>
                           <button onClick={() => setActiveMobileTab(null)} className="w-full py-3 bg-[#EE4D2D] text-white rounded-xl font-bold">套用價格篩選</button>
                        </div>
                     )}
                  </div>
               )}
           </div>
        </div>
      )}

      {currentShop && (
        <>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 animate-fade-in group/banner">
              {/* Banner 區域 */}
              <div className="h-32 md:h-48 bg-slate-200 relative bg-cover bg-center transition-all" style={{ backgroundImage: `url(${localBanner || 'https://placehold.co/800x200/orange/white?text=Welcome+Shop'})` }}>
                <div className="absolute inset-0 bg-black/30"></div>
              </div>
              
              <div className="px-4 md:px-6 pb-6 pt-2 relative flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
                <div className="relative -mt-12 md:-mt-20 shrink-0">
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-md">
                    <img src={currentShop.logo || 'https://placehold.co/150?text=Logo'} className="w-full h-full object-cover" alt="Shop Logo" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 mb-1 w-full">
                  <h1 className="text-xl md:text-2xl font-black text-slate-800 drop-shadow-sm truncate">{currentShop.shop_name || currentShop.name}</h1>
                  
                  <div className="text-sm text-slate-500 line-clamp-2 mt-1 max-w-2xl">{currentShop.shop_description || '這個賣家很懶，還沒有撰寫介紹...'}</div>
                  
                  <div className="flex items-center gap-3 mt-3 mb-2 flex-wrap">
                     {/* Social Links */}
                     {currentShop.google_map_url && <a href={currentShop.google_map_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center p-1 border border-slate-100"><img src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg" className="w-full h-full object-contain" /></a>}
                     {currentShop.line_url && <a href={currentShop.line_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center p-0.5 border border-slate-100"><img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" className="w-full h-full object-contain" /></a>}
                     {currentShop.facebook_url && <a href={currentShop.facebook_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center border border-slate-100"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-full h-full object-contain" /></a>}
                     {currentShop.instagram_url && <a href={currentShop.instagram_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center p-0.5 border border-slate-100"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" className="w-full h-full object-contain" /></a>}
                     {currentShop.threads_url && <a href={currentShop.threads_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center border border-slate-100 overflow-hidden"><img src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Threads_%28app%29_logo.svg" className="w-full h-full object-contain" /></a>}
                  </div>

                  <div className="flex flex-wrap gap-4 mt-1 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1"><i className="fa-solid fa-star text-yellow-400"></i> {currentShop.stats?.averageRating || '0.0'} 評價</span>
                    <span className="flex items-center gap-1"><i className="fa-solid fa-box text-blue-400"></i> {currentShop.stats?.productCount || 0} 商品</span>
                    <span className="flex items-center gap-1"><i className="fa-solid fa-users text-pink-400"></i> {currentShop.stats?.followerCount || 0} 粉絲</span>
                    <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-green-400"></i> {currentShop.stats?.joinTime || '近期'}加入</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0 flex-nowrap overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                  <button onClick={() => onFollowShop(currentShop.shop_id || currentShop.id)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold border transition whitespace-nowrap ${isFollowing ? 'border-slate-200 text-slate-400 bg-slate-100' : 'border-[#EE4D2D] text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white'}`}>{isFollowing ? '已關注' : '+ 關注'}</button>
                  <button onClick={() => onNavigate && onNavigate(View.CHAT, undefined, currentShop.shop_id || currentShop.id)} className="flex-1 md:flex-none px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition whitespace-nowrap"><i className="fa-regular fa-comments mr-2"></i>愛聊</button>
                  {canRateSeller && (<button onClick={() => setShowRateModal(true)} className="flex-1 md:flex-none px-4 py-2 bg-yellow-400 text-white rounded-lg font-bold hover:bg-yellow-500 transition shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"><i className="fa-solid fa-star"></i> 評分</button>)}
                  <button onClick={handleShareShop} className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 whitespace-nowrap"><i className="fa-solid fa-share-nodes"></i> 分享</button>
                  <button onClick={() => openReport('SHOP', currentShop.id, currentShop.shop_name || currentShop.name)} className="px-3 py-2 bg-white border border-red-200 text-red-500 rounded-lg font-bold hover:bg-red-50 transition text-xs flex-1 md:flex-none whitespace-nowrap"><i className="fa-solid fa-triangle-exclamation"></i> 檢舉</button>
                </div>
              </div>
            </div>

            {/* ★ 修改 1: 商家頁面專用 - 分類下拉式選單 (已移除熱銷推薦) */}
            <div className="md:hidden px-4 mb-4 relative z-30 sticky top-16 mt-4">
                <button 
                    onClick={toggleCategoryDropdown}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm"
                >
                    <span className="font-bold text-slate-700">
                        {selectedCategoryId 
                            ? (shopDisplayCategories.find(c => c.id === selectedCategoryId)?.name || '商品分類') 
                            : isHotMode ? '熱銷推薦' : '全部商品'
                        }
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <span>{isCategoryDropdownOpen ? '收起' : '選擇分類'}</span>
                        <i className={`fa-solid fa-chevron-down transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </div>
                </button>

                {isCategoryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto animate-fade-in-down mx-4">
                        {/* Option: 全部商品 */}
                        <div 
                            onClick={() => {
                                setIsHotMode(false);
                                setSelectedCategoryId(null);
                                setIsCategoryDropdownOpen(false);
                            }}
                            className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-[#EE4D2D]">
                                    <i className="fa-solid fa-border-all"></i>
                                </div>
                                <span className={`font-bold ${!selectedCategoryId && !isHotMode ? 'text-[#EE4D2D]' : 'text-slate-700'}`}>全部商品</span>
                            </div>
                            <span className="text-xs text-slate-400 font-bold">({products.filter(p => p.shop_id === (currentShop.shop_id || currentShop.id)).length})</span>
                        </div>

                        {/* (已移除) Option: 熱銷推薦 */}

                        {/* Dynamic Categories */}
                        {shopDisplayCategories.map(cat => {
                            const count = getCategoryCount(cat.id);
                            return (
                                <div 
                                    key={cat.id}
                                    onClick={() => {
                                        setIsHotMode(false);
                                        setSelectedCategoryId(cat.id);
                                        setIsCategoryDropdownOpen(false);
                                    }}
                                    className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Image or Placeholder */}
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                            {cat.image ? (
                                                <img src={cat.image} className="w-full h-full object-cover" alt={cat.name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <i className="fa-regular fa-image"></i>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-sm ${selectedCategoryId === cat.id ? 'text-[#EE4D2D]' : 'text-slate-700'}`}>
                                                {cat.name}
                                            </span>
                                            <span className="text-xs text-slate-400 font-bold mt-0.5">({count})</span>
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
      )}
      
      {currentShop && activeCategory && (activeCategory.banner || activeCategory.image) && (
        <div className="w-full h-32 md:h-48 rounded-xl overflow-hidden shadow-sm relative animate-fade-in">
           <img src={activeCategory.banner || activeCategory.image} className="w-full h-full object-cover" alt={activeCategory.name} />
           <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
             <h2 className="text-3xl font-black text-white drop-shadow-md tracking-wider">{activeCategory.name}</h2>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* 左側邊欄：手機版隱藏 (因為上方已有篩選列)，電腦版顯示 */}
        <aside className="hidden md:block w-full md:w-60 shrink-0 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-list-ul"></i> 商品分類
            </h3>
            <div className="space-y-1">
              {/* ★ 修改 2: 電腦版側邊欄 - 如果在商家頁面 (currentShop存在)，則不顯示熱銷商品按鈕 */}
              {!currentShop && (
                <button 
                  onClick={() => { setIsHotMode(true); setSelectedCategoryId(null); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${isHotMode ? 'text-[#EE4D2D] bg-[#FFEEEC]' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <i className="fa-solid fa-fire text-red-500"></i> 熱銷商品
                </button>
              )}
              
              <button 
                onClick={() => { setIsHotMode(false); setSelectedCategoryId(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition ${!isHotMode && selectedCategoryId === null ? 'text-[#EE4D2D] bg-[#FFEEEC]' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                全部商品
              </button>
              
              {currentShop ? (
                shopDisplayCategories.map(cat => {
                  const expanded = isCategoryExpanded(cat.id);
                  return (
                    <div key={cat.id}>
                      <button 
                        onClick={() => { setIsHotMode(false); setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition flex justify-between items-center ${!isHotMode && selectedCategoryId === cat.id ? 'text-[#EE4D2D] bg-[#FFEEEC]' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {cat.name}
                        {getSubCategories(cat.id).length > 0 && (
                          <i className={`fa-solid fa-chevron-down text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}></i>
                        )}
                      </button>
                      
                      {expanded && getSubCategories(cat.id).length > 0 && (
                        <div className="ml-4 border-l-2 border-slate-100 pl-2 mt-1 space-y-1 animate-fade-in">
                          {getSubCategories(cat.id).map(sub => (
                             <button 
                              key={sub.id}
                              onClick={(e) => { e.stopPropagation(); setIsHotMode(false); setSelectedCategoryId(sub.id); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${!isHotMode && selectedCategoryId === sub.id ? 'text-[#EE4D2D] font-bold bg-orange-50' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                systemCategories.filter(c => !c.parent_id).map(cat => {
                  const expanded = isCategoryExpanded(cat.id);
                  return (
                    <div key={cat.id}>
                      <button 
                        onClick={() => { setIsHotMode(false); setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition flex justify-between items-center ${!isHotMode && selectedCategoryId === cat.id ? 'text-[#EE4D2D] bg-[#FFEEEC]' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {cat.name}
                        {systemCategories.filter(c => c.parent_id === cat.id).length > 0 && (
                          <i className={`fa-solid fa-chevron-down text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}></i>
                        )}
                      </button>
                      
                      {expanded && systemCategories.filter(c => c.parent_id === cat.id).length > 0 && (
                        <div className="ml-4 border-l-2 border-slate-100 pl-2 mt-1 space-y-1 animate-fade-in">
                          {systemCategories.filter(c => c.parent_id === cat.id).map(sub => (
                             <button 
                              key={sub.id}
                              onClick={(e) => { e.stopPropagation(); setIsHotMode(false); setSelectedCategoryId(sub.id); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${!isHotMode && selectedCategoryId === sub.id ? 'text-[#EE4D2D] font-bold bg-orange-50' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-filter"></i> 價格範圍
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <input 
                type="number" 
                placeholder="$ 最低" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#EE4D2D]"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
              />
              <span className="text-slate-300">-</span>
              <input 
                type="number" 
                placeholder="$ 最高" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#EE4D2D]"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
              />
            </div>
            <button className="w-full py-2 bg-[#EE4D2D] text-white rounded-lg text-xs font-bold hover:bg-[#d73211] transition">
              套用
            </button>
          </div>

          {/* 電腦版：區域搜尋 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-location-dot"></i> 產地/區域
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
               {allDisplayOrigins.map(origin => (
                  <label key={origin} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                     <input 
                        type="checkbox" 
                        className="accent-[#EE4D2D] w-4 h-4"
                        checked={selectedOrigins.includes(origin)}
                        onChange={(e) => {
                           if(e.target.checked) setSelectedOrigins([...selectedOrigins, origin]);
                           else setSelectedOrigins(selectedOrigins.filter(o => o !== origin));
                        }}
                     />
                     <span className="text-sm text-slate-600 font-bold">{origin}</span>
                  </label>
               ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 w-full">
          {/* 電腦版排序功能列 (手機版隱藏) */}
          <div className="hidden md:flex bg-slate-100 p-2 rounded-xl flex-col md:flex-row md:items-center gap-2 mb-6">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
               <span className="text-xs font-bold text-slate-500 px-2 shrink-0">排序：</span>
               {[
                 { id: 'POPULAR', label: '綜合排名' },
                 { id: 'LATEST', label: '最新上架' },
                 { id: 'SALES', label: '最熱銷' },
               ].map(opt => (
                 <button 
                   key={opt.id}
                   onClick={() => setSortBy(opt.id as any)}
                   className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition shrink-0 ${sortBy === opt.id ? 'bg-[#EE4D2D] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                 >
                   {opt.label}
                 </button>
               ))}
            </div>
            
            <select 
              className={`w-full md:w-auto px-4 py-2 rounded-lg text-xs font-bold outline-none cursor-pointer ${sortBy.includes('PRICE') ? 'bg-[#EE4D2D] text-white' : 'bg-white text-slate-600'}`}
              onChange={(e) => setSortBy(e.target.value as any)}
              value={sortBy.includes('PRICE') ? sortBy : ''}
            >
              <option value="" disabled hidden>價格排序</option>
              <option value="PRICE_ASC" className="text-slate-800 bg-white">價格：由低到高</option>
              <option value="PRICE_DESC" className="text-slate-800 bg-white">價格：由高到低</option>
            </select>
          </div>

          {displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
               <i className="fa-solid fa-box-open text-6xl text-slate-200 mb-4"></i>
               <p className="text-slate-400 font-bold">沒有找到符合條件的商品</p>
               <button onClick={() => {setIsHotMode(false); setSelectedCategoryId(null); setMinPrice(''); setMaxPrice(''); setSelectedOrigins([]);}} className="mt-4 px-6 py-2 text-[#EE4D2D] text-sm font-bold hover:underline">
                 清除所有篩選
               </button>
            </div>
          ) : (
            <>
              {/* 使用 paginatedProducts 進行渲染 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {paginatedProducts.map(product => {
                  const soldCount = getSoldData(product.id);
                  const avgRating = product.reviews && product.reviews.length > 0 
                    ? (product.reviews.reduce((a, b) => a + b.rating, 0) / product.reviews.length).toFixed(1) 
                    : '0.0';
                  
                  return (
                    <div 
                      key={product.id}
                      onClick={() => onOpenProduct(product)}
                      className="bg-white rounded-xl overflow-hidden border border-slate-100 hover:border-[#EE4D2D] hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col h-full relative"
                    >
                      {currentUser?.role === 'ADMIN' && (
                        <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                            <input 
                              type="number" 
                              className="w-12 h-8 border-2 border-[#EE4D2D] bg-white text-center font-bold text-[#EE4D2D] rounded shadow-md"
                              placeholder="Rank"
                              min="1"
                              max="99"
                              value={product.pin_rank || ''}
                              onChange={(e) => handleUpdateRank(product, parseInt(e.target.value))}
                            />
                        </div>
                      )}

                      <div className="relative pt-[100%] overflow-hidden bg-slate-100">
                        {product.images[0]?.startsWith('data:video') || product.images[0]?.endsWith('.mp4') ? (
                          <video src={product.images[0] + '#t=0.1'} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" muted />
                        ) : (
                          <img 
                            src={product.images[0] || 'https://placehold.co/300'} 
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        )}
                        
                        {/* ★ 新增：預購徽章 (顯示在圖片右上角) */}
                        {(product as any).is_preorder && (
                            <div className="absolute top-0 right-0 bg-[#EE4D2D] text-white text-[11px] font-black px-2 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
                                <i className="fa-solid fa-fire"></i> 熱烈預購中
                            </div>
                        )}

                        {/* 原本的熱銷排名標籤 (改為黃色，避免跟預購標籤撞色) */}
                        {product.pin_rank && product.pin_rank > 0 && (
                          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm z-10">
                            NO.{product.pin_rank}
                          </div>
                        )}
                        
                        {/* 原本的特價標籤 */}
                        {product.original_price > product.price && (!product.pin_rank || product.pin_rank === 0) && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm z-10">
                            SALE
                          </div>
                        )}
                      </div>

                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-1 group-hover:text-[#EE4D2D] transition h-10">
                          {product.name}
                        </h3>
                        
                        <div className="mt-auto pt-2 space-y-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-black text-[#EE4D2D]">$</span>
                            <span className="text-lg font-black text-[#EE4D2D]">{product.price.toLocaleString()}</span>
                            {product.original_price > product.price && (
                              <span className="text-xs text-slate-300 line-through ml-1">${product.original_price.toLocaleString()}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <i className="fa-solid fa-star text-yellow-400 text-[10px]"></i>
                              <span>{avgRating}</span>
                            </div>
                            <span>已售 {soldCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分頁控制項 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 font-bold text-sm transition"
                  >
                    <i className="fa-solid fa-chevron-left mr-2"></i> 上一頁
                  </button>
                  <span className="text-sm font-black text-slate-600">
                    第 {currentPage} 頁 / 共 {totalPages} 頁
                  </span>
                  <button 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 font-bold text-sm transition"
                  >
                    下一頁 <i className="fa-solid fa-chevron-right ml-2"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 買家評價區塊 */}
      {currentShop && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 animate-fade-in mt-8">
           <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              買家評價
              <span className="text-sm font-normal text-slate-500 ml-2">({currentShop.shop_reviews?.length || 0})</span>
           </h3>
           
           <div className="bg-[#FFFBF8] border border-[#F9EDE5] p-6 rounded-lg mb-6 flex flex-col md:flex-row items-center gap-8">
              <div className="text-center px-4">
                 <div className="text-[#EE4D2D] text-4xl font-black mb-1">
                    {currentShop.stats?.averageRating?.toFixed(1) || '0.0'}<span className="text-xl">/5</span>
                 </div>
                 <div className="text-[#EE4D2D] text-sm">
                    {[1,2,3,4,5].map(star => (
                       <i key={star} className={`fa-solid fa-star ${star <= Math.round(currentShop.stats?.averageRating || 0) ? '' : 'text-slate-300'}`}></i>
                    ))}
                 </div>
              </div>
              <div className="flex flex-wrap gap-2 flex-1 justify-center md:justify-start">
                 <button 
                    onClick={() => setReviewFilter('ALL')}
                    className={`px-4 py-2 border rounded-sm text-sm transition ${reviewFilter === 'ALL' ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#EE4D2D]'}`}
                 >
                    全部
                 </button>
                 {['5', '4', '3', '2', '1'].map(star => (
                    <button 
                       key={star}
                       onClick={() => setReviewFilter(star as any)}
                       className={`px-4 py-2 border rounded-sm text-sm transition ${reviewFilter === star ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#EE4D2D]'}`}
                    >
                       {star} 星 ({currentShop.shop_reviews?.filter(r => r.rating === parseInt(star)).length || 0})
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                 <div className="text-center py-12 text-slate-400">
                    <i className="fa-regular fa-comment-dots text-4xl mb-3"></i>
                    <div>暫無相關評價</div>
                 </div>
              ) : (
                 filteredReviews.map(review => (
                    <div key={review.id} className="flex gap-4 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                       <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">
                          {review.userName[0]}
                       </div>
                       <div className="flex-1">
                          <div className="text-xs text-slate-700 font-bold mb-1">{review.userName}</div>
                          <div className="flex items-center gap-1 text-[#EE4D2D] text-xs mb-2">
                             {[1,2,3,4,5].map(star => (
                                <i key={star} className={`fa-solid fa-star ${star <= review.rating ? '' : 'text-slate-200'}`}></i>
                             ))}
                          </div>
                          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{review.comment}</div>
                          <div className="text-[10px] text-slate-400 mt-2">{new Date(review.createdAt).toLocaleString()}</div>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      )}

      {/* 評分 Modal */}
      {showRateModal && (
         <div className="fixed inset-0 bg-black/50 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
               <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-star text-yellow-400"></i>
                  給予商家評分
               </h3>
               <p className="text-xs text-slate-500 mb-4">您的評價將會公開顯示店名或帳號。</p>
               
               <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                     <button 
                       key={star} 
                       onClick={() => setRatingVal(star)}
                       className={`text-3xl transition ${star <= ratingVal ? 'text-yellow-400 scale-110' : 'text-slate-200 hover:text-yellow-200'}`}
                     >
                       <i className="fa-solid fa-star"></i>
                     </button>
                  ))}
               </div>

               <textarea 
                  className="w-full h-32 border border-slate-300 rounded-lg p-3 outline-none focus:border-yellow-400 resize-none text-sm mb-4"
                  placeholder="寫下您對此商家的評價..."
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
               />

               <div className="flex gap-3">
                  <button onClick={handleSubmitRating} className="flex-1 bg-yellow-400 text-white font-bold py-2 rounded-lg hover:bg-yellow-500 transition">送出評價</button>
                  <button onClick={() => setShowRateModal(false)} className="flex-1 bg-slate-200 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-300 transition">取消</button>
               </div>
            </div>
         </div>
      )}

      {/* 檢舉視窗 */}
      {showReportModal && (
         <div className="fixed inset-0 bg-black/50 z-[1300] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
               <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                  檢舉{reportData.type === 'SHOP' ? '商家' : '商品'}
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-bold text-slate-600 mb-1">檢舉對象</label>
                     <div className="text-slate-800 font-bold bg-slate-50 p-2 rounded">{reportData.targetName}</div>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-600 mb-1">檢舉主題</label>
                     <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-red-500"
                        placeholder="例如：販售違禁品、詐騙..."
                        value={reportData.subject}
                        onChange={e => setReportData({...reportData, subject: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-600 mb-1">詳細原因</label>
                     <textarea 
                        className="w-full h-32 border border-slate-300 rounded-lg p-2 outline-none focus:border-red-500 resize-none"
                        placeholder="請詳細說明檢舉原因..."
                        value={reportData.reason}
                        onChange={e => setReportData({...reportData, reason: e.target.value})}
                     />
                  </div>
                  <div className="flex gap-3 pt-2">
                     <button onClick={submitReport} className="flex-1 bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600">提交檢舉</button>
                     <button onClick={() => setShowReportModal(false)} className="flex-1 bg-slate-200 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-300">取消</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Shop;