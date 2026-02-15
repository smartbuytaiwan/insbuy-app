
import React, { useState, useMemo, useEffect } from 'react';
import { User, Order, View } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BuyerDashboardProps {
  user: User;
  orders: Order[];
  allSellers: User[];
  onNavigate: (view: View, product?: any, targetId?: string) => void;
  onSubmitReview: (orderId: string, itemIndex: number, rating: number, comment: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void; // 新增 prop
  initialTab?: string; // New prop for tab redirection
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user, orders, allSellers, onNavigate, onSubmitReview, onUpdateOrderStatus, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'ACCOUNT' | 'ORDERS' | 'REPORTS'>(
    (initialTab === 'ORDERS' || initialTab === 'REPORTS') ? initialTab : 'ACCOUNT'
  );
  
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Sync activeTab if initialTab changes
  useEffect(() => {
    if (initialTab && (initialTab === 'ORDERS' || initialTab === 'REPORTS' || initialTab === 'ACCOUNT')) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 報表相關 State
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  // 訂單狀態分類
  const orderTabs = [
    { id: 'ALL', label: '全部' },
    { id: 'PENDING', label: '待付款' }, // 對應賣家: 待處理
    { id: 'CONFIRMED', label: '待出貨' }, // 對應賣家: 已確認
    { id: 'SHIPPED', label: '待收貨' }, // 對應賣家: 已出貨
    { id: 'COMPLETED', label: '已完成' }, // 對應賣家: 已完成
    { id: 'CANCELLED', label: '取消/退款' }, // 對應賣家: 已取消
  ];

  const filteredOrders = useMemo(() => {
    let list = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (orderStatusFilter !== 'ALL') {
      list = list.filter(o => o.status === orderStatusFilter);
    }
    return list;
  }, [orders, orderStatusFilter]);

  // 報表計算
  const reportData = useMemo(() => {
    const start = new Date(reportStartDate).getTime();
    const end = new Date(reportEndDate).getTime() + 86400000; // 加一天包含結束日

    const validOrders = orders.filter(o => {
      const time = new Date(o.created_at).getTime();
      return time >= start && time < end && o.status !== 'CANCELLED';
    });

    const totalSpending = validOrders.reduce((sum, o) => sum + o.total_amount, 0);

    // 產生圖表數據
    const dailyData: Record<string, number> = {};
    validOrders.forEach(o => {
      const dateStr = o.created_at.split('T')[0];
      dailyData[dateStr] = (dailyData[dateStr] || 0) + o.total_amount;
    });

    const chartData = Object.keys(dailyData).sort().map(date => ({
      date: date.slice(5), // MM-DD
      amount: dailyData[date]
    }));

    return { totalSpending, chartData, count: validOrders.length };
  }, [orders, reportStartDate, reportEndDate]);

  // 計算本日、本月、本年消費
  const quickStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);

    const validOrders = orders.filter(o => o.status !== 'CANCELLED');

    const today = validOrders
      .filter(o => o.created_at.startsWith(todayStr))
      .reduce((sum, o) => sum + o.total_amount, 0);

    const month = validOrders
      .filter(o => o.created_at.startsWith(thisMonthStr))
      .reduce((sum, o) => sum + o.total_amount, 0);

    const year = validOrders
      .filter(o => o.created_at.startsWith(thisYearStr))
      .reduce((sum, o) => sum + o.total_amount, 0);

    return { today, month, year };
  }, [orders]);

  const renderReviewButton = (order: Order, item: any, index: number) => {
    if (order.status !== 'COMPLETED') return null;
    if (item.isReviewed) return <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">已評價</span>;
    
    return (
      <button 
        onClick={() => {
          const rating = Number(prompt('請評分 (1-5):', '5'));
          if (rating >= 1 && rating <= 5) {
             const comment = prompt('請輸入評價內容:', '商品很棒！');
             if (comment) onSubmitReview(order.id, index, rating, comment);
          }
        }}
        className="text-xs border border-[#EE4D2D] text-[#EE4D2D] px-2 py-1 rounded hover:bg-[#FFEEEC]"
      >
        評價
      </button>
    );
  };

  const handleCompleteOrder = (orderId: string) => {
    if (confirm('確定已收到商品並完成訂單嗎？')) {
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(orderId, 'COMPLETED');
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in pb-20">
      {/* 左側選單 - 僅包含買家功能 */}
      <aside className="w-full md:w-64 space-y-2 shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                <img src={user.logo || 'https://placehold.co/100'} className="w-full h-full object-cover" />
             </div>
             <div>
                <div className="font-bold text-slate-800 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400">一般會員</div>
             </div>
          </div>
          <nav className="space-y-1">
             <button 
               onClick={() => setActiveTab('ACCOUNT')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'ACCOUNT' ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <i className="fa-solid fa-user w-5"></i> 我的帳戶
             </button>
             <button 
               onClick={() => setActiveTab('ORDERS')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'ORDERS' ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <i className="fa-solid fa-bag-shopping w-5"></i> 購買清單
             </button>
             <button 
               onClick={() => setActiveTab('REPORTS')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'REPORTS' ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <i className="fa-solid fa-chart-pie w-5"></i> 我的報表
             </button>
          </nav>
        </div>
      </aside>

      {/* 右側內容區 */}
      <div className="flex-1 space-y-6">
         {/* 1. 我的帳戶 */}
         {activeTab === 'ACCOUNT' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">我的帳戶資料</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">會員名稱</label>
                    <div className="text-lg font-bold text-slate-700">{user.name}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">手機號碼</label>
                    <div className="text-lg font-bold text-slate-700">{user.phone}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">電子信箱</label>
                    <div className="text-lg font-bold text-slate-700">{user.email || '未設定'}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">會員 ID</label>
                    <div className="text-sm font-mono text-slate-500 bg-slate-50 px-3 py-1 rounded inline-block">{user.id}</div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">加入時間</label>
                    <div className="text-sm text-slate-600">{new Date(user.created_at).toLocaleString()}</div>
                 </div>
              </div>
           </div>
         )}

         {/* 2. 購買清單 */}
         {activeTab === 'ORDERS' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[600px]">
              <h2 className="text-2xl font-black text-slate-800 mb-6 border-l-4 border-[#EE4D2D] pl-4">購買清單</h2>
              
              {/* 狀態標籤 */}
              <div className="flex overflow-x-auto pb-2 mb-6 gap-2 scrollbar-hide border-b border-slate-100">
                 {orderTabs.map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setOrderStatusFilter(tab.id)}
                     className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${orderStatusFilter === tab.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                   >
                     {tab.label}
                   </button>
                 ))}
              </div>

              <div className="space-y-4">
                 {filteredOrders.length === 0 ? (
                   <div className="py-20 text-center text-slate-300">
                      <i className="fa-solid fa-basket-shopping text-4xl mb-4 opacity-30"></i>
                      <p>此分類尚無訂單</p>
                   </div>
                 ) : (
                   filteredOrders.map(order => (
                     <div key={order.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition bg-white">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">#{order.id.slice(-6)}</span>
                              <span className="text-xs font-bold text-slate-700">{order.store_name}</span>
                              <button onClick={() => onNavigate(View.SHOP, undefined, order.shop_id)} className="text-[10px] text-blue-500 hover:underline">
                                <i className="fa-solid fa-store mr-1"></i>逛逛賣場
                              </button>
                           </div>
                           <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                              order.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                              order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' :
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                           }`}>
                              {orderTabs.find(t => t.id === order.status)?.label}
                           </div>
                        </div>

                        {/* 如果訂單被取消，顯示取消原因 */}
                        {order.status === 'CANCELLED' && order.cancellation_reason && (
                           <div className="mb-4 bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-600 font-bold flex items-start gap-2">
                              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                              <div>
                                 <div>訂單已取消</div>
                                 <div className="text-slate-600 font-normal">原因: {order.cancellation_reason}</div>
                              </div>
                           </div>
                        )}

                        <div className="space-y-3 mb-4">
                           {order.items.map((item, idx) => (
                             <div key={idx} className="flex gap-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                   <img src={item.images?.[0]} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="text-sm font-bold text-slate-800 truncate">{item.name}</div>
                                   <div className="text-xs text-slate-400 mt-1">{item.selectedVariant} x {item.qty}</div>
                                </div>
                                <div className="text-right">
                                   <div className="text-sm font-bold text-slate-700">${item.finalPrice.toLocaleString()}</div>
                                   <div className="mt-1">{renderReviewButton(order, item, idx)}</div>
                                </div>
                             </div>
                           ))}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                           <div className="text-xs text-slate-400">
                              {new Date(order.created_at).toLocaleString()}
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500">訂單金額:</span>
                              <span className="text-lg font-black text-[#EE4D2D]">${order.total_amount.toLocaleString()}</span>
                              
                              {/* 待收貨(SHIPPED)時顯示完成訂單按鈕 */}
                              {order.status === 'SHIPPED' && (
                                <button 
                                  onClick={() => handleCompleteOrder(order.id)}
                                  className="ml-2 px-4 py-1.5 bg-[#EE4D2D] text-white rounded-full text-xs font-bold hover:bg-[#d73211] shadow-md transition"
                                >
                                  完成訂單
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
         )}

         {/* 3. 我的報表 */}
         {activeTab === 'REPORTS' && (
           <div className="space-y-6">
              {/* 快速統計卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-gradient-to-br from-orange-400 to-red-500 text-white p-6 rounded-2xl shadow-lg shadow-orange-200">
                    <div className="text-xs font-bold opacity-80 mb-1">今日消費</div>
                    <div className="text-3xl font-black">${quickStats.today.toLocaleString()}</div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 mb-1">本月消費</div>
                    <div className="text-3xl font-black text-slate-800">${quickStats.month.toLocaleString()}</div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 mb-1">今年度消費</div>
                    <div className="text-3xl font-black text-slate-800">${quickStats.year.toLocaleString()}</div>
                 </div>
              </div>

              {/* 進階報表 */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                 <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <i className="fa-solid fa-chart-line text-[#EE4D2D]"></i> 消費趨勢分析
                 </h2>
                 
                 <div className="flex flex-wrap items-center gap-4 mb-8 bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-500">日期區間:</span>
                       <input 
                         type="date" 
                         value={reportStartDate} 
                         onChange={e => setReportStartDate(e.target.value)}
                         className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#EE4D2D]"
                       />
                       <span className="text-slate-300">~</span>
                       <input 
                         type="date" 
                         value={reportEndDate} 
                         onChange={e => setReportEndDate(e.target.value)}
                         className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#EE4D2D]"
                       />
                    </div>
                    <div className="flex-1 text-right">
                       <span className="text-sm font-bold text-slate-500 mr-2">區間總消費:</span>
                       <span className="text-2xl font-black text-[#EE4D2D]">${reportData.totalSpending.toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="h-80 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={reportData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                            cursor={{stroke: '#EE4D2D', strokeWidth: 1, strokeDasharray: '4 4'}}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#EE4D2D" 
                            strokeWidth={3} 
                            dot={{r: 4, fill: '#EE4D2D', strokeWidth: 2, stroke: '#fff'}} 
                            activeDot={{r: 6}} 
                          />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
