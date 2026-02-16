import React, { useState, useMemo, useEffect } from 'react';
import { User, Order, View, SiteSettings } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api';

interface BuyerDashboardProps {
  user: User;
  orders: Order[];
  allSellers: User[];
  siteSettings: SiteSettings; 
  onNavigate: (view: View, product?: any, targetId?: string) => void;
  onSubmitReview: (orderId: string, itemIndex: number, rating: number, comment: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void;
  onUpdateUser?: (user: User) => void; 
  initialTab?: string;
}

const BUYER_ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待付款' },
  { value: 'CONFIRMED', label: '待出貨' },
  { value: 'SHIPPED', label: '已出貨' }, 
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '取消/退款' }
];

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user, orders, allSellers, siteSettings, onNavigate, onSubmitReview, onUpdateOrderStatus, onUpdateUser, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'ACCOUNT' | 'ORDERS' | 'REPORTS' | 'CREATE_SHOP'>('ACCOUNT');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [currentReviewItem, setCurrentReviewItem] = useState<{orderId: string, itemIndex: number, productName: string} | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [upgradeForm, setUpgradeForm] = useState({
      shop_name: '',
      tax_id: '',
      shop_description: ''
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [modalContent, setModalContent] = useState<{title: string, content: string} | null>(null);

  useEffect(() => {
    if (initialTab === 'orders' || initialTab === 'ORDERS') setActiveTab('ORDERS');
    else if (initialTab === 'create_shop' || initialTab === 'CREATE_SHOP') setActiveTab('CREATE_SHOP');
  }, [initialTab]);

  const myOrders = useMemo(() => {
    return orders
      .filter(o => orderStatusFilter === 'ALL' || o.status === orderStatusFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, orderStatusFilter]);

  const handleSubmitReview = () => {
    if (currentReviewItem) {
        onSubmitReview(currentReviewItem.orderId, currentReviewItem.itemIndex, reviewRating, reviewComment);
        setReviewModalOpen(false);
        setReviewComment('');
        setReviewRating(5);
    }
  };

  const openReviewModal = (orderId: string, index: number, productName: string) => {
      setCurrentReviewItem({ orderId, itemIndex: index, productName });
      setReviewModalOpen(true);
  };

  const expenseChartData = useMemo(() => {
     const data: any[] = [];
     const start = new Date(reportStartDate);
     const end = new Date(reportEndDate);
     
     for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOrders = orders.filter(o => o.created_at.startsWith(dateStr) && o.status !== 'CANCELLED');
        const amount = dayOrders.reduce((sum, o) => sum + o.total_amount, 0);
        data.push({ date: dateStr.slice(5), amount }); 
     }
     return data;
  }, [orders, reportStartDate, reportEndDate]);

  const totalSpent = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = orders.length;

  const handleUpgradeToSeller = async () => {
     if (!upgradeForm.shop_name) return alert('請填寫賣場名稱');
     if (!agreeTerms) return alert('請勾選同意條款');

     try {
         const result = await API.upgradeToSeller(user.id, upgradeForm);
         if (onUpdateUser) {
             onUpdateUser(result);
             alert('恭喜！您已成功升級為賣家身分。\n頁面將自動重新整理以載入賣家功能。');
             window.location.reload(); 
         }
     } catch (e) {
         console.error(e);
         alert('升級失敗，請檢查網路連線');
     }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in pb-20">
      
      {modalContent && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="bg-[#EE4D2D] p-5 flex justify-between items-center text-white">
              <h3 className="font-black text-lg">{modalContent.title}</h3>
              <button onClick={() => setModalContent(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-8 overflow-y-auto whitespace-pre-wrap font-sans text-slate-600">
               {modalContent.content}
            </div>
          </div>
        </div>
      )}

      <aside className="w-full md:w-64 space-y-2 shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <img src={user.logo || 'https://placehold.co/100'} className="w-10 h-10 rounded-xl object-cover bg-slate-100 border" />
            <div>
              <div className="font-bold text-slate-800 text-sm truncate">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">ID: {user.id}</div>
              <div className="flex gap-1 mt-1">
                 <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] border border-slate-200">
                    <i className="fa-solid fa-crown mr-1 text-yellow-500"></i>Lv.{user.level}
                 </span>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'ACCOUNT', icon: 'fa-user', label: '我的帳戶' },
              { id: 'ORDERS', icon: 'fa-bag-shopping', label: '我的訂單' },
              { id: 'REPORTS', icon: 'fa-chart-line', label: '消費分析' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <i className={`fa-solid ${item.icon} w-5`}></i>
                {item.label}
              </button>
            ))}
            
            {user.role !== 'SELLER' && (
                <button 
                    onClick={() => setActiveTab('CREATE_SHOP')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'CREATE_SHOP' ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <i className="fa-solid fa-store w-5"></i>
                    申請開店
                </button>
            )}
          </nav>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
             <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg">
                   <div className="text-[10px] text-slate-400">總消費</div>
                   <div className="text-sm font-black text-slate-700">${totalSpent.toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                   <div className="text-[10px] text-slate-400">訂單數</div>
                   <div className="text-sm font-black text-slate-700">{totalOrders}</div>
                </div>
             </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-6">

         {activeTab === 'ACCOUNT' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
               <h2 className="text-xl font-black text-slate-800 border-l-4 border-[#EE4D2D] pl-4 mb-6">帳戶基本資料</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <label className="text-xs font-bold text-slate-400 block mb-1">姓名</label>
                     <div className="font-bold text-slate-800 text-lg">{user.name}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <label className="text-xs font-bold text-slate-400 block mb-1">手機號碼</label>
                     <div className="font-bold text-slate-800 text-lg font-mono">{user.phone}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <label className="text-xs font-bold text-slate-400 block mb-1">電子信箱</label>
                     <div className="font-bold text-slate-800 text-lg">{user.email || '未設定'}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <label className="text-xs font-bold text-slate-400 block mb-1">註冊時間</label>
                     <div className="font-bold text-slate-800 text-lg">{new Date(user.created_at || Date.now()).toLocaleDateString()}</div>
                  </div>
               </div>
               <button onClick={() => alert('修改功能開發中')} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700">
                  編輯資料
               </button>
            </div>
         )}

         {activeTab === 'ORDERS' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className="text-xl font-black text-slate-800 border-l-4 border-[#EE4D2D] pl-4">我的訂單</h2>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                      {BUYER_ORDER_STATUS_OPTIONS.map(opt => (
                        <button 
                          key={opt.value}
                          onClick={() => setOrderStatusFilter(opt.value)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${orderStatusFilter === opt.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                      ))}
                  </div>
               </div>

               <div className="space-y-4">
               {myOrders.length === 0 ? (
                  <div className="py-20 text-center text-slate-300">
                     <i className="fa-solid fa-receipt text-4xl mb-4 opacity-50"></i>
                     <p className="font-bold">目前沒有相關訂單</p>
                  </div>
               ) : (
                  myOrders.map(order => {
                    const seller = allSellers.find(s => s.shop_id === order.shop_id || s.id === order.shop_id);
                    return (
                       <div key={order.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition bg-white">
                          <div className="p-4 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
                             <div className="flex items-center gap-3">
                                <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                   <i className="fa-solid fa-store text-slate-400"></i>
                                   {seller?.shop_name || order.store_name || '未知賣家'}
                                </div>
                                <button onClick={() => onNavigate(View.CHAT, undefined, order.shop_id)} className="text-[#EE4D2D] text-xs px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 font-bold border border-orange-100">
                                   {/* ★ 修改：聊聊 改為 愛聊 */}
                                   <i className="fa-regular fa-comments mr-1"></i>愛聊
                                </button>
                             </div>
                             
                             <div className="flex items-center gap-2">
                                {/* ★ 新增：顯示已收到貨款標籤 */}
                                {(order as any).is_paid && (
                                   <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded border border-green-200 flex items-center gap-1 font-bold">
                                      <i className="fa-solid fa-check-circle"></i> 已收到貨款
                                   </span>
                                )}

                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                    order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                                    order.status === 'CANCELLED' ? 'bg-slate-200 text-slate-500' :
                                    'bg-orange-100 text-[#EE4D2D]'
                                }`}>
                                    {BUYER_ORDER_STATUS_OPTIONS.find(o => o.value === order.status)?.label}
                                </span>
                             </div>
                          </div>

                          <div className="p-4">
                             <div className="flex justify-between items-center mb-4 text-[10px] text-slate-400">
                                <span>訂單編號: {order.id}</span>
                                <span><i className="fa-regular fa-clock mr-1"></i>{new Date(order.created_at).toLocaleString('zh-TW')}</span>
                             </div>

                             <div className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                        <img src={item.image || 'https://placehold.co/100'} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{item.variantName ? `規格: ${item.variantName}` : '單一規格'} x {item.qty}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-slate-700">${item.price.toLocaleString()}</div>
                                        {order.status === 'COMPLETED' && (
                                            <button 
                                                onClick={() => openReviewModal(order.id, idx, item.name)}
                                                className="mt-2 text-xs text-[#EE4D2D] font-bold border border-[#EE4D2D] px-2 py-1 rounded hover:bg-[#EE4D2D] hover:text-white transition"
                                            >
                                                給評價
                                            </button>
                                        )}
                                    </div>
                                    </div>
                                ))}
                             </div>
                          </div>
                          
                          <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                             <div className="text-xs text-slate-500 font-bold">
                                共 {order.items.reduce((a,b)=>a+b.qty,0)} 件商品 • 總金額 <span className="text-lg text-[#EE4D2D] font-black ml-1">${order.total_amount.toLocaleString()}</span>
                             </div>
                             
                             <div className="flex gap-2 w-full md:w-auto">
                                {order.status === 'PENDING' && (
                                    <>
                                        <button className="flex-1 md:flex-none px-6 py-2 bg-[#EE4D2D] text-white rounded-lg font-bold text-sm hover:bg-[#d73211]">付款</button>
                                        <button onClick={() => onUpdateOrderStatus && onUpdateOrderStatus(order.id, 'CANCELLED')} className="flex-1 md:flex-none px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-300">取消</button>
                                    </>
                                )}
                                {order.status === 'SHIPPED' && (
                                    <button onClick={() => onUpdateOrderStatus && onUpdateOrderStatus(order.id, 'COMPLETED')} className="flex-1 md:flex-none w-full px-6 py-2 bg-[#EE4D2D] text-white rounded-lg font-bold text-sm hover:bg-[#d73211]">確認收貨</button>
                                )}
                             </div>
                          </div>
                       </div>
                    );
                  })
               )}
               </div>
            </div>
         )}

         {activeTab === 'REPORTS' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                   <h2 className="text-xl font-black text-slate-800 border-l-4 border-[#EE4D2D] pl-4">消費趨勢分析</h2>
                   
                   <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <input 
                        type="date" 
                        value={reportStartDate} 
                        onChange={e => setReportStartDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-600 outline-none px-2"
                      />
                      <span className="text-slate-400 text-xs">~</span>
                      <input 
                        type="date" 
                        value={reportEndDate} 
                        onChange={e => setReportEndDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-600 outline-none px-2"
                      />
                   </div>
               </div>
               
               <div className="h-64 w-full bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={expenseChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Line type="monotone" dataKey="amount" stroke="#EE4D2D" strokeWidth={3} dot={{r: 4, fill: '#EE4D2D', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-4 text-center text-xs text-slate-400">
                  統計區間總消費: <span className="font-bold text-slate-700">${expenseChartData.reduce((a,b)=>a+b.amount,0).toLocaleString()}</span>
               </div>
            </div>
         )}

         {activeTab === 'CREATE_SHOP' && user.role !== 'SELLER' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
               <h2 className="text-2xl font-black text-slate-800 border-l-4 border-green-500 pl-4 mb-2">申請成為賣家</h2>
               <p className="text-slate-500 text-sm mb-8 pl-5">填寫以下店鋪資訊，立即開啟您的電商事業！(帳號密碼將沿用您目前的會員資料)</p>
               
               <div className="max-w-2xl space-y-6 pl-5">
                  <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">賣場名稱 <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        className="w-full h-12 border border-slate-200 rounded-xl px-4 outline-none focus:border-green-500 transition"
                        placeholder="請輸入您的商店名稱"
                        value={upgradeForm.shop_name}
                        onChange={e => setUpgradeForm({...upgradeForm, shop_name: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">統一編號 (選填)</label>
                      <input 
                        type="text" 
                        className="w-full h-12 border border-slate-200 rounded-xl px-4 outline-none focus:border-green-500 transition"
                        placeholder="公司統編 (若無可不填)"
                        value={upgradeForm.tax_id}
                        onChange={e => setUpgradeForm({...upgradeForm, tax_id: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">賣場介紹 (選填)</label>
                      <textarea 
                        className="w-full h-32 border border-slate-200 rounded-xl p-4 outline-none focus:border-green-500 transition resize-none"
                        placeholder="簡單介紹您的賣場..."
                        value={upgradeForm.shop_description}
                        onChange={e => setUpgradeForm({...upgradeForm, shop_description: e.target.value})}
                      />
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                        type="checkbox" 
                        id="agreeTerms" 
                        className="mt-1 w-5 h-5 accent-green-600 cursor-pointer"
                        checked={agreeTerms}
                        onChange={e => setAgreeTerms(e.target.checked)}
                    />
                    <label htmlFor="agreeTerms" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
                        我已閱讀並同意
                        <span onClick={(e) => { e.preventDefault(); setModalContent({ title: '服務條款', content: siteSettings.termsOfService || '暫無內容' }); }} className="text-green-600 font-bold hover:underline mx-1 cursor-pointer">會員服務條款</span>、
                        <span onClick={(e) => { e.preventDefault(); setModalContent({ title: '隱私權條款', content: siteSettings.privacyPolicy || '暫無內容' }); }} className="text-green-600 font-bold hover:underline mx-1 cursor-pointer">隱私權條款</span>
                        與
                        <span onClick={(e) => { e.preventDefault(); setModalContent({ title: '平台免責聲明', content: siteSettings.disclaimer || '暫無內容' }); }} className="text-green-600 font-bold hover:underline mx-1 cursor-pointer">平台免責聲明</span>
                    </label>
                  </div>

                  <button 
                    onClick={handleUpgradeToSeller}
                    className="w-full h-14 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition"
                  >
                     確認提交並升級
                  </button>
               </div>
            </div>
         )}
      </div>

      {reviewModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-fade-in-up shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-2">撰寫評價</h3>
              <p className="text-sm text-slate-500 mb-4 truncate">{currentReviewItem?.productName}</p>
              
              <div className="flex justify-center gap-2 mb-4 text-2xl text-slate-200">
                 {[1,2,3,4,5].map(star => (
                    <button 
                      key={star} 
                      onClick={() => setReviewRating(star)}
                      className={`transition hover:scale-110 ${star <= reviewRating ? 'text-yellow-400' : 'hover:text-yellow-200'}`}
                    >
                       <i className="fa-solid fa-star"></i>
                    </button>
                 ))}
              </div>
              
              <textarea 
                className="w-full h-24 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#EE4D2D] resize-none mb-4"
                placeholder="寫下您對商品的看法..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
              
              <div className="flex gap-2">
                 <button onClick={handleSubmitReview} className="flex-1 py-2 bg-[#EE4D2D] text-white rounded-lg font-bold text-sm\">送出評價</button>
                 <button onClick={() => setReviewModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm">取消</button>
              </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default BuyerDashboard;