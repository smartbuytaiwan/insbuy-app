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

  // ★ 升級：將流程步驟與網址的 URL Parameter 綁定，完美支援瀏覽器「上一頁」按鈕！
  const getStepFromUrl = (): 0 | 1 | 2 | 3 | 4 => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = parseInt(params.get('step') || '0', 10);
    return (isNaN(stepParam) || stepParam < 0 || stepParam > 4) ? 0 : (stepParam as any);
  };

  const [step, setStepState] = useState<0 | 1 | 2 | 3 | 4>(getStepFromUrl());

  // 監聽網址變化 (當使用者按下瀏覽器的上一頁時觸發)
  useEffect(() => {
    const handlePopState = () => {
      setStepState(getStepFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 覆寫 setStep 函數，讓它同時改變狀態並推入歷史紀錄
  const setStep = (newStepOrUpdater: any) => {
    const nextStep = typeof newStepOrUpdater === 'function' ? newStepOrUpdater(step) : newStepOrUpdater;
    setStepState(nextStep);
    
    // 將新的步驟寫入網址，推入歷史紀錄
    const url = new URL(window.location.href);
    if (nextStep === 0) {
       url.searchParams.delete('step');
    } else {
       url.searchParams.set('step', nextStep.toString());
    }
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // ★ 新增：Step 4 結帳與折抵相關狀態
  const [useCoupon, setUseCoupon] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('PAY_ON_SITE');
  
  // ★ 買家資產狀態 (票券與儲值金)
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');

  const [availableSlots, setAvailableSlots] = useState<{time: string, available: boolean}[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);
  
  // ★ 新增：首頁方案購買狀態
  const [plans, setPlans] = useState<any[]>([]);
  const [purchasingPlan, setPurchasingPlan] = useState<any>(null);

  // 1. 抓取使用者資產 (票券與錢包)
  useEffect(() => {
    if (currentUser?.id) {
       const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';
       fetch(`${API_URL}/booking/vouchers/buyer/${currentUser.id}`).then(r => r.json()).then(res => setUserVouchers(res || [])).catch(()=>{});
       fetch(`${API_URL}/booking/wallet/buyer/${currentUser.id}`).then(r => r.json()).then(res => setWalletBalance(res?.total_balance || 0)).catch(()=>{});
    }
  }, [currentUser]);

  // 2. 初始化載入
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [srvRes, stfRes, storeRes, planRes] = await Promise.all([
          BookingAPI.getServices(shopId),
          BookingAPI.getStaff(shopId),
          // ★ 修正：直接用 fetch 呼叫 API，解決前台抓不到資料的問題
          fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/settings/${shopId}`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
          // ★ 抓取上架的方案 (若API未實作則從 localStorage 讀取備用)
          fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/voucher-plans/${shopId}`).then(r => r.ok ? r.json() : []).catch(() => {
              const local = localStorage.getItem(`insbuy_voucher_plans_${shopId}`);
              return local ? JSON.parse(local) : [];
          })
        ]);
        setServices(srvRes || []);
        setStaffList(stfRes || []);
        setStoreInfo(storeRes || {});
        setPlans((planRes || []).filter((p: any) => p.is_active));
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
      
      // ★ 核心升級：為了支援「跨夜排班」(例如營業到凌晨2點)，我們直接抓取所有預約單在前端精準運算
      const allBookings = await BookingAPI.getBookings(shopId) || [];
      const settingsRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/settings/${shopId}`);
      const storeSetting = settingsRes.ok ? await settingsRes.json() : null;

      const finalMinutesNeeded = (selectedService?.duration_minutes || 0) + (selectedService?.buffer_minutes || 0) + addOnMinutes; 

      const slots: {time: string, available: boolean}[] = [];
      const targetDateObj = new Date(selectedDate);
      
      // 取得「前一天」的日期字串 (用來檢查是否有跨夜營業延續到今天)
      const prevDateObj = new Date(targetDateObj);
      prevDateObj.setDate(prevDateObj.getDate() - 1);
      const prevDateStr = prevDateObj.toISOString().split('T')[0];

      const getShopSchedule = (dateStr: string) => {
          const d = new Date(dateStr);
          let sch = { isOpen: true, open: storeSetting?.default_open_time || '10:00', close: storeSetting?.default_close_time || '21:00', breakStart: '', breakEnd: '', slot_interval: 30, disabled_slots: [] as string[] };
          if (storeSetting?.weekly_schedule?.[d.getDay()]) sch = { ...sch, ...storeSetting.weekly_schedule[d.getDay()] };
          if (storeSetting?.special_dates?.[dateStr]) sch = { ...sch, ...storeSetting.special_dates[dateStr] };
          if (storeSetting?.closed_dates?.includes(dateStr)) sch.isOpen = false;
          return sch;
      };

      const currShop = getShopSchedule(selectedDate);
      const prevShop = getShopSchedule(prevDateStr);

      const interval = currShop.slot_interval || prevShop.slot_interval || 30;
      const now = new Date();

      // 我們只需要產生 selectedDate 當天的 00:00 ~ 23:59 時段
      let currentSlotObj = new Date(`${selectedDate}T00:00:00`);
      const endOfDayObj = new Date(`${selectedDate}T23:59:59`);

      while (currentSlotObj <= endOfDayObj) {
         const slotStart = currentSlotObj.getTime();
         const slotEnd = slotStart + finalMinutesNeeded * 60000; 
         const h = currentSlotObj.getHours().toString().padStart(2, '0');
         const m = currentSlotObj.getMinutes().toString().padStart(2, '0');
         const timeStr = `${h}:${m}`;
         
         let isAvailable = false;
         let sourceSchedule = null;

         // 1. 檢查店家是否有營業？
         // 情況 A：前一天跨夜營業延續到今天凌晨 (例如 00:00 ~ 02:00)
         if (prevShop.isOpen && prevShop.close < prevShop.open && timeStr < prevShop.close) {
             isAvailable = true; sourceSchedule = prevShop;
         } 
         // 情況 B：今天的正常營業時段
         else if (currShop.isOpen) {
             if (currShop.close < currShop.open) { // 今天會跨夜到明天，所以今天可以一路排到 23:59
                 if (timeStr >= currShop.open) { isAvailable = true; sourceSchedule = currShop; }
             } else { // 正常營業時間 (例如 10:00 ~ 21:00)
                 if (timeStr >= currShop.open && timeStr < currShop.close) { isAvailable = true; sourceSchedule = currShop; }
             }
         }

         if (isAvailable && sourceSchedule) {
             // 檢查休息時間
             if (sourceSchedule.breakStart && sourceSchedule.breakEnd) {
                 const breakStartMs = new Date(`${selectedDate}T${sourceSchedule.breakStart}:00`).getTime();
                 let breakEndMs = new Date(`${selectedDate}T${sourceSchedule.breakEnd}:00`).getTime();
                 if (sourceSchedule.breakEnd < sourceSchedule.breakStart) breakEndMs += 86400000;
                 
                 if ((slotStart >= breakStartMs && slotStart < breakEndMs) || 
                     (slotEnd > breakStartMs && slotEnd <= breakEndMs) || 
                     (slotStart <= breakStartMs && slotEnd >= breakEndMs)) {
                     isAvailable = false;
                 }
             }

             // 檢查店家手動關閉
             if (sourceSchedule.disabled_slots?.includes(timeStr)) isAvailable = false;

             // 檢查服務限定時段
             if (selectedService?.allowed_times && selectedService.allowed_times.length > 0) {
                 if (!selectedService.allowed_times.includes(timeStr)) isAvailable = false;
             }

             // 檢查是否已過期 (過去時間不能預約)
             let endLimitMs = new Date(`${selectedDate}T${sourceSchedule.close}:00`).getTime();
             if (sourceSchedule === currShop && currShop.close < currShop.open) endLimitMs += 86400000;
             if (slotStart < now.getTime() || slotEnd > endLimitMs) isAvailable = false;
         }

         // 2. 檢查是否有員工上班？
         const getStaffShift = (staff: any, dStr: string) => {
             if (staff.leave_records?.some((l:any) => l.date === dStr)) return null;
             const shiftId = staff.shift_assignments?.[dStr];
             return staff.shifts?.find((s:any) => s.id === shiftId) || null;
         };

         let coveringStaffCount = 0;
         if (isAvailable) {
             staffList.forEach(staff => {
                 if (selectedService?.staff_ids?.length && !selectedService.staff_ids.includes(staff.id)) return;
                 
                 let staffWorksThisSlot = false;
                 let shiftEndLimitMs = 0;

                 // 檢查前一天跨夜班
                 const pShift = getStaffShift(staff, prevDateStr);
                 if (pShift && pShift.end_time < pShift.start_time && timeStr < pShift.end_time) {
                     staffWorksThisSlot = true;
                     shiftEndLimitMs = new Date(`${selectedDate}T${pShift.end_time}:00`).getTime();
                 }
                 
                 // 檢查今天的班
                 const cShift = getStaffShift(staff, selectedDate);
                 if (cShift && !staffWorksThisSlot) { // 若沒被前一天的跨夜班涵蓋
                     if (cShift.end_time < cShift.start_time && timeStr >= cShift.start_time) {
                         staffWorksThisSlot = true;
                         shiftEndLimitMs = new Date(`${selectedDate}T${cShift.end_time}:00`).getTime() + 86400000;
                     }
                     else if (cShift.start_time <= cShift.end_time && timeStr >= cShift.start_time && timeStr < cShift.end_time) {
                         staffWorksThisSlot = true;
                         shiftEndLimitMs = new Date(`${selectedDate}T${cShift.end_time}:00`).getTime();
                     }
                 }

                 // 如果員工有涵蓋此時段，檢查「施作完畢時間」是否超過員工下班時間
                 if (staffWorksThisSlot && slotEnd <= shiftEndLimitMs) {
                     coveringStaffCount++;
                     if (selectedStaffId === staff.id) coveringStaffCount = 999; 
                 }
             });

             if (selectedStaffId && coveringStaffCount < 999) isAvailable = false;
             if (!selectedStaffId && coveringStaffCount === 0) isAvailable = false;
         }

         // 3. 檢查現有預約單防撞期
         if (isAvailable) {
             const overlaps = allBookings.filter((b: any) => {
                 const bStart = new Date(b.start_time).getTime();
                 const bEnd = new Date(b.end_time).getTime();
                 return slotStart < bEnd && slotEnd > bStart && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW';
             });

             if (selectedStaffId) {
                 const staffOverlaps = overlaps.filter((b: any) => b.staff_id === selectedStaffId).length;
                 if (staffOverlaps > 0) isAvailable = false;
             } else {
                 // 計算「可用且未被預約」的員工數
                 const availableCoveringStaff = staffList.filter(staff => {
                     if (selectedService?.staff_ids?.length && !selectedService.staff_ids.includes(staff.id)) return false;
                     
                     let shiftEndLimitMs = 0;
                     const pShift = getStaffShift(staff, prevDateStr);
                     const cShift = getStaffShift(staff, selectedDate);
                     if (pShift && pShift.end_time < pShift.start_time && timeStr < pShift.end_time) {
                         shiftEndLimitMs = new Date(`${selectedDate}T${pShift.end_time}:00`).getTime();
                     } else if (cShift) {
                         if (cShift.end_time < cShift.start_time && timeStr >= cShift.start_time) shiftEndLimitMs = new Date(`${selectedDate}T${cShift.end_time}:00`).getTime() + 86400000;
                         else if (cShift.start_time <= cShift.end_time && timeStr >= cShift.start_time && timeStr < cShift.end_time) shiftEndLimitMs = new Date(`${selectedDate}T${cShift.end_time}:00`).getTime();
                     }
                     
                     if (shiftEndLimitMs === 0 || slotEnd > shiftEndLimitMs) return false;
                     return !overlaps.some((b:any) => b.staff_id === staff.id); // 此員工沒有被預約
                 });
                 
                 if (availableCoveringStaff.length === 0) isAvailable = false;
             }
         }

         if (isAvailable || sourceSchedule) { 
             if (sourceSchedule) slots.push({ time: timeStr, available: isAvailable });
         }

         currentSlotObj = new Date(currentSlotObj.getTime() + interval * 60000);
      }
      
      // 確保陣列唯一，避免極端設定導致重複推入
      const uniqueSlots = Array.from(new Map(slots.map(item => [item.time, item])).values());
      setAvailableSlots(uniqueSlots);

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
    if (step === 3 && selectedService) {
       const allowed = selectedService.allowed_payment_methods || ['PAY_ON_SITE', 'FULL', 'VOUCHER', 'WALLET'];
       if (!allowed.includes(paymentMethod) && allowed.length > 0) {
           setPaymentMethod(allowed[0]); 
       }
    }
    setStep((prev: number) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    // ★ 修正：當按下上一步時，不是用 pushState，而是直接呼叫瀏覽器的回退，
    // 這樣才能真正消除歷史紀錄的堆疊，不會讓客人按不出去！
    if (step > 0) {
       window.history.back();
    }
  };

  const toggleAddon = (addon: any) => {
    setSelectedAddons(prev => 
      prev.some(a => a.name === addon.name) 
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    );
  };

  // ★ 新增：處理客人購買方案
  const handlePurchasePlan = (plan: any) => {
      if (!currentUser) {
          alert('請先登入會員才能購買優惠方案！');
          onNavigate('AUTH');
          return;
      }
      setPurchasingPlan(plan);
  };

  const confirmPurchase = () => {
      alert(`🎉 成功購買「${purchasingPlan.name}」！\n系統已為您自動生成專屬票券/儲值金並存入您的帳戶中。`);
      if (purchasingPlan.type === 'WALLET') {
          setWalletBalance(prev => prev + purchasingPlan.value);
      } else {
          fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/vouchers/buyer/${currentUser.id}`).then(r => r.json()).then(res => setUserVouchers(res || [])).catch(()=>{});
      }
      setPurchasingPlan(null);
  };

  const handleSubmitBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return alert('預約資訊不完整！');

    try {
      const [hh, mm] = selectedTime.split(':');
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(hh), parseInt(mm), 0, 0);
      
      const addOnMinutes = selectedAddons.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
      const totalMinutes = selectedService.duration_minutes + selectedService.buffer_minutes + addOnMinutes;
      const endTime = new Date(startTime.getTime() + totalMinutes * 60000);
      const slotStartMs = startTime.getTime();
      const slotEndMs = endTime.getTime();

      // ★ 核心修復：自動派單演算法 (嚴格過濾該時段「真正在上班」且「沒被預約」的員工)
      let finalStaffId = selectedStaffId;
      
      if (!finalStaffId) {
         const allBookings = await BookingAPI.getBookings(shopId) || [];
         
         const availableStaff = staffList.filter(staff => {
             // 1. 檢查服務是否有綁定此員工
             if (selectedService?.staff_ids?.length && !selectedService.staff_ids.includes(staff.id)) return false;
             // 2. 檢查是否請假
             if (staff.leave_records?.some(l => l.date === selectedDate)) return false;
             
             const shiftId = staff.shift_assignments?.[selectedDate];
             const shift = staff.shifts?.find(sh => sh.id === shiftId);
             
             // 3. 檢查班表是否涵蓋此時段 (支援跨夜班檢查)
             let shiftEndLimitMs = 0;
             const prevDateObj = new Date(startTime); prevDateObj.setDate(prevDateObj.getDate() - 1);
             const pShiftId = staff.shift_assignments?.[prevDateObj.toISOString().split('T')[0]];
             const pShift = staff.shifts?.find(sh => sh.id === pShiftId);
             const timeStr = `${hh}:${mm}`;

             if (pShift && pShift.end_time < pShift.start_time && timeStr < pShift.end_time) {
                 shiftEndLimitMs = new Date(`${selectedDate}T${pShift.end_time}:00`).getTime();
             } else if (shift) {
                 if (shift.end_time < shift.start_time && timeStr >= shift.start_time) shiftEndLimitMs = new Date(`${selectedDate}T${shift.end_time}:00`).getTime() + 86400000;
                 else if (shift.start_time <= shift.end_time && timeStr >= shift.start_time && timeStr < shift.end_time) shiftEndLimitMs = new Date(`${selectedDate}T${shift.end_time}:00`).getTime();
             }
             if (shiftEndLimitMs === 0 || slotEndMs > shiftEndLimitMs) return false; // 下班前做不完

             // 4. 檢查此員工這時段是否有其他預約
             const isBusy = allBookings.some((b:any) => {
                 if (b.staff_id !== staff.id || ['CANCELLED', 'NO_SHOW'].includes(b.status)) return false;
                 return slotStartMs < new Date(b.end_time).getTime() && slotEndMs > new Date(b.start_time).getTime();
             });
             return !isBusy;
         });
         
         if (availableStaff.length > 0) {
             const rule = storeInfo?.auto_assign_rule || 'LEAST_BOOKINGS';
             if (rule === 'PRIORITY' && storeInfo?.priority_staff_id && availableStaff.find(s => s.id === storeInfo.priority_staff_id)) {
                 finalStaffId = storeInfo.priority_staff_id;
             } else {
                 const targetDateBookings = allBookings.filter((b: any) => b.start_time.startsWith(selectedDate));
                 const staffStats = availableStaff.map(staff => {
                     return { id: staff.id, count: targetDateBookings.filter((b: any) => b.staff_id === staff.id).length };
                 });
                 staffStats.sort((a, b) => a.count - b.count);
                 finalStaffId = staffStats[0].id;
             }
         } else {
             return alert('抱歉，該時段的服務人員已被預約滿了，請重新選擇時段！');
         }
      }

      const addOnNames = selectedAddons.map(a => a.name).join('、');
      const finalMemo = `${memo}\n${addOnNames ? `[加購項目: ${addOnNames}]` : ''}`.trim();
      const totalAmount = (selectedService.price || 0) + selectedAddons.reduce((s, a) => s + a.price, 0);

      // ★ 驗證票券與儲值金
      if (paymentMethod === 'VOUCHER' && !selectedVoucherId) return alert('請選擇要使用的票券！');
      if (paymentMethod === 'WALLET' && walletBalance < totalAmount) return alert('儲值金餘額不足，請先點擊儲值！');

      let finalDepositStatus = 'UNPAID'; 
      if (paymentMethod === 'FULL' || paymentMethod === 'DEPOSIT' || paymentMethod === 'VOUCHER' || paymentMethod === 'WALLET') {
          finalDepositStatus = 'PAID'; 
      }

      await BookingAPI.createBooking({
        shop_id: shopId,
        buyer_id: currentUser.id,
        buyer_name: currentUser.name || '未提供姓名',
        buyer_phone: currentUser.phone || '未提供電話',
        buyer_email: currentUser.email || '',
        service_name: selectedService.name,
        staff_id: finalStaffId || undefined,
        service_id: selectedService.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        memo: finalMemo,
        status: 'PENDING',
        deposit_status: finalDepositStatus as any,
        payment_method: paymentMethod as any, // ★ 加上 as any 解決 TS 報錯
        payable_amount: totalAmount,
        used_wallet_amount: paymentMethod === 'WALLET' ? totalAmount : 0,
        used_coupon_id: useCoupon ? 'dummy_coupon' : undefined,
        used_voucher_id: paymentMethod === 'VOUCHER' ? selectedVoucherId : undefined
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
          <div className="bg-white min-h-[80vh] animate-fade-in flex flex-col relative">
            
            {/* ★ 新增：購買確認彈跳視窗 */}
            {purchasingPlan && (
               <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
                     <h3 className="font-black text-xl text-slate-800 mb-4 border-b border-slate-100 pb-3">確認購買方案</h3>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <div className="text-sm font-bold text-slate-500 mb-1">{purchasingPlan.type === 'VOUCHER' ? '服務套券' : '儲值金'}</div>
                        <div className="font-black text-lg text-slate-800 mb-2">{purchasingPlan.name}</div>
                        <div className="flex justify-between items-center text-slate-700">
                           <span>應付總額</span>
                           <span className="text-2xl font-black text-[#EE4D2D]">${purchasingPlan.price.toLocaleString()}</span>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <button onClick={confirmPurchase} className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-black shadow-md">確認付款</button>
                        <button onClick={() => setPurchasingPlan(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">取消</button>
                     </div>
                  </div>
               </div>
            )}

            {/* Banner & Logo 區塊 */}
            <div className="relative h-48 bg-[#fdf5f3] flex items-center justify-center border-b border-orange-100 overflow-visible">
                {storeInfo?.storefront_banner ? (
                   <img src={storeInfo.storefront_banner} className="w-full h-full object-cover opacity-90" />
                ) : (
                   <h1 className="text-5xl font-serif text-[#d7a195] tracking-widest opacity-60">
                     {(storeInfo?.storefront_name || currentUser?.shop_name || '品牌').substring(0,2)}
                   </h1>
                )}
                
                <div className="absolute -bottom-8 left-6 flex items-end gap-4 z-10">
                   <div className="w-20 h-20 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center p-1 overflow-hidden shrink-0">
                       {/* ★ 新增：大頭照渲染邏輯 */}
                       {storeInfo?.storefront_avatar ? (
                          <img src={storeInfo.storefront_avatar} className="w-full h-full object-cover rounded-full" />
                       ) : (
                          <div className="w-full h-full bg-[#FFF4F2] rounded-full flex items-center justify-center text-[#EE4D2D] font-black text-2xl">
                             {(storeInfo?.storefront_name || currentUser?.shop_name || '店').substring(0,1)}
                          </div>
                       )}
                   </div>
                   <div className="pb-2 bg-white/80 px-3 py-1 rounded-xl backdrop-blur-sm border border-white/50">
                       <h2 className="text-xl font-black text-slate-800">{storeInfo?.storefront_name || currentUser?.shop_name || '拍拍購合作店家'}</h2>
                       <button onClick={onNavigateBack} className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 hover:bg-slate-200"><i className="fa-solid fa-rotate mr-1"></i>切換賣場</button>
                   </div>
                </div>
            </div>

            <div className="px-6 pt-14 pb-6 flex-1 space-y-8">
                
                {/* ★ 新增：動態顯示店家資訊與注意事項 */}
                <div>
                   <h3 className="font-black text-lg text-slate-800 mb-3 border-l-4 border-[#EE4D2D] pl-2">店家資訊</h3>
                   <p className="text-blue-600 font-bold text-sm hover:underline cursor-pointer"><i className="fa-solid fa-location-dot mr-1.5 text-[#EE4D2D]"></i>{storeInfo?.storefront_address || currentUser?.address || '實體店面地址未提供'}</p>
                </div>

                <div>
                   <h3 className="font-black text-lg text-slate-800 mb-3 border-l-4 border-[#EE4D2D] pl-2">注意事項</h3>
                   <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                      {storeInfo?.storefront_notices || '✦ 預約前請先詳閱相關規定\n✦ 無故取消將列入黑名單'}
                   </div>
                </div>

                {/* ★ 新增：超值方案購買區塊 */}
                {plans.length > 0 && (
                   <div>
                      <h3 className="font-black text-lg text-slate-800 mb-4 border-l-4 border-purple-500 pl-2">超值票券與儲值</h3>
                      <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
                         {plans.map(plan => (
                            <div key={plan.id} className="w-64 shrink-0 bg-white border border-purple-100 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col">
                               <div className={`absolute top-0 right-0 text-[10px] text-white font-black px-3 py-1 rounded-bl-xl ${plan.type === 'VOUCHER' ? 'bg-purple-500' : 'bg-orange-500'}`}>
                                  {plan.type === 'VOUCHER' ? '服務套券' : '現金儲值'}
                               </div>
                               <h4 className="font-black text-slate-800 text-lg mb-1 pr-12 line-clamp-1">{plan.name}</h4>
                               <div className="text-2xl font-black text-[#EE4D2D] mb-3">${plan.price.toLocaleString()}</div>
                               <div className="text-xs text-slate-500 mb-4 flex-1">
                                  <p><i className="fa-solid fa-check text-green-500 mr-1"></i>內含: {plan.type === 'VOUCHER' ? `${plan.value} 次額度` : `$${plan.value} 購物金`}</p>
                                  <p><i className="fa-solid fa-check text-green-500 mr-1"></i>期限: {plan.expire_days ? `${plan.expire_days} 天內` : '無期限'}</p>
                               </div>
                               <button onClick={() => handlePurchasePlan(plan)} className="w-full py-2 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-200 rounded-xl font-bold transition">立即購買</button>
                            </div>
                         ))}
                      </div>
                   </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 sticky bottom-0 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-20">
               <button onClick={handleNextStep} className="w-full bg-[#EE4D2D] text-white py-4 rounded-xl font-black text-lg shadow-md hover:bg-[#d73211] transition flex items-center justify-center gap-2">
                 進入線上預約 <i className="fa-solid fa-arrow-right"></i>
               </button>
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
                                   <span><i className="fa-regular fa-clock mr-1"></i>{srv.duration_minutes} 分鐘</span>
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
                {/* ★ 需求 2：只顯示「選定日期有排班、沒請假，且符合該服務綁定」的服務人員 */}
                {staffList.filter(s => {
                   if (selectedService?.staff_ids?.length && !selectedService.staff_ids.includes(s.id)) return false;
                   if (s.leave_records?.some(l => l.date === selectedDate)) return false;
                   return !!s.shift_assignments?.[selectedDate];
                }).map(staff => (
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
              <div className="flex gap-2">
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  value={selectedDate}
                  onChange={e => {
                     if(e.target.value) {
                         setSelectedDate(e.target.value);
                         setSelectedStaffId(''); 
                     }
                  }}
                  className="flex-1 p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] font-bold text-slate-700 bg-white cursor-pointer transition hover:border-[#ffbba5]"
                />
                <div className="shrink-0 flex items-center justify-center px-4 bg-[#FFF4F2] border-2 border-[#ffbba5] text-[#EE4D2D] font-black rounded-xl text-lg shadow-sm">
                  ({['日', '一', '二', '三', '四', '五', '六'][new Date(selectedDate).getDay()]})
                </div>
              </div>
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

            {/* ★ 新增 5-1【優惠與折抵區塊】 */}
            {/* ★ 5-1【優惠與折扣區塊】 (移除儲值金/票券，僅保留優惠券) */}
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mt-4">
              <h3 className="font-black text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">使用優惠</h3>
              <div 
                className="flex justify-between items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-orange-50 transition"
                onClick={() => setUseCoupon(!useCoupon)}
              >
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-ticket text-[#EE4D2D] text-lg"></i>
                  <div>
                    <div className="font-bold text-slate-700 text-sm">使用優惠券 (Coupon)</div>
                    <div className="text-xs text-slate-400">點擊選擇可用優惠券</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${useCoupon ? 'bg-[#EE4D2D] border-[#EE4D2D]' : 'border-slate-300'}`}>
                  {useCoupon && <i className="fa-solid fa-check text-white text-xs"></i>}
                </div>
              </div>
            </div>

            {/* ★ 5-2【付款方式區塊】 (整合票券與儲值金扣抵功能) */}
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mt-4 mb-6">
              <h3 className="font-black text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">付款方式</h3>
              
              <div className="space-y-3">
                {/* 現場付款 */}
                {(!selectedService?.allowed_payment_methods || selectedService.allowed_payment_methods.includes('PAY_ON_SITE')) && (
                  <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${paymentMethod === 'PAY_ON_SITE' ? 'border-[#EE4D2D] bg-[#FFF4F2]' : 'border-slate-200'}`}>
                    <input type="radio" name="payment" value="PAY_ON_SITE" checked={paymentMethod === 'PAY_ON_SITE'} onChange={() => setPaymentMethod('PAY_ON_SITE')} className="w-4 h-4 accent-[#EE4D2D]" />
                    <span className="font-bold text-slate-700 text-sm">現場付款</span>
                  </label>
                )}

                {/* 線上全額 */}
                {(!selectedService?.allowed_payment_methods || selectedService.allowed_payment_methods.includes('FULL')) && (
                  <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${paymentMethod === 'FULL' ? 'border-[#EE4D2D] bg-[#FFF4F2]' : 'border-slate-200'}`}>
                    <input type="radio" name="payment" value="FULL" checked={paymentMethod === 'FULL'} onChange={() => setPaymentMethod('FULL')} className="w-4 h-4 accent-[#EE4D2D]" />
                    <span className="font-bold text-slate-700 text-sm">直接全額結帳 (線上刷卡/轉帳)</span>
                  </label>
                )}

                {/* 定金 */}
                {selectedService?.requires_deposit && (
                  <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${paymentMethod === 'DEPOSIT' ? 'border-[#EE4D2D] bg-[#FFF4F2]' : 'border-slate-200'}`}>
                    <input type="radio" name="payment" value="DEPOSIT" checked={paymentMethod === 'DEPOSIT'} onChange={() => setPaymentMethod('DEPOSIT')} className="w-4 h-4 accent-[#EE4D2D]" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-700 text-sm">支付訂金 (線上刷卡/轉帳)</div>
                      <div className="text-xs text-[#EE4D2D] mt-1">需先支付 ${selectedService?.deposit_amount || 0} 確保預約保留</div>
                    </div>
                  </label>
                )}

                {/* 票券付款 */}
                {(!selectedService?.allowed_payment_methods || selectedService.allowed_payment_methods.includes('VOUCHER')) && (
                <div className={`border rounded-xl transition ${paymentMethod === 'VOUCHER' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'}`}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer">
                    <input type="radio" name="payment" value="VOUCHER" checked={paymentMethod === 'VOUCHER'} onChange={() => setPaymentMethod('VOUCHER')} className="w-4 h-4 accent-purple-600" />
                    <div className="flex-1">
                       <span className="font-bold text-slate-700 text-sm">預約票券折抵</span>
                    </div>
                  </label>
                  {paymentMethod === 'VOUCHER' && (
                     <div className="px-4 pb-4 pt-1 animate-fade-in">
                        <select value={selectedVoucherId} onChange={e => setSelectedVoucherId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-purple-500 bg-white">
                           <option value="" disabled hidden>請選擇可用的票券...</option>
                           {userVouchers.filter(v => (v.service_id === selectedService?.id || !v.service_id) && v.remaining_count > 0).map(v => (
                              <option key={v.id} value={v.id}>票券代碼: {v.code} (剩餘 {v.remaining_count} 次)</option>
                           ))}
                        </select>
                        {userVouchers.filter(v => (v.service_id === selectedService?.id || !v.service_id) && v.remaining_count > 0).length === 0 && (
                           <div className="text-xs text-red-500 mt-2"><i className="fa-solid fa-circle-exclamation mr-1"></i>您的帳戶中目前沒有適用於此服務的票券。</div>
                        )}
                     </div>
                  )}
                </div>
                )}

                {/* 儲值金付款 */}
                {(!selectedService?.allowed_payment_methods || selectedService.allowed_payment_methods.includes('WALLET')) && (
                <div className={`border rounded-xl transition ${paymentMethod === 'WALLET' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer">
                    <input type="radio" name="payment" value="WALLET" checked={paymentMethod === 'WALLET'} onChange={() => setPaymentMethod('WALLET')} className="w-4 h-4 accent-orange-500" />
                    <div className="flex-1 flex justify-between items-center">
                       <span className="font-bold text-slate-700 text-sm">儲值金錢包扣抵</span>
                       <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">餘額: ${walletBalance.toLocaleString()}</span>
                    </div>
                  </label>
                  {paymentMethod === 'WALLET' && (
                     <div className="px-4 pb-4 pt-1 animate-fade-in">
                        {walletBalance >= ((selectedService?.price || 0) + selectedAddons.reduce((s, a) => s + a.price, 0)) ? (
                           <div className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded border border-green-100"><i className="fa-solid fa-check-circle mr-1"></i>餘額充足，將直接全額扣抵</div>
                        ) : (
                           <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100 flex items-center justify-between">
                              <span><i className="fa-solid fa-triangle-exclamation mr-1"></i>餘額不足，請先購買儲值方案</span>
                              <button onClick={() => {
                                  const walletPlans = plans.filter(p => p.type === 'WALLET');
                                  if(walletPlans.length > 0) setPurchasingPlan(walletPlans[0]);
                                  else alert('商家目前無開放儲值方案');
                              }} className="bg-orange-500 text-white px-3 py-1.5 rounded shadow-sm hover:bg-orange-600 font-bold">點此儲值</button>
                           </div>
                        )}
                     </div>
                  )}
                </div>
                )}

              
                
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