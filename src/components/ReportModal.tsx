import React, { useState, useEffect } from 'react';
import { User } from '../types';
import API from '../api';

interface ReportModalProps {
  targetId: string;
  targetName: string;
  type: 'SHOP' | 'PRODUCT';
  currentUser: User | null;
  onClose: () => void;
}

const CATEGORIES = ['仿冒品', '違禁品', '詐騙', '侵權', '圖文不符', '其他'];

const ReportModal: React.FC<ReportModalProps> = ({ targetId, targetName, type, currentUser, onClose }) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 模擬獲取 IP 位址 (實務上通常由後端抓取)
  const [clientIp, setClientIp] = useState('');
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIp(data.ip))
      .catch(() => setClientIp('unknown'));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitReport = async () => {
    if (!currentUser) return alert('請先登入會員。');
    if (!reason.trim()) return alert('請填寫詳細原因，以便管理員審核。');

    // ★ 規則：新手帳號防護 (註冊 14 天內無效，但在前端先予以阻擋或警告)
    let daysSinceJoin = 999; // 預設通過 (防呆舊資料無日期的狀況)
    if (currentUser.created_at) {
        const joinDate = new Date(currentUser.created_at);
        joinDate.setHours(0, 0, 0, 0); // 抹除小時分鐘，避免 13.9 天被誤判
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        daysSinceJoin = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 3600 * 24));
    }
    
    if (daysSinceJoin < 14) {
      alert('【系統提示】為防範惡意檢舉，註冊未滿 14 天之新帳號無法提交檢舉。');
      return onClose();
    }

    // ★ 規則：Shadowban 防護 (前端不提示，後端會將其歸為無效，但前端可以正常送出)
    if (currentUser.report_trust_score !== undefined && currentUser.report_trust_score <= 0) {
      alert('檢舉已送出，管理員將會進行審核。'); // 假裝成功
      return onClose();
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        target_id: targetId,
        targetId: targetId, // ★ 雙重相容：確保舊版後端也能讀取
        target_name: targetName,
        targetName: targetName, // ★ 雙重相容
        category,
        reason: `[${category}] ${reason}`, 
        images,
        proof_images: images,
        reporter_id: currentUser.id,
        reporterId: currentUser.id, // ★ 雙重相容
        reporter_name: currentUser.name,
        reporterName: currentUser.name, // ★ 雙重相容
        ip_address: clientIp
      };
      
      // ★ 終極防呆：若後端 API 未更新無法儲存 images 陣列，直接將圖片網址附加在文字原因中
      if (images.length > 0) {
          payload.reason += `\n\n[佐證圖片連結]: ${images.join(', ')}`;
      }
      
      await API.createReport(payload);

      // ★ 新增：如果檢舉的是商品，自動將該商品標記為「審核中」，使其從前台隱藏
      if (type === 'PRODUCT') {
          try {
              const allProds = await API.getProducts();
              const targetP = allProds.find((p: any) => p.id === targetId);
              if (targetP) {
                  // ★ 同步加上 is_hidden: true，確保前台立刻隱藏
                  await API.updateProduct({ ...targetP, is_under_review: true, is_hidden: true } as any);
              }
          } catch (err) {
              console.error('連動隱藏商品失敗', err);
          }
      }

      alert('檢舉已送出，管理員將會進行審核。若查證屬實將進行處分。');
      onClose();
    } catch (e: any) {

      // 捕捉後端阻擋的同 IP 或重複檢舉
      const errorMsg = e.response?.data?.message || '檢舉發送失敗，您可能已檢舉過此項目。';
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500"></i> 檢舉{type === 'PRODUCT' ? '商品' : '賣場'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>
        
        <div className="space-y-5 overflow-y-auto custom-scrollbar flex-1 pr-2">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">檢舉對象</label>
            <div className="text-slate-800 font-bold">{targetName}</div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">請選擇違規項目 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 rounded-xl text-sm font-bold transition border-2 ${category === cat ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">詳細說明 <span className="text-red-500">*</span></label>
            <textarea 
              className="w-full h-28 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-red-500 resize-none text-sm transition"
              placeholder="請詳細說明您發現的違規狀況，越詳細越有助於審核..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">佐證圖片 (選填，最多 3 張)</label>
            <div className="flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-red-300 hover:text-red-400 transition">
                  <i className="fa-solid fa-camera mb-1"></i>
                  <span className="text-[10px] font-bold">上傳照片</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-2 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition">取消</button>
          <button 
            onClick={submitReport} 
            disabled={isSubmitting}
            className="flex-[2] bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
            提交檢舉單
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;