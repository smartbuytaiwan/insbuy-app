
import React, { useState, useMemo } from 'react';
import { Product, CartItem, View } from '../types';

interface ProductDetailProps {
  product: Product;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onAddToCart, onNavigate }) => {
  const [selectedVariant, setSelectedVariant] = useState<string>(product.variants[0]?.name || '');
  const [qty, setQty] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeImage, setActiveImage] = useState(product.images[0]);

  const currentVariant = product.variants.find(v => v.name === selectedVariant);
  const currentPrice = product.price + (currentVariant?.price || 0);
  const currentStock = currentVariant?.stock ?? product.total_stock;

  // 計算銷售進度
  const salesProgress = useMemo(() => {
    const goal = product.target_amount || 0;
    const current = product.current_amount || 0;
    const percent = goal > 0 ? Math.min(100, Math.floor((current / goal) * 100)) : 0;
    return { goal, current, percent };
  }, [product]);

  const handleAddToCart = () => {
    if (product.variants.length > 0 && !selectedVariant) return alert('請選擇規格');
    const item: CartItem = { ...product, selectedVariant, qty, finalPrice: currentPrice, answers };
    onAddToCart(item);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 border border-slate-100 animate-fade-in">
      <div className="space-y-6">
        <div className="aspect-square border border-slate-50 rounded-[2rem] overflow-hidden flex items-center justify-center bg-[#FDFDFD] p-6 group">
          <img src={activeImage} className="max-w-full max-h-full object-contain group-hover:scale-110 transition duration-700" />
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {product.images.map((img, idx) => (
            <div key={idx} onClick={() => setActiveImage(img)} className={`w-20 h-20 border-2 rounded-2xl cursor-pointer p-1.5 flex-shrink-0 transition-all duration-300 ${activeImage === img ? 'border-[#EE4D2D] scale-105 shadow-md' : 'border-transparent opacity-40 hover:opacity-100'}`}>
              <img src={img} className="w-full h-full object-cover rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-800 mb-4 leading-tight">{product.name}</h1>
          <div className="flex items-center gap-4">
            <div className="bg-[#FFEEEC] text-[#EE4D2D] px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase flex items-center gap-2">
              <i className="fa-solid fa-certificate"></i> 官方認證團購主
            </div>
            <button 
              onClick={() => onNavigate(View.CHAT, undefined, product.shop_id)} 
              className="text-slate-400 hover:text-[#EE4D2D] transition text-sm flex items-center gap-1.5 font-bold"
            >
              <i className="fa-regular fa-comments"></i> 詢問賣家
            </button>
          </div>
        </div>

        {/* 團購進度條 */}
        <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100">
           <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">目前銷售進度</span>
              <span className="text-xl font-black text-[#EE4D2D]">{salesProgress.percent}%</span>
           </div>
           <div className="w-full h-3 bg-white border border-slate-100 rounded-full overflow-hidden shadow-inner mb-4">
              <div className="primary-gradient h-full transition-all duration-1000" style={{ width: `${salesProgress.percent}%` }}></div>
           </div>
           <div className="flex justify-between items-center text-[10px] font-bold">
              <div className="text-slate-500">已集資 <span className="text-slate-800">${salesProgress.current.toLocaleString()}</span></div>
              <div className="text-slate-500">目標額 <span className="text-slate-800">${salesProgress.goal.toLocaleString()}</span></div>
           </div>
        </div>

        <div className="flex items-baseline gap-3 mb-10">
          <span className="text-4xl text-[#EE4D2D] font-black tracking-tighter">${currentPrice}</span>
          <span className="text-slate-300 line-through text-lg font-medium">${product.original_price}</span>
        </div>

        <div className="space-y-8 flex-1">
          {product.variants.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">選擇款式</span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <button key={v.name} onClick={() => setSelectedVariant(v.name)} className={`px-5 py-3 text-xs rounded-2xl border-2 font-bold transition-all ${selectedVariant === v.name ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFEEEC] shadow-md' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                    {v.name} {v.price > 0 ? `(+$${v.price})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 items-center">
             <div className="space-y-3">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">購買數量</span>
              <div className="flex items-center border-2 border-slate-100 rounded-2xl h-14 overflow-hidden bg-white shadow-sm">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-14 h-full bg-slate-50 hover:bg-slate-100 transition border-r font-bold text-slate-400">-</button>
                <input type="number" value={qty} className="w-16 text-center text-lg font-black outline-none text-slate-700" readOnly />
                <button onClick={() => setQty(Math.min(currentStock, qty + 1))} className="w-14 h-full bg-slate-50 hover:bg-slate-100 transition border-l font-bold text-slate-400">+</button>
              </div>
            </div>
            <div className="pt-7">
               <span className="text-[11px] text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-full">庫存剩餘 {currentStock} 件</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-12">
          <button onClick={handleAddToCart} className="flex-1 h-16 border-2 border-[#EE4D2D] bg-white text-[#EE4D2D] rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-[#FFEEEC] transition-all active:scale-95 text-lg">
            <i className="fa-solid fa-cart-plus text-xl"></i> 加入購物車
          </button>
          <button onClick={handleAddToCart} className="flex-1 h-16 primary-gradient text-white rounded-[1.5rem] font-black shadow-[0_15px_30px_rgba(238,77,45,0.3)] hover:scale-[1.02] transition-all active:scale-95 text-xl flex items-center justify-center gap-3">
             立即結帳 <i className="fa-solid fa-arrow-right-long"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
