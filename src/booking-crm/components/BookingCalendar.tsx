import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Booking, Service, Staff } from '../types';
import { BookingAPI } from '../api';

const getLocalDateString = (d: Date) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

export default function BookingCalendar({ shopId }: { shopId: string }) {
  const todayDate = new Date();
  
  const [viewMode, setViewMode] = useState<'TODAY' | 'TOMORROW' | 'DAY_AFTER' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'HISTORY'>('TODAY');
  const [dateRange, setDateRange] = useState({ 
    start: getLocalDateString(todayDate), 
    end: getLocalDateString(todayDate) 
  });
  
  const [hideOffTime, setHideOffTime] = useState(false); 
  const [dayDisplayMode, setDayDisplayMode] = useState<'CHART' | 'DETAIL'>('CHART'); 
  const statusMap: any = { PENDING: '待確認', CONFIRMED: '已確認', COMPLETED: '已完成', CANCELLED: '已取消', NO_SHOW: '爽約' }; 
  
  const [bookingFilter, setBookingFilter] = useState<'ACTIVE' | 'HISTORY' | 'CANCELLED'>('ACTIVE');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [storeSetting, setStoreSetting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ service_id: '', staff_id: '', date: getLocalDateString(todayDate), time: '12:00', buyer_name: '', phone: '', memo: '' });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    BookingAPI.getServices(shopId).then(res => setServices(res || [])).catch(() => {});
    BookingAPI.getStaff(shopId).then(res => setStaffList(res || [])).catch(() => {});
    BookingAPI.getStoreSettings(shopId).then(res => setStoreSetting(res || null)).catch(() => {});
  }, [shopId]);

  useEffect(() => { fetchBookings(); }, [shopId, dateRange]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const data = await BookingAPI.getBookings(shopId);
      const s = new Date(dateRange.start).setHours(0,0,0,0);
      const e = new Date(dateRange.end).setHours(23,59,59,999);
      const filtered = (data || []).filter(b => {
        const t = new Date(b.start_time).getTime();
        return t >= s && t <= e;
      });
      setBookings(filtered);
    } catch (e) { console.error('獲取預約失敗', e); } 
    finally { setIsLoading(false); }
  };

  const handleViewModeChange = (mode: typeof viewMode) => {
    setViewMode(mode);
    const today = new Date();
    if (mode === 'TODAY') {
      setDateRange({ start: getLocalDateString(today), end: getLocalDateString(today) });
    } else if (mode === 'TOMORROW') {
      const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
      setDateRange({ start: getLocalDateString(tmr), end: getLocalDateString(tmr) });
    } else if (mode === 'DAY_AFTER') {
      const da = new Date(today); da.setDate(da.getDate() + 2);
      setDateRange({ start: getLocalDateString(da), end: getLocalDateString(da) });
    } else if (mode === 'WEEK') {
      const first = new Date(today); first.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      const last = new Date(first); last.setDate(first.getDate() + 6);
      setDateRange({ start: getLocalDateString(first), end: getLocalDateString(last) });
    } else if (mode === 'MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateRange({ start: getLocalDateString(first), end: getLocalDateString(last) });
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.service_id || !addForm.buyer_name) return alert('請填寫完整資訊！');
    try {
      const srv = services.find(s => s.id === addForm.service_id);
      const totalMinutes = srv ? (srv.duration_minutes + srv.buffer_minutes) : 60;
      const [hh, mm] = addForm.time.split(':');
      const startTime = new Date(addForm.date);
      startTime.setHours(parseInt(hh), parseInt(mm), 0, 0);
      const endTime = new Date(startTime.getTime() + totalMinutes * 60000);

      const newB = await BookingAPI.createBooking({
        shop_id: shopId, buyer_id: `${addForm.buyer_name} (手動)`, staff_id: addForm.staff_id || undefined,
        service_id: addForm.service_id, start_time: startTime.toISOString(), end_time: endTime.toISOString(),
        memo: addForm.memo, status: 'CONFIRMED', deposit_status: 'PAID'
      });
      setBookings([...bookings, newB]);
      setShowAddModal(false); alert('建單成功！');
    } catch (e) { alert('建單失敗'); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await BookingAPI.updateBookingStatus(id, newStatus);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus as any } : b));
    } catch (e) { alert('更新失敗'); }
  };

  const filteredBookings = useMemo(() => {
      return bookings.filter(b => {
          if (bookingFilter === 'ACTIVE') return ['PENDING', 'CONFIRMED'].includes(b.status);
          if (bookingFilter === 'HISTORY') return ['COMPLETED'].includes(b.status);
          if (bookingFilter === 'CANCELLED') return ['CANCELLED', 'NO_SHOW'].includes(b.status);
          return true;
      });
  }, [bookings, bookingFilter]);

  const isSingleDay = dateRange.start === dateRange.end;

  const singleDayTotalAmount = useMemo(() => {
      return filteredBookings.reduce((sum, b) => sum + (b.payable_amount || 0), 0);
  }, [filteredBookings]);

  const calendarDays = useMemo(() => {
    if (isSingleDay) return [];
    const days = [];
    let curr = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (viewMode === 'MONTH') {
      const firstDayOfWeek = curr.getDay() === 0 ? 6 : curr.getDay() - 1; 
      for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    }

    while (curr <= end) {
      const dateStr = getLocalDateString(curr);
      const dayBookings = filteredBookings.filter(b => b.start_time.startsWith(dateStr));
      const dayAmount = dayBookings.reduce((sum, b) => sum + (b.payable_amount || 0), 0);
      days.push({ date: dateStr, dayNum: curr.getDate(), bookings: dayBookings, dayAmount });
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [dateRange, filteredBookings, isSingleDay, viewMode]);

  return (
    <div className="space-y-4 animate-fade-in w-full max-w-full overflow-hidden">
      
      <div className="flex gap-2 mb-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
        {[
          { id: 'ACTIVE', label: '預約排程', icon: 'fa-calendar-check' },
          { id: 'HISTORY', label: '歷史紀錄', icon: 'fa-clock-rotate-left' },
          { id: 'CANCELLED', label: '取消/爽約', icon: 'fa-ban' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setBookingFilter(tab.id as any)}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${bookingFilter === tab.id ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <i className={`fa-solid ${tab.icon}`}></i> <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col gap-3 w-full xl:w-auto">
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar w-full xl:w-auto">
            {[
              { id: 'TODAY', label: '今日' }, { id: 'TOMORROW', label: '明日' }, { id: 'DAY_AFTER', label: '後天' },
              { id: 'WEEK', label: '本週' }, { id: 'MONTH', label: '整月' }, { id: 'CUSTOM', label: '自訂區間' }
            ].map(m => (
              <button 
                key={m.id} onClick={() => handleViewModeChange(m.id as any)} 
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap transition ${viewMode === m.id ? 'bg-white shadow-sm text-purple-700 border border-purple-100' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          
          {viewMode === 'MONTH' && (
            <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-fit">
               <input 
                 type="month" 
                 value={dateRange.start.substring(0, 7)} 
                 onChange={e => {
                   if(e.target.value) {
                     const [y, m] = e.target.value.split('-');
                     const first = new Date(parseInt(y), parseInt(m) - 1, 1);
                     const last = new Date(parseInt(y), parseInt(m), 0);
                     setDateRange({ start: getLocalDateString(first), end: getLocalDateString(last) });
                   }
                 }} 
                 className="bg-transparent border-none px-2 text-sm outline-none font-black text-purple-700 cursor-pointer" 
               />
            </div>
          )}

          {viewMode === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-fit">
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-white border-none rounded px-2 py-1 text-sm outline-none shadow-sm" />
              <span className="text-slate-400 font-bold">-</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-white border-none rounded px-2 py-1 text-sm outline-none shadow-sm" />
            </div>
          )}
        </div>


        <div className="flex gap-2 w-full md:w-auto">
          {isSingleDay && (
            <button onClick={() => setHideOffTime(!hideOffTime)} className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold shadow-md transition flex items-center justify-center gap-2 text-sm border ${hideOffTime ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              <i className={`fa-solid ${hideOffTime ? 'fa-eye-slash' : 'fa-eye'}`}></i> {hideOffTime ? '展開全部時段' : '隱藏 OFF 時段'}
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none px-5 py-2.5 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-md hover:bg-[#d73211] transition flex items-center justify-center gap-2 text-sm">
            <i className="fa-solid fa-plus"></i> 手動建單
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 font-bold animate-pulse bg-white rounded-xl">載入資料中...</div>
      ) : isSingleDay ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-fade-in">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-black text-lg text-slate-800"><i className="fa-solid fa-calendar-day text-[#EE4D2D] mr-2"></i>{dateRange.start} {bookingFilter === 'ACTIVE' ? '預約排程' : bookingFilter === 'HISTORY' ? '歷史紀錄' : '取消與爽約'}</h3>
              <span className="text-sm font-bold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                 共 {filteredBookings.length} 筆 / 總金額 <span className="text-[#EE4D2D]">${singleDayTotalAmount.toLocaleString()}</span>
              </span>
            </div>
            {bookingFilter !== 'CANCELLED' && (
               <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm w-full md:w-auto">
                  <button onClick={() => setDayDisplayMode('CHART')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition ${dayDisplayMode === 'CHART' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fa-solid fa-chart-gantt mr-1"></i>圖表視圖</button>
                  <button onClick={() => setDayDisplayMode('DETAIL')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition ${dayDisplayMode === 'DETAIL' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fa-solid fa-list mr-1"></i>詳細資料</button>
               </div>
            )}
          </div>
          
          {(dayDisplayMode === 'CHART' && bookingFilter !== 'CANCELLED') && (
             <div className="flex w-full overflow-x-auto relative custom-scrollbar border-b border-slate-100">
                <div className="w-16 shrink-0 bg-white border-r border-slate-200 sticky left-0 z-20 flex flex-col shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                   <div className="h-14 border-b border-slate-200 bg-slate-50"></div>
                   {(() => {
                      let minHour = hideOffTime ? 9 : 0;
                      let maxHour = hideOffTime ? 21 : 23;
                      if(hideOffTime) {
                         let calcMin = 24, calcMax = -1;
                         staffList.forEach(s => {
                           const assignedShiftId = s.shift_assignments?.[dateRange.start];
                           const shift = s.shifts?.find(shift => shift.id === assignedShiftId);
                           if(shift) {
                             const sh = parseInt(shift.start_time.split(':')[0]);
                             const eh = parseInt(shift.end_time.split(':')[0]);
                             if(sh < calcMin) calcMin = sh;
                             if(eh > calcMax) calcMax = eh;
                           }
                         });
                         if(calcMin !== 24) minHour = calcMin;
                         if(calcMax !== -1) maxHour = calcMax;
                      }
                      
                      const hours = [];
                      for(let i = minHour; i <= maxHour; i++) hours.push(`${String(i).padStart(2, '0')}:00`);
                      
                      return hours.map(time => (
                        <div key={time} className="text-[10px] text-slate-400 font-bold text-center border-b border-slate-100" style={{ height: '90px' }}>
                          <div className="-mt-2 bg-white px-1 inline-block relative z-10">{time}</div>
                        </div>
                      ));
                   })()}
                </div>

                <div className="flex flex-1 min-w-max relative bg-slate-50/30">
                   <div className="absolute top-0 left-0 right-0 h-14 flex border-b border-slate-200 bg-slate-50 z-30">
                     {staffList.map(staff => (
                       <div key={staff.id} className="flex-1 min-w-[140px] border-r border-slate-200 flex flex-col items-center justify-center gap-1 p-1">
                         <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-slate-200">
                           <img src={staff.avatar_url || `https://ui-avatars.com/api/?name=${staff.nickname || staff.name}`} className="w-full h-full object-cover" />
                         </div>
                         <div className="text-xs font-bold text-slate-700 truncate w-full text-center">{staff.nickname || staff.name}</div>
                       </div>
                     ))}
                   </div>
                   
                   {(() => {
                     let minHour = hideOffTime ? 9 : 0;
                     let maxHour = hideOffTime ? 21 : 23;
                     if(hideOffTime) {
                       let calcMin = 24, calcMax = -1;
                       staffList.forEach(s => {
                         const assignedShiftId = s.shift_assignments?.[dateRange.start];
                         const shift = s.shifts?.find(shift => shift.id === assignedShiftId);
                         if(shift) {
                           const sh = parseInt(shift.start_time.split(':')[0]);
                           const eh = parseInt(shift.end_time.split(':')[0]);
                           if(sh < calcMin) calcMin = sh;
                           if(eh > calcMax) calcMax = eh;
                         }
                       });
                       if(calcMin !== 24) minHour = calcMin;
                       if(calcMax !== -1) maxHour = calcMax;
                     }
                     const totalHours = maxHour - minHour + 1;
                     
                     return (
                       <div className="mt-14 flex w-full relative" style={{ height: `${totalHours * 90}px` }}>
                          <div className="absolute inset-0 pointer-events-none flex flex-col z-0 opacity-40">
                            {Array.from({length: totalHours}).map((_, i) => (
                              <div key={i} className="border-b border-slate-200 w-full" style={{ height: '90px' }}></div>
                            ))}
                          </div>

                          {staffList.map(staff => {
                            const isClosed = storeSetting?.closed_dates?.includes(dateRange.start);
                            const isLeaveDay = staff.leave_records?.find(l => l.date === dateRange.start);
                            const assignedShiftId = staff.shift_assignments?.[dateRange.start];
                            const shift = staff.shifts?.find(s => s.id === assignedShiftId);
                            
                            let grayAreas = [];
                            if (isClosed || isLeaveDay || !shift) {
                              if(!hideOffTime) grayAreas.push({ top: 0, height: totalHours * 90 });
                            } else {
                              const startMins = parseInt(shift.start_time.split(':')[0]) * 60 + parseInt(shift.start_time.split(':')[1]);
                              const endMins = parseInt(shift.end_time.split(':')[0]) * 60 + parseInt(shift.end_time.split(':')[1]);
                              const viewStartMins = minHour * 60;
                              
                              if (startMins > viewStartMins) {
                                 const h = (startMins - viewStartMins) * 1.5;
                                 if (h > 0) grayAreas.push({ top: 0, height: h });
                              }
                              if (endMins < (minHour + totalHours) * 60) {
                                 const top = (endMins - viewStartMins) * 1.5;
                                 const h = ((minHour + totalHours) * 60 - endMins) * 1.5;
                                 if (top > 0 && h > 0) grayAreas.push({ top, height: h });
                              }
                            }

                            return (
                              <div key={staff.id} className="flex-1 min-w-[140px] border-r border-slate-200 relative">
                                {(!hideOffTime || grayAreas.length > 0) && grayAreas.map((area, i) => (
                                  <div key={i} className="absolute left-0 right-0 bg-slate-100/60 flex items-center justify-center z-0" style={{ top: `${area.top}px`, height: `${area.height}px`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)' }}>
                                    {area.height > 60 && <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase rotate-90 whitespace-nowrap">{isLeaveDay ? isLeaveDay.leave_type : 'OFF DUTY'}</span>}
                                  </div>
                                ))}

                                {filteredBookings.filter(b => b.staff_id === staff.id).map(b => {
                                   const start = new Date(b.start_time);
                                   const end = new Date(b.end_time);
                                   const startMins = start.getHours() * 60 + start.getMinutes() - (minHour * 60);
                                   const durationMins = (end.getTime() - start.getTime()) / 60000;
                                   if (startMins + durationMins < 0 || startMins > totalHours * 60) return null;

                                   return (
                                     <div key={b.id} className="absolute left-1 right-1 p-0.5 z-10" style={{ top: `${startMins * 1.5}px`, height: `${durationMins * 1.5}px` }}>
                                       <div onClick={() => setSelectedBooking(b)} className={`w-full h-full rounded-lg border shadow-sm p-1.5 flex flex-col overflow-hidden transition cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${b.status === 'COMPLETED' ? 'bg-green-50 border-green-200 text-green-700' : b.status === 'PENDING' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
                                          <div className="text-[10px] font-black truncate">{b.buyer_name || '顧客'}</div>
                                          <div className="text-[9px] truncate mt-0.5 opacity-80">{b.service_name || services.find(s => s.id === b.service_id)?.name}</div>
                                          <div className="flex justify-between items-end mt-auto gap-1">
                                            <div className="text-[9px] font-bold opacity-80 bg-white/50 rounded px-1">{start.toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', hour12:false})}</div>
                                            <div className="text-[9px] font-black whitespace-nowrap">{statusMap[b.status]}</div>
                                          </div>
                                       </div>
                                     </div>
                                   )
                                })}
                              </div>
                            )
                          })}
                       </div>
                     );
                   })()}
                </div>
             </div>
          )}

          {(dayDisplayMode === 'DETAIL' || bookingFilter === 'CANCELLED') && (
             <div className="p-4 space-y-3 bg-slate-50/50 border-b border-slate-100 flex-1 overflow-y-auto custom-scrollbar max-h-[500px]">
                {filteredBookings.length === 0 ? (
                   <div className="text-center py-10 text-slate-400 font-bold">本日無相關紀錄</div>
                ) : (
                   filteredBookings
                           .sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                           .map(b => {
                               const start = new Date(b.start_time);
                               const end = new Date(b.end_time);
                               const staff = staffList.find(s => s.id === b.staff_id);
                               const isCancelled = ['CANCELLED', 'NO_SHOW'].includes(b.status);
                               
                               return (
                                  <div key={b.id} onClick={() => setSelectedBooking(b)} className={`bg-white border p-3 md:p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-l-4 ${isCancelled ? 'border-red-200 hover:border-red-300 border-l-red-500 opacity-80' : 'border-purple-100 hover:border-purple-300 border-l-purple-500'}`}>
                                     <div className="flex items-center gap-4">
                                        <div className="text-center shrink-0 w-16">
                                           <div className={`font-black text-lg ${isCancelled ? 'text-red-500' : 'text-purple-600'}`}>{start.toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', hour12:false})}</div>
                                           <div className="text-xs text-slate-400">{end.toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', hour12:false})}</div>
                                        </div>
                                        <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
                                        <div>
                                           <div className={`font-black text-base ${isCancelled ? 'line-through text-slate-500' : 'text-slate-800'}`}>{b.buyer_name || '顧客'}</div>
                                           <div className="text-xs font-bold text-slate-500 mt-1"><i className="fa-solid fa-spa mr-1"></i>{b.service_name || services.find(s => s.id === b.service_id)?.name}</div>
                                        </div>
                                     </div>
                                     <div className="flex flex-col md:items-end justify-between border-t md:border-none border-slate-100 pt-2 md:pt-0 gap-2">
                                        <div className="flex items-center gap-4">
                                           <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                                                 <img src={staff?.avatar_url || `https://ui-avatars.com/api/?name=${staff?.nickname || staff?.name || '未'}`} className="w-full h-full object-cover" />
                                              </div>
                                              <span className="text-xs font-bold text-slate-700">{staff?.nickname || staff?.name || '不指定'}</span>
                                           </div>
                                           <div className={`px-2 py-1 rounded text-xs font-black ${b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : b.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : b.status === 'NO_SHOW' ? 'bg-slate-200 text-slate-600' : b.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                                              {statusMap[b.status]}
                                           </div>
                                        </div>
                                        <div className="text-sm font-black text-[#EE4D2D] text-right">${(b.payable_amount || 0).toLocaleString()}</div>
                                     </div>
                                  </div>
                               )
                           })
                )}
             </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-black text-lg text-slate-800">
                <i className={`fa-solid mr-2 ${bookingFilter === 'ACTIVE' ? 'fa-calendar-days text-[#EE4D2D]' : bookingFilter === 'HISTORY' ? 'fa-clock-rotate-left text-purple-600' : 'fa-ban text-red-500'}`}></i>
                {bookingFilter === 'ACTIVE' ? '預約排程' : bookingFilter === 'HISTORY' ? '歷史紀錄' : '取消與爽約'}總覽 ({dateRange.start} ~ {dateRange.end})
             </h3>
          </div>
          
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-slate-500 text-xs font-bold text-center">
            {['週一', '週二', '週三', '週四', '週五', '週六', '週日'].map(d => <div key={d} className="py-2">{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 bg-white">
            {calendarDays.map((dayObj, idx) => {
              if (!dayObj) return <div key={idx} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50"></div>;
              
              const isToday = dayObj.date === getLocalDateString(new Date());
              const isClosed = storeSetting?.closed_dates?.includes(dayObj.date);

              return (
                <div key={idx} 
                     onClick={() => { 
                         setViewMode('CUSTOM'); 
                         setDateRange({ start: dayObj.date, end: dayObj.date }); 
                         setDayDisplayMode(bookingFilter === 'CANCELLED' ? 'DETAIL' : 'CHART'); 
                     }}
                     className={`min-h-[120px] border-b border-r border-slate-100 p-1 md:p-2 flex flex-col transition hover:bg-slate-50 cursor-pointer ${isClosed ? 'bg-slate-100/50' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs md:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-purple-600 text-white shadow-md' : 'text-slate-700'}`}>{dayObj.dayNum}</span>
                  </div>
                  
                  {isClosed && bookingFilter === 'ACTIVE' ? (
                    <div className="mt-auto text-[10px] text-red-400 font-bold text-center py-2 bg-red-50 rounded">公休</div>
                  ) : (
                    <>
                      <div className="text-[10px] text-slate-400 mb-1 text-center border-b border-slate-100 pb-1 flex flex-col">
                         <span>共 <span className="font-black text-slate-700 text-xs">{dayObj.bookings.length}</span> 筆</span>
                         <span className={`${bookingFilter === 'CANCELLED' ? 'text-red-500' : 'text-[#EE4D2D]'} font-bold`}>${dayObj.dayAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 max-h-[80px]">
                        {dayObj.bookings.slice(0, 4).map((b:any) => (
                          <div key={b.id} onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }} className={`cursor-pointer hover:opacity-80 transition z-10 text-[9px] md:text-[10px] px-1 py-0.5 rounded font-bold truncate ${b.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : b.status === 'PENDING' ? 'bg-orange-50 text-orange-600' : b.status === 'NO_SHOW' ? 'bg-slate-100 text-slate-500 line-through' : b.status === 'CANCELLED' ? 'bg-red-50 text-red-500 line-through' : 'bg-purple-50 text-purple-600'}`}>
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 bg-current"></span>
                            {new Date(b.start_time).toLocaleTimeString('zh-TW', {hour: '2-digit', minute: '2-digit', hour12: false})} {b.buyer_name || '顧客'}
                          </div>
                        ))}
                        {dayObj.bookings.length > 4 && <div className="text-[9px] text-slate-400 text-center font-bold mt-1">+ {dayObj.bookings.length - 4} 筆</div>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleManualAdd} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-black text-slate-800"><i className="fa-solid fa-calendar-plus text-[#EE4D2D] mr-2"></i>手動新增預約</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">選擇服務項目 *</label>
                <select required value={addForm.service_id} onChange={e => setAddForm({...addForm, service_id: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-purple-500 bg-white">
                  <option value="" disabled hidden>請選擇...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">指定員工 (選填)</label>
                <select value={addForm.staff_id} onChange={e => setAddForm({...addForm, staff_id: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-purple-500 bg-white">
                  <option value="">不指定 (由店內安排)</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.nickname || s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">預約日期 *</label>
                  <input type="date" required value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">開始時間 *</label>
                  <input type="time" required value={addForm.time} onChange={e => setAddForm({...addForm, time: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4 mt-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">顧客姓名 (現場客) *</label>
                <input type="text" required value={addForm.buyer_name} onChange={e => setAddForm({...addForm, buyer_name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4 shrink-0">
              <button type="submit" className="flex-1 bg-[#EE4D2D] text-white py-3 rounded-xl font-bold hover:bg-[#d73211] transition shadow-md">建立預約</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition">取消</button>
            </div>
          </form>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up relative">
            <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white transition">
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h3 className="text-xl font-black text-slate-800 mb-5 border-b border-slate-100 pb-3">預約詳細資訊</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-400">顧客姓名</span>
                <span className="font-black text-slate-800">{selectedBooking.buyer_name || '未提供'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-400">聯絡電話</span>
                <span className="font-bold text-slate-800">{selectedBooking.buyer_phone || '未提供'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-400">信箱</span>
                <span className="font-bold text-slate-800 break-all">{selectedBooking.buyer_email || '未提供'}</span>
              </div>
              <div className="flex justify-between items-start bg-[#FFF4F2] p-3 rounded-lg border border-[#ffbba5]">
                <span className="text-sm font-bold text-[#EE4D2D]">預約服務</span>
                <span className="font-black text-[#EE4D2D] text-right">{selectedBooking.service_name || services.find(s => s.id === selectedBooking.service_id)?.name}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-400">預約時間</span>
                <div className="text-right font-bold text-slate-800">
                  <div>{new Date(selectedBooking.start_time).toLocaleDateString('zh-TW')}</div>
                  <div className="text-purple-600">
                    {new Date(selectedBooking.start_time).toLocaleTimeString('zh-TW', {hour: '2-digit', minute: '2-digit', hour12: false})} ~ 
                    {new Date(selectedBooking.end_time).toLocaleTimeString('zh-TW', {hour: '2-digit', minute: '2-digit', hour12: false})}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-400">指定設計師</span>
                <span className="font-bold text-slate-800">{selectedBooking.staff_id ? staffList.find(s => s.id === selectedBooking.staff_id)?.name : '不指定'}</span>
              </div>
              
              <div className="border-t border-slate-100 pt-3 mt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-400">預約單號</span>
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">{selectedBooking.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-400">建立時間</span>
                  <span className="text-sm font-bold text-slate-700">{selectedBooking.created_at ? new Date(selectedBooking.created_at).toLocaleString('zh-TW', { hour12: false }) : '無紀錄'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-400">付款方式/狀態</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      {selectedBooking.used_voucher_id ? '票券全額折抵' : selectedBooking.used_wallet_amount ? '儲值金扣抵' : selectedBooking.payment_method === 'FULL' ? '線上全額付清' : selectedBooking.payment_method === 'DEPOSIT' ? '已付訂金' : '現場付款'}
                    </span>
                    {selectedBooking.deposit_status === 'PAID' ? (
                       <span className="text-[10px] px-2 py-0.5 rounded font-black bg-green-100 text-green-700">已付款</span>
                    ) : (
                       <button onClick={async () => {
                           if(window.confirm('確定要將此預約改為「已付款」嗎？')) {
                               try {
                                   // ★ 唯一的一處替換在這裡：
                                   await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/update-status/${selectedBooking.id}`, { 
                                       method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ deposit_status: 'PAID' }) 
                                   });
                                   setSelectedBooking({...selectedBooking, deposit_status: 'PAID'});
                                   setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {...b, deposit_status: 'PAID'} : b));
                               } catch(e) { alert('更新失敗'); }
                           }
                       }} className="text-[10px] px-2 py-0.5 rounded font-black bg-orange-100 text-orange-700 hover:bg-orange-200 transition cursor-pointer shadow-sm">
                           待付款 (點擊確認收款)
                       </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-400">服務總金額</span>
                  <span className="text-lg font-black text-[#EE4D2D]">${(selectedBooking.payable_amount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-3">
                <span className="text-sm font-bold text-slate-400 block mb-1">顧客需求備註</span>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 min-h-[60px] whitespace-pre-wrap">
                  {selectedBooking.memo || '無特殊備註'}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
               <select 
                  value={selectedBooking.status} 
                  onChange={(e) => { 
                     handleUpdateStatus(selectedBooking.id, e.target.value); 
                     setSelectedBooking({...selectedBooking, status: e.target.value as any}); 
                  }}
                  className="flex-1 p-3 border-2 border-slate-200 bg-slate-50 text-slate-700 rounded-xl font-bold outline-none focus:border-purple-500"
               >
                 <option value="PENDING">狀態：待確認</option>
                 <option value="CONFIRMED">狀態：已確認</option>
                 <option value="COMPLETED">狀態：已完成</option>
                 <option value="CANCELLED">狀態：已取消</option>
                 <option value="NO_SHOW">狀態：顧客爽約</option>
               </select>
               <button onClick={() => setSelectedBooking(null)} className="px-6 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700">關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}