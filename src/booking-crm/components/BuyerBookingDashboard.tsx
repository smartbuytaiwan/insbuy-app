import React from 'react';

interface Props {
  currentUser: any;
  onNavigate: (view: string) => void;
}

export default function BuyerBookingDashboard({ currentUser, onNavigate }: Props) {
  return (
    <div className="w-full bg-[#F5F5F5] min-h-screen relative flex justify-center animate-fade-in">
      {/* 限制最大寬度，模擬手機 App 體驗 */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-md flex flex-col">
        
        {/* 頂部標題 */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-slate-800">會員專區</h2>
          <button onClick={() => onNavigate('BRAND_STOREFRONT')} className="bg-[#EE4D2D] text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-[#d73211] transition">
            前往預約
          </button>
        </div>

        {/* 會員基本資訊 */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-3xl overflow-hidden border border-slate-200 shrink-0">
              {currentUser?.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" alt="avatar" /> : <i className="fa-solid fa-user"></i>}
            </div>
            <div>
              <div className="text-slate-500 text-sm font-bold tracking-wider">{currentUser?.phone || '未綁定手機'}</div>
              <div className="text-2xl font-black text-slate-800">{currentUser?.name || '顧客您好'}</div>
            </div>
          </div>
          <button className="text-slate-400 hover:text-[#EE4D2D] transition-colors"><i className="fa-regular fa-pen-to-square text-xl"></i></button>
        </div>

        {/* 4 大數據卡片 */}
        <div className="px-6 grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: 'fa-regular fa-calendar-check', label: '我的預約', value: '0' },
            { icon: 'fa-solid fa-ticket', label: '擁有票券', value: '0' },
            { icon: 'fa-solid fa-coins', label: '目前儲值金', value: '0' },
            { icon: 'fa-solid fa-gift', label: '紅利兌換', value: '0' },
          ].map((item, idx) => (
            <div key={idx} className="bg-[#fcfcfc] rounded-2xl p-4 flex flex-col justify-between border border-slate-100 cursor-pointer hover:border-[#ffbba5] hover:bg-[#FFF4F2] transition group">
              <div className="flex justify-between items-center text-slate-500 mb-3 group-hover:text-[#EE4D2D]">
                <span className="text-sm font-bold flex items-center gap-2"><i className={item.icon}></i> {item.label}</span>
                <i className="fa-solid fa-chevron-right text-[10px] opacity-40"></i>
              </div>
              <div className="text-[#EE4D2D] text-2xl font-black">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 功能列表清單 */}
        <div className="px-6 flex flex-col flex-1">
          {[
            { icon: 'fa-solid fa-file-signature', label: '問卷與同意書', count: '0' },
            { icon: 'fa-regular fa-calendar-days', label: '預約管理', count: null },
            { icon: 'fa-solid fa-ticket-simple', label: '票券管理', count: null },
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition px-2 -mx-2 rounded-xl">
              <div className="flex items-center gap-3 text-slate-700 font-bold">
                <i className={`${item.icon} text-lg w-6 text-center text-slate-300`}></i> {item.label}
              </div>
              <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                {item.count !== null && <span>{item.count}</span>}
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </div>
            </div>
          ))}
        </div>

        {/* 底部 Footer */}
        <div className="py-8 text-center text-slate-300 text-xs font-bold flex flex-col items-center gap-1 bg-slate-50 mt-4">
          <button className="flex items-center gap-1 border border-slate-200 px-3 py-1 rounded-full mb-2 hover:bg-slate-100 transition"><i className="fa-solid fa-globe"></i> 語言：繁中</button>
          <div>Powered by 拍拍購</div>
          <div>v1.0.0</div>
        </div>
      </div>
    </div>
  );
}