'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

function readLocalStorageValue<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  const item = window.localStorage.getItem(key);
  if (item === null) return null;

  try {
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [hasLoadedStoredValue, setHasLoadedStoredValue] = useState(false);
  const hasLoadedStoredValueRef = useRef(false);

  useEffect(() => {
    hasLoadedStoredValueRef.current = false;

    const timeoutId = window.setTimeout(() => {
      setHasLoadedStoredValue(false);
      setValue(initialValue);
      const storedValue = readLocalStorageValue<T>(key);
      if (storedValue !== null) {
        setValue(storedValue);
      }

      hasLoadedStoredValueRef.current = true;
      setHasLoadedStoredValue(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialValue, key]);

  useEffect(() => {
    if (!hasLoadedStoredValue || !hasLoadedStoredValueRef.current) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [hasLoadedStoredValue, key, value]);

  return [value, setValue, hasLoadedStoredValue];
}
