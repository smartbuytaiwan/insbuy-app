import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import API from '../api';

interface ShopSettingsProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

// ★ 改良版：所見即所得 (WYSIWYG) 圖片裁切器
// 支援動態比例 (1:1 或 4:1)
const ImageCropper = ({ src, type, onComplete, onCancel }: { src: string, type: 'logo' | 'banner', onComplete: (blob: string) => void, onCancel: () => void }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // 設定容器尺寸與比例
  const aspectRatio = type === 'logo' ? 1 : 4; 
  const containerW = 400; 
  const containerH = containerW / aspectRatio; // Logo: 400, Banner: 100

  // 初始化：確保圖片載入時重置狀態
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setOffset({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // ★ 核心邏輯：Canvas 輸出必須與 CSS 顯示完全一致
  const handleSave = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    
    // 設定輸出解析度 (Logo 800x800, Banner 1200x300)
    const outputW = type === 'logo' ? 800 : 1200;
    const outputH = outputW / aspectRatio;
    
    // 計算縮放倍率 (輸出尺寸 / 預覽容器尺寸)
    const scaleFactor = outputW / containerW; 

    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 填滿白色背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outputW, outputH);

    // 2. 計算圖片在容器中的基礎縮放比例 (Object-Fit: Contain 模擬)
    // 這必須與下方 img style 的 CSS 行為一致
    const ratioW = containerW / img.naturalWidth;
    const ratioH = containerH / img.naturalHeight;
    const baseScale = Math.min(ratioW, ratioH);

    // 3. 計算圖片在容器內的實際渲染尺寸
    const renderW = img.naturalWidth * baseScale;
    const renderH = img.naturalHeight * baseScale;

    ctx.save();
    
    // 4. 移動畫布原點到中心
    ctx.translate(outputW / 2, outputH / 2);
    
    // 5. 應用使用者的位移 (需乘以輸出倍率)
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
    
    // 6. 應用使用者的縮放
    ctx.scale(zoom, zoom);
    
    // 7. 繪製圖片 (以中心點為基準)
    // 我們將圖片繪製為 "Fit" 的大小，再乘上輸出倍率，這樣位置就會跟預覽完全一樣
    ctx.drawImage(
      img,
      -renderW * scaleFactor / 2,
      -renderH * scaleFactor / 2,
      renderW * scaleFactor,
      renderH * scaleFactor
    );
    
    ctx.restore();
    
    onComplete(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
          <h3 className="font-bold text-lg mb-4 text-slate-800">
            編輯{type === 'logo' ? '商店 Logo (1:1)' : '商店封面 (4:1)'}
          </h3>
          
          <div 
             className="bg-slate-900 overflow-hidden relative mx-auto mb-4 cursor-move border-2 border-slate-200 rounded-lg shadow-inner flex items-center justify-center"
             style={{ width: containerW, height: containerH }}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
          >
             {/* 這裡的 CSS 必須與 Canvas 的繪製邏輯對應 (Contain 模式) */}
             <img 
               ref={imgRef}
               src={src} 
               className="max-w-none absolute select-none origin-center"
               style={{ 
                 // 使用 transform 進行位移與縮放，確保操作流暢
                 transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                 maxWidth: '100%',
                 maxHeight: '100%',
                 objectFit: 'contain' // 初始狀態完整顯示
               }}
               draggable={false}
             />
             
             {/* 網格線輔助 */}
             <div className="absolute inset-0 pointer-events-none opacity-30 border border-white/50">
                 <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                 <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                 <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                 <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/50"></div>
             </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
             <i className="fa-solid fa-magnifying-glass-minus text-slate-400 text-xs"></i>
             <input 
               type="range" 
               min="0.5" 
               max="3" 
               step="0.05" 
               value={zoom} 
               onChange={e => setZoom(parseFloat(e.target.value))}
               className="flex-1 accent-[#EE4D2D] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
             />
             <i className="fa-solid fa-magnifying-glass-plus text-slate-600 text-lg"></i>
          </div>

          <div className="flex gap-3">
             <button onClick={handleSave} className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition">確認裁切</button>
             <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">取消</button>
          </div>
       </div>
    </div>
  );
};

const ShopSettings: React.FC<ShopSettingsProps> = ({ user, onUpdateUser }) => {
  // ★ 修正：確保所有欄位都在初始化狀態中，這樣輸入框才能正確綁定與儲存
  const [formData, setFormData] = useState<Partial<User>>({
    shop_name: user.shop_name || user.name,
    shop_description: user.shop_description || '',
    logo: user.logo || '',
    banner: user.banner || '',
    google_map_url: user.google_map_url || '',
    line_url: user.line_url || '',
    facebook_url: user.facebook_url || '',
    instagram_url: user.instagram_url || '',
    threads_url: user.threads_url || '',
  });
  const [loading, setLoading] = useState(false);

  // 裁切視窗狀態
  const [cropModal, setCropModal] = useState<{ isOpen: boolean, src: string, type: 'logo' | 'banner' }>({ isOpen: false, src: '', type: 'logo' });

  // ★ 修正：當 user prop 更新時 (例如儲存後或重新整理)，同步更新表單狀態
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      shop_name: user.shop_name || user.name,
      shop_description: user.shop_description || '',
      logo: user.logo || '',
      banner: user.banner || '',
      google_map_url: user.google_map_url || '',
      line_url: user.line_url || '',
      facebook_url: user.facebook_url || '',
      instagram_url: user.instagram_url || '',
      threads_url: user.threads_url || '',
    }));
  }, [user]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File, field: 'logo' | 'banner') => {
    if (file.size > 5 * 1024 * 1024) return alert('圖片過大 (限制 5MB)');
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        // 開啟裁切 Modal
        setCropModal({ isOpen: true, src: reader.result as string, type: field });
        // 清空 input 避免重複選同一張不觸發
        if (field === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
        if (field === 'banner' && bannerInputRef.current) bannerInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBase64: string) => {
     setFormData(prev => ({ ...prev, [cropModal.type]: croppedBase64 }));
     setCropModal({ isOpen: false, src: '', type: 'logo' });
  };

  // 點擊現有圖片進行重新編輯
  const handleEditExisting = (field: 'logo' | 'banner') => {
      const currentSrc = formData[field];
      if (currentSrc) { 
         setCropModal({ isOpen: true, src: currentSrc, type: field });
      }
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
      alert('更新失敗，請檢查網路連線');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">商店設定</h2>
      
      {/* 裁切 Modal */}
      {cropModal.isOpen && (
         <ImageCropper 
            src={cropModal.src} 
            type={cropModal.type} 
            onComplete={handleCropComplete} 
            onCancel={() => setCropModal({...cropModal, isOpen: false})} 
         />
      )}

      <div className="max-w-2xl space-y-8">
        {/* Logo Setting */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">商店 Logo</label>
          <div className="flex items-center gap-6">
            <div 
               className="w-24 h-24 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-50 relative group cursor-pointer"
               onClick={() => formData.logo ? handleEditExisting('logo') : logoInputRef.current?.click()}
               title="點擊編輯圖片"
            >
              <img src={formData.logo || 'https://placehold.co/150'} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <i className="fa-solid fa-pen-to-square text-white"></i>
              </div>
            </div>
            <div className="flex-1">
              <button onClick={() => logoInputRef.current?.click()} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 transition">
                上傳圖片
              </button>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'logo')} />
              <p className="text-xs text-slate-400 mt-2">建議尺寸: 800x800px (1:1), 支援 JPG/PNG。點擊圖片可重新裁切。</p>
            </div>
          </div>
        </div>

        {/* Banner Setting */}
        <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">商店封面 (Banner)</label>
           <div 
              className="w-full h-40 rounded-xl border-2 border-slate-100 overflow-hidden bg-slate-50 relative group cursor-pointer"
              onClick={() => !formData.banner && bannerInputRef.current?.click()}
              title="點擊編輯圖片"
           >
              <img src={formData.banner || 'https://placehold.co/1200x300'} className="w-full h-full object-cover" />
              
              {/* 若沒有 Banner，顯示提示層 */}
              {!formData.banner && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition">
                     <span className="text-slate-500 font-bold flex items-center gap-2"><i className="fa-solid fa-upload"></i> 點擊上傳封面</span>
                 </div>
              )}

              {/* 若已有 Banner，顯示操作按鈕 */}
              {formData.banner && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition cursor-default">
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleEditExisting('banner'); }}
                         className="px-4 py-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition font-bold text-sm"
                      >
                         <i className="fa-solid fa-crop-simple mr-2"></i>調整裁切
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); }}
                         className="px-4 py-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition font-bold text-sm"
                      >
                         <i className="fa-solid fa-upload mr-2"></i>更換圖片
                      </button>
                  </div>
              )}
              
              <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'banner')} />
           </div>
           <p className="text-xs text-slate-400 mt-2">建議尺寸: 1200x300px (4:1), 支援 JPG/PNG。點擊圖片可重新裁切或更換。</p>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">商店名稱 (僅限註冊時設定 / 如需修改請聯繫管理員)</label>
             <input 
               type="text" 
               className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-slate-100 text-slate-500 cursor-not-allowed"
               value={formData.shop_name}
               readOnly 
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
           
           <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">本店位置 (Google Map 網址)</label>
              <input
                type="text"
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D]"
                value={formData.google_map_url}
                onChange={e => setFormData({...formData, google_map_url: e.target.value})}
                placeholder="https://maps.app.goo.gl/..."
              />
              <p className="text-xs text-slate-400 mt-1">若填寫此欄位，您的賣場首頁將會顯示地圖圖示。</p>
            </div>
        </div>

        {/* Social Media Links */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
           <h3 className="text-lg font-bold text-slate-800">社群媒體連結</h3>
           <p className="text-xs text-slate-400 -mt-2 mb-4">填寫後將於賣場首頁顯示對應的彩色圖示。</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">LINE 連結</label>
                 <input 
                   type="text" 
                   className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] text-sm"
                   value={formData.line_url}
                   onChange={e => setFormData({...formData, line_url: e.target.value})}
                   placeholder="https://line.me/..."
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Facebook 連結</label>
                 <input 
                   type="text" 
                   className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] text-sm"
                   value={formData.facebook_url}
                   onChange={e => setFormData({...formData, facebook_url: e.target.value})}
                   placeholder="https://facebook.com/..."
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Instagram 連結</label>
                 <input 
                   type="text" 
                   className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] text-sm"
                   value={formData.instagram_url}
                   onChange={e => setFormData({...formData, instagram_url: e.target.value})}
                   placeholder="https://instagram.com/..."
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Threads 連結</label>
                 <input 
                   type="text" 
                   className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] text-sm"
                   value={formData.threads_url}
                   onChange={e => setFormData({...formData, threads_url: e.target.value})}
                   placeholder="https://threads.net/..."
                 />
              </div>
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