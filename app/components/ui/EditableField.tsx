'use client';

import { useState, type KeyboardEvent } from 'react';

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

  const commitEdit = (val: string) => {
    if (val !== value) {
      onSave(val);
    }
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleBlur = () => {
    commitEdit(editValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      commitEdit(editValue);
    }
    if (multiline && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      commitEdit(editValue);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsEditing(false);
      onEditingChange?.(false);
    }
  };

  const handleViewerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== 'F2') return;
    event.preventDefault();
    startEditing();
  };

  if (isEditing) {
    const inputClass = `w-full border border-blue-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 ${className} ${editorClassName}`;

    return multiline ? (
      <textarea
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${inputClass} resize-none`}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    ) : (
      <input
        autoFocus
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClass}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <div
      className={`cursor-text rounded transition-colors hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
      onClick={activationMode !== 'doubleClick' ? startEditing : undefined}
      onDoubleClick={activationMode === 'doubleClick' ? startEditing : undefined}
      onKeyDown={handleViewerKeyDown}
      tabIndex={0}
      role="button"
      aria-label={activationMode === 'doubleClick' ? `${ariaLabel}. Double-click to edit.` : `${ariaLabel}. Click to edit.`}
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </div>
  );
}
