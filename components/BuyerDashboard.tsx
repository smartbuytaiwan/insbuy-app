
import React, { useState } from 'react';
import { User, Order, View } from '../types';

interface BuyerDashboardProps {
  user: User;
  orders: Order[];
  allSellers: User[];
  onNavigate: (view: View, product?: any, targetId?: string) => void;
  onSubmitReview: (orderId: string, itemIndex: number, rating: number, comment: string) => void;
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user, orders, allSellers, onNavigate, onSubmitReview }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'FOLLOWING'>('ORDERS');
  
  // 評價彈窗狀態
  const [reviewModal, setReviewModal] = useState<{
    show: boolean;
    orderId: string;
    itemIndex: number;
    itemName: string;
  }>({ show: false, orderId: '', itemIndex: 0, itemName: '' });
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleDownload = (fileName: string) => {
    alert(`正在下載檔案：${fileName}\n(此為模擬功能，實際應連結至檔案儲存空間)`);
  };

  const openReviewModal = (orderId: string, itemIndex: number, itemName: string) => {
    setReviewModal({ show: true, orderId, itemIndex, itemName });
    setRating(5);
    setComment('');
  };

  const submitReview = () => {
    if (!comment.trim()) return alert('請輸入評價內容');
    onSubmitReview(reviewModal.orderId, reviewModal.itemIndex, rating, comment);
    setReviewModal({ ...reviewModal, show: false });
  };

  // 取得關注的賣家列表
  const followedShops = allSellers.filter(seller => user.following?.includes(seller.shop_id || ''));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Review Modal */}
      {reviewModal.show && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">商品評價</h3>
              <p className="text-sm text-slate-500 text-center mb-6">{reviewModal.itemName}</p>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(star => (
                  <i 
                    key={star} 
                    onClick={() => setRating(star)}
                    className={`fa-solid fa-star text-3xl cursor-pointer transition hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-slate-200'}`}
                  ></i>
                ))}
              </div>
              
              <textarea 
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-[#EE4D2D] outline-none resize-none"
                placeholder="分享您的使用心得，幫助其他買家..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              ></textarea>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-4 bg-slate-50">
              <button 
                onClick={() => setReviewModal({ ...reviewModal, show: false })}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition"
              >
                取消
              </button>
              <button 
                onClick={submitReview}
                className="flex-1 py-3 bg-[#EE4D2D] text-white font-bold rounded-xl shadow-lg hover:bg-[#d73211] transition"
              >
                提交評價
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6">
        <div className="w-20 h-20 bg-[#EE4D2D] text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-md">
          {user.name[0]}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
          <p className="text-slate-500">{user.phone}</p>
          <div className="mt-2 flex gap-2">
            <span className="bg-[#FFEEEC] text-[#EE4D2D] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">一般會員</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 px-4">
        <button 
          onClick={() => setActiveTab('ORDERS')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'ORDERS' ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-receipt mr-2"></i> 我的訂單
        </button>
        <button 
          onClick={() => setActiveTab('FOLLOWING')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition ${activeTab === 'FOLLOWING' ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-heart mr-2"></i> 我的關注
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 min-h-[400px]">
        
        {/* Orders Tab */}
        {activeTab === 'ORDERS' && (
          <>
            {orders.length === 0 ? (
              <div className="text-center py-20 text-slate-400">尚無訂單紀錄</div>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order.id} className="border border-slate-100 rounded-2xl p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                      <div className="text-xs text-slate-400 font-bold">
                        <i className="fa-solid fa-store mr-1 text-slate-300"></i> {order.store_name || '線上商店'}
                        <span className="mx-2">|</span>
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        order.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {order.status === 'PENDING' ? '待處理' : order.status === 'SHIPPED' ? '已出貨' : order.status === 'COMPLETED' ? '已完成' : '已取消'}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          <div className="flex gap-4 items-center flex-1">
                            <img src={item.images[0]} className="w-14 h-14 object-contain bg-white border border-slate-50 rounded-xl" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-slate-700 line-clamp-1">{item.name}</div>
                                {item.product_type === 'DIGITAL' && <span className="bg-blue-100 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold">電子檔</span>}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">規格: {item.selectedVariant || '單一'} | 數量: {item.qty}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                             <div className="text-sm font-black text-slate-800">${item.finalPrice * item.qty}</div>
                             
                             {/* 下載按鈕 (僅限已完成且為電子商品) */}
                             {order.status === 'COMPLETED' && item.digital_files && item.digital_files.length > 0 && (
                                <button 
                                  onClick={() => handleDownload(item.digital_files![0])}
                                  className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition flex items-center gap-1"
                                >
                                  <i className="fa-solid fa-download"></i> 下載
                                </button>
                             )}

                             {/* 評價按鈕 (僅限已完成且尚未評價) */}
                             {order.status === 'COMPLETED' && !item.isReviewed && (
                                <button 
                                  onClick={() => openReviewModal(order.id, i, item.name)}
                                  className="text-[10px] bg-[#EE4D2D] text-white px-3 py-1.5 rounded-lg font-bold shadow-md hover:bg-[#d73211] transition flex items-center gap-1"
                                >
                                  <i className="fa-solid fa-star"></i> 評價
                                </button>
                             )}
                             
                             {item.isReviewed && (
                               <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-3 py-1.5 rounded-lg">已評價</span>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold">訂單金額:</span>
                      <span className="text-xl font-black text-[#EE4D2D]">${order.total_amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Following Tab */}
        {activeTab === 'FOLLOWING' && (
          <>
            {followedShops.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <i className="fa-solid fa-heart-crack text-4xl mb-4 opacity-30"></i>
                <p>您還沒有關注任何賣家</p>
                <button onClick={() => onNavigate(View.SHOP)} className="mt-4 text-[#EE4D2D] font-bold text-sm hover:underline">去逛逛賣場</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {followedShops.map(shop => (
                  <div key={shop.shop_id} className="border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition bg-white">
                    <div className="w-16 h-16 rounded-full border border-slate-200 overflow-hidden shrink-0">
                      <img src={shop.logo} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 truncate">{shop.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 truncate">ID: {shop.shop_id}</p>
                    </div>
                    <button 
                      onClick={() => onNavigate(View.SHOP, undefined, shop.shop_id)}
                      className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition"
                    >
                      逛逛
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default BuyerDashboard;
