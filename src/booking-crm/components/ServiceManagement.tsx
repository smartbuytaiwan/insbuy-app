import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { BookingAPI } from '../api';
import { uploadImageToSupabase } from '../../supabaseClient';
import ServiceCategoryModal from './ServiceCategoryModal'; // ★ 新增：引入分類管理彈窗

export default function ServiceManagement({ shopId }: { shopId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  // ★ 新增：定義初始狀態，包含分類與加購項目
  const initialFormState: Partial<Service> = {
    name: '', price: 0, duration_minutes: 60, buffer_minutes: 15, requires_deposit: false, deposit_amount: 0, is_active: true, image_url: '', category: '', addons: [], allowed_times: [], staff_ids: []
  };
  const [form, setForm] = useState<Partial<Service>>(initialFormState);
  const [categories, setCategories] = useState<string[]>([]); // ★ 新增：儲存從後台抓取的分類列表
  const [staffList, setStaffList] = useState<any[]>([]); // ★ 新增：員工名單供勾選
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false); // ★ 新增：控制分類彈窗開關

  // ★ 新增：處理加購項目的三個操作函數
  const handleAddAddon = () => setForm({ ...form, addons: [...(form.addons || []), { name: '', price: 0, duration_minutes: 0 }] });
  const handleUpdateAddon = (index: number, field: string, value: any) => {
    const newAddons = [...(form.addons || [])];
    newAddons[index] = { ...newAddons[index], [field]: value };
    setForm({ ...form, addons: newAddons });
  };
  const handleRemoveAddon = (index: number) => {
    const newAddons = [...(form.addons || [])];
    newAddons.splice(index, 1);
    setForm({ ...form, addons: newAddons });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      return alert('照片大小不能超過 2MB，請重新選擇較小的圖片！');
    }

    setIsUploading(true);
    try {
      const url = await uploadImageToSupabase(file, 'images');
      if (url) setForm({ ...form, image_url: url });
    } catch (error) {
      alert('圖片上傳失敗');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [shopId]);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const data = await BookingAPI.getServices(shopId);
      setServices(data || []);
      
      const staffData = await BookingAPI.getStaff(shopId);
      setStaffList(staffData || []);

      // ★ 新增：同時取得店家設定中的分類列表
      const settingsRes = await fetch(`http://127.0.0.1:3001/api/booking/settings/${shopId}`);
      if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setCategories(settings?.service_categories || []); // ★ 修正：確保即使沒設定過，也會收到空陣列
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price === undefined) return alert('請填寫完整名稱與價格');
    
    try {
      if (form.id) {
        await BookingAPI.updateService(form.id, form);
      } else {
        await BookingAPI.createService({ ...form, shop_id: shopId, id: `srv-${Date.now()}` });
      }
      setIsEditing(false);
      setForm(initialFormState);
      fetchServices();
    } catch (e) {
      alert('儲存失敗，請檢查網路連線');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此服務嗎？')) return;
    try {
      await BookingAPI.deleteService(id);
      fetchServices();
    } catch (e) {
      alert('刪除失敗');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">服務項目管理</h3>
        {!isEditing && (
          <div className="flex gap-3">
             {/* ★ 新增：紅框處的「管理分類」按鈕 */}
             <button onClick={() => setIsCategoryModalOpen(true)} className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition">
                <i className="fa-solid fa-folder-open mr-2"></i>管理分類
             </button>
             <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition">
                <i className="fa-solid fa-plus mr-2"></i>新增服務
             </button>
          </div>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 border-b border-slate-200 pb-4 mb-2">
              <label className="block text-xs font-bold text-slate-500 mb-2">服務宣傳照 (限制 2MB 以下，建議比例 1:1 正方形)</label>
              <div className="flex items-center gap-4">
                {/* ★ 修正：將 w-24 h-16 改為 w-20 h-20 強制 1:1 */}
                <div className="w-20 h-20 rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Service" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-image text-slate-300 text-2xl"></i>
                  )}
                </div>
                <div className="flex-1">
                  <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition inline-block ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                    {isUploading ? '上傳中，請稍候...' : (form.image_url ? '更換照片' : '選擇照片並上傳')}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">所屬大分類 *</label>
              <select required value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500 bg-white">
                 <option value="" disabled>請選擇分類</option>
                 {categories.length === 0 && <option value="未分類">未分類 (請先至右上角管理分類新增)</option>}
                 {categories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">服務名稱 *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" placeholder="例如：單色凝膠" />
            </div>
            <div className="md:col-span-2 bg-[#FFF4F2] p-3 rounded-lg border border-[#ffbba5]">
              <label className="block text-xs font-bold text-[#EE4D2D] mb-1"><i className="fa-regular fa-clock mr-1"></i>此服務專屬的限定預約時段 (選填)</label>
              <input type="text" value={form.allowed_times?.join(', ') || ''} onChange={e => {
                  const val = e.target.value;
                  setForm({...form, allowed_times: val ? val.split(',').map(s => s.trim()).filter(s => s) : []});
              }} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-[#EE4D2D]" placeholder="例如：10:00, 11:00, 13:00 (多個時間請用半形逗號隔開，留空代表不限制)" />
              <p className="text-[10px] text-slate-500 mt-1">💡 只要在這裡設定了時間，客人選這個課程就只能在這些特定時間點預約！</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">價格 (NT$) *</label>
              <input type="number" required min="0" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">預計施作時長 (分鐘) *</label>
              <input type="number" required min="5" step="5" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">緩衝/清理時間 (分鐘) *</label>
              <input type="number" required min="0" step="5" value={form.buffer_minutes} onChange={e => setForm({...form, buffer_minutes: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500" placeholder="防撞期保留時間" />
            </div>

            {/* ★ 新增：可執行此服務的服務人員勾選區 */}
            <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
              <label className="block text-xs font-bold text-slate-700 mb-2"><i className="fa-solid fa-user-check mr-1 text-purple-500"></i>設定可執行此服務的人員 (留空代表全體皆可)</label>
              {staffList.length === 0 ? (
                 <div className="text-xs text-slate-400">目前尚無建立員工，請先至「員工與排班」設定。</div>
              ) : (
                 <div className="flex flex-wrap gap-3">
                   {staffList.map(staff => {
                     const isChecked = form.staff_ids?.includes(staff.id);
                     return (
                       <label key={staff.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isChecked ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100'}`}>
                         <input 
                           type="checkbox" 
                           className="hidden" 
                           checked={isChecked} 
                           onChange={(e) => {
                             const newStaffIds = e.target.checked 
                               ? [...(form.staff_ids || []), staff.id] 
                               : (form.staff_ids || []).filter(id => id !== staff.id);
                             setForm({...form, staff_ids: newStaffIds});
                           }} 
                         />
                         <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-current">
                            <img src={staff.avatar_url || `https://ui-avatars.com/api/?name=${staff.nickname || staff.name}`} alt="" className="w-full h-full object-cover" />
                         </div>
                         <span className="text-xs font-bold">{staff.nickname || staff.name}</span>
                       </label>
                     )
                   })}
                 </div>
              )}
            </div>

            <div className="md:col-span-2 flex items-center gap-4 border-t border-slate-200 pt-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requires_deposit} onChange={e => setForm({...form, requires_deposit: e.target.checked})} className="w-4 h-4 accent-purple-600" />
                <span className="text-sm font-bold text-slate-700">需要預收定金</span>
              </label>
              {form.requires_deposit && (
                <div className="flex-1 max-w-xs">
                  <input type="number" min="1" value={form.deposit_amount} onChange={e => setForm({...form, deposit_amount: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-purple-500 text-sm" placeholder="輸入定金金額" />
                </div>
              )}
            </div>
            
            {/* ★ 新增：加購項目設定區塊 */}
            <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold text-slate-500">加購項目設定 (非必填)</label>
                <button type="button" onClick={handleAddAddon} className="text-xs text-[#EE4D2D] font-bold bg-[#FFF4F2] px-3 py-1.5 rounded-lg hover:bg-[#ffbba5] transition shadow-sm border border-[#ffbba5]">
                  <i className="fa-solid fa-plus mr-1"></i>新增加購
                </button>
              </div>
              {form.addons && form.addons.length > 0 ? (
                <div className="space-y-2">
                  {form.addons.map((addon, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                       <input type="text" placeholder="加購項目名稱" required value={addon.name} onChange={e => handleUpdateAddon(idx, 'name', e.target.value)} className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-[#EE4D2D]" />
                       <div className="flex items-center border border-slate-300 rounded-lg bg-white focus-within:border-[#EE4D2D] w-20 md:w-24 shrink-0 overflow-hidden">
                         <span className="text-slate-400 pl-2 text-sm">$</span>
                         <input type="number" placeholder="金額" required min="0" value={addon.price} onChange={e => handleUpdateAddon(idx, 'price', Number(e.target.value))} className="w-full p-2 text-sm outline-none bg-transparent" />
                       </div>
                       <div className="flex items-center border border-slate-300 rounded-lg bg-white focus-within:border-[#EE4D2D] w-20 md:w-24 shrink-0 overflow-hidden">
                         <input type="number" placeholder="時間" required min="0" value={addon.duration_minutes} onChange={e => handleUpdateAddon(idx, 'duration_minutes', Number(e.target.value))} className="w-full p-2 text-sm outline-none bg-transparent text-right" />
                         <span className="text-slate-400 pr-2 text-sm">分</span>
                       </div>
                       <button type="button" onClick={() => handleRemoveAddon(idx)} className="text-red-400 hover:text-red-600 px-2 text-lg"><i className="fa-solid fa-circle-xmark"></i></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400 bg-slate-100 p-3 rounded-lg border border-dashed border-slate-300 text-center">目前無加購項目，點擊右上方按鈕新增。</div>
              )}
            </div>

          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">儲存</button>
            <button type="button" onClick={() => { setIsEditing(false); setForm(initialFormState); }} className="px-6 py-2 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">取消</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : services.length === 0 && !isEditing ? (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <p>尚未建立任何服務項目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(srv => (
            <div key={srv.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
              <div>
                {srv.image_url && (
                  <div className="w-full aspect-square bg-slate-100 -mt-4 -mx-4 mb-4 border-b border-slate-100">
                    <img src={srv.image_url} className="w-full h-full object-cover" alt={srv.name} />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mb-1 inline-block border border-slate-200">
                      {srv.category || '未分類'}
                    </span>
                    <h4 className="font-bold text-slate-800">{srv.name}</h4>
                  </div>
                  <span className="text-purple-600 font-black">${srv.price.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-2 mb-3">
                  <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-slate-600"><i className="fa-regular fa-clock"></i> 施作 {srv.duration_minutes} 分</span>
                  <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded text-slate-600"><i className="fa-solid fa-broom"></i> 緩衝 {srv.buffer_minutes} 分</span>
                  {srv.addons && srv.addons.length > 0 && (
                     <span className="flex items-center gap-1 bg-[#FFF4F2] text-[#EE4D2D] font-bold px-1.5 py-0.5 rounded border border-[#ffbba5]">
                        <i className="fa-solid fa-plus-circle"></i> {srv.addons.length} 加購
                     </span>
                  )}
                  {srv.requires_deposit && <span className="text-orange-500 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">定金 ${srv.deposit_amount}</span>}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-50 pt-3 mt-auto">
                <button onClick={() => { setForm(srv); setIsEditing(true); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition">編輯</button>
                <button onClick={() => handleDelete(srv.id)} className="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition">刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ★ 新增：渲染分類管理彈窗 */}
      {isCategoryModalOpen && (
        <ServiceCategoryModal 
           shopId={shopId} 
           onClose={() => { setIsCategoryModalOpen(false); fetchServices(); }} 
        />
      )}
    </div>
  );
}