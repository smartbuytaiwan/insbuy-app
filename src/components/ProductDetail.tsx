import React, { useState, useMemo } from 'react';
import { Product, CartItem, User, View, ProductVariant, Order } from '../types';
import API from '../api';

interface ProductDetailProps {
  product: Product;
  allSellers: User[]; 
  currentUser: User | null;
  orders?: Order[];
  onAddToCart: (item: CartItem) => void;
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
  onFollowShop: (shopId: string) => void;
  calculateShopStats: (shopId: string) => any;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ 
  product, 
  allSellers, 
  currentUser, 
  orders = [],
  onAddToCart, 
  onNavigate, 
  onFollowShop,
  calculateShopStats
}) => {
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product.variants?.[0] || null);
  const [adminRank, setAdminRank] = useState<string>(product.pin_rank?.toString() || '');

  // 檢舉相關 State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<{subject: string, reason: string}>({ subject: '', reason: '' });

  const seller = useMemo(() => {
    return allSellers.find(u => u.shop_id === product.shop_id || u.id === product.shop_id);
  }, [allSellers, product.shop_id]);

  const shopStats = useMemo(() => {
    if (!seller) return null;
    return calculateShopStats(seller.shop_id || seller.id);
  }, [seller, calculateShopStats]);

  const isFollowing = useMemo(() => {
    if (!currentUser || !seller) return false;
    const targetId = seller.shop_id || seller.id;
    return currentUser.following?.includes(targetId);
  }, [currentUser, seller]);

  const realSoldCount = useMemo(() => {
    let count = 0;
    orders.forEach(order => {
       if (order.status !== 'CANCELLED') {
          order.items.forEach(item => {
             if (item.id === product.id) {
                count += item.qty;
             }
          });
       }
    });
    return count;
  }, [orders, product.id]);

  const handleAddToCart = () => {
    if (!selectedVariant) return alert('請選擇規格');
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

  const handleAdminClose = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    if (!window.confirm('⚠️ 管理員確認：您確定要強制下架(結標)此商品嗎？\n此操作將無法復原。')) return;

    try {
      await API.closeProduct(product.id); // 注意：這裡修正為 closeProduct，若 api.ts 名稱不同請對應修改
      alert('已執行強制結標！');
      window.location.reload(); 
    } catch (e) {
      alert('操作失敗，請檢查網路或權限');
    }
  };

  const handleSaveRank = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    
    const rank = adminRank.trim() === '' ? null : parseInt(adminRank);
    if (rank !== null && isNaN(rank)) return alert('請輸入有效的數字');
    
    try {
        await API.updateProduct({ ...product, pin_rank: rank });
        alert(rank === null ? '排序權重已清除 (回歸預設)' : '排序權重已更新！');
        window.location.reload(); 
    } catch (e) {
        alert('更新失敗');
    }
  };

  const handleShareProduct = () => {
    const shareUrl = `${window.location.origin}/#/PRODUCT/${product.id}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert('商品連結已複製到剪貼簿！'))
            .catch(() => alert(`您的瀏覽器不支援自動複製，請手動複製網址：\n${shareUrl}`));
    } else {
        alert(`請手動複製網址分享：\n${shareUrl}`);
    }
  };

  const submitReport = async () => {
      if (!reportData.subject || !reportData.reason) return alert('請填寫主題與原因');
      if (!currentUser) return alert('請先登入');

      try {
          await API.createReport({
              type: 'PRODUCT',
              targetId: product.id,
              targetName: product.name,
              subject: reportData.subject,
              reason: reportData.reason,
              reporterId: currentUser.id,
              reporterName: currentUser.name
          });
          alert('檢舉已送出，管理員將會進行審核。');
          setShowReportModal(false);
          setReportData({ subject: '', reason: '' });
      } catch (e) {
          alert('檢舉發送失敗');
      }
  };

  const finalPrice = product.price + (selectedVariant?.price || 0);
  const isVideo = (src: string) => src?.startsWith('data:video') || src?.endsWith('.mp4');

  // ★ Feature 1: AI SEO Schema Markup (JSON-LD)
  // 這段程式碼會生成 Google 搜尋引擎看得懂的結構化資料
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.images,
    "description": product.description,
    "sku": product.id,
    "brand": {
      "@type": "Brand",
      "name": seller?.shop_name || "InsBuy Select"
    },
    "offers": {
      "@type": "Offer",
      "url": `${window.location.origin}/#/PRODUCT/${product.id}`,
      "priceCurrency": "TWD",
      "price": finalPrice,
      "availability": product.total_stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    "aggregateRating": product.reviews && product.reviews.length > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": (product.reviews.reduce((a,b)=>a+b.rating,0)/product.reviews.length).toFixed(1),
      "reviewCount": product.reviews.length
    } : undefined
  };

  return (
    <div className="animate-fade-in pb-10">
      {/* ★ 這裡插入 SEO Script，讓 AI 讀取 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

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

          <div className="p-6 md:p-8 md:pl-0 flex flex-col">
            <div className="flex-1">
              <div className="flex justify-between items-start gap-4">
                  <h1 className="text-2xl font-black text-slate-800 mb-2 leading-tight">{product.name}</h1>
                  <div className="flex gap-2">
                     <button onClick={() => setShowReportModal(true)} className="text-slate-400 hover:text-red-500 transition p-2 rounded-full hover:bg-slate-50" title="檢舉商品">
                        <i className="fa-solid fa-flag text-xl"></i>
                     </button>
                     <button onClick={handleShareProduct} className="text-slate-400 hover:text-[#EE4D2D] transition p-2 rounded-full hover:bg-slate-50" title="分享商品">
                        <i className="fa-solid fa-share-nodes text-xl"></i>
                     </button>
                  </div>
              </div>

              {/* 顯示商品編號 */}
              <div className="text-xs text-slate-400 font-mono mb-4 flex items-center gap-1">
                  <i className="fa-solid fa-hashtag text-slate-300"></i>
                  商品編號: {product.id}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                 <div className="flex items-center gap-1 text-[#EE4D2D]">
                   <i className="fa-solid fa-star"></i>
                   <span className="font-bold underline">
                     {product.reviews && product.reviews.length > 0 ? (product.reviews.reduce((a,b)=>a+b.rating,0)/product.reviews.length).toFixed(1) : '5.0'}
                   </span>
                 </div>
                 <div className="w-px h-3 bg-slate-300"></div>
                 <span>{product.reviews?.length || 0} 評價</span>
                 <div className="w-px h-3 bg-slate-300"></div>
                 <span>已售 {realSoldCount}</span>
              </div>

              {/* 出貨地點顯示 */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                 <i className="fa-solid fa-truck-fast text-slate-400"></i>
                 <span className="font-bold">出貨地點:</span>
                 <span className="text-slate-700">{product.shipping_origin || product.origin || '台灣'}</span>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl mb-8">
                 <div className="flex items-end gap-3">
                   <div className="flex items-start gap-1 text-[#EE4D2D] font-black leading-none">
                     <span className="text-lg mt-1">$</span>
                     <span className="text-5xl">{finalPrice.toLocaleString()}</span>
                   </div>
                   {product.original_price > finalPrice && (
                     <span className="text-slate-400 line-through text-sm font-bold pb-2">
                       NT${product.original_price + (selectedVariant?.price || 0)}
                     </span>
                   )}
                 </div>
              </div>

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

            <div className="flex flex-col gap-4 border-t pt-6">
              <div className="flex gap-4">
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

              {currentUser?.role === 'ADMIN' && product.status === 'OPEN' && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-2">[ADMIN] 首頁排序權重</h3>
                        <div className="flex gap-2 items-center">
                           <input 
                             type="number" 
                             className="flex-1 p-2 border rounded-lg text-center font-bold outline-none focus:border-[#EE4D2D]"
                             placeholder="留空即為不排序"
                             value={adminRank}
                             onChange={(e) => setAdminRank(e.target.value)}
                           />
                           <span className="text-xs text-slate-500">數字越小排越前面</span>
                           <button onClick={handleSaveRank} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700">儲存排序</button>
                        </div>
                    </div>

                    <button
                      onClick={handleAdminClose}
                      className="w-full py-3 bg-red-800 text-white rounded-xl font-bold shadow-lg hover:bg-red-900 transition flex items-center justify-center gap-2 border-2 border-red-600 border-dashed"
                    >
                      <i className="fa-solid fa-gavel"></i>
                      [ADMIN] 強制結束拍賣
                    </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 p-6 md:p-8 bg-slate-50/50">
           <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-white shrink-0">
                 <img src={seller?.logo || 'https://placehold.co/150?text=Shop'} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-center md:text-left">
                 <div className="font-bold text-lg text-slate-800 mb-1">{seller?.shop_name || seller?.name || '未知賣家'}</div>
                 <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><i className="fa-solid fa-star text-yellow-400"></i> {shopStats?.averageRating || '5.0'} 評價</span>
                    <span className="flex items-center gap-1"><i className="fa-solid fa-users text-pink-400"></i> {shopStats?.followerCount || 0} 粉絲</span>
                    <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-green-400"></i> {shopStats?.joinTime || '近期'}加入</span>
                 </div>
              </div>
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
                    onClick={() => seller && onNavigate(View.CHAT, product, seller.shop_id || seller.id)}
                    className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition"
                 >
                    聊聊
                 </button>
              </div>
           </div>
        </div>

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

      {showReportModal && (
         <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in-up">
               <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-red-500"></i> 檢舉商品
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-bold text-slate-600 mb-1">檢舉對象</label>
                     <div className="text-slate-800 font-bold bg-slate-50 p-2 rounded">{product.name}</div>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-600 mb-1">檢舉主題</label>
                     <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-red-500"
                        placeholder="例如：販售違禁品、詐騙..."
                        value={reportData.subject}
                        onChange={e => setReportData({...reportData, subject: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-600 mb-1">詳細原因</label>
                     <textarea 
                        className="w-full h-32 border border-slate-300 rounded-lg p-2 outline-none focus:border-red-500 resize-none"
                        placeholder="請詳細說明檢舉原因..."
                        value={reportData.reason}
                        onChange={e => setReportData({...reportData, reason: e.target.value})}
                     />
                  </div>
                  <div className="flex gap-3 pt-2">
                     <button onClick={submitReport} className="flex-1 bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600">提交檢舉</button>
                     <button onClick={() => setShowReportModal(false)} className="flex-1 bg-slate-200 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-300">取消</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ProductDetail;