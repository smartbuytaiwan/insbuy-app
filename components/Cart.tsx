
import React from 'react';
import { CartItem } from '../types';

interface CartProps {
  items: CartItem[];
  onRemove: (idx: number) => void;
  onCheckout: () => void;
  onClear: () => void;
}

const Cart: React.FC<CartProps> = ({ items, onRemove, onCheckout, onClear }) => {
  const total = items.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-md p-20 text-center border border-slate-100">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 text-5xl">
          <i className="fa-solid fa-cart-shopping"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-500 mb-4">您的購物車目前是空的</h2>
        <p className="text-sm text-slate-400 mb-8">快去探索更多超值團購商品吧！</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-md p-6 max-w-4xl mx-auto border border-slate-100 animate-fade-in">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-slate-800">購物車 ({items.length})</h2>
        <button onClick={onClear} className="text-sm text-slate-400 hover:text-red-500 transition">清空購物車</button>
      </div>

      <div className="hidden md:grid grid-cols-6 gap-4 text-sm text-slate-500 bg-slate-50 p-3 mb-2 rounded font-bold border border-slate-100">
        <div className="col-span-3 text-left pl-2">商品</div>
        <div className="text-center">單價</div>
        <div className="text-center">數量</div>
        <div className="text-center">總計</div>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center border-b border-slate-50 pb-4 last:border-0 hover:bg-slate-50/50 transition p-2">
            <div className="col-span-3 flex gap-4 items-center">
              <img src={item.images[0]} className="w-20 h-20 object-contain border border-slate-100 rounded bg-white p-1" />
              <div>
                <div className="font-bold text-slate-800 line-clamp-1">{item.name}</div>
                <div className="text-xs text-slate-500 mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                  規格: {item.selectedVariant || '單一'}
                </div>
              </div>
            </div>
            <div className="text-center text-slate-600">${item.finalPrice}</div>
            <div className="text-center text-slate-600">x {item.qty}</div>
            <div className="text-center text-[#EE4D2D] font-bold">${item.finalPrice * item.qty}</div>
            <div className="md:hidden text-right">
              <button onClick={() => onRemove(idx)} className="text-red-500 text-sm">刪除</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t flex flex-col md:flex-row justify-end items-center gap-6 bg-[#FFEEEC]/20 border-dashed border-[#EE4D2D] border p-6 rounded">
        <div className="text-slate-600 font-bold text-lg">
          總金額: <span className="text-3xl text-[#EE4D2D] ml-2">${total}</span>
        </div>
        <button 
          onClick={onCheckout}
          className="w-full md:w-auto px-12 h-12 bg-[#EE4D2D] text-white rounded font-bold shadow-lg hover:bg-[#d73211] transition"
        >
          去結帳
        </button>
      </div>
    </div>
  );
};

export default Cart;
