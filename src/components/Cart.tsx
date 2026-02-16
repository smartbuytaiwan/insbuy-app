import React, { useMemo, useState } from 'react';
import { CartItem, User } from '../types';

interface CartProps {
  items: CartItem[];
  allUsers?: User[];
  onUpdateQty: (idx: number, newQty: number) => void;
  onRemove: (idx: number) => void;
  onCheckout: (selectedItems: CartItem[]) => void;
  onClear: () => void;
}

const Cart: React.FC<CartProps> = ({ items, allUsers, onUpdateQty, onRemove, onCheckout, onClear }) => {
  // 記錄被勾選的商品索引 (使用 Set 結構方便查找)
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());

  // 計算分組後的購物車
  const groupedItems = useMemo(() => {
     const groups: Record<string, { items: CartItem[], originalIndices: number[] }> = {};
     items.forEach((item, index) => {
        const shopId = item.shop_id || 'unknown';
        if (!groups[shopId]) {
            groups[shopId] = { items: [], originalIndices: [] };
        }
        groups[shopId].items.push(item);
        groups[shopId].originalIndices.push(index);
     });
     return groups;
  }, [items]);

  // 處理單一商品勾選
  const handleCheckItem = (globalIndex: number, shopId: string) => {
    const newChecked = new Set(checkedIndices);
    
    // 檢查目前是否已有勾選其他賣場的商品
    if (newChecked.size > 0 && !newChecked.has(globalIndex)) {
        // 取得已勾選的第一個商品的賣場 ID
        const firstCheckedIndex = Array.from(newChecked)[0];
        const firstCheckedItem = items[firstCheckedIndex];
        const currentCheckedShopId = firstCheckedItem?.shop_id || 'unknown';

        if (currentCheckedShopId !== shopId) {
            alert('系統提示：一次結帳只能選擇同一個賣場的商品。\n\n若要購買此商品，請先取消勾選其他賣場的商品。');
            return;
        }
    }

    if (newChecked.has(globalIndex)) {
        newChecked.delete(globalIndex);
    } else {
        newChecked.add(globalIndex);
    }
    setCheckedIndices(newChecked);
  };

  // 處理整店勾選
  const handleCheckShop = (shopId: string, shopGroupIndices: number[]) => {
      const newChecked = new Set(checkedIndices);
      
      // 檢查跨店
      if (newChecked.size > 0) {
          const firstCheckedIndex = Array.from(newChecked)[0];
          const firstCheckedItem = items[firstCheckedIndex];
          const currentCheckedShopId = firstCheckedItem?.shop_id || 'unknown';
          
          // 如果目前勾選的不是這家店，且不是全空，且這家店有東西沒被勾
          // 這裡簡化邏輯：只要目前有勾別家店，就擋
          const isOtherShopChecked = Array.from(newChecked).some(idx => {
              const item = items[idx];
              return (item?.shop_id || 'unknown') !== shopId;
          });

          if (isOtherShopChecked) {
              alert('系統提示：一次結帳只能選擇同一個賣場的商品。');
              return;
          }
      }

      // 判斷全選還是全取消：如果該店所有商品都已勾選，則全取消；否則全選
      const allSelected = shopGroupIndices.every(idx => newChecked.has(idx));

      if (allSelected) {
          shopGroupIndices.forEach(idx => newChecked.delete(idx));
      } else {
          shopGroupIndices.forEach(idx => newChecked.add(idx));
      }
      setCheckedIndices(newChecked);
  };

  // 計算選中商品的總金額
  const total = useMemo(() => {
      let sum = 0;
      checkedIndices.forEach(idx => {
          const item = items[idx];
          if (item) sum += item.finalPrice * item.qty;
      });
      return sum;
  }, [checkedIndices, items]);

  const handleCheckoutClick = () => {
      if (checkedIndices.size === 0) {
          alert('請至少勾選一項商品進行結帳');
          return;
      }
      const selectedItems = Array.from(checkedIndices).map(idx => items[idx]);
      onCheckout(selectedItems);
  };

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
      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <i className="fa-solid fa-cart-shopping text-[#EE4D2D]"></i>
          購物車
          <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{items.length} 件商品</span>
        </h2>
        <button 
          onClick={onClear} 
          className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition"
        >
          <i className="fa-regular fa-trash-can"></i> 清空
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedItems).map(([shopId, group]) => {
           const seller = allUsers?.find(u => u.shop_id === shopId || u.id === shopId);
           const shopName = seller?.shop_name || seller?.name || '未知賣場';
           
           // 檢查該店是否全選
           const isShopAllChecked = group.originalIndices.every(idx => checkedIndices.has(idx));

           return (
             <div key={shopId} className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* 商店標題列 */}
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                   <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-[#EE4D2D] cursor-pointer"
                      checked={isShopAllChecked}
                      onChange={() => handleCheckShop(shopId, group.originalIndices)}
                   />
                   <i className="fa-solid fa-store text-slate-400"></i>
                   <span className="font-bold text-slate-700">{shopName}</span>
                </div>
                
                <div className="p-4 space-y-6 bg-white">
                   {group.items.map((item, localIdx) => {
                      const globalIdx = group.originalIndices[localIdx]; 
                      const isChecked = checkedIndices.has(globalIdx);

                      // ★ 修改：優先讀取 image，若無則讀取 images[0]，解決圖片不顯示問題
                      const displayImage = item.image || (item.images && item.images.length > 0 ? item.images[0] : 'https://placehold.co/150');
                      // ★ 修改：優先讀取 variantName，若無則讀取 selectedVariant
                      const displayVariant = item.variantName || item.selectedVariant;

                      return (
                        <div key={localIdx} className="flex gap-4 items-center">
                            {/* 商品勾選框 */}
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-[#EE4D2D] cursor-pointer"
                                checked={isChecked}
                                onChange={() => handleCheckItem(globalIdx, shopId)}
                            />

                            <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                                <img src={displayImage} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-700 truncate">{item.name}</h3>
                                <div className="text-xs text-slate-400 mt-1">{displayVariant ? `規格: ${displayVariant}` : '單一規格'}</div>
                                <div className="text-sm font-black text-[#EE4D2D] mt-1">${item.finalPrice.toLocaleString()}</div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8">
                                    <button onClick={() => onUpdateQty(globalIdx, item.qty - 1)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 border-r font-black text-slate-400">-</button>
                                    <span className="w-10 text-center text-sm font-black text-slate-700">{item.qty}</span>
                                    <button onClick={() => onUpdateQty(globalIdx, item.qty + 1)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 border-l font-black text-slate-400">+</button>
                                </div>
                                <button onClick={() => onRemove(globalIdx)} className="text-red-500 text-xs font-bold hover:underline">移除</button>
                            </div>
                        </div>
                      );
                   })}
                </div>
             </div>
           );
        })}
      </div>

      <div className="mt-12 pt-8 border-t border-dashed border-[#EE4D2D] flex flex-col md:flex-row justify-end items-center gap-10 bg-[#FFEEEC]/10 p-8 rounded-[2rem]">
        <div className="text-right">
          <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">已選商品總計 ({checkedIndices.size} 件)</div>
          <div className="text-4xl text-[#EE4D2D] font-black">${total.toLocaleString()}</div>
        </div>
        <button 
          onClick={handleCheckoutClick}
          className={`w-full md:w-auto px-12 py-4 rounded-xl font-black text-lg shadow-[0_10px_20px_rgba(238,77,45,0.3)] transition-all flex items-center justify-center gap-2 ${checkedIndices.size > 0 ? 'bg-[#EE4D2D] text-white hover:shadow-[0_15px_30px_rgba(238,77,45,0.4)] hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          disabled={checkedIndices.size === 0}
        >
          前往結帳
          <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
};

export default Cart;