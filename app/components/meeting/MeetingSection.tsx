'use client';

import type { DragEvent } from 'react';
import { EditableField } from '@/app/components/ui/EditableField';
import type { MeetingItem, MeetingSectionConfig, MeetingSectionKey } from '@/app/types/dashboard';

interface MeetingSectionProps {
  section: MeetingSectionConfig;
  onDragStart: (id: MeetingSectionKey) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (id: MeetingSectionKey) => void;
}

const formatDisplayDate = (date?: string) => {
  if (!date) return 'No date';

  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
};

function StrategicTopicControls({ item, section }: { item: MeetingItem; section: MeetingSectionConfig }) {
  if (section.id !== 'topic') return null;

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={item.completed ?? false}
          onChange={(event) => section.updateCompleted?.(item.id, event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
        />
        Reviewed / completed
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 sm:items-end">
        Reviewed / completed date (optional)
        <input
          type="date"
          value={item.completedDate ?? ''}
          onChange={(event) => section.updateCompletedDate?.(item.id, event.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900"
        />
      </label>
    </div>
  );
}

export function MeetingSection({ section, onDragStart, onDragOver, onDrop }: MeetingSectionProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(section.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(section.id)}
      className="relative cursor-grab rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
    >
      <div className="absolute right-5 top-5 text-lg text-slate-400" aria-hidden="true">
        ≡
      </div>
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
        <p className="text-sm text-slate-500">{section.description}</p>
      </div>
      <div className="space-y-3">
        {section.items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <EditableField
                      value={item.text}
                      onSave={(value) => section.updateItem(item.id, value)}
                      placeholder={section.editPlaceholder}
                      ariaLabel={`${section.title} item`}
                      className="text-slate-800"
                    />
                  </div>
                  {section.id === 'topic' ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {formatDisplayDate(item.capturedDate)}
                    </span>
                  ) : null}
                </div>
                <StrategicTopicControls item={item} section={section} />
                {section.renderItemActions ? (
                  <div className="mt-3">{section.renderItemActions(item)}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => section.deleteItem(item.id)}
                className="self-start text-red-500 hover:text-red-700"
                aria-label={`Remove ${section.title}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={section.newItem}
            onChange={(e) => section.setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                section.addItem();
              }
            }}
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-slate-900"
            placeholder={section.placeholder}
          />
          <button type="button" onClick={section.addItem} className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
