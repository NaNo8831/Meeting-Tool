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
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={item.completed ?? false}
              onChange={(event) => section.updateCompleted?.(item.id, event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Reviewed / completed
          </label>
          {item.status !== 'archived' ? (
            <button type="button" onClick={() => section.archiveItem?.(item.id)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">Archive</button>
          ) : null}
          {item.status === 'archived' ? (
            <button type="button" onClick={() => section.unarchiveItem?.(item.id)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Unarchive</button>
          ) : null}
          {item.status === 'completed' ? (
            <button type="button" onClick={() => section.restoreToActive?.(item.id)} className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Mark active</button>
          ) : null}
        </div>
        {item.completed && item.completedDate ? <p className="text-xs font-medium text-slate-500">Reviewed / completed: {formatDisplayDate(item.completedDate)}</p> : null}
      </div>

      <button type="button" onClick={() => section.openHistoryNotes?.(item)} className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">Notes</button>
    </div>
  );
}

function AgendaItemControls({ item, section, isReadOnly }: { item: MeetingItem; section: MeetingSectionConfig; isReadOnly: boolean }) {
  const isCovered = item.isCovered ?? item.completed ?? false;
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isCovered);

  if (section.id !== 'agenda') return null;

  const hasNotes = getRichTextPlainText(normalizeRichTextValue(item.discussionNotes ?? '')).trim().length > 0;
  const hasDecisionText = Boolean(item.decisionText?.trim());
  const hasActionText = Boolean(item.actionText?.trim());
  const hasDecisionOutcome = Boolean(item.hasDecision || hasDecisionText);
  const hasActionOutcome = Boolean(item.hasAction || hasActionText);
  const updateAgendaItem = section.updateAgendaItem;

  const statusBadges = (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasDecisionOutcome ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Decision</span> : null}
      {hasActionOutcome ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Action</span> : null}
      {item.cascadeNeeded ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Cascade Needed</span> : null}
      {item.promotedStrategicTopicId ? <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">Promoted → Strategic Topic</span> : null}
      {isCovered ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Covered</span> : null}
    </div>
  );

  if (isCovered && !isExpanded) {
    return (
      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {statusBadges}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700">
              <input type="checkbox" disabled={isReadOnly} checked={isCovered} onChange={(event) => { setIsExpanded(!event.target.checked); updateAgendaItem?.(item.id, { isCovered: event.target.checked, completed: event.target.checked }); }} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Covered
            </label>
            <button type="button" onClick={() => setIsExpanded(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Expand</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setIsNotesOpen((isOpen) => !isOpen)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
            Notes {hasNotes ? '✓' : ''}
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700">
            <input type="checkbox" disabled={isReadOnly} checked={isCovered} onChange={(event) => { setIsExpanded(!event.target.checked); updateAgendaItem?.(item.id, { isCovered: event.target.checked, completed: event.target.checked }); }} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            Covered
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800">
            <input type="checkbox" disabled={isReadOnly} checked={item.cascadeNeeded ?? false} onChange={(event) => updateAgendaItem?.(item.id, { cascadeNeeded: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-amber-600" />
            Cascade Needed
          </label>
          <button type="button" disabled={isReadOnly || Boolean(item.promotedStrategicTopicId)} onClick={() => section.promoteAgendaItem?.(item)} className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-70">
            {item.promotedStrategicTopicId ? 'Promoted' : 'Promote to Strategic Topic'}
          </button>
          {isCovered ? <button type="button" onClick={() => setIsExpanded(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Collapse</button> : null}
        </div>
        {statusBadges}
      </div>

      {item.promotedStrategicTopicId ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-800">
          Linked Strategic Topic: promoted from this Agenda Item. Duplicate promotion is disabled.
        </div>
      ) : null}

      {isNotesOpen ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discussion Notes</p>
            {!isReadOnly ? <p className="text-xs font-medium text-slate-400">Double-click notes to edit inline.</p> : null}
          </div>
          {isReadOnly ? <RichTextRenderer value={item.discussionNotes ?? ''} placeholder="No discussion notes yet." className="text-sm text-slate-700" /> : <RichTextEditor value={item.discussionNotes ?? ''} onChange={(value) => updateAgendaItem?.(item.id, { discussionNotes: value })} placeholder="Capture discussion notes for this agenda item." minHeightClassName="min-h-[6rem]" activationMode="doubleClick" manualPresentation="inline" />}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outcomes</p>
          <p className="text-xs text-slate-400">Decision, Action, or both</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <input type="checkbox" disabled={isReadOnly} checked={item.hasDecision ?? false} onChange={(event) => updateAgendaItem?.(item.id, { hasDecision: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
              Decision
            </label>
            {(item.hasDecision || item.decisionText) ? (
              <textarea disabled={isReadOnly} value={item.decisionText ?? ''} onChange={(event) => updateAgendaItem?.(item.id, { decisionText: event.target.value, hasDecision: true })} className="mt-2 min-h-[4rem] w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100" placeholder="Decision reached" />
            ) : <p className="mt-2 text-xs text-emerald-700/80">No decision captured.</p>}
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <input type="checkbox" disabled={isReadOnly} checked={item.hasAction ?? false} onChange={(event) => updateAgendaItem?.(item.id, { hasAction: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Action
            </label>
            {(item.hasAction || item.actionText) ? (
              <textarea disabled={isReadOnly} value={item.actionText ?? ''} onChange={(event) => updateAgendaItem?.(item.id, { actionText: event.target.value, hasAction: true })} className="mt-2 min-h-[4rem] w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100" placeholder="Action to take" />
            ) : <p className="mt-2 text-xs text-blue-700/80">No action captured.</p>}
          </div>
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
    <div draggable={canMoveSection} onDragStart={() => { if (canMoveSection) onDragStart(section.id); }} onDragOver={canMoveSection ? onDragOver : undefined} onDrop={canMoveSection ? () => onDrop(section.id) : undefined} className={`relative rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm ${canMoveSection ? 'cursor-grab' : ''}`}>
      {canMoveSection ? <div className="absolute right-5 top-5 text-lg text-slate-400" aria-hidden="true">≡</div> : null}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
        <p className="text-sm text-slate-500">{section.description}</p>
        {isReadOnly ? <p className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">{section.readOnlyMessage ?? 'Historical notes are read-only.'}</p> : null}
      </div>

      {section.rollupItems && section.rollupItems.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Generated Rollup</p>
          <div className="mt-2 space-y-2">{section.rollupItems.map((item) => <p key={item.id} className="whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-sm text-slate-800">{item.text}</p>)}</div>
        </div>
      ) : null}

      <div className="space-y-3">
        {section.id === 'topic' ? <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-600"><p>Active topics only. Completed and archived topics are in History.</p><button type="button" onClick={() => setIsHistoryOpen(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100">History ({historyCount})</button></div> : null}
        <div ref={section.id === 'topic' ? topicListRef : undefined} className={section.id === 'topic' ? 'max-h-[34rem] space-y-3 overflow-y-auto pr-1' : 'space-y-3'}>
          {section.items.map((item) => (
            <div key={item.id} draggable={section.id === 'topic' && !isReadOnly} onDragStart={(event) => { if (section.id !== 'topic' || isReadOnly) return; event.stopPropagation(); setDraggingTopicItemId(item.id); event.dataTransfer.setData('text/plain', String(item.id)); }} onDragOver={(event) => { if (section.id !== 'topic' || isReadOnly) return; event.stopPropagation(); event.preventDefault(); }} onDrop={(event) => { if (section.id !== 'topic' || isReadOnly) return; event.stopPropagation(); event.preventDefault(); const draggedId = Number(event.dataTransfer.getData('text/plain')) || draggingTopicItemId; if (typeof draggedId === 'number') section.reorderItems?.(draggedId, item.id); setDraggingTopicItemId(null); }} onDragEnd={() => setDraggingTopicItemId(null)} className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${section.id === 'topic' ? 'p-2.5 cursor-grab' : 'p-3'} ${draggingTopicItemId === item.id ? 'opacity-60' : ''}`}>
              <div className={section.id === 'topic' ? 'flex gap-2' : 'flex gap-3'}>
                <div className="flex-1">
                  <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${section.id === 'topic' ? 'gap-1.5' : 'gap-2'}`}>
                    <div className="flex-1">{isReadOnly ? <p className="whitespace-pre-wrap rounded-lg p-2 text-slate-800">{item.text || section.editPlaceholder}</p> : <EditableField value={item.text} onSave={(value) => section.updateItem(item.id, value)} placeholder={section.editPlaceholder} ariaLabel={`${section.title} item`} className="text-slate-800" activationMode="doubleClick" />}</div>
                    {section.id === 'topic' ? <span className="flex shrink-0 items-center gap-2 text-xs font-semibold"><span className="text-slate-500">Date added</span><span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{formatDisplayDate(item.capturedDate)}</span></span> : null}
                  </div>
                  <StrategicTopicControls item={item} section={section} />
                  <AgendaItemControls key={`${item.id}:${item.isCovered ?? item.completed ?? false}`} item={item} section={section} isReadOnly={isReadOnly} />
                </div>
                {!isReadOnly ? <button type="button" onClick={() => section.deleteItem(item.id)} className="self-start text-red-500 hover:text-red-700" aria-label={`Remove ${section.title}`}>×</button> : null}
              </div>
            </div>
          ))}
        </div>
        {!isReadOnly ? <div className="flex gap-2"><input value={section.newItem} onChange={(e) => section.setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); section.addItem(); } }} className="flex-1 rounded border border-slate-300 px-3 py-2 text-slate-900" placeholder={section.placeholder} /><button type="button" onClick={section.addItem} className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Add</button></div> : null}
      </div>
      {section.id === 'topic' && isHistoryOpen ? <StrategicTopicHistoryModal section={section} activeTab={historyTab} onChangeTab={setHistoryTab} onClose={() => setIsHistoryOpen(false)} /> : null}
    </div>
  );
}
