import React, { useState, useRef, useEffect } from 'react';

interface Props {
  siteSettings: any;
  onUpdateSiteSettings: (settings: any) => void;
}

const AdminAnnouncement: React.FC<Props> = ({ siteSettings, onUpdateSiteSettings }) => {
  const [active, setActive] = useState(siteSettings?.announcementActive || false);
  const [image, setImage] = useState(siteSettings?.announcementImage || '');
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // 初始化編輯器內容
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && siteSettings?.announcement) {
      editorRef.current.innerHTML = siteSettings.announcement;
    }
  }, [siteSettings]);

  // 簡易的富文本編輯指令
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSave = () => {
    const content = editorRef.current?.innerHTML || '';
    onUpdateSiteSettings({
      ...siteSettings,
      announcementActive: active,
      announcementImage: image,
      announcement: content
    });
    alert('全站公告設定已成功儲存！');
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in w-full">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <i className="fa-solid fa-bell text-[#EE4D2D]"></i> 全站公告設定
      </h2>

      <div className="space-y-6 max-w-3xl">
        {/* 啟用開關 */}
        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EE4D2D]"></div>
          </label>
          <span className="font-bold text-slate-700">啟用「每日首次進入」彈窗公告</span>
        </div>

        {/* 圖片連結 */}
        <div>
          <label className="text-sm font-bold text-slate-600 mb-2 block">公告圖片網址 (選填)</label>
          <input 
            type="text" 
            className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-[#EE4D2D] text-sm"
            placeholder="請輸入圖片 URL..."
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>

        {/* 編輯器 */}
        <div>
          <label className="text-sm font-bold text-slate-600 mb-2 block">公告文字內容</label>
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
            {/* 工具列 */}
            <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-2 flex-wrap items-center">
              <button onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition" title="粗體"><i className="fa-solid fa-bold"></i></button>
              <button onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition" title="斜體"><i className="fa-solid fa-italic"></i></button>
              <button onClick={() => execCommand('underline')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition" title="底線"><i className="fa-solid fa-underline"></i></button>
              <div className="w-px h-5 bg-slate-300 mx-1"></div>
              <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition" title="靠左對齊"><i className="fa-solid fa-align-left"></i></button>
              <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition" title="置中對齊"><i className="fa-solid fa-align-center"></i></button>
              <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition" title="靠右對齊"><i className="fa-solid fa-align-right"></i></button>
              <div className="w-px h-5 bg-slate-300 mx-1"></div>
              <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition" title="項目符號"><i className="fa-solid fa-list-ul"></i></button>
            </div>
            {/* 編輯區 */}
            <div 
              ref={editorRef}
              className="p-4 min-h-[200px] outline-none text-slate-700 leading-relaxed bg-white"
              contentEditable
              suppressContentEditableWarning
              style={{ outline: 'none' }}
            ></div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-4 pt-4 border-t border-slate-100">
          <button onClick={() => setShowPreview(true)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">
             <i className="fa-solid fa-eye mr-2"></i> 預覽效果
          </button>
          <button onClick={handleSave} className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-red-600 transition shadow-md">
             <i className="fa-solid fa-floppy-disk mr-2"></i> 儲存設定
          </button>
        </div>
      </div>

      {/* 預覽用的彈窗 */}
      {showPreview && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8 max-h-[90vh] flex flex-col">
            <h3 className="text-2xl font-black mb-4 shrink-0 flex justify-between items-center">
              <span>🔔 平台最新公告 (預覽)</span>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-red-500 text-xl"><i className="fa-solid fa-xmark"></i></button>
            </h3>
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                {image && (
                   <div className="mb-4 rounded-xl overflow-hidden shadow-sm">
                      <img src={image} alt="Announcement" className="w-full h-auto object-cover" />
                   </div>
                )}
                <div 
                    className="text-slate-600 mb-6 leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: editorRef.current?.innerHTML || '' }} 
                />
            </div>
            <button onClick={() => setShowPreview(false)} className="w-full py-3 mt-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition shrink-0">
               關閉預覽
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncement;