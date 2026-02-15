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
  // 狀態管理
  const [activeContactId, setActiveContactId] = useState<string | null>(targetId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  // 紀錄每個聯絡人的最後訊息時間，用於排序
  const [contactLastTime, setContactLastTime] = useState<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({}); 
  
  // 輔助功能狀態
  const [chatMeta, setChatMeta] = useState<Record<string, ChatMetadata>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, contactId: string } | null>(null);
  const [editingNote, setEditingNote] = useState<{ contactId: string, note: string } | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeContactIdRef = useRef<string | null>(targetId);
  const pollingRef = useRef<any>(null);

  // 同步 activeContactId
  useEffect(() => {
    activeContactIdRef.current = activeContactId;
    if (activeContactId && !readOnly) {
        markAsRead(activeContactId);
    }
  }, [activeContactId, readOnly]);

  // 當外部 targetId 改變時切換
  useEffect(() => {
    if (targetId) setActiveContactId(targetId);
  }, [targetId]);

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

  // ★ 功能4 修復：統一 ID 邏輯，確保一個帳號只有一個頻道
  // 如果我是賣家，我強制使用 shop_id 作為我的身分 ID 與人對話，這樣買家敲我店鋪時我也收得到
  // 如果我是純買家，則使用 id
  const getMyId = () => {
    if (!currentUser) return '';
    return currentUser.shop_id || currentUser.id;
  };

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
      localStorage.setItem(`insbuy_last_read_${myId}_${contactId}`, new Date().toISOString());
      window.dispatchEvent(new Event('insbuy_message_read'));
  };

  // 輪詢邏輯
  useEffect(() => {
    if (!currentUser) return;
    const myId = getMyId();

    const fetchData = async () => {
      try {
        // 抓取所有與我 (myId) 有關的訊息
        const allMyMessages = await API.getAllUserMessages(myId);
        
        if (Array.isArray(allMyMessages)) {
            const counts: Record<string, number> = {};
            const times: Record<string, number> = {}; 

            allMyMessages.forEach((m: any) => {
                const safeMsg = mapMessageData(m);
                // 判斷對話對象 ID
                const partnerId = (safeMsg.senderId === myId) ? safeMsg.receiverId : safeMsg.senderId;
                
                // 更新該聯絡人的最後訊息時間
                const msgTime = new Date(safeMsg.timestamp).getTime();
                if (!times[partnerId] || msgTime > times[partnerId]) {
                    times[partnerId] = msgTime;
                }

                // 計算未讀 (我是接收者且未讀)
                if (safeMsg.receiverId === myId) {
                    const lastRead = getLastReadTime(safeMsg.senderId);
                    const isNew = !lastRead || new Date(safeMsg.timestamp) > new Date(lastRead);
                    
                    if (!safeMsg.isRead && isNew) {
                        counts[safeMsg.senderId] = (counts[safeMsg.senderId] || 0) + 1;
                    }
                }
            });
            
            setContactLastTime(times);

            // 當前對話視為已讀
            const currentTarget = activeContactIdRef.current;
            if (currentTarget && !readOnly) {
                counts[currentTarget] = 0; 
            }
            setUnreadCounts(counts);
        }

        // 抓取當前聊天室的詳細訊息
        const currentTarget = activeContactIdRef.current;
        if (currentTarget) {
            // 注意：這裡使用 myId 確保身分一致
            const dbMessages = await API.getMessages(myId, currentTarget);
            if (Array.isArray(dbMessages)) {
                const formattedMessages = dbMessages.map(mapMessageData);
                formattedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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
  }, [messages, activeContactId]);

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
    
    updateLastReadTime(activeContactId);

    const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        senderId: myId,
        receiverId: activeContactId,
        text: input,
        timestamp,
        isRead: false
    };
    
    setMessages(prev => [...prev, tempMessage]);
    const msgToSend = input;
    setInput(''); 

    try {
      await API.sendMessage({
        senderId: myId,
        receiverId: activeContactId,
        content: msgToSend,
        timestamp
      });
    } catch (error) {
      alert("訊息發送失敗");
    }
  };

  const markAsRead = (contactId: string) => {
     if(readOnly) return;
     updateLastReadTime(contactId);
     setUnreadCounts(prev => ({ ...prev, [contactId]: 0 }));
  };

  const handleContactClick = (contactId: string) => {
    setActiveContactId(contactId);
    markAsRead(contactId);
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

  if (!currentUser) return <div className="flex items-center justify-center h-[60vh] text-slate-400">請先登入以使用聊聊功能</div>;

  // 聯絡人排序邏輯
  const contacts = allUsers.filter(u => {
    const myId = getMyId();
    if (u.id === myId || u.shop_id === myId || u.id === currentUser.id || u.shop_id === currentUser.shop_id) return false;
    
    // 顯示條件：是當前目標，或者有對話記錄
    const uid = u.shop_id || u.id;
    if (targetId && (uid === targetId)) return true;
    return !!contactLastTime[uid]; 
  }).sort((a, b) => {
     const idA = a.shop_id || a.id;
     const idB = b.shop_id || b.id;

     const unreadA = (unreadCounts[idA] || 0) > 0 ? 1 : 0;
     const unreadB = (unreadCounts[idB] || 0) > 0 ? 1 : 0;
     if (unreadA !== unreadB) {
         return unreadB - unreadA; 
     }

     const timeA = contactLastTime[idA] || 0;
     const timeB = contactLastTime[idB] || 0;
     return timeB - timeA;
  });

  const activeUser = allUsers.find(u => (u.shop_id || u.id) === activeContactId);

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

      {/* 左側聯絡人列表 */}
      <div className="w-1/3 md:w-1/4 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b font-bold text-slate-700 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
            <span>{readOnly ? '歷史紀錄對象' : '聊聊訊息'}</span>
            <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-600">{contacts.length}</span>
        </div>
        {/* ★ 功能5: 增加可以拉的捲軸 (overflow-y-auto) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {contacts.map(u => {
            const contactId = u.shop_id || u.id;
            const unread = (activeContactId === contactId || readOnly) ? 0 : (unreadCounts[contactId] || 0);
            
            return (
                <div 
                    key={u.id} 
                    onClick={() => handleContactClick(contactId)} 
                    onContextMenu={(e) => {
                        e.preventDefault(); 
                        if(!readOnly) setContextMenu({x:e.clientX, y:e.clientY, contactId})
                    }} 
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-white transition-colors border-b border-transparent relative group ${activeContactId === contactId ? 'bg-white border-l-4 border-l-[#EE4D2D] shadow-sm' : ''}`}
                >
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-100 relative">
                    <img src={u.logo || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="avatar"/>
                </div>
                
                <div className="flex-1 min-w-0 pr-6 relative">
                    <div className="font-bold text-sm text-slate-700 truncate">{u.shop_name || u.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                        {chatMeta[contactId]?.status === 'PENDING' && <span className="text-[9px] bg-yellow-100 text-yellow-600 px-1 rounded border border-yellow-200">待處理</span>}
                        {chatMeta[contactId]?.note && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded max-w-[80px] truncate">{chatMeta[contactId].note}</span>}
                    </div>
                    {unread > 0 && (
                        <div className="absolute top-0 right-0 -mt-1 -mr-2 bg-[#EE4D2D] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-sm min-w-[18px] text-center z-10 animate-bounce-short">
                            {unread > 99 ? '99+' : unread}
                        </div>
                    )}
                </div>
                </div>
            );
          })}
          {contacts.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">暫無聯絡人</div>
          )}
        </div>
      </div>

      {/* 右側對話框 */}
      <div className="flex-1 flex flex-col bg-white">
        {readOnly && (
            <div className="bg-red-50 text-red-600 px-4 py-2 text-xs font-bold border-b border-red-100 text-center">
                <i className="fa-solid fa-eye mr-2"></i> 管理員唯讀模式 (僅供查閱)
            </div>
        )}
        
        {activeUser ? (
          <>
            <div className="border-b flex items-center px-6 py-4 bg-white shrink-0 font-bold justify-between sticky top-0 z-20">
                <span className="text-lg text-slate-800">{activeUser.shop_name || activeUser.name}</span>
            </div>

            {siteSettings?.antiScamMessage && (
                <div className="bg-red-50 text-red-600 px-6 py-3 text-xs font-bold border-b border-red-100 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span className="flex-1 whitespace-pre-wrap">{siteSettings.antiScamMessage}</span>
                </div>
            )}

            {currentProduct && !readOnly && (
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center gap-4 animate-fade-in">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0">
                        <img src={currentProduct.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-700 truncate">{currentProduct.name}</div>
                        <div className="text-xs text-[#EE4D2D] font-black">${currentProduct.price.toLocaleString()}</div>
                    </div>
                    <button 
                        onClick={handlePasteProductInfo}
                        className="px-4 py-2 bg-white border border-[#EE4D2D] text-[#EE4D2D] rounded-lg text-xs font-bold hover:bg-orange-50 transition shadow-sm flex items-center gap-2"
                    >
                        <i className="fa-solid fa-link"></i> 傳送連結
                    </button>
                </div>
            )}
            
            {/* ★ 功能5: 訊息列表增加可以拉的捲軸 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {messages.map((m, i) => {
                const safeText = m.text || "";
                const isSystem = safeText.startsWith('[系統通知]');
                // 判斷是否為自己 (包含 ID 或 Shop ID)
                const isMe = !isSystem && (m.senderId === currentUser.id || m.senderId === currentUser.shop_id);
                
                return (
                  <div key={i} className={`flex ${isSystem ? 'justify-center' : isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                        isSystem ? 'bg-orange-50 text-slate-600 border border-orange-200 text-xs py-1 px-4 rounded-full' : 
                        isMe ? 'bg-[#EE4D2D] text-white rounded-br-none' : 
                        'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                    }`}>
                      {renderMessageContent(safeText)}
                      {!isSystem && <div className={`text-[10px] text-right mt-1 ${isMe ? 'text-white/70' : 'text-slate-400'}`}>{formatMessageTime(m.timestamp)}</div>}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {!readOnly && (
                <div className="p-4 border-t shrink-0 flex gap-2 bg-white">
                  <textarea 
                    className="flex-1 bg-slate-100 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-orange-100 transition-all resize-none h-12 pt-3" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="輸入訊息..." 
                  />
                  <button onClick={handleSend} className="w-12 h-12 bg-[#EE4D2D] text-white rounded-full flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all">
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <i className="fa-regular fa-comments text-6xl mb-4 text-slate-200"></i>
            <div className="font-bold">請從左側選擇聯絡人</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;