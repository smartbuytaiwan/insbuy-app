import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#EE4D2D', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

interface BuyerReportProps {
  orders: Order[];
}

const BuyerReport: React.FC<BuyerReportProps> = ({ orders }) => {
  // 預設顯示近 30 天
  const [dateRange, setDateRange] = useState({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
  });
  const [activeMetric, setActiveMetric] = useState<'spent' | 'orders' | 'avg'>('spent');

  // 快捷時間設定
  const setQuickRange = (type: string) => {
      const end = new Date();
      let start = new Date();
      if (type === '7days') {
          start.setDate(end.getDate() - 6);
      } else if (type === '30days') {
          start.setDate(end.getDate() - 29);
      } else if (type === 'thisMonth') {
          start = new Date(end.getFullYear(), end.getMonth(), 1);
      } else if (type === 'thisYear') {
          start = new Date(end.getFullYear(), 0, 1);
      }
      setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  // 計算區間內與上一期的有效訂單 (排除已取消)
  const { currentOrders, prevOrders } = useMemo(() => {
      const currentStart = new Date(dateRange.start).getTime();
      const currentEnd = new Date(dateRange.end).getTime() + 86400000 - 1;
      const diff = currentEnd - currentStart + 1;
      const prevStart = currentStart - diff;
      const prevEnd = currentStart - 1;

      const current = orders.filter(o => {
          const time = new Date(o.created_at).getTime();
          return time >= currentStart && time <= currentEnd && o.status !== 'CANCELLED';
      });
      const prev = orders.filter(o => {
          const time = new Date(o.created_at).getTime();
          return time >= prevStart && time <= prevEnd && o.status !== 'CANCELLED';
      });

      return { currentOrders: current, prevOrders: prev };
  }, [orders, dateRange]);

  // 核心數據計算
  const calcData = (orderList: Order[]) => {
      const spent = orderList.reduce((sum, o) => sum + o.total_amount, 0);
      const count = orderList.length;
      const avg = count > 0 ? Math.round(spent / count) : 0;
      return { spent, count, avg };
  };

  const currentStats = calcData(currentOrders);
  const prevStats = calcData(prevOrders);

  const calcGrowth = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
  };

  const growth = {
      spent: calcGrowth(currentStats.spent, prevStats.spent),
      orders: calcGrowth(currentStats.count, prevStats.count),
      avg: calcGrowth(currentStats.avg, prevStats.avg)
  };

  // 圖表數據 (每日)
  const chartData = useMemo(() => {
      const data: any[] = [];
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const dayOrders = currentOrders.filter(o => o.created_at.startsWith(dateStr));
          const spent = dayOrders.reduce((sum, o) => sum + o.total_amount, 0);
          const count = dayOrders.length;
          const avg = count > 0 ? Math.round(spent / count) : 0;
          data.push({ date: dateStr.slice(5), fullDate: dateStr, spent, orders: count, avg }); 
      }
      return data;
  }, [currentOrders, dateRange]);

  // 最常購買商品 Top 5
  const topItems = useMemo(() => {
      const itemMap: Record<string, {name: string, image: string, qty: number, spent: number}> = {};
      currentOrders.forEach(o => {
          o.items.forEach(item => {
              if(!itemMap[item.id]) itemMap[item.id] = {name: item.name, image: item.images?.[0] || 'https://placehold.co/100', qty: 0, spent: 0};
              itemMap[item.id].qty += item.qty;
              itemMap[item.id].spent += (item.finalPrice * item.qty);
          })
      });
      return Object.values(itemMap).sort((a,b) => b.spent - a.spent).slice(0, 5);
  }, [currentOrders]);

  // 圖表設定
  const metricConfig = {
      spent: { label: '總花費金額', prefix: '$', suffix: '', color: '#EE4D2D' },
      orders: { label: '下單次數', prefix: '', suffix: ' 筆', color: '#3B82F6' },
      avg: { label: '平均客單價', prefix: '$', suffix: '', color: '#10B981' }
  };

  const renderGrowth = (val: number) => {
      if (val > 0) return <div className="text-red-500 text-xs font-black flex items-center bg-red-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-caret-up mr-1"></i>{val}%</div>;
      if (val < 0) return <div className="text-green-500 text-xs font-black flex items-center bg-green-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-caret-down mr-1"></i>{Math.abs(val)}% (省錢了)</div>;
      return <div className="text-slate-400 text-xs font-bold flex items-center bg-slate-100 px-1.5 py-0.5 rounded">- 0%</div>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 頂部時間控制列 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
           <i className="fa-solid fa-chart-pie text-[#EE4D2D]"></i> 個人消費報表
         </h2>
         <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
               <button onClick={() => setQuickRange('7days')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">近 7 天</button>
               <button onClick={() => setQuickRange('30days')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">近 30 天</button>
               <button onClick={() => setQuickRange('thisMonth')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">本月</button>
               <button onClick={() => setQuickRange('thisYear')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">今年</button>
            </div>
            <div className="flex items-center gap-2 text-sm bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
                <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="flex-1 bg-transparent border-none outline-none text-slate-700 font-bold px-1 text-xs" />
                <span className="text-slate-300">-</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="flex-1 bg-transparent border-none outline-none text-slate-700 font-bold px-1 text-xs" />
            </div>
         </div>
      </div>

      {/* 數據卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {[
            { id: 'spent', title: '總花費金額', val: currentStats.spent, pre: '$', gro: growth.spent },
            { id: 'orders', title: '成功下單數', val: currentStats.count, pre: '', gro: growth.orders },
            { id: 'avg', title: '平均每單花費', val: currentStats.avg, pre: '$', gro: growth.avg }
        ].map(card => (
            <div 
                key={card.id} 
                onClick={() => setActiveMetric(card.id as any)}
                className={`bg-white p-5 rounded-2xl shadow-sm border-2 cursor-pointer transition-all ${activeMetric === card.id ? 'border-[#EE4D2D] bg-orange-50/30 ring-4 ring-orange-50' : 'border-slate-100 hover:border-orange-200'}`}
            >
                <div className="text-sm font-bold text-slate-500 mb-2">{card.title}</div>
                <div className={`text-2xl md:text-3xl font-black truncate mb-3 ${activeMetric === card.id ? 'text-[#EE4D2D]' : 'text-slate-800'}`}>
                    {card.pre}{card.val.toLocaleString()}
                </div>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-slate-400 font-bold">較上一期</span>
                    {renderGrowth(card.gro)}
                </div>
            </div>
        ))}
      </div>

      {/* 動態走勢圖 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-2 mb-6">
             <i className="fa-solid fa-chart-area text-[#EE4D2D] text-lg"></i>
             <h3 className="font-bold text-slate-800 text-lg">{metricConfig[activeMetric].label} 走勢圖</h3>
         </div>
         <div className="h-64 w-full min-w-0">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} dy={10} />
               <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={(val) => `${metricConfig[activeMetric].prefix}${val}`} width={50} />
               <Tooltip 
                   labelFormatter={(label, payload) => payload[0]?.payload.fullDate} 
                   formatter={(value: any) => [`${metricConfig[activeMetric].prefix}${value.toLocaleString()}${metricConfig[activeMetric].suffix}`, metricConfig[activeMetric].label]}
                   contentStyle={{borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold'}} 
               />
               <Line type="monotone" dataKey={activeMetric} stroke={metricConfig[activeMetric].color} strokeWidth={4} dot={{r: 4, fill: metricConfig[activeMetric].color, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 7, strokeWidth: 0}} />
             </LineChart>
           </ResponsiveContainer>
         </div>
      </div>

      {/* 底部：愛買排行榜 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-ranking-star text-yellow-500 text-lg"></i> 我的愛買商品排行 (Top 5)
          </h3>
          {topItems.length === 0 ? (
              <div className="text-center text-slate-400 py-8 font-bold text-sm">此區間尚無消費紀錄</div>
          ) : (
              <div className="space-y-4">
                  {topItems.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                          <div className="w-6 font-black text-center text-slate-400">#{idx + 1}</div>
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                              <img src={p.image} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-700 truncate">{p.name}</div>
                              <div className="text-xs text-slate-500 mt-1">累積購買 {p.qty} 件</div>
                          </div>
                          <div className="text-right shrink-0">
                              <div className="text-[10px] text-slate-400 font-bold mb-0.5">總花費</div>
                              <div className="text-sm font-black text-[#EE4D2D]">${p.spent.toLocaleString()}</div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default BuyerReport;