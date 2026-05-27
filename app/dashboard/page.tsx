"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";
import {
  isSupabaseConfigured,
  supabaseMeetingClient,
  type SupabaseMeeting,
} from "@/app/lib/supabaseClient";
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

const buildNextDuplicateMeetingName = (sourceName: string, existingNames: string[]) => {
  const trimmedSourceName = sourceName.trim();
  const baseName = `${trimmedSourceName} Copy`;
  const normalizedExistingNames = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()));

  if (!normalizedExistingNames.has(baseName.toLocaleLowerCase())) {
    return baseName;
  }

  let suffix = 2;
  while (normalizedExistingNames.has(`${baseName} ${suffix}`.toLocaleLowerCase())) {
    suffix += 1;
  }

  return `${baseName} ${suffix}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, isLoading, signOut } = useSupabaseAuth();
  const [meetings, setMeetings] = useState<SupabaseMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [newMeetingName, setNewMeetingName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [message, setMessage] = useState("");
  const [createMeetingError, setCreateMeetingError] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState<SupabaseMeeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupabaseMeeting | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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
        const nextMeetings = await supabaseMeetingClient.listWorkspaces(
          session.accessToken,
        );
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

      setMeetings((currentMeetings) => [meeting, ...currentMeetings]);
      setNewMeetingName("");
      router.push(`/meeting/${meeting.id}?prefillTitle=${encodeURIComponent(trimmedName)}`);
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

  const handleDuplicateMeeting = async (sourceMeeting: SupabaseMeeting) => {
    if (!session || isDuplicating) return;

    const duplicateName = buildNextDuplicateMeetingName(
      sourceMeeting.name,
      meetings.map((meeting) => meeting.name),
    );

    setIsDuplicating(sourceMeeting.id);
    setDuplicateTarget(null);
    setMessage("");

    try {
      const duplicated = await supabaseMeetingClient.duplicateWorkspace({
        accessToken: session.accessToken,
        ownerId: session.user.id,
        sourceMeeting,
        duplicateName,
      });
      setMeetings((currentMeetings) => [duplicated, ...currentMeetings]);
      setMessage(`Created ${duplicated.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not duplicate this meeting.",
      );
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleArchiveMeeting = async (meeting: SupabaseMeeting) => {
    if (!session || isArchiving) return;

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
            ? archivedMeeting
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
  const handleDeleteMeeting = async (meeting: SupabaseMeeting) => {
    if (!session || isDeleting) return;
    setIsDeleting(meeting.id);
    setMessage("");
    try {
      await supabaseMeetingClient.deleteWorkspace({
        accessToken: session.accessToken,
        workspaceId: meeting.id,
      });
      setMeetings((current) => current.filter((item) => item.id !== meeting.id));
      setMessage(`Deleted ${meeting.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete meeting.");
    } finally {
      setIsDeleting(null);
      setDeleteTarget(null);
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

  const activeMeetings = meetings.filter((meeting) => !meeting.archived_at);
  const archivedMeetings = meetings.filter((meeting) => Boolean(meeting.archived_at));
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
            <div className="flex min-w-0 gap-2">
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
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCreateBlankMeeting()}
                disabled={isCreatingMeeting}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingMeeting ? "Creating…" : "Start Blank"}
              </button>
              <button
                type="button"
                disabled={!activeMeetings.length || isCreatingMeeting}
                onClick={() =>
                  void handleDuplicateMeeting(activeMeetings[0] as SupabaseMeeting)
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Copy Existing Meeting
              </button>
              <label className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Import Backup
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => void handleImportBackupPlaceholder(event)}
                />
              </label>
            </div>
            {createMeetingError ? (
              <p className="pl-1 text-xs text-amber-800">{createMeetingError}</p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/meeting/local"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Continue Locally
              </Link>
              <button
                type="button"
                onClick={() => setShowArchived((current) => !current)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {showArchived ? "Hide archived" : `Show archived (${archivedMeetings.length})`}
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
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>

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

                <div className="flex items-center gap-3 sm:ml-auto">
                  <div className="flex flex-col gap-1">
                  {!meeting.archived_at ? (
                    <>
                      <button type="button" onClick={() => setDuplicateTarget(meeting)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100" disabled={isDuplicating === meeting.id}>
                        Duplicate
                      </button>
                      <button type="button" onClick={() => void handleArchiveMeeting(meeting)} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50" disabled={isArchiving === meeting.id}>
                        {isArchiving === meeting.id ? "..." : "Archive"}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setDeleteTarget(meeting)} className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" disabled={isDeleting === meeting.id}>
                      Delete
                    </button>
                  )}
                  </div>
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
        {duplicateTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setDuplicateTarget(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold">Duplicate meeting?</h3>
              <p className="mt-2 text-sm text-slate-600">Duplicating copies the current meeting workspace, but Tactical and Strategic history records are not copied yet.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setDuplicateTarget(null)}>Cancel</button>
                <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => void handleDuplicateMeeting(duplicateTarget)}>Confirm</button>
              </div>
            </div>
          </div>
        ) : null}
        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setDeleteTarget(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold">Delete archived meeting?</h3>
              <p className="mt-2 text-sm text-slate-600">This permanently deletes “{deleteTarget.name}”.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => void handleDeleteMeeting(deleteTarget)}>Delete</button>
              </div>
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
