
import React, { useState, useMemo } from 'react';
import { Product, Category, User, View, Order } from '../types';

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
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]); // 支援多選，空陣列代表不限

  // 計算商品真實銷量
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

  // 動態產生側邊欄分類列表 (針對特定賣場)
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

  // 取得目前架上商品的所有產地
  const availableOrigins = useMemo(() => {
    const origins = new Set<string>();
    products.forEach(p => {
      if (p.origin) origins.add(p.origin);
    });
    return Array.from(origins);
  }, [products]);

  // 整合顯示用的產地列表 (去除重複)
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

    // 分類篩選
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

    // 價格篩選
    if (minPrice) result = result.filter(p => p.price >= Number(minPrice));
    if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));

    // 產地篩選 (多選邏輯：只要包含在 selectedOrigins 內即顯示)
    if (selectedOrigins.length > 0) {
      result = result.filter(p => p.origin && selectedOrigins.includes(p.origin));
    }

    switch (sortBy) {
      case 'PRICE_ASC':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'PRICE_DESC':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'SALES':
        result.sort((a, b) => getSoldData(b.id) - getSoldData(a.id));
        break;
      case 'LATEST':
        result.sort((a, b) => (b.id > a.id ? 1 : -1));
        break;
      default:
        break;
    }

    return result;
  }, [products, selectedCategoryId, sortBy, minPrice, maxPrice, categories, systemCategories, orders, selectedOrigins]);

  const isFollowing = useMemo(() => {
    if (!currentUser || !currentShop) return false;
    const targetId = currentShop.shop_id || currentShop.id;
    return currentUser.following?.includes(targetId);
  }, [currentUser, currentShop]);

  const toggleOrigin = (origin: string) => {
    if (selectedOrigins.includes(origin)) {
      setSelectedOrigins(prev => prev.filter(o => o !== origin));
    } else {
      setSelectedOrigins(prev => [...prev, origin]);
    }
  };

  // 判斷分類是否應該展開 (如果是當前選中的分類，或是選中分類的父分類)
  const isCategoryExpanded = (catId: string) => {
    if (selectedCategoryId === catId) return true;
    const subCats = getSubCategories(catId);
    return subCats.some(sub => sub.id === selectedCategoryId);
  };

  return (
    <div className="space-y-6">
      {currentShop && (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 animate-fade-in">
          <div className="h-32 md:h-48 bg-slate-200 relative bg-cover bg-center" style={{ backgroundImage: `url(${currentShop.banner || 'https://placehold.co/800x200/orange/white?text=Welcome+Shop'})` }}>
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
              
              <div className="flex flex-wrap gap-4 mt-3 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1"><i className="fa-solid fa-star text-yellow-400"></i> {currentShop.stats?.averageRating || '0.0'} 評價</span>
                <span className="flex items-center gap-1"><i className="fa-solid fa-box text-blue-400"></i> {currentShop.stats?.productCount || 0} 商品</span>
                <span className="flex items-center gap-1"><i className="fa-solid fa-users text-pink-400"></i> {currentShop.stats?.followerCount || 0} 粉絲</span>
                <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-green-400"></i> {currentShop.stats?.joinTime || '近期'}加入</span>
              </div>
            </div>

            <div className="flex gap-3 shrink-0 w-full md:w-auto mt-2 md:mt-0">
              <button 
                onClick={() => onFollowShop(currentShop.shop_id || currentShop.id)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold border transition ${isFollowing ? 'border-slate-200 text-slate-400 bg-slate-50' : 'border-[#EE4D2D] text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white'}`}
              >
                {isFollowing ? '已關注' : '+ 關注'}
              </button>
              <button 
                onClick={() => onNavigate && onNavigate(View.CHAT, undefined, currentShop.shop_id || currentShop.id)}
                className="flex-1 md:flex-none px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition"
              >
                <i className="fa-regular fa-comments mr-2"></i>聊聊
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

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <aside className="w-full md:w-60 shrink-0 space-y-4">
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
                      
                      {/* 子分類展開區域 */}
                      {expanded && getSubCategories(cat.id).length > 0 && (
                        <div className="ml-4 border-l-2 border-slate-100 pl-2 mt-1 space-y-1 animate-fade-in">
                          {getSubCategories(cat.id).map(sub => (
                             <button 
                              key={sub.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedCategoryId(sub.id); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${selectedCategoryId === sub.id ? 'text-[#EE4D2D] font-bold bg-orange-50' : 'text-slate-500 hover:text-slate-800'}`}
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
                      
                      {/* 子分類展開區域 */}
                      {expanded && systemCategories.filter(c => c.parent_id === cat.id).length > 0 && (
                        <div className="ml-4 border-l-2 border-slate-100 pl-2 mt-1 space-y-1 animate-fade-in">
                          {systemCategories.filter(c => c.parent_id === cat.id).map(sub => (
                             <button 
                              key={sub.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedCategoryId(sub.id); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${selectedCategoryId === sub.id ? 'text-[#EE4D2D] font-bold bg-orange-50' : 'text-slate-500 hover:text-slate-800'}`}
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

          {/* 產地分類區塊 (更新版：多選 Checkbox) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-earth-asia"></i> 產地分類
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
               {/* 不限選項 */}
               <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedOrigins.length === 0 ? 'bg-[#EE4D2D] border-[#EE4D2D]' : 'border-slate-300 bg-white'}`}>
                     {selectedOrigins.length === 0 && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={selectedOrigins.length === 0} 
                    onChange={() => setSelectedOrigins([])} 
                    className="hidden" 
                  />
                  <span className={`text-sm ${selectedOrigins.length === 0 ? 'font-bold text-[#EE4D2D]' : 'text-slate-600'}`}>不限</span>
               </label>
               
               <div className="h-px bg-slate-100 my-1"></div>

               {/* 各國選項 */}
               {allDisplayOrigins.map(origin => (
                 <label key={origin} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedOrigins.includes(origin) ? 'bg-[#EE4D2D] border-[#EE4D2D]' : 'border-slate-300 bg-white'}`}>
                       {selectedOrigins.includes(origin) && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={selectedOrigins.includes(origin)} 
                      onChange={() => toggleOrigin(origin)} 
                      className="hidden" 
                    />
                    <span className={`text-sm ${selectedOrigins.includes(origin) ? 'font-bold text-[#EE4D2D]' : 'text-slate-600'}`}>{origin}</span>
                 </label>
               ))}
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
               <button onClick={() => {setSelectedCategoryId(null); setMinPrice(''); setMaxPrice(''); setSelectedOrigins([]);}} className="mt-4 px-6 py-2 text-[#EE4D2D] text-sm font-bold hover:underline">
                 清除所有篩選
               </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayProducts.map(product => {
                const soldCount = getSoldData(product.id);
                const avgRating = product.reviews && product.reviews.length > 0 
                  ? (product.reviews.reduce((a, b) => a + b.rating, 0) / product.reviews.length).toFixed(1) 
                  : '0.0';
                
                return (
                  <div 
                    key={product.id}
                    onClick={() => onOpenProduct(product)}
                    className="bg-white rounded-xl overflow-hidden border border-slate-100 hover:border-[#EE4D2D] hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col h-full"
                  >
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
                        <div className="absolute top-2 left-2 bg-[#EE4D2D] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
