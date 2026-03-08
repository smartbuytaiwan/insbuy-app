import React, { useState, useEffect } from 'react';
import { DaySchedule } from '../types';
import { uploadImageToSupabase } from '../../supabaseClient'; 

const defaultDay = (): DaySchedule => ({ isOpen: true, open: '10:00', close: '21:00', breakStart: '', breakEnd: '', slot_interval: 30, disabled_slots: [] });
const closedDay = (): DaySchedule => ({ isOpen: false, open: '', close: '', breakStart: '', breakEnd: '', slot_interval: 30, disabled_slots: [] });

const weekDays = [
  { id: '1', label: '星期一' }, { id: '2', label: '星期二' }, { id: '3', label: '星期三' },
  { id: '4', label: '星期四' }, { id: '5', label: '星期五' }, { id: '6', label: '星期六' }, { id: '0', label: '星期日' }
];

export default function StoreSettingManagement({ shopId }: { shopId: string }) {
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, DaySchedule>>({});
  const [specialDates, setSpecialDates] = useState<Record<string, DaySchedule>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'weekly' | 'special'>('calendar');

  const [selectedSpecialDate, setSelectedSpecialDate] = useState('');
  const [specialDateForm, setSpecialDateForm] = useState<DaySchedule>(defaultDay());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [autoAssignRule, setAutoAssignRule] = useState('LEAST_BOOKINGS');
  const [priorityStaffId, setPriorityStaffId] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);

  const [storefrontForm, setStorefrontForm] = useState({
     storefront_name: '',
     storefront_avatar: '', 
     storefront_banner: '',
     storefront_address: '',
     storefront_notices: '✦ 工作室可攜伴(但勿催促⚠️)\n✦ 操作時間約 2.5 - 4 小時請保留時間\n✦ 取消/改期請於 2 天前告知，臨時改期下次預約須先付訂金，無故取消將列入黑名單'
  });
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (type === 'avatar') setIsUploadingAvatar(true);
      else setIsUploadingBanner(true);

      try {
          const url = await uploadImageToSupabase(file, 'images');
          if (url) {
              if (type === 'avatar') setStorefrontForm(prev => ({ ...prev, storefront_avatar: url }));
              else setStorefrontForm(prev => ({ ...prev, storefront_banner: url }));
          } else {
              alert('圖片上傳失敗，請檢查網路或系統設定');
          }
      } catch (error) {
          console.error('上傳錯誤', error);
          alert('上傳發生錯誤');
      } finally {
          if (type === 'avatar') setIsUploadingAvatar(false);
          else setIsUploadingBanner(false);
      }
  };

  useEffect(() => {
    // ★ 第一處替換
    fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/settings/${shopId}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          let ws = data.weekly_schedule || {};
          weekDays.forEach(d => { if (!ws[d.id]) ws[d.id] = defaultDay(); });
          setWeeklySchedule(ws);
          
          let sd = data.special_dates || {};
          if (data.closed_dates && Array.isArray(data.closed_dates)) {
             data.closed_dates.forEach((d: string) => { if (!sd[d]) sd[d] = closedDay(); });
          }
          setSpecialDates(sd);
          if (data.auto_assign_rule) setAutoAssignRule(data.auto_assign_rule);
          if (data.priority_staff_id) setPriorityStaffId(data.priority_staff_id);
          
          setStorefrontForm({
             storefront_name: data.storefront_name || '',
             storefront_avatar: data.storefront_avatar || '', 
             storefront_banner: data.storefront_banner || '',
             storefront_address: data.storefront_address || '',
             storefront_notices: data.storefront_notices || '✦ 工作室可攜伴(但勿催促⚠️)\n✦ 操作時間約 2.5 - 4 小時請保留時間\n✦ 取消/改期請於 2 天前告知，臨時改期下次預約須先付訂金，無故取消將列入黑名單'
          });
        }
      }).catch(console.error);

    // ★ 第二處替換
    fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/staff/${shopId}`)
       .then(res => res.json())
       .then(data => setStaffList(data || []));
  }, [shopId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalSpecialDates: Record<string, DaySchedule> = {};
      const finalClosedDates: string[] = [];
      
      Object.keys(specialDates).forEach(date => {
        if (specialDates[date].isOpen) {
          finalSpecialDates[date] = specialDates[date]; 
        } else {
          finalClosedDates.push(date); 
        }
      });

      // ★ 第三處替換
      await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api'}/booking/settings/${shopId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
           weekly_schedule: weeklySchedule, 
           special_dates: finalSpecialDates,         
           closed_dates: finalClosedDates,           
           auto_assign_rule: autoAssignRule,         
           priority_staff_id: priorityStaffId,       
           storefront_name: storefrontForm.storefront_name,
           storefront_avatar: storefrontForm.storefront_avatar, 
           storefront_banner: storefrontForm.storefront_banner,
           storefront_address: storefrontForm.storefront_address,
           storefront_notices: storefrontForm.storefront_notices
        })
      });
      alert('營業時間與派單設定已成功儲存！');
    } catch (e) { alert('儲存失敗，請檢查網路。'); }
    finally { setIsSaving(false); }
  };

  const updateWeekly = (dayId: string, field: string, value: any) => {
    setWeeklySchedule(prev => ({ ...prev, [dayId]: { ...prev[dayId], [field]: value } }));
  };

  const handleAddSpecialDate = () => {
    if (!selectedSpecialDate) return alert('請先選擇日期');
    setSpecialDates({ ...specialDates, [selectedSpecialDate]: specialDateForm });
    setSelectedSpecialDate('');
    setSpecialDateForm(defaultDay());
  };

  const renderSlotManager = (setting: DaySchedule, dateOrId: string, isSpecial: boolean) => {
    if (!setting.isOpen || !setting.open || !setting.close) return null;
    const slots = [];
    const openObj = new Date(`2000-01-01T${setting.open}:00`);
    const closeObj = new Date(`2000-01-01T${setting.close}:00`);
    const interval = setting.slot_interval || 30;
    
    let curr = new Date(openObj);
    while (curr < closeObj) {
        const timeStr = `${curr.getHours().toString().padStart(2, '0')}:${curr.getMinutes().toString().padStart(2, '0')}`;
        let isBreak = false;
        if (setting.breakStart && setting.breakEnd) {
            const bStart = new Date(`2000-01-01T${setting.breakStart}:00`);
            const bEnd = new Date(`2000-01-01T${setting.breakEnd}:00`);
            if (curr >= bStart && curr < bEnd) isBreak = true;
        }
        if (!isBreak) slots.push(timeStr);
        curr = new Date(curr.getTime() + interval * 60000);
    }
    
    return (
      <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg shadow-inner col-span-full">
         <div className="text-xs font-bold text-slate-500 mb-3 flex items-center">
            <i className="fa-solid fa-hand-pointer mr-2 text-purple-500 text-lg"></i>
            點擊下方特定時間，可強制「關閉」或「開啟」該時段不讓客人預約。
         </div>
         <div className="flex flex-wrap gap-2">
            {slots.map(timeStr => {
               const isDisabled = setting.disabled_slots?.includes(timeStr);
               return (
                  <button 
                     key={timeStr}
                     onClick={() => {
                        const newDisabled = isDisabled ? (setting.disabled_slots || []).filter(t => t !== timeStr) : [...(setting.disabled_slots || []), timeStr];
                        if (isSpecial) setSpecialDates({...specialDates, [dateOrId]: {...setting, disabled_slots: newDisabled}});
                        else setWeeklySchedule({...weeklySchedule, [dateOrId]: {...setting, disabled_slots: newDisabled}});
                     }}
                     className={`px-3 py-1.5 text-xs font-black rounded-lg border-2 transition-all ${isDisabled ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 shadow-sm'}`}
                  >
                     {timeStr}
                  </button>
               );
            })}
         </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-${i}`} className="bg-slate-50 border border-slate-100 p-2 opacity-50 hidden md:block"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayOfWeek = new Date(year, month, d).getDay().toString();
        const effective = specialDates[dateStr] || weeklySchedule[dayOfWeek] || defaultDay();
        
        cells.push(
            <div key={d} className={`border border-slate-200 p-2 h-24 md:h-28 flex flex-col transition-colors ${!effective.isOpen ? 'bg-red-50/50' : 'bg-white hover:border-[#EE4D2D]'}`}>
                <div className="flex justify-between items-start mb-1">
                   <span className={`font-black text-sm ${!effective.isOpen ? 'text-red-400' : 'text-slate-700'}`}>{d}</span>
                   {specialDates[dateStr] && <span className="bg-[#FFF4F2] text-[#EE4D2D] px-1.5 py-0.5 rounded text-[10px] font-bold border border-[#ffbba5]">特規</span>}
                </div>
                {effective.isOpen ? (
                    <div className="flex-1 flex flex-col justify-center gap-1 text-[10px] md:text-xs">
                       <div className="text-purple-700 font-bold bg-purple-50 px-1 rounded flex justify-center"><i className="fa-regular fa-clock mt-0.5 mr-1 hidden md:block"></i> {effective.open}~{effective.close}</div>
                       {effective.breakStart && <div className="text-orange-600 font-bold bg-orange-50 px-1 rounded flex justify-center mt-1">休 {effective.breakStart}~{effective.breakEnd}</div>}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-red-500 font-black text-xs md:text-sm tracking-widest"><i className="fa-solid fa-ban mr-1"></i>公休</div>
                )}
            </div>
        );
    }
    return cells;
  };

  return (
    <div className="space-y-4 animate-fade-in w-full max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg font-bold text-slate-800"><i className="fa-solid fa-store text-[#EE4D2D] mr-2"></i>營業日與行事曆設定</h3>
        <button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto px-6 py-2.5 bg-[#EE4D2D] text-white rounded-xl font-black shadow-md hover:bg-[#d73211] transition disabled:opacity-50">
          {isSaving ? '儲存中...' : '儲存所有變更'}
        </button>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
        <button onClick={() => setActiveTab('calendar')} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold border-2 transition ${activeTab === 'calendar' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFF4F2]' : 'border-transparent bg-slate-100 text-slate-500'}`}>當月行事曆預覽</button>
        <button onClick={() => setActiveTab('weekly')} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold border-2 transition ${activeTab === 'weekly' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFF4F2]' : 'border-transparent bg-slate-100 text-slate-500'}`}>每週預設時間</button>
        <button onClick={() => setActiveTab('special')} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold border-2 transition ${activeTab === 'special' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFF4F2]' : 'border-transparent bg-slate-100 text-slate-500'}`}>特定日期(特休/加班)</button>
        <button onClick={() => setActiveTab('storefront' as any)} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold border-2 transition ${activeTab === 'storefront' as any ? 'border-[#EE4D2D] text-[#EE4D2D] bg-[#FFF4F2]' : 'border-transparent bg-slate-100 text-slate-500'}`}>首頁品牌設定</button>
      </div>

      {/* ★ 新增：自動派單規則設定區塊 (常駐在上方) */}
      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
         <div>
            <h4 className="font-black text-purple-800 text-sm mb-1"><i className="fa-solid fa-robot mr-2"></i>自動派單規則 (當客人選「不指定」時)</h4>
            <p className="text-xs text-purple-600 font-bold">系統會依此規則，自動將預約分配給當天空閒的服務人員。</p>
         </div>
         <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <select value={autoAssignRule} onChange={e => setAutoAssignRule(e.target.value)} className="p-2 border border-purple-200 rounded-lg outline-none font-bold text-sm text-slate-700 w-full md:w-auto">
               <option value="LEAST_BOOKINGS">優先派給「預約筆數最少」的人</option>
               <option value="LEAST_REVENUE">優先派給「總金額最少」的人</option>
               <option value="PRIORITY">優先派給「指定王牌設計師」</option>
            </select>
            {autoAssignRule === 'PRIORITY' && (
               <select value={priorityStaffId} onChange={e => setPriorityStaffId(e.target.value)} className="p-2 border border-purple-200 rounded-lg outline-none font-bold text-sm text-slate-700 w-full md:w-auto">
                  <option value="" disabled hidden>選擇優先員工</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.nickname || s.name}</option>)}
               </select>
            )}
         </div>
      </div>

      <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-2xl shadow-sm">
        
        {activeTab === 'calendar' && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-[#EE4D2D] hover:text-white transition font-black"><i className="fa-solid fa-chevron-left"></i></button>
                <h4 className="text-lg font-black text-slate-800">{currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月</h4>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-[#EE4D2D] hover:text-white transition font-black"><i className="fa-solid fa-chevron-right"></i></button>
             </div>
             <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-xs font-bold text-slate-500 mb-2">
                <div className="text-red-400">日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div className="text-purple-500">六</div>
             </div>
             <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendar()}</div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="animate-fade-in overflow-x-auto no-scrollbar">
            <p className="text-sm text-slate-500 font-bold mb-4 border-l-4 border-[#EE4D2D] pl-2">設定每週的營業時間與「預約間隔」(15~60分鐘)。點擊「細部設定」可手動開關特定時段。</p>
            <div className="min-w-[850px] space-y-3 pb-20">
              {weekDays.map(day => {
                const setting = weeklySchedule[day.id] || defaultDay();
                return (
                  <div key={day.id} className={`p-4 rounded-xl border ${setting.isOpen ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-24 shrink-0 flex items-center gap-2">
                        <input type="checkbox" checked={setting.isOpen} onChange={e => updateWeekly(day.id, 'isOpen', e.target.checked)} className="w-5 h-5 accent-[#EE4D2D]" />
                        <span className="font-bold text-slate-700">{day.label}</span>
                      </div>
                      {setting.isOpen ? (
                        <div className="flex-1 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-500">
                          <div className="flex items-center gap-2">
                            開<input type="time" value={setting.open} onChange={e => updateWeekly(day.id, 'open', e.target.value)} className="border border-slate-300 rounded-lg p-1.5 outline-none focus:border-[#EE4D2D] bg-white" />
                            ~ 收<input type="time" value={setting.close} onChange={e => updateWeekly(day.id, 'close', e.target.value)} className="border border-slate-300 rounded-lg p-1.5 outline-none focus:border-[#EE4D2D] bg-white" />
                          </div>
                          <div className="w-px h-6 bg-slate-300 hidden md:block"></div>
                          <div className="flex items-center gap-2">
                            <i className="fa-solid fa-mug-hot text-orange-500"></i>休 
                            <input type="time" value={setting.breakStart} onChange={e => updateWeekly(day.id, 'breakStart', e.target.value)} className="border border-slate-300 rounded-lg p-1.5 outline-none focus:border-orange-500 bg-white" />
                            ~ <input type="time" value={setting.breakEnd} onChange={e => updateWeekly(day.id, 'breakEnd', e.target.value)} className="border border-slate-300 rounded-lg p-1.5 outline-none focus:border-orange-500 bg-white" />
                          </div>
                          <div className="w-px h-6 bg-slate-300 hidden xl:block"></div>
                          <div className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                             間隔
                             <select value={setting.slot_interval || 30} onChange={e => updateWeekly(day.id, 'slot_interval', Number(e.target.value))} className="bg-white border border-purple-200 rounded outline-none text-purple-700">
                                <option value={15}>15 分</option><option value={30}>30 分</option><option value={45}>45 分</option><option value={60}>1 小時</option>
                             </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-red-500 font-black text-sm tracking-widest"><i className="fa-solid fa-ban mr-2"></i>當日公休不開放預約</div>
                      )}
                    </div>
                    {/* 展開時段開關 UI */}
                    {renderSlotManager(setting, day.id, false)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: 特規設定 */}
        {activeTab === 'special' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-[#FFF4F2] p-4 rounded-xl border border-[#ffbba5]">
               <h4 className="font-black text-[#EE4D2D] mb-3"><i className="fa-solid fa-calendar-plus mr-2"></i>新增指定日期覆蓋設定</h4>
               <div className="flex flex-col md:flex-row gap-3">
                 <input type="date" value={selectedSpecialDate} onChange={e => setSelectedSpecialDate(e.target.value)} className="p-2 border rounded-lg font-bold outline-none focus:border-[#EE4D2D]" />
                 <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                    <input type="checkbox" checked={specialDateForm.isOpen} onChange={e => setSpecialDateForm({...specialDateForm, isOpen: e.target.checked})} className="w-4 h-4 accent-[#EE4D2D]" />
                    <span className="font-bold text-slate-700 text-sm">這天有營業</span>
                 </div>
                 {specialDateForm.isOpen && (
                    <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-2 rounded-lg border text-sm font-bold text-slate-500">
                      開<input type="time" value={specialDateForm.open} onChange={e => setSpecialDateForm({...specialDateForm, open: e.target.value})} className="border rounded p-1 outline-none w-24" />
                      ~ 收<input type="time" value={specialDateForm.close} onChange={e => setSpecialDateForm({...specialDateForm, close: e.target.value})} className="border rounded p-1 outline-none w-24 mr-2" />
                      <i className="fa-solid fa-mug-hot text-orange-500"></i>休
                      <input type="time" value={specialDateForm.breakStart} onChange={e => setSpecialDateForm({...specialDateForm, breakStart: e.target.value})} className="border rounded p-1 outline-none w-24" />
                      ~ <input type="time" value={specialDateForm.breakEnd} onChange={e => setSpecialDateForm({...specialDateForm, breakEnd: e.target.value})} className="border rounded p-1 outline-none w-24" />
                    </div>
                 )}
                 <button onClick={handleAddSpecialDate} className="bg-slate-800 text-white font-bold px-4 py-2 rounded-lg hover:bg-slate-700 whitespace-nowrap">新增設定</button>
               </div>
            </div>

            <div>
               <h4 className="font-black text-slate-700 mb-3 border-b pb-2">已設定的特規日期列表</h4>
               {Object.keys(specialDates).length === 0 ? (
                 <div className="text-center py-6 text-slate-400 font-bold border-2 border-dashed rounded-xl">尚無任何特規日期</div>
               ) : (
                 <div className="grid grid-cols-1 gap-4">
                   {Object.entries(specialDates).sort((a,b) => a[0].localeCompare(b[0])).map(([date, sd]) => (
                     <div key={date} className={`flex flex-col p-4 rounded-xl border ${sd.isOpen ? 'bg-white border-purple-200 shadow-sm' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                             <div className="font-black text-slate-800 mb-1 text-lg">{date}</div>
                             {sd.isOpen ? (
                               <div className="text-sm font-bold text-slate-500 flex items-center gap-3">
                                 <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded"><i className="fa-regular fa-clock"></i> {sd.open}~{sd.close}</span>
                                 {sd.breakStart && <span className="text-orange-500 bg-orange-50 px-2 py-1 rounded"><i className="fa-solid fa-mug-hot"></i> {sd.breakStart}~{sd.breakEnd}</span>}
                                 <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">間隔 {sd.slot_interval || 30} 分</span>
                               </div>
                             ) : (
                               <span className="text-sm font-black text-red-500 tracking-wider"><i className="fa-solid fa-ban"></i> 標記為公休</span>
                             )}
                          </div>
                          <button onClick={() => {
                            const newSd = {...specialDates};
                            delete newSd[date];
                            setSpecialDates(newSd);
                          }} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white transition"><i className="fa-solid fa-trash"></i></button>
                        </div>
                        {renderSlotManager(sd, date, true)}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        )}

        {/* ★ 新增：品牌首頁設定 Tab */}
        {activeTab === 'storefront' as any && (
          <div className="animate-fade-in space-y-6 max-w-2xl">
            <p className="text-sm text-slate-500 font-bold mb-4 border-l-4 border-[#EE4D2D] pl-2">您在此處的設定將會即時顯示在買家的「線上預約首頁」。</p>
            
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">品牌/店家顯示名稱</label>
               <input type="text" value={storefrontForm.storefront_name} onChange={e => setStorefrontForm({...storefrontForm, storefront_name: e.target.value})} placeholder="例如：拍拍購合作店家" className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-[#EE4D2D]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">店家大頭照 / Logo (選填)</label>
                   <p className="text-[10px] text-slate-400 mb-2">建議尺寸：1:1 正方形 (例如 400x400 px)</p>
                   <div className="flex items-end gap-4">
                       <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                           {isUploadingAvatar ? <i className="fa-solid fa-spinner fa-spin text-slate-400 text-2xl"></i> :
                            storefrontForm.storefront_avatar ? <img src={storefrontForm.storefront_avatar} className="w-full h-full object-cover" /> :
                            <i className="fa-solid fa-image text-slate-300 text-2xl"></i>}
                       </div>
                       <label className="cursor-pointer bg-white border border-slate-200 hover:border-[#EE4D2D] hover:text-[#EE4D2D] text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm mb-2">
                           選擇照片
                           <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} className="hidden" />
                       </label>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">首頁品牌 Banner 背景圖 (選填)</label>
                   <p className="text-[10px] text-slate-400 mb-2">建議尺寸：長方形比例 (例如 1200x400 px)</p>
                   <div className="flex flex-col gap-2">
                       <div className="w-full h-24 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center relative">
                           {isUploadingBanner ? <i className="fa-solid fa-spinner fa-spin text-slate-400 text-2xl"></i> :
                            storefrontForm.storefront_banner ? <img src={storefrontForm.storefront_banner} className="w-full h-full object-cover" /> :
                            <i className="fa-solid fa-image text-slate-300 text-2xl"></i>}
                       </div>
                       <label className="cursor-pointer text-center bg-white border border-slate-200 hover:border-[#EE4D2D] hover:text-[#EE4D2D] text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm w-fit">
                           上傳背景圖
                           <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} className="hidden" />
                       </label>
                   </div>
                </div>
            </div>

            <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">實體店面地址</label>
               <input type="text" value={storefrontForm.storefront_address} onChange={e => setStorefrontForm({...storefrontForm, storefront_address: e.target.value})} placeholder="點擊可引導客人開啟 Google 地圖" className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-[#EE4D2D]" />
            </div>

            <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">預約注意事項</label>
               <textarea value={storefrontForm.storefront_notices} onChange={e => setStorefrontForm({...storefrontForm, storefront_notices: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-[#EE4D2D] h-32" placeholder="輸入退換貨或遲到須知..."></textarea>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}