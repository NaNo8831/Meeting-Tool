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
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import { useObjectives } from "@/app/hooks/useObjectives";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";
import {
  defaultDashboardTitle,
  defaultMeetingSectionOrder,
  defaultObjectiveColor,
  defaultOrganizationInfo,
  defaultStandardOperatingObjectives,
  objectiveColorClasses,
} from "@/app/lib/objectiveOptions";
import {
  collectLocalWorkspaceStorage,
  collectWorkspaceStorage,
  createWorkspaceBackup,
  getWorkspaceStorageSignature,
  hasMeaningfulWorkspaceStorage,
  validateWorkspaceBackup,
  type WorkspaceBackupFeedback,
  type WorkspaceBackupFile,
} from "@/app/lib/workspaceBackup";
import {
  supabaseMeetingClient,
  type SupabaseStrategicTopicNote,
  type SupabaseTacticalSession,
} from "@/app/lib/supabaseClient";
import type {
  MeetingItem,
  MeetingRecord,
  MeetingSectionConfig,
  MeetingSectionKey,
  StandardOperatingObjective,
} from "@/app/types/dashboard";
import type { ObjectiveColor } from "@/app/types/objective";
import type { RichTextDocument, RichTextValue } from "@/app/types/richText";

const getTodayDate = () => new Date().toISOString().slice(0, 10);

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

const getStrategicTopicNoteDraft = (
  note: SupabaseStrategicTopicNote | null,
): RichTextValue => {
  if (!note) return "";
  if (isStrategicTopicRichTextNote(note.content_json)) {
    return note.content_json;
  }

  return note.content_text ?? "";
};

const strategicTopicsStorageKey = "leadership-strategic-topic-items";
const meetingSetupCompletedStorageKey = "leadership-meeting-setup-completed";
type MeetingSpecificSectionKey =
  | "agendaItems"
  | "decisionItems"
  | "cascadeItems";

const cloudWorkspaceStorageKeyPrefix = "meeting-tool-cloud-workspace";
const localToCloudMigrationStorageKeyPrefix =
  "meeting-tool-local-to-cloud-migration";

type LocalToCloudMigrationState = {
  migratedSignature?: string;
  skippedSignature?: string;
};

const getLocalToCloudMigrationStorageKey = (
  userId: string,
  cloudWorkspaceId: string,
) => `${localToCloudMigrationStorageKeyPrefix}:${userId}:${cloudWorkspaceId}`;

const readLocalToCloudMigrationState = (
  userId: string,
  cloudWorkspaceId: string,
): LocalToCloudMigrationState => {
  if (typeof window === "undefined") return {};

  const storedValue = window.localStorage.getItem(
    getLocalToCloudMigrationStorageKey(userId, cloudWorkspaceId),
  );
  if (!storedValue) return {};

  try {
    return JSON.parse(storedValue) as LocalToCloudMigrationState;
  } catch {
    return {};
  }
};

const writeLocalToCloudMigrationState = (
  userId: string,
  cloudWorkspaceId: string,
  state: LocalToCloudMigrationState,
) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getLocalToCloudMigrationStorageKey(userId, cloudWorkspaceId),
    JSON.stringify(state),
  );
};

const getWorkspaceScopedStorageKey = (
  baseKey: string,
  cloudWorkspaceId: string,
) =>
  cloudWorkspaceId
    ? `${cloudWorkspaceStorageKeyPrefix}:${cloudWorkspaceId}:${baseKey}`
    : baseKey;

type CloudSaveStatus = "local" | "idle" | "saving" | "saved" | "error";

const readBackupEntry = <T,>(
  backup: WorkspaceBackupFile,
  key: string,
  fallback: T,
): T => {
  const value = backup.localStorage[key];
  return value === undefined ? fallback : (value as T);
};

const createBlankMeeting = (): MeetingRecord => ({
  id: Date.now(),
  date: getTodayDate(),
  agendaItems: [],
  topicItems: [],
  decisionItems: [],
  cascadeItems: [],
});

const readLegacyMeetingItems = (key: string): MeetingItem[] => {
  if (typeof window === "undefined") return [];

  const storedValue = window.localStorage.getItem(key);
  if (storedValue === null) return [];

  try {
    return JSON.parse(storedValue) as MeetingItem[];
  } catch {
    return [];
  }
};

const getInitialMeetings = (): MeetingRecord[] => [createBlankMeeting()];

const getLegacyMeeting = (): MeetingRecord => ({
  ...createBlankMeeting(),
  agendaItems: readLegacyMeetingItems("leadership-agenda-items"),
  topicItems: readLegacyMeetingItems("leadership-topic-items"),
  decisionItems: readLegacyMeetingItems("leadership-decision-items"),
  cascadeItems: readLegacyMeetingItems("leadership-cascade-items"),
});

const hasMeetingItems = (meeting: MeetingRecord) =>
  [meeting.agendaItems, meeting.decisionItems, meeting.cascadeItems].some(
    (items) => items.length > 0,
  );

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

const dedupeMeetingItems = (
  items: MeetingItem[],
  fallbackMeeting: Pick<MeetingRecord, "id" | "date">,
): MeetingItem[] => {
  const seenItems = new Set<string>();

  return items.reduce<MeetingItem[]>((dedupedItems, item) => {
    const itemKey = item.text.trim().toLocaleLowerCase();
    if (!itemKey || seenItems.has(itemKey)) return dedupedItems;

    seenItems.add(itemKey);
    dedupedItems.push(normalizeStrategicTopic(item, fallbackMeeting));
    return dedupedItems;
  }, []);
};

const getLegacyStrategicTopics = (): MeetingItem[] => {
  const fallbackMeeting = createBlankMeeting();
  const legacyTopicItems = readLegacyMeetingItems("leadership-topic-items");

  if (typeof window === "undefined")
    return dedupeMeetingItems(legacyTopicItems, fallbackMeeting);

  const storedMeetingsValue = window.localStorage.getItem(
    "leadership-meetings",
  );
  if (storedMeetingsValue === null)
    return dedupeMeetingItems(legacyTopicItems, fallbackMeeting);

  try {
    const storedMeetings = JSON.parse(storedMeetingsValue) as MeetingRecord[];
    const meetingTopicItems = storedMeetings.flatMap((meeting, meetingIndex) =>
      (meeting.topicItems ?? []).map((item) =>
        normalizeStrategicTopic(item, meeting, meetingIndex),
      ),
    );

    return dedupeMeetingItems(
      [...legacyTopicItems, ...meetingTopicItems],
      storedMeetings[0] ?? fallbackMeeting,
    );
  } catch {
    return dedupeMeetingItems(legacyTopicItems, fallbackMeeting);
  }
};

export default function MeetingWorkspace() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const routeMeetingId = typeof params?.id === "string" ? params.id : "";
  const isLocalRoute = routeMeetingId === "local";
  const isCloudRoute = Boolean(routeMeetingId) && !isLocalRoute;
  const initialMeetings = useMemo(() => getInitialMeetings(), []);
  const initialStrategicTopicItems = useMemo<MeetingItem[]>(() => [], []);
  const {
    session: authSession,
    isConfigured: isAuthConfigured,
    isLoading: isAuthLoading,
    signUp,
    signIn,
    signOut,
  } = useSupabaseAuth();
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [selectedMeetingName, setSelectedMeetingName] =
    useState("");
  const isCurrentCloudRouteWorkspace =
    isCloudRoute && Boolean(selectedMeetingId) && selectedMeetingId === routeMeetingId;
  const [activeCloudWorkspaceId, setActiveCloudWorkspaceId] = useState("");
  const [cloudSaveStatus, setCloudSaveStatus] =
    useState<CloudSaveStatus>("local");
  const cloudSaveStatusLabel: Record<CloudSaveStatus, string> = {
    local: "Local only",
    idle: "Cloud ready",
    saving: "Working…",
    saved: "Saved",
    error: "Needs attention",
  };
  const [cloudMeetingMessage, setCloudMeetingMessage] = useState("");
  const [selectedMeetingHasData, setSelectedMeetingHasData] =
    useState(false);
  const [isCheckingCloudWorkspaceData, setIsCheckingCloudWorkspaceData] =
    useState(false);
  const [isMigratingLocalWorkspace, setIsMigratingLocalWorkspace] =
    useState(false);
  const [
    localWorkspaceMigrationSignature,
    setLocalWorkspaceMigrationSignature,
  ] = useState("");
  const [localWorkspaceMigrationState, setLocalWorkspaceMigrationState] =
    useState<LocalToCloudMigrationState>({});
  const workspaceMode = selectedMeetingId ? "cloud" : "local";
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
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [showMeetingSetup, setShowMeetingSetup] = useState(false);
  const [showPlaybookDefinitions, setShowPlaybookDefinitions] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [backupFeedback, setBackupFeedback] =
    useState<WorkspaceBackupFeedback | null>(null);
  const [draggingMeetingSection, setDraggingMeetingSection] =
    useState<MeetingSectionKey | null>(null);
  const [draggingStandardObjectiveId, setDraggingStandardObjectiveId] =
    useState<number | null>(null);
  const lastCloudAutosaveSignatureRef = useRef("");
  const lastAutoLoadedCloudMeetingIdRef = useRef("");
  const [isRouteCloudBootstrapping, setIsRouteCloudBootstrapping] =
    useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [tacticalSessions, setTacticalSessions] = useState<
    SupabaseTacticalSession[]
  >([]);
  const [isLoadingTacticalSessions, setIsLoadingTacticalSessions] =
    useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [selectedTacticalSessionId, setSelectedTacticalSessionId] =
    useState("");
  const [historyNotesTopic, setHistoryNotesTopic] = useState<MeetingItem | null>(null);
  const [historyNotesDraft, setHistoryNotesDraft] = useState<RichTextValue>("");
  const [historyNotesStatus, setHistoryNotesStatus] = useState("");
  const [isLoadingHistoryNotes, setIsLoadingHistoryNotes] = useState(false);
  const [isSavingHistoryNotes, setIsSavingHistoryNotes] = useState(false);
  const [strategicTopicNotesById, setStrategicTopicNotesById] = useState<Record<number, SupabaseStrategicTopicNote | null>>({});
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
  const canNavigateToPreviousMeeting = activeMeetingIndex > 0;
  const canNavigateToNextMeeting = activeMeetingIndex < meetings.length - 1;
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

  const shouldShowLocalToCloudMigrationPrompt = Boolean(
    authSession &&
    isCurrentCloudRouteWorkspace &&
    selectedMeetingName &&
    localWorkspaceMigrationSignature &&
    localWorkspaceMigrationState.migratedSignature !==
      localWorkspaceMigrationSignature &&
    localWorkspaceMigrationState.skippedSignature !==
      localWorkspaceMigrationSignature,
  );

  useEffect(() => {
    let isMounted = true;

    if (isLocalRoute) {
      const timeoutId = window.setTimeout(() => {
        if (!isMounted) return;
        setSelectedMeetingId("");
        setSelectedMeetingName("");
        setIsRouteCloudBootstrapping(false);
      }, 0);
      return () => {
        isMounted = false;
        window.clearTimeout(timeoutId);
      };
    }

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
  }, [authSession, isCloudRoute, isLocalRoute, routeMeetingId, selectedMeetingId]);

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
    if (workspaceMode !== "cloud") return;
    if (!selectedMeetingName.trim()) return;

    const trimmedDashboardTitle = dashboardTitle.trim();
    if (
      !trimmedDashboardTitle ||
      trimmedDashboardTitle === "Meeting Tool by LyArk"
    ) {
      setDashboardTitle(selectedMeetingName);
    }
  }, [dashboardTitle, selectedMeetingName, setDashboardTitle, workspaceMode]);

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

  const handleSignOutAndExit = async () => {
    if (isSigningOut) return;
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
    if (workspaceMode === "cloud" || !hasLoadedMeetings) return;

    const timeoutId = window.setTimeout(() => {
      if (window.localStorage.getItem("leadership-meetings") !== null) return;

      const legacyMeeting = getLegacyMeeting();
      if (!hasMeetingItems(legacyMeeting)) return;

      setMeetings([legacyMeeting]);
      setActiveMeetingId(legacyMeeting.id);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasLoadedMeetings, setActiveMeetingId, setMeetings, workspaceMode]);

  useEffect(() => {
    if (workspaceMode === "cloud" || !hasLoadedStrategicTopicItems) return;

    const timeoutId = window.setTimeout(() => {
      if (window.localStorage.getItem(strategicTopicsStorageKey) !== null)
        return;

      const legacyStrategicTopics = getLegacyStrategicTopics();
      if (legacyStrategicTopics.length === 0) return;

      setStrategicTopicItems(legacyStrategicTopics);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasLoadedStrategicTopicItems, setStrategicTopicItems, workspaceMode]);

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
    setDraggingMeetingSection(id);
  };

  const handleMeetingSectionDrop = (id: MeetingSectionKey) => {
    if (draggingMeetingSection === null || draggingMeetingSection === id)
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
    if (!value.trim()) return;
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
    updateActiveMeeting({
      [sectionKey]: activeMeeting[sectionKey].map((item) =>
        item.id === itemId ? { ...item, text: value } : item,
      ),
    });
  };

  const deleteMeetingItem = (
    sectionKey: MeetingSpecificSectionKey,
    itemId: number,
  ) => {
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
    setStrategicTopicItems(
      strategicTopicItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "completed",
              completed: true,
              completedDate: item.completedDate || activeMeeting.date,
              archivedAt: undefined,
              removedMeetingId: undefined,
              removedMeetingIndex: undefined,
              removedDate: undefined,
            }
          : item,
      ),
    );
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

  const createNewMeeting = () => {
    const newMeeting = createBlankMeeting();
    setMeetings([...meetings, newMeeting]);
    setActiveMeetingId(newMeeting.id);
    setNewAgendaItem("");
    setNewDecisionItem("");
    setNewCascadeItem("");
  };

  const deleteCurrentMeeting = () => {
    const isOnlyMeeting = meetings.length <= 1;
    const warningMessage = isOnlyMeeting
      ? "This is the only meeting. Deleting it will reset it to a blank meeting. Continue?"
      : "Delete this meeting? Agenda Items, Decisions / Actions, and Cascading Communication for this meeting will be removed. Strategic Topics remain available in meeting history where appropriate.";

    if (!window.confirm(warningMessage)) return;

    if (isOnlyMeeting) {
      const fallbackMeeting = createBlankMeeting();
      setMeetings([fallbackMeeting]);
      setActiveMeetingId(fallbackMeeting.id);
    } else {
      const remainingMeetings = meetings.filter(
        (meeting) => meeting.id !== activeMeeting.id,
      );
      const fallbackActiveMeeting =
        remainingMeetings[Math.max(activeMeetingIndex - 1, 0)] ??
        remainingMeetings[0];
      setMeetings(remainingMeetings);
      setActiveMeetingId(fallbackActiveMeeting.id);
    }

    setNewAgendaItem("");
    setNewDecisionItem("");
    setNewCascadeItem("");
  };

  const navigateMeeting = (direction: "previous" | "next") => {
    const nextIndex =
      direction === "previous"
        ? activeMeetingIndex - 1
        : activeMeetingIndex + 1;
    const nextMeeting = meetings[nextIndex];
    if (!nextMeeting) return;
    setActiveMeetingId(nextMeeting.id);
    setNewAgendaItem("");
    setNewDecisionItem("");
    setNewCascadeItem("");
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
        });
        setStrategicTopicNotesById((current) => ({ ...current, [item.id]: note }));
        setHistoryNotesDraft(getStrategicTopicNoteDraft(note));
      } catch (error) {
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
    [authSession, selectedMeetingId],
  );

  const handleSaveStrategicTopicHistoryNotes = useCallback(async () => {
    if (!historyNotesTopic || !authSession || !selectedMeetingId) return;
    setIsSavingHistoryNotes(true);
    setHistoryNotesStatus("Saving history…");
    try {
      const contentDocument = normalizeRichTextValue(historyNotesDraft);
      const saved = await supabaseMeetingClient.saveStrategicTopicNote({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        strategicTopicItemId: historyNotesTopic.id,
        contentText: getRichTextPlainText(contentDocument),
        contentJson: contentDocument as unknown as Record<string, unknown>,
      });
      setStrategicTopicNotesById((current) => ({
        ...current,
        [historyNotesTopic.id]: saved,
      }));
      setHistoryNotesStatus("History saved.");
    } catch (error) {
      setHistoryNotesStatus(
        error instanceof Error
          ? error.message
          : "Strategic topic note could not be saved.",
      );
    } finally {
      setIsSavingHistoryNotes(false);
    }
  }, [authSession, historyNotesDraft, historyNotesTopic, selectedMeetingId]);

  const meetingSections: Record<MeetingSectionKey, MeetingSectionConfig> = {
    agenda: {
      id: "agenda",
      title: "Agenda Items",
      description: "List the meeting agenda items to cover.",
      items: activeMeeting.agendaItems,
      newItem: newAgendaItem,
      setNewItem: setNewAgendaItem,
      addItem: () =>
        addMeetingItem(newAgendaItem, setNewAgendaItem, "agendaItems"),
      updateItem: (itemId, value) =>
        updateMeetingItem("agendaItems", itemId, value),
      deleteItem: (itemId) => deleteMeetingItem("agendaItems", itemId),
      placeholder: "New agenda item",
      editPlaceholder: "Add agenda item",
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
      placeholder: "New strategic topic",
      editPlaceholder: "Add strategic topic",
    },
    decision: {
      id: "decision",
      title: "Decisions / Actions",
      description: "Document the decisions and next actions from the meeting.",
      items: activeMeeting.decisionItems,
      newItem: newDecisionItem,
      setNewItem: setNewDecisionItem,
      addItem: () =>
        addMeetingItem(newDecisionItem, setNewDecisionItem, "decisionItems"),
      updateItem: (itemId, value) =>
        updateMeetingItem("decisionItems", itemId, value),
      deleteItem: (itemId) => deleteMeetingItem("decisionItems", itemId),
      placeholder: "New decision or action",
      editPlaceholder: "Decision or action item",
    },
    cascade: {
      id: "cascade",
      title: "Cascading Communication",
      description: "What does the Staff need to know",
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
    },
  };

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
    (backup: WorkspaceBackupFile) => {
      const nextMeetings = readBackupEntry(
        backup,
        "leadership-meetings",
        initialMeetings,
      );
      const fallbackActiveMeetingId =
        nextMeetings[0]?.id ?? initialMeetings[0].id;

      replaceObjectives(
        readBackupEntry(backup, "leadership-objectives", objectives),
      );
      setMeetings(nextMeetings);
      setActiveMeetingId(
        readBackupEntry(
          backup,
          "leadership-active-meeting-id",
          fallbackActiveMeetingId,
        ),
      );
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
      setMeetingSectionOrder,
      setMeetings,
      setOrganizationInfo,
      setStandardOperatingObjectives,
      setStrategicTopicItems,
    ],
  );

  const refreshLocalWorkspaceMigrationSignature = useCallback(() => {
    if (typeof window === "undefined") return;

    const localEntries = collectLocalWorkspaceStorage();
    if (!hasMeaningfulWorkspaceStorage(localEntries)) {
      setLocalWorkspaceMigrationSignature("");
      return;
    }

    setLocalWorkspaceMigrationSignature(
      getWorkspaceStorageSignature(localEntries),
    );
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      refreshLocalWorkspaceMigrationSignature,
      0,
    );

    return () => window.clearTimeout(timeoutId);
  }, [refreshLocalWorkspaceMigrationSignature, selectedMeetingId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!authSession || !selectedMeetingId) {
        setLocalWorkspaceMigrationState({});
        return;
      }

      setLocalWorkspaceMigrationState(
        readLocalToCloudMigrationState(
          authSession.user.id,
          selectedMeetingId,
        ),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authSession, selectedMeetingId, localWorkspaceMigrationSignature]);

  useEffect(() => {
    let isMounted = true;

    const checkSelectedCloudWorkspaceData = async () => {
      if (!authSession || !selectedMeetingId) {
        setSelectedMeetingHasData(false);
        return;
      }

      setIsCheckingCloudWorkspaceData(true);
      try {
        const cloudData = await supabaseMeetingClient.loadWorkspaceData({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
        });
        if (!isMounted) return;

        setSelectedMeetingHasData(Boolean(cloudData));
      } catch {
        if (!isMounted) return;

        setSelectedMeetingHasData(true);
      } finally {
        if (isMounted) setIsCheckingCloudWorkspaceData(false);
      }
    };

    void checkSelectedCloudWorkspaceData();

    return () => {
      isMounted = false;
    };
  }, [authSession, selectedMeetingId]);

  const recordLocalWorkspaceMigrationState = useCallback(
    (state: LocalToCloudMigrationState) => {
      if (!authSession || !selectedMeetingId) return;

      const nextState = {
        ...localWorkspaceMigrationState,
        ...state,
      };
      writeLocalToCloudMigrationState(
        authSession.user.id,
        selectedMeetingId,
        nextState,
      );
      setLocalWorkspaceMigrationState(nextState);
    },
    [authSession, localWorkspaceMigrationState, selectedMeetingId],
  );

  const handleSkipLocalWorkspaceMigration = useCallback(() => {
    if (!localWorkspaceMigrationSignature) return;

    recordLocalWorkspaceMigrationState({
      skippedSignature: localWorkspaceMigrationSignature,
    });
    setCloudMeetingMessage(
      "Cloud workspace unchanged. Local Workspace remains available in this browser.",
    );
  }, [localWorkspaceMigrationSignature, recordLocalWorkspaceMigrationState]);

  const handleContinueLocalWorkspace = useCallback(() => {
    setSelectedMeetingId("");
    setSelectedMeetingName("");
    setCloudMeetingMessage("");
  }, []);

  const handleMigrateLocalWorkspaceToCloud = useCallback(async () => {
    if (
      !authSession ||
      !selectedMeetingId ||
      !isCurrentCloudRouteWorkspace ||
      isMigratingLocalWorkspace
    )
      return;

    const localEntries = collectLocalWorkspaceStorage();
    if (!hasMeaningfulWorkspaceStorage(localEntries)) {
      setLocalWorkspaceMigrationSignature("");
      setCloudMeetingMessage(
        "No meaningful Local Workspace data was found to migrate.",
      );
      return;
    }

    const workspaceName = selectedMeetingName || "this cloud meeting";
    const warning = selectedMeetingHasData
      ? `This will overwrite the saved cloud data for ${workspaceName} with the current Local Workspace data.`
      : `This will save the current Local Workspace data into ${workspaceName}.`;
    const shouldMigrate = window.confirm(
      `${warning}\n\nExport a JSON backup first if you want an extra rollback copy. Local Workspace data will remain in this browser. Continue?`,
    );

    if (!shouldMigrate) {
      setCloudMeetingMessage(
        "Migration canceled. Cloud data was not changed.",
      );
      return;
    }

    setIsMigratingLocalWorkspace(true);
    setCloudSaveStatus("saving");
    setCloudMeetingMessage("Migrating Local Workspace data to cloud…");

    try {
      const backup = createWorkspaceBackup(localEntries);
      await supabaseMeetingClient.saveWorkspaceData({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        data: backup,
      });

      const signature = getWorkspaceStorageSignature(localEntries);
      storeWorkspaceBackupInBrowser(backup, selectedMeetingId);
      setActiveCloudWorkspaceId(selectedMeetingId);
      applyWorkspaceBackupToState(backup);
      setSelectedMeetingHasData(true);
      recordLocalWorkspaceMigrationState({
        migratedSignature: signature,
        skippedSignature: undefined,
      });
      setLocalWorkspaceMigrationSignature(signature);
      lastCloudAutosaveSignatureRef.current = signature;
      setCloudSaveStatus("saved");
      setCloudMeetingMessage(
        "Local Workspace data was saved to this Cloud Meeting. Local data remains available in this browser.",
      );
    } catch (error) {
      setCloudSaveStatus("error");
      setCloudMeetingMessage(
        error instanceof Error
          ? error.message
          : "Local Workspace data could not be migrated to cloud.",
      );
    } finally {
      setIsMigratingLocalWorkspace(false);
    }
  }, [
    applyWorkspaceBackupToState,
    authSession,
    isCurrentCloudRouteWorkspace,
    isMigratingLocalWorkspace,
    recordLocalWorkspaceMigrationState,
    selectedMeetingHasData,
    selectedMeetingId,
    selectedMeetingName,
    storeWorkspaceBackupInBrowser,
  ]);

  const handleLoadCloudMeeting = useCallback(async () => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
      setCloudSaveStatus(isLocalRoute ? "local" : "error");
      setCloudMeetingMessage(
        isLocalRoute
          ? "Local changes are stored only in this browser. To move them to cloud, export/import or create a cloud meeting."
          : "Open a valid Cloud Meeting route before loading cloud data.",
      );
      return;
    }

    setCloudSaveStatus("saving");
    setCloudMeetingMessage("Loading cloud meeting…");

    try {
      const cloudData = await supabaseMeetingClient.loadWorkspaceData({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
      });

      if (!cloudData) {
        setCloudSaveStatus("idle");
        setCloudMeetingMessage(
          "This cloud meeting has no saved data yet. Use Save current workspace to cloud when ready.",
        );
        setIsRouteCloudBootstrapping(false);
        return;
      }

      const backup = validateWorkspaceBackup(cloudData);
      const signature = getWorkspaceStorageSignature(backup.localStorage);
      storeWorkspaceBackupInBrowser(backup, selectedMeetingId);
      setActiveCloudWorkspaceId(selectedMeetingId);
      applyWorkspaceBackupToState(backup);
      lastCloudAutosaveSignatureRef.current = signature;
      setCloudSaveStatus("saved");
      setCloudMeetingMessage("Cloud workspace loaded.");
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
    applyWorkspaceBackupToState,
    authSession,
    isCurrentCloudRouteWorkspace,
    isLocalRoute,
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
        setCloudSaveStatus(isLocalRoute ? "local" : "error");
        setCloudMeetingMessage(
          isLocalRoute
            ? "Local changes are stored only in this browser. To move them to cloud, export/import or create a cloud meeting."
            : "Manual Save is available only from a valid Cloud Meeting route.",
        );
        return false;
      }

      const backup = createWorkspaceBackup(workspaceEntries);
      await supabaseMeetingClient.saveWorkspaceData({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        data: backup,
      });
      const signature = getWorkspaceStorageSignature(backup.localStorage);
      storeWorkspaceBackupInBrowser(backup, selectedMeetingId);
      setActiveCloudWorkspaceId(selectedMeetingId);
      setSelectedMeetingHasData(true);
      lastCloudAutosaveSignatureRef.current = signature;
      setCloudSaveStatus("saved");
      setCloudMeetingMessage(statusMessage);
      return true;
    },
    [
      authSession,
      isCurrentCloudRouteWorkspace,
      isLocalRoute,
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
      setSelectedTacticalSessionId((current) =>
        current || sessions[0]?.id || "",
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
      isEndingMeeting
    )
      return;

    const shouldEnd = window.confirm(
      "End this tactical meeting and create a historical snapshot? This will not reset the current operational workspace.",
    );
    if (!shouldEnd) return;

    setIsEndingMeeting(true);
    try {
      const workspaceEntries = getCurrentWorkspaceStorage();
      const created = await supabaseMeetingClient.endTacticalSession({
        accessToken: authSession.accessToken,
        workspaceId: selectedMeetingId,
        sessionDate: getTodayDate(),
        title: `Tactical Session ${getTodayDate()}`,
        snapshotJson: workspaceEntries,
      });
      setTacticalSessions((current) => [created, ...current]);
      setSelectedTacticalSessionId(created.id);
      setCloudMeetingMessage(
        "Tactical session history snapshot saved. Current meeting workspace remains active.",
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
    authSession,
    getCurrentWorkspaceStorage,
    isCurrentCloudRouteWorkspace,
    isEndingMeeting,
    selectedMeetingId,
  ]);

  const handleSaveCloudMeeting = useCallback(async () => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace) {
      setCloudSaveStatus(isLocalRoute ? "local" : "error");
      setCloudMeetingMessage(
        isLocalRoute
          ? "Local changes are stored only in this browser. To move them to cloud, export/import or create a cloud meeting."
          : "Manual Save is available only from a valid Cloud Meeting route.",
      );
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
    setCloudMeetingMessage("Saving cloud meeting…");

    try {
      const workspaceEntries = getCurrentWorkspaceStorage();
      const wasSaved = await saveWorkspaceBackupToCloud(
        workspaceEntries,
        "Saved to cloud.",
      );
      if (wasSaved) {
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
    getCurrentWorkspaceStorage,
    isCurrentCloudRouteWorkspace,
    isLocalRoute,
    saveWorkspaceBackupToCloud,
    selectedMeetingId,
    selectedMeetingName,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (workspaceMode === "local") {
        lastCloudAutosaveSignatureRef.current = "";
        setCloudSaveStatus("local");
        setCloudMeetingMessage(
          authSession
            ? "Local changes are stored only in this browser. To move them to cloud, export/import or create a cloud meeting."
            : "",
        );
        setActiveCloudWorkspaceId("");
        return;
      }

      setCloudSaveStatus("idle");
      setCloudMeetingMessage(
        "Cloud workspace selected. Load cloud data when needed.",
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authSession, selectedMeetingId, workspaceMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTacticalSessions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTacticalSessions]);

  useEffect(() => {
    if (workspaceMode !== "cloud") return;
    if (!selectedMeetingId) return;
    if (!activeCloudWorkspaceId || activeCloudWorkspaceId !== selectedMeetingId)
      return;
    if (isRouteCloudBootstrapping) return;

    const timeoutId = window.setTimeout(() => {
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeCloudWorkspaceId,
    isRouteCloudBootstrapping,
    selectedMeetingId,
    workspaceMode,
  ]);

  const handleExportWorkspaceBackup = () => {
    try {
      const backup = createWorkspaceBackup(getCurrentWorkspaceStorage());
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

  const handleImportWorkspaceBackup = async (file: File) => {
    try {
      const fileText = await file.text();
      const parsedBackup = JSON.parse(fileText) as unknown;
      const backup = validateWorkspaceBackup(parsedBackup);
      const shouldReplace = window.confirm(
        "Importing this backup will replace the current Meeting Tool data stored in this browser. Continue?",
      );

      if (!shouldReplace) {
        setBackupFeedback({
          type: "error",
          message: "Import canceled. Current workspace data was not changed.",
        });
        return;
      }

      storeWorkspaceBackupInBrowser(backup, activeCloudWorkspaceId);
      applyWorkspaceBackupToState(backup);
      setHasCompletedMeetingSetup(true);
      setCloudSaveStatus(workspaceMode === "cloud" ? "idle" : "local");
      setCloudMeetingMessage(
        workspaceMode === "cloud"
          ? "Backup imported into the current view. Click Save current workspace to cloud when ready."
          : "",
      );
      setBackupFeedback({
        type: "success",
        message:
          workspaceMode === "cloud"
            ? "Workspace backup imported into the selected Cloud Meeting view. Cloud data was not saved."
            : "Workspace backup imported successfully.",
      });
    } catch (error) {
      setBackupFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to import workspace backup.",
      });
    }
  };

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
  const selectedTacticalSession =
    tacticalSessions.find((session) => session.id === selectedTacticalSessionId) ??
    null;

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
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-5xl font-bold text-slate-900">
              {dashboardTitle}
            </h1>
          </div>

          <div className="flex flex-col gap-3 self-start sm:flex-row sm:items-start">
            {isLocalRoute ? (
              <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm sm:w-96">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Local Workspace
                </p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">
                    This browser only
                  </p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {cloudSaveStatusLabel[cloudSaveStatus]}
                  </span>
                </div>
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  Local changes are stored only in this browser. To move them to cloud, export/import or create a cloud meeting.
                </p>
                {authSession ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Link
                      href="/dashboard"
                      className="rounded-xl bg-blue-600 px-3 py-2 text-center font-semibold text-white hover:bg-blue-700"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowBackupRestore(true)}
                      className="rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Export / Import
                    </button>
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm sm:w-96">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Cloud Meeting
                </p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">
                    {selectedMeetingName || "Selected from route"}
                  </p>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {cloudSaveStatusLabel[cloudSaveStatus]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{cloudMeetingMessage}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleLoadCloudMeeting}
                    className="rounded-xl border border-blue-200 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCloudMeeting}
                    className="rounded-xl bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleEndMeeting}
                  disabled={isEndingMeeting}
                  className="mt-2 w-full rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEndingMeeting ? "Ending Meeting…" : "End Meeting"}
                </button>
              </section>
            )}

            {isLocalRoute && shouldShowLocalToCloudMigrationPrompt ? (
              <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm sm:w-96">
                <p className="font-semibold text-amber-950">
                  Local Workspace data is available to migrate.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-amber-900">
                  You selected{" "}
                  {selectedMeetingName || "a Cloud Meeting"}. Migration
                  is optional and will not happen automatically. Export a JSON
                  backup first if you want an extra rollback copy.
                </p>
                {selectedMeetingHasData ? (
                  <p className="mt-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700">
                    This will overwrite the saved cloud data for{" "}
                    {selectedMeetingName || "this workspace"} with the
                    current Local Workspace data.
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={handleMigrateLocalWorkspaceToCloud}
                    disabled={
                      isMigratingLocalWorkspace || isCheckingCloudWorkspaceData
                    }
                    className="rounded-xl bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isMigratingLocalWorkspace
                      ? "Migrating…"
                      : "Save Local Workspace into Cloud Meeting"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipLocalWorkspaceMigration}
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Keep existing Cloud Meeting unchanged
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueLocalWorkspace}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Continue using Local Workspace
                  </button>
                </div>
              </section>
            ) : null}

            {isAuthLoading ? (
              <div className="flex h-14 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-500 shadow-sm">
                Checking account…
              </div>
            ) : authSession ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                <span className="max-w-56 truncate font-semibold text-slate-700">
                  {authSession.user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSignOutAndExit()}
                  disabled={isSigningOut}
                  className="self-start font-semibold text-blue-600 hover:text-blue-800"
                >
                  {isSigningOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="h-14 rounded-full border border-blue-200 bg-white px-5 font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Sign In
              </button>
            )}

            <div ref={settingsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowSettingsMenu((isOpen) => !isOpen)}
                className="flex h-14 items-center gap-2 rounded-full bg-blue-600 px-5 font-semibold text-white shadow-lg hover:bg-blue-700"
                aria-expanded={showSettingsMenu}
                aria-haspopup="menu"
                aria-label="Open meeting menu"
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  ☰
                </span>
                Menu
              </button>

              {showSettingsMenu ? (
                <div
                  className="absolute right-0 z-40 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl"
                  role="menu"
                  aria-label="Meeting menu"
                >
                  {!isLocalRoute ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setShowSettingsMenu(false)}
                      className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                      role="menuitem"
                    >
                      Dashboard
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(true);
                      setShowSettingsMenu(false);
                    }}
                    className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                    role="menuitem"
                  >
                    {authSession ? "Account" : "Sign In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlaybookDefinitions(true);
                      setShowSettingsMenu(false);
                    }}
                    className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                    role="menuitem"
                  >
                    Edit Playbook
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBackupRestore(true);
                      setShowSettingsMenu(false);
                    }}
                    className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                    role="menuitem"
                  >
                    Backup / Restore
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {workspaceMode === "cloud" && selectedMeetingId ? (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Tactical History
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Archived tactical sessions are stored as historical snapshots.
            </p>
            {isLoadingTacticalSessions ? (
              <p className="mt-3 text-sm text-slate-500">Loading sessions…</p>
            ) : tacticalSessions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No tactical history yet. Use End Meeting to capture the first
                session snapshot.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  {tacticalSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedTacticalSessionId(session.id)}
                      className={`w-full rounded-xl border p-3 text-left ${
                        session.id === selectedTacticalSessionId
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">
                        {session.title || `Tactical Session ${session.session_date}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Date: {session.session_date} · Created:{" "}
                        {new Date(session.created_at).toLocaleString()} · Ended:{" "}
                        {session.ended_at
                          ? new Date(session.ended_at).toLocaleString()
                          : "N/A"}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {selectedTacticalSession ? (
                    <>
                      <p className="text-sm font-semibold text-slate-900">
                        Session Snapshot
                      </p>
                      <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-700">
                        {JSON.stringify(
                          selectedTacticalSession.snapshot_json ?? {},
                          null,
                          2,
                        )}
                      </pre>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Select a tactical session to view its snapshot.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
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
              onClick={addObjective}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold leading-none text-white shadow-sm hover:bg-blue-700"
              aria-label="Add defining objective"
            >
              +
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {objectives.map((objective) => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
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

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
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
                className={`flex min-w-0 cursor-grab items-center gap-3 rounded-2xl border border-l-8 border-blue-100 bg-blue-50/70 p-3 text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-100/80 active:cursor-grabbing ${objectiveColorClasses[getStandardObjectiveColor(item)]} ${draggingStandardObjectiveId === item.id ? "opacity-60 ring-2 ring-blue-200" : ""}`}
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
                  <span className="block truncate">{item.title}</span>
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

        <div className="mt-10 mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                Meeting Notes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use the arrows to review archived meetings, or start a new blank
                meeting to archive this one.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Current meeting date
                <input
                  type="date"
                  value={activeMeeting.date}
                  onChange={(e) =>
                    updateActiveMeeting({ date: e.target.value })
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateMeeting("previous")}
                  disabled={!canNavigateToPreviousMeeting}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="View previous meeting"
                >
                  ←
                </button>
                <span className="min-w-24 text-center text-sm font-medium text-slate-600">
                  {meetings.length === 0
                    ? "0 of 0"
                    : `${activeMeetingIndex + 1} of ${meetings.length}`}
                </span>
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

              <button
                type="button"
                onClick={createNewMeeting}
                className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                + New Blank Meeting
              </button>

              <button
                type="button"
                onClick={deleteCurrentMeeting}
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100"
              >
                Delete Current Meeting
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {meetingSectionOrder.map((sectionKey) => (
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

      <FeedbackWidget
        session={authSession}
        onCollectWorkspaceSnapshot={getCurrentWorkspaceStorage}
      />

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
        onSignOut={async () => {
          await handleSignOutAndExit();
        }}
      />

      {selectedStandardObjectiveId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={() => setHistoryNotesTopic(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Strategic Topic Notes
              </h3>
              <button
                type="button"
                onClick={() => setHistoryNotesTopic(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <p className="mb-2 text-sm text-slate-600">{historyNotesTopic.text}</p>
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
                Last saved: {new Date(strategicTopicNotesById[historyNotesTopic.id]!.updated_at).toLocaleString()}
              </p>
            ) : null}
            {historyNotesStatus ? (
              <p className="mt-2 text-sm text-slate-700">{historyNotesStatus}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHistoryNotesTopic(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
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
        onImportWorkspaceBackup={handleImportWorkspaceBackup}
        backupFeedback={backupFeedback}
      />
    </main>
  );
}
