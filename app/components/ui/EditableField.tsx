'use client';

import { useState, type KeyboardEvent, type MouseEvent } from 'react';

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  editorClassName?: string;
  actionClassName?: string;
  ariaLabel?: string;
  onEditingChange?: (isEditing: boolean) => void;
  activationMode?: 'click' | 'doubleClick';
}

export function EditableField({
  value,
  onSave,
  placeholder = 'Click to edit',
  multiline = false,
  className = '',
  editorClassName = '',
  actionClassName = '',
  ariaLabel = 'field',
  onEditingChange,
  activationMode = 'click'
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const startEditing = () => {
    setEditValue(value);
    setIsEditing(true);
    onEditingChange?.(true);
  };

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
    if (multiline && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };


  const handleViewerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== 'F2') return;

    event.preventDefault();
    startEditing();
  };

  const handleEditButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (activationMode === 'doubleClick') {
      event.preventDefault();
      return;
    }

    startEditing();
  };

  const handleEditButtonDoubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (activationMode !== 'doubleClick') return;

    event.preventDefault();
    startEditing();
  };

  if (isEditing) {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-slate-950/20" aria-hidden="true" />
        <div
          className="relative z-[70] space-y-3 rounded-2xl border border-slate-300 bg-white p-3 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label={`Editing ${ariaLabel}`}
        >
          {multiline ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full min-h-[120px] px-3 py-3 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 ${editorClassName}`}
              placeholder={placeholder}
              aria-label={ariaLabel}
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 ${editorClassName}`}
              placeholder={placeholder}
              aria-label={ariaLabel}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className={`px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 ${actionClassName}`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={`px-3 py-1 bg-slate-500 text-white rounded text-sm hover:bg-slate-600 ${actionClassName}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className={`group flex items-start justify-between gap-3 p-2 rounded transition-colors hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-200 ${activationMode === 'doubleClick' ? 'cursor-text' : ''} ${className}`}
      onDoubleClick={activationMode === 'doubleClick' ? startEditing : undefined}
      onKeyDown={activationMode === 'doubleClick' ? handleViewerKeyDown : undefined}
      tabIndex={activationMode === 'doubleClick' ? 0 : undefined}
      role={activationMode === 'doubleClick' ? 'button' : undefined}
      aria-label={activationMode === 'doubleClick' ? `${ariaLabel}. Double-click to edit.` : undefined}
      title={activationMode === 'doubleClick' ? 'Double-click to edit' : undefined}
    >
      <div className="min-w-0 flex-1">
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
        {activationMode === 'doubleClick' ? (
          <p className="mt-1 text-xs font-medium text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
            Double-click to edit
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleEditButtonClick}
        onDoubleClick={handleEditButtonDoubleClick}
        className={`${activationMode === 'doubleClick' ? 'hidden' : 'flex'} h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 opacity-80 hover:bg-slate-50 hover:text-slate-900 group-hover:opacity-100`}
        aria-label={activationMode === 'doubleClick' ? `Double-click to edit ${ariaLabel}` : `Edit ${ariaLabel}`}
        aria-hidden={activationMode === 'doubleClick' ? true : undefined}
        tabIndex={activationMode === 'doubleClick' ? -1 : undefined}
        title={activationMode === 'doubleClick' ? 'Double-click to edit' : undefined}
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 13.5V16h2.5L14.1 8.4l-2.5-2.5L4 13.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m12.4 5.1 1-1a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2l-1 1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
