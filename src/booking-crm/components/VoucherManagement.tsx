import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { BookingAPI } from '../api';

export default function VoucherManagement({ shopId }: { shopId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // 表單：包含類型(VOUCHER/WALLET)、名稱、圖片、價格、次數/額度、適用服務、期限
  const [form, setForm] = useState<any>({
     type: 'VOUCHER', name: '', image_url: '', price: 0, value: 1, service_ids: [], expire_days: ''
  });

  useEffect(() => { 
    fetchPlans(); 
    BookingAPI.getServices(shopId).then(res => setServices(res || [])).catch(()=>{});
  }, [shopId]);

  const fetchPlans = async () => {
    // 若後端尚未建立 API，我們前端先模擬或使用本地暫存來示範
    try {
        const res = await fetch(`http://127.0.0.1:3001/api/booking/voucher-plans/${shopId}`);
        if(res.ok) {
            const data = await res.json();
            setPlans(data || []);
        } else {
            // 備用：若 API 還沒開，先從 LocalStorage 讀取做展示
            const local = localStorage.getItem(`insbuy_voucher_plans_${shopId}`);
            if(local) setPlans(JSON.parse(local));
        }
    } catch (e) { console.error(e); }
  };

  const handleToggleService = (srvId: string) => {
      setForm((prev: any) => {
          const isSelected = prev.service_ids.includes(srvId);
          return { ...prev, service_ids: isSelected ? prev.service_ids.filter((id: string) => id !== srvId) : [...prev.service_ids, srvId] };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price < 0 || form.value <= 0) return alert('請確認名稱、價格與數值填寫正確！');
    
    const newPlan = { ...form, shop_id: shopId, id: form.id || `vplan-${Date.now()}`, is_active: true };
    
    try {
      // 嘗試呼叫 API (若後端尚未實作完成，則退回 LocalStorage)
      const res = await fetch(`http://127.0.0.1:3001/api/booking/voucher-plans`, {
         method: form.id ? 'PUT' : 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(newPlan)
      });
      
      if(res.ok) {
          fetchPlans();
      } else {
          // 備用機制
          let updated = [...plans];
          if(form.id) updated = updated.map(p => p.id === form.id ? newPlan : p);
          else updated.push(newPlan);
          setPlans(updated);
          localStorage.setItem(`insbuy_voucher_plans_${shopId}`, JSON.stringify(updated));
      }
      setIsEditing(false);
      setForm({ type: 'VOUCHER', name: '', image_url: '', price: 0, value: 1, service_ids: [], expire_days: '' });
      alert('方案建立成功！客人現在可在您的首頁直接購買！\n(系統將自動為每位購買客生成唯一流水編號)');
    } catch (e) { alert('儲存失敗'); }
  };

  const toggleStatus = (id: string, currentStatus: boolean) => {
      // 實務上會打 API 更新狀態，此處簡化操作
      const updated = plans.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p);
      setPlans(updated);
      localStorage.setItem(`insbuy_voucher_plans_${shopId}`, JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full">
      <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
        <div>
           <h3 className="text-lg font-bold text-purple-800"><i className="fa-solid fa-gift mr-2"></i>上架套券與儲值方案</h3>
           <p className="text-xs text-purple-600 mt-1">建立方案後，客人可直接在您的預約首頁下單購買，系統會自動產出專屬獨立票號！</p>
        </div>
        {!isEditing && (
          <button onClick={() => { setIsEditing(true); setForm({ type: 'VOUCHER', name: '', image_url: '', price: 0, value: 1, service_ids: [], expire_days: '' }); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition">
            <i className="fa-solid fa-plus mr-2"></i>新增販售方案
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-purple-200 space-y-5 animate-fade-in-up">
          <div className="flex gap-4 border-b border-slate-100 pb-4">
             <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition ${form.type === 'VOUCHER' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                <input type="radio" checked={form.type === 'VOUCHER'} onChange={() => setForm({...form, type: 'VOUCHER', service_ids: []})} className="hidden" />
                <i className="fa-solid fa-ticket"></i> 服務套券
             </label>
             <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition ${form.type === 'WALLET' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500'}`}>
                <input type="radio" checked={form.type === 'WALLET'} onChange={() => setForm({...form, type: 'WALLET', service_ids: []})} className="hidden" />
                <i className="fa-solid fa-wallet"></i> 儲值金
             </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{form.type === 'VOUCHER' ? '套券名稱 *' : '方案名稱 *'}</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-purple-500 font-bold" placeholder={form.type === 'VOUCHER' ? "例如：美甲單色 5 次套券" : "例如：充值 5000 享 6000"} />
            </div>
            
            <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">販售價格 (NT$) *</label>
                  <input type="number" required min="0" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-purple-500 font-black text-slate-800" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{form.type === 'VOUCHER' ? '可使用總次數 *' : '可獲得總儲值金 *'}</label>
                  <input type="number" required min="1" value={form.value} onChange={e => setForm({...form, value: Number(e.target.value)})} className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-purple-500 font-black text-slate-800" />
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">封面宣傳照 URL (選填)</label>
              <input type="text" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-purple-500" placeholder="貼上圖片網址" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">有效期限 (選填)</label>
              <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 bg-white focus-within:border-purple-500">
                 購買後 <input type="number" value={form.expire_days || ''} onChange={e => setForm({...form, expire_days: e.target.value ? Number(e.target.value) : ''})} className="w-16 p-2.5 outline-none text-center font-bold text-purple-700" placeholder="-" /> 天內有效
              </div>
              <span className="text-[10px] text-slate-400">留空代表無限期</span>
            </div>
            
            <div className="col-span-full">
              <label className="block text-xs font-bold text-slate-500 mb-2">{form.type === 'VOUCHER' ? '選擇此套券可兌換的服務 (可複選) *' : '綁定服務 (若全店通用則免選)'}</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                 {services.map(s => (
                    <label key={s.id} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition ${form.service_ids.includes(s.id) ? 'bg-purple-50 border-purple-300' : 'bg-white hover:bg-slate-50'}`}>
                       <input type="checkbox" checked={form.service_ids.includes(s.id)} onChange={() => handleToggleService(s.id)} className="w-4 h-4 accent-purple-600" />
                       <span className="text-sm font-bold text-slate-700 truncate">{s.name}</span>
                    </label>
                 ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="submit" className="px-8 py-3 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 shadow-md">上架販售</button>
            <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">取消</button>
          </div>
        </form>
      )}

      {plans.length === 0 && !isEditing ? (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl font-bold bg-white">目前無上架任何販售方案</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex transition ${plan.is_active ? 'border-purple-200 hover:shadow-md' : 'border-slate-200 opacity-60 grayscale'}`}>
               <div className="w-1/3 bg-slate-100 border-r border-slate-100 flex items-center justify-center text-slate-300 relative">
                  {plan.image_url ? <img src={plan.image_url} className="w-full h-full object-cover" /> : <i className="fa-solid fa-image text-3xl"></i>}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-black text-white ${plan.type === 'VOUCHER' ? 'bg-purple-500' : 'bg-orange-500'}`}>
                     {plan.type === 'VOUCHER' ? '套券' : '儲值'}
                  </div>
               </div>
               <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                     <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-800 line-clamp-1 text-lg">{plan.name}</h4>
                        <button onClick={() => toggleStatus(plan.id, plan.is_active)} className={`text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap border ${plan.is_active ? 'bg-green-50 text-green-600 border-green-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}>
                           {plan.is_active ? '✅ 架上中' : '❌ 已下架'}
                        </button>
                     </div>
                     <div className="text-sm text-slate-500 font-bold mb-2">售價 <span className="text-[#EE4D2D] text-lg font-black">${plan.price.toLocaleString()}</span></div>
                     <div className="text-xs text-slate-400 space-y-1">
                        <div>內含：{plan.type === 'VOUCHER' ? `${plan.value} 次兌換額度` : `$${plan.value} 儲值金`}</div>
                        <div>期限：{plan.expire_days ? `${plan.expire_days} 天` : '無期限'}</div>
                        {plan.service_ids.length > 0 && <div className="truncate">限用：{plan.service_ids.length} 項指定服務</div>}
                     </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                     <button onClick={() => { setForm(plan); setIsEditing(true); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-xs font-bold text-slate-500 hover:text-purple-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">編輯內容</button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}