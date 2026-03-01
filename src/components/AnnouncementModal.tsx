import React, { useEffect, useState } from 'react';
import { SiteSettings } from '../types';

interface Props {
  siteSettings: SiteSettings;
}

const AnnouncementModal: React.FC<Props> = ({ siteSettings }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (siteSettings?.announcementActive) {
      const today = new Date().toISOString().split('T')[0];
      const lastViewedDate = localStorage.getItem('insbuy_last_announcement_date');
      
      // 如果今天還沒看過，且有內容，就彈出
      if (lastViewedDate !== today && (siteSettings.announcement || siteSettings.announcementImage)) {
        setIsOpen(true);
      }
    }
  }, [siteSettings]);

  const handleClose = () => {
    setIsOpen(false);
    const today = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem('insbuy_last_announcement_date', today);
    } catch (e) {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8 animate-fade-in-up max-h-[90vh] flex flex-col">
        <h3 className="text-2xl font-black mb-4 shrink-0 flex justify-between items-center">
          <span>🔔 平台最新公告</span>
          <button onClick={handleClose} className="text-slate-400 hover:text-red-500 text-xl"><i className="fa-solid fa-xmark"></i></button>
        </h3>
        
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
            {siteSettings.announcementImage && (
               <div className="mb-4 rounded-xl overflow-hidden shadow-sm">
                  <img src={siteSettings.announcementImage} alt="Announcement" className="w-full h-auto object-cover" />
               </div>
            )}
            {/* 支援 HTML 渲染，對應後台的對齊與編輯功能 */}
            <div 
                className="text-slate-600 mb-6 leading-relaxed" 
                dangerouslySetInnerHTML={{ __html: siteSettings.announcement || '' }} 
            />
        </div>
        
        <button onClick={handleClose} className="w-full py-3 mt-4 bg-slate-800 text-white rounded-xl font-bold shrink-0 hover:bg-slate-700 transition">
            我知道了
        </button>
      </div>
    </div>
  );
};

export default AnnouncementModal;