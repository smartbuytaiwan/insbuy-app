// components/CaptchaModal.tsx
import React, { useState, useEffect, useRef } from 'react';

const CaptchaModal = ({ onVerify, onCancel }: { onVerify: () => void, onCancel: () => void }) => {
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setCode(result);
  };

  useEffect(() => { generateCode(); }, []);

  useEffect(() => {
    if (canvasRef.current && code) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 120, 40);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, 120, 40);
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#334155';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        // 加入干擾線
        for(let i=0; i<5; i++) {
           ctx.strokeStyle = `rgba(0,0,0,0.1)`;
           ctx.beginPath();
           ctx.moveTo(Math.random()*120, Math.random()*40);
           ctx.lineTo(Math.random()*120, Math.random()*40);
           ctx.stroke();
        }
        ctx.fillText(code, 60, 20);
      }
    }
  }, [code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.toUpperCase() === code) onVerify();
    else { alert('驗證碼錯誤，請重新輸入'); generateCode(); setInput(''); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-up">
        <h3 className="font-bold text-lg mb-4 text-center">安全驗證</h3>
        <p className="text-xs text-slate-500 mb-4 text-center">為了確保您的帳號安全，請輸入下方驗證碼</p>
        <div className="flex justify-center mb-4 cursor-pointer" onClick={generateCode} title="點擊更換">
           <canvas ref={canvasRef} width={120} height={40} className="rounded border border-slate-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
           <input 
             autoFocus
             type="text" 
             className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center font-bold outline-none focus:border-[#EE4D2D] tracking-widest uppercase"
             placeholder="輸入驗證碼"
             value={input}
             onChange={e => setInput(e.target.value)}
           />
           <div className="flex gap-2">
             <button type="button" onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">取消</button>
             <button type="submit" className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-md">確認登入</button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default CaptchaModal;