
import React, { useState, useRef } from 'react';
import { User } from '../types';
import API from '../api';

interface ShopSettingsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const ShopSettings: React.FC<ShopSettingsProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    shop_name: user.shop_name || user.name,
    shop_description: user.shop_description || '',
    logo: user.logo || '',
    banner: user.banner || '',
  });
  const [loading, setLoading] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File, field: 'logo' | 'banner') => {
    if (file.size > 5 * 1024 * 1024) return alert('圖片過大 (限制 5MB)');
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updatedUser = { ...user, ...formData };
      await API.updateUser(updatedUser);
      onUpdateUser(updatedUser);
      alert('商店設定已更新！');
    } catch (error) {
      console.error(error);
      alert('更新失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">商店設定</h2>
      
      <div className="max-w-2xl space-y-8">
        {/* Logo Setting */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">商店 Logo</label>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-50 relative group">
              <img src={formData.logo || 'https://placehold.co/150'} className="w-full h-full object-cover" />
              <div onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                <i className="fa-solid fa-camera text-white"></i>
              </div>
            </div>
            <div className="flex-1">
              <button onClick={() => logoInputRef.current?.click()} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 transition">
                上傳圖片
              </button>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
              <p className="text-xs text-slate-400 mt-2">建議尺寸: 300x300px, 支援 JPG/PNG</p>
            </div>
          </div>
        </div>

        {/* Banner Setting */}
        <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">商店封面 (Banner)</label>
           <div className="w-full h-40 rounded-xl border-2 border-slate-100 overflow-hidden bg-slate-50 relative group">
              <img src={formData.banner || 'https://placehold.co/800x200'} className="w-full h-full object-cover" />
              <div onClick={() => bannerInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                 <i className="fa-solid fa-camera text-white text-2xl"></i>
              </div>
              <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')} />
           </div>
           <p className="text-xs text-slate-400 mt-2">建議尺寸: 1200x300px, 支援 JPG/PNG</p>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">商店名稱</label>
             <input 
               type="text" 
               className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D]"
               value={formData.shop_name}
               onChange={e => setFormData({...formData, shop_name: e.target.value})}
             />
           </div>
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">商店介紹</label>
             <textarea 
               className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] h-32 resize-none"
               value={formData.shop_description}
               onChange={e => setFormData({...formData, shop_description: e.target.value})}
               placeholder="向買家介紹您的商店..."
             />
           </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
           <button 
             onClick={handleSave} 
             disabled={loading}
             className="px-8 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-lg hover:bg-[#d73211] disabled:opacity-50 transition"
           >
             {loading ? '儲存中...' : '儲存設定'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ShopSettings;
