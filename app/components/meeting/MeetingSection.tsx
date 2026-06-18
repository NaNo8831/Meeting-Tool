'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { EditableField } from '@/app/components/ui/EditableField';
import { RichTextEditor, RichTextRenderer, getRichTextPlainText, normalizeRichTextValue } from '@/app/components/ui/RichTextEditor';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
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
    <div className="mt-2 flex items-start justify-between gap-2 border-t border-slate-200 pt-2">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={item.completed ?? false}
              onChange={(event) => section.updateCompleted?.(item.id, event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
            />
            Completed
          </label>
          {item.status !== 'archived' ? (
            <button type="button" onClick={() => section.archiveItem?.(item.id)} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">Archive</button>
          ) : null}
          {item.status === 'archived' ? (
            <button type="button" onClick={() => section.unarchiveItem?.(item.id)} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Restore to Active</button>
          ) : null}
          {item.status === 'completed' ? (
            <button type="button" onClick={() => section.restoreToActive?.(item.id)} className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200">Restore to Active</button>
          ) : null}
        </div>
        {item.completed && item.completedDate ? <p className="text-xs text-slate-400">Completed: {formatDisplayDate(item.completedDate)}</p> : null}
      </div>

      <button type="button" onClick={() => section.openHistoryNotes?.(item)} className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">Notes</button>
    </div>
  );
}

// Agenda Item card with collapsed/expanded states.
// Collapsed (default): single line — caret + title + Notes pill.
// Expanded: 2×2 grid — Row 1: title (left) | controls right-justified; Row 2: outcome | notes.
// isCovered → auto-collapse via useEffect; unchecking covered does NOT auto-expand.
function AgendaItemCard({ item, section, isReadOnly }: { item: MeetingItem; section: MeetingSectionConfig; isReadOnly: boolean }) {
  const isCovered = item.isCovered ?? item.completed ?? false;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isCovered) {
      setTimeout(() => setIsExpanded(false), 0);
    }
    // Unchecking covered does not auto-expand — user must click caret.
  }, [isCovered]);

  if (section.id !== 'agenda') return null;

  const hasNotes = getRichTextPlainText(normalizeRichTextValue(item.discussionNotes ?? '')).trim().length > 0;
  const resolvedOutcomeText = item.outcomeText ?? [item.decisionText?.trim(), item.actionText?.trim()].filter(Boolean).join("\n\n") ?? "";
  const updateAgendaItem = section.updateAgendaItem;

  // Collapsed card — same border/shadow as expanded so both states feel like one object
  if (!isExpanded) {
    return (
      <div className={`flex items-center gap-2 rounded-2xl border p-3 shadow-sm ${isCovered ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          aria-label="Expand agenda item"
        >
          ▶
        </button>
        <span className={`min-w-0 flex-1 truncate text-sm font-bold ${isCovered ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
          {item.text || <span className="font-normal italic text-slate-400">Agenda item</span>}
        </span>
        {resolvedOutcomeText ? (
          <span className="hidden shrink-0 truncate text-xs text-slate-500 sm:inline">
            <span className="font-medium text-slate-400">Outcome:</span>{' '}
            {resolvedOutcomeText.split('\n')[0]}
          </span>
        ) : null}
        {hasNotes ? (
          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Notes ✓
          </span>
        ) : null}
        {item.promotedStrategicTopicId ? (
          <span className="shrink-0 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
            Strategic Topic
          </span>
        ) : null}
        {!isReadOnly ? (
          <button
            type="button"
            onClick={() => section.deleteItem(item.id)}
            className="shrink-0 text-red-400 hover:text-red-600"
            aria-label="Delete agenda item"
          >
            ×
          </button>
        ) : null}
      </div>
    );
  }

  // Expanded 2×2 grid layout
  // Row 1: Title (left) | Covered/Cascade/+Strategic Topic controls (right)
  // Row 2: Outcome (left) | Discussion Notes (right)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {/* Row 1 left — Title */}
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="mt-1 shrink-0 text-slate-400 hover:text-slate-600"
          aria-label="Collapse agenda item"
        >
          ▼
        </button>
        <div className="min-w-0 flex-1">
          {isReadOnly
            ? <p className="whitespace-pre-wrap text-base font-bold text-slate-900">{item.text || <span className="italic font-normal text-slate-400">Agenda item</span>}</p>
            : <EditableField value={item.text} onSave={(value) => section.updateItem(item.id, value)} placeholder="Agenda item" ariaLabel="Agenda item title" className="text-base font-bold text-slate-900" activationMode="doubleClick" />
          }
        </div>
      </div>

      {/* Row 1 right — Controls (right-justified) */}
      <div className="flex flex-wrap items-start justify-end gap-1.5 ml-auto">
        {!isReadOnly ? (
          <>
            <label className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={isCovered}
                onChange={(event) => {
                  updateAgendaItem?.(item.id, { isCovered: event.target.checked, completed: event.target.checked });
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
              />
              Covered
            </label>
            <label
              className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
              title="Include this item in the Cascading Communication rollup for your team."
            >
              <input
                type="checkbox"
                checked={item.cascadeNeeded ?? false}
                onChange={(event) => updateAgendaItem?.(item.id, { cascadeNeeded: event.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600"
              />
              Cascade
            </label>
            {!item.promotedStrategicTopicId ? (
              <button
                type="button"
                onClick={() => { section.promoteAgendaItem?.(item); setIsExpanded(false); }}
                className="rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
              >
                + Strategic Topic
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Row 2 left — Outcome */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Outcome</p>
        {isReadOnly ? (
          resolvedOutcomeText
            ? <p className="whitespace-pre-wrap text-sm text-slate-700">{resolvedOutcomeText}</p>
            : <p className="text-xs text-slate-400">No outcome captured.</p>
        ) : (
          <textarea
            value={resolvedOutcomeText}
            onChange={(event) => updateAgendaItem?.(item.id, { outcomeText: event.target.value })}
            className="min-h-[5rem] w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="What was decided or agreed?"
          />
        )}
      </div>

      {/* Row 2 right — Discussion Notes */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
        {isReadOnly
          ? <RichTextRenderer value={item.discussionNotes ?? ''} placeholder="No discussion notes yet." className="text-sm text-slate-700" />
          : <RichTextEditor
              value={item.discussionNotes ?? ''}
              onChange={(value) => updateAgendaItem?.(item.id, { discussionNotes: value })}
              placeholder="Discussion notes…"
              minHeightClassName="min-h-[5rem]"
              activationMode="doubleClick"
              manualPresentation="inline"
            />
        }
      </div>
    </div>
    </div>
  );
}

function StrategicTopicHistoryEntry({ item, section }: { item: MeetingItem; section: MeetingSectionConfig }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <EditableField value={item.text} onSave={(value) => section.updateItem(item.id, value)} placeholder={section.editPlaceholder} ariaLabel={`${section.title} history item`} className="text-slate-800" />
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatDisplayDate(item.completedDate || item.removedDate || item.capturedDate)}</span>
          </div>
          <StrategicTopicControls item={item} section={section} />
        </div>
        <button type="button" onClick={() => section.deleteItem(item.id)} className="self-start text-red-500 hover:text-red-700" aria-label={`Remove ${section.title}`}>×</button>
      </div>
    </div>
  );
}

function StrategicTopicHistoryModal({ section, activeTab, onChangeTab, onClose }: { section: MeetingSectionConfig; activeTab: 'completed' | 'archived'; onChangeTab: (tab: 'completed' | 'archived') => void; onClose: () => void }) {
  const completedItems = section.completedHistoryItems ?? [];
  const archivedItems = section.archivedHistoryItems ?? [];
  const visibleItems = activeTab === 'completed' ? completedItems : archivedItems;
  const emptyMessage = activeTab === 'completed' ? 'No completed Strategic Topics yet.' : 'No archived Strategic Topics yet.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Strategic Topic History</h3><p className="text-sm text-slate-500">Review completed and archived topics without cluttering the active list.</p></div><button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">Close</button></div>
        <div className="mb-4 flex rounded-xl bg-slate-100 p-1 text-sm font-semibold text-slate-600"><button type="button" onClick={() => onChangeTab('completed')} className={`flex-1 rounded-lg px-3 py-2 ${activeTab === 'completed' ? 'bg-white text-blue-700 shadow-sm' : 'hover:text-slate-900'}`}>Completed ({completedItems.length})</button><button type="button" onClick={() => onChangeTab('archived')} className={`flex-1 rounded-lg px-3 py-2 ${activeTab === 'archived' ? 'bg-white text-blue-700 shadow-sm' : 'hover:text-slate-900'}`}>Archived ({archivedItems.length})</button></div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">{visibleItems.length > 0 ? visibleItems.map((item) => <StrategicTopicHistoryEntry key={item.id} item={item} section={section} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{emptyMessage}</div>}</div>
      </div>
    </div>
  );
}

export function MeetingSection({ section, onDragStart, onDragOver, onDrop }: MeetingSectionProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const isReadOnly = section.isReadOnly === true;
  const canMoveSection = !isReadOnly && !section.isFixed;
  const [historyTab, setHistoryTab] = useState<'completed' | 'archived'>('completed');
  const [draggingTopicItemId, setDraggingTopicItemId] = useState<number | null>(null);
  useBodyScrollLock(isHistoryOpen);
  const lastItemIdRef = useRef<number | null>(null);
  const previousItemCountRef = useRef(section.items.length);
  const topicListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (section.id !== 'topic') return;
    const lastItem = section.items.at(-1);
    const itemCountIncreased = section.items.length > previousItemCountRef.current;
    if (lastItem && itemCountIncreased && lastItem.id !== lastItemIdRef.current) topicListRef.current?.scrollTo({ top: topicListRef.current.scrollHeight, behavior: 'smooth' });
    lastItemIdRef.current = lastItem?.id ?? null;
    previousItemCountRef.current = section.items.length;
  }, [section.id, section.items]);

  const historyCount = (section.completedHistoryItems?.length ?? 0) + (section.archivedHistoryItems?.length ?? 0);

  return (
    <div draggable={canMoveSection} onDragStart={() => { if (canMoveSection) onDragStart(section.id); }} onDragOver={canMoveSection ? onDragOver : undefined} onDrop={canMoveSection ? () => onDrop(section.id) : undefined} className={`relative rounded-3xl border border-slate-200 bg-slate-50 shadow-sm ${section.id === 'topic' ? 'p-3' : 'p-5'} ${canMoveSection ? 'cursor-grab' : ''}`}>
      {canMoveSection ? <div className="absolute right-5 top-5 text-lg text-slate-400" aria-hidden="true">≡</div> : null}
      <div className={section.id === 'topic' ? 'mb-2' : 'mb-4'}>
        <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
        <p className="text-sm text-slate-500">{section.description}</p>
        {isReadOnly ? <p className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">{section.readOnlyMessage ?? 'Historical notes are read-only.'}</p> : null}
      </div>

      {section.rollupItems && section.rollupItems.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">From Agenda — Cascade Needed items</p>
          <div className="mt-2 space-y-2">{section.rollupItems.map((item) => <p key={item.id} className="whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-sm text-slate-800">{item.text}</p>)}</div>
        </div>
      ) : null}

      <div className="space-y-3">
        {section.id === 'topic' ? <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-600"><p>Active topics only. Completed and archived topics are in History.</p><button type="button" onClick={() => setIsHistoryOpen(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100">History ({historyCount})</button></div> : null}
        <div ref={section.id === 'topic' ? topicListRef : undefined} className={section.id === 'topic' ? 'max-h-[34rem] space-y-3 overflow-y-auto pr-1' : 'space-y-3'}>
          {section.items.map((item) => {
            if (section.id === 'agenda') {
              return <AgendaItemCard key={item.id} item={item} section={section} isReadOnly={isReadOnly} />;
            }
            return (
              <div key={item.id} draggable={section.id === 'topic' && !isReadOnly} onDragStart={(event) => { if (section.id !== 'topic' || isReadOnly) return; event.stopPropagation(); setDraggingTopicItemId(item.id); event.dataTransfer.setData('text/plain', String(item.id)); }} onDragOver={(event) => { if (section.id !== 'topic' || isReadOnly) return; event.stopPropagation(); event.preventDefault(); }} onDrop={(event) => { if (section.id !== 'topic' || isReadOnly) return; event.stopPropagation(); event.preventDefault(); const draggedId = Number(event.dataTransfer.getData('text/plain')) || draggingTopicItemId; if (typeof draggedId === 'number') section.reorderItems?.(draggedId, item.id); setDraggingTopicItemId(null); }} onDragEnd={() => setDraggingTopicItemId(null)} className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${section.id === 'topic' ? 'p-2.5 cursor-grab' : 'p-3'} ${draggingTopicItemId === item.id ? 'opacity-60' : ''}`}>
                <div className={section.id === 'topic' ? 'flex gap-2' : 'flex gap-3'}>
                  <div className="flex-1">
                    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${section.id === 'topic' ? 'gap-1.5' : 'gap-2'}`}>
                      <div className="flex-1">{isReadOnly ? <p className="whitespace-pre-wrap rounded-lg p-2 text-slate-800">{item.text || section.editPlaceholder}</p> : <EditableField value={item.text} onSave={(value) => section.updateItem(item.id, value)} placeholder={section.editPlaceholder} ariaLabel={`${section.title} item`} className="text-slate-800" activationMode="doubleClick" />}</div>
                      {section.id === 'topic' ? <span className="flex shrink-0 items-center gap-2 text-xs font-semibold"><span className="text-slate-500">Date added</span><span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{formatDisplayDate(item.capturedDate)}</span></span> : null}
                    </div>
                    <StrategicTopicControls item={item} section={section} />
                  </div>
                  {!isReadOnly ? <button type="button" onClick={() => section.deleteItem(item.id)} className="self-start text-red-500 hover:text-red-700" aria-label={`Remove ${section.title}`}>×</button> : null}
                </div>
              </div>
            );
          })}
        </div>
        {!isReadOnly ? <div className="flex gap-2"><input value={section.newItem} onChange={(e) => section.setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); section.addItem(); } }} className="flex-1 rounded border border-slate-300 px-3 py-2 text-slate-900" placeholder={section.placeholder} /><button type="button" onClick={section.addItem} className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Add</button></div> : null}
      </div>
      {section.id === 'topic' && isHistoryOpen ? <StrategicTopicHistoryModal section={section} activeTab={historyTab} onChangeTab={setHistoryTab} onClose={() => setIsHistoryOpen(false)} /> : null}
    </div>
  );
}
