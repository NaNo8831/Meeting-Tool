'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
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

function StrategicTopicControls({
  item,
  section,
  compact = false,
}: {
  item: MeetingItem;
  section: MeetingSectionConfig;
  compact?: boolean;
}) {
  if (section.id !== 'topic') return null;

  return (
    <div className={`mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 ${compact ? '' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={item.completed ?? false}
            onChange={(event) => section.updateCompleted?.(item.id, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          Reviewed / completed
        </label>
        <button
          type="button"
          onClick={() => section.openHistoryNotes?.(item)}
          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          Notes
        </button>
        {item.status !== 'archived' ? (
          <button
            type="button"
            onClick={() => section.archiveItem?.(item.id)}
            className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            Archive
          </button>
        ) : null}
        {item.status === 'archived' ? (
          <button
            type="button"
            onClick={() => section.unarchiveItem?.(item.id)}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            Unarchive
          </button>
        ) : null}
        {item.status === 'completed' ? (
          <button
            type="button"
            onClick={() => section.restoreToActive?.(item.id)}
            className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Mark active
          </button>
        ) : null}
      </div>

      <label className={`flex flex-col gap-1 text-xs font-medium text-slate-500 ${compact ? '' : 'sm:items-end'}`}>
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

function StrategicTopicHistoryEntry({ item, section }: { item: MeetingItem; section: MeetingSectionConfig }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <EditableField
              value={item.text}
              onSave={(value) => section.updateItem(item.id, value)}
              placeholder={section.editPlaceholder}
              ariaLabel={`${section.title} history item`}
              className="text-slate-800"
            />
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {formatDisplayDate(item.completedDate || item.removedDate || item.capturedDate)}
            </span>
          </div>
          <StrategicTopicControls item={item} section={section} compact />
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
  );
}

function StrategicTopicHistoryModal({
  section,
  activeTab,
  onChangeTab,
  onClose,
}: {
  section: MeetingSectionConfig;
  activeTab: 'completed' | 'archived';
  onChangeTab: (tab: 'completed' | 'archived') => void;
  onClose: () => void;
}) {
  const completedItems = section.completedHistoryItems ?? [];
  const archivedItems = section.archivedHistoryItems ?? [];
  const visibleItems = activeTab === 'completed' ? completedItems : archivedItems;
  const emptyMessage = activeTab === 'completed'
    ? 'No completed Strategic Topics yet.'
    : 'No archived Strategic Topics yet.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Strategic Topic History</h3>
            <p className="text-sm text-slate-500">Review completed and archived topics without cluttering the active list.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex rounded-xl bg-slate-100 p-1 text-sm font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => onChangeTab('completed')}
            className={`flex-1 rounded-lg px-3 py-2 ${activeTab === 'completed' ? 'bg-white text-blue-700 shadow-sm' : 'hover:text-slate-900'}`}
          >
            Completed ({completedItems.length})
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('archived')}
            className={`flex-1 rounded-lg px-3 py-2 ${activeTab === 'archived' ? 'bg-white text-blue-700 shadow-sm' : 'hover:text-slate-900'}`}
          >
            Archived ({archivedItems.length})
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => (
              <StrategicTopicHistoryEntry key={item.id} item={item} section={section} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MeetingSection({ section, onDragStart, onDragOver, onDrop }: MeetingSectionProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'completed' | 'archived'>('completed');
  const lastItemIdRef = useRef<number | null>(null);
  const previousItemCountRef = useRef(section.items.length);
  const topicListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (section.id !== 'topic') return;

    const lastItem = section.items.at(-1);
    const itemCountIncreased = section.items.length > previousItemCountRef.current;

    if (lastItem && itemCountIncreased && lastItem.id !== lastItemIdRef.current) {
      topicListRef.current?.scrollTo({
        top: topicListRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }

    lastItemIdRef.current = lastItem?.id ?? null;
    previousItemCountRef.current = section.items.length;
  }, [section.id, section.items]);

  const historyCount = (section.completedHistoryItems?.length ?? 0) + (section.archivedHistoryItems?.length ?? 0);

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
        {section.id === 'topic' ? (
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-600">
            <p>Active topics only. Completed and archived topics are in History.</p>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              History ({historyCount})
            </button>
          </div>
        ) : null}
        <div
          ref={section.id === 'topic' ? topicListRef : undefined}
          className={section.id === 'topic' ? 'max-h-[34rem] space-y-3 overflow-y-auto pr-1' : 'space-y-3'}
        >
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
        </div>
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
      {section.id === 'topic' && isHistoryOpen ? (
        <StrategicTopicHistoryModal
          section={section}
          activeTab={historyTab}
          onChangeTab={setHistoryTab}
          onClose={() => setIsHistoryOpen(false)}
        />
      ) : null}
    </div>
  );
}
