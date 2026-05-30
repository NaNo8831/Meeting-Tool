"use client";

import { useEffect } from "react";

let activeScrollLocks = 0;
let previousBodyOverflow = "";

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    if (activeScrollLocks === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    activeScrollLocks += 1;

    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1);

      if (activeScrollLocks === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [isLocked]);
}
