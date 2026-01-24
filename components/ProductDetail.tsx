
import React, { useState } from 'react';
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

  const handleAddToCart = () => {
    if (product.variants.length > 0 && !selectedVariant) return alert('請選擇規格');
    const item: CartItem = { ...product, selectedVariant, qty, finalPrice: currentPrice, answers };
    onAddToCart(item);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-10 border border-slate-100 animate-fade-in">
      <div className="space-y-4">
        <div className="aspect-square border border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50 p-4">
          <img src={activeImage} className="max-w-full max-h-full object-contain" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {product.images.map((img, idx) => (
            <div key={idx} onClick={() => setActiveImage(img)} className={`w-16 h-16 border-2 rounded-lg cursor-pointer p-1 flex-shrink-0 transition ${activeImage === img ? 'border-[#EE4D2D]' : 'border-transparent opacity-60'}`}>
              <img src={img} className="w-full h-full object-cover rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{product.name}</h1>
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-[#FFEEEC] text-[#EE4D2D] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <i className="fa-solid fa-store"></i> 官方授權商家
          </div>
          <button 
            onClick={() => onNavigate(View.CHAT, undefined, product.shop_id)} 
            className="text-slate-400 hover:text-[#EE4D2D] transition text-sm flex items-center gap-1"
          >
            <i className="fa-regular fa-comments"></i> 聊聊商家
          </button>
        </div>

        <div className="bg-slate-50 p-5 flex items-baseline gap-2 mb-8 rounded-2xl border border-slate-100">
          <span className="text-slate-400 line-through text-sm">${product.original_price}</span>
          <span className="text-3xl text-[#EE4D2D] font-black">${currentPrice}</span>
          <span className="bg-[#EE4D2D] text-white text-[10px] px-2 py-0.5 rounded-lg ml-2 font-bold uppercase">限時下殺</span>
        </div>

        <div className="space-y-6 flex-1">
          {product.variants.length > 0 && (
            <div className="flex gap-4">
              <span className="text-sm font-bold text-slate-500 w-12 pt-1">規格</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {product.variants.map(v => (
                  <button key={v.name} onClick={() => setSelectedVariant(v.name)} className={`px-4 py-2 text-xs rounded-xl border-2 transition ${selectedVariant === v.name ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFEEEC]' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}>
                    {v.name} {v.price > 0 ? `(+$${v.price})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 items-center">
            <span className="text-sm font-bold text-slate-500 w-12">數量</span>
            <div className="flex items-center border-2 border-slate-100 rounded-xl h-10 overflow-hidden bg-white">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-full bg-slate-50 hover:bg-slate-100 transition border-r">-</button>
              <input type="number" value={qty} className="w-12 text-center text-sm font-bold outline-none" readOnly />
              <button onClick={() => setQty(Math.min(currentStock, qty + 1))} className="w-10 h-full bg-slate-50 hover:bg-slate-100 transition border-l">+</button>
            </div>
            <span className="text-xs text-slate-400 ml-2">剩餘 {currentStock} 件</span>
          </div>

          {product.shipping_rules && (
            <div className="flex gap-4">
              <span className="text-sm font-bold text-slate-500 w-12">運送</span>
              <div className="flex-1 space-y-1">
                {product.shipping_rules.map(r => (
                  <div key={r.name} className="text-[11px] text-slate-500 flex justify-between">
                    <span>{r.name} 運費 ${r.fee}</span>
                    <span className="text-[#EE4D2D] font-bold">滿 ${r.free_threshold} 免運</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-10">
          <button onClick={handleAddToCart} className="flex-1 h-14 border-2 border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#ffdcd7] transition active:scale-95 shadow-sm">
            <i className="fa-solid fa-cart-plus"></i> 加入購物車
          </button>
          <button onClick={handleAddToCart} className="flex-1 h-14 bg-[#EE4D2D] text-white rounded-2xl font-bold shadow-lg hover:bg-[#d73211] transition active:scale-95 text-lg">
            立即購買
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
