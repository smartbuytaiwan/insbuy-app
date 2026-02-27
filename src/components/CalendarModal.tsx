import React, { useState, useEffect } from 'react';
import { initGoogleCalendar, authorizeGoogle, addEventToGoogleCalendar, getGoogleCalendars } from '../utils/googleCalendar'; 

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; 
  time: string; 
  endDate?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
  description?: string;
}

export default function CalendarModal({ isOpen, onClose, user }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null); 
  const [calendarLists, setCalendarLists] = useState<any[]>([]); 

  // 擴充版的新增事件表單狀態
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [newEventTime, setNewEventTime] = useState('12:00');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('13:00');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null); 
  
  const [selectedCalendarId, setSelectedCalendarId] = useState('primary');
  const [reminderMinutes, setReminderMinutes] = useState<number>(30); 
  const [attendeesStr, setAttendeesStr] = useState(''); 
  const [addMeetLink, setAddMeetLink] = useState(false);

  const [isEndDateEdited, setIsEndDateEdited] = useState(false);
  const [isEndTimeEdited, setIsEndTimeEdited] = useState(false);

  // 初始化與讀取資料
  useEffect(() => {
    if (isOpen && user?.id) {
      const today = new Date();
      setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      
      try {
        const savedEvents = localStorage.getItem(`insbuy_calendar_${user.id}`);
        if (savedEvents) setEvents(JSON.parse(savedEvents));
        
        const gToken = localStorage.getItem(`insbuy_gcal_token_${user.id}`);
        if (gToken) {
          setIsGoogleConnected(true);
          setGoogleToken(gToken);
        }
      } catch (e) { console.error(e); }

      initGoogleCalendar(async (token) => {
         setIsGoogleConnected(true);
         setGoogleToken(token);
         localStorage.setItem(`insbuy_gcal_token_${user.id}`, token);
         try {
           const calData = await getGoogleCalendars(token);
           if (calData.items) setCalendarLists(calData.items);
         } catch (e) { console.error("獲取日曆清單失敗", e); }
         alert('🎉 成功串接 Google 日曆！後續新增的行程將自動同步。');
      });
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (user?.id && events.length > 0) {
      localStorage.setItem(`insbuy_calendar_${user.id}`, JSON.stringify(events));
    }
  }, [events, user]);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // ★ 時間自動連動邏輯
  const handleStartDateChange = (val: string) => {
    setSelectedDate(val);
    if (!isEndDateEdited) setNewEventEndDate(val); 
  };

  const handleStartTimeChange = (val: string) => {
    setNewEventTime(val);
    if (!isEndTimeEdited) {
       const [h, m] = val.split(':').map(Number);
       const nextH = h + 1;
       if (nextH >= 24) {
          setNewEventEndTime(`${String(nextH - 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
          const endD = new Date(selectedDate);
          endD.setDate(endD.getDate() + 1);
          const y = endD.getFullYear();
          const mo = String(endD.getMonth() + 1).padStart(2, '0');
          const d = String(endD.getDate()).padStart(2, '0');
          setNewEventEndDate(`${y}-${mo}-${d}`);
       } else {
          setNewEventEndTime(`${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
       }
    }
  };

  const openAddForm = () => {
     setShowAddForm(true);
     setEditingEventId(null); 
     setNewEventTitle('');
     setIsAllDay(false);
     setNewEventTime('12:00');
     setNewEventEndDate(selectedDate);
     setNewEventEndTime('13:00');
     setNewEventLocation('');
     setNewEventDescription('');
     setIsEndDateEdited(false);
     setIsEndTimeEdited(false);
  };

  const handleEditEvent = (event: CalendarEvent) => {
     setEditingEventId(event.id);
     setNewEventTitle(event.title);
     setIsAllDay(event.isAllDay || false);
     setSelectedDate(event.date);
     setNewEventTime(event.time || '12:00');
     setNewEventEndDate(event.endDate || event.date);
     setNewEventEndTime(event.endTime || '13:00');
     setNewEventLocation(event.location || '');
     setNewEventDescription(event.description || '');
     setShowAddForm(true);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle) return alert('請輸入行程標題！');
    const newEvent: CalendarEvent = {
      id: editingEventId || Date.now().toString(), 
      title: newEventTitle,
      date: selectedDate,
      time: isAllDay ? '' : newEventTime,
      endDate: newEventEndDate || selectedDate,
      endTime: isAllDay ? '' : newEventEndTime,
      isAllDay,
      location: newEventLocation,
      description: newEventDescription
    };
    
    if (editingEventId) {
       setEvents(events.map(e => e.id === editingEventId ? newEvent : e));
    } else {
       setEvents([...events, newEvent]);
    }
    
    setShowAddForm(false);
    setEditingEventId(null);
    setNewEventTitle('');
    setNewEventLocation('');
    setNewEventDescription('');
    setIsAllDay(false);
    
    if (isGoogleConnected && googleToken && !editingEventId) { 
      try {
         const attendeeList = attendeesStr ? attendeesStr.split(',').map(s => s.trim()).filter(s => s) : [];
         await addEventToGoogleCalendar(googleToken, {
            title: newEventTitle,
            date: selectedDate,
            time: newEventTime,
            endDate: newEventEndDate || selectedDate,
            endTime: newEventEndTime,
            isAllDay: isAllDay,
            location: newEventLocation,
            description: newEventDescription,
            calendarId: selectedCalendarId,
            reminders: reminderMinutes > 0 ? [reminderMinutes] : [],
            attendees: attendeeList,
            addMeetLink: addMeetLink
         });
         console.log('Google 日曆同步成功！');
      } catch (error) {
         console.error('Google 同步失敗', error);
         alert('⚠️ 同步至 Google 日曆失敗。登入狀態可能已過期，請重新串接。');
         setIsGoogleConnected(false);
         setGoogleToken(null);
         localStorage.removeItem(`insbuy_gcal_token_${user?.id}`);
      }
    }
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('確定要刪除此行程嗎？')) {
      setEvents(events.filter(e => e.id !== id));
      if (events.length === 1 && user?.id) {
         localStorage.removeItem(`insbuy_calendar_${user.id}`); 
      }
    }
  };

  const toggleGoogleConnect = () => {
    if (isGoogleConnected) {
      if(confirm('確定要解除綁定 Google 日曆嗎？')) {
        setIsGoogleConnected(false);
        setGoogleToken(null);
        localStorage.removeItem(`insbuy_gcal_token_${user?.id}`);
      }
    } else {
      authorizeGoogle();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-50 rounded-3xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        <div className="bg-white p-4 md:p-5 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3 font-black text-xl text-slate-800">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
              <i className="fa-regular fa-calendar-days"></i>
            </div>
            <span>我的行事曆</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 bg-slate-50 border border-transparent">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          
          <div className="flex-[1.5] p-4 md:p-6 bg-white border-r border-slate-100">
            <div className="mb-6 flex justify-between items-center">
               <button 
                 onClick={toggleGoogleConnect}
                 className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm border ${isGoogleConnected ? 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
               >
                 <i className="fa-brands fa-google"></i>
                 {isGoogleConnected ? '已綁定 Google 日曆 (點擊解除)' : '串接 Google 日曆'}
               </button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"><i className="fa-solid fa-chevron-left"></i></button>
              <h2 className="text-lg font-black text-slate-800">{year} 年 {month + 1} 月</h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"><i className="fa-solid fa-chevron-right"></i></button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {blanksArray.map(b => <div key={`blank-${b}`} className="p-2"></div>)}
              {daysArray.map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const hasEvent = events.some(e => e.date === dateStr);
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                return (
                  <button 
                    key={day}
                    onClick={() => { setSelectedDate(dateStr); setNewEventEndDate(dateStr); setShowAddForm(false); }}
                    className={`relative aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all
                      ${isSelected ? 'bg-[#EE4D2D] text-white shadow-md transform scale-105' : 'hover:bg-slate-100 text-slate-700'}
                      ${isToday && !isSelected ? 'border-2 border-[#EE4D2D] text-[#EE4D2D]' : 'border border-transparent'}
                    `}
                  >
                    {day}
                    {hasEvent && (
                      <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#EE4D2D]'}`}></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 bg-[#F8FAFC] p-4 md:p-6 flex flex-col">
            <h3 className="font-black text-lg text-slate-800 mb-4 border-b border-slate-200 pb-2">
              {selectedDate.replace(/-/g, '/')} 行程
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {events.filter(e => e.date === selectedDate).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                   <i className="fa-regular fa-calendar-xmark text-4xl mb-3 text-slate-300"></i>
                   <p className="font-bold text-sm">本日尚無任何行程</p>
                </div>
              ) : (
                events.filter(e => e.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time)).map(e => (
                  <div key={e.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-orange-200 transition">
                     <div className="flex items-center gap-3">
                        <div className="bg-orange-50 text-[#EE4D2D] text-xs font-black px-2 py-1 rounded-lg">{e.time}</div>
                        <span className="text-sm font-bold text-slate-700">{e.title}</span>
                     </div>
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                       <button onClick={() => handleEditEvent(e)} className="text-slate-300 hover:text-blue-500 transition p-1" title="編輯行程"><i className="fa-solid fa-pen"></i></button>
                       <button onClick={() => handleDeleteEvent(e.id)} className="text-slate-300 hover:text-red-500 transition p-1" title="刪除行程"><i className="fa-solid fa-trash-can"></i></button>
                     </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 shrink-0">
              {showAddForm ? (
                <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-200 animate-fade-in-up space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                   
                   <div className="space-y-2">
                     <input type="text" placeholder="新增標題 (例：免運日搶購)" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full text-base font-black text-slate-800 border-b-2 border-slate-100 pb-2 outline-none focus:border-[#EE4D2D] transition-colors" autoFocus />
                     {isGoogleConnected && calendarLists.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <i className="fa-solid fa-calendar-days text-slate-400"></i>
                          <select value={selectedCalendarId} onChange={e => setSelectedCalendarId(e.target.value)} className="bg-transparent text-slate-600 font-bold outline-none cursor-pointer">
                            <option value="primary">我的預設日曆</option>
                            {calendarLists.filter(c => c.id !== 'primary').map(c => (
                              <option key={c.id} value={c.id}>{c.summary}</option>
                            ))}
                          </select>
                        </div>
                     )}
                   </div>
                   
                   <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer w-max">
                      <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="w-4 h-4 accent-[#EE4D2D]" /> 
                      全天行程
                   </label>

                   <div className="bg-slate-50 p-2 md:p-3 rounded-xl space-y-3 border border-slate-100">
                     <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 md:gap-3 text-sm">
                        <span className="w-8 text-slate-400 font-bold text-right shrink-0">開始</span>
                        <input type="date" value={selectedDate} onChange={e => handleStartDateChange(e.target.value)} className="flex-1 min-w-[120px] border border-slate-200 rounded-lg p-1.5 outline-none focus:border-orange-300 text-slate-700 bg-white" />
                        {!isAllDay && (
                          <div className="flex items-center gap-1 shrink-0">
                            <input type="time" id="start-time-input" value={newEventTime} onChange={e => { handleStartTimeChange(e.target.value); document.getElementById('start-time-input')?.blur(); }} className="w-24 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-orange-300 text-slate-700 bg-white" />
                            <button type="button" onClick={() => document.getElementById('start-time-input')?.blur()} className="text-xs bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-300 font-bold active:scale-95 transition whitespace-nowrap hidden md:block">確定</button>
                          </div>
                        )}
                     </div>
                     <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 md:gap-3 text-sm">
                        <span className="w-8 text-slate-400 font-bold text-right shrink-0">結束</span>
                        <input type="date" value={newEventEndDate} onChange={e => { setNewEventEndDate(e.target.value); setIsEndDateEdited(true); }} className="flex-1 min-w-[120px] border border-slate-200 rounded-lg p-1.5 outline-none focus:border-orange-300 text-slate-700 bg-white" min={selectedDate} />
                        {!isAllDay && (
                          <div className="flex items-center gap-1 shrink-0">
                            <input type="time" id="end-time-input" value={newEventEndTime} onChange={e => { setNewEventEndTime(e.target.value); setIsEndTimeEdited(true); document.getElementById('end-time-input')?.blur(); }} className="w-24 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-orange-300 text-slate-700 bg-white" />
                            <button type="button" onClick={() => document.getElementById('end-time-input')?.blur()} className="text-xs bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-300 font-bold active:scale-95 transition whitespace-nowrap hidden md:block">確定</button>
                          </div>
                        )}
                     </div>
                   </div>

                   <div className="flex items-center gap-3 text-sm border-b border-slate-100 pb-2">
                     <div className="w-8 flex justify-end shrink-0"><i className="fa-regular fa-bell text-slate-400"></i></div>
                     <select value={reminderMinutes} onChange={e => setReminderMinutes(Number(e.target.value))} className="flex-1 min-w-0 outline-none text-slate-700 font-bold bg-transparent cursor-pointer">
                        <option value={0}>不提醒</option>
                        <option value={10}>10 分鐘前通知</option>
                        <option value={30}>30 分鐘前通知</option>
                        <option value={60}>1 小時前通知</option>
                        <option value={1440}>1 天前通知</option>
                     </select>
                   </div>

                   <div className="space-y-3 border-b border-slate-100 pb-2">
                     <div className="flex items-center gap-3 text-sm">
                       <div className="w-8 flex justify-end shrink-0"><i className="fa-solid fa-user-plus text-slate-400"></i></div>
                       <input type="text" placeholder="邀請 Email (用逗號分隔)" value={attendeesStr} onChange={e => setAttendeesStr(e.target.value)} className="flex-1 min-w-0 outline-none text-slate-700 font-bold placeholder:font-normal text-xs md:text-sm" />
                     </div>
                     <div className="flex items-center gap-3 text-sm">
                       <div className="w-8 flex justify-end shrink-0">
                         <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center"><i className="fa-solid fa-video text-white text-xs"></i></div>
                       </div>
                       <div className="flex-1 min-w-0 overflow-hidden">
                         {!addMeetLink ? (
                           <button onClick={() => setAddMeetLink(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-2 px-3 rounded-xl transition text-xs flex items-center gap-2 active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis">
                             <i className="fa-solid fa-plus shrink-0"></i> <span className="truncate">新增 Google Meet 視訊會議</span>
                           </button>
                         ) : (
                           <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2 rounded-xl">
                             <div className="flex flex-col min-w-0 pr-2">
                               <span className="font-bold text-slate-700 text-xs md:text-sm truncate">Google Meet 視訊會議</span>
                               <span className="text-[10px] text-slate-400 truncate">儲存後將自動產生會議連結</span>
                             </div>
                             <button onClick={() => setAddMeetLink(false)} className="text-slate-400 hover:text-red-500 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition shrink-0" title="移除視訊會議">
                               <i className="fa-solid fa-xmark"></i>
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>

                   <div className="flex items-center gap-3 text-sm border-b border-slate-100 pb-2">
                     <div className="w-8 flex justify-end shrink-0"><i className="fa-solid fa-location-dot text-slate-400"></i></div>
                     <input type="text" placeholder="新增地點" value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} className="flex-1 min-w-0 outline-none text-slate-700 font-bold placeholder:font-normal" />
                   </div>

                   <div className="flex items-start gap-3 text-sm border-b border-slate-100 pb-2">
                     <div className="w-8 flex justify-end pt-1.5 shrink-0"><i className="fa-solid fa-align-left text-slate-400"></i></div>
                     <textarea placeholder="新增說明..." value={newEventDescription} onChange={e => setNewEventDescription(e.target.value)} className="flex-1 min-w-0 outline-none resize-none h-16 text-slate-700 py-1" />
                   </div>

                   <div className="flex gap-2 pt-1">
                      <button onClick={handleAddEvent} className="flex-1 bg-[#EE4D2D] text-white text-sm font-black py-3 rounded-xl hover:bg-[#d73211] shadow-md transition active:scale-95">
                        {editingEventId ? '儲存修改' : '儲存行程'}
                      </button>
                      <button onClick={() => { setShowAddForm(false); setEditingEventId(null); }} className="flex-1 bg-slate-100 text-slate-600 text-sm font-black py-3 rounded-xl hover:bg-slate-200 transition active:scale-95">取消</button>
                   </div>
                </div>
              ) : (
                <button onClick={openAddForm} className="w-full py-3.5 bg-orange-50 text-[#EE4D2D] font-black text-sm rounded-xl border border-orange-100 hover:bg-[#EE4D2D] hover:text-white transition flex items-center justify-center gap-2 shadow-sm group">
                  <i className="fa-solid fa-plus group-hover:rotate-90 transition-transform"></i> 新增 {selectedDate.replace(/-/g, '/')} 行程
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}