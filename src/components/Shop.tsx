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

// 台灣行政區資料，用於搜尋篩選
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
  // ★ 修改：預設分類改為 'HOT' (熱銷商品)
  const [selectedMainCat, setSelectedMainCat] = useState<string>('HOT');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('ALL');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'POPULAR' | 'LATEST' | 'SALES' | 'PRICE_ASC' | 'PRICE_DESC'>('LATEST');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);

  // 檢舉商家 Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<{type: 'SHOP' | 'PRODUCT', targetId: string, targetName: string, subject: string, reason: string}>({ 
      type: 'SHOP', targetId: '', targetName: '', subject: '', reason: '' 
  });

  // 評分 Modal
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | '5' | '4' | '3' | '2' | '1'>('ALL');

  const [localBanner, setLocalBanner] = useState<string | undefined>(currentShop?.banner);

  useEffect(() => {
    setLocalBanner(currentShop?.banner);
  }, [currentShop]);

  // ★ 整合分類邏輯：根據是否在商家頁面，決定顯示商家分類或系統分類
  const displayCategories = useMemo(() => {
    // 如果是在看特定商家 (Shop View)，只顯示該商家的分類
    if (currentShop) {
        return categories.filter(c => !c.parent_id);
    }
    // 否則顯示系統分類 (Platform View)
    return systemCategories.filter(c => !c.parent_id);
  }, [categories, systemCategories, currentShop]);

  const getSubCategories = (parentId: string) => {
    if (currentShop) {
        return categories.filter(c => c.parent_id === parentId);
    }
    return systemCategories.filter(c => c.parent_id === parentId);
  };

  // 重置頁碼當篩選條件改變
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMainCat, selectedSubCat, searchTerm, selectedOrigin, selectedCity, selectedDistrict, sortBy, minPrice, maxPrice]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // ★ 修改：商品篩選與排序邏輯
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => p.status === 'OPEN' && p.total_stock > 0);

    // 1. 如果是在特定商家頁面，先過濾該商家的商品
    if (currentShop) {
       result = result.filter(p => p.shop_id === currentShop.id || p.shop_id === currentShop.shop_id);
    }

    // 2. 搜尋關鍵字
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lower) || p.description?.toLowerCase().includes(lower));
    }

    // 3. 產地篩選
    if (selectedOrigin) {
        result = result.filter(p => p.origin === selectedOrigin);
    }

    // 4. 地區篩選 (出貨地)
    if (selectedCity) {
        result = result.filter(p => p.shipping_origin && p.shipping_origin.includes(selectedCity));
    }
    if (selectedDistrict) {
        result = result.filter(p => p.shipping_origin && p.shipping_origin.includes(selectedDistrict));
    }

    // 5. 價格範圍
    if (minPrice) result = result.filter(p => p.price >= Number(minPrice));
    if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));

    // ★ 修改：分類篩選邏輯
    if (selectedMainCat === 'HOT') {
        // ★ 熱銷商品：只顯示有設定 pin_rank 且 > 0 的商品
        result = result.filter(p => p.pin_rank && p.pin_rank > 0);
        // ★ 排序：依照 pin_rank 由小到大排序 (1號最前面)
        result.sort((a, b) => (a.pin_rank || 9999) - (b.pin_rank || 9999));
    } else if (selectedMainCat !== 'ALL') {
        // 一般分類篩選
        if (selectedSubCat !== 'ALL') {
            result = result.filter(p => p.category_ids?.includes(selectedSubCat));
        } else {
            // 選中主分類時，包含主分類及其子分類
            const childCats = getSubCategories(selectedMainCat);
            const childIds = childCats.map(c => c.id);
            result = result.filter(p => p.category_ids?.includes(selectedMainCat) || p.category_ids?.some(id => childIds.includes(id)));
        }
        
        // 一般排序邏輯 (非熱銷時)
        if (sortBy === 'PRICE_ASC') result.sort((a, b) => a.price - b.price);
        else if (sortBy === 'PRICE_DESC') result.sort((a, b) => b.price - a.price);
        else if (sortBy === 'SALES') result.sort((a, b) => getSoldData(b.id) - getSoldData(a.id));
        else if (sortBy === 'LATEST') result.sort((a, b) => (b.id > a.id ? 1 : -1));
        else if (sortBy === 'POPULAR') result.sort((a, b) => getSoldData(b.id) - getSoldData(a.id));
    } else {
        // 'ALL' 類別時的排序
        if (sortBy === 'PRICE_ASC') result.sort((a, b) => a.price - b.price);
        else if (sortBy === 'PRICE_DESC') result.sort((a, b) => b.price - a.price);
        else if (sortBy === 'SALES') result.sort((a, b) => getSoldData(b.id) - getSoldData(a.id));
        else if (sortBy === 'LATEST') result.sort((a, b) => (b.id > a.id ? 1 : -1));
        else if (sortBy === 'POPULAR') result.sort((a, b) => getSoldData(b.id) - getSoldData(a.id));
    }

    return result;
  }, [products, selectedMainCat, selectedSubCat, searchTerm, selectedOrigin, selectedCity, selectedDistrict, currentShop, sortBy, minPrice, maxPrice, categories, systemCategories]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  const getSoldData = (productId: string) => {
      if (!orders) return 0;
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

  const isFollowing = useMemo(() => {
    if (!currentUser || !currentShop) return false;
    const targetId = currentShop.shop_id || currentShop.id;
    return currentUser.following?.includes(targetId);
  }, [currentUser, currentShop]);

  const activeCategory = useMemo(() => {
    if (selectedMainCat === 'HOT' || selectedMainCat === 'ALL') return null;
    return categories.find(c => c.id === selectedMainCat) || systemCategories.find(c => c.id === selectedMainCat);
  }, [categories, systemCategories, selectedMainCat]);

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
      if (!reportData.subject || !reportData.reason) return alert('請填寫完整檢舉資訊');
      if (!currentUser) return alert('請先登入');

      try {
          await API.createReport({
              ...reportData,
              reporterId: currentUser.id,
              reporterName: currentUser.name
          });
          alert('檢舉已提交，我們將盡快審核。');
          setShowReportModal(false);
          setReportData({ type: 'SHOP', targetId: '', targetName: '', subject: '', reason: '' });
      } catch (e) {
          alert('提交失敗，請稍後再試');
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] animate-fade-in pb-20">
      
      {/* 側邊欄：分類導覽 */}
      <aside className="w-full md:w-64 bg-white shadow-sm border-r border-slate-100 z-30 flex-shrink-0 md:h-[calc(100vh-80px)] md:sticky md:top-20 overflow-y-auto">
        <div className="p-5">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">商品分類</div>
          <div className="space-y-1">
            {/* 只有在平台首頁才顯示「熱銷商品」 */}
            {!currentShop && (
                <button 
                    onClick={() => { setSelectedMainCat('HOT'); setSelectedSubCat('ALL'); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${selectedMainCat === 'HOT' ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <span className="flex items-center gap-2"><i className="fa-solid fa-fire text-red-500"></i> 熱銷商品</span>
                    {selectedMainCat === 'HOT' && <i className="fa-solid fa-chevron-right text-xs"></i>}
                </button>
            )}

            <button 
              onClick={() => { setSelectedMainCat('ALL'); setSelectedSubCat('ALL'); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${selectedMainCat === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2"><i className="fa-solid fa-layer-group opacity-50"></i> 全部商品</span>
              {selectedMainCat === 'ALL' && <i className="fa-solid fa-chevron-right text-xs"></i>}
            </button>
            
            {/* ★ 修復：確保分類列表被正確渲染 */}
            {displayCategories.map(cat => (
              <div key={cat.id}>
                <button 
                  onClick={() => { setSelectedMainCat(cat.id); setSelectedSubCat('ALL'); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${selectedMainCat === cat.id ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="truncate">{cat.name}</span>
                  {selectedMainCat === cat.id && <i className="fa-solid fa-chevron-right text-xs"></i>}
                </button>
                
                {/* 子分類展開 */}
                {selectedMainCat === cat.id && getSubCategories(cat.id).length > 0 && (
                   <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-100 space-y-1 animate-fade-in">
                      <button 
                        onClick={() => setSelectedSubCat('ALL')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition ${selectedSubCat === 'ALL' ? 'text-[#EE4D2D] bg-orange-50' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        全部{cat.name}
                      </button>
                      {getSubCategories(cat.id).map(sub => (
                        <button 
                          key={sub.id}
                          onClick={() => setSelectedSubCat(sub.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition ${selectedSubCat === sub.id ? 'text-[#EE4D2D] bg-orange-50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {sub.name}
                        </button>
                      ))}
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* 主要內容區 */}
      <main className="flex-1 p-4 md:p-8 min-w-0">
        
        {/* 商家資訊 Header (僅在商家頁面顯示) */}
        {currentShop && (
           <div className="mb-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-slate-800 to-slate-900"></div>
              {currentShop.banner && <img src={currentShop.banner} className="absolute top-0 left-0 w-full h-32 object-cover opacity-50" />}
              
              <div className="relative pt-12 flex flex-col md:flex-row items-end md:items-center gap-6">
                 <div className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl bg-white overflow-hidden shrink-0">
                    <img src={currentShop.logo || 'https://placehold.co/200'} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 text-white md:text-slate-800 mb-2 md:mb-0">
                    <h1 className="text-2xl font-black drop-shadow-md md:drop-shadow-none">{currentShop.shop_name || currentShop.name}</h1>
                    <p className="text-xs opacity-90 md:text-slate-500 mt-1 max-w-xl line-clamp-2">{currentShop.shop_description || '這家店很懶，沒有寫介紹...'}</p>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => onFollowShop(currentShop.id)} className="px-6 py-2.5 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-lg hover:scale-105 transition active:scale-95 flex items-center gap-2">
                       <i className="fa-solid fa-heart"></i> 追蹤賣場
                    </button>
                    {/* 檢舉按鈕 */}
                    <button onClick={() => setShowReportModal(true)} className="px-4 py-2.5 bg-white/20 backdrop-blur-md md:bg-slate-100 text-white md:text-slate-600 rounded-xl font-bold hover:bg-white/30 md:hover:bg-slate-200 transition">
                       <i className="fa-solid fa-triangle-exclamation"></i>
                    </button>
                 </div>
              </div>

              {/* 商家社群連結 */}
              {(currentShop.facebook_url || currentShop.instagram_url || currentShop.threads_url || currentShop.line_url) && (
                  <div className="mt-6 flex gap-3 pt-6 border-t border-slate-100">
                      {currentShop.facebook_url && <a href={currentShop.facebook_url} target="_blank" className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition"><i className="fa-brands fa-facebook-f"></i></a>}
                      {currentShop.instagram_url && <a href={currentShop.instagram_url} target="_blank" className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFD600] via-[#FF0100] to-[#D800B9] text-white flex items-center justify-center hover:scale-110 transition"><i className="fa-brands fa-instagram"></i></a>}
                      {currentShop.threads_url && <a href={currentShop.threads_url} target="_blank" className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 transition"><i className="fa-brands fa-threads"></i></a>}
                      {currentShop.line_url && <a href={currentShop.line_url} target="_blank" className="w-8 h-8 rounded-full bg-[#00C300] text-white flex items-center justify-center hover:scale-110 transition"><i className="fa-brands fa-line"></i></a>}
                  </div>
              )}
           </div>
        )}

        {/* 頂部搜尋與篩選工具列 */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400"></i>
              <input 
                type="text" 
                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] transition text-sm font-bold text-slate-700"
                placeholder="搜尋商品..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <select className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" value={selectedOrigin} onChange={e => setSelectedOrigin(e.target.value)}>
                 <option value="">所有產地</option>
                 {COMMON_ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

              <select className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" value={selectedCity} onChange={e => { setSelectedCity(e.target.value); setSelectedDistrict(''); }}>
                 <option value="">所有縣市 (出貨地)</option>
                 {Object.keys(TAIWAN_DISTRICTS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {selectedCity && (
                  <select className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
                    <option value="">全區</option>
                    {TAIWAN_DISTRICTS[selectedCity].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
              )}
           </div>
        </div>

        {/* 商品列表 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {paginatedProducts.length > 0 ? (
            paginatedProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => onOpenProduct(product)}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full"
              >
                <div className="aspect-square bg-slate-50 relative overflow-hidden">
                   <img src={product.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                   {product.origin && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg font-bold">
                         {product.origin}
                      </div>
                   )}
                   {/* 熱銷標籤 */}
                   {product.pin_rank && product.pin_rank > 0 && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded-lg font-black shadow-sm flex items-center gap-1">
                         <i className="fa-solid fa-fire"></i> HOT {currentUser?.role === 'ADMIN' ? `#${product.pin_rank}` : ''}
                      </div>
                   )}
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                   <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{product.product_type === 'DIGITAL' ? '虛擬' : '實體'}</span>
                      {product.shipping_origin && <span className="truncate max-w-[80px]"><i className="fa-solid fa-location-dot mr-0.5"></i>{product.shipping_origin.split('市')[0]}市</span>}
                   </div>
                   <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2 flex-1">{product.name}</h3>
                   
                   <div className="mt-auto">
                      <div className="flex items-end justify-between mb-2">
                         <div className="flex flex-col">
                            {product.original_price > product.price && (
                                <span className="text-[10px] text-slate-400 line-through">NT$ {product.original_price.toLocaleString()}</span>
                            )}
                            <span className="text-lg font-black text-[#EE4D2D]">NT$ {product.price.toLocaleString()}</span>
                         </div>
                         <button className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-[#EE4D2D] hover:text-white transition flex items-center justify-center">
                            <i className="fa-solid fa-cart-plus"></i>
                         </button>
                      </div>
                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                         <span>已售出 {getSoldData(product.id)}</span>
                         <span>庫存 {product.total_stock}</span>
                      </div>
                   </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-slate-300">
               <i className="fa-solid fa-box-open text-6xl mb-4 opacity-50"></i>
               <p className="font-bold text-lg">找不到相關商品</p>
               <p className="text-sm">試著調整篩選條件看看</p>
            </div>
          )}
        </div>

        {/* 分頁 */}
        {totalPages > 1 && (
           <div className="flex justify-center mt-10 gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                 <i className="fa-solid fa-chevron-left"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                 <button 
                   key={p}
                   onClick={() => setCurrentPage(p)}
                   className={`w-10 h-10 rounded-xl font-bold transition ${currentPage === p ? 'bg-[#EE4D2D] text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                 >
                   {p}
                 </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                 <i className="fa-solid fa-chevron-right"></i>
              </button>
           </div>
        )}
      </main>

      {/* 檢舉 Modal */}
      {showReportModal && (
         <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
               <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-red-500"></i> 檢舉此賣場
               </h3>
               <div className="space-y-4">
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