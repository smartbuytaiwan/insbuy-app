import React, { useState, useRef, useEffect } from 'react';

interface ProductImageCropperProps {
  src: string;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
}

const ProductImageCropper: React.FC<ProductImageCropperProps> = ({ src, onComplete, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
   
  const [containerSize, setContainerSize] = useState(400);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    
    const handleResize = () => {
       setContainerSize(Math.min(window.innerWidth - 80, 400));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [src]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setOffset({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({ x: touch.clientX - startRef.current.x, y: touch.clientY - startRef.current.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleSave = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    
    const outputSize = 800; 
    const scaleFactor = outputSize / containerSize; 

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    const ratioW = containerSize / img.naturalWidth;
    const ratioH = containerSize / img.naturalHeight;
    const baseScale = Math.min(ratioW, ratioH);

    const renderW = img.naturalWidth * baseScale;
    const renderH = img.naturalHeight * baseScale;

    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
    ctx.scale(zoom, zoom);
    
    ctx.drawImage(
      img,
      -renderW * scaleFactor / 2,
      -renderH * scaleFactor / 2,
      renderW * scaleFactor,
      renderH * scaleFactor
    );
    
    ctx.restore();
    
    // ★ 壓縮優化：輸出為 WebP 格式，並將畫質設為 0.7
    canvas.toBlob((blob) => {
        if (blob) {
            onComplete(blob);
        }
    }, 'image/webp', 0.7);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
          <h3 className="font-bold text-lg mb-4 text-slate-800">編輯商品圖片 (1:1)</h3>
          
          <div 
             className="bg-slate-900 overflow-hidden relative mx-auto mb-4 cursor-move border-2 border-slate-200 rounded-lg shadow-inner flex items-center justify-center touch-none" 
             style={{ width: containerSize, height: containerSize }}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
          >
            <img 
               ref={imgRef}
               src={src.startsWith('http') ? `${src}${src.includes('?') ? '&' : '?'}t=${new Date().getTime()}` : src} 
               crossOrigin="anonymous" 
               className="absolute select-none pointer-events-none" 
               style={{ 
                 top: '50%',
                 left: '50%',
                 transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                 maxWidth: '100%',
                 maxHeight: '100%',
                 objectFit: 'contain'
               }}
               draggable={false}
             />
             
             <div className="absolute inset-0 pointer-events-none opacity-30 border border-white/50">
                 <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                 <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                 <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                 <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/50"></div>
             </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
             <i className="fa-solid fa-magnifying-glass-minus text-slate-400 text-xs"></i>
             <input 
               type="range" 
               min="0.5" 
               max="3" 
               step="0.05" 
               value={zoom} 
               onChange={e => setZoom(parseFloat(e.target.value))}
               className="flex-1 accent-[#EE4D2D] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
             />
             <i className="fa-solid fa-magnifying-glass-plus text-slate-600 text-lg"></i>
          </div>

          <div className="flex gap-3">
             <button onClick={handleSave} className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition">確認裁切並上傳</button>
             <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">取消</button>
          </div>
       </div>
    </div>
  );
};

export default ProductImageCropper;