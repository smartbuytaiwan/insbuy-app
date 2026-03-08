import React, { useMemo, useState } from 'react';
import { CartItem, User, View, Product } from '../types'; // ★ 補上 View 與 Product 型別
import API from '../api';

interface CartProps {
  items: CartItem[];
  allUsers?: User[];
  onNavigate: (newView: View, product?: Product, targetId?: string) => void; // ★ 補上 onNavigate 屬性
  onUpdateQty: (idx: number, newQty: number) => void;
  onRemove: (idx: number) => void;
  onCheckout: (selectedItems: CartItem[]) => void;
  onClear: () => void;
  onCancel: () => void; // ★ 新增：返回上一步的功能
}

const Cart: React.FC<CartProps> = ({ items, allUsers, onNavigate, onUpdateQty, onRemove, onCheckout, onClear, onCancel }) => {
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

  const handleCheckoutClick = async () => {
    if (checkedIndices.size === 0) {
       alert('請先勾選要結帳的商品');
       return;
    }
    
    const selectedItems: CartItem[] = [];
    items.forEach((item, idx) => {
       if (checkedIndices.has(idx)) {
           selectedItems.push(item);
       }
    });
    
    // ★ 結帳前：與後端 API 確認最新庫存是否足夠
    // ★ 結帳前：與後端 API 確認最新庫存是否足夠 (並將同規格商品加總計算)
    try {
        const latestProducts = await API.getProducts();
        
        // 1. 先把勾選的商品，依照「商品ID + 規格」合併加總
        const summaryMap: Record<string, { qty: number, name: string, variant: string, productId: string }> = {};
        for (const item of selectedItems) {
            const key = `${item.id}-${item.selectedVariant || 'none'}`;
            if (!summaryMap[key]) {
                summaryMap[key] = { qty: 0, name: item.name, variant: item.selectedVariant || '單一規格', productId: item.id };
            }
            summaryMap[key].qty += item.qty;
        }

        // 2. 逐一比對最新庫存
        for (const key in summaryMap) {
            const sumItem = summaryMap[key];
            const realProduct = latestProducts.find(p => p.id === sumItem.productId);
            
            if (!realProduct) {
                alert(`商品 [${sumItem.name}] 已下架或不存在！`);
                return;
            }

            let availableStock = realProduct.total_stock;
            if (sumItem.variant !== '單一規格') {
                const variant = realProduct.variants?.find(v => v.name === sumItem.variant);
                availableStock = variant ? variant.stock : 0;
            }

            if (sumItem.qty > availableStock) {
                alert(`庫存不足提醒！\n商品：${sumItem.name} (${sumItem.variant})\n您總共選購了 ${sumItem.qty} 件，但目前庫存僅剩餘 ${availableStock} 件。\n請返回購物車調整數量或合併重複項目。`);
                return;
            }
        }
    } catch (e) {
        alert('無法驗證最新庫存狀態，請檢查網路連線後再試。');
        return;
    }

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
        <div className="flex items-center gap-4">
            <button 
                onClick={onCancel}
                className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition shadow-sm"
                title="回上一步"
            >
                <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <i className="fa-solid fa-cart-shopping text-[#EE4D2D]"></i>
              購物車
              <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full hidden md:inline-block">{items.length} 件商品</span>
            </h2>
        </div>
        <button 
          onClick={onClear} 
          className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition bg-slate-50 px-3 py-1.5 rounded-lg"
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
                   {/* ★ 修復：讓賣場名稱可以點擊跳轉 */}
                   <span 
                      className="font-bold text-slate-700 cursor-pointer hover:text-[#EE4D2D] transition flex items-center gap-1"
                      onClick={() => onNavigate(View.SHOP, undefined, shopId)}
                   >
                      {shopName} <i className="fa-solid fa-chevron-right text-[10px] opacity-50 mt-0.5"></i>
                   </span>
                </div>
                
                <div className="p-4 space-y-6 bg-white">
                   {group.items.map((item, localIdx) => {
                      const globalIdx = group.originalIndices[localIdx]; 
                      const isChecked = checkedIndices.has(globalIdx);

                      // ★ 修復 TypeScript 報錯：直接從陣列讀取圖片，若舊資料有 image 屬性則用 as any 繞過檢查
                      const displayImage = (item.images && item.images.length > 0) ? item.images[0] : ((item as any).image || 'https://placehold.co/150');
                      // ★ 修復 TypeScript 報錯：直接讀取 selectedVariant
                      const displayVariant = item.selectedVariant || (item as any).variantName;

                      return (
                        <div key={localIdx} className="flex gap-3 md:gap-4 items-start md:items-center relative py-2 md:py-0">
                            {/* 商品勾選框 */}
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-[#EE4D2D] cursor-pointer shrink-0 mt-3 md:mt-0"
                                checked={isChecked}
                                onChange={() => handleCheckItem(globalIdx, shopId)}
                            />

                            {/* ★ 修復：圖片可點擊跳轉商品頁 */}
                            <div 
                                className="w-20 h-20 md:w-20 md:h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 cursor-pointer hover:opacity-80 transition"
                                onClick={() => onNavigate(View.PRODUCT, item as unknown as Product)}
                            >
                                <img src={displayImage} alt={item.name} className="w-full h-full object-cover" />
                            </div>

                            {/* ★ 修復：手機版排版防壓縮，允許文字換行，並將控制項改為底部對齊 */}
                            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div 
                                    className="flex-1 min-w-0 cursor-pointer group"
                                    onClick={() => onNavigate(View.PRODUCT, item as unknown as Product)}
                                >
                                    <h3 className="font-bold text-slate-700 text-sm md:text-base line-clamp-2 md:truncate group-hover:text-[#EE4D2D] transition">{item.name}</h3>
                                    <div className="text-[10px] md:text-xs text-slate-400 mt-1 line-clamp-1">{displayVariant ? `規格: ${displayVariant}` : '單一規格'}</div>
                                    <div className="text-sm md:text-sm font-black text-[#EE4D2D] mt-1 md:hidden">${item.finalPrice.toLocaleString()}</div>
                                </div>
                                
                                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 md:gap-3 shrink-0 w-full md:w-auto mt-1 md:mt-0">
                                    <div className="text-sm font-black text-[#EE4D2D] hidden md:block">${item.finalPrice.toLocaleString()}</div>
                                    <div className="flex items-center gap-3 md:gap-2 justify-end w-full md:w-auto">
                                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8">
                                            <button onClick={() => onUpdateQty(globalIdx, item.qty - 1)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 border-r font-black text-slate-400">-</button>
                                            <span className="w-10 text-center text-sm font-black text-slate-700">{item.qty}</span>
                                            <button onClick={() => onUpdateQty(globalIdx, item.qty + 1)} className="w-8 h-full bg-slate-50 hover:bg-slate-100 border-l font-black text-slate-400">+</button>
                                        </div>
                                        <button onClick={() => onRemove(globalIdx)} className="text-red-500 text-xs font-bold hover:underline shrink-0">移除</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                      );
                   })}
                </div>
             </div>
           );
        })}
      </div>

      {/* ★ 修復：優化購物車結帳區塊，並加入左側的「回上一步」按鈕 */}
      <div className="mt-10 border-2 border-dashed border-orange-300 flex flex-col md:flex-row justify-between items-center gap-6 bg-orange-50/50 p-6 md:p-8 rounded-[2rem] w-full box-border">
        
        {/* 左側返回按鈕 (電腦版顯示左邊，手機版排在最下方或隱藏) */}
        <button 
            onClick={onCancel} 
            className="hidden md:flex w-full md:w-auto px-6 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all items-center justify-center gap-2 order-3 md:order-1"
        >
            <i className="fa-solid fa-arrow-left"></i> 回商品頁
        </button>

        <div className="flex flex-col md:flex-row items-center gap-6 order-1 md:order-2 w-full md:w-auto justify-end flex-1">
            <div className="text-center md:text-right">
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

            {/* 手機版專屬的返回按鈕，放在最底下 */}
            <button 
                onClick={onCancel} 
                className="md:hidden w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2 order-3 mt-2"
            >
                <i className="fa-solid fa-arrow-left"></i> 繼續購物
            </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;