"use client";

import type { RefObject } from "react";
import Link from "next/link";

// ─── Status types (mirror of MeetingWorkspace private types) ─────────────────

export type CloudSaveStatus = "idle" | "saving" | "saved" | "error";
export type AutosaveSummaryStatus =
  | "autosaved"
  | "saved"
  | "saving"
  | "backup-needed"
  | "error";
export type SettingsAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";
export type StrategicTopicsAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";
export type MeetingNotesAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";
export type AgendaItemsAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";
export type ObjectivesAutosaveStatus =
  | "ready"
  | "pending"
  | "saving"
  | "saved"
  | "error";

// ─── Static label / class maps ────────────────────────────────────────────────

const autosaveSummaryLabel: Record<AutosaveSummaryStatus, string> = {
  autosaved: "Autosaved",
  saved: "Saved",
  saving: "Saving…",
  "backup-needed": "Manual Save needed",
  error: "Autosave issue",
};

const autosaveSummaryChipClassName: Record<AutosaveSummaryStatus, string> = {
  autosaved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  saved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  saving: "border-blue-200 bg-blue-50 text-blue-800",
  "backup-needed": "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
};

const settingsAutosaveStatusLabel: Record<SettingsAutosaveStatus, string> = {
  ready: "Settings autosave ready",
  pending: "Settings autosave pending…",
  saving: "Saving settings…",
  saved: "Settings saved to cloud",
  error: "Settings save failed",
};

const strategicTopicsAutosaveStatusLabel: Record<
  StrategicTopicsAutosaveStatus,
  string
> = {
  ready: "Strategic Topics autosave ready",
  pending: "Strategic Topics autosave pending…",
  saving: "Saving Strategic Topics…",
  saved: "Strategic Topics saved to cloud",
  error: "Strategic Topics save failed",
};

const meetingNotesAutosaveStatusLabel: Record<
  MeetingNotesAutosaveStatus,
  string
> = {
  ready: "Meeting Notes autosave ready",
  pending: "Meeting Notes autosave pending…",
  saving: "Saving Meeting Notes…",
  saved: "Meeting Notes and Cascading Communications saved to cloud",
  error: "Meeting Notes autosave failed",
};

const agendaItemsAutosaveStatusLabel: Record<
  AgendaItemsAutosaveStatus,
  string
> = {
  ready: "Agenda Items autosave ready",
  pending: "Agenda Items autosave pending…",
  saving: "Saving Agenda Items…",
  saved: "Agenda Items saved to cloud",
  error: "Agenda Items autosave failed",
};

const objectivesAutosaveStatusLabel: Record<ObjectivesAutosaveStatus, string> =
  {
    ready: "Objectives, Tasks, and SOOs autosave ready",
    pending: "Objectives, Tasks, and SOOs autosave pending…",
    saving: "Saving Objectives, Tasks, and SOOs…",
    saved: "Objectives, Tasks, and SOOs saved to cloud",
    error: "Objectives, Tasks, and SOOs autosave failed",
  };

// ─── Props ────────────────────────────────────────────────────────────────────

// Title group
type TitleProps = {
  stickyMeetingTitle: string;
};

// Lifecycle status group
type LifecycleProps = {
  lifecycleHelpRef: RefObject<HTMLDivElement | null>;
  lifecycleStatusClassName: string;
  lifecycleStatusDescription: string;
  lifecycleStatusLabel: string;
  activeMeetingDate: string;
  isActionDateDifferentFromActiveMeeting: boolean;
  meetingActionDate: string;
  showLifecycleHelp: boolean;
  onToggleLifecycleHelp: () => void;
  onOpenLifecycleHelp: () => void;
};

// Autosave chip group
type AutosaveProps = {
  isCurrentCloudRouteWorkspace: boolean;
  autosaveStatusDetailRef: RefObject<HTMLDivElement | null>;
  showAutosaveStatusDetail: boolean;
  onToggleAutosaveStatusDetail: () => void;
  autosaveSummaryStatus: AutosaveSummaryStatus;
  settingsAutosaveStatus: SettingsAutosaveStatus;
  strategicTopicsAutosaveStatus: StrategicTopicsAutosaveStatus;
  agendaItemsAutosaveStatus: AgendaItemsAutosaveStatus;
  meetingNotesAutosaveStatus: MeetingNotesAutosaveStatus;
  objectivesAutosaveStatus: ObjectivesAutosaveStatus;
  hasUnsavedFullWorkspaceChanges: boolean;
  cloudSaveStatus: CloudSaveStatus;
  cloudMeetingMessage: string;
  onReloadCloudBackup: () => void;
};

// Meeting action buttons group
type ActionProps = {
  meetingActionHelpText: string;
  meetingActionLabel: string;
  hasMeetingActionDate: boolean;
  onMeetingAction: () => void;
  isEndingMeeting: boolean;
  canEndMeeting: boolean;
  authSession: { user: { email: string } } | null;
  selectedMeetingId: string;
  isCurrentCloudRouteWorkspace: boolean;
  onEndMeeting: () => void;
  isManualSaveInFlight: boolean;
  manualSaveSuccess: boolean;
  onManualSave: () => void;
};

// Settings / account menu group
type MenuProps = {
  settingsMenuRef: RefObject<HTMLDivElement | null>;
  showSettingsMenu: boolean;
  onToggleSettingsMenu: () => void;
  isAuthLoading: boolean;
  authSession: { user: { email: string } } | null;
  isMeetingOwner: boolean;
  onTacticalHistory: () => void;
  onChangePassword: () => void;
  onEditPlaybook: () => void;
  onBackupRestore: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  onSignIn: () => void;
  testingToolsEnabled: boolean;
  isTestingModeActive: boolean;
  onToggleTestingMode: (checked: boolean) => void;
  testingMeetingDate: string;
  onTestingMeetingDateChange: (date: string) => void;
};

export type MeetingHeaderProps = TitleProps &
  LifecycleProps &
  AutosaveProps &
  ActionProps &
  MenuProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function MeetingHeader({
  // Title
  stickyMeetingTitle,
  // Lifecycle
  lifecycleHelpRef,
  lifecycleStatusClassName,
  lifecycleStatusDescription,
  lifecycleStatusLabel,
  activeMeetingDate,
  isActionDateDifferentFromActiveMeeting,
  meetingActionDate,
  showLifecycleHelp,
  onToggleLifecycleHelp,
  onOpenLifecycleHelp,
  // Autosave
  isCurrentCloudRouteWorkspace,
  autosaveStatusDetailRef,
  showAutosaveStatusDetail,
  onToggleAutosaveStatusDetail,
  autosaveSummaryStatus,
  settingsAutosaveStatus,
  strategicTopicsAutosaveStatus,
  agendaItemsAutosaveStatus,
  meetingNotesAutosaveStatus,
  objectivesAutosaveStatus,
  cloudSaveStatus,
  cloudMeetingMessage,
  onReloadCloudBackup,
  // Actions
  meetingActionHelpText,
  meetingActionLabel,
  hasMeetingActionDate,
  onMeetingAction,
  isEndingMeeting,
  canEndMeeting,
  authSession,
  selectedMeetingId,
  onEndMeeting,
  isManualSaveInFlight,
  manualSaveSuccess,
  onManualSave,
  // Menu
  settingsMenuRef,
  showSettingsMenu,
  onToggleSettingsMenu,
  isAuthLoading,
  isMeetingOwner,
  onTacticalHistory,
  onChangePassword,
  onEditPlaybook,
  onBackupRestore,
  onSignOut,
  isSigningOut,
  onSignIn,
  testingToolsEnabled,
  isTestingModeActive,
  onToggleTestingMode,
  testingMeetingDate,
  onTestingMeetingDateChange,
}: MeetingHeaderProps) {
  const manualSaveLabel = isManualSaveInFlight
    ? "Saving…"
    : manualSaveSuccess
      ? "Saved"
      : cloudSaveStatus === "error"
        ? "Save Failed"
        : "Manual Save";

  const isOpenMeeting = lifecycleStatusLabel === "Open Meeting";
  const isPastMeeting = lifecycleStatusLabel === "Past Meeting";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-100/95 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
          {/* Title */}
          <div className="flex min-w-0 items-center">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
              {stickyMeetingTitle}
            </h1>
          </div>

          {/* Right side: three groups */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-1 lg:flex-nowrap lg:justify-between lg:gap-3">

            {/* Group 1 (left): action buttons + lifecycle context */}
            {isOpenMeeting ? (
              // Open Meeting: card wrapping buttons row + lifecycle chip below
              <div className="inline-flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onMeetingAction}
                    disabled={!hasMeetingActionDate}
                    title={meetingActionHelpText}
                    className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {meetingActionLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onEndMeeting}
                    disabled={
                      isEndingMeeting ||
                      !authSession ||
                      !selectedMeetingId ||
                      !isCurrentCloudRouteWorkspace ||
                      !canEndMeeting
                    }
                    title="End Meeting captures a Tactical History snapshot and closes this dated record for editing."
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEndingMeeting ? "Ending…" : "End Meeting"}
                  </button>
                </div>
                <div
                  ref={lifecycleHelpRef}
                  className="relative flex items-center gap-1.5 text-xs"
                >
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${lifecycleStatusClassName}`}
                    title={lifecycleStatusDescription}
                    aria-label={`${lifecycleStatusLabel}: ${lifecycleStatusDescription}`}
                  >
                    {lifecycleStatusLabel}
                    <span className="font-medium opacity-80">{activeMeetingDate}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleLifecycleHelp()}
                    onFocus={() => onOpenLifecycleHelp()}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title={`${lifecycleStatusDescription} ${meetingActionHelpText}`}
                    aria-label="Meeting lifecycle help"
                    aria-expanded={showLifecycleHelp}
                  >
                    ?
                  </button>
                  {showLifecycleHelp ? (
                    <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-medium leading-relaxed text-slate-700 shadow-xl">
                      <p className="font-semibold text-slate-900">
                        {lifecycleStatusDescription}
                      </p>
                      <p className="mt-1">{meetingActionHelpText}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : isPastMeeting ? (
              // Past Meeting: Start button + "Last Meeting" chip below, no dates
              <div ref={lifecycleHelpRef} className="relative inline-flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={onMeetingAction}
                  disabled={!hasMeetingActionDate}
                  title={meetingActionHelpText}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {meetingActionLabel}
                </button>
                <span className="inline-flex items-center gap-1 self-start rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                  Last Meeting
                  <span className="font-medium opacity-80">{activeMeetingDate}</span>
                </span>
              </div>
            ) : (
              // Default (Closed Meeting, Test Mode): original layout
              <div className="flex flex-wrap items-center gap-2">
                <div
                  ref={lifecycleHelpRef}
                  className="relative flex items-center gap-1.5 text-xs"
                >
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${lifecycleStatusClassName}`}
                    title={lifecycleStatusDescription}
                    aria-label={`${lifecycleStatusLabel}: ${lifecycleStatusDescription}`}
                  >
                    {lifecycleStatusLabel}
                    <span className="font-medium opacity-80">{activeMeetingDate}</span>
                  </span>
                  {isActionDateDifferentFromActiveMeeting ? (
                    <span
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-500"
                      title={meetingActionHelpText}
                    >
                      Meeting date: {meetingActionDate}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onToggleLifecycleHelp()}
                    onFocus={() => onOpenLifecycleHelp()}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title={`${lifecycleStatusDescription} ${meetingActionHelpText}`}
                    aria-label="Meeting lifecycle help"
                    aria-expanded={showLifecycleHelp}
                  >
                    ?
                  </button>
                  {showLifecycleHelp ? (
                    <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-medium leading-relaxed text-slate-700 shadow-xl">
                      <p className="font-semibold text-slate-900">
                        {lifecycleStatusDescription}
                      </p>
                      <p className="mt-1">{meetingActionHelpText}</p>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={onMeetingAction}
                  disabled={!hasMeetingActionDate}
                  title={meetingActionHelpText}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {meetingActionLabel}
                </button>

                <button
                  type="button"
                  onClick={onEndMeeting}
                  disabled={
                    isEndingMeeting ||
                    !authSession ||
                    !selectedMeetingId ||
                    !isCurrentCloudRouteWorkspace ||
                    !canEndMeeting
                  }
                  title="End Meeting captures a Tactical History snapshot and closes this dated record for editing."
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEndingMeeting ? "Ending…" : "End Meeting"}
                </button>
              </div>
            )}

            {/* Group 2 (center): autosave chip */}
            {isCurrentCloudRouteWorkspace ? (
              <div
                ref={autosaveStatusDetailRef}
                className="relative sm:flex-1 sm:max-w-xs"
              >
                <button
                  type="button"
                  onClick={() => onToggleAutosaveStatusDetail()}
                  className={`flex w-full items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${autosaveSummaryChipClassName[autosaveSummaryStatus]}`}
                  aria-expanded={showAutosaveStatusDetail}
                  aria-label={`Autosave status: ${autosaveSummaryLabel[autosaveSummaryStatus]}. Show details.`}
                >
                  <span>{autosaveSummaryLabel[autosaveSummaryStatus]}</span>
                  <span className="text-xs opacity-70" aria-hidden="true">
                    ▾
                  </span>
                </button>

                {showAutosaveStatusDetail ? (
                  <div
                    className="absolute left-0 right-0 z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-xl sm:left-auto sm:right-auto sm:min-w-[22rem]"
                    role="region"
                    aria-label="Autosave status details"
                  >
                    <p className="font-semibold text-slate-800">
                      Autosave protects supported cloud sections. Manual Save
                      creates a full-workspace backup.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-slate-700">
                      <li>
                        <span className="font-semibold">Setup:</span>{" "}
                        {settingsAutosaveStatusLabel[settingsAutosaveStatus]}
                      </li>
                      <li>
                        <span className="font-semibold">Topics:</span>{" "}
                        {
                          strategicTopicsAutosaveStatusLabel[
                            strategicTopicsAutosaveStatus
                          ]
                        }
                      </li>
                      <li>
                        <span className="font-semibold">Agenda:</span>{" "}
                        {
                          agendaItemsAutosaveStatusLabel[
                            agendaItemsAutosaveStatus
                          ]
                        }
                      </li>
                      <li>
                        <span className="font-semibold">Notes &amp; comms:</span>{" "}
                        {
                          meetingNotesAutosaveStatusLabel[
                            meetingNotesAutosaveStatus
                          ]
                        }
                      </li>
                      <li>
                        <span className="font-semibold">Objectives &amp; SOOs:</span>{" "}
                        {
                          objectivesAutosaveStatusLabel[
                            objectivesAutosaveStatus
                          ]
                        }
                      </li>
                    </ul>
                    {autosaveSummaryStatus === "error" ? (
                      <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-800">
                        Autosave may have failed. Save a full backup now using
                        Manual Save.
                      </p>
                    ) : null}
                    {cloudMeetingMessage ? (
                      <p className="mt-3 text-slate-500">{cloudMeetingMessage}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={onReloadCloudBackup}
                      className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Reload cloud backup
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Group 3 (right): Manual Save + ☰ menu */}
            <div className="flex items-center gap-2 sm:ml-auto lg:ml-0">
              {isCurrentCloudRouteWorkspace ? (
                <button
                  type="button"
                  onClick={onManualSave}
                  disabled={isManualSaveInFlight}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {manualSaveLabel}
                </button>
              ) : null}

              <div ref={settingsMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => onToggleSettingsMenu()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white shadow-lg hover:bg-blue-700"
                  aria-expanded={showSettingsMenu}
                  aria-haspopup="menu"
                  aria-label="Open meeting menu"
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    ☰
                  </span>
                </button>

                {showSettingsMenu ? (
                  <div
                    className="absolute right-0 z-40 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl"
                    role="menu"
                    aria-label="Meeting menu"
                  >
                    {isAuthLoading ? (
                      <p className="px-5 py-3 text-sm font-semibold text-slate-500">
                        Checking account…
                      </p>
                    ) : authSession ? (
                      <>
                        <div className="border-b border-slate-100 px-5 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            User
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                            {authSession.user.email}
                          </p>
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => onToggleSettingsMenu()}
                          className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          role="menuitem"
                        >
                          Dashboard
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            onTacticalHistory();
                            onToggleSettingsMenu();
                          }}
                          className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          role="menuitem"
                        >
                          Tactical History
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangePassword();
                            onToggleSettingsMenu();
                          }}
                          className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          role="menuitem"
                        >
                          Change Password
                        </button>
                        {testingToolsEnabled ? (
                          <div className="border-t border-slate-100">
                            <label className="flex cursor-pointer items-center gap-3 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-50">
                              <input
                                type="checkbox"
                                checked={isTestingModeActive}
                                onChange={(event) =>
                                  onToggleTestingMode(event.target.checked)
                                }
                                className="h-4 w-4 rounded border-amber-300 text-amber-600"
                              />
                              Test Mode
                            </label>
                            {isTestingModeActive ? (
                              <div className="px-5 pb-3">
                                <input
                                  id="menu-test-meeting-date"
                                  type="date"
                                  required
                                  value={testingMeetingDate}
                                  onChange={(event) =>
                                    onTestingMeetingDateChange(event.target.value)
                                  }
                                  className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-slate-900"
                                  aria-label="Test meeting date"
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {/* Edit Playbook: organization_info is scoped per-meeting via
                            getWorkspaceScopedStorageKey and is already cloud-persisted
                            via meeting_settings through useWorkspacePersistence. Owner-only. */}
                        {isMeetingOwner ? (
                          <button
                            type="button"
                            onClick={() => {
                              onEditPlaybook();
                              onToggleSettingsMenu();
                            }}
                            className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                            role="menuitem"
                          >
                            Edit Playbook
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            onBackupRestore();
                            onToggleSettingsMenu();
                          }}
                          className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          role="menuitem"
                        >
                          Export Backup
                        </button>
                        <button
                          type="button"
                          onClick={onSignOut}
                          disabled={isSigningOut}
                          className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                          role="menuitem"
                        >
                          {isSigningOut ? "Signing out…" : "Sign Out"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onBackupRestore();
                            onToggleSettingsMenu();
                          }}
                          className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          role="menuitem"
                        >
                          Export Backup
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSignIn();
                            onToggleSettingsMenu();
                          }}
                          className="block w-full px-5 py-3 text-left text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          role="menuitem"
                        >
                          Sign In
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
