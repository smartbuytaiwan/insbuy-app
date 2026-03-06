import React, { useState, useEffect, useMemo } from 'react';
import { Service, Staff } from './types'; // ★ 修正：改為當前目錄 (./)
import { BookingAPI } from './api'; // ★ 修正：改為當前目錄 (./) 並恢復原本寫法

interface Props {
  shopId?: string; 
  sellerId?: string; 
  storeId?: string; 
  currentUser: any; 
  onNavigate: (view: string, product?: any, targetId?: string) => void;
  onNavigateBack: () => void;
}

export default function BrandBookingStorefront(props: Props) {
  const shopId = props.shopId || props.sellerId || props.storeId || '';
  const { currentUser, onNavigate, onNavigateBack } = props;

  // 流程改為 0~4 (0: 品牌主頁, 1: 服務, 2: 加購, 3: 員工與時間, 4: 確認)
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null); // 店家基本資訊與設定
  const [isLoading, setIsLoading] = useState(true);

  // 選擇的資料
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null); 
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(''); // ★ 新增：追蹤目前被點擊的分類頁籤

  const [availableSlots, setAvailableSlots] = useState<{time: string, available: boolean}[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  // 1. 初始化載入
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [srvRes, stfRes, storeRes] = await Promise.all([
          BookingAPI.getServices(shopId),
          BookingAPI.getStaff(shopId),
          BookingAPI.getStoreSettings(shopId).catch(() => ({})) // 拿取店家設定(可放注意事項等)
        ]);
        setServices(srvRes || []);
        setStaffList(stfRes || []);
        setStoreInfo(storeRes || {});
      } catch (error) {
        console.error('載入資料失敗', error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [shopId]);

  // 將服務依照 Category 分群
  const groupedServices = useMemo(() => {
    const groups = services.reduce((acc, curr) => {
      const cat = curr.category || '未分類'; // 預設分類
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(curr);
      return acc;
    }, {} as Record<string, Service[]>);
    
    // ★ 新增：當分群資料準備好，且尚未選擇分類時，預設選中第一個分類
    if (Object.keys(groups).length > 0 && !activeCategory) {
        setActiveCategory(Object.keys(groups)[0]);
    }
    return groups;
  }, [services, activeCategory]);

  // 2. 監聽日期與員工變化，重新計算防撞期
  useEffect(() => {
    if (step === 3 && selectedService) {
      checkAvailableSlots();
    }
  }, [step, selectedDate, selectedService, selectedStaffId]);

  const checkAvailableSlots = async () => {
    setIsCheckingSlots(true);
    setSelectedTime(null);
    try {
      const addOnMinutes = selectedAddons.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
      
      const response: any = await BookingAPI.getAvailableSlots(
        shopId, selectedService!.id, selectedStaffId || null, selectedDate
      );
      
      const { totalMinutesNeeded, existingBookings, storeSetting, isClosedDay } = response;
      const finalMinutesNeeded = totalMinutesNeeded + addOnMinutes; 

      const slots: {time: string, available: boolean}[] = [];
      const targetDateObj = new Date(selectedDate);
      const dayOfWeek = targetDateObj.getDay().toString(); 
      
      let effectiveSchedule = {
          isOpen: true,
          open: storeSetting?.default_open_time || '10:00',
          close: storeSetting?.default_close_time || '21:00',
          breakStart: '', breakEnd: '',
          slot_interval: 30, // 預設 30 分鐘
          disabled_slots: [] as string[]
      };

      if (storeSetting?.weekly_schedule && storeSetting.weekly_schedule[dayOfWeek]) {
          effectiveSchedule = { ...effectiveSchedule, ...storeSetting.weekly_schedule[dayOfWeek] };
      }
      if (storeSetting?.special_dates && storeSetting.special_dates[selectedDate]) {
          effectiveSchedule = { ...effectiveSchedule, ...storeSetting.special_dates[selectedDate] };
      }
      if (isClosedDay || storeSetting?.closed_dates?.includes(selectedDate)) {
          effectiveSchedule.isOpen = false;
      }

      if (!effectiveSchedule.isOpen) {
         setAvailableSlots([]); 
         setIsCheckingSlots(false);
         return;
      }

      const now = new Date();
      const interval = effectiveSchedule.slot_interval || 30; // 取得後台設定的間隔
      const openTimeObj = new Date(`${selectedDate}T${effectiveSchedule.open || '10:00'}:00`);
      const closeTimeObj = new Date(`${selectedDate}T${effectiveSchedule.close || '21:00'}:00`);
      
      const bookings = existingBookings.map((b: any) => ({
        start: new Date(b.start_time).getTime(),
        end: new Date(b.end_time).getTime()
      }));

      let currentSlotObj = new Date(openTimeObj);
      
      while (currentSlotObj < closeTimeObj) {
         const slotStart = currentSlotObj.getTime();
         // ★ Issue 3 解決：加上服務總時長，確保結束時間不能超過打烊時間！
         const slotEnd = slotStart + finalMinutesNeeded * 60000; 
         const h = currentSlotObj.getHours().toString().padStart(2, '0');
         const m = currentSlotObj.getMinutes().toString().padStart(2, '0');
         const timeStr = `${h}:${m}`;
         
         let isAvailable = true;

         // 1. 檢查是否超過打烊極限時間 (包含做完的時間)
         if (slotStart < now.getTime() || slotEnd > closeTimeObj.getTime()) {
            isAvailable = false;
         }
         // 2. 檢查是否跨到午休時間
         else if (effectiveSchedule.breakStart && effectiveSchedule.breakEnd) {
             const breakStart = new Date(`${selectedDate}T${effectiveSchedule.breakStart}:00`).getTime();
             const breakEnd = new Date(`${selectedDate}T${effectiveSchedule.breakEnd}:00`).getTime();
             if ((slotStart >= breakStart && slotStart < breakEnd) || 
                 (slotEnd > breakStart && slotEnd <= breakEnd) || 
                 (slotStart <= breakStart && slotEnd >= breakEnd)) {
                 isAvailable = false;
             }
         }
         
         // 3. 檢查商家是否手動關閉了該時段 (Issue 5)
         if (effectiveSchedule.disabled_slots?.includes(timeStr)) {
             isAvailable = false;
         }

         // 4. 檢查服務專屬限定時段 (Issue 4)
         if (selectedService?.allowed_times && selectedService.allowed_times.length > 0) {
             if (!selectedService.allowed_times.includes(timeStr)) {
                 isAvailable = false;
             }
         }

         // 5. 檢查預約防撞期
         if (isAvailable) {
            const overlaps = bookings.filter((b: any) => slotStart < b.end && slotEnd > b.start).length;
            if (selectedStaffId) {
              if (overlaps > 0) isAvailable = false;
            } else {
              const totalStaffCount = staffList.length || 1;
              if (overlaps >= totalStaffCount) isAvailable = false;
            }
         }

         // 確保時段起點本身還沒超過打烊時間才放入陣列
         if (slotStart < closeTimeObj.getTime()) {
            slots.push({ time: timeStr, available: isAvailable });
         }
         
         // 依照設定的間隔 (15/30/45/60) 推進下一個時段
         currentSlotObj = new Date(currentSlotObj.getTime() + interval * 60000);
      }
      setAvailableSlots(slots);
    } catch (e) {
      console.error('防撞期計算失敗', e);
    } finally {
      setIsCheckingSlots(false);
    }
  };

  const handleNextStep = () => {
    if (step === 0 && !currentUser) {
      alert('請先登入會員才能進行預約！');
      onNavigate('AUTH');
      return;
    }
    setStep(prev => Math.min(prev + 1, 4) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 0) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAddon = (addon: any) => {
    setSelectedAddons(prev => 
      prev.some(a => a.name === addon.name) 
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    );
  };

  const handleSubmitBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return alert('預約資訊不完整！');

    try {
      // ★ 核心升級：自動派單演算法 (當客人選擇不指定時觸發)
      let finalStaffId = selectedStaffId;
      
      if (!finalStaffId) {
         // 1. 抓取當天所有的預約單
         const todayBookings = await BookingAPI.getBookings(shopId);
         const targetDateBookings = todayBookings.filter((b: any) => b.start_time.startsWith(selectedDate));
         
         // 2. 取得能執行此服務的「可用員工名單」
         const availableStaff = staffList.filter(s => !selectedService.staff_ids?.length || selectedService.staff_ids.includes(s.id));
         
         if (availableStaff.length > 0) {
             // 3. 讀取店家設定的派單規則 (預設為 LEAST_BOOKINGS 案子最少)
             const rule = storeInfo?.auto_assign_rule || 'LEAST_BOOKINGS';
             
             if (rule === 'PRIORITY' && storeInfo?.priority_staff_id) {
                 // 優先指派給特定紅牌
                 finalStaffId = storeInfo.priority_staff_id;
             } else if (rule === 'LEAST_REVENUE') {
                 // 派給營業額最少的人 (以預約數量代替簡易計算)
                 const staffStats = availableStaff.map(staff => {
                     const count = targetDateBookings.filter((b: any) => b.staff_id === staff.id).length;
                     return { id: staff.id, count };
                 });
                 staffStats.sort((a, b) => a.count - b.count);
                 finalStaffId = staffStats[0].id;
             } else {
                 // 預設：LEAST_BOOKINGS (派給今天最閒的人)
                 const staffStats = availableStaff.map(staff => {
                     const count = targetDateBookings.filter((b: any) => b.staff_id === staff.id).length;
                     return { id: staff.id, count };
                 });
                 staffStats.sort((a, b) => a.count - b.count);
                 finalStaffId = staffStats[0].id;
             }
         }
      }

      const [hh, mm] = selectedTime.split(':');
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(hh), parseInt(mm), 0, 0);
      
      const addOnMinutes = selectedAddons.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
      const addOnNames = selectedAddons.map(a => a.name).join('、');
      
      const totalMinutes = selectedService.duration_minutes + selectedService.buffer_minutes + addOnMinutes;
      const endTime = new Date(startTime.getTime() + totalMinutes * 60000);

      // 將加購項目寫入備註
      const finalMemo = `${memo}\n${addOnNames ? `[加購項目: ${addOnNames}]` : ''}`.trim();

      await BookingAPI.createBooking({
        shop_id: shopId,
        buyer_id: currentUser.id,
        buyer_name: currentUser.name || '未提供姓名',   // ★ 新增：自動帶入會員姓名
        buyer_phone: currentUser.phone || '未提供電話', // ★ 新增：自動帶入會員電話
        buyer_email: currentUser.email || '',         // ★ 新增：自動帶入會員信箱
        service_name: selectedService.name,           // ★ 新增：紀錄服務名稱供行事曆顯示
        staff_id: finalStaffId || undefined,          // ★ 修改：套用自動派單結果，絕對不為空
        service_id: selectedService.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        memo: finalMemo,
        status: 'PENDING',
        deposit_status: selectedService.requires_deposit ? 'UNPAID' : 'PAID'
      });

      alert('🎉 預約成功！商家確認後將通知您。');
      onNavigate('BUYER_DASHBOARD'); 

    } catch (e) {
      alert('預約送出失敗，請檢查網路連線。');
    }
  };

  if (isLoading) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse">載入中...</div>;

  return (
    <div className="w-full bg-[#F5F5F5] min-h-screen pb-24 relative">
      {/* 頂部導覽列 */}
      <div className="bg-white sticky top-0 z-40 shadow-sm px-4 py-3 flex items-center justify-between">
        <button onClick={step === 0 ? onNavigateBack : handlePrevStep} className="text-slate-600 hover:text-[#EE4D2D] font-bold">
          <i className="fa-solid fa-chevron-left mr-2"></i> {step === 0 ? '返回賣場' : '上一步'}
        </button>
        <h2 className="text-lg font-black text-slate-800 tracking-wider">線上預約</h2>
        {currentUser ? (
           <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden"><i className="fa-solid fa-user text-slate-400 mt-2 ml-2"></i></div>
        ) : (
           <button onClick={() => onNavigate('AUTH')} className="text-[#EE4D2D] font-bold text-sm">登入</button>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        
        {/* Step 0: 品牌主頁 (首頁) */}
        {step === 0 && (
          <div className="bg-white min-h-[80vh] animate-fade-in flex flex-col">
            {/* Banner & Logo 區塊 */}
            <div className="relative h-48 bg-[#fdf5f3] flex items-center justify-center border-b border-orange-100">
                {/* 如果商家有設定 banner 可放這裡，預設放店名大字 */}
                <h1 className="text-5xl font-serif text-[#d7a195] tracking-widest opacity-60">
                  {currentUser?.shop_name?.substring(0,2) || '品牌'}
                </h1>
                
                <div className="absolute -bottom-8 left-6 flex items-end gap-4">
                   <div className="w-20 h-20 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center p-1 overflow-hidden">
                       <div className="w-full h-full bg-[#FFF4F2] rounded-full flex items-center justify-center text-[#EE4D2D] font-black text-xl">
                          {currentUser?.shop_name?.substring(0,1) || '店'}
                       </div>
                   </div>
                   <div className="pb-2">
                       <h2 className="text-xl font-black text-slate-800">{currentUser?.shop_name || '拍拍購合作店家'}</h2>
                       <button onClick={onNavigateBack} className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md mt-1"><i className="fa-solid fa-rotate mr-1"></i>切換賣場</button>
                   </div>
                </div>
            </div>

            <div className="px-6 pt-12 pb-6 flex-1">
                <h3 className="font-black text-lg text-slate-800 mb-3 border-l-4 border-[#EE4D2D] pl-2">店家資訊</h3>
                <p className="text-blue-600 underline text-sm mb-6"><i className="fa-solid fa-location-dot mr-1"></i>{currentUser?.address || '點擊查看地圖地址'}</p>

                <h3 className="font-black text-lg text-slate-800 mb-3 border-l-4 border-[#EE4D2D] pl-2">注意事項</h3>
                <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                   {/* 預設注意事項，若未來後台有欄位可替換 */}
                   <p>✦ 工作室可攜伴(但勿催促⚠️)</p>
                   <p>✦ 操作時間約 2.5 - 4 小時請保留時間</p>
                   <p>✦ 取消/改期請於 2 天前告知，臨時改期下次預約須先付訂金，無故取消將列入黑名單</p>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100">
               <button onClick={handleNextStep} className="w-full bg-[#EE4D2D] text-white py-4 rounded-xl font-black text-lg shadow-md hover:bg-[#d73211] transition">開始預約</button>
            </div>
          </div>
        )}

        {/* Step 1: 選擇服務 (分類頁籤顯示) */}
        {step === 1 && (
          <div className="animate-fade-in-up bg-white min-h-[80vh]">
            {/* 分類橫向捲軸 */}
            <div className="flex overflow-x-auto no-scrollbar border-b border-slate-100 sticky top-14 bg-white z-30">
              {Object.keys(groupedServices).map((cat, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-6 py-4 font-bold text-sm border-b-2 transition-colors ${activeCategory === cat ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-transparent text-slate-500 hover:text-[#EE4D2D]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
               {/* ★ 修改：只顯示被選中 (activeCategory) 的分類項目 */}
               {groupedServices[activeCategory] && (
                  <div className="mb-8 animate-fade-in">
                     <h3 className="font-black text-lg text-slate-800 mb-3">{activeCategory}</h3>
                     <div className="space-y-3">
                       {groupedServices[activeCategory].map(srv => (
                         <div 
                           key={srv.id} 
                           onClick={() => { setSelectedService(srv); handleNextStep(); }}
                           className={`p-3 bg-white rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${selectedService?.id === srv.id ? 'border-[#EE4D2D] bg-[#FFF4F2]' : 'border-slate-200 hover:border-[#ffbba5]'}`}
                         >
                            {/* ★ 新增：1:1 服務圖片 */}
                            {srv.image_url ? (
                                <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                    <img src={srv.image_url} alt={srv.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                                    <i className="fa-solid fa-image text-xl"></i>
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="font-bold text-slate-800 mb-1">{srv.name}</div>
                                <div className="text-sm text-slate-500 flex items-center gap-3">
                                   <span><i className="fa-regular fa-clock mr-1"></i>{srv.duration_minutes} 小時</span>
                                   <span className="text-[#EE4D2D] font-bold">NT${srv.price.toLocaleString()} 起</span>
                                </div>
                            </div> {/* ★ 關鍵修復：補上這行結尾標籤 */}
                         </div>
                       ))}
                     </div>
                  </div>
               )}
            </div>
          </div>
        )}

        {/* Step 2: 加購項目 */}
        {step === 2 && (
          <div className="animate-fade-in-up bg-white min-h-[80vh] flex flex-col">
            <div className="p-4 flex-1">
              <h3 className="font-black text-lg text-slate-800 mb-4">加購項目 (可不選)</h3>
              
              <div 
                onClick={() => setSelectedAddons([])}
                className={`p-4 rounded-xl border mb-4 flex justify-between items-center cursor-pointer ${selectedAddons.length === 0 ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFF4F2]' : 'border-slate-200 text-slate-700'}`}
              >
                 <span className="font-bold">不加購項目</span>
                 {selectedAddons.length === 0 && <i className="fa-solid fa-check text-xl"></i>}
              </div>

              {/* 顯示該服務設定的加購項目，若無則顯示預設範例 */}
              <div className="space-y-3">
                 {( (selectedService?.addons?.length ? selectedService.addons : [{name: '斷甲補甲(1指)', duration_minutes: 20, price: 50}]) as any[] ).map((addon:any, idx:number) => {
                   const isSelected = selectedAddons.some(a => a.name === addon.name);
                   return (
                     <div 
                       key={idx} 
                       onClick={() => toggleAddon(addon)}
                       className={`p-4 bg-white rounded-xl border flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'border-[#EE4D2D] bg-[#FFF4F2]' : 'border-slate-200'}`}
                     >
                        <div>
                          <div className={`font-bold mb-1 ${isSelected ? 'text-[#EE4D2D]' : 'text-slate-800'}`}>{addon.name}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-3">
                              <span><i className="fa-regular fa-clock mr-1"></i>{addon.duration_minutes} 分鐘</span>
                              <span>NT${addon.price}</span>
                          </div>
                        </div>
                        {isSelected && <i className="fa-solid fa-check-square text-[#EE4D2D] text-xl"></i>}
                     </div>
                   );
                 })}
              </div>
            </div>

            {/* 底部固定 Bar */}
            <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 flex items-center justify-between">
               <div className="text-sm text-slate-500">
                  已選擇 {selectedAddons.length} 項 <br/> 
                  <span className="text-[#EE4D2D] font-bold">附加 NT${selectedAddons.reduce((sum, a) => sum + a.price, 0)}</span>
               </div>
               <button onClick={handleNextStep} className="bg-[#EE4D2D] text-white px-6 py-3 rounded-xl font-black shadow-md hover:bg-[#d73211]">選擇日期和時間 <i className="fa-solid fa-arrow-right ml-2"></i></button>
            </div>
          </div>
        )}

        {/* Step 3: 選擇日期、員工與時間 */}
        {step === 3 && (
          <div className="animate-fade-in-up space-y-4 p-4">
            
            {/* 員工選擇列 (橫向滑動) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <label className="block font-black text-slate-800 mb-3">選擇設計師/服務人員</label>
              <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                <div 
                  onClick={() => setSelectedStaffId('')}
                  className={`shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer ${selectedStaffId === '' ? 'opacity-100' : 'opacity-50 grayscale'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 ${selectedStaffId === '' ? 'border-[#EE4D2D] bg-[#FFF4F2] text-[#EE4D2D]' : 'border-slate-200 bg-slate-100 text-slate-400'}`}><i className="fa-solid fa-users"></i></div>
                  <span className="text-xs font-bold text-slate-700">不指定</span>
                </div>
                {/* ★ 新增：只顯示該服務有綁定的服務人員 (若未設定則預設全顯示，防呆) */}
                {staffList.filter(s => !selectedService?.staff_ids?.length || selectedService.staff_ids.includes(s.id)).map(staff => (
                  <div 
                    key={staff.id} 
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer transition-all ${selectedStaffId === staff.id ? 'opacity-100 scale-105' : 'opacity-60'}`}
                  >
                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${selectedStaffId === staff.id ? 'border-[#EE4D2D]' : 'border-slate-200'}`}>
                      <img src={staff.avatar_url || `https://ui-avatars.com/api/?name=${staff.nickname || staff.name}`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate w-full text-center">{staff.nickname || staff.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 日期選擇 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <label className="block font-black text-slate-800 mb-3">選擇預約日期</label>
              <input 
                type="date" 
                min={new Date().toISOString().split('T')[0]} 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] font-bold text-slate-700"
              />
            </div>

            {/* 時段選擇 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <label className="block font-black text-slate-800 mb-3">選擇空檔時段</label>
              {isCheckingSlots ? (
                <div className="py-6 text-center text-slate-400 font-bold animate-pulse">計算空檔中...</div>
              ) : availableSlots.length === 0 ? (
                 <div className="py-6 text-center text-[#EE4D2D] font-bold bg-[#FFF4F2] rounded-lg">本日為店休或無可預約時段</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-3 rounded-lg text-sm font-bold transition-all border-2 
                        ${!slot.available ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' : 
                          selectedTime === slot.time ? 'bg-[#FFF4F2] border-[#EE4D2D] text-[#EE4D2D] shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-[#ffbba5]'
                        }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              disabled={!selectedTime}
              onClick={handleNextStep} 
              className="w-full py-4 bg-[#EE4D2D] text-white rounded-xl font-black text-lg disabled:opacity-50 mt-4 shadow-md"
            >
              確認時間，下一步
            </button>
          </div>
        )}

        {/* Step 4: 確認與備註 */}
        {step === 4 && (
          <div className="animate-fade-in-up space-y-4 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#ffbba5]">
              <h3 className="font-black text-xl text-slate-800 mb-4 border-b border-slate-100 pb-3">預約明細確認</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold text-sm">預約服務</span>
                  <span className="text-slate-800 font-black">{selectedService?.name}</span>
                </div>
                {selectedAddons.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-bold text-sm">加購項目</span>
                    <div className="text-right">
                       {selectedAddons.map((a, i) => <div key={i} className="text-slate-700 font-bold text-sm">{a.name}</div>)}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold text-sm">服務人員</span>
                  <span className="text-slate-800 font-bold">{selectedStaffId ? staffList.find(s => s.id === selectedStaffId)?.nickname || staffList.find(s => s.id === selectedStaffId)?.name : '由店家安排 (不指定)'}</span>
                </div>
                <div className="flex justify-between items-center bg-[#fdf5f3] p-3 rounded-lg">
                  <span className="text-slate-500 font-bold text-sm">預約時間</span>
                  <span className="text-[#EE4D2D] font-black text-lg">{selectedDate} {selectedTime}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <span className="text-slate-800 font-black">預估總金額</span>
                  <span className="text-[#EE4D2D] font-black text-xl">
                    ${((selectedService?.price || 0) + selectedAddons.reduce((s, a) => s + a.price, 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block font-bold text-slate-700 mb-2 text-sm">備註給設計師 (選填)</label>
                <textarea 
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="有什麼特別需求都可以先在這裡告訴我們哦！"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] resize-none h-24 text-sm bg-slate-50"
                />
              </div>
            </div>

            <button 
              onClick={handleSubmitBooking} 
              className="w-full py-4 bg-[#EE4D2D] text-white rounded-xl font-black text-lg hover:bg-[#d73211] shadow-lg transition"
            >
              確認並送出預約
            </button>
          </div>
        )}
      </div>
    </div>
  );
}