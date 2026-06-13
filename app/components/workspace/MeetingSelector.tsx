"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  isSupabaseConfigured,
  supabaseMeetingClient,
  type SupabaseAuthSession,
  type SupabaseMeeting,
} from "@/app/lib/supabaseClient";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type MeetingSelectorProps = {
  session: SupabaseAuthSession | null;
  selectedMeetingId: string;
  onSelectedCloudWorkspaceIdChange: (workspaceId: string) => void;
  onSelectedCloudWorkspaceNameChange: (workspaceName: string) => void;
  onCloudWorkspaceCreated: (message: string) => void;
  saveStatus: SaveStatus;
  message: string;
  onLoadCloudMeeting: () => void;
  onSaveCloudMeeting: () => void;
};

type WorkspaceMessage = {
  type: "success" | "error";
  text: string;
};

const selectedMeetingStorageKeyPrefix =
  "meeting-tool-selected-cloud-workspace-id";

const getSelectedCloudWorkspaceStorageKey = (userId: string) =>
  `${selectedMeetingStorageKeyPrefix}:${userId}`;

const readStoredCloudWorkspaceId = (userId: string) => {
  if (typeof window === "undefined") return "";

  return (
    window.localStorage.getItem(getSelectedCloudWorkspaceStorageKey(userId)) ??
    ""
  );
};

const writeStoredCloudWorkspaceId = (userId: string, workspaceId: string) => {
  if (typeof window === "undefined") return;

  const storageKey = getSelectedCloudWorkspaceStorageKey(userId);
  if (workspaceId) {
    window.localStorage.setItem(storageKey, workspaceId);
    return;
  }

  window.localStorage.removeItem(storageKey);
};

const getStatusLabel = (status: SaveStatus) => {
  switch (status) {
    case "saving":
      return "Saving";
    case "saved":
      return "Saved to cloud";
    case "error":
      return "Save error";
    case "idle":
    default:
      return "Cloud Meeting";
  }
};

const getStatusClasses = (status: SaveStatus) => {
  switch (status) {
    case "saving":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "saved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "idle":
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
};

export function MeetingSelector({
  session,
  selectedMeetingId,
  onSelectedCloudWorkspaceIdChange,
  onSelectedCloudWorkspaceNameChange,
  onCloudWorkspaceCreated,
  saveStatus,
  message,
  onLoadCloudMeeting,
  onSaveCloudMeeting,
}: MeetingSelectorProps) {
  const [hasLoadedWorkspaceSelection, setHasLoadedWorkspaceSelection] =
    useState(false);
  const [workspaces, setWorkspaces] = useState<SupabaseMeeting[]>([]);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] =
    useState<WorkspaceMessage | null>(null);

  const visibleWorkspaces = useMemo(
    () => (session && workspaceOwnerId === session.user.id ? workspaces : []),
    [session, workspaceOwnerId, workspaces],
  );
  const selectedWorkspace = useMemo(
    () =>
      visibleWorkspaces.find(
        (workspace) => workspace.id === selectedMeetingId,
      ) ?? null,
    [selectedMeetingId, visibleWorkspaces],
  );
  useEffect(() => {
    let isMounted = true;

    const loadWorkspaces = async () => {
      await Promise.resolve();
      if (!isMounted) return;

      setHasLoadedWorkspaceSelection(false);
      onSelectedCloudWorkspaceIdChange("");
      onSelectedCloudWorkspaceNameChange("");
      setWorkspaces([]);
      setWorkspaceOwnerId(null);
      setWorkspaceMessage(null);

      if (!session || !isSupabaseConfigured) {
        setIsLoadingWorkspaces(false);
        setHasLoadedWorkspaceSelection(true);
        return;
      }

      setIsLoadingWorkspaces(true);

      try {
        const nextWorkspaces = await supabaseMeetingClient.listWorkspaces(
          session.accessToken,
        );
        if (!isMounted) return;

        const storedWorkspaceId = readStoredCloudWorkspaceId(session.user.id);
        const storedWorkspaceBelongsToUser = nextWorkspaces.some(
          (workspace) => workspace.id === storedWorkspaceId,
        );

        if (storedWorkspaceId && !storedWorkspaceBelongsToUser) {
          writeStoredCloudWorkspaceId(session.user.id, "");
        }

        setWorkspaces(nextWorkspaces);
        setWorkspaceOwnerId(session.user.id);
        const restoredWorkspace = storedWorkspaceBelongsToUser
          ? nextWorkspaces.find(
              (workspace) => workspace.id === storedWorkspaceId,
            )
          : null;
        onSelectedCloudWorkspaceIdChange(restoredWorkspace?.id ?? "");
        onSelectedCloudWorkspaceNameChange(restoredWorkspace?.name ?? "");
      } catch (error) {
        if (!isMounted) return;

        setWorkspaceMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Cloud workspaces could not be loaded.",
        });
      } finally {
        if (isMounted) {
          setIsLoadingWorkspaces(false);
          setHasLoadedWorkspaceSelection(true);
        }
      }
    };

    void loadWorkspaces();

    return () => {
      isMounted = false;
    };
  }, [
    onSelectedCloudWorkspaceIdChange,
    onSelectedCloudWorkspaceNameChange,
    session,
  ]);

  useEffect(() => {
    if (!session || !hasLoadedWorkspaceSelection) return;

    writeStoredCloudWorkspaceId(session.user.id, selectedMeetingId);
  }, [hasLoadedWorkspaceSelection, selectedMeetingId, session]);

  const selectCloudWorkspace = (workspaceId: string) => {
    const workspace = visibleWorkspaces.find((item) => item.id === workspaceId);
    onSelectedCloudWorkspaceIdChange(workspaceId);
    onSelectedCloudWorkspaceNameChange(workspace?.name ?? "");
    setWorkspaceMessage(null);
  };

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || isCreatingWorkspace) return;

    const trimmedName = newWorkspaceName.trim();
    if (!trimmedName) {
      setWorkspaceMessage({
        type: "error",
        text: "Name the cloud meeting first.",
      });
      return;
    }

    setIsCreatingWorkspace(true);
    setWorkspaceMessage(null);

    try {
      const workspace = await supabaseMeetingClient.createWorkspace({
        accessToken: session.accessToken,
        name: trimmedName,
      });

      setWorkspaces((currentWorkspaces) => [workspace, ...currentWorkspaces]);
      setWorkspaceOwnerId(session.user.id);
      onSelectedCloudWorkspaceIdChange(workspace.id);
      onSelectedCloudWorkspaceNameChange(workspace.name);
      setNewWorkspaceName("");
      onCloudWorkspaceCreated(
        "Cloud workspace created. Local data has not been copied.",
      );
    } catch (error) {
      setWorkspaceMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Cloud workspace could not be created.",
      });
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm sm:w-96">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold uppercase tracking-wide text-blue-600">
            Workspace
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {selectedWorkspace ? selectedWorkspace.name : "No Meeting Selected"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mode: Cloud Meeting
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
            saveStatus,
          )}`}
        >
          {getStatusLabel(saveStatus)}
        </span>
      </div>

      {!session ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sign in to create or select cloud meetings.
        </p>
      ) : !isSupabaseConfigured ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Supabase is not configured in this environment, so cloud meetings are
          unavailable.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <select
            value={selectedMeetingId}
            onChange={(event) => selectCloudWorkspace(event.target.value)}
            disabled={isLoadingWorkspaces || visibleWorkspaces.length === 0}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Select cloud meeting"
          >
            <option value="" disabled>
              {visibleWorkspaces.length === 0
                ? "No cloud meetings yet"
                : "Select Cloud Meeting"}
            </option>
            {visibleWorkspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onLoadCloudMeeting}
              disabled={saveStatus === "saving"}
              className="rounded-xl border border-blue-200 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Load cloud meeting
            </button>
            <button
              type="button"
              onClick={onSaveCloudMeeting}
              disabled={saveStatus === "saving"}
              className="rounded-xl bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save current workspace to cloud
            </button>
          </div>

          <form
            className="grid gap-2 sm:grid-cols-[1fr_auto]"
            onSubmit={handleCreateWorkspace}
          >
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              maxLength={80}
              placeholder="New cloud meeting name"
              className="min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              disabled={isCreatingWorkspace}
              className="rounded-xl bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingWorkspace ? "Creating…" : "Create"}
            </button>
          </form>

          {isLoadingWorkspaces ? (
            <p className="text-xs text-slate-500">Loading cloud meetings…</p>
          ) : null}
        </div>
      )}

      {message ? (
        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {message}
        </p>
      ) : null}

      {workspaceMessage ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
            workspaceMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {workspaceMessage.text}
        </p>
      ) : null}
    </section>
  );
}
