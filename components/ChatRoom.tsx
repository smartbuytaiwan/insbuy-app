import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatThread, Product } from '../types';
import { getAIChatResponse } from '../geminiService';

interface ChatRoomProps {
  targetId?: string | null;
  currentProduct?: Product | null;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ targetId, currentProduct }) => {
  const [threads, setThreads] = useState<ChatThread[]>([
    { contact_id: 'ai-helper', contact_name: 'InsBuy AI 助手', last_message: '我是您的專屬購物管家', unread: true },
    { contact_id: 'S001', contact_name: '正韓服飾旗艦店', last_message: '歡迎詢問商品細節', unread: false }
  ]);
  
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    'ai-helper': [
      { id: '1', sender_id: 'ai-helper', receiver_id: 'user', text: '您好！我是您的專屬 AI 團購助理。我可以幫您分析商品、查詢訂單或提供購物建議。請問有什麼我可以幫您的嗎？', timestamp: new Date().toISOString() }
    ]
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = threads.find(t => t.contact_id === (targetId || 'ai-helper'));
    setActiveThread(target || threads[0]);
  }, [targetId, threads]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim() || !activeThread || isLoading) return;

    const threadId = activeThread.contact_id;
    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      sender_id: 'user', 
      receiver_id: threadId, 
      text: inputValue, 
      timestamp: new Date().toISOString() 
    };
    
    setMessages(prev => ({ ...prev, [threadId]: [...(prev[threadId] || []), userMsg] }));
    setInputValue('');

    if (threadId === 'ai-helper') {
      setIsLoading(true);
      const history = (messages['ai-helper'] || []).map(m => ({ 
        role: m.sender_id === 'user' ? 'user' : 'model', 
        parts: [{ text: m.text }] 
      }));
      const response = await getAIChatResponse(inputValue, history);
      const aiMsg: ChatMessage = { 
        id: (Date.now()+1).toString(), 
        sender_id: 'ai-helper', 
        receiver_id: 'user', 
        text: response, 
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => ({ ...prev, [threadId]: [...(prev[threadId] || []), aiMsg] }));
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[75vh] flex bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden animate-fade-in-up">
      <div className="w-80 border-r bg-slate-50/40 hidden md:flex flex-col">
        <div className="p-8 bg-white border-b">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">CHATS</h2>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {threads.map(t => (
            <div 
              key={t.contact_id} 
              onClick={() => setActiveThread(t)} 
              className={`p-6 flex gap-4 items-center cursor-pointer transition-all duration-300 ${activeThread?.contact_id === t.contact_id ? 'bg-white shadow-lg z-10 scale-[1.02] border-l-4 border-[#EE4D2D]' : 'hover:bg-white/60'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${t.contact_id === 'ai-helper' ? 'primary-gradient' : 'bg-slate-800'}`}>
                {t.contact_id === 'ai-helper' ? <i className="fa-solid fa-robot text-lg"></i> : <i className="fa-solid fa-store"></i>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-slate-800 truncate">{t.contact_name}</div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{t.last_message}</div>
              </div>
              {t.unread && <div className="w-2 h-2 bg-[#EE4D2D] rounded-full"></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="px-8 py-5 border-b flex items-center justify-between glass-morphism sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${activeThread?.contact_id === 'ai-helper' ? 'primary-gradient' : 'bg-slate-800'}`}>
               <i className={`fa-solid ${activeThread?.contact_id === 'ai-helper' ? 'fa-wand-magic-sparkles' : 'fa-shop'}`}></i>
            </div>
            <div>
              <div className="font-black text-slate-800 text-sm tracking-wide">{activeThread?.contact_name}</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Now</span>
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20">
          {messages[activeThread?.contact_id || '']?.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_id === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
              <div className={`max-w-[80%] px-6 py-4 rounded-[1.5rem] text-sm shadow-sm leading-relaxed ${
                msg.sender_id === 'user' 
                ? 'primary-gradient text-white rounded-tr-none font-medium' 
                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
              }`}>
                {msg.text}
                <div className={`text-[9px] mt-2 ${msg.sender_id === 'user' ? 'text-white/60' : 'text-slate-300'} font-mono`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm rounded-tl-none flex gap-2 items-center">
                <div className="w-1.5 h-1.5 bg-[#EE4D2D] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-[#EE4D2D] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-[#EE4D2D] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t bg-white">
          <div className="flex gap-4 items-center bg-slate-100/50 rounded-2xl p-2 pl-6 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EE4D2D]/5 transition-all duration-300 border border-transparent focus-within:border-[#EE4D2D]/20">
            <input 
              type="text" 
              placeholder="輸入訊息詢問 AI 助手..." 
              className="flex-1 bg-transparent outline-none text-sm py-3 text-slate-700 font-medium"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend} 
              disabled={!inputValue.trim() || isLoading}
              className="w-12 h-12 primary-gradient text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;