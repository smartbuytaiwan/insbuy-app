import React, { useState, useEffect } from 'react';
import { Resource } from '../types';
import { BookingAPI } from '../api';

export default function ResourceManagement({ shopId }: { shopId: string }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Resource>>({ name: '', quantity: 1 });

  useEffect(() => { fetchResources(); }, [shopId]);

  const fetchResources = async () => {
    try { setResources(await BookingAPI.getResources(shopId) || []); } 
    catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.quantity) return alert('請填寫完整名稱與數量');
    try {
      if (form.id) await BookingAPI.updateResource(form.id, form);
      else await BookingAPI.createResource({ ...form, shop_id: shopId, id: `res-${Date.now()}` });
      setIsEditing(false);
      setForm({ name: '', quantity: 1 });
      fetchResources();
    } catch (e) { alert('儲存失敗'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此設備/場地嗎？')) return;
    try { await BookingAPI.deleteResource(id); fetchResources(); } 
    catch (e) { alert('刪除失敗'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">設備與場地管理 (防撞期資源)</h3>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition">
            <i className="fa-solid fa-plus mr-2"></i>新增資源
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">設備/場地名稱 *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" placeholder="例：雷射儀器 / VIP單人包廂" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">總數量 *</label>
              <input type="number" required min="1" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">儲存</button>
            <button type="button" onClick={() => { setIsEditing(false); setForm({ name: '', quantity: 1 }); }} className="px-6 py-2 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">取消</button>
          </div>
        </form>
      )}

      {resources.length === 0 && !isEditing ? (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">尚未建立任何共用資源</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map(res => (
            <div key={res.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800">{res.name}</h4>
                <div className="text-xs text-slate-500 mt-1">總數量：<span className="font-black text-purple-600">{res.quantity}</span> 個/間</div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => { setForm(res); setIsEditing(true); }} className="text-xs font-bold text-purple-600 hover:underline">編輯</button>
                <button onClick={() => handleDelete(res.id)} className="text-xs font-bold text-red-500 hover:underline">刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}