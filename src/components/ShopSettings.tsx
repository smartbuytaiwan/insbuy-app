import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import API from '../api';
// ★ 新增：引入 Supabase 上傳工具
import { uploadImageToSupabase } from '../supabaseClient';

interface ShopSettingsProps {
  user: User;
  permissions?: any[]; // 接收從 AdminDashboard 傳來的權限表
  onUpdateUser: (user: User) => void;
}

// ★ 改良版：修正裁切畫面偏移與歪斜問題 (使用絕對置中邏輯)
const ImageCropper = ({ src, type, onComplete, onCancel }: { src: string, type: 'logo' | 'banner', onComplete: (blob: Blob) => void, onCancel: () => void }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const aspectRatio = type === 'logo' ? 1 : 4; 
  const [containerSize, setContainerSize] = useState({ w: 300, h: 300 });

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    
    const handleResize = () => {
       const maxWidth = Math.min(window.innerWidth - 80, 500);
       
       const newW = maxWidth;
       const newH = newW / aspectRatio;
       setContainerSize({ w: newW, h: newH });
    };

    handleResize(); // 初始化執行
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [src, aspectRatio]);

  const { w: containerW, h: containerH } = containerSize;

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

  // 觸控事件 (支援手機拖曳)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({ x: touch.clientX - startRef.current.x, y: touch.clientY - startRef.current.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Canvas 輸出邏輯 (必須與 CSS 顯示一致)
  const handleSave = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    
    // 設定輸出解析度
    const outputW = type === 'logo' ? 800 : 1200;
    const outputH = outputW / aspectRatio;
    
    const scaleFactor = outputW / containerW; 

    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outputW, outputH);

    const ratioW = containerW / img.naturalWidth;
    const ratioH = containerH / img.naturalHeight;
    // ★ 關鍵修復：使用 Math.max 確保圖片填滿容器，不會產生白邊或歪斜
    const baseScale = Math.max(ratioW, ratioH);

    const renderW = img.naturalWidth * baseScale;
    const renderH = img.naturalHeight * baseScale;

    ctx.save();
    
    ctx.translate(outputW / 2, outputH / 2);
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
    ctx.scale(zoom, zoom);
    
    ctx.drawImage(
      img,
      -renderW * scaleFactor / 2,
      -renderH * scaleFactor / 2,
      renderW * scaleFactor,
      renderH * scaleFactor
    );
    
    ctx.restore();
    
    // ★ 修改：輸出為 Blob 供 Supabase 使用
    canvas.toBlob((blob) => {
        if (blob) {
            onComplete(blob);
        }
    }, 'image/webp', 0.8);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-lg shadow-2xl overflow-hidden">
          <h3 className="font-bold text-lg mb-4 text-slate-800 text-center md:text-left">
            編輯{type === 'logo' ? '商店 Logo' : '商店封面'}
          </h3>
          
          <div 
             className="bg-slate-900 overflow-hidden relative mx-auto mb-4 cursor-move border-2 border-slate-200 rounded-lg shadow-inner flex items-center justify-center touch-none"
             style={{ width: containerW, height: containerH }}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
          >
             <img 
               ref={imgRef}
               // ★ 解決 Tainted canvas 問題
               src={src.startsWith('http') ? `${src}${src.includes('?') ? '&' : '?'}t=${new Date().getTime()}` : src} 
               crossOrigin="anonymous" 
               className="absolute select-none pointer-events-none"
               style={{ 
                 top: '50%',
                 left: '50%',
                 transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                 minWidth: '100%',
                 minHeight: '100%',
                 objectFit: 'cover' // ★ 確保預覽圖也能完美填滿不扭曲
               }}
               draggable={false}
             />
             
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
             <button onClick={handleSave} className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition">確認裁切並上傳</button>
             <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">取消</button>
          </div>
       </div>
    </div>
  );
};

const ShopSettings: React.FC<ShopSettingsProps> = ({ user, permissions = [], onUpdateUser }) => {
  // 取得該會員等級權限
  const sellerConfig = permissions.find((p: any) => p.target_role === 'SELLER' && p.level === user.level);
  const canEditLogo = sellerConfig ? sellerConfig.can_edit_logo : false;
  const canEditBanner = sellerConfig ? sellerConfig.can_edit_banner : false;
  // 是否可以操作 Logo: 如果還沒設定過可以上傳(第一次)；如果已經設定過，必須要有權限才能修改
  const isLogoEditable = !user.logo || canEditLogo;

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

  // ★ 新增：QR Code Modal 狀態
  const [showQRModal, setShowQRModal] = useState(false);
  // ==========================================
  // 分潤系統：狀態與載入邏輯
  // ==========================================

  const shopUrl = `${window.location.origin}/#/SHOP/${user.shop_id || user.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shopUrl)}`;

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
    // ★ 修改：限制為 1MB
    if (file.size > 1 * 1024 * 1024) return alert('圖片過大！請上傳小於 1MB 的圖片。');
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setCropModal({ isOpen: true, src: reader.result as string, type: field });
        if (field === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
        if (field === 'banner' && bannerInputRef.current) bannerInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // ★ 修改：處理裁切後的圖片上傳 (Supabase)
  const handleCropComplete = async (blob: Blob) => {
      const cropType = cropModal.type; 
      
      setLoading(true);
      try {
          // ★ 轉成 WebP 檔案格式，確保不佔用過多 50MB 空間
          const file = new File([blob], `shop_${cropType}_${Date.now()}.webp`, { type: 'image/webp' });
          
          // 上傳到 Supabase，Bucket 名稱設為 'images'
          const publicUrl = await uploadImageToSupabase(file, 'images');

          if (publicUrl) {
              if (cropType === 'logo') {
                  setFormData(prev => ({ ...prev, logo: publicUrl }));
              } else {
                  setFormData(prev => ({ ...prev, banner: publicUrl }));
              }
          } else {
              alert('圖片上傳失敗，請檢查網路或 Supabase 設定');
          }
      } catch (e) {
          console.error(e);
          alert('上傳發生錯誤');
      } finally {
          setLoading(false);
          setCropModal({ isOpen: false, src: '', type: 'logo' });
      }
  };

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

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop-qrcode-${user.shop_id || user.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      window.open(qrImageUrl, '_blank');
    }
  };

  const handleCopyURL = () => {
    navigator.clipboard.writeText(shopUrl)
      .then(() => alert('商店網址已複製到剪貼簿！'))
      .catch(() => alert('複製失敗，請手動複製。'));
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
      <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">商店設定</h2>
      
      {cropModal.isOpen && (
         <ImageCropper 
            src={cropModal.src} 
            type={cropModal.type} 
            onComplete={handleCropComplete} 
            onCancel={() => setCropModal({...cropModal, isOpen: false})} 
         />
      )}

      {showQRModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative flex flex-col items-center">
              <button 
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
              
              <h3 className="font-black text-xl text-slate-800 mb-4">商店專屬 QR Code</h3>
              
              <div className="w-48 h-48 bg-white p-2 rounded-xl shadow-inner border border-slate-200 mb-4">
                 <img src={qrImageUrl} className="w-full h-full object-contain" alt="Shop QR Code" />
              </div>

              <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 flex items-center gap-2">
                 <div className="flex-1 text-xs text-slate-500 font-mono truncate">{shopUrl}</div>
                 <button onClick={handleCopyURL} className="text-[#EE4D2D] font-bold text-xs hover:underline shrink-0">複製</button>
              </div>

              <button 
                 onClick={handleDownloadQR}
                 className="w-full py-3 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-lg hover:bg-[#d73211] transition flex items-center justify-center gap-2"
              >
                 <i className="fa-solid fa-download"></i> 下載 QR Code
              </button>
           </div>
        </div>
      )}

      <div className="max-w-2xl space-y-8">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">商店 Logo <span className="text-[#EE4D2D]">(限制 1MB)</span></label>
          <div className="flex items-center gap-6">
            <div 
               className={`w-24 h-24 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-50 relative group shrink-0 ${isLogoEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
               onClick={() => {
                   if (!isLogoEditable) return alert('您的會員等級目前無法修改已設定的 Logo，請升級會員。');
                   formData.logo ? handleEditExisting('logo') : logoInputRef.current?.click();
               }}
               title={isLogoEditable ? "點擊編輯圖片" : "會員等級限制無法修改"}
            >
              <img src={formData.logo || 'https://placehold.co/150'} className="w-full h-full object-cover" />
              {isLogoEditable && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <i className="fa-solid fa-pen-to-square text-white"></i>
                  </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <button 
                onClick={() => {
                    if (!isLogoEditable) return alert('您的會員等級目前無法修改已設定的 Logo，請升級會員。');
                    logoInputRef.current?.click();
                }} 
                className={`px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold transition ${isLogoEditable ? 'hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'}`}
              >
                上傳圖片
              </button>

              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageSelect(e.target.files[0], 'logo')} />
              <p className="text-xs text-slate-400 mt-2 break-words">建議尺寸: 800x800px (1:1), 支援 JPG/PNG。點擊圖片可重新裁切。</p>
            </div>
          </div>
        </div>

        <div>
           <label className="block text-sm font-bold text-slate-700 mb-2">商店封面 (Banner) <span className="text-[#EE4D2D]">(限制 1MB)</span></label>
           
           <div 
              className={`w-full aspect-[4/1] rounded-xl border-2 border-slate-100 overflow-hidden bg-slate-50 relative group ${canEditBanner ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
              style={{ aspectRatio: '4/1' }} 
              onClick={() => {
                  if (!canEditBanner) return alert('您的會員等級目前無法使用/修改商店封面，請升級會員。');
                  if (!formData.banner) bannerInputRef.current?.click();
              }}
              title={canEditBanner ? "點擊編輯圖片" : "會員等級限制無法使用"}
           >
              <img src={formData.banner || 'https://placehold.co/1200x300'} className="w-full h-full object-cover" />
              
              {!formData.banner && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition">
                     <span className="text-slate-500 font-bold flex items-center gap-2"><i className="fa-solid fa-upload"></i> 點擊上傳封面</span>
                 </div>
              )}

              {formData.banner && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition cursor-default">
                      <button 
                         onClick={(e) => { 
                             e.stopPropagation(); 
                             if (!canEditBanner) return alert('您的會員等級目前無法修改商店封面，請升級會員。');
                             handleEditExisting('banner'); 
                         }}
                         className="px-4 py-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition font-bold text-sm"
                      >
                         <i className="fa-solid fa-crop-simple mr-2"></i>調整裁切
                      </button>
                      <button 
                         onClick={(e) => { 
                             e.stopPropagation(); 
                             if (!canEditBanner) return alert('您的會員等級目前無法修改商店封面，請升級會員。');
                             bannerInputRef.current?.click(); 
                         }}
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

        <div className="space-y-4">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">商店名稱 (僅限註冊時設定 / 如需修改請聯繫管理員)</label>
             <input 
               type="text" 
               className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-slate-100 text-slate-500 cursor-not-allowed text-sm"
               value={formData.shop_name}
               readOnly 
             />
             <button 
                onClick={() => setShowQRModal(true)}
                className="mt-2 text-xs font-bold text-[#EE4D2D] hover:text-[#d73211] flex items-center gap-1 transition"
             >
                <i className="fa-solid fa-qrcode"></i> 顯示商店 QR Code
             </button>
           </div>
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">商店介紹</label>
             <textarea 
               className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] h-32 resize-none text-sm"
               value={formData.shop_description}
               onChange={e => setFormData({...formData, shop_description: e.target.value})}
               placeholder="向買家介紹您的商店..."
             />
           </div>
           
           <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">本店位置 (Google Map 網址)</label>
              <input
                type="text"
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#EE4D2D] text-sm"
                value={formData.google_map_url}
                onChange={e => setFormData({...formData, google_map_url: e.target.value})}
                placeholder="https://maps.app.goo.gl/..."
              />
              <p className="text-xs text-slate-400 mt-1">若填寫此欄位，您的賣場首頁將會顯示地圖圖示。</p>
            </div>
        </div>

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
             className="w-full md:w-auto px-8 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-lg hover:bg-[#d73211] disabled:opacity-50 transition"
           >
             {loading ? '儲存中...' : '儲存設定'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ShopSettings;
