"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";
import {
  isSupabaseConfigured,
  supabaseMeetingClient,
  supabaseProfileClient,
  type SupabaseProfile,
} from "@/app/lib/supabaseClient";
import {
  listDashboardMeetings,
  toDashboardMeeting,
  type DashboardMeeting,
} from "@/app/lib/dashboardMeetings";
import { validateWorkspaceBackup } from "@/app/lib/workspaceBackup";

const sortMeetingsByName = (meetings: DashboardMeeting[]) =>
  [...meetings].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
  );

const meetingMatchesSearch = (meeting: DashboardMeeting, query: string) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return (
    meeting.name.toLocaleLowerCase().includes(normalizedQuery) ||
    (meeting.access === "shared" &&
      meeting.ownerDisplayName.toLocaleLowerCase().includes(normalizedQuery))
  );
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [message, setMessage] = useState("");
  const [createMeetingError, setCreateMeetingError] = useState("");
  const dashboardMenuRef = useRef<HTMLDivElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  useBodyScrollLock(
    showDashboardMenu ||
      meetingPendingDuplicate !== null ||
      meetingPendingDelete !== null ||
      showProfileEditor,
  );

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/");
    }
  }, [isLoading, router, session]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!session || !isSupabaseConfigured) return;
      setIsLoadingProfile(true);
      setProfileMessage("");

      try {
        const bootstrappedProfile =
          await supabaseProfileClient.ensureOwnProfile(session.accessToken);
        if (!isMounted) return;
        setProfile(bootstrappedProfile);
        setProfileFirstName(bootstrappedProfile.first_name ?? "");
        setProfileLastName(bootstrappedProfile.last_name ?? "");
      } catch (error) {
        if (!isMounted) return;
        setProfileMessage(
          error instanceof Error
            ? error.message
            : "Could not load your profile.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session]);

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
          currentUserEmail: session.user.email,
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

  const profileDisplayName = profile?.display_name?.trim();
  const dashboardTitle = profileDisplayName
    ? `${profileDisplayName}'s Meetings`
    : "Your Meetings";
  const currentOwnerProfile = profile
    ? { display_name: profile.display_name, email: profile.email }
    : null;

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
        toDashboardMeeting({
          meeting,
          currentUserId: session.user.id,
          currentUserEmail: session.user.email,
          ownerProfile: currentOwnerProfile,
        }),
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
          currentUserEmail: session.user.email,
          ownerProfile: currentOwnerProfile,
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
                currentUserEmail: session.user.email,
                ownerProfile: currentOwnerProfile,
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
                currentUserEmail: session.user.email,
                ownerProfile: currentOwnerProfile,
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

  const handleSaveProfile = async () => {
    if (!session || isSavingProfile) return;

    const trimmedFirstName = profileFirstName.trim();
    const trimmedLastName = profileLastName.trim();
    if (!trimmedFirstName || !trimmedLastName) {
      setProfileMessage("First and last name are required.");
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage("");

    try {
      const updatedProfile = await supabaseProfileClient.updateOwnProfile({
        accessToken: session.accessToken,
        userId: session.user.id,
        profile: {
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
        },
      });
      setProfile(updatedProfile);
      setProfileFirstName(updatedProfile.first_name ?? "");
      setProfileLastName(updatedProfile.last_name ?? "");
      setMeetings((currentMeetings) =>
        currentMeetings.map((meeting) =>
          meeting.owner_id === session.user.id
            ? toDashboardMeeting({
                meeting,
                currentUserId: session.user.id,
                currentUserEmail: session.user.email,
                ownerProfile: updatedProfile,
              })
            : meeting,
        ),
      );
      setProfileMessage("Profile saved.");
      setShowProfileEditor(false);
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Could not save your profile.",
      );
    } finally {
      setIsSavingProfile(false);
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

  const visibleMeetings = (
    showArchived ? meetings : meetings.filter((meeting) => !meeting.archived_at)
  ).filter((meeting) => meetingMatchesSearch(meeting, searchQuery));
  const archivedMeetings = meetings.filter((meeting) =>
    Boolean(meeting.archived_at),
  );
  const ownedMeetingCount = meetings.filter(
    (meeting) => meeting.access === "owned",
  ).length;
  const sharedMeetingCount = meetings.filter(
    (meeting) => meeting.access === "shared",
  ).length;
  const ownedMeetings = sortMeetingsByName(
    visibleMeetings.filter((meeting) => meeting.access === "owned"),
  );
  const sharedMeetings = sortMeetingsByName(
    visibleMeetings.filter((meeting) => meeting.access === "shared"),
  );
  const searchIsActive = Boolean(searchQuery.trim());

  const getOwnedMeetingsEmptyMessage = () => {
    if (ownedMeetingCount === 0)
      return "Create your first meeting to get started.";
    if (searchIsActive) return "No owned meetings match this search.";
    return "No active owned meetings in this view.";
  };

  const getSharedMeetingsEmptyMessage = () => {
    if (sharedMeetingCount === 0) return "No shared meetings yet.";
    if (searchIsActive) return "No shared meetings match this search.";
    return "No active shared meetings in this view.";
  };

  const renderMeetingCard = (meeting: DashboardMeeting) => (
    <article
      key={meeting.id}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{meeting.name}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          Owner: {meeting.ownerDisplayName}
        </p>
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
                {isDuplicating === meeting.id ? "Duplicating…" : "Duplicate"}
              </button>
              <button
                type="button"
                onClick={() => void handleArchiveMeeting(meeting)}
                className="rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                disabled={isArchiving === meeting.id}
              >
                {isArchiving === meeting.id ? "Archiving…" : "Archive"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button
                type="button"
                onClick={() => void handleRestoreArchivedMeeting(meeting)}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(isRestoringArchived)}
              >
                {isRestoringArchived === meeting.id ? "Restoring…" : "Restore"}
              </button>
              <button
                type="button"
                onClick={() => setMeetingPendingDelete(meeting)}
                className="rounded-xl border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                disabled={Boolean(isDeletingArchived)}
              >
                {isDeletingArchived === meeting.id ? "Deleting…" : "Delete"}
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
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {dashboardTitle}
          </h1>

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
                      onClick={() => {
                        setShowDashboardMenu(false);
                        setShowProfileEditor(true);
                      }}
                      className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                      role="menuitem"
                    >
                      Profile
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

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search cloud meetings
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search owned and shared meetings"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>
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

        <section className="space-y-6" aria-labelledby="cloud-meetings-heading">
          <h2
            id="cloud-meetings-heading"
            className="text-2xl font-semibold text-slate-900"
          >
            Cloud Meetings
          </h2>

          {isLoadingMeetings ? (
            <p className="text-sm text-slate-500">Loading meetings…</p>
          ) : (
            <>
              {searchIsActive && visibleMeetings.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 shadow-sm">
                  No meetings found for this search.
                </p>
              ) : null}

              <section
                className="space-y-3"
                aria-labelledby="owned-meetings-heading"
              >
                <h2
                  id="owned-meetings-heading"
                  className="text-xl font-semibold text-slate-900"
                >
                  Owned by Me
                </h2>
                {ownedMeetings.length > 0 ? (
                  ownedMeetings.map(renderMeetingCard)
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 shadow-sm">
                    {getOwnedMeetingsEmptyMessage()}
                  </p>
                )}
              </section>

              <section
                className="space-y-3"
                aria-labelledby="shared-meetings-heading"
              >
                <h2
                  id="shared-meetings-heading"
                  className="text-xl font-semibold text-slate-900"
                >
                  Shared with Me
                </h2>
                {sharedMeetings.length > 0 ? (
                  sharedMeetings.map(renderMeetingCard)
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 shadow-sm">
                    {getSharedMeetingsEmptyMessage()}
                  </p>
                )}
              </section>
            </>
          )}
        </section>
      </div>

      {showProfileEditor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Profile
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Your display name
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Add your first and last name so meetings can show durable owner
                attribution.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  First name
                </span>
                <input
                  type="text"
                  value={profileFirstName}
                  onChange={(event) => setProfileFirstName(event.target.value)}
                  disabled={isLoadingProfile || isSavingProfile}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Last name
                </span>
                <input
                  type="text"
                  value={profileLastName}
                  onChange={(event) => setProfileLastName(event.target.value)}
                  disabled={isLoadingProfile || isSavingProfile}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              {profile?.email ? (
                <p className="text-xs text-slate-500">Email: {profile.email}</p>
              ) : null}

              {profileMessage ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  {profileMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProfileEditor(false)}
                disabled={isSavingProfile}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={isLoadingProfile || isSavingProfile}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
