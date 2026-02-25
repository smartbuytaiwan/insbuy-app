import React from 'react';
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2 gap-4">
         <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2 md:mb-0">
           <i className="fa-solid fa-chart-simple text-[#EE4D2D]"></i> 經營概況
         </h2>
         <div className="flex flex-wrap items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl w-full md:w-auto">
            <span className="text-slate-500 font-bold px-2 hidden md:block">統計區間:</span>
            <input type="date" value={overviewRange.start} onChange={e => setOverviewRange({...overviewRange, start: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[120px]" />
            <span className="text-slate-300">~</span>
            <input type="date" value={overviewRange.end} onChange={e => setOverviewRange({...overviewRange, end: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[120px]" />
         </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="text-[11px] md:text-xs font-bold text-slate-500 mb-1">{user.role === 'ADMIN' ? '平台區間總GMV' : '區間總銷售額'}</div>
          <div className="text-xl md:text-2xl font-black text-[#EE4D2D]">${overviewData.totalSales.toLocaleString()}</div>
          <i className="fa-solid fa-sack-dollar absolute -right-2 -bottom-4 text-5xl md:text-6xl text-slate-50 opacity-50"></i>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="text-[11px] md:text-xs font-bold text-slate-500 mb-1">{user.role === 'ADMIN' ? '平台區間總單量' : '區間訂單數'}</div>
          <div className="text-xl md:text-2xl font-black text-slate-800">{overviewData.totalOrders} <span className="text-xs md:text-sm text-slate-400">筆</span></div>
          <i className="fa-solid fa-receipt absolute -right-2 -bottom-4 text-5xl md:text-6xl text-slate-50 opacity-50"></i>
        </div>
        <div onClick={() => setShowViewsModal(true)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="text-[11px] md:text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
              {user.role === 'ADMIN' ? '平台今日總瀏覽' : '賣場今日總瀏覽'}
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
          </div>
          <div className="text-xl md:text-2xl font-black text-blue-500">{user.role === 'ADMIN' ? overviewData.todayPlatformViews.toLocaleString() : overviewData.todayProductViews.toLocaleString()} <span className="text-xs md:text-sm text-slate-400">次</span></div>
          <i className="fa-solid fa-eye absolute -right-2 -bottom-4 text-5xl md:text-6xl text-slate-50 opacity-50 group-hover:scale-110 transition-transform"></i>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="text-[11px] md:text-xs font-bold text-slate-500 mb-1">{user.role === 'ADMIN' ? '平台區間總瀏覽' : '賣場區間總瀏覽'}</div>
          <div className="text-xl md:text-2xl font-black text-indigo-500">{user.role === 'ADMIN' ? overviewData.intervalPlatformViews.toLocaleString() : overviewData.intervalProductViews.toLocaleString()} <span className="text-xs md:text-sm text-slate-400">次</span></div>
          <i className="fa-solid fa-chart-line absolute -right-2 -bottom-4 text-5xl md:text-6xl text-slate-50 opacity-50"></i>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <span className="text-[11px] md:text-xs font-bold text-slate-500">平均客單價 (AOV)</span>
            <span className="text-sm md:text-base font-black text-slate-700">${overviewData.totalOrders > 0 ? Math.round(overviewData.totalSales / overviewData.totalOrders).toLocaleString() : 0}</span>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <span className="text-[11px] md:text-xs font-bold text-slate-500">區間轉換率 (CTR)</span>
            <span className="text-sm md:text-base font-black text-slate-700">
              {user.role === 'ADMIN' 
                ? (overviewData.intervalPlatformViews > 0 ? ((overviewData.totalOrders / overviewData.intervalPlatformViews) * 100).toFixed(2) : '0.00')
                : (overviewData.intervalProductViews > 0 ? ((overviewData.totalOrders / overviewData.intervalProductViews) * 100).toFixed(2) : '0.00')}%
            </span>
         </div>
         {user.role === 'ADMIN' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between md:col-span-2">
                <span className="text-[11px] md:text-xs font-bold text-slate-500">平台總註冊會員數</span>
                <span className="text-sm md:text-base font-black text-[#EE4D2D]"><i className="fa-solid fa-users mr-1"></i> {allUsers?.length || 0} 人</span>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-arrow-trend-up text-[#EE4D2D]"></i> 銷售趨勢</h3>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="99%" height="99%">
                <LineChart data={overviewData.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <Tooltip labelFormatter={(label, payload) => payload[0]?.payload.fullDate} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Line type="monotone" dataKey="sales" stroke="#EE4D2D" strokeWidth={3} dot={{r: 4, fill: '#EE4D2D', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
         </div>
         
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-pie text-blue-500"></i> 訂單狀態 (區間內)</h3>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="99%" height="99%">
                <PieChart>
                  <Pie
                    data={overviewData.pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {overviewData.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminOverview;