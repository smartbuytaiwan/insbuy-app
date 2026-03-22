import React, { useState, useRef, useEffect } from 'react';

interface Props {
  siteSettings: any;
  onUpdateSiteSettings: (settings: any) => void;
}

const AdminAnnouncement: React.FC<Props> = ({ siteSettings, onUpdateSiteSettings }) => {
  const [active, setActive] = useState(siteSettings?.announcementActive || false);
  const [image, setImage] = useState(siteSettings?.announcementImage || '');
  const [showPreview, setShowPreview] = useState(false);
  // ★ 新增：金流開關的本地狀態 (預設為 true 以防舊資料出錯)
  const [enablePayment, setEnablePayment] = useState(siteSettings?.enable_online_payment ?? true);
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
      announcement: content,
      enable_online_payment: enablePayment // ★ 儲存時一併更新金流開關
    });
    alert('全站設定已成功儲存！');
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in w-full">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <i className="fa-solid fa-bell text-[#EE4D2D]"></i> 全站公告設定
      </h2>

      <div className="space-y-6 max-w-3xl">
        {/* ★ 新增：進階系統開關區域 */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5">
            <h3 className="font-black text-slate-800 border-b border-slate-200 pb-3 mb-4"><i className="fa-solid fa-sliders mr-2"></i>全站系統開關</h3>
            
            {/* 原本的彈窗開關 */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-bold text-slate-700">啟用「每日首次進入」彈窗公告</div>
                    <div className="text-xs text-slate-500 mt-1">開啟後，所有使用者每天第一次進入首頁時都會看到此公告。</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={active} onChange={(e) => setActive(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EE4D2D]"></div>
                </label>
            </div>

            {/* 新增：金流系統開關 */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div>
                    <div className="font-bold text-slate-700">開放「藍新金流」與線上付款設定</div>
                    <div className="text-xs text-slate-500 mt-1 text-red-500 font-bold">關閉時，商家無法設定藍新金流 API，上架商品時也無法勾選線上金流與貨到付款。</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={enablePayment} onChange={(e) => setEnablePayment(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
            </div>
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