
import React, { useState, useMemo } from 'react';
import { Product, CartItem, View, User } from '../types';

interface ProductDetailProps {
  product: Product;
  allSellers: User[]; 
  currentUser?: User | null;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
  onFollowShop?: (shopId: string) => void;
  calculateShopStats?: (shopId: string) => any;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, allSellers, currentUser, onAddToCart, onNavigate, onFollowShop, calculateShopStats }) => {
  const [selectedVariant, setSelectedVariant] = useState<string>(product.variants[0]?.name || '');
  const [qty, setQty] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [activeImage, setActiveImage] = useState(product.images[0]);

  const currentVariant = product.variants.find(v => v.name === selectedVariant);
  const currentPrice = product.price + (currentVariant?.price || 0);
  const currentStock = currentVariant?.stock ?? product.total_stock;

  // 取得賣家資訊並合併動態數據
  const seller = useMemo(() => {
    const s = allSellers.find(s => s.shop_id === product.shop_id);
    if (!s) return null;
    
    // 如果有提供計算函數，則動態計算 stats
    if (calculateShopStats && s.shop_id) {
      const dynamicStats = calculateShopStats(s.shop_id);
      return { ...s, stats: { ...s.stats, ...dynamicStats } };
    }
    return s;
  }, [allSellers, product.shop_id, calculateShopStats]);

  // 判斷是否關注
  const isFollowing = useMemo(() => {
    if (!currentUser || !seller?.shop_id) return false;
    return currentUser.following?.includes(seller.shop_id);
  }, [currentUser, seller]);

  // 計算銷售進度
  const salesProgress = useMemo(() => {
    const goal = product.target_amount || 0;
    const current = product.current_amount || 0;
    const percent = goal > 0 ? Math.min(100, Math.floor((current / goal) * 100)) : 0;
    return { goal, current, percent };
  }, [product]);

  // 計算此商品平均評分
  const productRating = useMemo(() => {
    if (!product.reviews || product.reviews.length === 0) return { avg: 0, count: 0 };
    const sum = product.reviews.reduce((acc, r) => acc + r.rating, 0);
    return { avg: (sum / product.reviews.length).toFixed(1), count: product.reviews.length };
  }, [product.reviews]);

  const handleAddToCart = (shouldNavigateToCart = false) => {
    if (product.variants.length > 0 && !selectedVariant) return alert('請選擇規格');
    const item: CartItem = { ...product, selectedVariant, qty, finalPrice: currentPrice, answers };
    onAddToCart(item);
    
    if (shouldNavigateToCart) {
      onNavigate(View.CART);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 border border-slate-100">
        <div className="space-y-6">
          <div className="aspect-square border border-slate-50 rounded-[2rem] overflow-hidden flex items-center justify-center bg-[#FDFDFD] p-6 group relative">
            <img src={activeImage} className="max-w-full max-h-full object-contain group-hover:scale-110 transition duration-700" />
            {product.product_type === 'DIGITAL' && (
              <div className="absolute top-4 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                <i className="fa-solid fa-cloud-arrow-down mr-1"></i> 電子商品
              </div>
            )}
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
            <h1 className="text-3xl font-black text-slate-800 mb-2 leading-tight">{product.name}</h1>
            <div className="flex items-center gap-4">
              <div className="bg-[#FFEEEC] text-[#EE4D2D] px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase flex items-center gap-2">
                <i className="fa-solid fa-certificate"></i> 官方認證團購主
              </div>
              {productRating.count > 0 && (
                <div className="flex items-center gap-1 text-sm font-bold text-slate-600">
                  <i className="fa-solid fa-star text-yellow-400"></i> {productRating.avg} 
                  <span className="text-slate-400 text-xs font-normal">({productRating.count} 評價)</span>
                </div>
              )}
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
            <button 
              onClick={() => handleAddToCart(false)} 
              className="flex-1 h-16 border-2 border-[#EE4D2D] bg-white text-[#EE4D2D] rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-[#FFEEEC] transition-all active:scale-95 text-lg"
            >
              <i className="fa-solid fa-cart-plus text-xl"></i> 加入購物車
            </button>
            <button 
              onClick={() => handleAddToCart(true)} 
              className="flex-1 h-16 primary-gradient text-white rounded-[1.5rem] font-black shadow-[0_15px_30px_rgba(238,77,45,0.3)] hover:scale-[1.02] transition-all active:scale-95 text-xl flex items-center justify-center gap-3"
            >
               立即結帳 <i className="fa-solid fa-arrow-right-long"></i>
            </button>
          </div>
        </div>
      </div>

      {/* 賣家資訊區塊 (Shopee Style) */}
      <div className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-4 flex-1 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6 w-full md:w-auto">
          <div className="relative">
            <img 
              src={seller?.logo || 'https://via.placeholder.com/80?text=Shop'} 
              className="w-20 h-20 rounded-full border-2 border-slate-100 object-cover bg-slate-50" 
              alt="Shop Logo"
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-800 mb-1">{seller?.name || '未知商店'}</h3>
            <div className="text-xs text-slate-400 mb-3">{seller?.stats?.responseTime || '幾小時內'} 回應</div>
            <div className="flex gap-2">
              <button 
                onClick={() => onNavigate(View.CHAT, undefined, product.shop_id)}
                className="bg-[#FFEEEC] text-[#EE4D2D] border border-[#EE4D2D] text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-[#EE4D2D] hover:text-white transition"
              >
                <i className="fa-regular fa-comments"></i> 聊聊
              </button>
              <button 
                onClick={() => onNavigate(View.SHOP, undefined, product.shop_id)}
                className="bg-white text-slate-600 border border-slate-300 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-50 transition"
              >
                <i className="fa-solid fa-store"></i> 查看賣場
              </button>
              <button 
                onClick={() => onFollowShop && product.shop_id && onFollowShop(product.shop_id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${isFollowing ? 'bg-slate-100 text-slate-500' : 'bg-[#EE4D2D] text-white shadow-md'}`}
              >
                {isFollowing ? '已關注' : '+ 關注'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-y-4 gap-x-8 text-sm flex-[2] w-full">
          <div className="flex justify-between md:justify-start gap-4">
            <span className="text-slate-400">商品評價</span>
            <span className="text-[#EE4D2D] font-bold">{(seller?.stats?.ratingCount || 0).toLocaleString()} <span className="text-xs text-slate-300 font-normal">({seller?.stats?.averageRating?.toFixed(1)})</span></span>
          </div>
          <div className="flex justify-between md:justify-start gap-4">
            <span className="text-slate-400">聊聊回應率</span>
            <span className="text-[#EE4D2D] font-bold">{seller?.stats?.responseRate || 0}%</span>
          </div>
          <div className="flex justify-between md:justify-start gap-4">
            <span className="text-slate-400">加入時間</span>
            <span className="text-[#EE4D2D] font-bold">{seller?.stats?.joinTime || '近期'}</span>
          </div>
          <div className="flex justify-between md:justify-start gap-4">
            <span className="text-slate-400">商品</span>
            <span className="text-[#EE4D2D] font-bold">{seller?.stats?.productCount || 0}</span>
          </div>
          <div className="flex justify-between md:justify-start gap-4">
            <span className="text-slate-400">回應速度</span>
            <span className="text-[#EE4D2D] font-bold">{seller?.stats?.responseTime || '未知'}</span>
          </div>
          <div className="flex justify-between md:justify-start gap-4">
            <span className="text-slate-400">粉絲</span>
            <span className="text-[#EE4D2D] font-bold">{(seller?.stats?.followerCount || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 商品評價列表 */}
      <div className="bg-white rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-3">商品評價 ({product.reviews?.length || 0})</h3>
        
        {!product.reviews || product.reviews.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl">
            <i className="fa-regular fa-comment-dots text-4xl mb-3 opacity-30"></i>
            <p>尚未有評價，購買後成為第一個評價的人！</p>
          </div>
        ) : (
          <div className="space-y-6">
            {product.reviews.map(review => (
              <div key={review.id} className="border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                    {review.userName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-700">{review.userName}</div>
                    <div className="flex text-[10px] text-yellow-400 gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className={`fa-solid fa-star ${i < review.rating ? '' : 'text-slate-200'}`}></i>
                      ))}
                    </div>
                  </div>
                  <div className="ml-auto text-[10px] text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-sm text-slate-600 pl-11">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
