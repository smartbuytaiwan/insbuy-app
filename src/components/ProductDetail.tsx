import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, User, View, ProductVariant, Order } from '../types';
import API from '../api';
import ReportModal from './ReportModal'; // ★ 新增引入新版檢舉模組

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

  // ★ 新增：密碼驗證相關狀態
  const [passwordInput, setPasswordInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // 檢舉相關 State
  const [showReportModal, setShowReportModal] = useState(false);

  // ★ 新增：關注商品相關 State 與 Logic
  const [isProductSaved, setIsProductSaved] = useState(false);
  const storageKey = currentUser ? `insbuy_saved_products_${currentUser.id}` : 'insbuy_saved_products_guest';

  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    setIsProductSaved(savedIds.includes(product.id));
  }, [product.id, currentUser]);

  const handleToggleSaveProduct = () => {
    let savedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (isProductSaved) {
        savedIds = savedIds.filter((id: string) => id !== product.id);
    } else {
        savedIds.unshift(product.id);
    }
    localStorage.setItem(storageKey, JSON.stringify(savedIds));
    setIsProductSaved(!isProductSaved);
  };

// ==========================================
  // 分潤系統：解析網址 ?ref=... 並記錄點擊
  // ==========================================
  useEffect(() => {
    if (!product) return;
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
        const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('insbuy_affiliate', JSON.stringify({ code: refCode, expiry }));
        API.recordAffiliateClick({ code: refCode, shop_id: product.shop_id }).catch(() => {});
      }
  }, [product?.id, product?.shop_id]);
  
  // ★ 動態 SEO 注入機制
  useEffect(() => {
    if (!product) return;
    
    const originalTitle = document.title;
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const metaDescription = document.querySelector('meta[name="description"]');
    let originalKeywords = '';
    let originalDesc = '';

    document.title = product.seo_title ? product.seo_title : `${product.name} | InsBuy 拍拍購`;

    if (product.keywords && product.keywords.length > 0) {
        if (metaKeywords) {
            originalKeywords = metaKeywords.getAttribute('content') || '';
            metaKeywords.setAttribute('content', product.keywords.join(', '));
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'keywords';
            newMeta.content = product.keywords.join(', ');
            document.head.appendChild(newMeta);
        }
    }

    const descToUse = product.seo_description || product.description || '';
    if (descToUse) {
        const cleanDesc = descToUse.substring(0, 150).replace(/\n/g, ' ');
        if (metaDescription) {
            originalDesc = metaDescription.getAttribute('content') || '';
            metaDescription.setAttribute('content', cleanDesc);
        } else {
            const newMetaDesc = document.createElement('meta');
            newMetaDesc.name = 'description';
            newMetaDesc.content = cleanDesc;
            document.head.appendChild(newMetaDesc);
        }
    }

    // ★ 新增：動態產生 Canonical (標準網址) 標籤，解決 Google「這是重複網頁」的問題
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    let originalCanonical = '';
    const cleanUrl = `${window.location.origin}/PRODUCT/${product.id}`; // 乾淨的標準網址，不含 ?ref= 等參數

    if (canonicalLink) {
        originalCanonical = canonicalLink.getAttribute('href') || '';
        canonicalLink.setAttribute('href', cleanUrl);
    } else {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        canonicalLink.setAttribute('href', cleanUrl);
        document.head.appendChild(canonicalLink);
    }

    return () => {
        document.title = originalTitle;
        if (metaKeywords && originalKeywords) metaKeywords.setAttribute('content', originalKeywords);
        if (metaDescription && originalDesc) metaDescription.setAttribute('content', originalDesc);
        
        // ★ 離開頁面時還原或移除 canonical，避免污染其他頁面
        if (canonicalLink) {
            if (originalCanonical) {
                canonicalLink.setAttribute('href', originalCanonical);
            } else {
                if (document.head.contains(canonicalLink)) {
                    document.head.removeChild(canonicalLink);
                }
            }
        }
    };
  }, [product]);

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

  const handleAddToCart = (): boolean => {
    if (!selectedVariant) { 
        alert('請選擇規格'); 
        return false; 
    }

    if (parseInt(qty as any) > 10) {
        alert("防護機制：為了讓更多人能購買，單一商品單次最多限購 10 件喔！");
        setQty(10);
        return false;
    }
    
    let finalQty = parseInt(qty as any);
    if (isNaN(finalQty) || finalQty < 1) {
        alert('請輸入有效的數量');
        setQty(1);
        return false;
    }

    if (product.product_type === 'PHYSICAL' && selectedVariant.stock < finalQty) {
      alert(`庫存不足！該規格目前僅剩 ${selectedVariant.stock} 件`);
      setQty(Math.max(1, selectedVariant.stock));
      return false;
    }
    
    onAddToCart({
      ...product,
      qty: finalQty,
      selectedVariant: selectedVariant.name,
      finalPrice: selectedVariant ? selectedVariant.price : product.price,
      isReviewed: false
    });
    return true; 
  };

  const handleAdminClose = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    if (!window.confirm('⚠️ 管理員確認：您確定要強制下架(結標)此商品嗎？\n此操作將無法復原。')) return;

    try {
      await API.closeProduct(product.id);
      
      // ★ 新增：自動化愛聊通知邏輯
      try {
         const messageContent = `[系統通知] 您的商品「${product.name}」因違反平台規範，已遭到管理員強制下架。若有疑慮，請前往賣家後台商品管理點擊「我要申訴」並上傳相關證明文件。`;
         const targetSellerId = seller?.id || product.shop_id;
         if (targetSellerId) {
             await API.sendMessage({
                 senderId: 'ADMIN',
                 receiverId: targetSellerId,
                 content: messageContent,
                 timestamp: new Date().toISOString()
             });
         }
      } catch (msgErr) {
         console.error('發送下架通知失敗', msgErr);
      }

      alert('已執行強制結標！系統已自動發送「愛聊通知」給該賣家。');
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

  const finalPrice = selectedVariant ? selectedVariant.price : product.price;
  const isVideo = (src: string) => src?.startsWith('data:video') || src?.endsWith('.mp4');

  // ★ 安全防護：過濾商品描述與評價中的 XSS 語法與競品導外連結
  const filterText = (text?: string) => {
    if (!text) return '';
    let safeText = text.replace(/</g, '＜').replace(/>/g, '＞');
    const blockPattern = /(https?:\/\/[^\s]*?(shopee|momoshop|ruten|pchome|taobao)[^\s]*|[a-zA-Z0-9.\-]*?(shopee\.tw|momoshop\.com\.tw|ruten\.com\.tw|pchome\.com\.tw|taobao\.com)[^\s]*)/gi;
    return safeText.replace(blockPattern, '[系統已屏蔽外部連結]');
  };

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

  // ★ 新增：隱藏商品密碼攔截畫面 (如果商品被隱藏，且未解鎖，就優先顯示這個畫面)
  if (product.is_hidden && product.view_password && !isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
         <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-slate-100">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
               <i className="fa-solid fa-lock text-2xl text-[#EE4D2D]"></i>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">專屬隱藏商品</h2>
            <p className="text-sm text-slate-500 mb-6 font-bold">請輸入賣家提供的專屬密碼以查看</p>
            
            <div className="text-left mb-4">
               <input
                  type="password"
                  placeholder="請輸入密碼..."
                  className={`w-full border rounded-xl p-3 text-center outline-none transition focus:border-[#EE4D2D] ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  onKeyDown={e => {
                      if (e.key === 'Enter') {
                          if (passwordInput === product.view_password) setIsVerified(true);
                          else setPasswordError('密碼錯誤，請確認後重新輸入');
                      }
                  }}
               />
               {passwordError && (
                 <div className="text-red-500 text-xs font-bold mt-2 text-center">
                   <i className="fa-solid fa-circle-exclamation"></i> {passwordError}
                 </div>
               )}
            </div>

            <button
               onClick={() => {
                   if (passwordInput === product.view_password) setIsVerified(true);
                   else setPasswordError('密碼錯誤，請確認後重新輸入');
               }}
               className="w-full bg-[#EE4D2D] text-white py-3 rounded-xl font-bold hover:bg-[#d73211] transition shadow-md active:scale-95 mb-3"
            >
               確認解鎖
            </button>
            <button
               onClick={() => onNavigate(View.SHOP)}
               className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200 transition active:scale-95"
            >
               返回首頁
            </button>
         </div>
      </div>
    );
  }

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
                  <div className="flex gap-1 md:gap-2">
                     {/* ★ 新增：關注商品 (愛心) 按鈕 */}
                     <button onClick={handleToggleSaveProduct} className={`transition p-2 rounded-full hover:bg-slate-50 ${isProductSaved ? 'text-[#EE4D2D]' : 'text-slate-400 hover:text-[#EE4D2D]'}`} title={isProductSaved ? "取消關注" : "關注商品"}>
                        <i className={`${isProductSaved ? 'fa-solid' : 'fa-regular'} fa-heart text-xl`}></i>
                     </button>
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
                       NT${product.original_price}
                     </span>
                   )}
                 </div>
              </div>

              {/* ★ 新增：預購專屬資訊卡塊 (只在預購商品顯示) */}
              {(product as any).is_preorder && (
                  <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-4 md:p-5 animate-fade-in-up">
                      <div className="flex items-center gap-2 text-[#EE4D2D] font-black mb-3">
                          <i className="fa-solid fa-fire text-lg"></i>
                          <span>熱烈預購商品</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-orange-900 font-bold">
                          <div className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-orange-100">
                              <i className="fa-regular fa-calendar-xmark text-orange-500 w-4"></i>
                              <span>結束日期：{(product as any).preorder_end_date || '未設定'}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-orange-100">
                              <i className="fa-solid fa-truck-fast text-orange-500 w-4"></i>
                              <span>預計到貨：{(product as any).preorder_arrival_date || '未設定'}</span>
                          </div>
                      </div>
                  </div>
              )}

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
                         {v.name} {v.price > 0 && `($${v.price})`}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div>
                   <h3 className="text-sm font-bold text-slate-500 mb-3">數量</h3>
                   <div className="flex items-center gap-4">
                     <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden h-10 w-32">
                        <button onClick={() => setQty(Math.max(1, (parseInt(qty as any) || 1) - 1))} className="w-10 h-full hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><i className="fa-solid fa-minus"></i></button>
                        <input 
                           type="number" 
                           className="flex-1 w-full text-center outline-none text-slate-800 font-bold appearance-none m-0" 
                           value={qty} 
                           onChange={e => {
                               const val = parseInt(e.target.value);
                               if (!isNaN(val)) {
                                   // ★ 安全防護 7：手動輸入時防呆
                                   if (val > 10) {
                                       alert("防護機制：單一商品單次最多限購 10 件喔！");
                                       setQty(10);
                                   } else {
                                       setQty(val);
                                   }
                               }
                               else if (e.target.value === '') setQty('' as any); // 允許使用者刪除清空重新輸入
                           }}
                           onBlur={() => {
                               let finalQty = parseInt(qty as any);
                               if (isNaN(finalQty) || finalQty < 1) finalQty = 1;
                               // ★ 安全防護 7：失去焦點時最後確認
                               if (finalQty > 10) finalQty = 10;
                               const maxStock = selectedVariant?.stock || product.total_stock || 0;
                               // 若為實體商品且輸入大於庫存，自動修正為最大庫存
                               if (product.product_type === 'PHYSICAL' && finalQty > maxStock) {
                                   finalQty = Math.max(1, maxStock);
                               }
                               setQty(finalQty);
                           }}
                        />
                        <button onClick={() => {
                            // ★ 安全防護 7：按鈕增加時防呆
                            const currentQty = parseInt(qty as any) || 0;
                            if (currentQty >= 10) {
                                alert("防護機制：為了讓更多人能購買，單一商品單次最多限購 10 件喔！");
                                return;
                            }
                            setQty(currentQty + 1);
                        }} className="w-10 h-full hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><i className="fa-solid fa-plus"></i></button>
                     </div>
                     <span className="text-xs text-slate-400">還剩 {selectedVariant?.stock || 0} 件</span>
                   </div>
                 </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t pt-6">
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                      const success = handleAddToCart();
                      // 加入購物車，如果成功，上方原本就有 showToast 提示
                  }}
                  className="flex-1 py-4 bg-[#FFEEEC] text-[#EE4D2D] border-2 border-[#EE4D2D] rounded-xl font-bold hover:bg-[#ffdfdb] transition flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-cart-plus"></i> 加入購物車
                </button>
                <button 
                  onClick={() => { 
                      // ★ 只有在加入購物車「成功」時，才允許跳轉到結帳/購物車畫面
                      const success = handleAddToCart();
                      if (success) {
                          onNavigate(View.CART); 
                      }
                  }}
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
                 <div className="font-bold text-lg text-slate-800 mb-1 flex items-center justify-center md:justify-start gap-2">
                    {seller?.shop_name || seller?.name || '未知賣家'}
                    {/* ★ 新增：優良商家金牌 Icon */}
                    {(seller?.has_excellent_badge || (seller as any)?.excellent_badge_expire_at) && (
                       <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded text-[10px] font-black border border-yellow-200 flex items-center gap-1 shadow-sm">
                          <i className="fa-solid fa-medal"></i> 優良商家
                       </span>
                    )}
                 </div>
                 <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><i className="fa-solid fa-star text-yellow-400"></i> {shopStats?.averageRating || '5.0'} 評價</span>
                    <span className="flex items-center gap-1"><i className="fa-solid fa-users text-pink-400"></i> {shopStats?.followerCount || 0} 粉絲</span>
                    <span className="flex items-center gap-1"><i className="fa-regular fa-clock text-green-400"></i> {shopStats?.joinTime || '近期'}加入</span>
                 </div>
              </div>
              {/* ★ 修正 6：確保按鈕容器為橫向(flex-row)，並加上 whitespace-nowrap 讓中文字絕對不換行 */}
              <div className="flex flex-row flex-wrap justify-center md:justify-start gap-2 w-full md:w-auto">
                 <button 
                   onClick={() => seller && onFollowShop(seller.shop_id || seller.id)}
                   className={`flex-1 md:flex-none px-4 py-2 text-sm whitespace-nowrap rounded-lg font-bold border transition ${isFollowing ? 'border-slate-200 text-slate-400 bg-slate-100' : 'border-[#EE4D2D] text-[#EE4D2D] bg-white hover:bg-orange-50'}`}
                 >
                   {isFollowing ? '已關注' : '+ 關注'}
                 </button>
                 <button 
                   onClick={() => seller && onNavigate(View.SHOP, undefined, seller.shop_id || seller.id)}
                   className="flex-1 md:flex-none px-4 py-2 text-sm whitespace-nowrap bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                 >
                   <i className="fa-solid fa-store"></i> 逛逛賣場
                 </button>
                 <button 
                    onClick={() => seller && onNavigate(View.CHAT, product, seller.shop_id || seller.id)}
                    className="flex-1 md:flex-none px-4 py-2 text-sm whitespace-nowrap bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                 >
                    <i className="fa-regular fa-comments"></i> 愛聊
                 </button>
              </div>
           </div>
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100">
           <h3 className="bg-slate-100 text-slate-700 py-3 px-6 rounded-t-xl font-bold inline-block">商品詳情</h3>
           <div className="p-6 border border-slate-100 rounded-b-xl rounded-tr-xl bg-white mb-8">
              {/* ★ 判斷如果有自訂 HTML 則渲染 HTML，否則渲染一般文字 */}
              {product.custom_html ? (
                  <div 
                      className="w-full overflow-hidden" 
                      dangerouslySetInnerHTML={{ __html: product.custom_html }} 
                  />
              ) : (
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{filterText(product.description)}</p>
              )}
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
                         <p className="text-sm text-slate-600 mt-2">{filterText(rev.comment)}</p>
                      </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {showReportModal && (
        <ReportModal 
          targetId={product.id} 
          targetName={product.name} 
          type="PRODUCT" 
          currentUser={currentUser} 
          onClose={() => setShowReportModal(false)} 
        />
      )}
    </div>
  );
};

export default ProductDetail;