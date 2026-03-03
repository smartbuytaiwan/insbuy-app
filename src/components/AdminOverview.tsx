import React, { useState } from 'react';
import { User } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#EE4D2D'];

interface AdminOverviewProps {
  user: User;
  allUsers?: User[];
  overviewRange: { start: string; end: string };
  setOverviewRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  overviewData: any;
  setShowViewsModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({
  user, allUsers, overviewRange, setOverviewRange, overviewData, setShowViewsModal
}) => {
  // ★ 核心圖表連動狀態 (加入 profit)
  const [activeMetric, setActiveMetric] = useState<'sales' | 'profit' | 'orders' | 'aov' | 'buyers' | 'arpu'>('sales');
  // ★ 快捷時間設定器
  const setQuickRange = (days: number) => {
      const end = new Date();
      const start = new Date();
      if (days === 1) { // 昨日
          start.setDate(start.getDate() - 1);
          end.setDate(end.getDate() - 1);
      } else if (days > 1) {
          start.setDate(start.getDate() - days + 1);
      }
      setOverviewRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  // 成長率渲染器
  const renderGrowth = (val: number) => {
      if (val > 0) return <div className="text-green-500 text-xs font-black flex items-center bg-green-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-caret-up mr-1"></i>{val}%</div>;
      if (val < 0) return <div className="text-red-500 text-xs font-black flex items-center bg-red-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-caret-down mr-1"></i>{Math.abs(val)}%</div>;
      return <div className="text-slate-400 text-xs font-bold flex items-center bg-slate-100 px-1.5 py-0.5 rounded">- 0%</div>;
  };

  const metricConfig: Record<string, { label: string, prefix: string, suffix: string, color: string }> = {
      sales: { label: '銷售額', prefix: '$', suffix: '', color: '#EE4D2D' },
      profit: { label: '預估總毛利', prefix: '$', suffix: '', color: '#10B981' }, // ★ 新增毛利設定
      orders: { label: '訂單數', prefix: '', suffix: ' 筆', color: '#3B82F6' },
      aov: { label: '平均訂單金額', prefix: '$', suffix: '', color: '#10B981' },
      buyers: { label: '買家數', prefix: '', suffix: ' 人', color: '#F59E0B' },
      arpu: { label: '客單價', prefix: '$', suffix: '', color: '#8B5CF6' }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 頂部時間控制列 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
           <i className="fa-solid fa-chart-line text-[#EE4D2D]"></i> 核心營運指標
         </h2>
         <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
               <button onClick={() => setQuickRange(0)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">今日</button>
               <button onClick={() => setQuickRange(1)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">昨日</button>
               <button onClick={() => setQuickRange(7)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">過去 7 天</button>
               <button onClick={() => setQuickRange(30)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">過去 30 天</button>
            </div>
            <div className="flex items-center gap-2 text-sm bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
                <input type="date" value={overviewRange.start} onChange={e => setOverviewRange({...overviewRange, start: e.target.value})} className="flex-1 bg-transparent border-none outline-none text-slate-700 font-bold px-1 text-xs" />
                <span className="text-slate-300">-</span>
                <input type="date" value={overviewRange.end} onChange={e => setOverviewRange({...overviewRange, end: e.target.value})} className="flex-1 bg-transparent border-none outline-none text-slate-700 font-bold px-1 text-xs" />
            </div>
         </div>
      </div>
      
      {/* 數據卡片陣列 (調整 grid 以容納新增的毛利卡片) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {[
            { id: 'sales', title: '總銷售額', val: overviewData.totalSales, pre: '$', gro: overviewData.growth.sales },
            { id: 'profit', title: '預估總毛利', val: overviewData.totalProfit, pre: '$', gro: overviewData.growth.profit }, // ★ 新增毛利卡片
            { id: 'orders', title: '訂單數', val: overviewData.totalOrders, gro: overviewData.growth.orders },
            { id: 'aov', title: '平均訂單金額', val: overviewData.aov, pre: '$', gro: overviewData.growth.aov },
            { id: 'buyers', title: '不重複買家數', val: overviewData.uniqueBuyers, gro: overviewData.growth.buyers },
            { id: 'arpu', title: '客單價 (ARPU)', val: overviewData.arpu, pre: '$', gro: overviewData.growth.arpu },
        ].map(card => (
            <div 
                key={card.id} 
                onClick={() => setActiveMetric(card.id as any)}
                className={`bg-white p-4 rounded-2xl shadow-sm border-2 cursor-pointer transition-all ${activeMetric === card.id ? 'border-[#EE4D2D] bg-orange-50/30 ring-4 ring-orange-50' : 'border-slate-100 hover:border-orange-200'}`}
            >
                <div className="text-xs font-bold text-slate-500 mb-2">{card.title}</div>
                <div className={`text-xl md:text-2xl font-black truncate mb-3 ${activeMetric === card.id ? 'text-[#EE4D2D]' : 'text-slate-800'}`}>
                    {card.pre}{card.val.toLocaleString()}
                </div>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-slate-400 font-bold">較前期</span>
                    {renderGrowth(card.gro)}
                </div>
            </div>
        ))}
        {/* 轉換率獨立卡片 (不連動圖表) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-100 relative overflow-hidden group">
            <div className="text-xs font-bold text-slate-500 mb-2">訂單轉換率</div>
            <div className="text-xl md:text-2xl font-black text-blue-600 truncate mb-3">{overviewData.ctr}%</div>
            <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] text-slate-400 font-bold">較前期</span>
                {renderGrowth(overviewData.growth.ctr)}
            </div>
            <i className="fa-solid fa-filter-circle-dollar absolute -right-2 -bottom-2 text-5xl text-blue-50 opacity-50 group-hover:scale-110 transition-transform"></i>
        </div>
      </div>

      {/* 動態趨勢圖表 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-2 mb-6">
             <i className="fa-solid fa-chart-area text-[#EE4D2D] text-lg"></i>
             <h3 className="font-bold text-slate-800 text-lg">{metricConfig[activeMetric].label} 走勢圖</h3>
         </div>
         <div className="h-72 w-full min-w-0">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={overviewData.salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} dy={10} />
               <YAxis 
                   axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} 
                   tickFormatter={(val) => `${metricConfig[activeMetric].prefix}${val}`}
                   width={60}
               />
               <Tooltip 
                   labelFormatter={(label, payload) => payload[0]?.payload.fullDate} 
                   formatter={(value: any) => [`${metricConfig[activeMetric].prefix}${value.toLocaleString()}${metricConfig[activeMetric].suffix || ''}`, metricConfig[activeMetric].label]}
                   contentStyle={{borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold'}} 
               />
               <Line 
                   type="monotone" 
                   dataKey={activeMetric} 
                   stroke={metricConfig[activeMetric].color} 
                   strokeWidth={4} 
                   dot={{r: 4, fill: metricConfig[activeMetric].color, strokeWidth: 2, stroke: '#fff'}} 
                   activeDot={{r: 7, strokeWidth: 0}} 
                   animationDuration={800}
               />
             </LineChart>
           </ResponsiveContainer>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* 暢銷商品排行榜 */}
         <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-trophy text-yellow-500 text-lg"></i> 區間熱銷商品排行 (Top 5)
            </h3>
            {overviewData.topProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
                    <i className="fa-solid fa-box-open text-4xl mb-3 opacity-30"></i>
                    <p className="font-bold text-sm">區間內尚無銷售紀錄</p>
                </div>
            ) : (
                <div className="space-y-4 flex-1">
                    {overviewData.topProducts.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                            <div className="w-6 font-black text-center text-slate-400">#{idx + 1}</div>
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                                <img src={p.image} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-700 truncate">{p.name}</div>
                                <div className="text-xs text-slate-500 mt-1">已售出 {p.qty} 件</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[10px] text-slate-400 font-bold mb-0.5">創造營收</div>
                                <div className="text-sm font-black text-[#EE4D2D]">${p.revenue.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
         
         {/* 其他狀態模組 */}
         <div className="space-y-6 flex flex-col">
             {/* 訂單狀態分佈 */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><i className="fa-solid fa-chart-pie text-blue-500"></i> 訂單狀態佔比</h3>
                {overviewData.pieData.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 font-bold text-sm">無訂單數據</div>
                ) : (
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={overviewData.pieData} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                            {overviewData.pieData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '12px', fontWeight: 'bold'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                )}
             </div>

             {/* 保留原有的平台與賣場瀏覽捷徑 */}
             <div className="grid grid-cols-2 gap-4">
                 <div onClick={() => setShowViewsModal(true)} className="bg-slate-800 p-4 rounded-2xl shadow-sm cursor-pointer hover:bg-slate-700 transition group relative overflow-hidden">
                     <div className="text-[10px] md:text-xs font-bold text-slate-400 mb-1 flex justify-between items-center">
                         {user.role === 'ADMIN' ? '平台今日瀏覽' : '賣場今日瀏覽'} <i className="fa-solid fa-arrow-up-right-from-square text-white opacity-0 group-hover:opacity-100 transition"></i>
                     </div>
                     <div className="text-xl font-black text-white">{user.role === 'ADMIN' ? overviewData.todayPlatformViews.toLocaleString() : overviewData.todayProductViews.toLocaleString()}</div>
                 </div>
                 <div className="bg-slate-100 p-4 rounded-2xl shadow-sm">
                     <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">{user.role === 'ADMIN' ? '平台區間瀏覽' : '賣場區間瀏覽'}</div>
                     <div className="text-xl font-black text-slate-700">{user.role === 'ADMIN' ? overviewData.intervalPlatformViews.toLocaleString() : overviewData.intervalProductViews.toLocaleString()}</div>
                 </div>
             </div>
             
             {/* 管理員專屬：總會員數 */}
             {user.role === 'ADMIN' && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700"><i className="fa-solid fa-users mr-1"></i> 平台總註冊會員數</span>
                    <span className="text-base font-black text-blue-800">{allUsers?.length || 0} 人</span>
                </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default AdminOverview;