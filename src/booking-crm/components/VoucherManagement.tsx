import React, { useState, useEffect } from 'react';
import { Voucher, Service } from '../types';
import { BookingAPI } from '../api';

export default function VoucherManagement({ shopId }: { shopId: string }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Voucher>>({ code: '', buyer_id: '', service_id: '', total_count: 1, remaining_count: 1, expire_at: '' });

  useEffect(() => { 
    fetchVouchers(); 
    BookingAPI.getServices(shopId).then(res => setServices(res || [])).catch(()=>{});
  }, [shopId]);

  const fetchVouchers = async () => {
    try { setVouchers(await BookingAPI.getVouchers(shopId) || []); } 
    catch (e) { console.error(e); }
  };

  const generateCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    setForm({ ...form, code: `VOU-${randomCode}` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.buyer_id) return alert('請填寫核銷碼與買家帳號');
    try {
      if (form.id) await BookingAPI.updateVoucher(form.id, form);
      else await BookingAPI.createVoucher({ 
        ...form, shop_id: shopId, id: `vou-${Date.now()}`, created_at: new Date().toISOString() 
      });
      setIsEditing(false);
      setForm({ code: '', buyer_id: '', service_id: '', total_count: 1, remaining_count: 1, expire_at: '' });
      fetchVouchers();
    } catch (e) { alert('儲存失敗'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要作廢此套券嗎？')) return;
    try { await BookingAPI.deleteVoucher(id); fetchVouchers(); } 
    catch (e) { alert('作廢失敗'); }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">套券發行與管理</h3>
        {!isEditing && (
          <button onClick={() => { setIsEditing(true); generateCode(); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition">
            <i className="fa-solid fa-plus mr-2"></i>發行新套券
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">綁定買家 ID 或 手機號碼 *</label>
              <input type="text" required value={form.buyer_id} onChange={e => setForm({...form, buyer_id: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" placeholder="例如：0912345678" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">專屬核銷碼 *</label>
              <div className="flex gap-2">
                <input type="text" required value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500 font-mono text-purple-700 font-bold" />
                <button type="button" onClick={generateCode} className="px-3 bg-slate-200 rounded-lg text-xs font-bold hover:bg-slate-300">自動產生</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">綁定服務項目 (選填，未選代表全店通用儲值金)</label>
              <select value={form.service_id || ''} onChange={e => setForm({...form, service_id: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500 bg-white">
                <option value="">不指定 (通用儲值)</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">有效期限 (選填)</label>
              <input type="date" value={form.expire_at || ''} onChange={e => setForm({...form, expire_at: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">總額度/總次數 *</label>
              <input type="number" required min="1" value={form.total_count} onChange={e => setForm({...form, total_count: Number(e.target.value), remaining_count: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">剩餘額度/次數</label>
              <input type="number" required min="0" max={form.total_count} value={form.remaining_count} onChange={e => setForm({...form, remaining_count: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-slate-200 mt-4">
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">確認發行</button>
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">取消</button>
          </div>
        </form>
      )}

      {vouchers.length === 0 && !isEditing ? (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">尚未發行任何套券</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vouchers.map(vou => {
             const srvName = services.find(s => s.id === vou.service_id)?.name || '全店通用';
             const isExpired = vou.expire_at && new Date(vou.expire_at) < new Date();
             return (
               <div key={vou.id} className={`bg-white border p-4 rounded-xl shadow-sm relative overflow-hidden ${isExpired || vou.remaining_count === 0 ? 'border-slate-200 opacity-60' : 'border-purple-200 hover:shadow-md transition'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-sm">{vou.code}</span>
                   {vou.remaining_count === 0 ? <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-bold">已用盡</span> : null}
                 </div>
                 <div className="text-xs font-bold text-slate-700 mb-1">買家：{vou.buyer_id}</div>
                 <div className="text-xs text-slate-500 mb-2">綁定：{srvName}</div>
                 
                 <div className="w-full bg-slate-100 rounded-full h-2 mb-1 mt-3">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(vou.remaining_count / vou.total_count) * 100}%` }}></div>
                 </div>
                 <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>剩餘 {vou.remaining_count}</span>
                    <span>總共 {vou.total_count}</span>
                 </div>
                 
                 <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">{vou.expire_at ? `期限: ${vou.expire_at}` : '無期限'}</span>
                    <button onClick={() => { setForm(vou); setIsEditing(true); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-xs font-bold text-purple-600 hover:underline">編輯 / 扣次</button>
                 </div>
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}