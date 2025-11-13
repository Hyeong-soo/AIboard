import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow = null;

const lockScroll = () => {
  if (typeof document === 'undefined') {
    return;
  }

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.dataset.scrollLock = 'true';
  }

  lockCount += 1;
};

const unlockScroll = () => {
  if (typeof document === 'undefined' || lockCount === 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow ?? '';
    delete document.body.dataset.scrollLock;
    previousOverflow = null;
  }
};

const useScrollLock = (active) => {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [active]);
};

export default useScrollLock;
