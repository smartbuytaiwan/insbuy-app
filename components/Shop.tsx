
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, User } from '../types';

interface ShopProps {
  products: Product[];
  categories: Category[];
  currentShop?: User; // 若有傳入，代表是單一賣場頁面
  currentUser?: User | null; // 用於判斷是否已追蹤
  onOpenProduct: (p: Product) => void;
  onFollowShop?: (shopId: string) => void;
}

const Shop: React.FC<ShopProps> = ({ products, categories, currentShop, currentUser, onOpenProduct, onFollowShop }) => {
  const [sort, setSort] = useState<'newest' | 'priceLow' | 'priceHigh'>('newest');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'ALL'>('ALL');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (endTimeStr: string) => {
    const end = new Date(endTimeStr).getTime();
    const diff = end - now;
    if (diff <= 0) return '已結束';
    const days = Math.floor(diff / (86400000));
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return days > 0 ? `${days}天 ${hours}:${minutes}` : `${hours}:${minutes}:${seconds}`;
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategoryId !== 'ALL') {
      list = list.filter(p => p.category_id === selectedCategoryId);
    }
    return list.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (sort === 'priceLow') return a.price - b.price;
      if (sort === 'priceHigh') return b.price - a.price;
      return new Date(b.end_time).getTime() - new Date(a.end_time).getTime();
    });
  }, [products, selectedCategoryId, sort]);

  const isFollowing = useMemo(() => {
    if (!currentUser || !currentShop?.shop_id) return false;
    return currentUser.following?.includes(currentShop.shop_id);
  }, [currentUser, currentShop]);

  return (
    <div className="animate-fade-in">
      {/* 賣場 Header (僅在特定賣場模式顯示) */}
      {currentShop && (
        <div className="mb-6 relative rounded-2xl overflow-hidden shadow-lg group">
          {/* Banner Image */}
          <div className="h-48 md:h-64 w-full bg-slate-200 relative">
            <img 
              src={currentShop.banner || 'https://via.placeholder.com/1200x400?text=Shop+Banner'} 
              className="w-full h-full object-cover" 
              alt="Shop Banner" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          </div>

          {/* Shop Info Overlay */}
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex items-end gap-6">
            <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
              <img src={currentShop.logo || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="Shop Logo" />
            </div>
            
            <div className="flex-1 text-white pb-2">
              <h1 className="text-2xl md:text-3xl font-black mb-2 shadow-sm text-shadow">{currentShop.name}</h1>
              <div className="flex flex-wrap gap-4 md:gap-8 text-xs md:text-sm font-medium opacity-90">
                <span className="flex items-center gap-1"><i className="fa-solid fa-box-open"></i> 商品數: <span className="font-bold">{currentShop.stats?.productCount}</span></span>
                <span className="flex items-center gap-1"><i className="fa-solid fa-users"></i> 粉絲: <span className="font-bold">{currentShop.stats?.followerCount.toLocaleString()}</span></span>
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-star text-yellow-400"></i> 
                  評價: <span className="font-bold">{currentShop.stats?.averageRating?.toFixed(1)}</span>
                  <span className="opacity-70 text-[10px] ml-1">({currentShop.stats?.ratingCount})</span>
                </span>
                <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i> 加入時間: <span className="font-bold">{currentShop.stats?.joinTime}</span></span>
              </div>
            </div>

            <div className="hidden md:flex gap-3 pb-2">
               <button 
                 onClick={() => onFollowShop && currentShop.shop_id && onFollowShop(currentShop.shop_id)}
                 className={`backdrop-blur-md border border-white/50 px-6 py-2 rounded-xl font-bold transition flex items-center gap-2 ${isFollowing ? 'bg-white text-slate-800' : 'bg-white/20 hover:bg-white/30 text-white'}`}
               >
                 {isFollowing ? <><i className="fa-solid fa-check"></i> 已關注</> : <><i className="fa-solid fa-plus"></i> 關注</>}
               </button>
               <button className="bg-[#EE4D2D] hover:bg-[#d73211] text-white px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2">
                 <i className="fa-regular fa-comments"></i> 聊聊
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* 左側分類側邊欄 */}
        <aside className="w-full md:w-56 shrink-0 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <h3 className="font-black text-slate-800 p-4 border-b bg-slate-50/50 flex items-center gap-2">
              <i className="fa-solid fa-bars text-[#EE4D2D]"></i> 
              {currentShop ? '賣場分類' : '全站分類'}
            </h3>
            <ul className="py-2">
              <li>
                <button 
                  onClick={() => setSelectedCategoryId('ALL')}
                  className={`w-full text-left px-4 py-3 text-sm transition-all border-l-4 flex items-center justify-between ${selectedCategoryId === 'ALL' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFEEEC] font-bold' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                >
                  <span>所有商品</span>
                  {selectedCategoryId === 'ALL' && <i className="fa-solid fa-check text-xs"></i>}
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <button 
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-all border-l-4 flex items-center justify-between ${selectedCategoryId === cat.id ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFEEEC] font-bold' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {selectedCategoryId === cat.id && <i className="fa-solid fa-check text-xs"></i>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* 右側商品列表 */}
        <div className="flex-1">
          {/* 排序 Bar */}
          <div className="bg-slate-100/80 p-2 md:p-3 rounded-xl flex flex-wrap items-center gap-2 md:gap-4 text-sm mb-4 border border-slate-200">
            <span className="text-slate-500 font-bold ml-2 hidden md:inline">排序</span>
            <button 
              onClick={() => setSort('newest')}
              className={`px-4 py-2 rounded-lg shadow-sm transition text-xs md:text-sm font-bold ${sort === 'newest' ? 'bg-[#EE4D2D] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >最新上架</button>
            <button 
              onClick={() => setSort('priceLow')}
              className={`px-4 py-2 rounded-lg shadow-sm transition text-xs md:text-sm font-bold ${sort === 'priceLow' ? 'bg-[#EE4D2D] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >價格 <i className="fa-solid fa-arrow-down-short-wide ml-1"></i></button>
            <button 
              onClick={() => setSort('priceHigh')}
              className={`px-4 py-2 rounded-lg shadow-sm transition text-xs md:text-sm font-bold ${sort === 'priceHigh' ? 'bg-[#EE4D2D] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >價格 <i className="fa-solid fa-arrow-up-wide-short ml-1"></i></button>
            
            <div className="ml-auto text-xs text-slate-500 mr-2 font-medium">
              共 <span className="text-[#EE4D2D] font-bold text-base">{filteredProducts.length}</span> 件商品
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((p, idx) => (
              <div 
                key={p.id} 
                onClick={() => onOpenProduct(p)}
                className="bg-white rounded-xl border border-slate-100 shadow-sm hover:border-[#EE4D2D] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group relative overflow-hidden"
              >
                {/* 標籤 */}
                {p.is_pinned && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 text-[10px] px-2 py-1 font-black z-10 rounded-bl-lg shadow-sm">
                    熱銷 TOP
                  </div>
                )}
                
                <div className="relative aspect-square bg-slate-50 overflow-hidden">
                  <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                  {/* 倒數計時遮罩 */}
                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] text-center py-2 font-mono pt-6">
                    <i className="fa-regular fa-clock mr-1"></i> {getCountdown(p.end_time)}
                  </div>
                </div>
                
                <div className="p-3 flex flex-col flex-1 gap-2">
                  <div className="text-xs md:text-sm font-medium text-slate-700 line-clamp-2 h-[40px] leading-relaxed group-hover:text-[#EE4D2D] transition-colors">
                    {p.name}
                  </div>
                  
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="text-[9px] border border-[#EE4D2D] text-[#EE4D2D] px-1 rounded flex items-center">免運</span>
                    <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded flex items-center">店長推薦</span>
                  </div>

                  <div className="mt-auto flex justify-between items-end pt-2">
                    <div className="flex flex-col">
                      {p.original_price > p.price && (
                        <span className="text-[10px] text-slate-400 line-through">${p.original_price}</span>
                      )}
                      <span className="text-[#EE4D2D] font-black text-lg leading-none">
                        <span className="text-xs mr-0.5">$</span>{p.price}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="text-[10px] text-slate-400 font-medium">
                        已售 {Math.floor(Math.random()*500)}
                      </div>
                      {p.reviews && p.reviews.length > 0 && (
                        <div className="text-[9px] text-yellow-500 font-bold flex items-center gap-0.5">
                          <i className="fa-solid fa-star"></i> {(p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length).toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
