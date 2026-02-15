
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';

interface ChatRoomProps {
  currentUser: User | null;
  targetId: string | null;
  allUsers: User[];
  currentProduct?: any; 
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

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, targetId, allUsers, currentProduct }) => {
  const [activeContactId, setActiveContactId] = useState<string | null>(targetId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat Metadata State (Pending status, Notes)
  const [chatMeta, setChatMeta] = useState<Record<string, ChatMetadata>>({});
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, contactId: string } | null>(null);
  
  // Note Editing State
  const [editingNote, setEditingNote] = useState<{ contactId: string, note: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('insbuy_chat_messages');
    if (saved) setMessages(JSON.parse(saved));
    
    // Load metadata
    const savedMeta = localStorage.getItem(`insbuy_chat_meta_${currentUser?.id}`);
    if (savedMeta) setChatMeta(JSON.parse(savedMeta));
  }, [currentUser]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('insbuy_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (currentUser && Object.keys(chatMeta).length > 0) {
      localStorage.setItem(`insbuy_chat_meta_${currentUser.id}`, JSON.stringify(chatMeta));
    }
  }, [chatMeta, currentUser]);

  useEffect(() => {
    if (targetId) setActiveContactId(targetId);
  }, [targetId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContactId]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <i className="fa-regular fa-comments text-6xl mb-4"></i>
          <p className="font-bold">請先登入以使用聊聊功能</p>
        </div>
      </div>
    );
  }

  const contacts = allUsers.filter(u => {
    if (u.id === currentUser.id) return false;
    if (targetId && (u.id === targetId || u.shop_id === targetId)) return true;
    
    // 檢查歷史訊息，需考慮 Shop ID 與 User ID 可能不同但屬於同一人
    // 對於買家來說：我(currentUser.id) 與 賣家(u.id 或 u.shop_id) 有訊息
    // 對於賣家來說：我(currentUser.id 或 currentUser.shop_id) 與 買家(u.id) 有訊息
    const hasHistory = messages.some(m => {
        const isMeSender = m.senderId === currentUser.id || m.senderId === currentUser.shop_id;
        const isMeReceiver = m.receiverId === currentUser.id || m.receiverId === currentUser.shop_id;
        const isContactSender = m.senderId === u.id || m.senderId === u.shop_id;
        const isContactReceiver = m.receiverId === u.id || m.receiverId === u.shop_id;
        
        return (isMeSender && isContactReceiver) || (isContactSender && isMeReceiver);
    });
    return hasHistory;
  });

  const activeUser = allUsers.find(u => u.id === activeContactId || u.shop_id === activeContactId);

  const activeMessages = messages.filter(m => {
    if (!currentUser || !activeContactId) return false;

    // 擴充比對邏輯：只要該訊息的發送者或接收者，匹配「我的任何 ID」以及「對方的 ID (activeContactId)」
    const myIds = [currentUser.id, currentUser.shop_id].filter(Boolean);
    
    // 判斷是否為我發給對方，或是對方發給我
    // 注意：activeContactId 通常是對方的一個 ID (例如買家 ID 或 賣家 Shop ID)
    const isSenderMe = myIds.includes(m.senderId);
    const isReceiverMe = myIds.includes(m.receiverId);
    
    const isSenderTarget = m.senderId === activeContactId;
    const isReceiverTarget = m.receiverId === activeContactId;

    return (isSenderMe && isReceiverTarget) || (isSenderTarget && isReceiverMe);
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleSend = () => {
    if (!input.trim() || !activeContactId) return;

    // 如果我是賣家，優先使用 shop_id 發送訊息 (如果有的話)，讓買家看到的是商店
    // 如果我是買家，使用 user.id
    const senderId = currentUser.shop_id || currentUser.id;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: senderId,
      receiverId: activeContactId,
      text: input,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    setMessages([...messages, newMessage]);
    setInput('');

    if (activeContactId === 'admin01' || activeContactId === 'seller01') {
      setTimeout(() => {
        const reply: Message = {
          id: `msg_${Date.now() + 1}`,
          senderId: activeContactId,
          receiverId: currentUser.id,
          text: `[自動回覆] 收到您的訊息：「${input}」。我們會盡快回覆您！`,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        setMessages(prev => [...prev, reply]);
      }, 1000);
    }
  };

  const getUnreadCount = (contactId: string) => {
    return messages.filter(m => m.senderId === contactId && m.receiverId === currentUser.id && !m.isRead).length;
  };

  const handleContextMenu = (e: React.MouseEvent, contactId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, contactId });
  };

  const markAsRead = (contactId: string) => {
    const updatedMessages = messages.map(m => {
      if (m.senderId === contactId && m.receiverId === currentUser.id && !m.isRead) {
        return { ...m, isRead: true };
      }
      return m;
    });
    setMessages(updatedMessages);
  };

  const togglePending = (contactId: string) => {
    setChatMeta(prev => ({
      ...prev,
      [contactId]: {
        ...prev[contactId],
        status: prev[contactId]?.status === 'PENDING' ? 'NORMAL' : 'PENDING'
      }
    }));
  };

  const openNoteEditor = (contactId: string) => {
    const currentNote = chatMeta[contactId]?.note || '';
    setEditingNote({ contactId, note: currentNote });
  };

  const saveNote = () => {
    if (!editingNote) return;
    setChatMeta(prev => ({
      ...prev,
      [editingNote.contactId]: {
        ...prev[editingNote.contactId],
        note: editingNote.note,
        status: prev[editingNote.contactId]?.status || 'NORMAL'
      }
    }));
    setEditingNote(null);
  };

  // 當點擊切換對話時，自動標示已讀
  const handleContactClick = (contactId: string) => {
    setActiveContactId(contactId);
    markAsRead(contactId);
  };

  // 格式化時間：月/日 時間，跨年顯示 年/月/日 時間
  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isSameYear = date.getFullYear() === now.getFullYear();

    // 格式化為: 03/15 (月/日)
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // 取得當地時間字串 (例如 "下午 02:30" 或 "14:30")
    // 使用 hour12: true 強制顯示 上午/下午 (視瀏覽器 locale 而定，中文環境通常會有)
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (isSameYear) {
      return `${month}/${day} ${timeStr}`;
    } else {
      return `${date.getFullYear()}/${month}/${day} ${timeStr}`;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-120px)] flex relative">
      {/* 備註編輯 Modal */}
      {editingNote && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <i className="fa-solid fa-note-sticky text-yellow-500"></i> 編輯備註
            </h3>
            <textarea 
              className="w-full h-32 border border-slate-200 rounded-xl p-3 resize-none outline-none focus:border-[#EE4D2D] text-sm"
              placeholder="輸入關於此客戶的備註..."
              value={editingNote.note}
              onChange={e => setEditingNote({...editingNote, note: e.target.value})}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setEditingNote(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold">取消</button>
              <button onClick={() => setEditingNote({...editingNote, note: ''})} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-bold">清除</button>
              <button onClick={saveNote} className="px-6 py-2 bg-[#EE4D2D] text-white rounded-lg text-sm font-bold shadow-md hover:bg-[#d73211]">儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* 右鍵選單 */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-slate-100 shadow-xl rounded-xl py-1 z-[9999] w-40 overflow-hidden text-sm font-bold animate-scale-up"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { markAsRead(contextMenu.contactId); setContextMenu(null); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-slate-600">
            <i className="fa-solid fa-check-double text-blue-500"></i> 標示已讀
          </button>
          <button onClick={() => { togglePending(contextMenu.contactId); setContextMenu(null); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-slate-600">
            <i className={`fa-solid fa-thumbtack ${chatMeta[contextMenu.contactId]?.status === 'PENDING' ? 'text-slate-300' : 'text-red-500'}`}></i> 
            {chatMeta[contextMenu.contactId]?.status === 'PENDING' ? '取消待處理' : '設為待處理'}
          </button>
          <button onClick={() => { openNoteEditor(contextMenu.contactId); setContextMenu(null); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-slate-600">
            <i className="fa-solid fa-pen-to-square text-orange-500"></i> 編輯備註
          </button>
        </div>
      )}

      {/* 左側聯絡人列表 */}
      <div className="w-1/3 md:w-1/4 border-r border-slate-100 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex justify-between items-center">
          <span>聊聊訊息</span>
          <span className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-500">按右鍵更多選項</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 text-center">尚無聊天對象</div>
          ) : (
            contacts.map(u => {
              const unread = getUnreadCount(u.id);
              const meta = chatMeta[u.id];
              return (
                <div 
                  key={u.id}
                  onClick={() => handleContactClick(u.id)}
                  onContextMenu={(e) => handleContextMenu(e, u.id)}
                  className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-white transition relative group ${activeContactId === u.id ? 'bg-white border-l-4 border-[#EE4D2D]' : 'border-l-4 border-transparent'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 relative">
                    <img src={u.logo || 'https://placehold.co/100'} className="w-full h-full object-cover"/>
                    {unread > 0 && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="font-bold text-sm text-slate-700 truncate">{u.shop_name || u.name}</div>
                      {unread > 0 && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{unread}</span>}
                    </div>
                    
                    {/* 顯示狀態標籤 */}
                    <div className="flex items-center gap-1">
                      {meta?.status === 'PENDING' && (
                        <span className="text-[9px] bg-yellow-100 text-yellow-600 px-1 rounded border border-yellow-200 whitespace-nowrap">待處理</span>
                      )}
                      {meta?.note && (
                        <span className="text-[9px] bg-blue-50 text-blue-500 px-1 rounded border border-blue-100 truncate max-w-[80px]">
                          <i className="fa-solid fa-note-sticky mr-1"></i>備註
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-1">
                      {messages.filter(m => m.senderId === u.id || m.receiverId === u.id).slice(-1)[0]?.text.replace('[系統通知]', '系統提示:') || '...'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右側聊天區域 */}
      <div className="flex-1 flex flex-col bg-white">
        {activeUser ? (
          <>
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    <img src={activeUser.logo || 'https://placehold.co/100'} className="w-full h-full object-cover"/>
                 </div>
                 <div>
                    <div className="font-bold text-slate-800">{activeUser.shop_name || activeUser.name}</div>
                    <div className="text-xs text-slate-400">
                      {chatMeta[activeUser.id]?.note ? (
                        <span className="text-blue-500"><i className="fa-solid fa-note-sticky mr-1"></i>{chatMeta[activeUser.id].note}</span>
                      ) : '線上'}
                    </div>
                 </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-ellipsis-vertical"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {activeMessages.map(m => {
                const isSystem = m.text.startsWith('[系統通知]');
                // 檢查是否為「我」發送的訊息
                // 注意：如果我是賣家，我可能用 shop_id 發送，所以也要檢查
                const isMe = !isSystem && (m.senderId === currentUser.id || m.senderId === currentUser.shop_id);
                
                // 系統通知一律靠左 (justify-start)，自己發的靠右，對方發的靠左
                // 關鍵修改：isSystem ? 'justify-start' 強制靠左
                const alignmentClass = isSystem ? 'justify-start' : (isMe ? 'justify-end' : 'justify-start');

                return (
                  <div key={m.id} className={`flex ${alignmentClass}`}>
                    <div className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm shadow-sm relative group whitespace-pre-wrap ${
                        isSystem 
                          ? 'bg-orange-50 border border-orange-200 text-slate-600 rounded-bl-none' 
                          : isMe 
                            ? 'bg-[#EE4D2D] text-white rounded-br-none' 
                            : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                      }`}>
                      
                      {/* 系統訊息標頭 - 強制顯示在上方 */}
                      {isSystem && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#EE4D2D] mb-2 pb-2 border-b border-orange-100/50">
                          <i className="fa-solid fa-circle-info"></i> 系統提示
                        </div>
                      )}

                      {/* 移除系統訊息標籤後顯示 */}
                      {m.text.replace('[系統通知]', '').trim()}
                      
                      <div className={`text-[10px] mt-1 opacity-70 ${isMe && !isSystem ? 'text-right text-white/80' : 'text-right text-slate-400'}`}>
                        {formatMessageTime(m.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-3 bg-slate-100 rounded-full px-2 py-2">
                <button className="w-8 h-8 rounded-full bg-white text-slate-500 hover:text-[#EE4D2D] shadow-sm flex items-center justify-center transition">
                   <i className="fa-solid fa-plus"></i>
                </button>
                <input 
                  type="text" 
                  className="flex-1 bg-transparent outline-none text-sm px-2"
                  placeholder="輸入訊息..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  className="w-9 h-9 rounded-full bg-[#EE4D2D] text-white hover:bg-[#d73211] shadow-md flex items-center justify-center transition"
                >
                   <i className="fa-solid fa-paper-plane text-xs"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 flex-col">
            <i className="fa-regular fa-paper-plane text-6xl mb-4 opacity-50"></i>
            <p className="font-bold">選擇左側聯絡人開始聊天</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
