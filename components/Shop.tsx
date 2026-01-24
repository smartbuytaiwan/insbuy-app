
import React, { useState, useEffect } from 'react';
import { Product } from '../types';

interface ShopProps {
  products: Product[];
  onOpenProduct: (p: Product) => void;
}

const Shop: React.FC<ShopProps> = ({ products, onOpenProduct }) => {
  const [sort, setSort] = useState<'newest' | 'priceLow' | 'priceHigh'>('newest');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
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
    return days > 0 ? `${days}天 ${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    if (sort === 'priceLow') return a.price - b.price;
    if (sort === 'priceHigh') return b.price - a.price;
    return new Date(b.end_time).getTime() - new Date(a.end_time).getTime();
  });

  return (
    <div className="animate-fade-in">
      {/* Featured Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1 border-l-4 border-[#EE4D2D] pl-3">
          <div>
            <span className="text-[#EE4D2D] font-bold text-xl mr-2">🔥 團購最前線</span>
            <span className="text-sm text-slate-400">熱門商品倒數中</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedProducts.filter(p => p.is_pinned).slice(0, 3).map((p, idx) => (
            <div 
              key={p.id} 
              onClick={() => onOpenProduct(p)}
              className="bg-white rounded-md border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:border-[#EE4D2D]/50 hover:shadow-lg transition-all duration-300 flex flex-col group h-[280px]"
            >
              <div className="relative h-[180px] overflow-hidden bg-white">
                <img src={p.images[0]} className="w-full h-full object-contain group-hover:scale-110 transition duration-500" />
                <div className="absolute top-0 left-0 bg-[#EE4D2D] text-white text-[10px] px-3 py-1 rounded-br-md font-bold z-10">
                  精選 TOP {idx + 1}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between flex-1">
                <div className="text-sm text-slate-800 line-clamp-2 font-medium group-hover:text-[#EE4D2D] transition-colors">{p.name}</div>
                <div className="flex justify-between items-end">
                  <div className="text-[#EE4D2D] font-bold text-lg">${p.price}</div>
                  <div className="text-[10px] text-[#EE4D2D] border border-[#EE4D2D] px-1.5 py-0.5 rounded bg-[#FFEEEC]">限時團購中</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-2 rounded-md flex items-center justify-between mb-4 shadow-sm sticky top-[76px] z-30 border border-slate-100">
        <div className="flex items-center gap-2 text-sm">
          <span className="mr-2 font-bold text-slate-600 px-2">排序</span>
          <button 
            onClick={() => setSort('newest')}
            className={`px-4 py-1.5 rounded transition ${sort === 'newest' ? 'bg-[#EE4D2D] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >最新</button>
          <button 
            onClick={() => setSort('priceLow')}
            className={`px-4 py-1.5 rounded transition ${sort === 'priceLow' ? 'bg-[#EE4D2D] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >價格低到高</button>
          <button 
            onClick={() => setSort('priceHigh')}
            className={`px-4 py-1.5 rounded transition ${sort === 'priceHigh' ? 'bg-[#EE4D2D] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >價格高到低</button>
        </div>
        <div className="flex gap-1 pr-1">
          <button onClick={() => setDisplayMode('grid')} className={`w-8 h-8 flex items-center justify-center rounded border transition ${displayMode === 'grid' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFEEEC]' : 'border-slate-200 text-slate-400'}`}><i className="fa-solid fa-border-all"></i></button>
          <button onClick={() => setDisplayMode('list')} className={`w-8 h-8 flex items-center justify-center rounded border transition ${displayMode === 'list' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFEEEC]' : 'border-slate-200 text-slate-400'}`}><i className="fa-solid fa-list-ul"></i></button>
        </div>
      </div>

      {/* Grid */}
      <div className={displayMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-4'}>
        {sortedProducts.map(p => (
          <div 
            key={p.id} 
            onClick={() => onOpenProduct(p)}
            className={`bg-white rounded-md overflow-hidden shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-[#EE4D2D]/30 cursor-pointer relative group flex ${displayMode === 'grid' ? 'flex-col' : 'flex-row h-40'}`}
          >
            <div className={`relative bg-white border-b border-slate-50 ${displayMode === 'grid' ? 'aspect-square' : 'w-40 h-full border-r'}`}>
              <img src={p.images[0]} className="w-full h-full object-contain p-2" />
              <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-[1px] text-white text-[10px] text-center py-1">
                <i className="fa-regular fa-clock mr-1"></i>{getCountdown(p.end_time)}
              </div>
            </div>
            <div className="p-3 flex flex-col justify-between flex-1">
              <div>
                <div className="text-sm text-slate-800 line-clamp-2 font-medium h-[40px] group-hover:text-[#EE4D2D] transition">{p.name}</div>
                {p.original_price > p.price && (
                  <div className="text-[10px] text-slate-400 line-through mt-1">${p.original_price}</div>
                )}
              </div>
              <div className="flex justify-between items-end">
                <div className="text-[#EE4D2D] font-bold text-lg">${p.price}</div>
                <div className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">已搶 {Math.floor(Math.random()*100)} 件</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
