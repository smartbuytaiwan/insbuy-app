import React, { useState, useEffect } from 'react';
import { Staff } from '../types';
import { BookingAPI } from '../api';
import { uploadImageToSupabase } from '../../supabaseClient';
import StaffShiftCalendar from './StaffShiftCalendar.tsx'; // ★ 新增引入

export default function StaffManagement({ shopId }: { shopId: string }) {
  const defaultSchedule = {
    "1": { active: true, start: "10:00", end: "20:00" },
    "2": { active: true, start: "10:00", end: "20:00" },
    "3": { active: true, start: "10:00", end: "20:00" },
    "4": { active: true, start: "10:00", end: "20:00" },
    "5": { active: true, start: "10:00", end: "20:00" },
    "6": { active: true, start: "10:00", end: "20:00" },
    "0": { active: false, start: "10:00", end: "20:00" }
  };

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<Partial<Staff>>({ name: '', nickname: '', bio: '', avatar_url: '', work_schedule: defaultSchedule });
  const [selectedStaffForShift, setSelectedStaffForShift] = useState<Staff | null>(null); // ★ 控制進階排班日曆的彈窗

  useEffect(() => { fetchStaff(); }, [shopId]);

  const fetchStaff = async () => {
    setIsLoading(true);
    try { setStaffList(await BookingAPI.getStaff(shopId) || []); } 
    catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('照片大小不能超過 2MB！');
    setIsUploading(true);
    try {
      const url = await uploadImageToSupabase(file, 'images');
      if (url) setForm({ ...form, avatar_url: url });
    } catch (error) { alert('圖片上傳失敗'); } 
    finally { setIsUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert('請填寫員工姓名');
    try {
      if (form.id) await BookingAPI.updateStaff(form.id, form);
      else await BookingAPI.createStaff({ ...form, shop_id: shopId, id: `stf-${Date.now()}` });
      setIsEditing(false);
      setForm({ name: '', nickname: '', bio: '', avatar_url: '', work_schedule: defaultSchedule });
      fetchStaff();
    } catch (e) { alert('儲存失敗'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此員工嗎？')) return;
    try { await BookingAPI.deleteStaff(id); fetchStaff(); } 
    catch (e) { alert('刪除失敗'); }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">員工與排班管理</h3>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition">
            <i className="fa-solid fa-plus mr-2"></i>新增員工
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">員工姓名 *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">對外暱稱 (選填)</label>
              <input type="text" value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-2">員工頭像照 (限制 2MB 以下，建議正方形 1:1)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                  {form.avatar_url ? <img src={form.avatar_url} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-slate-300 text-2xl"></i>}
                </div>
                <div>
                  <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition inline-block ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                    {isUploading ? '上傳中...' : (form.avatar_url ? '更換照片' : '選擇照片並上傳')}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">專長與簡介</label>
              <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500 resize-none h-20" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">儲存</button>
            <button type="button" onClick={() => { setIsEditing(false); setForm({ name: '', nickname: '', bio: '', avatar_url: '', work_schedule: defaultSchedule }); }} className="px-6 py-2 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">取消</button>
          </div>
        </form>
      )}

      {isLoading ? <div className="text-center py-10 text-slate-400">載入中...</div> : 
       staffList.length === 0 && !isEditing ? <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">尚未建立任何員工資料</div> : 
       (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {staffList.map(staff => (
            <div key={staff.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-slate-200">
                <img src={staff.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.nickname || staff.name)}&background=random`} alt={staff.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 truncate">{staff.nickname || staff.name}</h4>
                {staff.nickname && <div className="text-xs text-slate-400 mb-1 truncate">本名：{staff.name}</div>}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={() => setSelectedStaffForShift(staff)} className="text-xs font-bold text-white bg-[#EE4D2D] hover:bg-[#d73211] px-3 py-1.5 rounded shadow-sm transition"><i className="fa-solid fa-calendar-plus mr-1"></i>日曆排班與休假設定</button>
                  <button onClick={() => { setForm({...staff, work_schedule: staff.work_schedule || defaultSchedule}); setIsEditing(true); window.scrollTo(0,0); }} className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition"><i className="fa-solid fa-pen"></i> 基本編輯</button>
                  <button onClick={() => handleDelete(staff.id)} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition"><i className="fa-solid fa-trash"></i> 刪除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ★ 載入新增的進階排班日曆元件 */}
      {selectedStaffForShift && (
        <StaffShiftCalendar 
           staff={selectedStaffForShift} 
           onClose={() => setSelectedStaffForShift(null)} 
           onSave={async (updatedStaff) => {
              try {
                 await BookingAPI.updateStaff(updatedStaff.id!, updatedStaff);
                 fetchStaff(); // 儲存後刷新名單
              } catch (e) {
                 alert('排班儲存失敗');
              }
           }} 
        />
      )}
    </div>
  );
}