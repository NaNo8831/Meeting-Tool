'use client';

import { useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import { objectiveColorOptions } from '@/app/lib/objectiveOptions';
import type { ObjectiveColor } from '@/app/types/objective';

interface ColorSquareSelectProps {
  value: ObjectiveColor;
  onChange: (color: ObjectiveColor) => void;
  ariaLabel: string;
}

export function ColorSquareSelect({ value, onChange, ariaLabel }: ColorSquareSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = objectiveColorOptions.find((option) => option.value === value) ?? objectiveColorOptions[0];
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex shrink-0"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onDragStart={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={`h-6 w-6 rounded-sm border border-slate-200 ${selectedOption.swatchClass}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="pointer-events-auto absolute right-0 top-full z-50 mt-2 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          {objectiveColorOptions.map((option) => {
            const isSelected = option.value === selectedOption.value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-label={option.label}
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-md border bg-white transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isSelected ? 'border-slate-400 ring-[0.5px] ring-slate-300' : 'border-slate-200'}`}
              >
                <span
                  className={`h-6 w-6 rounded-sm ${option.swatchClass}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
