"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthModal } from "@/app/components/auth/AuthModal";
import { BackupRestoreModal } from "@/app/components/dashboard/BackupRestoreModal";
import { MeetingSetupModal } from "@/app/components/dashboard/MeetingSetupModal";
import { PlaybookDefinitionsModal } from "@/app/components/dashboard/PlaybookDefinitionsModal";
import { FeedbackWidget } from "@/app/components/feedback/FeedbackWidget";
import { HelpPanel } from "@/app/components/help/HelpPanel";
import { MeetingHeader } from "@/app/components/meeting/MeetingHeader";
import { MeetingSection } from "@/app/components/meeting/MeetingSection";
import { ObjectiveCard } from "@/app/components/objectives/ObjectiveCard";
import { TaskDetailsModal } from "@/app/components/objectives/TaskDetailsModal";
import { ColorSquareSelect } from "@/app/components/ui/ColorSquareSelect";
import {
  RichTextEditor,
  RichTextRenderer,
  getRichTextPlainText,
  normalizeRichTextValue,
} from "@/app/components/ui/RichTextEditor";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import { useObjectives } from "@/app/hooks/useObjectives";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";
import { useWorkspacePersistence } from "@/app/hooks/useWorkspacePersistence";
import { useWorkspaceMembers } from "@/app/hooks/useWorkspaceMembers";
import {
  defaultDashboardTitle,
  defaultMeetingSectionOrder,
  defaultObjectiveColor,
  defaultOrganizationInfo,
  defaultStandardOperatingObjectives,
  objectiveColorClasses,
} from "@/app/lib/objectiveOptions";
import {
  collectWorkspaceStorage,
  createWorkspaceBackup,
  getWorkspaceStorageSignature,
  validateWorkspaceBackup,
  type WorkspaceBackupFeedback,
  type WorkspaceBackupFile,
} from "@/app/lib/workspaceBackup";
import {
  supabaseAuthClient,
  supabaseMeetingClient,
  type SupabaseMeetingNote,
  type SupabaseMeetingNoteUpsert,
  type SupabaseAgendaItem,
  type SupabaseAgendaItemUpsert,
  type SupabaseMeetingSettings,
  type SupabaseMeetingSettingsUpsert,
  type SupabaseObjective,
  type SupabaseObjectiveUpsert,
  type SupabaseStandardOperatingObjective,
  type SupabaseStandardOperatingObjectiveUpsert,
  type SupabaseStrategicTopic,
  type SupabaseStrategicTopicNote,
  type SupabaseStrategicTopicUpsert,
  type SupabaseTacticalSession,
  type SupabaseTask,
  type SupabaseTaskUpsert,
} from "@/app/lib/supabaseClient";
import type {
  MeetingItem,
  MeetingRecord,
  MeetingSectionConfig,
  MeetingSectionKey,
  OrganizationInfo,
  StandardOperatingObjective,
} from "@/app/types/dashboard";
import type { Objective, ObjectiveColor, Task } from "@/app/types/objective";
import type { RichTextDocument, RichTextValue } from "@/app/types/richText";

const getTodayDate = () => new Date().toISOString().slice(0, 10);
const testingToolsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_TESTING_TOOLS === "true";

const objectiveCardRowClassName =
  "mx-auto flex max-w-[96rem] flex-wrap justify-center gap-3";

const getObjectiveCardWidthClassName = (itemCount: number) =>
  itemCount >= 6
    ? "basis-[13.125rem] grow max-w-[15.375rem]"
    : "basis-[18.6rem] max-w-[18.6rem]";

function PlaybookManagedSection({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const [showReminder, setShowReminder] = useState(false);

  const showPlaybookReminder = () => {
    setShowReminder(true);
  };

  useEffect(() => {
    if (!showReminder) return;

    const reminderTimeout = window.setTimeout(() => {
      setShowReminder(false);
    }, 7000);

    return () => window.clearTimeout(reminderTimeout);
  }, [showReminder]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== "F2") return;

    event.preventDefault();
    showPlaybookReminder();
  };

  return (
    <div
      className={`group focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
      onDoubleClick={showPlaybookReminder}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${label}. This section is managed from Edit Playbook.`}
      title="This section is managed from Edit Playbook."
    >
      {children}
      <p
        className={`mt-3 text-sm font-medium text-blue-700 transition ${
          showReminder ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        This section is managed from Edit Playbook.
      </p>
    </div>
  );
}

const isStrategicTopicRichTextNote = (
  value: unknown,
): value is RichTextDocument => {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<RichTextDocument>;
  return candidate.version === 1 && Array.isArray(candidate.blocks);
};

type StrategicTopicNoteBackupEntry = {
  strategic_topic_item_id: number;
  content_json: Record<string, unknown> | null;
  content_text: string | null;
  updated_at?: string | null;
};

type StrategicTopicNoteDraftRecord =
  | SupabaseStrategicTopicNote
  | StrategicTopicNoteBackupEntry;

const isStrategicTopicNoteBackupEntry = (
  value: unknown,
): value is StrategicTopicNoteBackupEntry => {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<StrategicTopicNoteBackupEntry>;
  return (
    typeof candidate.strategic_topic_item_id === "number" &&
    (candidate.content_json === null ||
      typeof candidate.content_json === "object") &&
    (candidate.content_text === null ||
      typeof candidate.content_text === "string")
  );
};

const getStrategicTopicNoteDraft = (
  note: StrategicTopicNoteDraftRecord | null,
): RichTextValue => {
  if (!note) return "";
  if (isStrategicTopicRichTextNote(note.content_json)) {
    return note.content_json;
  }

  return note.content_text ?? "";
};

const strategicTopicsStorageKey = "leadership-strategic-topic-items";
const strategicTopicNotesStorageKey = "leadership-strategic-topic-notes";
const meetingSetupCompletedStorageKey = "leadership-meeting-setup-completed";

const topicNotesAutosaveDebounceMs = 1000;

type StrategicTopicsAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";

type MeetingNotesAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";

type AgendaItemsAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";

type ObjectivesAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";

const toNullableNumber = (value: number | undefined) =>
  typeof value === "number" ? value : null;

const toNullableString = (value: string | undefined) =>
  value && value.trim() ? value : null;

const uuidOrNull = (value: string | undefined) =>
  value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;

const mapStrategicTopicFromSupabase = (
  topic: SupabaseStrategicTopic,
): MeetingItem => {
  const metadata = topic.metadata_json ?? {};

  return {
    id: topic.client_item_id,
    strategicTopicId: topic.id,
    text: topic.title,
    capturedDate:
      topic.captured_date ??
      (typeof metadata.capturedDate === "string" ? metadata.capturedDate : undefined),
    capturedMeetingId:
      topic.captured_meeting_id ??
      (typeof metadata.capturedMeetingId === "number"
        ? metadata.capturedMeetingId
        : undefined),
    capturedMeetingIndex:
      topic.captured_meeting_index ??
      (typeof metadata.capturedMeetingIndex === "number"
        ? metadata.capturedMeetingIndex
        : undefined),
    completed: topic.status === "completed" || Boolean(topic.completed_at),
    completedDate:
      topic.completed_date ??
      (typeof metadata.completedDate === "string" ? metadata.completedDate : ""),
    status: topic.status,
    completedAt: topic.completed_at ?? undefined,
    archivedAt: topic.archived_at ?? undefined,
    removedMeetingId:
      topic.removed_meeting_id ??
      (typeof metadata.removedMeetingId === "number"
        ? metadata.removedMeetingId
        : undefined),
    removedMeetingIndex:
      topic.removed_meeting_index ??
      (typeof metadata.removedMeetingIndex === "number"
        ? metadata.removedMeetingIndex
        : undefined),
    removedDate:
      topic.removed_date ??
      (typeof metadata.removedDate === "string" ? metadata.removedDate : undefined),
  };
};

const mapStrategicTopicToSupabase = (
  item: MeetingItem,
  meetingId: string,
  sortOrder: number,
): SupabaseStrategicTopicUpsert => ({
  meeting_id: meetingId,
  client_item_id: item.id,
  title: item.text,
  status: item.status ?? (item.completed ? "completed" : "active"),
  archived_at: toNullableString(item.archivedAt),
  completed_at: toNullableString(item.completedAt),
  completed_date: toNullableString(item.completedDate),
  captured_date: toNullableString(item.capturedDate),
  captured_meeting_id: toNullableNumber(item.capturedMeetingId),
  captured_meeting_index: toNullableNumber(item.capturedMeetingIndex),
  removed_meeting_id: toNullableNumber(item.removedMeetingId),
  removed_meeting_index: toNullableNumber(item.removedMeetingIndex),
  removed_date: toNullableString(item.removedDate),
  sort_order: sortOrder,
  metadata_json: {
    completed: item.completed ?? false,
  },
});


const isRichTextDocumentValue = (value: unknown): value is RichTextDocument => {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<RichTextDocument>;
  return candidate.version === 1 && Array.isArray(candidate.blocks);
};

const richTextJsonOrNull = (value: RichTextValue): Record<string, unknown> | null => {
  const normalized = normalizeRichTextValue(value);
  return typeof normalized === "string"
    ? null
    : (normalized as unknown as Record<string, unknown>);
};

const richTextTextOrNull = (value: RichTextValue) => {
  const text = getRichTextPlainText(normalizeRichTextValue(value)).trim();
  return text ? text : null;
};

const richTextFromStructured = (
  contentJson: Record<string, unknown> | null,
  contentText: string | null,
): RichTextValue => {
  if (isRichTextDocumentValue(contentJson)) return contentJson;
  return contentText ?? "";
};

const normalizeObjectiveStatus = (status: string | null | undefined): Objective["status"] => {
  if (status === "in-progress" || status === "completed") return status;
  return "planning";
};

const normalizeObjectivePriority = (priority: string | null | undefined): Objective["priority"] => {
  if (priority === "high" || priority === "low") return priority;
  return "medium";
};

const normalizeObjectiveColor = (color: string | null | undefined): ObjectiveColor => {
  if (
    color === "dark-green" ||
    color === "green" ||
    color === "yellow" ||
    color === "orange" ||
    color === "red"
  ) {
    return color;
  }

  return defaultObjectiveColor;
};

const mapObjectiveToSupabase = (
  objective: Objective,
  meetingId: string,
  sortOrder: number,
): SupabaseObjectiveUpsert => ({
  meeting_id: meetingId,
  client_objective_id: objective.id,
  title: objective.title,
  description: richTextTextOrNull(objective.description),
  description_json: richTextJsonOrNull(objective.description),
  status: objective.status,
  priority: objective.priority,
  due_date: toNullableString(objective.dueDate),
  color: objective.color,
  sort_order: sortOrder,
  metadata_json: null,
});

const mapTaskToSupabase = (
  task: Task,
  objective: Objective,
  meetingId: string,
  objectiveId: string | null,
  sortOrder: number,
): SupabaseTaskUpsert => ({
  meeting_id: meetingId,
  objective_id: objectiveId,
  client_objective_id: objective.id,
  client_task_id: task.id,
  title: task.title,
  description: richTextTextOrNull(task.description),
  description_text: richTextTextOrNull(task.description),
  description_json: richTextJsonOrNull(task.description),
  status: task.status,
  assignee: toNullableString(task.assignedTo),
  assigned_to: toNullableString(task.assignedTo),
  due_date: toNullableString(task.dueDate),
  sort_order: sortOrder,
  subtasks_json: task.subtasks as unknown as Record<string, unknown>[],
  comments_json: task.comments as unknown as Record<string, unknown>[],
  activity_history_json: task.activityHistory as unknown as Record<string, unknown>[],
  metadata_json: null,
});

const mapSooToSupabase = (
  soo: StandardOperatingObjective,
  meetingId: string,
  sortOrder: number,
): SupabaseStandardOperatingObjectiveUpsert => ({
  meeting_id: meetingId,
  client_soo_id: soo.id,
  title: soo.title,
  description: richTextTextOrNull(soo.description),
  description_json: richTextJsonOrNull(soo.description),
  color: soo.color ?? defaultObjectiveColor,
  sort_order: sortOrder,
  metadata_json: null,
});

const mapTaskFromSupabase = (task: SupabaseTask): Task => ({
  id: task.client_task_id,
  title: task.title,
  description: richTextFromStructured(
    task.description_json,
    task.description_text ?? task.description,
  ),
  dueDate: task.due_date ?? "",
  subtasks: Array.isArray(task.subtasks_json)
    ? (task.subtasks_json as unknown as Task["subtasks"])
    : [],
  comments: Array.isArray(task.comments_json)
    ? (task.comments_json as unknown as Task["comments"])
    : [],
  activityHistory: Array.isArray(task.activity_history_json)
    ? (task.activity_history_json as unknown as Task["activityHistory"])
    : [],
  assignedTo: task.assigned_to ?? task.assignee ?? "",
  status: normalizeObjectiveStatus(task.status),
});

const mergeStructuredObjectives = (
  objectiveRows: SupabaseObjective[],
  taskRows: SupabaseTask[],
): Objective[] => {
  const tasksByObjectiveClientId = new Map<number, Task[]>();
  taskRows.forEach((taskRow) => {
    const clientObjectiveId = taskRow.client_objective_id;
    if (typeof clientObjectiveId !== "number") return;

    const tasks = tasksByObjectiveClientId.get(clientObjectiveId) ?? [];
    tasks.push(mapTaskFromSupabase(taskRow));
    tasksByObjectiveClientId.set(clientObjectiveId, tasks);
  });

  return objectiveRows.map((objective) => ({
    id: objective.client_objective_id,
    title: objective.title,
    description: richTextFromStructured(
      objective.description_json,
      objective.description,
    ),
    status: normalizeObjectiveStatus(objective.status),
    priority: normalizeObjectivePriority(objective.priority),
    dueDate: objective.due_date ?? "",
    color: normalizeObjectiveColor(objective.color),
    tasks: tasksByObjectiveClientId.get(objective.client_objective_id) ?? [],
  }));
};

const mapSooFromSupabase = (
  soo: SupabaseStandardOperatingObjective,
): StandardOperatingObjective => ({
  id: soo.client_soo_id,
  title: soo.title,
  description: richTextFromStructured(soo.description_json, soo.description),
  color: normalizeObjectiveColor(soo.color),
});

const getAgendaNotesValue = (item: MeetingItem): RichTextValue =>
  item.discussionNotes ?? "";

const normalizeAgendaItem = (item: MeetingItem): MeetingItem => ({
  ...item,
  hasDecision: item.hasDecision ?? Boolean(item.decisionText?.trim()),
  hasAction: item.hasAction ?? Boolean(item.actionText?.trim()),
  isCovered: item.isCovered ?? item.completed ?? false,
  cascadeNeeded: item.cascadeNeeded ?? false,
});

const mapAgendaItemToSupabase = (
  item: MeetingItem,
  meeting: MeetingRecord,
  meetingId: string,
  sortOrder: number,
): SupabaseAgendaItemUpsert => {
  const normalizedItem = normalizeAgendaItem(item);
  return {
    meeting_id: meetingId,
    client_agenda_item_id: normalizedItem.id,
    client_meeting_id: meeting.id,
    title: normalizedItem.text,
    discussion_notes_json: richTextJsonOrNull(getAgendaNotesValue(normalizedItem)),
    discussion_notes_text: richTextTextOrNull(getAgendaNotesValue(normalizedItem)),
    has_decision: Boolean(normalizedItem.outcomeText?.trim() || normalizedItem.hasDecision),
    decision_text: normalizedItem.outcomeText?.trim()
      ? normalizedItem.outcomeText.trim()
      : toNullableString(normalizedItem.decisionText),
    has_action: normalizedItem.outcomeText?.trim() ? false : (normalizedItem.hasAction ?? false),
    action_text: normalizedItem.outcomeText?.trim() ? null : toNullableString(normalizedItem.actionText),
    is_covered: normalizedItem.isCovered ?? false,
    cascade_needed: normalizedItem.cascadeNeeded ?? false,
    promoted_strategic_topic_id: uuidOrNull(
      normalizedItem.promotedStrategicTopicId,
    ),
    sort_order: sortOrder,
  };
};

const mapAgendaItemFromSupabase = (row: SupabaseAgendaItem): MeetingItem => {
  const decisionText = row.decision_text ?? "";
  const actionText = row.action_text ?? "";
  const outcomeText = [decisionText, actionText].filter(Boolean).join("\n\n").trim();
  return {
    id: row.client_agenda_item_id,
    text: row.title,
    discussionNotes: richTextFromStructured(
      row.discussion_notes_json,
      row.discussion_notes_text,
    ),
    hasDecision: row.has_decision,
    decisionText,
    hasAction: row.has_action,
    actionText,
    outcomeText: outcomeText || undefined,
    isCovered: row.is_covered,
    completed: row.is_covered,
    cascadeNeeded: row.cascade_needed,
    promotedStrategicTopicId: row.promoted_strategic_topic_id ?? undefined,
  };
};

const buildAgendaItemsAutosavePayload = (
  meetings: MeetingRecord[],
  meetingId: string,
) =>
  meetings.flatMap((meeting) =>
    meeting.agendaItems.map((item, index) =>
      mapAgendaItemToSupabase(item, meeting, meetingId, index),
    ),
  );

const mergeStructuredAgendaItems = (
  currentMeetings: MeetingRecord[],
  agendaRows: SupabaseAgendaItem[],
): MeetingRecord[] => {
  if (agendaRows.length === 0) return currentMeetings;

  const rowsByClientMeetingId = new Map<number, SupabaseAgendaItem[]>();
  agendaRows.forEach((row) => {
    const rows = rowsByClientMeetingId.get(row.client_meeting_id) ?? [];
    rows.push(row);
    rowsByClientMeetingId.set(row.client_meeting_id, rows);
  });

  return currentMeetings.map((meeting) => {
    const rows = rowsByClientMeetingId.get(meeting.id);
    if (!rows) return meeting;

    return {
      ...meeting,
      agendaItems: rows.map(mapAgendaItemFromSupabase),
    };
  });
};

// Agenda Items now have structured rows; notes_json still carries Agenda
// Items and legacy Decisions/Actions for Manual Save/export/import
// compatibility during the transition.
const getMeetingNotePassThroughJson = (
  meeting: MeetingRecord,
): Record<string, unknown> => ({
  agendaItems: meeting.agendaItems,
  topicItems: meeting.topicItems,
  decisionItems: meeting.decisionItems,
});

const mapMeetingRecordToSupabase = (
  meeting: MeetingRecord,
  meetingId: string,
): SupabaseMeetingNoteUpsert => ({
  meeting_id: meetingId,
  client_meeting_id: meeting.id,
  meeting_date: meeting.date,
  is_test_meeting: meeting.isTestMeeting ?? false,
  notes_json: getMeetingNotePassThroughJson(meeting),
  cascade_items: meeting.cascadeItems as unknown as Record<string, unknown>[],
});

const getMeetingItemsFromJson = (
  value: unknown,
  key: "agendaItems" | "topicItems" | "decisionItems" | "cascadeItems",
): MeetingItem[] => {
  if (!isRecord(value)) return [];
  const items = value[key];
  return Array.isArray(items) ? (items as MeetingItem[]) : [];
};

const mapMeetingNoteFromSupabase = (note: SupabaseMeetingNote): MeetingRecord => ({
  id: note.client_meeting_id,
  date: note.meeting_date,
  ...(note.is_test_meeting ? { isTestMeeting: true } : {}),
  agendaItems: getMeetingItemsFromJson(note.notes_json, "agendaItems"),
  topicItems: getMeetingItemsFromJson(note.notes_json, "topicItems"),
  decisionItems: getMeetingItemsFromJson(note.notes_json, "decisionItems"),
  cascadeItems: Array.isArray(note.cascade_items)
    ? (note.cascade_items as unknown as MeetingItem[])
    : getMeetingItemsFromJson(note.notes_json, "cascadeItems"),
});

const mergeStructuredMeetingNotes = (
  currentMeetings: MeetingRecord[],
  structuredNotes: SupabaseMeetingNote[],
): MeetingRecord[] => {
  if (structuredNotes.length === 0) return currentMeetings;

  const structuredMeetings = structuredNotes.map(mapMeetingNoteFromSupabase);
  const structuredByClientId = new Map(
    structuredMeetings.map((meeting) => [meeting.id, meeting]),
  );
  const mergedMeetings = currentMeetings.map(
    (meeting) => structuredByClientId.get(meeting.id) ?? meeting,
  );
  const currentIds = new Set(currentMeetings.map((meeting) => meeting.id));

  return [
    ...mergedMeetings,
    ...structuredMeetings.filter((meeting) => !currentIds.has(meeting.id)),
  ];
};

type MeetingSpecificSectionKey =
  | "agendaItems"
  | "decisionItems"
  | "cascadeItems";

const cloudWorkspaceStorageKeyPrefix = "meeting-tool-cloud-workspace";

const getWorkspaceScopedStorageKey = (
  baseKey: string,
  cloudWorkspaceId: string,
) =>
  cloudWorkspaceId
    ? `${cloudWorkspaceStorageKeyPrefix}:${cloudWorkspaceId}:${baseKey}`
    : baseKey;


type SnapshotMeetingRecord = {
  id?: number;
  date?: string;
  agendaItems?: MeetingItem[];
  topicItems?: MeetingItem[];
  decisionItems?: MeetingItem[];
  cascadeItems?: MeetingItem[];
  isTestMeeting?: boolean;
};

type TacticalSnapshotSummary = {
  activeMeetingDate: string;
  isTestMeeting: boolean;
  rallyCry: string;
  objectiveCount: number;
  taskCount: number;
  completedTaskCount: number;
  inProgressTaskCount: number;
  planningTaskCount: number;
  objectives: Array<{ title: string; taskCount: number; completedTaskCount: number }>;
  standardObjectiveCount: number;
  standardObjectives: string[];
  strategicTopicCount: number;
  completedStrategicTopicCount: number;
  archivedStrategicTopicCount: number;
  agendaItems: string[];
  topicItems: string[];
  decisionItems: string[];
  cascadeItems: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getSnapshotEntry = <T,>(
  snapshot: Record<string, unknown> | null,
  baseKey: string,
  fallback: T,
): T => {
  if (!snapshot) return fallback;

  const directValue = snapshot[baseKey];
  if (directValue !== undefined) return directValue as T;

  const scopedEntry = Object.entries(snapshot).find(([key]) =>
    key.endsWith(`:${baseKey}`),
  );

  return scopedEntry ? (scopedEntry[1] as T) : fallback;
};

const getTacticalSessionTimestamp = (session: SupabaseTacticalSession) =>
  new Date(
    session.created_at || session.ended_at || session.session_date,
  ).getTime();

const sortTacticalSessionsNewestFirst = (
  sessions: SupabaseTacticalSession[],
) =>
  [...sessions].sort(
    (firstSession, secondSession) =>
      getTacticalSessionTimestamp(secondSession) -
      getTacticalSessionTimestamp(firstSession),
  );

const getCapturedMeetingId = (session: SupabaseTacticalSession) =>
  getSnapshotEntry<number | null>(
    session.snapshot_json,
    "leadership-active-meeting-id",
    null,
  );

const getMeetingItemText = (item: unknown) => {
  if (!isRecord(item)) return "";
  return typeof item.text === "string" ? item.text.trim() : "";
};

const getObjectiveTitle = (item: unknown) => {
  if (!isRecord(item)) return "";
  return typeof item.title === "string" ? item.title.trim() : "";
};

const getSnapshotMeetingItems = (
  meeting: SnapshotMeetingRecord | undefined,
  key: "agendaItems" | "topicItems" | "decisionItems" | "cascadeItems",
) => (meeting?.[key] ?? []).map(getMeetingItemText).filter(Boolean);

const buildTacticalSnapshotSummary = (
  session: SupabaseTacticalSession | null,
): TacticalSnapshotSummary => {
  const snapshot = session?.snapshot_json ?? null;
  const organizationInfoSnapshot = getSnapshotEntry<Record<string, unknown>>(
    snapshot,
    "leadership-organization-info",
    {},
  );
  const objectivesSnapshot = getSnapshotEntry<unknown[]>(
    snapshot,
    "leadership-objectives",
    [],
  );
  const meetingsSnapshot = getSnapshotEntry<SnapshotMeetingRecord[]>(
    snapshot,
    "leadership-meetings",
    [],
  );
  const activeMeetingId = getSnapshotEntry<number | null>(
    snapshot,
    "leadership-active-meeting-id",
    null,
  );
  const strategicTopicsSnapshot = getSnapshotEntry<MeetingItem[]>(
    snapshot,
    strategicTopicsStorageKey,
    [],
  );
  const standardObjectivesSnapshot = getSnapshotEntry<unknown[]>(
    snapshot,
    "leadership-standard-operating-objectives",
    [],
  );
  const activeMeeting =
    meetingsSnapshot.find((meeting) => meeting.id === activeMeetingId) ??
    meetingsSnapshot[meetingsSnapshot.length - 1];
  const objectiveSummaries = objectivesSnapshot
    .filter(isRecord)
    .map((objective) => {
      const tasks = Array.isArray(objective.tasks) ? objective.tasks : [];
      const completedTasks = tasks.filter(
        (task) => isRecord(task) && task.status === "completed",
      );

      return {
        title: getObjectiveTitle(objective) || "Untitled objective",
        taskCount: tasks.length,
        completedTaskCount: completedTasks.length,
      };
    });
  const allTasks = objectivesSnapshot
    .filter(isRecord)
    .flatMap((objective) =>
      Array.isArray(objective.tasks) ? objective.tasks.filter(isRecord) : [],
    );
  const standardObjectives = standardObjectivesSnapshot
    .map(getObjectiveTitle)
    .filter(Boolean);
  const activeStrategicTopics = strategicTopicsSnapshot.filter(
    (item) => (item.status ?? "active") === "active",
  );
  const completedStrategicTopics = strategicTopicsSnapshot.filter(
    (item) => item.status === "completed",
  );
  const archivedStrategicTopics = strategicTopicsSnapshot.filter(
    (item) => item.status === "archived",
  );

  return {
    activeMeetingDate:
      activeMeeting?.date || session?.session_date || "Historical session",
    isTestMeeting: activeMeeting?.isTestMeeting ?? false,
    rallyCry:
      typeof organizationInfoSnapshot.rallyCry === "string" &&
      organizationInfoSnapshot.rallyCry.trim()
        ? organizationInfoSnapshot.rallyCry.trim()
        : "Not captured",
    objectiveCount: objectiveSummaries.length,
    taskCount: allTasks.length,
    completedTaskCount: allTasks.filter((task) => task.status === "completed")
      .length,
    inProgressTaskCount: allTasks.filter((task) => task.status === "in-progress")
      .length,
    planningTaskCount: allTasks.filter((task) => task.status === "planning")
      .length,
    objectives: objectiveSummaries,
    standardObjectiveCount: standardObjectives.length,
    standardObjectives,
    strategicTopicCount: activeStrategicTopics.length,
    completedStrategicTopicCount: completedStrategicTopics.length,
    archivedStrategicTopicCount: archivedStrategicTopics.length,
    agendaItems: getSnapshotMeetingItems(activeMeeting, "agendaItems"),
    topicItems: getSnapshotMeetingItems(activeMeeting, "topicItems"),
    decisionItems: getSnapshotMeetingItems(activeMeeting, "decisionItems"),
    cascadeItems: getSnapshotMeetingItems(activeMeeting, "cascadeItems"),
  };
};

type CloudSaveStatus = "idle" | "saving" | "saved" | "error";
type SettingsAutosaveStatus = "ready" | "pending" | "saving" | "saved" | "error";
type AutosaveSummaryStatus = "autosaved" | "saved" | "saving" | "backup-needed" | "error";

type StructuredAutosaveStatus =
  | SettingsAutosaveStatus
  | StrategicTopicsAutosaveStatus
  | MeetingNotesAutosaveStatus
  | AgendaItemsAutosaveStatus
  | ObjectivesAutosaveStatus;

const getAutosaveSummaryStatus = ({
  isCloudWorkspace,
  structuredStatuses,
  hasUnsavedFullWorkspaceChanges,
  cloudSaveStatus,
}: {
  isCloudWorkspace: boolean;
  structuredStatuses: StructuredAutosaveStatus[];
  hasUnsavedFullWorkspaceChanges: boolean;
  cloudSaveStatus: CloudSaveStatus;
}): AutosaveSummaryStatus => {
  if (!isCloudWorkspace) return "autosaved";

  if (
    structuredStatuses.some((status) => status === "error") ||
    cloudSaveStatus === "error"
  ) {
    return "error";
  }

  if (
    structuredStatuses.some(
      (status) => status === "saving" || status === "pending",
    ) ||
    cloudSaveStatus === "saving"
  ) {
    return "saving";
  }

  if (hasUnsavedFullWorkspaceChanges) return "backup-needed";

  if (cloudSaveStatus === "saved") return "saved";

  return "autosaved";
};

const readBackupEntry = <T,>(
  backup: WorkspaceBackupFile,
  key: string,
  fallback: T,
): T => {
  const value = backup.localStorage[key];
  return value === undefined ? fallback : (value as T);
};

const createBlankMeeting = (
  date = getTodayDate(),
  isTestMeeting = false,
): MeetingRecord => ({
  id: Date.now(),
  date,
  ...(isTestMeeting ? { isTestMeeting: true } : {}),
  agendaItems: [],
  topicItems: [],
  decisionItems: [],
  cascadeItems: [],
});

const getPreferredActiveMeetingId = (
  meetingRecords: MeetingRecord[],
  endedMeetingIds: Set<number>,
  fallbackMeetingId: number,
  todayDate = getTodayDate(),
): number => {
  const sortedNewestFirst = [...meetingRecords].sort(
    (firstMeeting, secondMeeting) =>
      secondMeeting.date.localeCompare(firstMeeting.date) ||
      secondMeeting.id - firstMeeting.id,
  );
  const realMeetingsNewestFirst = sortedNewestFirst.filter(
    (meeting) => meeting.isTestMeeting !== true,
  );
  const currentOpenMeeting = realMeetingsNewestFirst.find(
    (meeting) =>
      meeting.date === todayDate && !endedMeetingIds.has(meeting.id),
  );
  const mostRecentDatedMeeting =
    realMeetingsNewestFirst.find((meeting) => meeting.date <= todayDate) ??
    realMeetingsNewestFirst[0];

  return (
    currentOpenMeeting?.id ??
    mostRecentDatedMeeting?.id ??
    sortedNewestFirst[0]?.id ??
    fallbackMeetingId
  );
};

const getInitialMeetings = (): MeetingRecord[] => [createBlankMeeting()];

const normalizeStrategicTopic = (
  item: MeetingItem,
  fallbackMeeting: Pick<MeetingRecord, "id" | "date">,
  fallbackMeetingIndex = 0,
): MeetingItem => {
  const normalizedStatus =
    item.status ?? (item.removedMeetingId ? "archived" : item.completed ? "completed" : "active");

  return {
    ...item,
    capturedDate: item.capturedDate ?? fallbackMeeting.date,
    capturedMeetingId: item.capturedMeetingId ?? fallbackMeeting.id,
    capturedMeetingIndex: item.capturedMeetingIndex ?? fallbackMeetingIndex,
    completed: normalizedStatus === "completed" ? true : (item.completed ?? false),
    completedDate: item.completedDate ?? "",
    status: normalizedStatus,
    completedAt: item.completedAt ?? (item.completedDate || undefined),
    archivedAt: item.archivedAt ?? (item.removedDate || undefined),
  };
};



function SummaryList({
  emptyLabel,
  items,
}: {
  emptyLabel: string;
  items: string[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {items.slice(0, 6).map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-lg bg-white px-3 py-2">
          {item}
        </li>
      ))}
      {items.length > 6 ? (
        <li className="px-3 text-xs font-semibold text-slate-500">
          +{items.length - 6} more captured item{items.length - 6 === 1 ? "" : "s"}
        </li>
      ) : null}
    </ul>
  );
}

function TacticalHistorySummary({
  summary,
}: {
  summary: TacticalSnapshotSummary;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Meeting date
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-slate-900">
            <span>{summary.activeMeetingDate}</span>
            {summary.isTestMeeting ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Test Date
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Defining objectives
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {summary.objectiveCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tasks
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {summary.taskCount} total
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.completedTaskCount} completed · {summary.inProgressTaskCount} in progress · {summary.planningTaskCount} planning
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Strategic topics
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {summary.strategicTopicCount} active
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.completedStrategicTopicCount} completed · {summary.archivedStrategicTopicCount} archived
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-950">Top Priority</h3>
        <p className="mt-1 text-sm text-blue-900">{summary.rallyCry}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Objectives and tasks</h3>
          {summary.objectives.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No objectives were captured in this snapshot.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {summary.objectives.map((objective) => (
                <li key={objective.title} className="rounded-lg bg-white px-3 py-2">
                  <span className="font-semibold text-slate-900">{objective.title}</span>
                  <span className="block text-xs text-slate-500">
                    {objective.completedTaskCount} of {objective.taskCount} tasks completed
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Standard operating objectives</h3>
          <p className="mt-1 text-xs text-slate-500">
            {summary.standardObjectiveCount} captured in the historical snapshot
          </p>
          <div className="mt-3">
            <SummaryList
              emptyLabel="No standard operating objectives were captured."
              items={summary.standardObjectives}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Agenda Items</h3>
          <div className="mt-3">
            <SummaryList emptyLabel="No agenda items were captured." items={summary.agendaItems} />
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Strategic Topics</h3>
          <div className="mt-3">
            <SummaryList emptyLabel="No strategic topics were captured for this meeting." items={summary.topicItems} />
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Decisions / Actions</h3>
          <div className="mt-3">
            <SummaryList emptyLabel="No decisions or actions were captured." items={summary.decisionItems} />
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Cascading Communication</h3>
          <div className="mt-3">
            <SummaryList emptyLabel="No cascading communication was captured." items={summary.cascadeItems} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MeetingWorkspace() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const routeMeetingId = typeof params?.id === "string" ? params.id : "";
  const isCloudRoute = Boolean(routeMeetingId);
  const initialMeetings = useMemo(() => getInitialMeetings(), []);
  const initialStrategicTopicItems = useMemo<MeetingItem[]>(() => [], []);
  const {
    session: authSession,
    isConfigured: isAuthConfigured,
    isLoading: isAuthLoading,
    signUp,
    signIn,
    requestPasswordReset,
    signOut,
  } = useSupabaseAuth();
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [selectedMeetingName, setSelectedMeetingName] =
    useState("");
  const isCurrentCloudRouteWorkspace =
    isCloudRoute && Boolean(selectedMeetingId) && selectedMeetingId === routeMeetingId;
  const [activeCloudWorkspaceId, setActiveCloudWorkspaceId] = useState("");
  const [cloudSaveStatus, setCloudSaveStatus] =
    useState<CloudSaveStatus>("idle");
  const [settingsAutosaveStatus, setSettingsAutosaveStatus] =
    useState<SettingsAutosaveStatus>("ready");
  const [strategicTopicsAutosaveStatus, setStrategicTopicsAutosaveStatus] =
    useState<StrategicTopicsAutosaveStatus>("ready");
  const [meetingNotesAutosaveStatus, setMeetingNotesAutosaveStatus] =
    useState<MeetingNotesAutosaveStatus>("ready");
  const [agendaItemsAutosaveStatus, setAgendaItemsAutosaveStatus] =
    useState<AgendaItemsAutosaveStatus>("ready");
  const [objectivesAutosaveStatus, setObjectivesAutosaveStatus] =
    useState<ObjectivesAutosaveStatus>("ready");
  const [cloudMeetingMessage, setCloudMeetingMessage] = useState("");
  const [hasUnsavedFullWorkspaceChanges, setHasUnsavedFullWorkspaceChanges] =
    useState(false);
  const workspaceMode = "cloud" as const;
  const getStorageKey = (baseKey: string) =>
    getWorkspaceScopedStorageKey(baseKey, selectedMeetingId);

  const {
    objectives,
    taskInputs,
    selectedObjective,
    selectedTaskDetails,
    addObjective,
    deleteObjective,
    updateObjectiveTitle,
    updateObjectiveDescription,
    updateObjectiveColor,
    handleObjectiveDragStart,
    handleObjectiveDrop,
    addTask,
    deleteTask,
    updateTask,
    updateTaskStatus,
    updateTaskInput,
    openTaskDetails,
    closeTaskDetails,
    replaceObjectives,
    hasLoadedObjectives,
  } = useObjectives(getStorageKey("leadership-objectives"));
  const [newObjectiveDetailId, setNewObjectiveDetailId] = useState<number | null>(
    null,
  );
  const [meetings, setMeetings, hasLoadedMeetings] = useLocalStorage<
    MeetingRecord[]
  >(getStorageKey("leadership-meetings"), initialMeetings);
  const [activeMeetingId, setActiveMeetingId, hasLoadedActiveMeetingId] =
    useLocalStorage<number>(
      getStorageKey("leadership-active-meeting-id"),
      initialMeetings[0].id,
    );
  const [dashboardTitle, setDashboardTitle, hasLoadedDashboardTitle] =
    useLocalStorage(
      getStorageKey("leadership-dashboard-title"),
      defaultDashboardTitle,
    );
  const [organizationInfo, setOrganizationInfo, hasLoadedOrganizationInfo] =
    useLocalStorage(
      getStorageKey("leadership-organization-info"),
      defaultOrganizationInfo,
    );
  const [
    hasCompletedMeetingSetup,
    setHasCompletedMeetingSetup,
    hasLoadedMeetingSetup,
  ] = useLocalStorage(getStorageKey(meetingSetupCompletedStorageKey), false);
  const [
    meetingSectionOrder,
    setMeetingSectionOrder,
    hasLoadedMeetingSectionOrder,
  ] = useLocalStorage<MeetingSectionKey[]>(
    getStorageKey("leadership-meeting-section-order"),
    defaultMeetingSectionOrder,
  );
  const [
    strategicTopicItems,
    setStrategicTopicItems,
    hasLoadedStrategicTopicItems,
  ] = useLocalStorage<MeetingItem[]>(
    getStorageKey(strategicTopicsStorageKey),
    initialStrategicTopicItems,
  );
  const [
    standardOperatingObjectives,
    setStandardOperatingObjectives,
    hasLoadedStandardOperatingObjectives,
  ] = useLocalStorage<StandardOperatingObjective[]>(
    getStorageKey("leadership-standard-operating-objectives"),
    defaultStandardOperatingObjectives,
  );
  const [selectedStandardObjectiveId, setSelectedStandardObjectiveId] =
    useState<number | null>(null);
  const [standardObjectiveDraft, setStandardObjectiveDraft] = useState({
    title: "",
    description: "" as RichTextValue,
    color: defaultObjectiveColor as ObjectiveColor,
  });
  const [newAgendaItem, setNewAgendaItem] = useState("");
  const [newTopicItem, setNewTopicItem] = useState("");
  const [newDecisionItem, setNewDecisionItem] = useState("");
  const [newCascadeItem, setNewCascadeItem] = useState("");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordNewPassword, setChangePasswordNewPassword] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordMessage, setChangePasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showAutosaveStatusDetail, setShowAutosaveStatusDetail] =
    useState(false);
  const [showLifecycleHelp, setShowLifecycleHelp] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const autosaveStatusDetailRef = useRef<HTMLDivElement>(null);
  const lifecycleHelpRef = useRef<HTMLDivElement>(null);
  const meetingNotesRef = useRef<HTMLDivElement>(null);
  const [showMeetingSetup, setShowMeetingSetup] = useState(false);
  const [showPlaybookDefinitions, setShowPlaybookDefinitions] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showWorkspaceHelp, setShowWorkspaceHelp] = useState(false);
  const [showTacticalHistory, setShowTacticalHistory] = useState(false);

  const [showEndMeetingConfirm, setShowEndMeetingConfirm] = useState(false);
  const [isTestingModeActive, setIsTestingModeActive] = useState(false);
  const [testingMeetingDate, setTestingMeetingDate] = useState(getTodayDate);
  const [showDeleteMeetingNotesConfirm, setShowDeleteMeetingNotesConfirm] =
    useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [backupFeedback, setBackupFeedback] =
    useState<WorkspaceBackupFeedback | null>(null);
  const [draggingMeetingSection, setDraggingMeetingSection] =
    useState<MeetingSectionKey | null>(null);
  const [draggingStandardObjectiveId, setDraggingStandardObjectiveId] =
    useState<number | null>(null);
  const lastCloudAutosaveSignatureRef = useRef("");
  const lastTopicNotesAutosaveSignatureRef = useRef("");
  const topicNotesAutosaveKeyRef = useRef("");
  const isSigningOutRef = useRef(false);
  const lastAutoLoadedCloudMeetingIdRef = useRef("");
  const getCurrentWorkspaceStorageRef = useRef<(() => Record<string, unknown>) | null>(null);
  const [isRouteCloudBootstrapping, setIsRouteCloudBootstrapping] =
    useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [tacticalSessions, setTacticalSessions] = useState<
    SupabaseTacticalSession[]
  >([]);
  const [isLoadingTacticalSessions, setIsLoadingTacticalSessions] =
    useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [manualSaveJustSucceeded, setManualSaveJustSucceeded] = useState(false);
  const [selectedTacticalSessionId, setSelectedTacticalSessionId] =
    useState("");
  const [historyNotesTopic, setHistoryNotesTopic] = useState<MeetingItem | null>(null);
  const [historyNotesDraft, setHistoryNotesDraft] = useState<RichTextValue>("");
  const [historyNotesStatus, setHistoryNotesStatus] = useState("");
  const [isLoadingHistoryNotes, setIsLoadingHistoryNotes] = useState(false);
  const [isSavingHistoryNotes, setIsSavingHistoryNotes] = useState(false);
  const [strategicTopicNotesById, setStrategicTopicNotesById] = useState<Record<number, StrategicTopicNoteDraftRecord | null>>({});
  useBodyScrollLock(
    showSettingsMenu ||
      showChangePassword ||
      showDeleteMeetingNotesConfirm ||
      showEndMeetingConfirm ||
      showTacticalHistory ||
      selectedStandardObjectiveId !== null ||
      historyNotesTopic !== null,
  );
  const organizationInfoWithDefaults = {
    ...defaultOrganizationInfo,
    ...organizationInfo,
  };
  const storedActiveMeetingIndex = meetings.findIndex(
    (meeting) => meeting.id === activeMeetingId,
  );
  const activeMeetingIndex =
    storedActiveMeetingIndex === -1 ? 0 : storedActiveMeetingIndex;
  const activeMeeting = meetings[activeMeetingIndex] ?? initialMeetings[0];
  const chronologicallyOrderedMeetings = useMemo(
    () =>
      [...meetings].sort(
        (firstMeeting, secondMeeting) =>
          firstMeeting.date.localeCompare(secondMeeting.date) ||
          firstMeeting.id - secondMeeting.id,
      ),
    [meetings],
  );
  const activeMeetingNotesIndex = chronologicallyOrderedMeetings.findIndex(
    (meeting) => meeting.id === activeMeeting.id,
  );
  const isStrategicTopicVisibleForActiveMeeting = (item: MeetingItem) => {
    const capturedMeetingIndex =
      item.capturedMeetingIndex ??
      meetings.findIndex((meeting) => meeting.id === item.capturedMeetingId);
    const removedMeetingIndex =
      item.removedMeetingIndex ??
      meetings.findIndex((meeting) => meeting.id === item.removedMeetingId);
    const normalizedCapturedIndex =
      capturedMeetingIndex === -1 ? 0 : capturedMeetingIndex;

    if (activeMeetingIndex < normalizedCapturedIndex) return false;
    if (removedMeetingIndex === undefined || removedMeetingIndex === -1)
      return true;

    return activeMeetingIndex < removedMeetingIndex;
  };
  const visibleStrategicTopicItems = strategicTopicItems.filter(
    (item) => (item.status ?? "active") === "active" && isStrategicTopicVisibleForActiveMeeting(item),
  );
  const completedStrategicTopicItems = strategicTopicItems.filter(
    (item) =>
      (item.status ?? "active") === "completed" &&
      (item.removedMeetingIndex === undefined || item.removedMeetingIndex === -1),
  );
  const archivedStrategicTopicItems = strategicTopicItems.filter(
    (item) => (item.status ?? "active") === "archived",
  );
  const canNavigateToPreviousMeeting = activeMeetingNotesIndex > 0;
  const canNavigateToNextMeeting =
    activeMeetingNotesIndex < chronologicallyOrderedMeetings.length - 1;
  const historicalMeetingIds = useMemo(
    () =>
      new Set(
        tacticalSessions
          .map(getCapturedMeetingId)
          .filter((meetingId): meetingId is number =>
            typeof meetingId === "number",
          ),
      ),
    [tacticalSessions],
  );
  const todayDate = getTodayDate();
  const isTestingDateOverrideActive = testingToolsEnabled && isTestingModeActive;
  const meetingActionDate = isTestingDateOverrideActive
    ? testingMeetingDate
    : todayDate;
  const hasMeetingActionDate = Boolean(meetingActionDate);
  const actionDateMeeting = meetings.find(
    (meeting) => meeting.date === meetingActionDate,
  );
  const isActiveMeetingHistorical = historicalMeetingIds.has(activeMeeting.id);
  const isViewingTodayMeeting = activeMeeting.date === todayDate;
  const isViewingEditableTestMeeting =
    isTestingDateOverrideActive && activeMeeting.isTestMeeting === true;
  const isMeetingNotesReadOnly =
    isActiveMeetingHistorical ||
    (!isViewingTodayMeeting && !isViewingEditableTestMeeting);
  const meetingNotesReadOnlyMessage = isActiveMeetingHistorical
    ? "This meeting has been ended and captured in Tactical History. Dated meeting notes are read-only."
    : "This is not the current meeting date. Dated meeting notes are read-only unless this is an enabled Test Mode record.";
  const lifecycleStatusDescription = isActiveMeetingHistorical
    ? "Past meeting record. Review-only unless reopened through an approved workflow."
    : isViewingEditableTestMeeting
      ? "Test meeting. Safe for practice and validation."
      : isViewingTodayMeeting
        ? "Current meeting record."
        : "Past meeting record. Review-only unless reopened through an approved workflow.";
  const isActionDateMeetingHistorical = actionDateMeeting
    ? historicalMeetingIds.has(actionDateMeeting.id)
    : false;
  const meetingActionHelpText = !actionDateMeeting
    ? isTestingDateOverrideActive
      ? "Start creates a test dated meeting for the selected Test Mode date."
      : "Start creates today’s current meeting record."
    : isActionDateMeetingHistorical
      ? "View opens the ended dated record as read-only; Tactical History keeps the captured snapshot."
      : isTestingDateOverrideActive
        ? "Edit opens the existing test dated meeting while Test Mode is enabled."
        : "Edit opens today’s current meeting record for continued work.";
  const canEndMeeting =
    (isViewingTodayMeeting || isViewingEditableTestMeeting) &&
    !isMeetingNotesReadOnly;

  // Pre-computed props for MeetingHeader — display logic lives here, not in the header
  const primaryActionLabel: "Start Meeting" | "Edit Meeting" | "End Meeting" | "View Meeting" =
    isCurrentCloudRouteWorkspace && canEndMeeting
      ? "End Meeting"
      : !actionDateMeeting
        ? "Start Meeting"
        : isActionDateMeetingHistorical
          ? "View Meeting"
          : "Edit Meeting";

  const primaryActionDisabled =
    primaryActionLabel === "Start Meeting" && !hasMeetingActionDate;

  // handlePrimaryAction is defined below, after handleMeetingAction

  const chipLabel: "Open Meeting" | "Last Meeting" | "Closed" | "Test Mode" | null = (() => {
    if (meetings.length === 0) return null;
    if (isViewingEditableTestMeeting) return "Test Mode";
    if (isActiveMeetingHistorical) return "Closed";
    if (isViewingTodayMeeting) return "Open Meeting";
    return "Last Meeting";
  })();

  const chipDate: string | null = chipLabel !== null ? activeMeeting.date : null;

  // computedManualSaveLabel and computedManualSaveDisabled defined below, after isManualSaveInFlight

  const hasLoadedDashboardStorage =
    hasLoadedObjectives &&
    hasLoadedMeetings &&
    hasLoadedActiveMeetingId &&
    hasLoadedDashboardTitle &&
    hasLoadedOrganizationInfo &&
    hasLoadedMeetingSetup &&
    hasLoadedMeetingSectionOrder &&
    hasLoadedStrategicTopicItems &&
    hasLoadedStandardOperatingObjectives;
  const shouldShowMeetingSetup =
    showMeetingSetup ||
    (hasLoadedDashboardStorage &&
      !hasCompletedMeetingSetup &&
      !isRouteCloudBootstrapping);

  useEffect(() => {
    let isMounted = true;

    if (!isCloudRoute || !authSession || selectedMeetingId === routeMeetingId) {
      return () => {
        isMounted = false;
      };
    }

    const hydrateCloudRouteMeeting = async () => {
      setIsRouteCloudBootstrapping(true);
      setSelectedMeetingId("");
      setSelectedMeetingName("");
      setCloudSaveStatus("saving");
      setCloudMeetingMessage("Loading cloud meeting from route…");

      try {
        const meeting = await supabaseMeetingClient.getWorkspace({
          accessToken: authSession.accessToken,
          workspaceId: routeMeetingId,
        });
        if (!isMounted) return;

        if (!meeting?.name) {
          setCloudSaveStatus("error");
          setCloudMeetingMessage(
            "Cloud meeting was not found, is deleted, or is no longer accessible.",
          );
          setIsRouteCloudBootstrapping(false);
          return;
        }

        setSelectedMeetingId(meeting.id);
        setSelectedMeetingName(meeting.name);
      } catch (error) {
        if (!isMounted) return;
        setCloudSaveStatus("error");
        setCloudMeetingMessage(
          error instanceof Error
            ? error.message
            : "Cloud meeting was not found, is deleted, or is no longer accessible.",
        );
        setIsRouteCloudBootstrapping(false);
      }
    };

    void hydrateCloudRouteMeeting();

    return () => {
      isMounted = false;
    };
  }, [authSession, isCloudRoute, routeMeetingId, selectedMeetingId]);

  useEffect(() => {
    let isMounted = true;

    const hydrateSelectedMeetingName = async () => {
      if (!authSession || !selectedMeetingId || selectedMeetingName) return;

      try {
        const meeting = await supabaseMeetingClient.getWorkspace({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        });
        if (!isMounted) return;
        if (!meeting?.name) {
          setCloudSaveStatus("error");
          setCloudMeetingMessage(
            "Cloud meeting was not found, is deleted, or is no longer accessible.",
          );
          setIsRouteCloudBootstrapping(false);
          return;
        }
        setSelectedMeetingName(meeting.name);
      } catch {
        // Keep current fallback behavior when workspace metadata cannot be read.
      }
    };

    void hydrateSelectedMeetingName();

    return () => {
      isMounted = false;
    };
  }, [authSession, selectedMeetingId, selectedMeetingName]);

  useEffect(() => {
    if (!selectedMeetingName.trim()) return;

    const trimmedDashboardTitle = dashboardTitle.trim();
    if (trimmedDashboardTitle === "Meeting Tool by LyArk") {
      setDashboardTitle(selectedMeetingName);
    }
  }, [dashboardTitle, selectedMeetingName, setDashboardTitle]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (authSession) return;
    if (!isCloudRoute) return;

    const timeoutId = window.setTimeout(() => {
      setCloudSaveStatus("error");
      setCloudMeetingMessage(
        "Sign in to access this cloud meeting route. This URL does not use local mode.",
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authSession, isAuthLoading, isCloudRoute]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (authSession) return;
    if (!isCloudRoute) return;
    router.replace("/");
  }, [authSession, isAuthLoading, isCloudRoute, router]);

  // Slice C: member state, isMeetingOwner, and invitation handlers extracted to useWorkspaceMembers.
  const { isMeetingOwner } = useWorkspaceMembers(authSession, selectedMeetingId);

  const handleChangePassword = async () => {
    if (!authSession) return;
    if (changePasswordNewPassword !== changePasswordConfirm) {
      setChangePasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (changePasswordNewPassword.length < 6) {
      setChangePasswordMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setIsChangingPassword(true);
    setChangePasswordMessage(null);
    try {
      await supabaseAuthClient.updatePassword(authSession.accessToken, changePasswordNewPassword);
      setChangePasswordMessage({ type: "success", text: "Password updated successfully." });
      setChangePasswordNewPassword("");
      setChangePasswordConfirm("");
    } catch (error) {
      setChangePasswordMessage({ type: "error", text: error instanceof Error ? error.message : "Could not update password. Please try again." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOutAndExit = async () => {
    if (isSigningOut) return;
    isSigningOutRef.current = true;
    setIsSigningOut(true);
    setShowSettingsMenu(false);
    setShowAuthModal(false);
    setShowBackupRestore(false);
    setShowMeetingSetup(false);
    setShowPlaybookDefinitions(false);
    router.replace("/");
    try {
      await signOut();
    } catch {
      // Redirect regardless of sign-out API completion.
    } finally {
      router.replace("/");
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    }
  };

  useEffect(() => {
    if (!showSettingsMenu) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const menuElement = settingsMenuRef.current;
      if (!menuElement || !(event.target instanceof Node)) return;
      if (menuElement.contains(event.target)) return;

      setShowSettingsMenu(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [showSettingsMenu]);

  useEffect(() => {
    if (!showAutosaveStatusDetail) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const panelElement = autosaveStatusDetailRef.current;
      if (!panelElement || !(event.target instanceof Node)) return;
      if (panelElement.contains(event.target)) return;

      setShowAutosaveStatusDetail(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [showAutosaveStatusDetail]);

  useEffect(() => {
    if (!showLifecycleHelp) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const panelElement = lifecycleHelpRef.current;
      if (!panelElement || !(event.target instanceof Node)) return;
      if (panelElement.contains(event.target)) return;

      setShowLifecycleHelp(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [showLifecycleHelp]);

  useEffect(() => {
    if (!hasLoadedStrategicTopicItems || strategicTopicItems.length === 0)
      return;

    const fallbackMeeting = meetings[0] ?? activeMeeting;
    const needsNormalization = strategicTopicItems.some(
      (item) =>
        item.capturedDate === undefined ||
        item.capturedMeetingId === undefined ||
        item.capturedMeetingIndex === undefined ||
        item.completed === undefined ||
        item.completedDate === undefined ||
        item.status === undefined,
    );

    if (!needsNormalization) return;

    setStrategicTopicItems(
      strategicTopicItems.map((item) =>
        normalizeStrategicTopic(item, fallbackMeeting, 0),
      ),
    );
  }, [
    activeMeeting,
    hasLoadedStrategicTopicItems,
    meetings,
    setStrategicTopicItems,
    strategicTopicItems,
  ]);

  useEffect(() => {
    if (!hasLoadedStandardOperatingObjectives) return;

    const needsColorDefaults = standardOperatingObjectives.some(
      (item) => item.color === undefined,
    );

    if (!needsColorDefaults) return;

    setStandardOperatingObjectives(
      standardOperatingObjectives.map((item) => ({
        ...item,
        color: item.color ?? defaultObjectiveColor,
      })),
    );
  }, [
    hasLoadedStandardOperatingObjectives,
    setStandardOperatingObjectives,
    standardOperatingObjectives,
  ]);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleMeetingSectionDragStart = (id: MeetingSectionKey) => {
    if (id === "agenda" || id === "decision") return;
    setDraggingMeetingSection(id);
  };

  const handleMeetingSectionDrop = (id: MeetingSectionKey) => {
    if (id === "agenda" || id === "decision") return;
    if (draggingMeetingSection === null || draggingMeetingSection === id || draggingMeetingSection === "agenda" || draggingMeetingSection === "decision")
      return;
    const draggedIndex = meetingSectionOrder.indexOf(draggingMeetingSection);
    const droppedIndex = meetingSectionOrder.indexOf(id);
    if (draggedIndex === -1 || droppedIndex === -1) return;

    const reordered = [...meetingSectionOrder];
    reordered.splice(draggedIndex, 1);
    reordered.splice(droppedIndex, 0, draggingMeetingSection);
    setMeetingSectionOrder(reordered);
    setDraggingMeetingSection(null);
  };

  const updateActiveMeeting = (updates: Partial<Omit<MeetingRecord, "id">>) => {
    setMeetings((currentMeetings) =>
      currentMeetings.map((meeting) =>
        meeting.id === activeMeeting.id ? { ...meeting, ...updates } : meeting,
      ),
    );
  };

  const addMeetingItem = (
    value: string,
    setValue: (value: string) => void,
    sectionKey: MeetingSpecificSectionKey,
  ) => {
    if (isMeetingNotesReadOnly || !value.trim()) return;
    updateActiveMeeting({
      [sectionKey]: [
        ...activeMeeting[sectionKey],
        { id: Date.now(), text: value.trim() },
      ],
    });
    setValue("");
  };

  const updateMeetingItem = (
    sectionKey: MeetingSpecificSectionKey,
    itemId: number,
    value: string,
  ) => {
    if (isMeetingNotesReadOnly) return;

    updateActiveMeeting({
      [sectionKey]: activeMeeting[sectionKey].map((item) =>
        item.id === itemId ? { ...item, text: value } : item,
      ),
    });
  };

  const updateAgendaItem = (
    itemId: number,
    updates: Partial<MeetingItem>,
  ) => {
    if (isMeetingNotesReadOnly) return;

    updateActiveMeeting({
      agendaItems: activeMeeting.agendaItems.map((item) =>
        item.id === itemId ? normalizeAgendaItem({ ...item, ...updates }) : item,
      ),
    });
  };

  const promoteAgendaItemToStrategicTopic = (item: MeetingItem) => {
    if (isMeetingNotesReadOnly || item.promotedStrategicTopicId) return;

    const normalizedItem = normalizeAgendaItem(item);
    const title = normalizedItem.text.trim() || "Promoted agenda item";
    const nextTopic = normalizeStrategicTopic(
      {
        id: Date.now(),
        text: title,
      },
      activeMeeting,
      activeMeetingIndex,
    );

    const notesParts = [
      `Agenda: ${title}`,
      richTextTextOrNull(getAgendaNotesValue(normalizedItem))
        ? `Discussion Notes:\n${richTextTextOrNull(getAgendaNotesValue(normalizedItem))}`
        : "",
      normalizedItem.outcomeText?.trim()
        ? `Outcome:\n${normalizedItem.outcomeText.trim()}`
        : normalizedItem.hasDecision && normalizedItem.decisionText?.trim()
          ? `Decision:\n${normalizedItem.decisionText.trim()}`
          : "",
      !normalizedItem.outcomeText?.trim() && normalizedItem.hasAction && normalizedItem.actionText?.trim()
        ? `Action:\n${normalizedItem.actionText.trim()}`
        : "",
    ].filter(Boolean);

    setStrategicTopicItems((currentItems) => [...currentItems, nextTopic]);
    setStrategicTopicNotesById((currentNotes) => ({
      ...currentNotes,
      [nextTopic.id]: {
        strategic_topic_item_id: nextTopic.id,
        content_json: null,
        content_text: notesParts.join("\n\n"),
        updated_at: new Date().toISOString(),
      },
    }));
    updateAgendaItem(item.id, {
      promotedStrategicTopicId: nextTopic.strategicTopicId ?? String(nextTopic.id),
    });

    if (authSession && selectedMeetingId && isCurrentCloudRouteWorkspace) {
      void supabaseMeetingClient.saveStrategicTopicNote({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        strategicTopicItemId: nextTopic.id,
        strategicTopicId: nextTopic.strategicTopicId ?? null,
        contentText: notesParts.join("\n\n"),
        contentJson: null,
      }).catch(() => {
        setCloudMeetingMessage(
          "Agenda item promoted, but the seeded Strategic Topic note needs autosave/manual save retry.",
        );
      });
    }
  };

  const deleteMeetingItem = (
    sectionKey: MeetingSpecificSectionKey,
    itemId: number,
  ) => {
    if (isMeetingNotesReadOnly) return;

    updateActiveMeeting({
      [sectionKey]: activeMeeting[sectionKey].filter(
        (item) => item.id !== itemId,
      ),
    });
  };

  const addStrategicTopicItem = () => {
    const topicText = newTopicItem.trim();
    if (!topicText) return;

    const nextTopic = normalizeStrategicTopic(
      {
        id: Date.now(),
        text: topicText,
      },
      activeMeeting,
      activeMeetingIndex,
    );

    setStrategicTopicItems((currentItems) => [...currentItems, nextTopic]);
    setNewTopicItem("");
  };

  const updateStrategicTopicItem = (itemId: number, value: string) => {
    setStrategicTopicItems(
      strategicTopicItems.map((item) =>
        item.id === itemId ? { ...item, text: value } : item,
      ),
    );
  };

  const reorderStrategicTopicItems = (draggedItemId: number, targetItemId: number) => {
    if (draggedItemId === targetItemId) return;

    setStrategicTopicItems((currentItems) => {
      const draggedIndex = currentItems.findIndex((item) => item.id === draggedItemId);
      const targetIndex = currentItems.findIndex((item) => item.id === targetItemId);
      if (draggedIndex === -1 || targetIndex === -1) return currentItems;

      const reordered = [...currentItems];
      const [draggedItem] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, draggedItem);
      return reordered;
    });
  };

  const updateStrategicTopicCompleted = (
    itemId: number,
    completed: boolean,
  ) => {
    setStrategicTopicItems(
      strategicTopicItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed,
              completedDate: completed
                ? item.completedDate || activeMeeting.date
                : item.completedDate,
              status: completed ? "completed" : "active",
              completedAt: completed ? item.completedAt ?? new Date().toISOString() : undefined,
              archivedAt: completed ? undefined : item.archivedAt,
            }
          : item,
      ),
    );
  };

  const archiveStrategicTopicItem = (itemId: number) => {
    const shouldArchive = window.confirm(
      "Archive this Strategic Topic? This will hide it from active view but keep notes/history attached.",
    );
    if (!shouldArchive) return;

    setStrategicTopicItems(
      strategicTopicItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "archived",
              archivedAt: new Date().toISOString(),
              removedMeetingId: activeMeeting.id,
              removedMeetingIndex: activeMeetingIndex,
              removedDate: activeMeeting.date,
            }
          : item,
      ),
    );
  };

  const restoreStrategicTopicToActive = (itemId: number) => {
    setStrategicTopicItems(
      strategicTopicItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "active",
              completed: false,
              completedDate: "",
              completedAt: undefined,
              archivedAt: undefined,
              removedMeetingId: undefined,
              removedMeetingIndex: undefined,
              removedDate: undefined,
            }
          : item,
      ),
    );
  };

  const unarchiveStrategicTopicItem = (itemId: number) => {
    restoreStrategicTopicToActive(itemId);
  };

  const deleteStrategicTopicItem = (itemId: number) => {
    const shouldDelete = window.confirm(
      "Delete this Strategic Topic? Notes/history attached to this topic may no longer be accessible.",
    );
    if (!shouldDelete) return;

    setStrategicTopicItems(
      strategicTopicItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              removedMeetingId: activeMeeting.id,
              removedMeetingIndex: activeMeetingIndex,
              removedDate: activeMeeting.date,
            }
          : item,
      ),
    );
  };

  const scrollToMeetingNotes = () => {
    window.requestAnimationFrame(() => {
      meetingNotesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleMeetingAction = () => {
    if (!hasMeetingActionDate) return;

    const existingMeeting = meetings.find(
      (meeting) => meeting.date === meetingActionDate,
    );

    if (existingMeeting) {
      setActiveMeetingId(existingMeeting.id);
    } else {
      const newMeeting = createBlankMeeting(
        meetingActionDate,
        isTestingDateOverrideActive,
      );
      setMeetings([...meetings, newMeeting]);
      setActiveMeetingId(newMeeting.id);
    }

    setNewAgendaItem("");
    setNewDecisionItem("");
    setNewCascadeItem("");
    scrollToMeetingNotes();
  };

  const handlePrimaryAction =
    primaryActionLabel === "End Meeting"
      ? () => setShowEndMeetingConfirm(true)
      : handleMeetingAction;

  const deleteCurrentMeetingNotes = () => {
    if (isMeetingNotesReadOnly) return;

    const isOnlyMeeting = meetings.length <= 1;

    if (isOnlyMeeting) {
      const fallbackMeeting = createBlankMeeting();
      setMeetings([fallbackMeeting]);
      setActiveMeetingId(fallbackMeeting.id);
    } else {
      const remainingMeetings = meetings.filter(
        (meeting) => meeting.id !== activeMeeting.id,
      );
      const chronologicallyOrderedRemainingMeetings =
        chronologicallyOrderedMeetings.filter(
          (meeting) => meeting.id !== activeMeeting.id,
        );
      const fallbackActiveMeeting =
        chronologicallyOrderedRemainingMeetings[
          Math.max(activeMeetingNotesIndex - 1, 0)
        ] ?? chronologicallyOrderedRemainingMeetings[0];
      setMeetings(remainingMeetings);
      setActiveMeetingId(fallbackActiveMeeting.id);
    }

    setShowDeleteMeetingNotesConfirm(false);
    setNewAgendaItem("");
    setNewDecisionItem("");
    setNewCascadeItem("");
  };

  const navigateMeeting = (direction: "previous" | "next") => {
    const nextIndex =
      direction === "previous"
        ? activeMeetingNotesIndex - 1
        : activeMeetingNotesIndex + 1;
    const nextMeeting = chronologicallyOrderedMeetings[nextIndex];
    if (!nextMeeting) return;
    setActiveMeetingId(nextMeeting.id);
    setNewAgendaItem("");
    setNewDecisionItem("");
    setNewCascadeItem("");
  };

  const addAndOpenObjective = () => {
    setNewObjectiveDetailId(addObjective());
  };

  const getStandardObjectiveColor = (item: StandardOperatingObjective) =>
    item.color ?? defaultObjectiveColor;

  const openStandardObjectiveEditor = (item: StandardOperatingObjective) => {
    setSelectedStandardObjectiveId(item.id);
    setStandardObjectiveDraft({
      title: item.title,
      description: item.description,
      color: getStandardObjectiveColor(item),
    });
  };

  const closeStandardObjectiveEditor = () => {
    setSelectedStandardObjectiveId(null);
    setStandardObjectiveDraft({
      title: "",
      description: "",
      color: defaultObjectiveColor,
    });
  };

  const addStandardObjective = () => {
    const newStandardObjective: StandardOperatingObjective = {
      id: Date.now(),
      title: "New Standard Objective",
      description: "",
      color: defaultObjectiveColor,
    };

    setStandardOperatingObjectives([
      ...standardOperatingObjectives,
      newStandardObjective,
    ]);
    openStandardObjectiveEditor(newStandardObjective);
  };

  const saveStandardObjective = () => {
    if (selectedStandardObjectiveId === null) return;

    const nextTitle = standardObjectiveDraft.title.trim();
    setStandardOperatingObjectives(
      standardOperatingObjectives.map((item) =>
        item.id === selectedStandardObjectiveId
          ? {
              ...item,
              title: nextTitle || "New Standard Objective",
              description: standardObjectiveDraft.description,
              color: standardObjectiveDraft.color,
            }
          : item,
      ),
    );
    closeStandardObjectiveEditor();
  };

  const deleteStandardObjective = () => {
    if (selectedStandardObjectiveId === null) return;
    if (!window.confirm("Delete this standard operating objective?")) return;

    setStandardOperatingObjectives(
      standardOperatingObjectives.filter(
        (item) => item.id !== selectedStandardObjectiveId,
      ),
    );
    closeStandardObjectiveEditor();
  };

  const updateStandardObjectiveColor = (
    itemId: number,
    color: ObjectiveColor,
  ) => {
    setStandardOperatingObjectives(
      standardOperatingObjectives.map((item) =>
        item.id === itemId ? { ...item, color } : item,
      ),
    );
  };

  const handleStandardObjectiveDragStart = (
    event: DragEvent<HTMLDivElement>,
    itemId: number,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/x-standard-operating-objective-id",
      String(itemId),
    );
    setDraggingStandardObjectiveId(itemId);
  };

  const handleStandardObjectiveDragOver = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    if (
      !event.dataTransfer.types.includes(
        "application/x-standard-operating-objective-id",
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
  };

  const handleStandardObjectiveDrop = (
    event: DragEvent<HTMLDivElement>,
    targetItemId: number,
  ) => {
    const draggedItemIdValue = event.dataTransfer.getData(
      "application/x-standard-operating-objective-id",
    );
    if (!draggedItemIdValue) return;

    event.preventDefault();
    event.stopPropagation();

    const draggedItemId = Number(draggedItemIdValue);
    if (!Number.isFinite(draggedItemId) || draggedItemId === targetItemId) {
      setDraggingStandardObjectiveId(null);
      return;
    }

    const draggedIndex = standardOperatingObjectives.findIndex(
      (item) => item.id === draggedItemId,
    );
    const targetIndex = standardOperatingObjectives.findIndex(
      (item) => item.id === targetItemId,
    );
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggingStandardObjectiveId(null);
      return;
    }

    const reordered = [...standardOperatingObjectives];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);
    setStandardOperatingObjectives(reordered);
    setDraggingStandardObjectiveId(null);
  };

  const handleStandardObjectiveDragEnd = () => {
    setDraggingStandardObjectiveId(null);
  };

  const openStrategicTopicHistoryNotes = useCallback(
    async (item: MeetingItem) => {
      setHistoryNotesTopic(item);
      setHistoryNotesStatus("");
      if (!authSession || !selectedMeetingId) {
        setHistoryNotesDraft("");
        setHistoryNotesStatus(
          "Strategic topic notes are available for cloud meetings only.",
        );
        return;
      }
      setIsLoadingHistoryNotes(true);
      try {
        const note = await supabaseMeetingClient.loadStrategicTopicNote({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          strategicTopicItemId: item.id,
          strategicTopicId: item.strategicTopicId,
        });
        const fallbackNote = strategicTopicNotesById[item.id] ?? null;
        const noteForDraft = note ?? fallbackNote;
        const noteDraft = getStrategicTopicNoteDraft(noteForDraft);
        setStrategicTopicNotesById((current) => ({
          ...current,
          [item.id]: noteForDraft,
        }));
        setHistoryNotesDraft(noteDraft);
        topicNotesAutosaveKeyRef.current = `${selectedMeetingId}:${item.id}`;
        lastTopicNotesAutosaveSignatureRef.current = JSON.stringify(
          normalizeRichTextValue(noteDraft),
        );
      } catch (error) {
        topicNotesAutosaveKeyRef.current = "";
        lastTopicNotesAutosaveSignatureRef.current = "";
        setHistoryNotesDraft("");
        setHistoryNotesStatus(
          error instanceof Error
            ? error.message
            : "Strategic topic note could not be loaded.",
        );
      } finally {
        setIsLoadingHistoryNotes(false);
      }
    },
    [authSession, selectedMeetingId, strategicTopicNotesById],
  );

  const saveStrategicTopicHistoryNoteDraft = useCallback(
    async (closeAfterSave: boolean) => {
      if (!historyNotesTopic || !authSession || !selectedMeetingId) return;
      setIsSavingHistoryNotes(true);
      setHistoryNotesStatus(closeAfterSave ? "Saving history…" : "Autosaving history…");
      try {
        const contentDocument = normalizeRichTextValue(historyNotesDraft);
        const saved = await supabaseMeetingClient.saveStrategicTopicNote({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          strategicTopicItemId: historyNotesTopic.id,
          strategicTopicId: historyNotesTopic.strategicTopicId,
          contentText: getRichTextPlainText(contentDocument),
          contentJson: contentDocument as unknown as Record<string, unknown>,
        });
        setStrategicTopicNotesById((current) => ({
          ...current,
          [historyNotesTopic.id]: saved,
        }));
        lastTopicNotesAutosaveSignatureRef.current = JSON.stringify(contentDocument);
        topicNotesAutosaveKeyRef.current = `${selectedMeetingId}:${historyNotesTopic.id}`;
        setHistoryNotesStatus(
          closeAfterSave ? "History saved." : "History autosaved.",
        );
        if (closeAfterSave) {
          setHistoryNotesTopic(null);
        }
      } catch (error) {
        setHistoryNotesStatus(
          error instanceof Error
            ? error.message
            : "Strategic topic note could not be saved.",
        );
      } finally {
        setIsSavingHistoryNotes(false);
      }
    },
    [authSession, historyNotesDraft, historyNotesTopic, selectedMeetingId],
  );

  const handleSaveStrategicTopicHistoryNotes = useCallback(async () => {
    await saveStrategicTopicHistoryNoteDraft(true);
  }, [saveStrategicTopicHistoryNoteDraft]);

  useEffect(() => {
    if (!historyNotesTopic || !authSession || !selectedMeetingId) return;
    if (isLoadingHistoryNotes) return;

    const topicNotesKey = `${selectedMeetingId}:${historyNotesTopic.id}`;
    if (topicNotesAutosaveKeyRef.current !== topicNotesKey) {
      topicNotesAutosaveKeyRef.current = topicNotesKey;
      lastTopicNotesAutosaveSignatureRef.current = JSON.stringify(
        normalizeRichTextValue(historyNotesDraft),
      );
      return;
    }

    const currentSignature = JSON.stringify(normalizeRichTextValue(historyNotesDraft));
    if (currentSignature === lastTopicNotesAutosaveSignatureRef.current) return;

    setHistoryNotesStatus("Topic Notes autosave pending…");
    const timeoutId = window.setTimeout(() => {
      void saveStrategicTopicHistoryNoteDraft(false);
    }, topicNotesAutosaveDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    authSession,
    historyNotesDraft,
    historyNotesTopic,
    isLoadingHistoryNotes,
    saveStrategicTopicHistoryNoteDraft,
    selectedMeetingId,
  ]);

  const decisionActionRollupItems: MeetingItem[] = [
    ...activeMeeting.agendaItems
      .map(normalizeAgendaItem)
      .filter((item) => item.hasDecision && item.decisionText?.trim())
      .map((item) => ({
        id: item.id * 10 + 1,
        text: `Decision: ${item.decisionText?.trim() ?? ""}`,
      })),
    ...activeMeeting.agendaItems
      .map(normalizeAgendaItem)
      .filter((item) => item.hasAction && item.actionText?.trim())
      .map((item) => ({
        id: item.id * 10 + 2,
        text: `Action: ${item.actionText?.trim() ?? ""}`,
      })),
    ...activeMeeting.decisionItems.map((item) => ({
      ...item,
      text: `Legacy: ${item.text}`,
    })),
  ];

  const cascadeRollupItems: MeetingItem[] = activeMeeting.agendaItems
    .map(normalizeAgendaItem)
    .filter((item) => item.cascadeNeeded)
    .map((item) => ({
      id: item.id,
      text: [
        item.text,
        item.outcomeText?.trim()
          ? `Outcome: ${item.outcomeText.trim()}`
          : item.hasDecision && item.decisionText?.trim()
            ? `Decision: ${item.decisionText.trim()}`
            : "",
        !item.outcomeText?.trim() && item.hasAction && item.actionText?.trim()
          ? `Action: ${item.actionText.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    }));

  const meetingSections: Record<MeetingSectionKey, MeetingSectionConfig> = {
    agenda: {
      id: "agenda",
      title: "Agenda Items",
      description:
        "Track discussion, outcomes, and follow-ups per agenda item.",
      items: activeMeeting.agendaItems,
      newItem: newAgendaItem,
      setNewItem: setNewAgendaItem,
      addItem: () =>
        addMeetingItem(newAgendaItem, setNewAgendaItem, "agendaItems"),
      updateItem: (itemId, value) =>
        updateMeetingItem("agendaItems", itemId, value),
      deleteItem: (itemId) => deleteMeetingItem("agendaItems", itemId),
      updateAgendaItem,
      promoteAgendaItem: promoteAgendaItemToStrategicTopic,
      placeholder: "New agenda item",
      editPlaceholder: "Add agenda item",
      isReadOnly: isMeetingNotesReadOnly,
      readOnlyMessage: meetingNotesReadOnlyMessage,
      isFixed: true,
    },
    topic: {
      id: "topic",
      title: "Strategic Topics",
      description: "Capture high-level topics that carry across meetings.",
      items: visibleStrategicTopicItems,
      newItem: newTopicItem,
      setNewItem: setNewTopicItem,
      addItem: addStrategicTopicItem,
      updateItem: updateStrategicTopicItem,
      deleteItem: deleteStrategicTopicItem,
      archiveItem: archiveStrategicTopicItem,
      unarchiveItem: unarchiveStrategicTopicItem,
      restoreToActive: restoreStrategicTopicToActive,
      completedHistoryItems: completedStrategicTopicItems,
      archivedHistoryItems: archivedStrategicTopicItems,
      updateCompleted: updateStrategicTopicCompleted,
      openHistoryNotes: openStrategicTopicHistoryNotes,
      reorderItems: reorderStrategicTopicItems,
      placeholder: "New strategic topic",
      editPlaceholder: "Add strategic topic",
    },
    decision: {
      id: "decision",
      title: "Decisions / Actions",
      description:
        "Read-only rollup generated from Agenda Item decisions and actions. Edit outcomes on Agenda Items.",
      items: decisionActionRollupItems,
      newItem: newDecisionItem,
      setNewItem: setNewDecisionItem,
      addItem: () =>
        addMeetingItem(newDecisionItem, setNewDecisionItem, "decisionItems"),
      updateItem: (itemId, value) =>
        updateMeetingItem("decisionItems", itemId, value),
      deleteItem: (itemId) => deleteMeetingItem("decisionItems", itemId),
      placeholder: "New decision or action",
      editPlaceholder: "Decision or action item",
      isReadOnly: true,
      readOnlyMessage: "Decisions/Actions are generated from Agenda Items. Legacy entries are shown read-only.",
    },
    cascade: {
      id: "cascade",
      title: "Cascading Communication",
      description: "Staff communication — items from agenda marked as Cascade Needed appear here automatically. Add additional communication notes below.",
      items: activeMeeting.cascadeItems,
      newItem: newCascadeItem,
      setNewItem: setNewCascadeItem,
      addItem: () =>
        addMeetingItem(newCascadeItem, setNewCascadeItem, "cascadeItems"),
      updateItem: (itemId, value) =>
        updateMeetingItem("cascadeItems", itemId, value),
      deleteItem: (itemId) => deleteMeetingItem("cascadeItems", itemId),
      placeholder: "New cascading communication",
      editPlaceholder: "Cascading communication",
      isReadOnly: isMeetingNotesReadOnly,
      readOnlyMessage: meetingNotesReadOnlyMessage,
      rollupItems: cascadeRollupItems,
    },
  };


  const secondaryMeetingSectionOrder: MeetingSectionKey[] = [
    ...meetingSectionOrder.filter((sectionKey) => sectionKey === "topic" || sectionKey === "cascade"),
    ...(["topic", "cascade"] as MeetingSectionKey[]).filter(
      (sectionKey) => !meetingSectionOrder.includes(sectionKey),
    ),
  ];

  const getCurrentWorkspaceStorage = useCallback(
    () =>
      collectWorkspaceStorage({
        "leadership-objectives": objectives,
        "leadership-meetings": meetings,
        "leadership-active-meeting-id": activeMeeting.id,
        "leadership-dashboard-title": dashboardTitle,
        "leadership-organization-info": organizationInfo,
        [meetingSetupCompletedStorageKey]: hasCompletedMeetingSetup,
        "leadership-meeting-section-order": meetingSectionOrder,
        [strategicTopicsStorageKey]: strategicTopicItems,
        "leadership-standard-operating-objectives": standardOperatingObjectives,
      }),
    [
      activeMeeting.id,
      dashboardTitle,
      hasCompletedMeetingSetup,
      meetingSectionOrder,
      meetings,
      objectives,
      organizationInfo,
      standardOperatingObjectives,
      strategicTopicItems,
    ],
  );

  getCurrentWorkspaceStorageRef.current = getCurrentWorkspaceStorage;

  const normalizeStrategicTopicNotesBackup = useCallback(
    (value: unknown): Record<number, StrategicTopicNoteBackupEntry> => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {};
      }

      return Object.values(value).reduce<Record<number, StrategicTopicNoteBackupEntry>>(
        (entries, note) => {
          if (!isStrategicTopicNoteBackupEntry(note)) return entries;
          entries[note.strategic_topic_item_id] = {
            strategic_topic_item_id: note.strategic_topic_item_id,
            content_json: note.content_json,
            content_text: note.content_text,
            updated_at: note.updated_at ?? null,
          };
          return entries;
        },
        {},
      );
    },
    [],
  );

  const buildStrategicTopicNotesBackup = useCallback(
    (notes: StrategicTopicNoteDraftRecord[]) =>
      notes.reduce<Record<number, StrategicTopicNoteBackupEntry>>(
        (entries, note) => {
          entries[note.strategic_topic_item_id] = {
            strategic_topic_item_id: note.strategic_topic_item_id,
            content_json: note.content_json,
            content_text: note.content_text,
            updated_at: note.updated_at ?? null,
          };
          return entries;
        },
        {},
      ),
    [],
  );

  const loadCloudStrategicTopicNotesForBackup = useCallback(async () => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
      return [];
    }

    return supabaseMeetingClient.listStrategicTopicNotes({
      accessToken: authSession.accessToken,
      workspaceId: selectedMeetingId,
    });
  }, [authSession, isCurrentCloudRouteWorkspace, selectedMeetingId]);

  const getCurrentWorkspaceStorageForBackup = useCallback(async () => {
    const cloudNotes = await loadCloudStrategicTopicNotesForBackup();
    const cachedNotes = Object.values(strategicTopicNotesById).filter(
      (note): note is StrategicTopicNoteDraftRecord => note !== null,
    );
    const openDraftNote = historyNotesTopic
      ? [
          {
            strategic_topic_item_id: historyNotesTopic.id,
            content_json: normalizeRichTextValue(
              historyNotesDraft,
            ) as unknown as Record<string, unknown>,
            content_text: getRichTextPlainText(
              normalizeRichTextValue(historyNotesDraft),
            ),
            updated_at: new Date().toISOString(),
          },
        ]
      : [];

    return {
      ...getCurrentWorkspaceStorage(),
      [strategicTopicNotesStorageKey]: buildStrategicTopicNotesBackup([
        ...cloudNotes,
        ...cachedNotes,
        ...openDraftNote,
      ]),
    };
  }, [
    buildStrategicTopicNotesBackup,
    getCurrentWorkspaceStorage,
    historyNotesDraft,
    historyNotesTopic,
    loadCloudStrategicTopicNotesForBackup,
    strategicTopicNotesById,
  ]);


  const storeWorkspaceBackupInBrowser = useCallback(
    (backup: WorkspaceBackupFile, cloudWorkspaceId = "") => {
      if (typeof window === "undefined") return;

      Object.entries(backup.localStorage).forEach(([key, value]) => {
        window.localStorage.setItem(
          getWorkspaceScopedStorageKey(key, cloudWorkspaceId),
          JSON.stringify(value),
        );
      });
    },
    [],
  );

  const applyWorkspaceBackupToState = useCallback(
    (backup: WorkspaceBackupFile, endedMeetingIds = new Set<number>()) => {
      const nextMeetings = readBackupEntry(
        backup,
        "leadership-meetings",
        initialMeetings,
      );
      const fallbackActiveMeetingId = getPreferredActiveMeetingId(
        nextMeetings,
        endedMeetingIds,
        initialMeetings[0].id,
      );

      replaceObjectives(
        readBackupEntry(backup, "leadership-objectives", objectives),
      );
      setMeetings(nextMeetings);
      setActiveMeetingId(fallbackActiveMeetingId);
      setDashboardTitle(
        readBackupEntry(
          backup,
          "leadership-dashboard-title",
          defaultDashboardTitle,
        ),
      );
      setOrganizationInfo(
        readBackupEntry(
          backup,
          "leadership-organization-info",
          defaultOrganizationInfo,
        ),
      );
      setHasCompletedMeetingSetup(
        readBackupEntry(backup, meetingSetupCompletedStorageKey, false),
      );
      setMeetingSectionOrder(
        readBackupEntry(
          backup,
          "leadership-meeting-section-order",
          defaultMeetingSectionOrder,
        ),
      );
      setStrategicTopicItems(
        readBackupEntry(backup, strategicTopicsStorageKey, []),
      );
      setStrategicTopicNotesById(
        normalizeStrategicTopicNotesBackup(
          readBackupEntry(backup, strategicTopicNotesStorageKey, {}),
        ),
      );
      setStandardOperatingObjectives(
        readBackupEntry(
          backup,
          "leadership-standard-operating-objectives",
          defaultStandardOperatingObjectives,
        ),
      );
    },
    [
      initialMeetings,
      objectives,
      replaceObjectives,
      setActiveMeetingId,
      setDashboardTitle,
      setHasCompletedMeetingSetup,
      normalizeStrategicTopicNotesBackup,
      setMeetingSectionOrder,
      setMeetings,
      setOrganizationInfo,
      setStandardOperatingObjectives,
      setStrategicTopicItems,
    ],
  );


  const applyMeetingSettingsToState = useCallback(
    (settings: SupabaseMeetingSettings | null) => {
      if (!settings) return;

      if (settings.dashboard_title !== null) {
        setDashboardTitle(settings.dashboard_title);
      }
      if (settings.organization_info !== null) {
        setOrganizationInfo(
          settings.organization_info as unknown as OrganizationInfo,
        );
      }
      if (settings.meeting_section_order !== null) {
        setMeetingSectionOrder(
          settings.meeting_section_order as MeetingSectionKey[],
        );
      }
      setHasCompletedMeetingSetup(settings.setup_completed);
    },
    [
      setDashboardTitle,
      setHasCompletedMeetingSetup,
      setMeetingSectionOrder,
      setOrganizationInfo,
    ],
  );

  const applyStrategicTopicsToState = useCallback(
    (topics: SupabaseStrategicTopic[]) => {
      if (topics.length === 0) return;

      setStrategicTopicItems(topics.map(mapStrategicTopicFromSupabase));
    },
    [setStrategicTopicItems],
  );


  const applyObjectivesToState = useCallback(
    (objectiveRows: SupabaseObjective[], taskRows: SupabaseTask[]) => {
      if (objectiveRows.length === 0) return;

      replaceObjectives(mergeStructuredObjectives(objectiveRows, taskRows));
    },
    [replaceObjectives],
  );

  const applyStandardOperatingObjectivesToState = useCallback(
    (sooRows: SupabaseStandardOperatingObjective[]) => {
      if (sooRows.length === 0) return;

      setStandardOperatingObjectives(sooRows.map(mapSooFromSupabase));
    },
    [setStandardOperatingObjectives],
  );

  const buildObjectivesAutosavePayload = useCallback(
    (objectiveItems: Objective[], meetingId: string) => {
      const objectiveRows = objectiveItems.map((objective, index) =>
        mapObjectiveToSupabase(objective, meetingId, index),
      );
      const taskRows = objectiveItems.flatMap((objective) =>
        objective.tasks.map((task, index) =>
          mapTaskToSupabase(
            task,
            objective,
            meetingId,
            null,
            index,
          ),
        ),
      );

      return { objectiveRows, taskRows };
    },
    [],
  );

  const applyMeetingNotesToState = useCallback(
    (notes: SupabaseMeetingNote[], endedMeetingIds = new Set<number>()) => {
      if (notes.length === 0) return;

      setMeetings((currentMeetings) => {
        const nextMeetings = mergeStructuredMeetingNotes(currentMeetings, notes);
        setActiveMeetingId(
          getPreferredActiveMeetingId(
            nextMeetings,
            endedMeetingIds,
            initialMeetings[0].id,
          ),
        );
        return nextMeetings;
      });
    },
    [initialMeetings, setActiveMeetingId, setMeetings],
  );

  const applyAgendaItemsToState = useCallback(
    (agendaRows: SupabaseAgendaItem[]) => {
      if (agendaRows.length === 0) return;

      setMeetings((currentMeetings) =>
        mergeStructuredAgendaItems(currentMeetings, agendaRows),
      );
    },
    [setMeetings],
  );

  const saveStrategicTopicsBackupToCloud = useCallback(
    async (currentMeetings: MeetingRecord[]): Promise<MeetingRecord[]> => {
      if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
        return currentMeetings;
      }

      const topicRows = strategicTopicItems.map((item, index) =>
        mapStrategicTopicToSupabase(item, selectedMeetingId, index),
      );
      const savedTopics = await supabaseMeetingClient.saveStrategicTopics({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        topics: topicRows,
      });
      await supabaseMeetingClient.deleteMissingStrategicTopics({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        retainedClientItemIds: topicRows.map((t) => t.client_item_id),
      });

      const savedIdsByClientId = new Map(
        savedTopics.map((t) => [String(t.client_item_id), t.id]),
      );
      const validTopicUuids = new Set(savedTopics.map((t) => t.id));

      if (savedTopics.length > 0) {
        setStrategicTopicItems((current) =>
          current.map((item) => {
            const cloudId = savedIdsByClientId.get(String(item.id));
            return cloudId ? { ...item, strategicTopicId: cloudId } : item;
          }),
        );
      }

      // Always run: resolve numeric client IDs to UUIDs, and clear any
      // promotedStrategicTopicId that references a topic deleted from Supabase.
      const updatedMeetings = currentMeetings.map((meeting) => ({
        ...meeting,
        agendaItems: meeting.agendaItems.map((agendaItem) => {
          if (!agendaItem.promotedStrategicTopicId) return agendaItem;
          const resolvedId = savedIdsByClientId.get(
            agendaItem.promotedStrategicTopicId,
          );
          if (resolvedId) {
            return { ...agendaItem, promotedStrategicTopicId: resolvedId };
          }
          if (!validTopicUuids.has(agendaItem.promotedStrategicTopicId)) {
            return { ...agendaItem, promotedStrategicTopicId: undefined };
          }
          return agendaItem;
        }),
      }));
      setMeetings(updatedMeetings);
      return updatedMeetings;
    },
    [
      authSession,
      isCurrentCloudRouteWorkspace,
      selectedMeetingId,
      setMeetings,
      setStrategicTopicItems,
      strategicTopicItems,
    ],
  );

  const saveAgendaItemsBackupToCloud = useCallback(
    async (meetingRecords: MeetingRecord[]) => {
      if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
        return;
      }

      const agendaRows = buildAgendaItemsAutosavePayload(
        meetingRecords,
        selectedMeetingId,
      );
      await supabaseMeetingClient.saveAgendaItems({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        agendaItems: agendaRows,
      });
      await supabaseMeetingClient.deleteMissingAgendaItems({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        retainedClientAgendaItemIds: agendaRows.map(
          (item) => item.client_agenda_item_id,
        ),
      });
    },
    [authSession, isCurrentCloudRouteWorkspace, selectedMeetingId],
  );

  const handleLoadCloudMeeting = useCallback(async () => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
      setCloudSaveStatus("error");
      setCloudMeetingMessage("Open a valid Cloud Meeting route before loading cloud data.");
      return;
    }

    setCloudSaveStatus("saving");
    setCloudMeetingMessage("Loading cloud meeting…");

    try {
      const [
        cloudData,
        meetingSettings,
        strategicTopics,
        meetingNotes,
        agendaItems,
        objectiveRows,
        taskRows,
        sooRows,
        loadedTacticalSessions,
      ] = await Promise.all([
        supabaseMeetingClient.loadWorkspaceData({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.loadMeetingSettings({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.loadStrategicTopics({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.loadMeetingNotes({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.loadAgendaItems({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.loadObjectives({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.loadTasks({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.loadStandardOperatingObjectives({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
        supabaseMeetingClient.listTacticalSessions({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        }),
      ]);

      const loadedEndedMeetingIds = new Set(
        loadedTacticalSessions
          .map(getCapturedMeetingId)
          .filter((meetingId): meetingId is number =>
            typeof meetingId === "number",
          ),
      );
      setTacticalSessions(loadedTacticalSessions);
      const latestTacticalSessions = sortTacticalSessionsNewestFirst(
        loadedTacticalSessions,
      ).slice(0, 5);
      setSelectedTacticalSessionId((current) =>
        latestTacticalSessions.some((session) => session.id === current)
          ? current
          : latestTacticalSessions[0]?.id || "",
      );

      if (!cloudData) {
        applyMeetingSettingsToState(meetingSettings);
        applyStrategicTopicsToState(strategicTopics);
        applyMeetingNotesToState(meetingNotes, loadedEndedMeetingIds);
        applyAgendaItemsToState(agendaItems);
        applyObjectivesToState(objectiveRows, taskRows);
        applyStandardOperatingObjectivesToState(sooRows);
        setStrategicTopicNotesById({});
        setActiveCloudWorkspaceId(selectedMeetingId);
        setCloudSaveStatus("idle");
        setCloudMeetingMessage(
          strategicTopics.length > 0 ||
            meetingNotes.length > 0 ||
            agendaItems.length > 0 ||
            objectiveRows.length > 0 ||
            sooRows.length > 0
            ? "Cloud meeting loaded from structured autosave rows. Manual Save remains available for full workspace backup."
            : "This cloud meeting has no saved data yet. Use Save current workspace to cloud when ready.",
        );
        setIsRouteCloudBootstrapping(false);
        return;
      }

      const backup = validateWorkspaceBackup(cloudData);
      const signature = getWorkspaceStorageSignature(backup.localStorage);
      storeWorkspaceBackupInBrowser(backup, selectedMeetingId);
      setActiveCloudWorkspaceId(selectedMeetingId);
      applyWorkspaceBackupToState(backup, loadedEndedMeetingIds);
      applyMeetingSettingsToState(meetingSettings);
      applyStrategicTopicsToState(strategicTopics);
      applyMeetingNotesToState(meetingNotes, loadedEndedMeetingIds);
      applyAgendaItemsToState(agendaItems);
      applyObjectivesToState(objectiveRows, taskRows);
      applyStandardOperatingObjectivesToState(sooRows);
      lastCloudAutosaveSignatureRef.current = signature;
      setHasUnsavedFullWorkspaceChanges(false);
      setCloudSaveStatus("idle");
      setCloudMeetingMessage(
        "Cloud workspace loaded. Settings, Strategic Topics, Agenda Items, Meeting Notes, Cascading Communications, Objectives, Tasks, and SOOs autosave to structured storage; Manual Save backs up the full workspace.",
      );
      setIsRouteCloudBootstrapping(false);
    } catch (error) {
      setCloudSaveStatus("error");
      setCloudMeetingMessage(
        error instanceof Error
          ? error.message
          : "Cloud workspace could not be loaded.",
      );
      setIsRouteCloudBootstrapping(false);
    }
  }, [
    applyAgendaItemsToState,
    applyMeetingNotesToState,
    applyMeetingSettingsToState,
    applyObjectivesToState,
    applyStandardOperatingObjectivesToState,
    applyStrategicTopicsToState,
    applyWorkspaceBackupToState,
    authSession,
    isCurrentCloudRouteWorkspace,
    selectedMeetingId,
    storeWorkspaceBackupInBrowser,
  ]);

  useEffect(() => {
    if (!authSession || !isCloudRoute) return;
    if (!selectedMeetingId || selectedMeetingId !== routeMeetingId) return;
    if (lastAutoLoadedCloudMeetingIdRef.current === routeMeetingId) return;

    const timeoutId = window.setTimeout(() => {
      lastAutoLoadedCloudMeetingIdRef.current = routeMeetingId;
      void handleLoadCloudMeeting();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    authSession,
    handleLoadCloudMeeting,
    isCloudRoute,
    routeMeetingId,
    selectedMeetingId,
  ]);

  useEffect(() => {
    if (routeMeetingId !== lastAutoLoadedCloudMeetingIdRef.current) return;
    if (!authSession) {
      lastAutoLoadedCloudMeetingIdRef.current = "";
    }
  }, [authSession, routeMeetingId]);

  const saveWorkspaceBackupToCloud = useCallback(
    async (workspaceEntries: Record<string, unknown>, statusMessage: string) => {
      if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
        setCloudSaveStatus("error");
        setCloudMeetingMessage("Manual Save is available only from a valid Cloud Meeting route.");
        return false;
      }

      const backup = createWorkspaceBackup(workspaceEntries);
      await supabaseMeetingClient.saveWorkspaceData({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        data: backup,
      });
      storeWorkspaceBackupInBrowser(backup, selectedMeetingId);
      setActiveCloudWorkspaceId(selectedMeetingId);
      lastCloudAutosaveSignatureRef.current = getWorkspaceStorageSignature(
        getCurrentWorkspaceStorageRef.current?.() ?? {},
      );
      setHasUnsavedFullWorkspaceChanges(false);
      setCloudSaveStatus("saved");
      setCloudMeetingMessage(statusMessage);
      return true;
    },
    [
      authSession,
      isCurrentCloudRouteWorkspace,
      selectedMeetingId,
      storeWorkspaceBackupInBrowser,
    ],
  );

  const loadTacticalSessions = useCallback(async () => {
    if (
      !authSession ||
      !selectedMeetingId ||
      !isCurrentCloudRouteWorkspace ||
      !selectedMeetingName
    ) {
      setTacticalSessions([]);
      return;
    }

    setIsLoadingTacticalSessions(true);
    try {
      const sessions = await supabaseMeetingClient.listTacticalSessions({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
      });
      setTacticalSessions(sessions);
      const latestSessions = sortTacticalSessionsNewestFirst(sessions).slice(0, 5);
      setSelectedTacticalSessionId((current) =>
        latestSessions.some((session) => session.id === current)
          ? current
          : latestSessions[0]?.id || "",
      );
    } catch {
      setTacticalSessions([]);
    } finally {
      setIsLoadingTacticalSessions(false);
    }
  }, [
    authSession,
    isCurrentCloudRouteWorkspace,
    selectedMeetingId,
    selectedMeetingName,
  ]);

  const handleEndMeeting = useCallback(async () => {
    if (
      !authSession ||
      !selectedMeetingId ||
      !isCurrentCloudRouteWorkspace ||
      isEndingMeeting ||
      !canEndMeeting
    )
      return;

    setIsEndingMeeting(true);
    try {
      const workspaceEntries = getCurrentWorkspaceStorage();
      const created = await supabaseMeetingClient.endTacticalSession({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        sessionDate: activeMeeting.date,
        title: `Tactical Session ${activeMeeting.date}`,
        snapshotJson: workspaceEntries,
      });
      setTacticalSessions((current) => [created, ...current]);
      setSelectedTacticalSessionId(created.id);
      setShowEndMeetingConfirm(false);
      setCloudMeetingMessage(
        "Tactical History snapshot saved. This dated meeting is now read-only; autosave and Manual Save behavior are unchanged.",
      );
    } catch (error) {
      setCloudMeetingMessage(
        error instanceof Error
          ? error.message
          : "Tactical session snapshot could not be created.",
      );
    } finally {
      setIsEndingMeeting(false);
    }
  }, [
    activeMeeting.date,
    authSession,
    canEndMeeting,
    getCurrentWorkspaceStorage,
    isCurrentCloudRouteWorkspace,
    isEndingMeeting,
    selectedMeetingId,
  ]);

  const handleSaveCloudMeeting = useCallback(async () => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
      setCloudSaveStatus("error");
      setCloudMeetingMessage("Manual Save is available only from a valid Cloud Meeting route.");
      return;
    }

    const workspaceName = selectedMeetingName || "this cloud meeting";
    const shouldOverwrite = window.confirm(
      `This will overwrite the saved cloud data for ${workspaceName} with the current workspace data. Continue?`,
    );

    if (!shouldOverwrite) {
      setCloudSaveStatus("idle");
      setCloudMeetingMessage(
        "Cloud save canceled. Saved cloud data was not changed.",
      );
      return;
    }

    setCloudSaveStatus("saving");
    setCloudMeetingMessage("Saving full workspace to cloud backup…");

    try {
      const workspaceEntries = await getCurrentWorkspaceStorageForBackup();
      const wasSaved = await saveWorkspaceBackupToCloud(
        workspaceEntries,
        "Full workspace saved to cloud backup.",
      );
      if (wasSaved) {
        const meetingsWithResolvedTopicIds =
          await saveStrategicTopicsBackupToCloud(meetings);
        await saveAgendaItemsBackupToCloud(meetingsWithResolvedTopicIds);
        setManualSaveJustSucceeded(true);
        setTimeout(() => setManualSaveJustSucceeded(false), 2000);
      }
    } catch (error) {
      setCloudSaveStatus("error");
      setCloudMeetingMessage(
        error instanceof Error
          ? error.message
          : "Cloud workspace could not be saved.",
      );
    }
  }, [
    authSession,
    getCurrentWorkspaceStorageForBackup,
    isCurrentCloudRouteWorkspace,
    meetings,
    saveAgendaItemsBackupToCloud,
    saveStrategicTopicsBackupToCloud,
    saveWorkspaceBackupToCloud,
    selectedMeetingId,
    selectedMeetingName,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCloudSaveStatus("idle");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedMeetingId]);

  // After a cloud meeting loads (activeCloudWorkspaceId is set), sync the
  // baseline signature to current workspace state so the "Manual Save needed"
  // banner only appears when the user actually changes something post-load.
  useEffect(() => {
    if (!activeCloudWorkspaceId) return;
    const timeoutId = window.setTimeout(() => {
      lastCloudAutosaveSignatureRef.current = getWorkspaceStorageSignature(
        getCurrentWorkspaceStorageRef.current?.() ?? {},
      );
      setHasUnsavedFullWorkspaceChanges(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeCloudWorkspaceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTacticalSessions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTacticalSessions]);

  // Auto-open Tactical History when navigated from dashboard with ?tacticalHistory=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("tacticalHistory") !== "1") return;
    const timeoutId = window.setTimeout(() => setShowTacticalHistory(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const meetingSettingsAutosavePayload = useMemo<SupabaseMeetingSettingsUpsert>(
    () => ({
      dashboard_title: dashboardTitle,
      organization_info: { ...organizationInfo },
      meeting_section_order: meetingSectionOrder,
      setup_completed: hasCompletedMeetingSetup,
    }),
    [
      dashboardTitle,
      hasCompletedMeetingSetup,
      meetingSectionOrder,
      organizationInfo,
    ],
  );

  const strategicTopicsAutosavePayload = useMemo(
    () =>
      strategicTopicItems.map((item, index) =>
        mapStrategicTopicToSupabase(item, selectedMeetingId, index),
      ),
    [selectedMeetingId, strategicTopicItems],
  );

  const meetingNotesAutosavePayload = useMemo(
    () =>
      meetings.map((meeting) =>
        mapMeetingRecordToSupabase(meeting, selectedMeetingId),
      ),
    [meetings, selectedMeetingId],
  );

  const agendaItemsAutosavePayload = useMemo(
    () => buildAgendaItemsAutosavePayload(meetings, selectedMeetingId),
    [meetings, selectedMeetingId],
  );

  const objectivesAutosavePayload = useMemo(() => {
    const { objectiveRows, taskRows } = buildObjectivesAutosavePayload(
      objectives,
      selectedMeetingId,
    );
    const sooRows = standardOperatingObjectives.map((soo, index) =>
      mapSooToSupabase(soo, selectedMeetingId, index),
    );

    return { objectiveRows, taskRows, sooRows };
  }, [buildObjectivesAutosavePayload, objectives, selectedMeetingId, standardOperatingObjectives]);

  useWorkspacePersistence({
    authSession,
    selectedMeetingId,
    workspaceMode,
    activeCloudWorkspaceId,
    isCurrentCloudRouteWorkspace,
    isRouteCloudBootstrapping,
    hasLoadedDashboardStorage,
    meetingSettingsAutosavePayload,
    strategicTopicsAutosavePayload,
    meetingNotesAutosavePayload,
    agendaItemsAutosavePayload,
    objectivesAutosavePayload,
    getCurrentWorkspaceStorage,
    getLastCloudAutosaveSignature: () => lastCloudAutosaveSignatureRef.current,
    setSettingsAutosaveStatus,
    setStrategicTopicsAutosaveStatus,
    setMeetingNotesAutosaveStatus,
    setAgendaItemsAutosaveStatus,
    setObjectivesAutosaveStatus,
    setCloudMeetingMessage,
    setHasUnsavedFullWorkspaceChanges,
    setStrategicTopicItems,
    setMeetings,
    isSigningOutRef,
  });

  const handleExportWorkspaceBackup = async () => {
    try {
      const backup = createWorkspaceBackup(await getCurrentWorkspaceStorageForBackup());
      const backupJson = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupJson], { type: "application/json" });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);

      downloadLink.href = downloadUrl;
      downloadLink.download = `meeting-tool-workspace-backup-${dateStamp}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);

      setBackupFeedback({
        type: "success",
        message: "Workspace backup exported successfully.",
      });
    } catch (error) {
      setBackupFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to export workspace backup.",
      });
    }
  };

  // handleImportWorkspaceBackup removed — workspace import was removed from UI in Sprint 2;
  // the function was defined but never passed to BackupRestoreModal (export-only mode).

  const renderMissionValue = (value: RichTextValue) => {
    if (typeof value !== "string") {
      return <RichTextRenderer value={value} className="text-slate-700" />;
    }

    const entries = value
      .split(/[\n•\u2022]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (entries.length > 1) {
      return (
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          {entries.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }

    return <p className="text-slate-700 whitespace-pre-line">{value}</p>;
  };
  const latestTacticalSessions = sortTacticalSessionsNewestFirst(
    tacticalSessions,
  ).slice(0, 5);
  const selectedTacticalSession =
    latestTacticalSessions.find(
      (session) => session.id === selectedTacticalSessionId,
    ) ??
    latestTacticalSessions[0] ??
    null;
  const selectedTacticalSessionSummary = buildTacticalSnapshotSummary(
    selectedTacticalSession,
  );
  const stickyMeetingTitle = isCurrentCloudRouteWorkspace
    ? selectedMeetingName || dashboardTitle || defaultDashboardTitle
    : dashboardTitle || selectedMeetingName || defaultDashboardTitle;
  const structuredAutosaveStatuses: StructuredAutosaveStatus[] = [
    settingsAutosaveStatus,
    strategicTopicsAutosaveStatus,
    meetingNotesAutosaveStatus,
    agendaItemsAutosaveStatus,
    objectivesAutosaveStatus,
  ];
  const autosaveSummaryStatus = getAutosaveSummaryStatus({
    isCloudWorkspace: isCurrentCloudRouteWorkspace,
    structuredStatuses: structuredAutosaveStatuses,
    hasUnsavedFullWorkspaceChanges,
    cloudSaveStatus,
  });
  const isManualSaveInFlight =
    cloudSaveStatus === "saving" && isCurrentCloudRouteWorkspace;

  const computedManualSaveLabel: "Manual Save" | "Saving..." | "Saved" | "Up to date" | "Save failed" =
    manualSaveJustSucceeded
      ? "Saved"
      : isManualSaveInFlight
        ? "Saving..."
        : !hasUnsavedFullWorkspaceChanges
          ? "Up to date"
          : cloudSaveStatus === "error"
            ? "Save failed"
            : "Manual Save";

  const computedManualSaveDisabled = isManualSaveInFlight;

  if (!hasLoadedDashboardStorage) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto flex min-h-[60vh] max-w-[1600px] items-center justify-center">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center text-slate-600 shadow-sm">
            Loading saved dashboard…
          </div>
        </div>
      </main>
    );
  }

  if (isCloudRoute && !selectedMeetingId) {
    const shouldShowCloudRouteUnavailable =
      cloudSaveStatus === "error" && Boolean(cloudMeetingMessage);

    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto flex min-h-[60vh] max-w-[1600px] items-center justify-center">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center text-slate-700 shadow-sm">
            <p className="text-sm font-semibold text-blue-600">Cloud Meeting</p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              {shouldShowCloudRouteUnavailable
                ? "Cloud meeting unavailable"
                : "Loading cloud meeting…"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed">
              {shouldShowCloudRouteUnavailable
                ? cloudMeetingMessage
                : "Checking cloud meeting access…"}
            </p>
            {authSession && shouldShowCloudRouteUnavailable ? (
              <Link
                href="/dashboard"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Back to dashboard
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <MeetingHeader
        stickyMeetingTitle={stickyMeetingTitle}
        isCurrentCloudRouteWorkspace={isCurrentCloudRouteWorkspace}
        authSession={authSession}
        isAuthLoading={isAuthLoading}
        lifecycleHelpRef={lifecycleHelpRef}
        lifecycleStatusDescription={lifecycleStatusDescription}
        chipLabel={chipLabel}
        chipDate={chipDate}
        showLifecycleHelp={showLifecycleHelp}
        onToggleLifecycleHelp={() => setShowLifecycleHelp((isOpen) => !isOpen)}
        onOpenLifecycleHelp={() => setShowLifecycleHelp(true)}
        autosaveStatusDetailRef={autosaveStatusDetailRef}
        showAutosaveStatusDetail={showAutosaveStatusDetail}
        onToggleAutosaveStatusDetail={() =>
          setShowAutosaveStatusDetail((isOpen) => !isOpen)
        }
        autosaveSummaryStatus={autosaveSummaryStatus}
        settingsAutosaveStatus={settingsAutosaveStatus}
        strategicTopicsAutosaveStatus={strategicTopicsAutosaveStatus}
        agendaItemsAutosaveStatus={agendaItemsAutosaveStatus}
        meetingNotesAutosaveStatus={meetingNotesAutosaveStatus}
        objectivesAutosaveStatus={objectivesAutosaveStatus}
        cloudMeetingMessage={cloudMeetingMessage}
        onReloadCloudBackup={() => {
          setShowAutosaveStatusDetail(false);
          void handleLoadCloudMeeting();
        }}
        meetingActionHelpText={meetingActionHelpText}
        primaryActionLabel={primaryActionLabel}
        primaryActionDisabled={primaryActionDisabled}
        onPrimaryAction={handlePrimaryAction}
        testingToolsEnabled={testingToolsEnabled}
        isTestingModeActive={isTestingModeActive}
        onToggleTestingMode={(checked) => setIsTestingModeActive(checked)}
        testingMeetingDate={testingMeetingDate}
        onTestingMeetingDateChange={(date) => setTestingMeetingDate(date)}
        manualSaveLabel={computedManualSaveLabel}
        manualSaveDisabled={computedManualSaveDisabled}
        onManualSave={() => void handleSaveCloudMeeting()}
        settingsMenuRef={settingsMenuRef}
        showSettingsMenu={showSettingsMenu}
        onToggleSettingsMenu={() => setShowSettingsMenu((isOpen) => !isOpen)}
        isMeetingOwner={isMeetingOwner}
        onTacticalHistory={() => setShowTacticalHistory(true)}
        onChangePassword={() => setShowChangePassword(true)}
        onEditPlaybook={() => setShowPlaybookDefinitions(true)}
        onBackupRestore={() => setShowBackupRestore(true)}
        onSignOut={() => void handleSignOutAndExit()}
        isSigningOut={isSigningOut}
        onSignIn={() => setShowAuthModal(true)}
      />

      <div className="mx-auto max-w-[1600px] p-4 sm:p-8">

        {isActiveMeetingHistorical ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold">This meeting has been ended.</span>{" "}
            Content is read-only. To continue taking notes, start a new meeting for today.
          </div>
        ) : null}

        <div className="mb-10 space-y-5">
          <PlaybookManagedSection
            className="bg-white rounded-3xl p-6 text-center shadow md:p-8"
            label="Why Do We Exist?"
          >
            <h2 className="mb-4 text-2xl font-bold text-black">
              Why Do We Exist?
            </h2>
            <div className="mx-auto max-w-4xl text-lg leading-relaxed">
              {renderMissionValue(organizationInfoWithDefaults.whyExist)}
            </div>
          </PlaybookManagedSection>

          <div className="grid md:grid-cols-3 gap-5">
            <PlaybookManagedSection
              className="bg-white rounded-3xl p-5 shadow"
              label="How Do We Behave?"
            >
              <h2 className="font-bold text-lg mb-3 text-black">
                How Do We Behave?
              </h2>
              {renderMissionValue(organizationInfoWithDefaults.howBehave)}
            </PlaybookManagedSection>
            <PlaybookManagedSection
              className="bg-white rounded-3xl p-5 shadow"
              label="What Do We Do?"
            >
              <h2 className="font-bold text-lg mb-3 text-black">
                What Do We Do?
              </h2>
              {renderMissionValue(organizationInfoWithDefaults.whatDo)}
            </PlaybookManagedSection>
            <PlaybookManagedSection
              className="bg-white rounded-3xl p-5 shadow"
              label="How Will We Succeed?"
            >
              <h2 className="font-bold text-lg mb-3 text-black">
                How Will We Succeed?
              </h2>
              {renderMissionValue(organizationInfoWithDefaults.howSucceed)}
            </PlaybookManagedSection>
          </div>

          <PlaybookManagedSection
            className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-blue-50/80 p-6 text-center shadow md:p-8"
            label="Top Priority"
          >
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-600">
              Top Priority
            </p>
            <p className="text-3xl font-bold leading-snug text-slate-900 whitespace-pre-line">
              {organizationInfoWithDefaults.rallyCry || "Top Priority"}
            </p>
          </PlaybookManagedSection>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Defining Objectives
            </p>
            <button
              type="button"
              onClick={addAndOpenObjective}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold leading-none text-white shadow-sm hover:bg-blue-700"
              aria-label="Add defining objective"
            >
              +
            </button>
          </div>

          <div className={objectiveCardRowClassName}>
            {objectives.map((objective) => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                className={getObjectiveCardWidthClassName(objectives.length)}
                initiallyOpenDetails={objective.id === newObjectiveDetailId}
                taskInput={taskInputs[objective.id]}
                onDragStart={handleObjectiveDragStart}
                onDragOver={handleDragOver}
                onDrop={handleObjectiveDrop}
                onUpdateTitle={updateObjectiveTitle}
                onUpdateDescription={updateObjectiveDescription}
                onUpdateColor={updateObjectiveColor}
                onDelete={deleteObjective}
                onTaskInputChange={updateTaskInput}
                onAddTask={addTask}
                onOpenTask={openTaskDetails}
                onTaskStatusChange={updateTaskStatus}
              />
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Standard Operating Objectives
            </p>
            <button
              type="button"
              onClick={addStandardObjective}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold leading-none text-white shadow-sm hover:bg-blue-700"
              aria-label="Add standard operating objective"
            >
              +
            </button>
          </div>

          <div className={objectiveCardRowClassName}>
            {standardOperatingObjectives.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(event) =>
                  handleStandardObjectiveDragStart(event, item.id)
                }
                onDragOver={handleStandardObjectiveDragOver}
                onDrop={(event) => handleStandardObjectiveDrop(event, item.id)}
                onDragEnd={handleStandardObjectiveDragEnd}
                className={`flex min-w-0 cursor-grab items-center gap-3 rounded-2xl border border-l-8 border-blue-100 bg-blue-50/70 p-3 text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-100/80 active:cursor-grabbing ${getObjectiveCardWidthClassName(standardOperatingObjectives.length)} ${objectiveColorClasses[getStandardObjectiveColor(item)]} ${draggingStandardObjectiveId === item.id ? "opacity-60 ring-2 ring-blue-200" : ""}`}
                aria-label={`Drag ${item.title || "standard operating objective"} to reorder standard operating objectives`}
              >
                <span
                  className="shrink-0 select-none text-lg leading-none text-slate-400"
                  aria-hidden="true"
                >
                  ⋮⋮
                </span>
                <button
                  type="button"
                  onClick={() => openStandardObjectiveEditor(item)}
                  className="min-w-0 flex-1 rounded-lg text-left text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <span className="line-clamp-2 leading-snug">{item.title}</span>
                </button>
                <ColorSquareSelect
                  value={getStandardObjectiveColor(item)}
                  onChange={(color) =>
                    updateStandardObjectiveColor(item.id, color)
                  }
                  ariaLabel="Standard operating objective color"
                />
              </div>
            ))}
          </div>
        </section>

        <div
          ref={meetingNotesRef}
          className="mt-10 mb-6 scroll-mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-3xl font-bold text-slate-900">
                Meeting Notes — {activeMeeting.date}
                {isViewingTodayMeeting ? " · Current Meeting" : ""}
                {activeMeeting.isTestMeeting ? (
                  <span className="ml-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800">
                    Test Date
                  </span>
                ) : null}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateMeeting("previous")}
                  disabled={!canNavigateToPreviousMeeting}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="View previous meeting"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => navigateMeeting("next")}
                  disabled={!canNavigateToNextMeeting}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="View next meeting"
                >
                  →
                </button>
              </div>
            </div>
            <p
              className={`mt-3 min-h-5 text-sm font-semibold text-slate-600 ${
                isMeetingNotesReadOnly ? "" : "invisible"
              }`}
              aria-hidden={!isMeetingNotesReadOnly}
            >
              {meetingNotesReadOnlyMessage}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <MeetingSection
            section={meetingSections.agenda}
            onDragStart={handleMeetingSectionDragStart}
            onDragOver={handleDragOver}
            onDrop={handleMeetingSectionDrop}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {secondaryMeetingSectionOrder.map((sectionKey) => (
              <MeetingSection
                key={sectionKey}
                section={meetingSections[sectionKey]}
                onDragStart={handleMeetingSectionDragStart}
                onDragOver={handleDragOver}
                onDrop={handleMeetingSectionDrop}
              />
            ))}
          </div>
        </div>
      </div>

      {showWorkspaceHelp ? (
        <HelpPanel onClose={() => setShowWorkspaceHelp(false)} mode="workspace" />
      ) : null}

      <button
        type="button"
        onClick={() => setShowWorkspaceHelp(true)}
        className="fixed bottom-20 right-5 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-600 shadow-lg transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Open help panel"
      >
        ?
      </button>

      <FeedbackWidget
        session={authSession}
        onCollectWorkspaceSnapshot={getCurrentWorkspaceStorage}
      />


      {showDeleteMeetingNotesConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
                  Delete Meeting Notes
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Delete Meeting Notes?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteMeetingNotesConfirm(false)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close Delete Meeting Notes confirmation"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                This will remove the notes for the selected meeting record dated {activeMeeting.date}.
              </p>
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-950">
                <p className="font-semibold">What this will not delete</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>It will not delete the meeting workspace.</li>
                  <li>It will not delete cloud meeting data outside this notes record.</li>
                  <li>It will not delete tactical or strategic history snapshots.</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteMeetingNotesConfirm(false)}
                className="rounded-xl border border-slate-300 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Notes
              </button>
              <button
                type="button"
                onClick={deleteCurrentMeetingNotes}
                className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
              >
                Delete Meeting Notes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEndMeetingConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  End Meeting
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Capture this meeting in history?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEndMeetingConfirm(false)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close End Meeting confirmation"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                This creates a historical Tactical History snapshot for the current cloud meeting and closes this dated meeting for editing.
              </p>
              {activeMeeting.isTestMeeting ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-900">
                  Test Mode: this snapshot uses the test date {activeMeeting.date}.
                </p>
              ) : null}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
                <p className="font-semibold">What stays unchanged</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>The active workspace remains available for review after the snapshot.</li>
                  <li>Dated meeting notes, agenda, decisions, and cascading communications become read-only after End Meeting and refresh.</li>
                  <li>Dashboard, autosave, and Manual Save behavior are unchanged; use Manual Save when you need a full-workspace backup.</li>
                  <li>No meeting data is reset, advanced, or rewritten by this action.</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEndMeetingConfirm(false)}
                className="rounded-xl border border-slate-300 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleEndMeeting}
                disabled={isEndingMeeting}
                className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEndingMeeting ? "Saving History…" : "Capture Historical Snapshot"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTacticalHistory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Tactical History
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Tactical History
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Review ended tactical sessions without exposing raw snapshot data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTacticalHistory(false)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close Tactical History"
              >
                ×
              </button>
            </div>
            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[320px_1fr]">
              <aside className="overflow-y-auto border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
                {isLoadingTacticalSessions ? (
                  <p className="text-sm text-slate-500">Loading sessions…</p>
                ) : tacticalSessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No tactical history yet. Use End Meeting to capture the first session snapshot.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Showing latest 5 meetings
                    </p>
                    {latestTacticalSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedTacticalSessionId(session.id)}
                        className={`w-full rounded-xl border p-3 text-left ${
                          session.id === selectedTacticalSession?.id
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">
                          {session.title || `Tactical Session ${session.session_date}`}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>Meeting date: {session.session_date}</span>
                          {buildTacticalSnapshotSummary(session).isTestMeeting ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                              Test Date
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Captured: {new Date(session.created_at).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </aside>
              <section className="min-h-0 overflow-y-auto bg-slate-50 p-6">
                {selectedTacticalSession ? (
                  <>
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedTacticalSession.title ||
                          `Tactical Session ${selectedTacticalSession.session_date}`}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Ended: {selectedTacticalSession.ended_at
                          ? new Date(selectedTacticalSession.ended_at).toLocaleString()
                          : "Not recorded"}
                      </p>
                    </div>
                    <TacticalHistorySummary summary={selectedTacticalSessionSummary} />
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                    Select a tactical session to view its historical summary.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <AuthModal
        isOpen={showAuthModal}
        isConfigured={isAuthConfigured}
        isLoading={isAuthLoading}
        session={authSession}
        onClose={() => setShowAuthModal(false)}
        onSignIn={async (email, password) => {
          const result = await signIn(email, password);
          router.replace("/dashboard");
          return result;
        }}
        onSignUp={async (email, password) => {
          const result = await signUp(email, password);
          router.replace("/dashboard");
          return result;
        }}
        onRequestPasswordReset={requestPasswordReset}
        onSignOut={async () => {
          await handleSignOutAndExit();
        }}
      />

      {selectedStandardObjectiveId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="relative z-[80] mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Standard Operating Objective
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ColorSquareSelect
                  value={standardObjectiveDraft.color}
                  onChange={(color) =>
                    setStandardObjectiveDraft((draft) => ({
                      ...draft,
                      color,
                    }))
                  }
                  ariaLabel="Standard operating objective modal color"
                />
                <button
                  type="button"
                  onClick={closeStandardObjectiveEditor}
                  className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close standard operating objective editor"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-lg font-semibold text-slate-900">
                  Title
                </span>
                <input
                  type="text"
                  value={standardObjectiveDraft.title}
                  onChange={(event) =>
                    setStandardObjectiveDraft((draft) => ({
                      ...draft,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="New Standard Objective"
                />
              </label>

              <div>
                <span className="mb-2 block text-lg font-semibold text-slate-900">
                  Description
                </span>
                <RichTextEditor
                  key={selectedStandardObjectiveId}
                  value={standardObjectiveDraft.description}
                  onChange={(description) =>
                    setStandardObjectiveDraft((draft) => ({
                      ...draft,
                      description,
                    }))
                  }
                  placeholder="Add standard operating objective details..."
                  className="bg-blue-50/50"
                  editorClassName="text-base leading-relaxed"
                  minHeightClassName="min-h-[180px]"
                  ariaLabel="Standard operating objective description"
                  editingMode="always"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={deleteStandardObjective}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 font-semibold text-red-700 hover:bg-red-100"
              >
                Delete
              </button>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeStandardObjectiveEditor}
                  className="rounded-xl bg-slate-500 px-5 py-2 font-semibold text-white hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveStandardObjective}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {historyNotesTopic ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {historyNotesTopic.text}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryNotesTopic(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">
              Strategic Topic Notes
            </p>
            <RichTextEditor
              key={`${historyNotesTopic.id}:${isLoadingHistoryNotes ? "loading" : "ready"}`}
              value={historyNotesDraft}
              onChange={setHistoryNotesDraft}
              disabled={isLoadingHistoryNotes || !authSession || !selectedMeetingId}
              placeholder="Add strategic notes/history for this topic."
              className="bg-white"
              editorClassName="text-sm leading-relaxed"
              minHeightClassName="min-h-48"
              ariaLabel="Strategic topic notes"
              editingMode="always"
            />
            {strategicTopicNotesById[historyNotesTopic.id]?.updated_at ? (
              <p className="mt-2 text-xs text-slate-500">
                Last saved: {new Date(strategicTopicNotesById[historyNotesTopic.id]?.updated_at ?? "").toLocaleString()}
              </p>
            ) : null}
            {historyNotesStatus ? (
              <p className="mt-2 text-sm text-slate-700">{historyNotesStatus}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleSaveStrategicTopicHistoryNotes()}
                disabled={isSavingHistoryNotes || isLoadingHistoryNotes || !authSession || !selectedMeetingId}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSavingHistoryNotes ? "Saving…" : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedObjective && selectedTaskDetails ? (
        <TaskDetailsModal
          task={selectedTaskDetails}
          objectiveTitle={selectedObjective.title}
          onClose={closeTaskDetails}
          onDelete={() =>
            deleteTask(selectedObjective.id, selectedTaskDetails.id)
          }
          onUpdate={(updates) =>
            updateTask(selectedObjective.id, selectedTaskDetails.id, updates)
          }
        />
      ) : null}

      {shouldShowMeetingSetup ? (
        <MeetingSetupModal
          isOpen={shouldShowMeetingSetup}
          onClose={() => setShowMeetingSetup(false)}
          organizationInfo={organizationInfoWithDefaults}
          onSave={setOrganizationInfo}
          dashboardTitle={dashboardTitle}
          onDashboardTitleChange={setDashboardTitle}
          onComplete={() => setHasCompletedMeetingSetup(true)}
          requireCompletion={!hasCompletedMeetingSetup}
        />
      ) : null}

      {showChangePassword ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
              <button
                type="button"
                onClick={() => { setShowChangePassword(false); setChangePasswordNewPassword(""); setChangePasswordConfirm(""); setChangePasswordMessage(null); }}
                className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close change password"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">New password</span>
                <input
                  type="password"
                  value={changePasswordNewPassword}
                  onChange={(event) => setChangePasswordNewPassword(event.target.value)}
                  disabled={isChangingPassword}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
                  placeholder="New password"
                />
                <span className="mt-1 block text-xs text-slate-500">Minimum 6 characters.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Confirm new password</span>
                <input
                  type="password"
                  value={changePasswordConfirm}
                  onChange={(event) => setChangePasswordConfirm(event.target.value)}
                  disabled={isChangingPassword}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
                  placeholder="Confirm new password"
                />
              </label>
              {changePasswordMessage ? (
                <p className={`rounded-xl border px-3 py-2 text-sm ${changePasswordMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {changePasswordMessage.text}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowChangePassword(false); setChangePasswordNewPassword(""); setChangePasswordConfirm(""); setChangePasswordMessage(null); }}
                disabled={isChangingPassword}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleChangePassword()}
                disabled={isChangingPassword || !changePasswordNewPassword || !changePasswordConfirm}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChangingPassword ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PlaybookDefinitionsModal
        isOpen={showPlaybookDefinitions}
        onClose={() => setShowPlaybookDefinitions(false)}
        organizationInfo={organizationInfoWithDefaults}
        onSave={setOrganizationInfo}
        dashboardTitle={dashboardTitle}
        onDashboardTitleChange={setDashboardTitle}
      />

      <BackupRestoreModal
        isOpen={showBackupRestore}
        onClose={() => setShowBackupRestore(false)}
        onExportWorkspaceBackup={handleExportWorkspaceBackup}
        backupFeedback={backupFeedback}
        mode="export-only"
      />


    </main>
  );
}
