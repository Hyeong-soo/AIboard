import { useCallback, useEffect, useRef, useState } from 'react';

const isClient = () => typeof window !== 'undefined';

const useModalDrag = (enabled) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });

  const handlePointerMove = useCallback((event) => {
    if (!dragState.current || !dragState.current.dragging) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;
    setOffset({
      x: dragState.current.originX + deltaX,
      y: dragState.current.originY + deltaY,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragState.current) {
      dragState.current.dragging = false;
    }
    setIsDragging(false);

    if (isClient()) {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
  }, [handlePointerMove]);

  const handlePointerDown = useCallback(
    (event) => {
      if (!enabled || !isClient()) {
        return;
      }

      event.preventDefault();

      dragState.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
        dragging: true,
      };

      setIsDragging(true);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [enabled, offset.x, offset.y, handlePointerMove, handlePointerUp],
  );

  useEffect(() => {
    if (!enabled) {
      setOffset({ x: 0, y: 0 });
    }
  }, [enabled]);

  useEffect(
    () => () => {
      if (isClient()) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      }
    },
    [handlePointerMove, handlePointerUp],
  );

  return {
    dragStyle: { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` },
    handlePointerDown,
    isDragging,
  };
};

export default useModalDrag;
