"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";
import {
  isSupabaseConfigured,
  supabaseMeetingClient,
} from "@/app/lib/supabaseClient";
import {
  listDashboardMeetings,
  toDashboardMeeting,
  type DashboardMeeting,
} from "@/app/lib/dashboardMeetings";
import { validateWorkspaceBackup } from "@/app/lib/workspaceBackup";

const formatRelativeTimestamp = (timestamp: string) => {
  const milliseconds = Date.parse(timestamp);
  if (Number.isNaN(milliseconds)) return "Unknown";

  const difference = Date.now() - milliseconds;
  const absMinutes = Math.floor(Math.abs(difference) / (1000 * 60));

  if (absMinutes < 1) return "just now";
  if (absMinutes < 60) return `${absMinutes}m ago`;

  const absHours = Math.floor(absMinutes / 60);
  if (absHours < 24) return `${absHours}h ago`;

  const absDays = Math.floor(absHours / 24);
  if (absDays <= 7) return `${absDays}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(milliseconds));
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, isLoading, signOut } = useSupabaseAuth();
  const [meetings, setMeetings] = useState<DashboardMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [isRestoringArchived, setIsRestoringArchived] = useState<string | null>(
    null,
  );
  const [isDeletingArchived, setIsDeletingArchived] = useState<string | null>(
    null,
  );
  const [meetingPendingDuplicate, setMeetingPendingDuplicate] =
    useState<DashboardMeeting | null>(null);
  const [meetingPendingDelete, setMeetingPendingDelete] =
    useState<DashboardMeeting | null>(null);
  const [newMeetingName, setNewMeetingName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [message, setMessage] = useState("");
  const [createMeetingError, setCreateMeetingError] = useState("");
  const dashboardMenuRef = useRef<HTMLDivElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  useBodyScrollLock(
    showDashboardMenu ||
      meetingPendingDuplicate !== null ||
      meetingPendingDelete !== null,
  );

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/");
    }
  }, [isLoading, router, session]);

  useEffect(() => {
    let isMounted = true;

    const loadMeetings = async () => {
      if (!session || !isSupabaseConfigured) return;
      setIsLoadingMeetings(true);
      setMessage("");

      try {
        const nextMeetings = await listDashboardMeetings({
          accessToken: session.accessToken,
          currentUserId: session.user.id,
        });
        if (!isMounted) return;
        setMeetings(nextMeetings);
      } catch (error) {
        if (!isMounted) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load meetings for this user.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingMeetings(false);
        }
      }
    };

    void loadMeetings();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (!showDashboardMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const menuElement = dashboardMenuRef.current;
      if (!menuElement || !(event.target instanceof Node)) return;
      if (menuElement.contains(event.target)) return;
      setShowDashboardMenu(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDashboardMenu]);

  const teamName = session?.user.email
    ? `${session.user.email.split("@")[0]}'s Team`
    : "Your Team";

  const handleCreateBlankMeeting = async () => {
    if (!session || isCreatingMeeting) return;

    const trimmedName = newMeetingName.trim();
    if (!trimmedName) {
      setCreateMeetingError("Name the meeting before creating it.");
      return;
    }

    setIsCreatingMeeting(true);
    setMessage("");
    setCreateMeetingError("");

    try {
      const meeting = await supabaseMeetingClient.createWorkspace({
        accessToken: session.accessToken,
        ownerId: session.user.id,
        name: trimmedName,
      });

      setMeetings((currentMeetings) => [
        toDashboardMeeting({ meeting, currentUserId: session.user.id }),
        ...currentMeetings,
      ]);
      setNewMeetingName("");
      router.push(`/meeting/${meeting.id}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create meeting for this user.",
      );
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const getNextDuplicateMeetingName = (sourceName: string) => {
    const trimmedSourceName = sourceName.trim();
    const baseName = `${trimmedSourceName} Copy`;
    const existingNames = new Set(
      meetings.map((meeting) => meeting.name.trim()),
    );

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let copyNumber = 2;
    while (existingNames.has(`${baseName} ${copyNumber}`)) {
      copyNumber += 1;
    }

    return `${baseName} ${copyNumber}`;
  };

  const handleDuplicateMeeting = async (sourceMeeting: DashboardMeeting) => {
    if (!session || isDuplicating || !sourceMeeting.canManageMeetingLifecycle)
      return;

    setIsDuplicating(sourceMeeting.id);
    setMessage("");

    try {
      const duplicateName = getNextDuplicateMeetingName(sourceMeeting.name);
      const duplicated = await supabaseMeetingClient.duplicateWorkspace({
        accessToken: session.accessToken,
        ownerId: session.user.id,
        sourceMeeting,
        duplicateName,
      });
      setMeetings((currentMeetings) => [
        toDashboardMeeting({
          meeting: duplicated,
          currentUserId: session.user.id,
        }),
        ...currentMeetings,
      ]);
      setMessage(`Created ${duplicated.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not duplicate this meeting.",
      );
    } finally {
      setIsDuplicating(null);
      setMeetingPendingDuplicate(null);
    }
  };

  const handleArchiveMeeting = async (meeting: DashboardMeeting) => {
    if (!session || isArchiving || !meeting.canManageMeetingLifecycle) return;

    const confirmed = window.confirm(
      `Archive \"${meeting.name}\"? You can still show archived meetings later.`,
    );
    if (!confirmed) return;

    setIsArchiving(meeting.id);
    setMessage("");

    try {
      const archivedMeeting = await supabaseMeetingClient.archiveWorkspace({
        accessToken: session.accessToken,
        workspaceId: meeting.id,
      });

      setMeetings((currentMeetings) =>
        currentMeetings.map((currentMeeting) =>
          currentMeeting.id === archivedMeeting.id
            ? toDashboardMeeting({
                meeting: archivedMeeting,
                currentUserId: session.user.id,
              })
            : currentMeeting,
        ),
      );
      setMessage(`Archived ${meeting.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not archive meeting.",
      );
    } finally {
      setIsArchiving(null);
    }
  };

  const handleRestoreArchivedMeeting = async (meeting: DashboardMeeting) => {
    if (!session || isRestoringArchived || !meeting.canManageMeetingLifecycle)
      return;
    setIsRestoringArchived(meeting.id);
    setMessage("");

    try {
      const restoredMeeting =
        await supabaseMeetingClient.restoreArchivedWorkspace({
          accessToken: session.accessToken,
          workspaceId: meeting.id,
        });

      setMeetings((currentMeetings) =>
        currentMeetings.map((currentMeeting) =>
          currentMeeting.id === restoredMeeting.id
            ? toDashboardMeeting({
                meeting: restoredMeeting,
                currentUserId: session.user.id,
              })
            : currentMeeting,
        ),
      );
      setMessage(`${meeting.name} is active again.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not restore this archived meeting.",
      );
    } finally {
      setIsRestoringArchived(null);
    }
  };

  const handleImportBackupPlaceholder = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      validateWorkspaceBackup(parsed);
      setMessage(
        "Import Backup for new cloud meeting is UI-ready, but write-to-new-meeting is deferred in this PR for safety.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not read this backup file.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleDeleteArchivedMeeting = async (meeting: DashboardMeeting) => {
    if (!session || isDeletingArchived || !meeting.canManageMeetingLifecycle)
      return;
    setIsDeletingArchived(meeting.id);
    setMessage("");

    try {
      await supabaseMeetingClient.softDeleteArchivedWorkspace({
        accessToken: session.accessToken,
        workspaceId: meeting.id,
        ownerId: session.user.id,
      });

      setMeetings((currentMeetings) =>
        currentMeetings.filter(
          (currentMeeting) => currentMeeting.id !== meeting.id,
        ),
      );
      setMessage(`${meeting.name} is now hidden from the dashboard.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete this archived meeting.",
      );
    } finally {
      setIsDeletingArchived(null);
      setMeetingPendingDelete(null);
    }
  };

  const activeMeetings = meetings.filter((meeting) => !meeting.archived_at);
  const archivedMeetings = meetings.filter((meeting) =>
    Boolean(meeting.archived_at),
  );
  const visibleMeetings = showArchived ? meetings : activeMeetings;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Team</h1>
          <p className="mt-1 text-base text-slate-600">{teamName}</p>

          <div className="mt-5 space-y-3">
            <div
              className="flex items-center justify-end gap-2"
              ref={dashboardMenuRef}
            >
              <button
                type="button"
                onClick={() => setShowArchived((current) => !current)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {showArchived
                  ? "Hide Archived"
                  : `Show Archived (${archivedMeetings.length})`}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDashboardMenu((isOpen) => !isOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
                  aria-expanded={showDashboardMenu}
                  aria-haspopup="menu"
                  aria-label="Open dashboard menu"
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    ☰
                  </span>
                </button>

                {showDashboardMenu ? (
                  <div
                    className="absolute right-0 z-40 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl"
                    role="menu"
                    aria-label="Dashboard menu"
                  >
                    <button
                      type="button"
                      onClick={() => setShowDashboardMenu(false)}
                      className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                      role="menuitem"
                    >
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDashboardMenu(false);
                        backupInputRef.current?.click();
                      }}
                      className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                      role="menuitem"
                    >
                      Import Backup
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void signOut()
                          .then(() => {
                            router.replace("/");
                          })
                          .catch(() => undefined)
                      }
                      className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newMeetingName}
                onChange={(event) => {
                  setNewMeetingName(event.target.value);
                  if (createMeetingError) setCreateMeetingError("");
                }}
                placeholder="Name your new recurring meeting"
                maxLength={80}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />

              <div className="flex items-center justify-end gap-2">
                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) =>
                    void handleImportBackupPlaceholder(event)
                  }
                />

                <button
                  type="button"
                  onClick={() => void handleCreateBlankMeeting()}
                  disabled={isCreatingMeeting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingMeeting ? "Creating…" : "Create New Meeting"}
                </button>
              </div>
            </div>
            {createMeetingError ? (
              <p className="pl-1 text-xs text-amber-800">
                {createMeetingError}
              </p>
            ) : null}
          </div>
        </header>

        {message ? (
          <p
            className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <section className="space-y-3">
          {isLoadingMeetings ? (
            <p className="text-sm text-slate-500">Loading meetings…</p>
          ) : visibleMeetings.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 shadow-sm">
              {showArchived
                ? "No meetings found for this filter."
                : "No active meetings yet. Create your first recurring meeting above."}
            </p>
          ) : (
            visibleMeetings.map((meeting) => (
              <article
                key={meeting.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Team {teamName}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    {meeting.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Last updated {formatRelativeTimestamp(meeting.updated_at)}
                  </p>
                </div>

                <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                  {meeting.canManageMeetingLifecycle ? (
                    !meeting.archived_at ? (
                      <div className="flex flex-col items-stretch gap-2 sm:items-end">
                        <button
                          type="button"
                          onClick={() => setMeetingPendingDuplicate(meeting)}
                          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          disabled={Boolean(isDuplicating)}
                        >
                          {isDuplicating === meeting.id
                            ? "Duplicating…"
                            : "Duplicate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleArchiveMeeting(meeting)}
                          className="rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          disabled={isArchiving === meeting.id}
                        >
                          {isArchiving === meeting.id
                            ? "Archiving…"
                            : "Archive"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-stretch gap-2 sm:items-end">
                        <button
                          type="button"
                          onClick={() =>
                            void handleRestoreArchivedMeeting(meeting)
                          }
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={Boolean(isRestoringArchived)}
                        >
                          {isRestoringArchived === meeting.id
                            ? "Restoring…"
                            : "Restore"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeetingPendingDelete(meeting)}
                          className="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          disabled={Boolean(isDeletingArchived)}
                        >
                          {isDeletingArchived === meeting.id
                            ? "Deleting…"
                            : "Delete"}
                        </button>
                      </div>
                    )
                  ) : null}
                  <Link
                    href={`/meeting/${meeting.id}`}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {meetingPendingDuplicate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Duplicate meeting?
            </h2>
            <p className="mt-3 text-sm text-slate-700">
              Duplicating copies the current meeting workspace, but Tactical and
              Strategic history records are not copied yet.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMeetingPendingDuplicate(null)}
                disabled={Boolean(isDuplicating)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleDuplicateMeeting(meetingPendingDuplicate)
                }
                disabled={Boolean(isDuplicating)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDuplicating ? "Duplicating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {meetingPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete meeting?
            </h2>
            <p className="mt-3 text-sm text-slate-700">
              This will hide the archived meeting from your dashboard. The
              record will remain safely stored for recovery.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMeetingPendingDelete(null)}
                disabled={Boolean(isDeletingArchived)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleDeleteArchivedMeeting(meetingPendingDelete)
                }
                disabled={Boolean(isDeletingArchived)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingArchived ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
