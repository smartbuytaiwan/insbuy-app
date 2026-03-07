import React, { useState, useMemo } from 'react';
import { Staff } from '../types';

interface Shift { id: string; name: string; start_time: string; end_time: string; }
interface LeaveTemplate { id: string; name: string; }
interface LeaveRecord { date: string; leave_type: string; note: string; }

interface StaffShiftCalendarProps {
  staff: Staff;
  onClose: () => void;
  onSave: (updatedStaff: Partial<Staff>) => Promise<void>;
}

export default function StaffShiftCalendar({ staff, onClose, onSave }: StaffShiftCalendarProps) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0); // 支援歷史與未來月份切換
  
  // 初始化狀態
  const [shifts, setShifts] = useState<Shift[]>(
    staff.shifts && staff.shifts.length > 0 ? staff.shifts : [
      { id: 's1', name: '早班', start_time: '09:00', end_time: '18:00' },
      { id: 's2', name: '晚班', start_time: '13:00', end_time: '22:00' }
    ]
  );
  
  // ★ 新增：自訂假別模板
  const [leaveTemplates, setLeaveTemplates] = useState<LeaveTemplate[]>(
    staff.leave_templates && staff.leave_templates.length > 0 ? staff.leave_templates : [
      { id: 'l1', name: '休息' }, { id: 'l2', name: '事假' }, { id: 'l3', name: '病假' }, { id: 'l4', name: '特休' }
    ]
  );
  
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(staff.leave_records || []);
  
  // ★ 新增：儲存每一天對應的班次 ID
  const [shiftAssignments, setShiftAssignments] = useState<Record<string, string>>(staff.shift_assignments || {});
  const [isSaving, setIsSaving] = useState(false);
  
  // ★ 新增：控制點擊日期後彈出的選擇視窗
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 當前選擇的月份設定
  const displayDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  // ★ 新增：計算當月排班與休假統計數據
  const stats = useMemo(() => {
    let totalDays = new Date(year, month + 1, 0).getDate();
    let scheduled = 0;
    let leaves = 0;
    let shiftCounts: Record<string, number> = {};
    let leaveCounts: Record<string, number> = {};

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const leave = leaveRecords.find(l => l.date === dateStr);
      
      if (leave) {
        leaves++;
        leaveCounts[leave.leave_type] = (leaveCounts[leave.leave_type] || 0) + 1;
      } else if (shiftAssignments[dateStr]) {
        scheduled++;
        const shiftName = shifts.find(s => s.id === shiftAssignments[dateStr])?.name || '已排班';
        shiftCounts[shiftName] = (shiftCounts[shiftName] || 0) + 1;
      }
    }
    return { totalDays, scheduled, leaves, unscheduled: totalDays - scheduled - leaves, shiftCounts, leaveCounts };
  }, [year, month, leaveRecords, shiftAssignments, shifts]);

  // 計算日曆網格
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; 

    for (let i = 0; i < startDayOfWeek; i++) days.push(null); 
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [year, month]);

  // --- 班次與假別模板管理 ---
  const handleAddShift = () => setShifts([...shifts, { id: `shift_${Date.now()}`, name: '新班次', start_time: '10:00', end_time: '19:00' }]);
  const handleUpdateShift = (index: number, field: string, value: string) => {
    const newShifts = [...shifts]; newShifts[index] = { ...newShifts[index], [field]: value }; setShifts(newShifts);
  };
  const handleDeleteShift = (index: number) => setShifts(shifts.filter((_, i) => i !== index));

  const handleAddLeaveTemplate = () => setLeaveTemplates([...leaveTemplates, { id: `leave_${Date.now()}`, name: '新假別' }]);
  const handleUpdateLeaveTemplate = (index: number, value: string) => {
    const newLeaves = [...leaveTemplates]; newLeaves[index].name = value; setLeaveTemplates(newLeaves);
  };
  const handleDeleteLeaveTemplate = (index: number) => setLeaveTemplates(leaveTemplates.filter((_, i) => i !== index));

  // --- 點擊日曆設定 ---
  const handleDateClick = (dateStr: string) => setSelectedDate(dateStr);
  
  const handleApplySetting = (type: 'SHIFT' | 'LEAVE' | 'CLEAR', idOrName: string = '') => {
    if (!selectedDate) return;
    
    if (type === 'CLEAR') {
      const newLeaves = leaveRecords.filter(l => l.date !== selectedDate);
      const newAssignments = { ...shiftAssignments };
      delete newAssignments[selectedDate];
      setLeaveRecords(newLeaves);
      setShiftAssignments(newAssignments);
    } else if (type === 'SHIFT') {
      // 若設定排班，自動清除該日的休假紀錄
      setLeaveRecords(leaveRecords.filter(l => l.date !== selectedDate));
      setShiftAssignments({ ...shiftAssignments, [selectedDate]: idOrName });
    } else if (type === 'LEAVE') {
      // 若設定休假，自動清除該日的排班紀錄
      const newAssignments = { ...shiftAssignments };
      delete newAssignments[selectedDate];
      setShiftAssignments(newAssignments);
      setLeaveRecords([...leaveRecords.filter(l => l.date !== selectedDate), { date: selectedDate, leave_type: idOrName, note: '' }]);
    }
    setSelectedDate(null); // 關閉選擇彈窗
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ ...staff, shifts, leave_templates: leaveTemplates, leave_records: leaveRecords, shift_assignments: shiftAssignments });
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-4 md:p-6 flex flex-col max-h-[95vh] animate-fade-in-up">
        
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
          <h3 className="text-xl font-black text-slate-800"><i className="fa-solid fa-calendar-alt text-purple-600 mr-2"></i>進階排班與請假系統：{staff.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition"><i className="fa-solid fa-xmark text-2xl"></i></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 md:space-y-6 relative">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 班次設定區 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <div className="flex justify-between items-center mb-3">
                 <label className="font-bold text-slate-700 text-sm">1. 自訂班次模板</label>
                 <button onClick={handleAddShift} className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200"><i className="fa-solid fa-plus mr-1"></i>新增班次</button>
               </div>
               <div className="flex flex-col gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                 {shifts.map((shift, idx) => (
                   <div key={shift.id} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg shrink-0">
                     <input type="text" value={shift.name} onChange={e => handleUpdateShift(idx, 'name', e.target.value)} className="w-16 font-bold text-xs outline-none border-b border-dashed border-slate-300 focus:border-purple-500 text-center" />
                     <div className="flex items-center gap-1 flex-1 justify-center">
                       <input type="text" value={shift.start_time} onChange={e => handleUpdateShift(idx, 'start_time', e.target.value)} className="w-12 text-xs text-center outline-none bg-slate-50 rounded" placeholder="10:00" />
                       <span className="text-slate-400 text-xs">-</span>
                       <input type="text" value={shift.end_time} onChange={e => handleUpdateShift(idx, 'end_time', e.target.value)} className="w-12 text-xs text-center outline-none bg-slate-50 rounded" placeholder="19:00" />
                     </div>
                     <button onClick={() => handleDeleteShift(idx)} className="text-red-400 hover:text-red-600 px-1"><i className="fa-solid fa-trash-can"></i></button>
                   </div>
                 ))}
               </div>
            </div>

            {/* 假別設定區 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <div className="flex justify-between items-center mb-3">
                 <label className="font-bold text-slate-700 text-sm">2. 自訂假別模板</label>
                 <button onClick={handleAddLeaveTemplate} className="text-xs bg-[#FFF4F2] text-[#EE4D2D] px-3 py-1.5 rounded-lg font-bold hover:bg-[#ffbba5] border border-[#ffbba5]"><i className="fa-solid fa-plus mr-1"></i>新增假別</button>
               </div>
               <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar content-start">
                 {leaveTemplates.map((leave, idx) => (
                   <div key={leave.id} className="flex items-center gap-1 bg-white px-2 py-1.5 border border-slate-200 rounded-lg shadow-sm">
                     <input type="text" value={leave.name} onChange={e => handleUpdateLeaveTemplate(idx, e.target.value)} className="w-12 font-bold text-xs outline-none text-center text-slate-700" />
                     <button onClick={() => handleDeleteLeaveTemplate(idx)} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* 統計與月份切換區 */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 border-b border-purple-100 pb-3">
               <div className="flex items-center bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                  <button onClick={() => setMonthOffset(prev => prev - 1)} className="px-3 py-1.5 text-slate-500 hover:text-purple-600 transition border-r border-slate-100"><i className="fa-solid fa-chevron-left"></i></button>
                  <span className="px-4 font-black text-slate-800 w-32 text-center">{year} 年 {month + 1} 月</span>
                  <button onClick={() => setMonthOffset(prev => prev + 1)} className="px-3 py-1.5 text-slate-500 hover:text-purple-600 transition border-l border-slate-100"><i className="fa-solid fa-chevron-right"></i></button>
                  <button onClick={() => setMonthOffset(0)} className="ml-2 px-3 py-1 text-xs font-bold bg-purple-100 text-purple-700 rounded hover:bg-purple-200">回到本月</button>
               </div>
               <div className="flex gap-4 md:gap-6 text-sm w-full md:w-auto justify-between md:justify-end">
                  <div className="text-center"><span className="block text-slate-500 text-[10px] md:text-xs font-bold">總天數</span><span className="font-black text-slate-700 text-lg">{stats.totalDays}</span></div>
                  <div className="text-center"><span className="block text-slate-500 text-[10px] md:text-xs font-bold">已排班</span><span className="font-black text-purple-600 text-lg">{stats.scheduled}</span></div>
                  <div className="text-center"><span className="block text-slate-500 text-[10px] md:text-xs font-bold">休假</span><span className="font-black text-red-500 text-lg">{stats.leaves}</span></div>
                  <div className="text-center"><span className="block text-slate-500 text-[10px] md:text-xs font-bold">未排程</span><span className="font-black text-orange-500 text-lg">{stats.unscheduled}</span></div>
               </div>
             </div>
             
             {/* 班次與假別細節統計 */}
             <div className="flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-xs font-bold">
                {Object.entries(stats.shiftCounts).map(([name, count]) => (
                   <span key={`s-${name}`} className="bg-white text-purple-700 px-2 py-1 rounded shadow-sm border border-purple-100">{name} : {count} 天</span>
                ))}
                {Object.entries(stats.leaveCounts).map(([name, count]) => (
                   <span key={`l-${name}`} className="bg-white text-red-600 px-2 py-1 rounded shadow-sm border border-red-100">{name} : {count} 天</span>
                ))}
             </div>
          </div>

          {/* 日曆排班區 */}
          <div>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-[10px] md:text-xs font-bold text-slate-500">
                {['一', '二', '三', '四', '五', '六', '日'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((dateStr, idx) => {
                  if (!dateStr) return <div key={`empty-${idx}`} className="h-20 md:h-24 border-b border-r border-slate-100 bg-slate-50/50"></div>;
                  
                  const dayNum = dateStr.split('-')[2];
                  const leave = leaveRecords.find(l => l.date === dateStr);
                  const assignedShiftId = shiftAssignments[dateStr];
                  const shift = shifts.find(s => s.id === assignedShiftId);
                  
                  return (
                    <div key={dateStr} onClick={() => handleDateClick(dateStr)} className="h-20 md:h-24 border-b border-r border-slate-100 p-1 flex flex-col cursor-pointer hover:bg-purple-50 transition relative group">
                      <span className={`text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full ${dateStr === selectedDate ? 'bg-purple-600 text-white shadow-md' : 'text-slate-700'}`}>{dayNum}</span>
                      
                      <div className="mt-auto w-full">
                        {leave ? (
                          <div className="bg-red-50 border border-red-200 rounded p-1 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] font-black text-red-600 truncate w-full text-center">{leave.leave_type}</span>
                          </div>
                        ) : shift ? (
                          <div className="bg-purple-100 border border-purple-200 rounded p-1 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] font-black text-purple-800 truncate w-full text-center">{shift.name}</span>
                            <span className="text-[9px] text-purple-600 font-bold scale-90 md:scale-100">{shift.start_time}-{shift.end_time}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-300 text-center opacity-0 group-hover:opacity-100 pb-1">點擊設定</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* ★ 點擊日期後的選擇彈窗 (獨立置中) */}
          {selectedDate && (
             <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
               <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-slate-100 p-4 md:p-6 w-full max-w-sm animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                     <h4 className="font-black text-slate-800"><i className="fa-regular fa-calendar-check text-purple-600 mr-2"></i>設定排班 ({selectedDate})</h4>
                     <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-red-500 transition"><i className="fa-solid fa-xmark text-xl"></i></button>
                  </div>
                  
                  <div className="space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-2 block">1. 選擇班次</label>
                       <div className="grid grid-cols-2 gap-2">
                         {shifts.map(s => (
                           <button key={s.id} onClick={() => handleApplySetting('SHIFT', s.id)} className={`p-2 border rounded-xl text-sm font-bold transition flex flex-col items-center gap-1 ${shiftAssignments[selectedDate] === s.id ? 'bg-purple-600 border-purple-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50'}`}>
                              <span>{s.name}</span>
                              <span className="opacity-70 text-[10px]">{s.start_time}-{s.end_time}</span>
                           </button>
                         ))}
                       </div>
                     </div>
                     
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-2 block">2. 選擇假別</label>
                       <div className="flex flex-wrap gap-2">
                         {leaveTemplates.map(l => (
                           <button key={l.id} onClick={() => handleApplySetting('LEAVE', l.name)} className={`px-4 py-2 border rounded-xl text-sm font-bold transition ${leaveRecords.find(rec => rec.date === selectedDate)?.leave_type === l.name ? 'bg-red-500 border-red-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-red-300 hover:bg-red-50'}`}>
                              {l.name}
                           </button>
                         ))}
                       </div>
                     </div>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-slate-100">
                     <button onClick={() => handleApplySetting('CLEAR')} className="w-full py-2.5 bg-slate-100 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-200 hover:text-slate-700 transition">
                        <i className="fa-solid fa-eraser mr-1"></i>清除此日設定 (恢復空白)
                     </button>
                  </div>
               </div>
             </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4 shrink-0">
          <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition shadow-md">{isSaving ? '儲存中...' : '儲存排班設定'}</button>
          <button onClick={onClose} className="px-6 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition">取消</button>
        </div>
      </div>
    </div>
  );
}