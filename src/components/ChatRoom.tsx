import React, { useState, useEffect, useRef } from 'react';
import { User, Product, View, SiteSettings } from '../types';
import API from '../api';

interface ChatRoomProps {
  currentUser: User | null;
  targetId: string | null;
  allUsers: User[];
  currentProduct?: Product | null;
  siteSettings?: SiteSettings;
  readOnly?: boolean; 
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

interface ChatMetadata {
  status: 'PENDING' | 'NORMAL';
  note: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, targetId, allUsers, currentProduct, siteSettings, readOnly = false }) => {
  // ★ 整合愛聊：統一將傳入的 ID (可能是商店的 shop_id) 強制轉換為最原始的帳號 ID
  const getUnifiedTargetId = (id: string | null) => {
     if (!id) return null;
     const user = allUsers.find(u => u.shop_id === id || u.id === id || u.phone === id);
     return user ? user.id : id;
  };

  // ★ 愛聊核心整合：強制將所有身份 ID (買家/賣家/電話) 對應到唯一的帳號 ID
  const resolveTrueId = (id: string | null) => {
     if (!id) return null;
     if (id === 'ADMIN') return id;
     const target = allUsers.find(u => u.id === id || u.shop_id === id || u.phone === id);
     return target ? target.id : id;
  };

  // 狀態管理 (使用轉換後的統一 ID)
  const [activeContactId, setActiveContactId] = useState<string | null>(resolveTrueId(targetId));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  // 紀錄每個聯絡人的最後訊息時間與內容
  const [contactLastTime, setContactLastTime] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({}); 
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({}); 
  
  // 輔助功能狀態
  const [chatMeta, setChatMeta] = useState<Record<string, ChatMetadata>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, contactId: string } | null>(null);
  const [editingNote, setEditingNote] = useState<{ contactId: string, note: string } | null>(null);
  const [hideProductCard, setHideProductCard] = useState(false); // ★ 新增：控制商品卡片隱藏

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeContactIdRef = useRef<string | null>(resolveTrueId(targetId));
  const pollingRef = useRef<any>(null);

  const getMyId = () => {
    if (!currentUser) return '';
    // ★ 核心修復：不再強制所有 ADMIN 都回傳 'ADMIN'
    // 因為 App.tsx 已經會根據「管理員愛聊」或「商家愛聊」傳入正確的 currentUser 物件
    // 若為管理員愛聊，currentUser.id 本身就會是 'ADMIN'；若為商家愛聊，就會是你真實的帳號 ID
    return currentUser.id; 
  };
  // 讀取/儲存 ChatMetadata
  useEffect(() => {
    if (!currentUser) return;
    const savedMeta = localStorage.getItem(`insbuy_chat_meta_${currentUser.id}`);
    if (savedMeta) {
        try {
            setChatMeta(JSON.parse(savedMeta));
        } catch (e) { console.error("解析 ChatMeta 失敗", e); }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && Object.keys(chatMeta).length > 0) {
      localStorage.setItem(`insbuy_chat_meta_${currentUser.id}`, JSON.stringify(chatMeta));
    }
  }, [chatMeta, currentUser]);

  const mapMessageData = (m: any): Message => {
    return {
      id: m.id || m._id || `temp_${Date.now()}_${Math.random()}`,
      senderId: m.senderId || m.sender || '', 
      receiverId: m.receiverId || m.receiver || '',
      text: m.text || m.content || m.message || "(無法顯示內容)",
      timestamp: m.timestamp || m.createdAt || m.created_at || new Date().toISOString(),
      isRead: m.isRead || false
    };
  };

  const getLastReadTime = (contactId: string) => {
      const myId = getMyId();
      return localStorage.getItem(`insbuy_last_read_${myId}_${contactId}`);
  };

  const updateLastReadTime = (contactId: string) => {
      const myId = getMyId();
      const now = new Date(Date.now() + 1000).toISOString(); // 往後推1秒涵蓋即時訊息
      
      // ★ 終極防呆：找出這個聯絡人「所有的關聯 ID」，一口氣全部標記已讀！
      const contactUser = allUsers.find(u => u.id === contactId || u.shop_id === contactId || u.phone === contactId);
      
      const idsToMark = [contactId];
      if (contactUser) {
          if (contactUser.id && !idsToMark.includes(contactUser.id)) idsToMark.push(contactUser.id);
          if (contactUser.shop_id && !idsToMark.includes(contactUser.shop_id)) idsToMark.push(contactUser.shop_id);
          if (contactUser.phone && !idsToMark.includes(contactUser.phone)) idsToMark.push(contactUser.phone);
      }
      
      idsToMark.forEach(id => {
          localStorage.setItem(`insbuy_last_read_${myId}_${id}`, now);
      });
      
      // 觸發全域事件，通知 App.tsx 更新全域紅點
      window.dispatchEvent(new Event('insbuy_message_read'));
  };

  // ★ 新增：確實呼叫 API 將訊息設為已讀
  const markAsRead = async (contactId: string) => {
     if(readOnly || !currentUser) return;
     
     const myId = getMyId();
     
     // 1. 本地更新狀態 (即時消失紅點)
     setUnreadCounts(prev => ({ ...prev, [contactId]: 0 }));
     updateLastReadTime(contactId);

     // 2. 呼叫後端 API
     try {
        await API.markMessagesRead(contactId, myId);
     } catch (e) {
        // silent fail
     }
  };

  // 同步 activeContactId 並執行已讀邏輯
  useEffect(() => {
    activeContactIdRef.current = activeContactId;
    setHideProductCard(false); // ★ 切換聯絡人時，重新恢復顯示商品卡片
    if (activeContactId && !readOnly) {
        markAsRead(activeContactId);
    }
  }, [activeContactId, readOnly]);

  // 當外部 targetId 改變時切換 (同步轉換為統一帳號 ID)
  useEffect(() => {
    if (targetId) {
        const unifiedId = resolveTrueId(targetId);
        if (activeContactIdRef.current !== unifiedId) {
            setMessages([]); // ★ 核心修復：從外部切換聯絡人時，也立即清空舊對話
        }
        setActiveContactId(unifiedId);
        activeContactIdRef.current = unifiedId;
    }
  }, [targetId, allUsers]);

  // 輪詢邏輯
  useEffect(() => {
    if (!currentUser) return;
    const myId = getMyId();

    const fetchData = async () => {
      try {
        const allMyMessages = await API.getAllUserMessages(myId);
        
        if (Array.isArray(allMyMessages)) {
            const counts: Record<string, number> = {};
            const times: Record<string, number> = {}; 
            const lastMsgs: Record<string, string> = {}; // ★ 暫存最後訊息文字

            allMyMessages.forEach((m: any) => {
                const safeMsg = mapMessageData(m);
                const partnerId = (safeMsg.senderId === myId) ? safeMsg.receiverId : safeMsg.senderId;
                
                // 更新該聯絡人的最後訊息時間與內容
                const msgTime = new Date(safeMsg.timestamp).getTime();
                if (!times[partnerId] || msgTime > times[partnerId]) {
                    times[partnerId] = msgTime;
                    // ★ 處理預覽文字：若是圖片或連結，可做特殊顯示
                let preview = safeMsg.text;
                if (preview.startsWith('[SYS_ORDER_UPDATE]')) preview = '[訂單狀態更新]';
                else if (preview.startsWith('[系統通知]')) preview = '[系統通知]';
                else if (preview.includes('#/PRODUCT/')) preview = '[商品連結]';
                lastMsgs[partnerId] = preview;
                }

                // ★ 改良版左側未讀計算：支援多重身份 (買家/賣家/電話) 徹底消滅幽靈未讀
                if (safeMsg.receiverId === myId || safeMsg.receiverId === currentUser?.shop_id || safeMsg.receiverId === currentUser?.phone) {
                    // 1. 排除自己發給自己的訊息
                    if (safeMsg.senderId === myId || safeMsg.senderId === currentUser?.shop_id || safeMsg.senderId === currentUser?.phone) return;

                    if (!safeMsg.isRead) {
                        const senderObj = allUsers.find(u => u.id === safeMsg.senderId || u.shop_id === safeMsg.senderId || u.phone === safeMsg.senderId);
                        
                        // 2. 排除已經被刪除或不存在的使用者 (幽靈訊息)
                        if (!senderObj && safeMsg.senderId !== 'SYSTEM' && safeMsg.senderId !== 'ADMIN') return;

                        const sIds = [safeMsg.senderId];
                        if (senderObj) {
                            if (senderObj.id) sIds.push(senderObj.id);
                            if (senderObj.shop_id) sIds.push(senderObj.shop_id);
                            if (senderObj.phone) sIds.push(senderObj.phone);
                        }

                        let isActuallyRead = false;
                        const msgTime = new Date(safeMsg.timestamp).getTime();
                        for (const sId of sIds) {
                            const lr = localStorage.getItem(`insbuy_last_read_${myId}_${sId}`);
                            if (lr && msgTime <= new Date(lr).getTime()) {
                                isActuallyRead = true;
                                break;
                            }
                        }

                        if (!isActuallyRead) {
                            // 統一計入原始 ID 的未讀，避免同一個人出現兩筆紅點
                            const finalSenderId = senderObj ? senderObj.id : safeMsg.senderId;
                            counts[finalSenderId] = (counts[finalSenderId] || 0) + 1;
                        }
                    }
                }
            });
            
            setContactLastTime(times);
            setLastMessages(lastMsgs); // ★ 更新狀態

            // 如果當前正在跟某人聊天，該人的未讀數強制為 0
            const currentTarget = activeContactIdRef.current;
            if (currentTarget && !readOnly) {
                counts[currentTarget] = 0; 
            }
            setUnreadCounts(counts);
        }

        const currentTarget = activeContactIdRef.current;
        if (currentTarget) {
            const dbMessages = await API.getMessages(myId, currentTarget);
            if (Array.isArray(dbMessages)) {
                const formattedMessages = dbMessages.map(mapMessageData);
                formattedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                // ★ 新增：如果沒有歷史訊息，且對方有設定歡迎詞，則插入一條本地顯示的歡迎訊息
                if (formattedMessages.length === 0 && activeUser && activeUser.welcome_message) {
                    formattedMessages.push({
                        id: 'welcome_msg',
                        senderId: currentTarget,
                        receiverId: myId,
                        text: `[自動回覆] ${activeUser.welcome_message}`,
                        timestamp: new Date().toISOString(),
                        isRead: true
                    });
                }

                setMessages(prev => {
                    if (prev.length !== formattedMessages.length || JSON.stringify(prev) !== JSON.stringify(formattedMessages)) {
                        return formattedMessages;
                    }
                    return prev;
                });
            }
        }

      } catch (error) {
        // silent fail
      }
    };

    fetchData();
    pollingRef.current = setInterval(fetchData, 1000);

    return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentUser, readOnly]);

  useEffect(() => {
    if (messages.length > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    // ★ 同步修正：只要視窗打開或有新訊息進來，就持續標記為已讀
    if (activeContactId && currentUser) {
        updateLastReadTime(activeContactId);
    }
  }, [messages, activeContactId, currentUser, allUsers]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleSend = async () => {
    if (readOnly) return;
    if (!input.trim() || !activeContactId || !currentUser) return;
    
    const myId = getMyId();
    const timestamp = new Date().toISOString();
    
    // ★ 安全防護：XSS 轉譯與競品導外連結過濾
    const filterText = (text: string) => {
      // 1. 防 XSS：將半形角括號轉為全形，徹底使惡意 HTML/Script 結構失效
      let safeText = text.replace(/</g, '＜').replace(/>/g, '＞');
      // 2. 防導外：遮蔽各大電商競品網址 (包含有 http 與無 http 的情況)
      const blockPattern = /(https?:\/\/[^\s]*?(shopee|momoshop|ruten|pchome|taobao)[^\s]*|[a-zA-Z0-9.\-]*?(shopee\.tw|momoshop\.com\.tw|ruten\.com\.tw|pchome\.com\.tw|taobao\.com)[^\s]*)/gi;
      return safeText.replace(blockPattern, '[系統已屏蔽外部連結]');
    };
    
    const msgToSend = filterText(input);
    
    updateLastReadTime(activeContactId);
    setInput(''); // 提早清空輸入框，提升流暢度

    // 立即更新左側列表預覽
    setLastMessages(prev => ({...prev, [activeContactId]: msgToSend}));
    setContactLastTime(prev => ({...prev, [activeContactId]: Date.now()}));

    try {
      // ★ 系統優化：發送給後端後，交由 1 秒輪詢自動拉回最新訊息。
      // 徹底解決因本地暫存與資料庫同時渲染而造成的「一句話出現兩句」的重疊 Bug。
      await API.sendMessage({
        senderId: myId,
        receiverId: activeContactId,
        content: msgToSend,
        timestamp
      });
    } catch (error) {
      alert("訊息發送失敗，請檢查網路");
    }
  };

  const handleContactClick = (contactId: string) => {
    if (activeContactIdRef.current !== contactId) {
        setMessages([]); // ★ 核心修復：點擊不同聯絡人時，先立即清空舊對話，避免殘留上一個人的訊息
    }
    setActiveContactId(contactId);
    markAsRead(contactId);
  };

  // ★ 新增：返回聯絡人列表 (手機版專用)
  const handleBackToList = () => {
      setActiveContactId(null);
  };

  const togglePending = (contactId: string) => {
    if(readOnly) return;
    setChatMeta(prev => ({
        ...prev, 
        [contactId]: { ...prev[contactId], status: prev[contactId]?.status === 'PENDING' ? 'NORMAL' : 'PENDING' }
    }));
  };

  const openNoteEditor = (contactId: string) => {
    if(readOnly) return;
    setEditingNote({ contactId, note: chatMeta[contactId]?.note || '' });
  };

  const saveNote = () => {
    if (!editingNote) return;
    setChatMeta(prev => ({
        ...prev, 
        [editingNote.contactId]: { ...prev[editingNote.contactId], note: editingNote.note }
    }));
    setEditingNote(null);
  };

  const handlePasteProductInfo = () => {
    if (!currentProduct || readOnly) return;
    const info = `[商品詢問] ${currentProduct.name}\n價格: $${currentProduct.price.toLocaleString()}\n連結: #/PRODUCT/${currentProduct.id}`;
    setInput(prev => (prev ? prev + '\n' : '') + info);
  };

  const formatMessageTime = (isoString: string) => {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s]+|#\/PRODUCT\/[^\s]+)/g);
    return parts.map((part, index) => {
      if (part.match(/^(https?:\/\/)/)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-200 underline break-all hover:text-white">
            {part}
          </a>
        );
      } else if (part.match(/^(#\/PRODUCT\/)/)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-200 underline break-all hover:text-white font-bold">
            <i className="fa-solid fa-box-open mr-1"></i>查看商品
          </a>
        );
      } else {
        return part;
      }
    });
  };

  if (!currentUser) return <div className="flex items-center justify-center h-[60vh] text-slate-400">請先登入以使用愛聊功能</div>;

  // 聯絡人排序邏輯
  const contacts = allUsers.filter(u => {
    const myId = getMyId();
    // 嚴格過濾自己
    if (u.id === myId || u.id === currentUser.id) return false;
    
    // 顯示條件：是當前目標，或者有對話記錄
    const uid = u.id; // ★ 列表一律使用底層帳號 ID
    const trueTarget = resolveTrueId(targetId);
    if (trueTarget && (uid === trueTarget)) return true;
    return !!contactLastTime[uid]; 
  }).sort((a, b) => {
     const idA = a.id;
     const idB = b.id;

     // 有未讀的排前面
     const unreadA = (unreadCounts[idA] || 0) > 0 ? 1 : 0;
     const unreadB = (unreadCounts[idB] || 0) > 0 ? 1 : 0;
     if (unreadA !== unreadB) {
         return unreadB - unreadA; 
     }

     // 依時間排序
     const timeA = contactLastTime[idA] || 0;
     const timeB = contactLastTime[idB] || 0;
     return timeB - timeA;
  });

  const activeUser = allUsers.find(u => u.id === activeContactId); // ★ 只用原始 ID 找人

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-120px)] flex relative">
      {editingNote && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="font-bold mb-4">編輯備註</h3>
            <textarea 
                className="w-full h-32 border p-3 rounded-xl" 
                value={editingNote.note} 
                onChange={e => setEditingNote({...editingNote, note: e.target.value})} 
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setEditingNote(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={saveNote} className="px-6 py-2 bg-[#EE4D2D] text-white rounded-lg">儲存</button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && !readOnly && (
        <div className="fixed bg-white border shadow-xl rounded-xl py-1 z-[9999] w-40" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button onClick={() => { markAsRead(contextMenu.contactId); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">標示已讀</button>
          <button onClick={() => { togglePending(contextMenu.contactId); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">切換待處理</button>
          <button onClick={() => { openNoteEditor(contextMenu.contactId); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">編輯備註</button>
        </div>
      )}

      {/* ★ 左側聯絡人列表 
         - 手機版：若有 activeContactId (進入聊天)，則隱藏此區塊
         - 電腦版：永遠顯示，佔 1/4 寬度
      */}
      <div className={`flex-col bg-slate-50 md:w-1/4 md:border-r md:flex ${activeContactId ? 'hidden' : 'w-full flex'}`}>
        <div className="p-4 border-b font-bold text-slate-700 flex justify-between items-center bg-slate-50 sticky top-0 z-10 shrink-0 h-16">
            <span className="flex items-center gap-2">
                <i className="fa-regular fa-comments"></i> 
                {/* ★ 修復：明確顯示當前是哪個身分的愛聊，防呆設計 */}
                {readOnly ? '歷史紀錄' : (currentUser.id === 'ADMIN' ? '管理員愛聊 (系統)' : '商家愛聊 (客服)')}
            </span>
            <span className="text-[10px] bg-slate-200 px-2 py-1 rounded-full text-slate-600 font-bold">{contacts.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {contacts.map(u => {
            const contactId = u.id; // ★ 整合愛聊：一律使用原始帳號 ID
            const unread = (activeContactId === contactId || readOnly) ? 0 : (unreadCounts[contactId] || 0);
            
            // ★ 補回遺失的訊息預覽文字定義
            const lastMsg = lastMessages[contactId];
            const previewText = lastMsg ? (lastMsg.length > 15 ? lastMsg.substring(0, 15) + '...' : lastMsg) : '尚未有對話';
            
            return (
                <div 
                    key={u.id} 
                    onClick={() => handleContactClick(contactId)} 
                    onContextMenu={(e) => {
                        e.preventDefault(); 
                        if(!readOnly) setContextMenu({x:e.clientX, y:e.clientY, contactId})
                    }} 
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-white transition-colors border-b border-slate-100 relative group ${activeContactId === contactId ? 'bg-white border-l-4 border-l-[#EE4D2D] shadow-sm' : ''}`}
                >
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-200 relative">
                        <img src={u.logo || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="avatar"/>
                        {unread > 0 && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-center mb-0.5">
                            <div className="font-bold text-sm text-slate-800 truncate max-w-[70%]">{u.shop_name || u.name}</div>
                            {contactLastTime[contactId] && (
                                <div className="text-[10px] text-slate-400">
                                    {new Date(contactLastTime[contactId]).toLocaleDateString() === new Date().toLocaleDateString() 
                                        ? new Date(contactLastTime[contactId]).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                                        : new Date(contactLastTime[contactId]).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <div className={`text-xs truncate max-w-[85%] ${unread > 0 ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>
                                {previewText}
                            </div>
                            {unread > 0 && (
                                <div className="bg-[#EE4D2D] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                    {unread > 99 ? '99+' : unread}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1 mt-1">
                            {chatMeta[contactId]?.status === 'PENDING' && <span className="text-[9px] bg-yellow-100 text-yellow-600 px-1.5 rounded border border-yellow-200">待處理</span>}
                            {chatMeta[contactId]?.note && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 rounded max-w-[80px] truncate border border-blue-100"><i className="fa-solid fa-note-sticky mr-1"></i>{chatMeta[contactId].note}</span>}
                        </div>
                    </div>
                </div>
            );
          })}
          {contacts.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-xs">
                <i className="fa-regular fa-paper-plane text-3xl mb-2 opacity-30"></i>
                <div>暫無聯絡人</div>
            </div>
          )}
        </div>
      </div>

      {/* ★ 右側對話視窗
         - 手機版：若無 activeContactId，隱藏此區塊。若有，全螢幕顯示。
         - 電腦版：若無 activeContactId，顯示預設畫面 (佔 3/4)。若有，顯示對話。
      */}
      <div className={`flex-col bg-white md:flex-1 md:flex ${activeContactId ? 'w-full flex' : 'hidden'}`}>
        {readOnly && (
            <div className="bg-red-50 text-red-600 px-4 py-2 text-xs font-bold border-b border-red-100 text-center">
                <i className="fa-solid fa-eye mr-2"></i> 管理員唯讀模式 (僅供查閱)
            </div>
        )}
        
        {activeUser ? (
          <>
            {/* 聊天室 Header */}
            <div className="border-b flex items-center px-4 py-3 bg-white shrink-0 font-bold sticky top-0 z-20 shadow-sm h-16">
                {/* ★ 手機版返回按鈕 */}
                <button onClick={handleBackToList} className="md:hidden mr-3 w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-600">
                    <i className="fa-solid fa-chevron-left text-lg"></i>
                </button>
                
                <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200 mr-3">
                    <img src={activeUser.logo || 'https://placehold.co/100'} className="w-full h-full object-cover" />
                </div>
                {/* ★ 修復：加入 min-w-0 與 truncate，避免名字過長把畫面撐開 */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm md:text-base text-slate-800 truncate">{activeUser.shop_name || activeUser.name}</div>
                    <div className="text-[10px] text-green-500 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> 線上
                    </div>
                </div>
                <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition">
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
            </div>

            {/* 防詐騙警語 */}
            {siteSettings?.antiScamMessage && (
                <div className="bg-orange-50 text-orange-700 px-4 py-2 text-[10px] md:text-xs font-bold border-b border-orange-100 flex items-start gap-2">
                    <i className="fa-solid fa-shield-halved mt-0.5"></i>
                    <span className="flex-1 whitespace-pre-wrap leading-tight">{siteSettings.antiScamMessage}</span>
                </div>
            )}

            {/* 商品卡片 (若有) */}
            {currentProduct && !readOnly && !hideProductCard && (
                <div className="bg-white border-b border-slate-100 p-3 m-2 rounded-xl shadow-sm border flex items-center gap-3 animate-fade-in relative pr-8">
                    <button onClick={() => setHideProductCard(true)} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition z-10" title="關閉預覽"><i className="fa-solid fa-xmark text-xs"></i></button>
                    <div className="w-12 h-12 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden shrink-0">
                        <img src={currentProduct.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-700 truncate">{currentProduct.name}</div>
                        <div className="text-xs text-[#EE4D2D] font-black">${currentProduct.price.toLocaleString()}</div>
                    </div>
                    <button 
                        onClick={handlePasteProductInfo}
                        className="px-3 py-1.5 bg-[#EE4D2D] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#d73211] transition whitespace-nowrap"
                    >
                        傳送連結
                    </button>
                </div>
            )}
            
            {/* 訊息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {messages.map((m, i) => {
                const safeText = m.text || "";
                const isAdvancedSystem = safeText.startsWith('[SYS_ORDER_UPDATE]');
                const isLegacySystem = safeText.startsWith('[系統通知]');
                const isSystem = isLegacySystem || isAdvancedSystem;
                const isMe = !isSystem && (m.senderId === currentUser.id || m.senderId === currentUser.shop_id);

                if (isAdvancedSystem) {
                    let orderData: any = null;
                    try {
                        orderData = JSON.parse(safeText.replace('[SYS_ORDER_UPDATE]', ''));
                    } catch(e) {}
                    
                    if (orderData) {
                        return (
                            <div key={i} className="flex justify-center my-4 w-full">
                                <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full max-w-[85%] md:max-w-[70%] overflow-hidden">
                                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500"><i className="fa-solid fa-bullhorn mr-1 text-[#EE4D2D]"></i> 訂單狀態更新</span>
                                        <span className="text-[10px] text-slate-400">{formatMessageTime(m.timestamp)}</span>
                                    </div>
                                    <div className="p-3 md:p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-500 font-mono">訂單 #{orderData.orderId.slice(-6)}</span>
                                            <span className="text-sm font-black text-[#EE4D2D]">{orderData.statusLabel}</span>
                                        </div>
                                        
                                        <div className="flex gap-3 bg-slate-50 p-2 rounded-lg items-center border border-slate-100">
                                            <div className="w-12 h-12 rounded overflow-hidden shrink-0 border border-slate-200 bg-white">
                                                <img src={orderData.items[0]?.image} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-slate-700 truncate">{orderData.items[0]?.name}</div>
                                                <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                                                    <span className="truncate pr-2">{orderData.items[0]?.variant || '單一規格'} x {orderData.items[0]?.qty}</span>
                                                    <span className="shrink-0 text-slate-700 font-bold">${orderData.items[0]?.price?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {orderData.items.length > 1 && (
                                            <div className="text-[10px] text-slate-400 text-center font-bold">
                                                ...還有 {orderData.items.length - 1} 件商品
                                            </div>
                                        )}

                                        <div className="text-right text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">
                                            訂單總金額：<span className="text-[#EE4D2D] text-base ml-1 font-black">${orderData.total?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                }
                
                return (
                  <div key={i} className={`flex ${isLegacySystem ? 'justify-center' : isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && !isLegacySystem && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden mr-2 self-end mb-1 shadow-sm border border-white">
                            <img src={activeUser.logo || 'https://placehold.co/100'} className="w-full h-full object-cover" />
                        </div>
                    )}
                    {/* ★ 修復：加入 break-words 解決連續無空白的文字撐破對話框的問題 */}
                    <div className={`max-w-[75%] md:max-w-[60%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words leading-relaxed ${
                        isLegacySystem ? 'bg-black/5 text-slate-500 text-xs py-1 px-4 rounded-full border border-slate-200/50 my-2' : 
                        isMe ? 'bg-[#EE4D2D] text-white rounded-br-none' : 
                        'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                    }`}>
                      {renderMessageContent(safeText)}
                      {!isLegacySystem && <div className={`text-[9px] text-right mt-1 ${isMe ? 'text-white/70' : 'text-slate-400'}`}>{formatMessageTime(m.timestamp)}</div>}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 輸入框 */}
            {!readOnly && (
                <div className="p-3 md:p-4 border-t shrink-0 flex gap-2 bg-white items-end">
                  <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2 flex items-center gap-2 border border-transparent focus-within:border-orange-200 focus-within:bg-white transition-all">
                      <textarea 
                        className="flex-1 bg-transparent outline-none resize-none text-sm max-h-24 py-1" 
                        value={input} 
                        rows={1}
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="輸入訊息..." 
                      />
                  </div>
                  <button onClick={handleSend} className="w-10 h-10 md:w-11 md:h-11 bg-[#EE4D2D] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#d73211] active:scale-95 transition-all flex-shrink-0">
                    <i className="fa-solid fa-paper-plane text-sm md:text-base"></i>
                  </button>
                </div>
            )}
          </>
        ) : (
          /* 電腦版未選擇聯絡人時的預設畫面 */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <i className="fa-regular fa-comments text-4xl"></i>
            </div>
            <div className="font-bold text-slate-400">請從左側選擇聯絡人開始聊天</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;