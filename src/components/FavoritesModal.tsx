import React, { useState, useEffect } from 'react';
import API from '../api';
import DraggableFavItem from './DraggableFavItem'; // ★ 引入我們做好的拖曳元件

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const FavoritesModal: React.FC<FavoritesModalProps> = ({ isOpen, onClose, user }) => {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [favMode, setFavMode] = useState<'LIST' | 'ADD_LINK' | 'ADD_FOLDER'>('LIST');
  const [tempUrl, setTempUrl] = useState('');
  const [tempTitle, setTempTitle] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  // 統一的資料儲存與同步 (LocalStorage + API)
  const syncData = async (newBookmarks: any[], newFolders: any[]) => {
    setBookmarks(newBookmarks);
    setFolders(newFolders);
    localStorage.setItem(`insbuy_bookmarks_${user?.id}`, JSON.stringify(newBookmarks));
    localStorage.setItem(`insbuy_folders_${user?.id}`, JSON.stringify(newFolders));
    if (user && user.id) {
        // 加上 as any 讓 TypeScript 放行我們新增的欄位
        try { await API.updateUser({ id: user.id, bookmarks: newBookmarks, folders: newFolders } as any); } 
        catch (e) { console.error("同步至伺服器失敗", e); }
    }
  };

  useEffect(() => {
    if (user && user.id && isOpen) {
      // 優先讀取資料庫的資料，沒有才讀取本機快取
      if (user.bookmarks && user.bookmarks.length > 0) setBookmarks(user.bookmarks);
      else { try { setBookmarks(JSON.parse(localStorage.getItem(`insbuy_bookmarks_${user.id}`) || '[]')); } catch { setBookmarks([]); } }

      if (user.folders && user.folders.length > 0) setFolders(user.folders);
      else { try { setFolders(JSON.parse(localStorage.getItem(`insbuy_folders_${user.id}`) || '[]')); } catch { setFolders([]); } }
    }
  }, [user, isOpen]);

  const handleSaveLink = () => {
    if (!tempUrl || !tempTitle) return alert('請輸入網址與標題');
    const newItems = [{ id: Date.now().toString(), title: tempTitle, url: tempUrl, folderId: currentFolder, createdAt: Date.now() }, ...bookmarks];
    syncData(newItems, folders);
    setFavMode('LIST'); setTempUrl(''); setTempTitle('');
  };

  const handleSaveFolder = () => {
    if (!tempTitle) return alert('請輸入資料夾名稱');
    const newItems = [{ id: Date.now().toString(), name: tempTitle, createdAt: Date.now() }, ...folders];
    syncData(bookmarks, newItems);
    setFavMode('LIST'); setTempTitle('');
  };

  const handleDeleteBookmark = (id: string) => { 
    if (confirm('確定要刪除此收藏？')) syncData(bookmarks.filter(b => b.id !== id), folders); 
  };
  
  const handleDeleteFolder = (id: string) => {
    if (confirm('確定要刪除此資料夾？內含的書籤也會一併刪除。')) {
      syncData(bookmarks.filter(b => b.folderId !== id), folders.filter(f => f.id !== id));
    }
  };

  // 全新跨平台拖曳完成事件
  const handleDropComplete = (dragItem: {id: string, type: string}, dropTarget: {id: string, type: string}) => {
    // 網頁拖入資料夾 (包含拖回上一層)
    if (dragItem.type === 'BOOKMARK' && dropTarget.type === 'FOLDER') {
      const items = [...bookmarks];
      const idx = items.findIndex(i => i.id === dragItem.id);
      if (idx !== -1) {
        // ★ 如果目標是 ROOT，代表要移出資料夾
        items[idx].folderId = dropTarget.id === 'ROOT' ? null : dropTarget.id;
        syncData(items, folders);
      }
      return;
    }

    if (dragItem.type !== dropTarget.type) return;

    if (dropTarget.type === 'FOLDER') {
      const items = [...folders];
      const dragIdx = items.findIndex(i => i.id === dragItem.id);
      const dropIdx = items.findIndex(i => i.id === dropTarget.id);
      if (dragIdx === -1 || dropIdx === -1) return;
      const [removed] = items.splice(dragIdx, 1);
      items.splice(dropIdx, 0, removed);
      syncData(bookmarks, items);
    } else {
      const items = [...bookmarks];
      const dragIdx = items.findIndex(i => i.id === dragItem.id);
      const dropIdx = items.findIndex(i => i.id === dropTarget.id);
      if (dragIdx === -1 || dropIdx === -1) return;
      const [removed] = items.splice(dragIdx, 1);
      items.splice(dropIdx, 0, removed);
      syncData(items, folders);
    }
  };

  // 自動抓取網頁標題
  useEffect(() => {
    if (!tempUrl || !tempUrl.startsWith('http')) return;
    const fetchTitle = async () => {
      setIsFetchingMeta(true);
      try {
        const data = await API.fetchMetadata(tempUrl);
        if (data && data.title && !tempTitle) setTempTitle(data.title);
      } catch (e) {
        console.error(e);
      } finally {
        setIsFetchingMeta(false);
      }
    };
    const timer = setTimeout(() => { fetchTitle(); }, 500);
    return () => clearTimeout(timer);
  }, [tempUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in">
      <div className="bg-slate-50 rounded-3xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col shadow-2xl overflow-hidden relative border border-slate-200">
        
        {/* Header 列 */}
        <div className="bg-white p-4 md:p-5 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3 font-black text-xl text-slate-800">
            {currentFolder ? (
              <button onClick={() => setCurrentFolder(null)} className="hover:bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center transition text-slate-500 shadow-sm border border-slate-100">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 text-[#EE4D2D] flex items-center justify-center shadow-inner">
                <i className="fa-solid fa-star"></i>
              </div>
            )}
            <span>{currentFolder ? folders.find(f => f.id === currentFolder)?.name : '我的最愛'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 bg-slate-50 border border-transparent hover:border-red-100">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* 內容區塊 (網格排列) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-[#F8FAFC]">
          {favMode === 'LIST' && (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-8">
                
                {/* ★ 渲染返回上一層 (當在資料夾內時顯示，並作為可拖曳進入的目標) */}
                {currentFolder !== null && (
                  <DraggableFavItem 
                    id="ROOT"
                    type="FOLDER"
                    onDropComplete={handleDropComplete}
                    onClick={() => setCurrentFolder(null)} 
                    className="flex flex-col items-center gap-2 cursor-pointer group relative hover:-translate-y-1 transition-transform"
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-slate-50 shadow-sm flex flex-col items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 group-hover:shadow-md group-hover:border-[#EE4D2D] transition-all relative">
                      <i className="fa-solid fa-reply text-3xl md:text-4xl text-slate-400 group-hover:text-[#EE4D2D] transition-colors drop-shadow-sm mb-1"></i>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#EE4D2D]">移出資料夾</span>
                    </div>
                    <span className="text-xs md:text-sm font-bold text-slate-600 text-center line-clamp-2 px-1 leading-snug">回上一層</span>
                  </DraggableFavItem>
                )}

                {/* 渲染資料夾 */}
                {currentFolder === null && folders.map(f => (
                  <DraggableFavItem 
                    key={f.id} 
                    id={f.id}
                    type="FOLDER"
                    onDropComplete={handleDropComplete}
                    onClick={() => setCurrentFolder(f.id)} 
                    className="flex flex-col items-center gap-2 cursor-pointer group relative hover:-translate-y-1 transition-transform"
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-100 group-hover:shadow-md group-hover:border-orange-200 transition-all relative">
                      <i className="fa-solid fa-folder text-4xl md:text-5xl text-[#FCD34D] group-hover:text-[#FBBF24] transition-colors drop-shadow-sm"></i>
                      <div className="absolute top-2 right-2 bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 rounded-full border border-slate-200">
                         {bookmarks.filter(b => b.folderId === f.id).length}
                      </div>
                    </div>
                    <span className="text-xs md:text-sm font-bold text-slate-700 text-center line-clamp-2 px-1 leading-snug">{f.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }} className="absolute -top-2 -right-2 text-slate-300 hover:text-white hover:bg-red-500 bg-white shadow-sm rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"><i className="fa-solid fa-xmark text-xs"></i></button>
                  </DraggableFavItem>
                ))}
                
                {/* 渲染書籤 */}
                {bookmarks.filter(b => b.folderId === currentFolder).map(b => (
                  <DraggableFavItem 
                    key={b.id} 
                    id={b.id}
                    type="BOOKMARK"
                    onDropComplete={handleDropComplete}
                    onClick={() => window.open(b.url, '_blank')}
                    className="flex flex-col items-center gap-2 cursor-pointer group relative hover:-translate-y-1 transition-transform"
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-100 group-hover:shadow-md group-hover:border-orange-200 transition-all p-3 pointer-events-none">
                      <img src={`https://www.google.com/s2/favicons?domain=${b.url}&sz=128`} className="w-full h-full object-contain filter drop-shadow-sm" alt="icon" onError={(e) => (e.target as any).style.display='none'} />
                    </div>
                    <span className="text-xs md:text-sm font-bold text-slate-700 text-center line-clamp-2 px-1 leading-snug pointer-events-none">{b.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBookmark(b.id); }} className="absolute -top-2 -right-2 text-slate-300 hover:text-white hover:bg-red-500 bg-white shadow-sm rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"><i className="fa-solid fa-xmark text-xs"></i></button>
                  </DraggableFavItem>
                ))}
              </div>

              {folders.length === 0 && bookmarks.filter(b => b.folderId === currentFolder).length === 0 && (
                <div className="py-24 text-center text-slate-400 font-bold flex flex-col items-center justify-center h-full">
                  <div className="w-24 h-24 bg-white shadow-sm rounded-full flex items-center justify-center mb-6">
                    <i className="fa-solid fa-box-open text-5xl text-slate-200"></i>
                  </div>
                  目前沒有任何收藏<br/><span className="text-xs font-normal mt-2 block text-slate-400">點擊下方按鈕將網頁加入吧！</span>
                </div>
              )}
            </>
          )}

          {/* 新增連結表單 */}
          {favMode === 'ADD_LINK' && (
            <div className="p-4 bg-white rounded-3xl shadow-sm border border-slate-100 max-w-lg mx-auto mt-10">
              <h4 className="font-black text-lg mb-6 flex items-center gap-2 text-slate-800"><i className="fa-solid fa-link text-[#EE4D2D]"></i> 加入新網頁</h4>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">1. 貼上外部網頁連結</label>
                  <input type="text" value={tempUrl} onChange={e => setTempUrl(e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-[#EE4D2D] bg-slate-50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 flex justify-between items-center">
                    <span>2. 標題名稱</span>
                    {isFetchingMeta && <span className="text-[#EE4D2D] text-[10px] animate-pulse font-black"><i className="fa-solid fa-spinner fa-spin mr-1"></i>自動抓取中...</span>}
                  </label>
                  <input type="text" value={tempTitle} onChange={e => setTempTitle(e.target.value)} placeholder="系統將嘗試自動抓取..." className="w-full border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-[#EE4D2D] bg-slate-50" />
                </div>
              </div>
            </div>
          )}

          {/* 新增資料夾表單 */}
          {favMode === 'ADD_FOLDER' && (
            <div className="p-4 bg-white rounded-3xl shadow-sm border border-slate-100 max-w-lg mx-auto mt-10">
               <h4 className="font-black text-lg mb-6 flex items-center gap-2 text-slate-800"><i className="fa-solid fa-folder-plus text-[#FCD34D]"></i> 建立新資料夾</h4>
               <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">資料夾名稱</label>
                  <input type="text" value={tempTitle} onChange={e => setTempTitle(e.target.value)} placeholder="例如：雙11必買清單" className="w-full border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-[#EE4D2D] bg-slate-50" />
               </div>
            </div>
          )}
        </div>

        {/* 底部按鈕列 */}
        <div className="bg-white p-4 md:p-6 border-t border-slate-200 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-10">
           {favMode === 'LIST' ? (
              <div className="flex gap-3 max-w-md mx-auto">
                <button onClick={() => { setFavMode('ADD_LINK'); setTempUrl(''); setTempTitle(''); }} className="flex-1 py-3.5 bg-orange-50 border border-orange-100 rounded-2xl text-sm font-black text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white transition shadow-sm flex justify-center items-center gap-2">
                  <i className="fa-solid fa-plus"></i> 加入網頁
                </button>
                {!currentFolder && (
                  <button onClick={() => { setFavMode('ADD_FOLDER'); setTempTitle(''); }} className="flex-[0.8] py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition shadow-sm flex justify-center items-center gap-2">
                    <i className="fa-solid fa-folder-plus"></i> 新建資料夾
                  </button>
                )}
              </div>
           ) : (
              <div className="flex gap-3 max-w-md mx-auto">
                <button onClick={() => setFavMode('LIST')} className="flex-1 bg-slate-100 text-slate-600 rounded-2xl py-3.5 font-bold text-sm hover:bg-slate-200 transition">取消返回</button>
                <button onClick={favMode === 'ADD_LINK' ? handleSaveLink : handleSaveFolder} className="flex-[2] bg-[#EE4D2D] text-white rounded-2xl py-3.5 font-bold text-sm hover:bg-[#d73211] shadow-md transition">確認儲存</button>
              </div>
           )}
        </div>

      </div>
    </div>
  );
}

export default FavoritesModal;