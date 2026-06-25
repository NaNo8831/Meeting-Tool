"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  supabaseMeetingClient,
  type SupabaseMeetingNoteUpsert,
  type SupabaseMeetingSettingsUpsert,
  type SupabaseAgendaItemUpsert,
  type SupabaseObjectiveUpsert,
  type SupabaseStandardOperatingObjectiveUpsert,
  type SupabaseStrategicTopicUpsert,
  type SupabaseStrategicTopic,
  type SupabaseTaskUpsert,
} from "@/app/lib/supabaseClient";
import { getWorkspaceStorageSignature } from "@/app/lib/workspaceBackup";
import type { MeetingItem, MeetingRecord } from "@/app/types/dashboard";

// --- autosave status types (mirrored from MeetingWorkspace) ---

type SettingsAutosaveStatus = "ready" | "pending" | "saving" | "saved" | "error";
type StrategicTopicsAutosaveStatus = "ready" | "pending" | "saving" | "saved" | "error";
type MeetingNotesAutosaveStatus = "ready" | "pending" | "saving" | "saved" | "error";
type AgendaItemsAutosaveStatus = "ready" | "pending" | "saving" | "saved" | "error";
type ObjectivesAutosaveStatus = "ready" | "pending" | "saving" | "saved" | "error";

// --- auth session shape (minimal, same as used in MeetingWorkspace) ---

interface AuthSession {
  accessToken: string;
}

// --- hook params ---

export interface UseWorkspacePersistenceParams {
  // identity / guards
  authSession: AuthSession | null;
  selectedMeetingId: string;
  workspaceMode: "cloud";
  activeCloudWorkspaceId: string;
  isCurrentCloudRouteWorkspace: boolean;
  isRouteCloudBootstrapping: boolean;
  hasLoadedDashboardStorage: boolean;

  // payloads to autosave (pre-computed by parent memos)
  meetingSettingsAutosavePayload: SupabaseMeetingSettingsUpsert;
  strategicTopicsAutosavePayload: SupabaseStrategicTopicUpsert[];
  meetingNotesAutosavePayload: SupabaseMeetingNoteUpsert[];
  agendaItemsAutosavePayload: SupabaseAgendaItemUpsert[];
  objectivesAutosavePayload: {
    objectiveRows: SupabaseObjectiveUpsert[];
    taskRows: SupabaseTaskUpsert[];
    sooRows: SupabaseStandardOperatingObjectiveUpsert[];
  };

  // workspace snapshot for unsaved-changes check
  getCurrentWorkspaceStorage: () => Record<string, unknown>;

  // Getter for the last cloud-autosave signature (owned by parent, written on
  // manual save success; hook reads it to decide if unsaved changes exist).
  getLastCloudAutosaveSignature: () => string;

  // Ref set synchronously when sign-out begins; guards catch blocks so a 401
  // from an in-flight autosave during sign-out does not surface as an error.
  isSigningOutRef: React.RefObject<boolean>;

  // setters for state that lives in the parent
  setSettingsAutosaveStatus: (status: SettingsAutosaveStatus) => void;
  setStrategicTopicsAutosaveStatus: (status: StrategicTopicsAutosaveStatus) => void;
  setMeetingNotesAutosaveStatus: (status: MeetingNotesAutosaveStatus) => void;
  setAgendaItemsAutosaveStatus: (status: AgendaItemsAutosaveStatus) => void;
  setObjectivesAutosaveStatus: (status: ObjectivesAutosaveStatus) => void;
  setCloudMeetingMessage: (msg: string) => void;
  setHasUnsavedFullWorkspaceChanges: (has: boolean) => void;

  // side-effect callbacks triggered by strategic-topics save success
  setStrategicTopicItems: (
    updater: (currentItems: MeetingItem[]) => MeetingItem[],
  ) => void;
  setMeetings: (
    updater: (currentMeetings: MeetingRecord[]) => MeetingRecord[],
  ) => void;
}

// ---------------------------------------------------------------------------

const strategicTopicsAutosaveDebounceMs = 1200;
const meetingNotesAutosaveDebounceMs = 1000;
const agendaItemsAutosaveDebounceMs = 1000;
const objectivesAutosaveDebounceMs = 1200;
const meetingSettingsAutosaveDebounceMs = 1200;

// Helper kept here because it is only needed by this hook.

function mergeSavedStrategicTopicIds(
  currentItems: MeetingItem[],
  savedTopics: SupabaseStrategicTopic[],
): MeetingItem[] {
  const idsByClientId = new Map(
    savedTopics.map((t) => [String(t.client_item_id), t.id]),
  );
  return currentItems.map((item) => {
    const cloudId = idsByClientId.get(String(item.id));
    return cloudId ? { ...item, strategicTopicId: cloudId } : item;
  });
}

// ---------------------------------------------------------------------------

export function useWorkspacePersistence(
  params: UseWorkspacePersistenceParams,
): void {
  const {
    authSession,
    selectedMeetingId,
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
    getLastCloudAutosaveSignature,
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
  } = params;

  // --- autosave refs (owned exclusively by this hook) ---

  const lastMeetingSettingsAutosaveSignatureRef = useRef("");
  const meetingSettingsAutosaveWorkspaceIdRef = useRef("");
  const pendingMeetingSettingsAutosaveSignatureRef = useRef("");
  const isMeetingSettingsAutosaveInFlightRef = useRef(false);

  const lastStrategicTopicsAutosaveSignatureRef = useRef("");
  const strategicTopicsAutosaveWorkspaceIdRef = useRef("");
  const pendingStrategicTopicsAutosaveSignatureRef = useRef("");
  const isStrategicTopicsAutosaveInFlightRef = useRef(false);

  const lastMeetingNotesAutosaveSignatureRef = useRef("");
  const meetingNotesAutosaveWorkspaceIdRef = useRef("");
  const pendingMeetingNotesAutosaveSignatureRef = useRef("");
  const isMeetingNotesAutosaveInFlightRef = useRef(false);

  const lastAgendaItemsAutosaveSignatureRef = useRef("");
  const pendingAgendaItemsAutosaveSignatureRef = useRef("");
  const agendaItemsAutosaveWorkspaceIdRef = useRef("");
  const isAgendaItemsAutosaveInFlightRef = useRef(false);

  const lastObjectivesAutosaveSignatureRef = useRef("");
  const objectivesAutosaveWorkspaceIdRef = useRef("");
  const pendingObjectivesAutosaveSignatureRef = useRef("");
  const isObjectivesAutosaveInFlightRef = useRef(false);

  // --- payload signatures (computed here so effects have stable deps) ---

  const meetingSettingsAutosaveSignature = useMemo(
    () => JSON.stringify(meetingSettingsAutosavePayload),
    [meetingSettingsAutosavePayload],
  );

  const strategicTopicsAutosaveSignature = useMemo(
    () => JSON.stringify(strategicTopicsAutosavePayload),
    [strategicTopicsAutosavePayload],
  );

  const meetingNotesAutosaveSignature = useMemo(
    () => JSON.stringify(meetingNotesAutosavePayload),
    [meetingNotesAutosavePayload],
  );

  const agendaItemsAutosaveSignature = useMemo(
    () => JSON.stringify(agendaItemsAutosavePayload),
    [agendaItemsAutosavePayload],
  );

  const objectivesAutosaveSignature = useMemo(
    () => JSON.stringify(objectivesAutosavePayload),
    [objectivesAutosavePayload],
  );

  // ---------------------------------------------------------------------------
  // Workspace-mode reset — clears all hook-owned autosave state when mode changes.
  // Note: lastCloudAutosaveSignatureRef, topicNotesAutosaveKeyRef, and
  // lastTopicNotesAutosaveSignatureRef are owned by the parent and reset there.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSettingsAutosaveStatus("ready");
      setStrategicTopicsAutosaveStatus("ready");
      setMeetingNotesAutosaveStatus("ready");
      setAgendaItemsAutosaveStatus("ready");
      setObjectivesAutosaveStatus("ready");
      setCloudMeetingMessage(
        "Cloud workspace selected. Load cloud data when needed.",
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    authSession,
    selectedMeetingId,
    setSettingsAutosaveStatus,
    setStrategicTopicsAutosaveStatus,
    setMeetingNotesAutosaveStatus,
    setAgendaItemsAutosaveStatus,
    setObjectivesAutosaveStatus,
    setCloudMeetingMessage,
  ]);

  // ---------------------------------------------------------------------------
  // Meeting Settings autosave
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace)
      return;
    if (!activeCloudWorkspaceId || activeCloudWorkspaceId !== selectedMeetingId)
      return;
    if (isRouteCloudBootstrapping || !hasLoadedDashboardStorage) return;

    if (meetingSettingsAutosaveWorkspaceIdRef.current !== selectedMeetingId) {
      meetingSettingsAutosaveWorkspaceIdRef.current = selectedMeetingId;
      lastMeetingSettingsAutosaveSignatureRef.current =
        meetingSettingsAutosaveSignature;
      pendingMeetingSettingsAutosaveSignatureRef.current = "";
      return;
    }

    if (
      meetingSettingsAutosaveSignature ===
      lastMeetingSettingsAutosaveSignatureRef.current
    ) {
      if (pendingMeetingSettingsAutosaveSignatureRef.current) {
        pendingMeetingSettingsAutosaveSignatureRef.current = "";
        setSettingsAutosaveStatus("saved");
        setCloudMeetingMessage("Meeting settings match the saved cloud version.");
      }
      return;
    }

    pendingMeetingSettingsAutosaveSignatureRef.current =
      meetingSettingsAutosaveSignature;
    setSettingsAutosaveStatus("pending");
    setCloudMeetingMessage("Settings autosave pending… Manual Save still backs up the full workspace.");

    let isCancelled = false;
    let timeoutId: number;
    const flushPendingSettings = async () => {
      if (isCancelled) return;
      if (isMeetingSettingsAutosaveInFlightRef.current) {
        timeoutId = window.setTimeout(
          flushPendingSettings,
          meetingSettingsAutosaveDebounceMs,
        );
        return;
      }

      const pendingSignature =
        pendingMeetingSettingsAutosaveSignatureRef.current;
      if (
        !pendingSignature ||
        pendingSignature === lastMeetingSettingsAutosaveSignatureRef.current
      )
        return;

      isMeetingSettingsAutosaveInFlightRef.current = true;
      pendingMeetingSettingsAutosaveSignatureRef.current = "";
      setSettingsAutosaveStatus("saving");
      setCloudMeetingMessage("Saving meeting settings to cloud…");

      try {
        await supabaseMeetingClient.saveMeetingSettings({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          settings: JSON.parse(pendingSignature) as SupabaseMeetingSettingsUpsert,
        });
        lastMeetingSettingsAutosaveSignatureRef.current = pendingSignature;

        if (
          !isCancelled &&
          !pendingMeetingSettingsAutosaveSignatureRef.current
        ) {
          setSettingsAutosaveStatus("saved");
          setCloudMeetingMessage(
            "Meeting settings saved to cloud. Manual Save still backs up the full workspace.",
          );
        }
      } catch (error) {
        if (!isCancelled && !isSigningOutRef.current) {
          setSettingsAutosaveStatus("error");
          setCloudMeetingMessage(
            error instanceof Error
              ? error.message
              : "Meeting settings could not be saved to cloud.",
          );
        }
      } finally {
        isMeetingSettingsAutosaveInFlightRef.current = false;
        if (
          !isCancelled &&
          pendingMeetingSettingsAutosaveSignatureRef.current
        ) {
          timeoutId = window.setTimeout(
            flushPendingSettings,
            meetingSettingsAutosaveDebounceMs,
          );
        }
      }
    };

    timeoutId = window.setTimeout(
      flushPendingSettings,
      meetingSettingsAutosaveDebounceMs,
    );

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSigningOutRef is a stable ref; live-read via .current, intentionally omitted
  }, [
    activeCloudWorkspaceId,
    authSession,
    hasLoadedDashboardStorage,
    isCurrentCloudRouteWorkspace,
    isRouteCloudBootstrapping,
    meetingSettingsAutosaveSignature,
    selectedMeetingId,
    setSettingsAutosaveStatus,
    setCloudMeetingMessage,
  ]);

  // ---------------------------------------------------------------------------
  // Strategic Topics autosave
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace)
      return;
    if (!activeCloudWorkspaceId || activeCloudWorkspaceId !== selectedMeetingId)
      return;
    if (isRouteCloudBootstrapping || !hasLoadedDashboardStorage) return;

    if (strategicTopicsAutosaveWorkspaceIdRef.current !== selectedMeetingId) {
      strategicTopicsAutosaveWorkspaceIdRef.current = selectedMeetingId;
      lastStrategicTopicsAutosaveSignatureRef.current =
        strategicTopicsAutosaveSignature;
      pendingStrategicTopicsAutosaveSignatureRef.current = "";
      return;
    }

    if (
      strategicTopicsAutosaveSignature ===
      lastStrategicTopicsAutosaveSignatureRef.current
    ) {
      if (pendingStrategicTopicsAutosaveSignatureRef.current) {
        pendingStrategicTopicsAutosaveSignatureRef.current = "";
        setStrategicTopicsAutosaveStatus("saved");
        setCloudMeetingMessage("Strategic Topics match the saved cloud version.");
      }
      return;
    }

    pendingStrategicTopicsAutosaveSignatureRef.current =
      strategicTopicsAutosaveSignature;
    setStrategicTopicsAutosaveStatus("pending");
    setCloudMeetingMessage(
      "Strategic Topics autosave pending… Manual Save still backs up the full workspace.",
    );

    let isCancelled = false;
    let timeoutId: number;
    const flushPendingTopics = async () => {
      if (isCancelled) return;
      if (isStrategicTopicsAutosaveInFlightRef.current) {
        timeoutId = window.setTimeout(
          flushPendingTopics,
          strategicTopicsAutosaveDebounceMs,
        );
        return;
      }

      const pendingSignature =
        pendingStrategicTopicsAutosaveSignatureRef.current;
      if (
        !pendingSignature ||
        pendingSignature === lastStrategicTopicsAutosaveSignatureRef.current
      )
        return;

      const pendingTopics = JSON.parse(
        pendingSignature,
      ) as SupabaseStrategicTopicUpsert[];

      isStrategicTopicsAutosaveInFlightRef.current = true;
      pendingStrategicTopicsAutosaveSignatureRef.current = "";
      setStrategicTopicsAutosaveStatus("saving");
      setCloudMeetingMessage("Saving Strategic Topics to cloud…");

      try {
        const savedTopics = await supabaseMeetingClient.saveStrategicTopics({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          topics: pendingTopics,
        });
        await supabaseMeetingClient.deleteMissingStrategicTopics({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          retainedClientItemIds: pendingTopics.map((topic) => topic.client_item_id),
        });
        lastStrategicTopicsAutosaveSignatureRef.current = pendingSignature;

        const savedTopicIdsByClientId = new Map(
          savedTopics.map((topic) => [String(topic.client_item_id), topic.id]),
        );
        const validTopicUuids = new Set(savedTopics.map((topic) => topic.id));

        if (savedTopics.length > 0) {
          setStrategicTopicItems((currentItems) =>
            mergeSavedStrategicTopicIds(currentItems, savedTopics),
          );
        }

        // Always run: resolve numeric client IDs to UUIDs, and clear any
        // promotedStrategicTopicId that references a topic deleted from Supabase.
        setMeetings((currentMeetings) =>
          currentMeetings.map((meeting) => ({
            ...meeting,
            agendaItems: meeting.agendaItems.map((agendaItem) => {
              if (!agendaItem.promotedStrategicTopicId) return agendaItem;
              const resolvedId = savedTopicIdsByClientId.get(
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
          })),
        );

        if (
          !isCancelled &&
          !pendingStrategicTopicsAutosaveSignatureRef.current
        ) {
          setStrategicTopicsAutosaveStatus("saved");
          setCloudMeetingMessage(
            "Strategic Topics saved to cloud. Manual Save still backs up the full workspace.",
          );
        }
      } catch (error) {
        if (!isCancelled && !isSigningOutRef.current) {
          setStrategicTopicsAutosaveStatus("error");
          setCloudMeetingMessage(
            error instanceof Error
              ? error.message
              : "Strategic Topics could not be saved to cloud.",
          );
        }
      } finally {
        isStrategicTopicsAutosaveInFlightRef.current = false;
        if (
          !isCancelled &&
          pendingStrategicTopicsAutosaveSignatureRef.current
        ) {
          timeoutId = window.setTimeout(
            flushPendingTopics,
            strategicTopicsAutosaveDebounceMs,
          );
        }
      }
    };

    timeoutId = window.setTimeout(
      flushPendingTopics,
      strategicTopicsAutosaveDebounceMs,
    );

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSigningOutRef is a stable ref; live-read via .current, intentionally omitted
  }, [
    activeCloudWorkspaceId,
    authSession,
    hasLoadedDashboardStorage,
    isCurrentCloudRouteWorkspace,
    isRouteCloudBootstrapping,
    selectedMeetingId,
    setMeetings,
    setStrategicTopicItems,
    strategicTopicsAutosaveSignature,
    setStrategicTopicsAutosaveStatus,
    setCloudMeetingMessage,
  ]);

  // ---------------------------------------------------------------------------
  // Meeting Notes autosave
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace)
      return;
    if (!activeCloudWorkspaceId || activeCloudWorkspaceId !== selectedMeetingId)
      return;
    if (isRouteCloudBootstrapping || !hasLoadedDashboardStorage) return;

    if (meetingNotesAutosaveWorkspaceIdRef.current !== selectedMeetingId) {
      meetingNotesAutosaveWorkspaceIdRef.current = selectedMeetingId;
      lastMeetingNotesAutosaveSignatureRef.current =
        meetingNotesAutosaveSignature;
      pendingMeetingNotesAutosaveSignatureRef.current = "";
      return;
    }

    if (
      meetingNotesAutosaveSignature ===
      lastMeetingNotesAutosaveSignatureRef.current
    ) {
      if (pendingMeetingNotesAutosaveSignatureRef.current) {
        pendingMeetingNotesAutosaveSignatureRef.current = "";
        setMeetingNotesAutosaveStatus("saved");
        setCloudMeetingMessage(
          "Meeting Notes and Cascading Communications match the saved cloud version.",
        );
      }
      return;
    }

    pendingMeetingNotesAutosaveSignatureRef.current =
      meetingNotesAutosaveSignature;
    setMeetingNotesAutosaveStatus("pending");
    setCloudMeetingMessage(
      "Meeting Notes autosave pending… Manual Save still backs up the full workspace.",
    );

    let isCancelled = false;
    let timeoutId: number;
    const flushPendingMeetingNotes = async () => {
      if (isCancelled) return;
      if (isMeetingNotesAutosaveInFlightRef.current) {
        timeoutId = window.setTimeout(
          flushPendingMeetingNotes,
          meetingNotesAutosaveDebounceMs,
        );
        return;
      }

      const pendingSignature = pendingMeetingNotesAutosaveSignatureRef.current;
      if (
        !pendingSignature ||
        pendingSignature === lastMeetingNotesAutosaveSignatureRef.current
      )
        return;

      const pendingNotes = JSON.parse(
        pendingSignature,
      ) as SupabaseMeetingNoteUpsert[];

      isMeetingNotesAutosaveInFlightRef.current = true;
      pendingMeetingNotesAutosaveSignatureRef.current = "";
      setMeetingNotesAutosaveStatus("saving");
      setCloudMeetingMessage("Saving Meeting Notes to cloud…");

      try {
        await supabaseMeetingClient.saveMeetingNotes({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          notes: pendingNotes,
        });
        await supabaseMeetingClient.deleteMissingMeetingNotes({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          retainedClientMeetingIds: pendingNotes.map(
            (note) => note.client_meeting_id,
          ),
        });
        lastMeetingNotesAutosaveSignatureRef.current = pendingSignature;

        if (!isCancelled && !pendingMeetingNotesAutosaveSignatureRef.current) {
          setMeetingNotesAutosaveStatus("saved");
          setCloudMeetingMessage(
            "Meeting Notes and Cascading Communications saved to cloud. Manual Save still backs up the full workspace.",
          );
        }
      } catch (error) {
        if (!isCancelled && !isSigningOutRef.current) {
          setMeetingNotesAutosaveStatus("error");
          setCloudMeetingMessage(
            error instanceof Error
              ? error.message
              : "Meeting Notes could not be saved to cloud.",
          );
        }
      } finally {
        isMeetingNotesAutosaveInFlightRef.current = false;
        if (!isCancelled && pendingMeetingNotesAutosaveSignatureRef.current) {
          timeoutId = window.setTimeout(
            flushPendingMeetingNotes,
            meetingNotesAutosaveDebounceMs,
          );
        }
      }
    };

    timeoutId = window.setTimeout(
      flushPendingMeetingNotes,
      meetingNotesAutosaveDebounceMs,
    );

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSigningOutRef is a stable ref; live-read via .current, intentionally omitted
  }, [
    activeCloudWorkspaceId,
    authSession,
    hasLoadedDashboardStorage,
    isCurrentCloudRouteWorkspace,
    isRouteCloudBootstrapping,
    meetingNotesAutosaveSignature,
    selectedMeetingId,
    setMeetingNotesAutosaveStatus,
    setCloudMeetingMessage,
  ]);

  // ---------------------------------------------------------------------------
  // Agenda Items autosave
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace)
      return;
    if (!activeCloudWorkspaceId || activeCloudWorkspaceId !== selectedMeetingId)
      return;
    if (isRouteCloudBootstrapping || !hasLoadedDashboardStorage) return;

    if (agendaItemsAutosaveWorkspaceIdRef.current !== selectedMeetingId) {
      agendaItemsAutosaveWorkspaceIdRef.current = selectedMeetingId;
      lastAgendaItemsAutosaveSignatureRef.current = agendaItemsAutosaveSignature;
      pendingAgendaItemsAutosaveSignatureRef.current = "";
      return;
    }

    if (
      agendaItemsAutosaveSignature ===
      lastAgendaItemsAutosaveSignatureRef.current
    ) {
      if (pendingAgendaItemsAutosaveSignatureRef.current) {
        pendingAgendaItemsAutosaveSignatureRef.current = "";
        setAgendaItemsAutosaveStatus("saved");
        setCloudMeetingMessage("Agenda Items match the saved cloud version.");
      }
      return;
    }

    pendingAgendaItemsAutosaveSignatureRef.current = agendaItemsAutosaveSignature;
    setAgendaItemsAutosaveStatus("pending");
    setCloudMeetingMessage(
      "Agenda Items autosave pending… Manual Save still backs up the full workspace.",
    );

    let isCancelled = false;
    let timeoutId: number;
    const flushPendingAgendaItems = async () => {
      if (isCancelled) return;
      if (isAgendaItemsAutosaveInFlightRef.current) {
        timeoutId = window.setTimeout(
          flushPendingAgendaItems,
          agendaItemsAutosaveDebounceMs,
        );
        return;
      }

      const pendingSignature = pendingAgendaItemsAutosaveSignatureRef.current;
      if (
        !pendingSignature ||
        pendingSignature === lastAgendaItemsAutosaveSignatureRef.current
      )
        return;

      const pendingAgendaItems = JSON.parse(
        pendingSignature,
      ) as SupabaseAgendaItemUpsert[];

      isAgendaItemsAutosaveInFlightRef.current = true;
      pendingAgendaItemsAutosaveSignatureRef.current = "";
      setAgendaItemsAutosaveStatus("saving");
      setCloudMeetingMessage("Saving Agenda Items to cloud…");

      try {
        await supabaseMeetingClient.saveAgendaItems({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          agendaItems: pendingAgendaItems,
        });
        await supabaseMeetingClient.deleteMissingAgendaItems({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          retainedClientAgendaItemIds: pendingAgendaItems.map(
            (item) => item.client_agenda_item_id,
          ),
        });
        lastAgendaItemsAutosaveSignatureRef.current = pendingSignature;

        if (!isCancelled && !pendingAgendaItemsAutosaveSignatureRef.current) {
          setAgendaItemsAutosaveStatus("saved");
          setCloudMeetingMessage(
            "Agenda Items saved to cloud. Manual Save still backs up the full workspace.",
          );
        }
      } catch (error) {
        if (!isCancelled && !isSigningOutRef.current) {
          setAgendaItemsAutosaveStatus("error");
          setCloudMeetingMessage(
            error instanceof Error
              ? error.message
              : "Agenda Items could not be saved to cloud.",
          );
        }
      } finally {
        isAgendaItemsAutosaveInFlightRef.current = false;
        if (!isCancelled && pendingAgendaItemsAutosaveSignatureRef.current) {
          timeoutId = window.setTimeout(
            flushPendingAgendaItems,
            agendaItemsAutosaveDebounceMs,
          );
        }
      }
    };

    timeoutId = window.setTimeout(
      flushPendingAgendaItems,
      agendaItemsAutosaveDebounceMs,
    );

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSigningOutRef is a stable ref; live-read via .current, intentionally omitted
  }, [
    activeCloudWorkspaceId,
    agendaItemsAutosaveSignature,
    authSession,
    hasLoadedDashboardStorage,
    isCurrentCloudRouteWorkspace,
    isRouteCloudBootstrapping,
    selectedMeetingId,
    setAgendaItemsAutosaveStatus,
    setCloudMeetingMessage,
  ]);

  // ---------------------------------------------------------------------------
  // Objectives / Tasks / SOOs autosave
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authSession || !selectedMeetingId || !isCurrentCloudRouteWorkspace)
      return;
    if (!activeCloudWorkspaceId || activeCloudWorkspaceId !== selectedMeetingId)
      return;
    if (isRouteCloudBootstrapping || !hasLoadedDashboardStorage) return;

    if (objectivesAutosaveWorkspaceIdRef.current !== selectedMeetingId) {
      objectivesAutosaveWorkspaceIdRef.current = selectedMeetingId;
      lastObjectivesAutosaveSignatureRef.current = objectivesAutosaveSignature;
      pendingObjectivesAutosaveSignatureRef.current = "";
      return;
    }

    if (objectivesAutosaveSignature === lastObjectivesAutosaveSignatureRef.current) {
      if (pendingObjectivesAutosaveSignatureRef.current) {
        pendingObjectivesAutosaveSignatureRef.current = "";
        setObjectivesAutosaveStatus("saved");
        setCloudMeetingMessage(
          "Objectives, Tasks, and SOOs match the saved cloud version.",
        );
      }
      return;
    }

    pendingObjectivesAutosaveSignatureRef.current = objectivesAutosaveSignature;
    setObjectivesAutosaveStatus("pending");
    setCloudMeetingMessage(
      "Objectives, Tasks, and SOOs autosave pending… Manual Save still backs up the full workspace.",
    );

    let isCancelled = false;
    let timeoutId: number;
    const flushPendingObjectives = async () => {
      if (isCancelled) return;
      if (isObjectivesAutosaveInFlightRef.current) {
        timeoutId = window.setTimeout(
          flushPendingObjectives,
          objectivesAutosaveDebounceMs,
        );
        return;
      }

      const pendingSignature = pendingObjectivesAutosaveSignatureRef.current;
      if (
        !pendingSignature ||
        pendingSignature === lastObjectivesAutosaveSignatureRef.current
      )
        return;

      const pendingPayload = JSON.parse(pendingSignature) as {
        objectiveRows: SupabaseObjectiveUpsert[];
        taskRows: SupabaseTaskUpsert[];
        sooRows: SupabaseStandardOperatingObjectiveUpsert[];
      };

      isObjectivesAutosaveInFlightRef.current = true;
      pendingObjectivesAutosaveSignatureRef.current = "";
      setObjectivesAutosaveStatus("saving");
      setCloudMeetingMessage("Saving Objectives, Tasks, and SOOs to cloud…");

      try {
        const savedObjectives = await supabaseMeetingClient.saveObjectives({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          objectives: pendingPayload.objectiveRows,
        });
        const objectiveUuidByClientId = new Map(
          savedObjectives.map((objective) => [
            objective.client_objective_id,
            objective.id,
          ]),
        );
        await supabaseMeetingClient.saveTasks({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          tasks: pendingPayload.taskRows.map((task) => ({
            ...task,
            objective_id:
              objectiveUuidByClientId.get(task.client_objective_id) ?? null,
          })),
        });
        await supabaseMeetingClient.deleteMissingTasks({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          retainedClientTaskIds: pendingPayload.taskRows.map(
            (task) => task.client_task_id,
          ),
        });
        await supabaseMeetingClient.deleteMissingObjectives({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          retainedClientObjectiveIds: pendingPayload.objectiveRows.map(
            (objective) => objective.client_objective_id,
          ),
        });
        await supabaseMeetingClient.saveStandardOperatingObjectives({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          standardOperatingObjectives: pendingPayload.sooRows,
        });
        await supabaseMeetingClient.deleteMissingStandardOperatingObjectives({
          accessToken: authSession.accessToken,
          workspaceId: selectedMeetingId,
          retainedClientSooIds: pendingPayload.sooRows.map(
            (soo) => soo.client_soo_id,
          ),
        });
        lastObjectivesAutosaveSignatureRef.current = pendingSignature;

        if (!isCancelled && !pendingObjectivesAutosaveSignatureRef.current) {
          setObjectivesAutosaveStatus("saved");
          setCloudMeetingMessage(
            "Objectives, Tasks, and SOOs saved to cloud. Manual Save still backs up the full workspace.",
          );
        }
      } catch (error) {
        if (!isCancelled && !isSigningOutRef.current) {
          setObjectivesAutosaveStatus("error");
          setCloudMeetingMessage(
            error instanceof Error
              ? error.message
              : "Objectives, Tasks, and SOOs could not be saved to cloud.",
          );
        }
      } finally {
        isObjectivesAutosaveInFlightRef.current = false;
        if (!isCancelled && pendingObjectivesAutosaveSignatureRef.current) {
          timeoutId = window.setTimeout(
            flushPendingObjectives,
            objectivesAutosaveDebounceMs,
          );
        }
      }
    };

    timeoutId = window.setTimeout(
      flushPendingObjectives,
      objectivesAutosaveDebounceMs,
    );

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSigningOutRef is a stable ref; live-read via .current, intentionally omitted
  }, [
    activeCloudWorkspaceId,
    authSession,
    hasLoadedDashboardStorage,
    isCurrentCloudRouteWorkspace,
    isRouteCloudBootstrapping,
    objectivesAutosaveSignature,
    selectedMeetingId,
    setObjectivesAutosaveStatus,
    setCloudMeetingMessage,
  ]);

  // ---------------------------------------------------------------------------
  // Has-unsaved-full-workspace-changes check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedMeetingId || !isCurrentCloudRouteWorkspace) return;
    if (!activeCloudWorkspaceId || activeCloudWorkspaceId !== selectedMeetingId)
      return;
    if (isRouteCloudBootstrapping || !hasLoadedDashboardStorage) return;

    const currentSignature = getWorkspaceStorageSignature(
      getCurrentWorkspaceStorage(),
    );
    setHasUnsavedFullWorkspaceChanges(
      currentSignature !== getLastCloudAutosaveSignature(),
    );
  }, [
    activeCloudWorkspaceId,
    getCurrentWorkspaceStorage,
    getLastCloudAutosaveSignature,
    hasLoadedDashboardStorage,
    isCurrentCloudRouteWorkspace,
    isRouteCloudBootstrapping,
    selectedMeetingId,
    setHasUnsavedFullWorkspaceChanges,
  ]);
}
