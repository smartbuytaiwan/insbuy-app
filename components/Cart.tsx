
import React from 'react';
import { CartItem } from '../types';

interface CartProps {
  items: CartItem[];
  onUpdateQty: (idx: number, newQty: number) => void;
  onRemove: (idx: number) => void;
  onCheckout: () => void;
  onClear: () => void;
}

const Cart: React.FC<CartProps> = ({ items, onUpdateQty, onRemove, onCheckout, onClear }) => {
  const total = items.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);

  if (items.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-[2rem] p-20 text-center border border-slate-100 animate-fade-in">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 text-5xl">
          <i className="fa-solid fa-cart-shopping"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-500 mb-4">您的購物車目前是空的</h2>
        <p className="text-sm text-slate-400 mb-8">快去探索更多超值團購商品吧！</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-[2rem] p-8 max-w-4xl mx-auto border border-slate-100 animate-fade-in">
      <div className="flex items-center justify-between border-b pb-6 mb-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">購物清單 ({items.length})</h2>
        <button onClick={onClear} className="text-sm font-bold text-slate-400 hover:text-red-500 transition">清空購物車</button>
      </div>

      <div className="hidden md:grid grid-cols-6 gap-4 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-4 mb-4 rounded-2xl border border-slate-100">
        <div className="col-span-3 text-left pl-2">商品明細</div>
        <div className="text-center">單價</div>
        <div className="text-center">數量</div>
        <div className="text-center">小計</div>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center border-b border-slate-50 pb-4 last:border-0 hover:bg-slate-50/50 transition p-4 rounded-3xl">
            <div className="col-span-3 flex gap-4 items-center">
              <img src={item.images[0]} className="w-20 h-20 object-contain border border-slate-100 rounded-2xl bg-white p-1" />
              <div>
                <div className="font-bold text-slate-800 line-clamp-1">{item.name}</div>
                <div className="text-[10px] font-black text-[#EE4D2D] mt-1 bg-[#FFEEEC] inline-block px-2 py-0.5 rounded-full">
                  規格: {item.selectedVariant || '單一'}
                </div>
              </div>
            </div>
            <div className="text-center text-slate-600 font-bold">${item.finalPrice}</div>
            <div className="text-center flex justify-center">
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm h-10">
                <button onClick={() => onUpdateQty(idx, item.qty - 1)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 border-r font-black text-slate-400">-</button>
                <span className="w-10 text-center text-sm font-black text-slate-700">{item.qty}</span>
                <button onClick={() => onUpdateQty(idx, item.qty + 1)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 border-l font-black text-slate-400">+</button>
              </div>
            </div>
            <div className="text-center text-[#EE4D2D] font-black">${item.finalPrice * item.qty}</div>
            <div className="md:hidden text-right">
              <button onClick={() => onRemove(idx)} className="text-red-500 text-xs font-bold">移除商品</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-dashed border-[#EE4D2D] flex flex-col md:flex-row justify-end items-center gap-10 bg-[#FFEEEC]/10 p-8 rounded-[2rem]">
        <div className="text-right">
          <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">應付總計</div>
          <div className="text-4xl text-[#EE4D2D] font-black">${total.toLocaleString()}</div>
        </div>
        <button 
          onClick={onCheckout}
          className="w-full md:w-auto px-16 h-16 primary-gradient text-white rounded-[1.5rem] font-black shadow-xl hover:scale-105 active:scale-95 transition-all text-xl"
        >
          前往結帳
        </button>
      </div>
    </div>
  );
};

export default Cart;
