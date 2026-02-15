import React, { useState, useMemo } from 'react';
import { Product, CartItem, User, View, ProductVariant } from '../types';

interface ProductDetailProps {
  product: Product;
  allSellers: User[]; // 改為接收所有使用者，以便精確查找
  currentUser: User | null;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
  onFollowShop: (shopId: string) => void;
  calculateShopStats: (shopId: string) => any;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ 
  product, 
  allSellers, 
  currentUser, 
  onAddToCart, 
  onNavigate, 
  onFollowShop,
  calculateShopStats
}) => {
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product.variants?.[0] || null);

  // 1. 查找賣家：支援使用 shop_id 或 id 比對
  const seller = useMemo(() => {
    return allSellers.find(u => u.shop_id === product.shop_id || u.id === product.shop_id);
  }, [allSellers, product.shop_id]);

  // 2. 計算賣家數據
  const shopStats = useMemo(() => {
    if (!seller) return null;
    return calculateShopStats(seller.shop_id || seller.id);
  }, [seller, calculateShopStats]);

  // 3. 判斷是否已追蹤
  const isFollowing = useMemo(() => {
    if (!currentUser || !seller) return false;
    const targetId = seller.shop_id || seller.id;
    return currentUser.following?.includes(targetId);
  }, [currentUser, seller]);

  const handleAddToCart = () => {
    if (!selectedVariant) return alert('請選擇規格');
    
    // 如果是實體商品，檢查庫存
    if (product.product_type === 'PHYSICAL' && selectedVariant.stock < qty) {
      return alert('庫存不足');
    }

    onAddToCart({
      ...product,
      qty,
      selectedVariant: selectedVariant.name,
      finalPrice: product.price + selectedVariant.price,
      isReviewed: false
    });
  };

  const finalPrice = product.price + (selectedVariant?.price || 0);

  // 判斷是否為影片
  const isVideo = (src: string) => src?.startsWith('data:video') || src?.endsWith('.mp4');

  return (
    <div className="animate-fade-in pb-10">
      {/* 麵包屑導航 */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 px-2">
        <button onClick={() => onNavigate(View.SHOP)} className="hover:text-[#EE4D2D]">首頁</button>
        <i className="fa-solid fa-chevron-right text-[10px]"></i>
        <button onClick={() => seller && onNavigate(View.SHOP, undefined, seller.shop_id || seller.id)} className="hover:text-[#EE4D2D]">
           {seller?.shop_name || seller?.name || '賣場'}
        </button>
        <i className="fa-solid fa-chevron-right text-[10px]"></i>
        <span className="text-slate-600 truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
          {/* 左側圖片區 */}
          <div className="p-4 md:p-8 space-y-4">
            <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group border border-slate-100 flex items-center justify-center">
               {isVideo(activeImage) ? (
                 <video src={activeImage} className="w-full h-full object-contain bg-black" controls autoPlay muted />
               ) : (
                 <img src={activeImage || 'https://placehold.co/600x600?text=No+Image'} className="w-full h-full object-cover" />
               )}
               {product.is_pinned && <div className="absolute top-4 left-4 bg-[#EE4D2D] text-white text-xs font-black px-3 py-1 rounded-full shadow-lg z-10">店長推薦</div>}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {product.images.map((img, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-2 shrink-0 transition relative ${activeImage === img ? 'border-[#EE4D2D]' : 'border-transparent hover:border-slate-300'}`}
                >
                  {isVideo(img) ? (
                    <>
                      <video src={img + '#t=0.1'} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <i className="fa-solid fa-play text-white drop-shadow-md"></i>
                      </div>
                    </>
                  ) : (
                    <img src={img} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 右側資訊區 */}
          <div className="p-6 md:p-8 md:pl-0 flex flex-col">
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-800 mb-2 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                 <div className="flex items-center gap-1 text-[#EE4D2D]">
                   <i className="fa-solid fa-star"></i>
                   <span className="font-bold underline">
                     {product.reviews && product.reviews.length > 0 ? (product.reviews.reduce((a,b)=>a+b.rating,0)/product.reviews.length).toFixed(1) : '5.0'}
                   </span>
                 </div>
                 <div className="w-px h-3 bg-slate-300"></div>
                 <span>{product.reviews?.length || 0} 評價</span>
                 <div className="w-px h-3 bg-slate-300"></div>
                 <span>已售 {Math.floor(Math.random() * 500) + 10}</span>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl mb-8">
                 <div className="flex items-end gap-3">
                   {product.original_price > finalPrice && (
                     <span className="text-slate-400 line-through text-sm font-bold">NT${product.original_price + (selectedVariant?.price || 0)}</span>
                   )}
                   <div className="flex items-start gap-1 text-[#EE4D2D] font-black leading-none">
                     <span className="text-lg mt-1">$</span>
                     <span className="text-5xl">{finalPrice.toLocaleString()}</span>
                   </div>
                 </div>
              </div>

              {/* 規格選擇 */}
              <div className="space-y-6 mb-8">
                 <div>
                   <h3 className="text-sm font-bold text-slate-500 mb-3">規格選項</h3>
                   <div className="flex flex-wrap gap-3">
                     {product.variants?.map((v, i) => (
                       <button 
                         key={i}
                         onClick={() => setSelectedVariant(v)}
                         className={`px-6 py-2 rounded-xl text-sm font-bold border-2 transition ${selectedVariant?.name === v.name ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFEEEC]' : 'border-slate-100 text-slate-600 hover:border-slate-300'}`}
                       >
                         {v.name} {v.price > 0 && `(+$${v.price})`}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div>
                   <h3 className="text-sm font-bold text-slate-500 mb-3">數量</h3>
                   <div className="flex items-center gap-4">
                     <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden h-10 w-32">
                        <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-full hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="fa-solid fa-minus"></i></button>
                        <input type="number" className="flex-1 w-full text-center outline-none text-slate-800 font-bold" value={qty} readOnly />
                        <button onClick={() => setQty(qty + 1)} className="w-10 h-full hover:bg-slate-100 flex items-center justify-center text-slate-500"><i className="fa-solid fa-plus"></i></button>
                     </div>
                     <span className="text-xs text-slate-400">還剩 {selectedVariant?.stock || 0} 件</span>
                   </div>
                 </div>
              </div>
            </div>

            <div className="flex gap-4 border-t pt-6">
              <button 
                onClick={handleAddToCart}
                className="flex-1 py-4 bg-[#FFEEEC] text-[#EE4D2D] border-2 border-[#EE4D2D] rounded-xl font-bold hover:bg-[#ffdfdb] transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-cart-plus"></i> 加入購物車
              </button>
              <button 
                onClick={() => { handleAddToCart(); onNavigate(View.CART); }}
                className="flex-1 py-4 primary-gradient text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-2"
              >
                直接購買
              </button>
            </div>
          </div>
        </div>

        {/* 賣家資訊卡 (關鍵更新) */}
        <div className="border-t border-slate-100 p-6 md:p-8 bg-slate-50/50">
           <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Logo */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-white shrink-0">
                 <img src={seller?.logo || 'https://placehold.co/150?text=Shop'} className="w-full h-full object-cover" />
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                 <div className="font-bold text-lg text-slate-800 mb-1">{seller?.shop_name || seller?.name || '未知賣家'}</div>
                 <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><i className="fa-solid fa-star text-yellow-400"></i> {shopStats?.averageRating || '5.0'} 評價</span>
                    <span className="flex items-center gap-1"><i className="fa-solid fa-users text-pink-400"></i> {shopStats?.followerCount || 0} 粉絲</span>
                    <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-green-400"></i> {shopStats?.joinTime || '近期'}加入</span>
                 </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                 <button 
                   onClick={() => seller && onFollowShop(seller.shop_id || seller.id)}
                   className={`px-6 py-2 rounded-lg font-bold border transition ${isFollowing ? 'border-slate-200 text-slate-400 bg-slate-100' : 'border-[#EE4D2D] text-[#EE4D2D] bg-white hover:bg-orange-50'}`}
                 >
                   {isFollowing ? '已關注' : '+ 關注'}
                 </button>
                 <button 
                   onClick={() => seller && onNavigate(View.SHOP, undefined, seller.shop_id || seller.id)}
                   className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition flex items-center gap-2"
                 >
                   <i className="fa-solid fa-store"></i> 逛逛賣場
                 </button>
                 <button 
                    onClick={() => seller && onNavigate(View.CHAT, undefined, seller.shop_id || seller.id)}
                    className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition"
                 >
                    聊聊
                 </button>
              </div>
           </div>
        </div>

        {/* 商品詳情與評價 */}
        <div className="p-6 md:p-8 border-t border-slate-100">
           <h3 className="bg-slate-100 text-slate-700 py-3 px-6 rounded-t-xl font-bold inline-block">商品詳情</h3>
           <div className="p-6 border border-slate-100 rounded-b-xl rounded-tr-xl bg-white mb-8">
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
           </div>
           
           <h3 className="bg-slate-100 text-slate-700 py-3 px-6 rounded-t-xl font-bold inline-block">買家評價 ({product.reviews?.length || 0})</h3>
           <div className="p-6 border border-slate-100 rounded-b-xl rounded-tr-xl bg-white space-y-6">
              {(!product.reviews || product.reviews.length === 0) ? (
                <div className="text-center py-8 text-slate-400">此商品尚未有評價</div>
              ) : (
                product.reviews.map(rev => (
                  <div key={rev.id} className="flex gap-4 border-b border-slate-50 last:border-0 pb-6 last:pb-0">
                     <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold">
                        {rev.userName[0]}
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <div className="text-sm font-bold text-slate-700">{rev.userName}</div>
                           <div className="text-[10px] text-slate-400">{new Date(rev.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-[#EE4D2D] text-xs my-1">
                           {[...Array(5)].map((_, i) => (
                             <i key={i} className={`fa-solid fa-star ${i < rev.rating ? '' : 'text-slate-200'}`}></i>
                           ))}
                        </div>
                        <p className="text-sm text-slate-600 mt-2">{rev.comment}</p>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;