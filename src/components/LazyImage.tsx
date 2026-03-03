import React, { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
}

const LazyImage: React.FC<Props> = ({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {/* 骨架屏：當圖片尚未載入完成時，顯示這個會呼吸閃爍的灰色方塊 */}
      {!loaded && (
        <div className={`absolute inset-0 bg-slate-200 animate-pulse ${className?.replace('group-hover:scale-110', '')}`}></div>
      )}
      
      {/* 實際圖片：加入 HTML5 原生 loading="lazy" 屬性，並在載入完成時加上淡入動畫 */}
      <img 
        src={src} 
        alt={alt} 
        loading="lazy" 
        decoding="async"
        onLoad={() => setLoaded(true)} 
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'}`} 
      />
    </>
  );
};

export default LazyImage;