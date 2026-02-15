import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, User, View, Order, ShopReview } from '../types';
import API from '../api';

interface ShopProps {
  products: Product[];
  categories: Category[]; // 商家的自訂分類
  systemCategories?: Category[]; // 系統分類
  currentShop?: User; 
  currentUser?: User | null;
  orders?: Order[]; // 接收訂單以計算銷量
  onOpenProduct: (product: Product) => void;
  onFollowShop: (shopId: string) => void;
  onNavigate?: (view: View, product?: Product, targetId?: string) => void; 
}

const COMMON_ORIGINS = ["台灣", "美國", "日本", "韓國", "中國", "馬來西亞", "越南", "印尼", "印度"];
const PRODUCTS_PER_PAGE = 12; // 每頁顯示 12 個

// ★ 新增：台灣行政區資料，用於搜尋篩選
const TAIWAN_DISTRICTS: Record<string, string[]> = {
    "基隆市": ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "暖暖區", "七堵區"],
    "台北市": ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"],
    "新北市": ["板橋區", "新莊區", "中和區", "永和區", "土城區", "樹林區", "三峽區", "鶯歌區", "三重區", "蘆洲區", "五股區", "泰山區", "林口區", "淡水區", "金山區", "八里區", "萬里區", "石門區", "三芝區", "瑞芳區", "汐止區", "平溪區", "貢寮區", "雙溪區", "深坑區", "石碇區", "新店區", "坪林區", "烏來區"],
    "桃園市": ["桃園區", "中壢區", "平鎮區", "八德區", "楊梅區", "蘆竹區", "大溪區", "龍潭區", "龜山區", "大園區", "觀音區", "新屋區", "復興區"],
    "新竹市": ["東區", "北區", "香山區"],
    "新竹縣": ["竹北市", "竹東鎮", "新埔鎮", "關西鎮", "湖口鄉", "新豐鄉", "芎林鄉", "橫山鄉", "北埔鄉", "寶山鄉", "峨眉鄉", "尖石鄉", "五峰鄉"],
    "苗栗縣": ["苗栗市", "頭份市", "竹南鎮", "後龍鎮", "通霄鎮", "苑裡鎮", "卓蘭鎮", "造橋鄉", "西湖鄉", "頭屋鄉", "公館鄉", "銅鑼鄉", "三義鄉", "大湖鄉", "獅潭鄉", "三灣鄉", "南庄鄉", "泰安鄉"],
    "台中市": ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "后里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"],
    "彰化縣": ["彰化市", "員林市", "和美鎮", "鹿港鎮", "溪湖鎮", "二林鎮", "田中鎮", "北斗鎮", "花壇鄉", "芬園鄉", "大村鄉", "永靖鄉", "伸港鄉", "線西鄉", "福興鄉", "秀水鄉", "埔心鄉", "埔鹽鄉", "大城鄉", "芳苑鄉", "二水鄉", "社頭鄉", "田尾鄉", "埤頭鄉", "溪州鄉", "竹塘鄉"],
    "南投縣": ["南投市", "埔里鎮", "草屯鎮", "竹山鎮", "集集鎮", "名間鄉", "鹿谷鄉", "中寮鄉", "魚池鄉", "國姓鄉", "水里鄉", "信義鄉", "仁愛鄉"],
    "雲林縣": ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "林內鄉", "古坑鄉", "大埤鄉", "莿桐鄉", "褒忠鄉", "二崙鄉", "崙背鄉", "麥寮鄉", "臺西鄉", "東勢鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉"],
    "嘉義市": ["東區", "西區"],
    "嘉義縣": ["太保市", "朴子市", "布袋鎮", "大林鎮", "民雄鄉", "溪口鄉", "新港鄉", "六腳鄉", "東石鄉", "義竹鄉", "鹿草鄉", "水上鄉", "中埔鄉", "竹崎鄉", "梅山鄉", "番路鄉", "大埔鄉", "阿里山鄉"],
    "台南市": ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"],
    "高雄市": ["楠梓區", "左營區", "鼓山區", "三民區", "鹽埕區", "前金區", "新興區", "苓雅區", "前鎮區", "旗津區", "小港區", "鳳山區", "大寮區", "鳥松區", "林園區", "仁武區", "大樹區", "大社區", "岡山區", "路竹區", "橋頭區", "梓官區", "彌陀區", "永安區", "燕巢區", "田寮區", "阿蓮區", "茄萣區", "湖內區", "旗山區", "美濃區", "內門區", "杉林區", "甲仙區", "六龜區", "茂林區", "桃源區", "那瑪夏區"],
    "屏東縣": ["屏東市", "潮州鎮", "東港鎮", "恆春鎮", "萬丹鄉", "長治鄉", "麟洛鄉", "九如鄉", "里港鄉", "鹽埔鄉", "高樹鄉", "萬巒鄉", "內埔鄉", "竹田鄉", "新埤鄉", "枋寮鄉", "新園鄉", "崁頂鄉", "林邊鄉", "南州鄉", "佳冬鄉", "琉球鄉", "車城鄉", "滿州鄉", "枋山鄉", "霧台鄉", "瑪家鄉", "泰武鄉", "來義鄉", "春日鄉", "獅子鄉", "牡丹鄉", "三地門鄉"],
    "宜蘭縣": ["宜蘭市", "羅東鎮", "蘇澳鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "冬山鄉", "五結鄉", "三星鄉", "大同鄉", "南澳鄉"],
    "花蓮縣": ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"],
    "台東縣": ["台東市", "成功鎮", "關山鎮", "長濱鄉", "池上鄉", "東河鄉", "鹿野鄉", "卑南鄉", "大武鄉", "綠島鄉", "太麻里鄉", "海端鄉", "延平鄉", "金峰鄉", "達仁鄉", "蘭嶼鄉"],
    "澎湖縣": ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"],
    "金門縣": ["金城鎮", "金湖鎮", "金沙鎮", "金寧鄉", "烈嶼鄉", "烏坵鄉"],
    "連江縣": ["南竿鄉", "北竿鄉", "莒光鄉", "東引鄉"]
};

const Shop: React.FC<ShopProps> = ({ 
  products, 
  categories, 
  systemCategories = [],
  currentShop, 
  currentUser, 
  orders = [],
  onOpenProduct, 
  onFollowShop,
  onNavigate
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'POPULAR' | 'LATEST' | 'SALES' | 'PRICE_ASC' | 'PRICE_DESC'>('LATEST');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]); // 支援多選
  
  // ★ 新增：縣市與區域篩選狀態
  const [searchCity, setSearchCity] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');

  const [localBanner, setLocalBanner] = useState<string | undefined>(currentShop?.banner);

  useEffect(() => {
    setLocalBanner(currentShop?.banner);
  }, [currentShop]);

  const getInitialPage = () => {
     const match = window.location.hash.match(/page=(\d+)/);
     return match ? parseInt(match[1]) : 1;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<{type: 'SHOP' | 'PRODUCT', targetId: string, targetName: string, subject: string, reason: string}>({
     type: 'SHOP', targetId: '', targetName: '', subject: '', reason: ''
  });

  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | '5' | '4' | '3' | '2' | '1'>('ALL');

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

  useEffect(() => {
    if (currentPage !== 1) {
        updatePageUrl(1);
        setCurrentPage(1);
    }
  }, [selectedCategoryId, minPrice, maxPrice, selectedOrigins, sortBy, searchCity, searchDistrict]);

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
      if (p.origin) origins.add(p.origin);
    });
    return Array.from(origins);
  }, [products]);

  const allDisplayOrigins = useMemo(() => {
    return Array.from(new Set([...COMMON_ORIGINS, ...availableOrigins]));
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

    if (minPrice) result = result.filter(p => p.price >= Number(minPrice));
    if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));

    if (selectedOrigins.length > 0) {
      result = result.filter(p => p.origin && selectedOrigins.includes(p.origin));
    }

    // ★ 修改重點：新增區域篩選邏輯 (針對 shipping_origin)
    // 會比對 shipping_origin 是否包含搜尋的縣市字串 (如: "台北市")
    if (searchCity) {
        result = result.filter(p => p.shipping_origin && p.shipping_origin.includes(searchCity));
    }
    // 區域比對 (如: "中山區")
    if (searchDistrict) {
        result = result.filter(p => p.shipping_origin && p.shipping_origin.includes(searchDistrict));
    }

    result.sort((a, b) => {
        const rankA = (a.pin_rank !== undefined && a.pin_rank !== null) ? a.pin_rank : 9999;
        const rankB = (b.pin_rank !== undefined && b.pin_rank !== null) ? b.pin_rank : 9999;
        
        if (rankA !== rankB) {
            return rankA - rankB; 
        }

        if (sortBy === 'PRICE_ASC') return a.price - b.price;
        if (sortBy === 'PRICE_DESC') return b.price - a.price;
        if (sortBy === 'SALES') return getSoldData(b.id) - getSoldData(a.id);
        if (sortBy === 'LATEST') return (b.id > a.id ? 1 : -1);
        if (sortBy === 'POPULAR') return getSoldData(b.id) - getSoldData(a.id);

        return 0;
    });

    return result;
  }, [products, selectedCategoryId, sortBy, minPrice, maxPrice, categories, systemCategories, orders, selectedOrigins, searchCity, searchDistrict]);

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

  const isOwner = currentUser && currentShop && (currentUser.id === currentShop.id || currentUser.shop_id === currentShop.shop_id);

  return (
    <div className="space-y-6">
      {/* 1. 賣家 Banner 區塊 */}
      {currentShop && (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 animate-fade-in group/banner">
          <div className="h-32 md:h-48 bg-slate-200 relative bg-cover bg-center transition-all" style={{ backgroundImage: `url(${localBanner || 'https://placehold.co/800x200/orange/white?text=Welcome+Shop'})` }}>
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          
          <div className="px-6 pb-6 pt-2 relative flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="relative -mt-16 md:-mt-20 shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-md">
                <img src={currentShop.logo || 'https://placehold.co/150?text=Logo'} className="w-full h-full object-cover" alt="Shop Logo" />
              </div>
            </div>

            <div className="flex-1 min-w-0 mb-1">
              <h1 className="text-2xl font-black text-slate-800 drop-shadow-sm truncate">{currentShop.shop_name || currentShop.name}</h1>
              
              <div className="text-sm text-slate-500 line-clamp-2 mt-1 max-w-2xl">{currentShop.shop_description || '這個賣家很懶，還沒有撰寫介紹...'}</div>
              
              <div className="flex items-center gap-3 mt-3 mb-2">
                 {currentShop.google_map_url && (
                    <a href={currentShop.google_map_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center p-1 border border-slate-100" title="Google Maps">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg" className="w-full h-full object-contain" alt="Google Map" />
                    </a>
                 )}
                 {currentShop.line_url && (
                    <a href={currentShop.line_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center p-0.5 border border-slate-100" title="Line">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" className="w-full h-full object-contain" alt="Line" />
                    </a>
                 )}
                 {currentShop.facebook_url && (
                    <a href={currentShop.facebook_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center border border-slate-100" title="Facebook">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-full h-full object-contain" alt="Facebook" />
                    </a>
                 )}
                 {currentShop.instagram_url && (
                    <a href={currentShop.instagram_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center p-0.5 border border-slate-100" title="Instagram">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" className="w-full h-full object-contain" alt="Instagram" />
                    </a>
                 )}
                 {currentShop.threads_url && (
                    <a href={currentShop.threads_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full shadow-sm hover:scale-110 transition bg-white flex items-center justify-center border border-slate-100 overflow-hidden" title="Threads">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Threads_%28app%29_logo.svg" className="w-full h-full object-contain" alt="Threads" />
                    </a>
                 )}
              </div>

              <div className="flex flex-wrap gap-4 mt-1 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1"><i className="fa-solid fa-star text-yellow-400"></i> {currentShop.stats?.averageRating || '0.0'} 評價</span>
                <span className="flex items-center gap-1"><i className="fa-solid fa-box text-blue-400"></i> {currentShop.stats?.productCount || 0} 商品</span>
                <span className="flex items-center gap-1"><i className="fa-solid fa-users text-pink-400"></i> {currentShop.stats?.followerCount || 0} 粉絲</span>
                <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-green-400"></i> {currentShop.stats?.joinTime || '近期'}加入</span>
              </div>
            </div>

            <div className="flex gap-3 shrink-0 w-full md:w-auto mt-2 md:mt-0 flex-wrap">
              <button 
                onClick={() => onFollowShop(currentShop.shop_id || currentShop.id)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold border transition ${isFollowing ? 'border-slate-200 text-slate-400 bg-slate-100' : 'border-[#EE4D2D] text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white'}`}
              >
                {isFollowing ? '已關注' : '+ 關注'}
              </button>
              <button 
                onClick={() => onNavigate && onNavigate(View.CHAT, undefined, currentShop.shop_id || currentShop.id)}
                className="flex-1 md:flex-none px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition"
              >
                <i className="fa-regular fa-comments mr-2"></i>愛聊
              </button>
              
              {canRateSeller && (
                <button 
                  onClick={() => setShowRateModal(true)}
                  className="flex-1 md:flex-none px-4 py-2 bg-yellow-400 text-white rounded-lg font-bold hover:bg-yellow-500 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-star"></i> 給予評分
                </button>
              )}

              <button 
                onClick={handleShareShop}
                className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-share-nodes"></i> 分享
              </button>

              <button 
                onClick={() => openReport('SHOP', currentShop.id, currentShop.shop_name || currentShop.name)}
                className="px-3 py-2 bg-white border border-red-200 text-red-500 rounded-lg font-bold hover:bg-red-50 transition text-xs"
              >
                <i className="fa-solid fa-triangle-exclamation"></i> 檢舉
              </button>
            </div>
          </div>
        </div>
      )}
      
      {currentShop && activeCategory && (activeCategory.banner || activeCategory.image) && (
        <div className="w-full h-32 md:h-48 rounded-xl overflow-hidden shadow-sm relative animate-fade-in">
           <img 
             src={activeCategory.banner || activeCategory.image} 
             className="w-full h-full object-cover" 
             alt={activeCategory.name}
           />
           <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
             <h2 className="text-3xl font-black text-white drop-shadow-md tracking-wider">{activeCategory.name}</h2>
           </div>
        </div>
      )}

      {/* 2. 側邊欄與商品列表 */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <aside className="w-full md:w-60 shrink-0 space-y-4">
          
          {/* ★ 修改重點：新增區域搜尋面板 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot text-[#EE4D2D]"></i> 區域搜尋
            </h3>
            <div className="space-y-3">
               <div>
                  <select 
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-[#EE4D2D] bg-slate-50"
                    value={searchCity}
                    onChange={e => {
                        setSearchCity(e.target.value);
                        setSearchDistrict(''); // 切換縣市時重置區域
                    }}
                  >
                     <option value="">所有縣市</option>
                     {Object.keys(TAIWAN_DISTRICTS).map(city => (
                        <option key={city} value={city}>{city}</option>
                     ))}
                  </select>
               </div>
               
               {searchCity && (
                   <div className="animate-fade-in">
                      <select 
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-[#EE4D2D] bg-slate-50"
                        value={searchDistrict}
                        onChange={e => setSearchDistrict(e.target.value)}
                      >
                         <option value="">所有區域</option>
                         {TAIWAN_DISTRICTS[searchCity].map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                         ))}
                      </select>
                   </div>
               )}
               
               {(searchCity || searchDistrict) && (
                   <button 
                     onClick={() => { setSearchCity(''); setSearchDistrict(''); }}
                     className="w-full py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200"
                   >
                     清除地點篩選
                   </button>
               )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-list-ul"></i> 商品分類
            </h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition ${selectedCategoryId === null ? 'text-[#EE4D2D] bg-[#FFEEEC]' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                所有商品
              </button>
              
              {currentShop ? (
                shopDisplayCategories.map(cat => {
                  const expanded = isCategoryExpanded(cat.id);
                  return (
                    <div key={cat.id}>
                      <button 
                        onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition flex justify-between items-center ${selectedCategoryId === cat.id ? 'text-[#EE4D2D] bg-[#FFEEEC]' : 'text-slate-600 hover:bg-slate-50'}`}
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
                              onClick={(e) => { e.stopPropagation(); setSelectedCategoryId(sub.id); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${selectedCategoryId === sub.id ? 'text-[#EE4D2D] font-bold bg-[#FFEEEC]' : 'text-slate-500 hover:text-slate-800'}`}
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
                        onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition flex justify-between items-center ${selectedCategoryId === cat.id ? 'text-[#EE4D2D] bg-[#FFEEEC]' : 'text-slate-600 hover:bg-slate-50'}`}
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
                              onClick={(e) => { e.stopPropagation(); setSelectedCategoryId(sub.id); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${selectedCategoryId === sub.id ? 'text-[#EE4D2D] font-bold bg-[#FFEEEC]' : 'text-slate-500 hover:text-slate-800'}`}
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
            <button className="w-full py-2 primary-gradient text-white rounded-lg text-xs font-bold hover:opacity-90 transition shadow-sm">
              套用
            </button>
          </div>
        </aside>

        <div className="flex-1 w-full">
          <div className="bg-slate-100 p-2 rounded-xl flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-bold text-slate-500 px-2">排序：</span>
            {[
              { id: 'POPULAR', label: '綜合排名' },
              { id: 'LATEST', label: '最新上架' },
              { id: 'SALES', label: '最熱銷' },
            ].map(opt => (
              <button 
                key={opt.id}
                onClick={() => setSortBy(opt.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${sortBy === opt.id ? 'bg-[#EE4D2D] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {opt.label}
              </button>
            ))}
            <select 
              className={`px-4 py-2 rounded-lg text-xs font-bold outline-none cursor-pointer ${sortBy.includes('PRICE') ? 'bg-[#EE4D2D] text-white' : 'bg-white text-slate-600'}`}
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
               <button onClick={() => {setSelectedCategoryId(null); setMinPrice(''); setMaxPrice(''); setSelectedOrigins([]); setSearchCity(''); setSearchDistrict('');}} className="mt-4 px-6 py-2 text-[#EE4D2D] text-sm font-bold hover:underline">
                 清除所有篩選
               </button>
            </div>
          ) : (
            <>
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
                      // ★ 修改重點：Hover 邊框顏色改為橘紅色
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
                        {product.is_pinned && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-[#EE4D2D] to-[#FF7F27] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                            店長推薦
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

                          {/* ★ 修改重點：優先顯示詳細出貨地址 */}
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                             <i className="fa-solid fa-location-dot text-slate-400"></i>
                             <span className="truncate">{product.shipping_origin || product.origin || '台灣'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

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

      {/* 3. 買家評價區塊 (僅在賣家頁面顯示) */}
      {currentShop && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 animate-fade-in mt-8">
           <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              買家評價
              <span className="text-sm font-normal text-slate-500 ml-2">({currentShop.shop_reviews?.length || 0})</span>
           </h3>
           
           <div className="bg-[#FFFBF8] border border-[#F9EDE5] p-6 rounded-lg mb-6 flex items-center gap-8">
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
              <div className="flex flex-wrap gap-2 flex-1">
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