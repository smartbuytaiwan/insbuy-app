import React, { useState, useEffect } from 'react';
import { Staff } from '../types';
import { BookingAPI } from '../api';
import { uploadImageToSupabase } from '../../supabaseClient';

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
            
            {/* ★ 排班設定區域 */}
            <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
              <label className="block text-sm font-black text-slate-700 mb-3"><i className="fa-regular fa-calendar-check text-purple-600 mr-2"></i>常態上班時間排班</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                  const schedule = form.work_schedule?.[String(day)] || { active: false, start: '10:00', end: '20:00' };
                  return (
                    <div key={day} className={`flex items-center justify-between p-2 rounded-lg border ${schedule.active ? 'bg-white border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                      <label className="flex items-center gap-2 cursor-pointer w-24 shrink-0">
                        <input type="checkbox" checked={schedule.active} className="w-4 h-4 accent-purple-600" onChange={e => setForm({ ...form, work_schedule: { ...form.work_schedule, [String(day)]: { ...schedule, active: e.target.checked } } })} />
                        <span className="text-sm font-bold text-slate-700">{dayNames[day]}</span>
                      </label>
                      <div className="flex items-center gap-1 flex-1">
                        <input type="time" value={schedule.start} disabled={!schedule.active} onChange={e => setForm({ ...form, work_schedule: { ...form.work_schedule, [String(day)]: { ...schedule, start: e.target.value } } })} className="bg-transparent border border-slate-200 rounded px-1 py-0.5 text-xs outline-none focus:border-purple-500" />
                        <span className="text-slate-400 text-xs">-</span>
                        <input type="time" value={schedule.end} disabled={!schedule.active} onChange={e => setForm({ ...form, work_schedule: { ...form.work_schedule, [String(day)]: { ...schedule, end: e.target.value } } })} className="bg-transparent border border-slate-200 rounded px-1 py-0.5 text-xs outline-none focus:border-purple-500" />
                      </div>
                    </div>
                  )
                })}
              </div>
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
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setForm({...staff, work_schedule: staff.work_schedule || defaultSchedule}); setIsEditing(true); window.scrollTo(0,0); }} className="text-xs font-bold text-purple-600 hover:underline">編輯</button>
                  <button onClick={() => handleDelete(staff.id)} className="text-xs font-bold text-red-500 hover:underline">刪除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}