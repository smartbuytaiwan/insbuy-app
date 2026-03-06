import React, { useState } from 'react';
import ServiceManagement from './components/ServiceManagement';
import StaffManagement from './components/StaffManagement';
import BookingCalendar from './components/BookingCalendar';
import ResourceManagement from './components/ResourceManagement'; // ★ 新增
import VoucherManagement from './components/VoucherManagement'; // ★ 新增
import StoreSettingManagement from './components/StoreSettingManagement'; // ★ 修正：加上 components/ 資料夾路徑

type TabType = 'calendar' | 'services' | 'staff' | 'resources' | 'vouchers' | 'crm' | 'settings';

const SellerBookingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');

  // 安全地從 localStorage 取得登入者的 shopId
  const userStr = localStorage.getItem('insbuy_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const shopId = user?.shop_id || user?.id || '';

  const tabs = [
    { id: 'calendar', label: '預約行事曆', icon: 'fa-calendar-days' },
    { id: 'services', label: '服務與項目', icon: 'fa-spa' },
    { id: 'staff', label: '員工與排班', icon: 'fa-user-tie' },
    { id: 'resources', label: '設備管理', icon: 'fa-chair' }, // ★ 新增
    { id: 'vouchers', label: '套券/儲值', icon: 'fa-ticket' }, // ★ 新增
    { id: 'settings', label: '營業設定', icon: 'fa-store' }, // ★ 新增
    { id: 'crm', label: '顧客 CRM', icon: 'fa-users' },
  ];

  return (
    // ★ 加入 max-w-full 與 overflow-hidden 確保手機版絕對不會向右滑動破版
    <div className="w-full bg-white rounded-2xl shadow-sm p-4 md:p-6 max-w-full overflow-hidden animate-fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <i className="fa-solid fa-calendar-check text-purple-600"></i> 預約與 CRM 管理專區
      </h2>
      
      {/* 子導覽列 (Sub-navigation) - 支援手機橫向滑動 (overflow-x-auto) 防破版 */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-slate-100 pb-3 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex flex-shrink-0 items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm' 
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* 動態渲染子元件 */}
      <div className="min-h-[400px] w-full">
        {activeTab === 'services' && <ServiceManagement shopId={shopId} />}
        {activeTab === 'staff' && <StaffManagement shopId={shopId} />}
        {activeTab === 'resources' && <ResourceManagement shopId={shopId} />} {/* ★ 新增 */}
        {activeTab === 'vouchers' && <VoucherManagement shopId={shopId} />} {/* ★ 新增 */}
        {activeTab === 'calendar' && <BookingCalendar shopId={shopId} />}
        {activeTab === 'settings' && <StoreSettingManagement shopId={shopId} />}
        
        {activeTab === 'crm' && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <i className="fa-solid fa-users text-5xl mb-4 opacity-20"></i>
            <p className="font-bold text-lg text-slate-500">顧客 CRM 系統開發中...</p>
            <p className="text-sm mt-2 opacity-70">未來可在此為客戶貼標籤與管理過敏史/備註</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerBookingDashboard;