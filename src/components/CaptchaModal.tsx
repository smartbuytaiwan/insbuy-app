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
        // ★ 修復：加入複雜的干擾線與雜訊點，並旋轉扭曲文字防 AI 破解
        // 1. 加入干擾點
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = `rgba(0,0,0, ${Math.random() * 0.2})`;
          ctx.beginPath();
          ctx.arc(Math.random() * 120, Math.random() * 40, Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // 2. 加入隨機曲線干擾線
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = `rgba(${Math.floor(Math.random()*150)}, ${Math.floor(Math.random()*150)}, ${Math.floor(Math.random()*150)}, 0.4)`;
          ctx.lineWidth = Math.random() * 2 + 1;
          ctx.beginPath();
          ctx.moveTo(Math.random() * 30, Math.random() * 40);
          ctx.bezierCurveTo(Math.random() * 60, Math.random() * 40, Math.random() * 90, Math.random() * 40, Math.random() * 30 + 90, Math.random() * 40);
          ctx.stroke();
        }

        // 3. 繪製扭曲旋轉且顏色隨機的文字
        const charWidth = 120 / (code.length + 1);
        for (let i = 0; i < code.length; i++) {
          const char = code[i];
          const x = charWidth * (i + 1);
          const y = 20 + (Math.random() * 6 - 3); 
          const rot = (Math.random() - 0.5) * 0.5;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.fillStyle = `rgb(${Math.floor(Math.random()*100)}, ${Math.floor(Math.random()*100)}, ${Math.floor(Math.random()*100)})`;
          ctx.fillText(char, 0, 0);
          ctx.restore();
        }
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