import React, { useRef, useState, useEffect } from 'react';

interface DraggableFavItemProps {
  id: string;
  type: 'FOLDER' | 'BOOKMARK';
  onDropComplete: (dragItem: { id: string; type: string }, dropTarget: { id: string; type: string }) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  children: React.ReactNode;
  className?: string;
}

export default function DraggableFavItem({ id, type, onDropComplete, onClick, children, className = '' }: DraggableFavItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 確保閉包內能取到最新的 drop 函數
  const onDropRef = useRef(onDropComplete);
  onDropRef.current = onDropComplete;

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    let dragTimer: NodeJS.Timeout | null = null;
    let isPointerDown = false;
    let draggingNow = false;
    let startX = 0;
    let startY = 0;
    
    // 記錄滑鼠/手指點擊在物件上的「相對位置」，防止殘影瞬間瞬移
    let offsetX = 0; 
    let offsetY = 0;
    let ghostEl: HTMLElement | null = null;

    // 清除全域事件
    const cleanupGlobalEvents = () => {
        window.removeEventListener('touchmove', globalTouchMove);
        window.removeEventListener('touchend', globalTouchEnd);
        window.removeEventListener('touchcancel', globalTouchEnd);
        window.removeEventListener('mousemove', globalMouseMove);
        window.removeEventListener('mouseup', globalMouseUp);
    };

    // === 啟動拖曳核心 ===
    const executeStartDrag = (clientX: number, clientY: number) => {
        draggingNow = true;
        setIsDragging(true);

        // 精準取得原物件的大小與座標
        const rect = el.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;

        // 複製殘影
        const clone = el.cloneNode(true) as HTMLElement;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.position = 'fixed';
        clone.style.left = `${clientX - offsetX}px`;
        clone.style.top = `${clientY - offsetY}px`;
        clone.style.margin = '0';
        clone.style.opacity = '0.9';
        clone.style.zIndex = '999999';
        clone.style.pointerEvents = 'none'; // 讓感應穿透殘影
        
        // ★ 關鍵修復：強制關閉複製過來的 CSS 動畫，保證拖曳 0 延遲
        clone.style.transition = 'none'; 
        clone.style.transform = 'scale(1.05)';
        clone.style.boxShadow = '0 15px 30px rgba(0,0,0,0.2)';

        document.body.appendChild(clone);
        ghostEl = clone;

        // 鎖定背景防呆
        document.body.style.userSelect = 'none';
        document.body.style.overflow = 'hidden';
        if (navigator.vibrate) navigator.vibrate(50);

        // ★ 關鍵修復：將追蹤事件提升到全域 Window，確保滑太快也不會斷線
        window.addEventListener('touchmove', globalTouchMove, { passive: false });
        window.addEventListener('touchend', globalTouchEnd, { passive: false });
        window.addEventListener('touchcancel', globalTouchEnd, { passive: false });
        window.addEventListener('mousemove', globalMouseMove, { passive: false });
        window.addEventListener('mouseup', globalMouseUp, { passive: false });
    };

    // === 結束拖曳核心 ===
    const executeEndDrag = (clientX: number, clientY: number) => {
        isPointerDown = false;
        if (dragTimer) clearTimeout(dragTimer);
        cleanupGlobalEvents();

        document.body.style.userSelect = '';
        document.body.style.overflow = '';

        if (draggingNow && ghostEl) {
            ghostEl.remove();
            ghostEl = null;

            setTimeout(() => setIsDragging(false), 50);

            // 尋找放開時的下方目標
            el.style.visibility = 'hidden';
            const dropTarget = document.elementFromPoint(clientX, clientY);
            el.style.visibility = 'visible';

            const dropContainer = dropTarget?.closest('[data-drop-id]');
            if (dropContainer) {
                const dropId = dropContainer.getAttribute('data-drop-id');
                const dropType = dropContainer.getAttribute('data-drop-type');
                if (dropId && dropType && (dropId !== id || dropType !== type)) {
                    onDropRef.current({ id, type }, { id: dropId, type: dropType });
                }
            }
        } else {
            setIsDragging(false);
        }
        draggingNow = false;
    };

    // === 升級後的全域移動事件 ===
    const globalTouchMove = (e: TouchEvent) => {
        if (draggingNow && ghostEl) {
            e.preventDefault(); 
            ghostEl.style.left = `${e.touches[0].clientX - offsetX}px`;
            ghostEl.style.top = `${e.touches[0].clientY - offsetY}px`;
        }
    };
    const globalTouchEnd = (e: TouchEvent) => {
        executeEndDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };
    const globalMouseMove = (e: MouseEvent) => {
        if (draggingNow && ghostEl) {
            e.preventDefault();
            ghostEl.style.left = `${e.clientX - offsetX}px`;
            ghostEl.style.top = `${e.clientY - offsetY}px`;
        }
    };
    const globalMouseUp = (e: MouseEvent) => {
        executeEndDrag(e.clientX, e.clientY);
    };

    // === 原物件感應事件 ===
    const handleTouchStart = (e: TouchEvent) => {
        isPointerDown = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        if (dragTimer) clearTimeout(dragTimer);
        // 手機長按 0.25 秒啟動
        dragTimer = setTimeout(() => {
            if (isPointerDown && !draggingNow) executeStartDrag(startX, startY);
        }, 250); 
    };

    const handleTouchMoveLocal = (e: TouchEvent) => {
        if (!isPointerDown || draggingNow) return;
        const dist = Math.abs(e.touches[0].clientX - startX) + Math.abs(e.touches[0].clientY - startY);
        if (dist > 15) { // 允許 15px 手抖容錯
            if (dragTimer) clearTimeout(dragTimer);
            isPointerDown = false;
        }
    };

    const handleTouchEndLocal = () => {
        if (dragTimer) clearTimeout(dragTimer);
        isPointerDown = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        isPointerDown = true;
        startX = e.clientX;
        startY = e.clientY;
        if (dragTimer) clearTimeout(dragTimer);
        // 電腦稍微按住 0.15 秒啟動
        dragTimer = setTimeout(() => {
            if (isPointerDown && !draggingNow) executeStartDrag(e.clientX, e.clientY);
        }, 150);
    };

    const handleMouseMoveLocal = (e: MouseEvent) => {
        if (!isPointerDown || draggingNow) return;
        const dist = Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY);
        if (dist > 3) {
            if (dragTimer) clearTimeout(dragTimer);
            executeStartDrag(e.clientX, e.clientY); // 電腦滑超過 3px 瞬間啟動
        }
    };

    const handleMouseUpLocal = () => {
        if (dragTimer) clearTimeout(dragTimer);
        isPointerDown = false;
    };

    // 綁定事件
    el.addEventListener('touchstart', handleTouchStart, { passive: true }); 
    el.addEventListener('touchmove', handleTouchMoveLocal, { passive: true });
    el.addEventListener('touchend', handleTouchEndLocal, { passive: true });
    el.addEventListener('touchcancel', handleTouchEndLocal, { passive: true });
    
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mousemove', handleMouseMoveLocal);
    el.addEventListener('mouseup', handleMouseUpLocal);
    el.addEventListener('mouseleave', handleMouseUpLocal);

    return () => {
        if (dragTimer) clearTimeout(dragTimer);
        cleanupGlobalEvents();
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMoveLocal);
        el.removeEventListener('touchend', handleTouchEndLocal);
        el.removeEventListener('touchcancel', handleTouchEndLocal);
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mousemove', handleMouseMoveLocal);
        el.removeEventListener('mouseup', handleMouseUpLocal);
        el.removeEventListener('mouseleave', handleMouseUpLocal);
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
        document.body.style.userSelect = '';
        document.body.style.overflow = '';
    };
  }, [id, type]);

  return (
    <div
      ref={itemRef}
      data-drop-id={id}
      data-drop-type={type}
      // 被拖曳時，原物件變透明並加上底色，讓使用者明顯感覺到「物件已被拔起」
      className={`${className} ${isDragging ? 'opacity-30 scale-95 shadow-inner bg-slate-100 rounded-3xl' : ''} transition-all cursor-pointer`}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
      onClick={(e) => {
         // 確保拖曳放開時，絕對不會觸發點擊跳轉網頁
         if (!isDragging && onClick) onClick(e);
      }}
      onDragStart={(e) => e.preventDefault()}
      style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'pan-y'
      }}
    >
      {children}
    </div>
  );
}