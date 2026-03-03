import React, { useState } from 'react';
import API from '../api';

interface AppealModalProps {
  targetId: string;
  targetName: string;
  sellerId: string;
  onClose: () => void;
}

const AppealModal: React.FC<AppealModalProps> = ({ targetId, targetName, sellerId, onClose }) => {
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const submitAppeal = async () => {
    if (!reason.trim()) return alert('請詳細填寫申訴原因');
    setIsSubmitting(true);

    try {
      await API.createAppeal({
        target_id: targetId,
        seller_id: sellerId,
        reason,
        proof_images: images,
        status: 'PENDING'
      });
      
      alert('申訴單已成功送出！管理員將會盡快人工審核您的佐證資料。');
      onClose();
    } catch (e) {
      alert('申訴提交失敗，請檢查網路連線或稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-scale-balanced text-[#EE4D2D]"></i> 提出商品申訴
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>
        
        <div className="space-y-5 overflow-y-auto custom-scrollbar flex-1 pr-2">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">受處分商品</label>
            <div className="text-slate-800 font-bold">{targetName}</div>
            <div className="text-xs text-slate-500 font-mono mt-1">ID: {targetId}</div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">申訴原因與說明 <span className="text-red-500">*</span></label>
            <textarea 
              className="w-full h-32 border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-[#EE4D2D] resize-none text-sm transition"
              placeholder="請詳細說明為何此商品並未違規，並敘述您附上的佐證資料內容..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">佐證圖片/文件 (選填，最多 3 張)</label>
            <p className="text-xs text-slate-400 mb-3">可上傳原廠授權書、進貨證明、檢驗報告等</p>
            <div className="flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-black/70">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-[#EE4D2D] hover:text-[#EE4D2D] transition">
                  <i className="fa-solid fa-file-arrow-up mb-1 text-lg"></i>
                  <span className="text-[10px] font-bold">上傳證明</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-2 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition">取消</button>
          <button 
            onClick={submitAppeal} 
            disabled={isSubmitting}
            className="flex-[2] bg-[#EE4D2D] text-white font-bold py-3 rounded-xl hover:bg-[#d73211] shadow-lg shadow-orange-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
            送出申訴單
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppealModal;