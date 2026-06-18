"use client";

import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";

type HelpPanelProps = {
  onClose: () => void;
  mode?: "dashboard" | "workspace";
};

export function HelpPanel({ onClose, mode = "dashboard" }: HelpPanelProps) {
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-slate-900/40 p-4 sm:items-center sm:justify-end sm:p-6"
      onMouseDown={onClose}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:h-auto"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">Help</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close help panel"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-8">
          {mode === "dashboard" ? (
            <>
              <section>
                <h3 className="text-base font-bold uppercase tracking-wide text-slate-500">
                  Quick Start
                </h3>
                <ol className="mt-4 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      1
                    </span>
                    <span className="text-sm text-slate-700">Create a meeting using the input at the top</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      2
                    </span>
                    <span className="text-sm text-slate-700">Run it with your team</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      3
                    </span>
                    <span className="text-sm text-slate-700">Review outcomes and follow up</span>
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="text-base font-bold uppercase tracking-wide text-slate-500">
                  Your Dashboard
                </h3>
                <ul className="mt-4 space-y-3">
                  {[
                    { label: "Your Meetings", detail: "meetings you own and created" },
                    { label: "Shared with You", detail: "meetings others have invited you to" },
                    { label: "Open", detail: "enter the meeting workspace" },
                    { label: "Members", detail: "manage who has access to this meeting" },
                    { label: "Actions", detail: "archive, duplicate, or view tactical history" },
                    { label: "Archived meetings", detail: "show Restore and Delete buttons" },
                    { label: "Restore from Backup", detail: "create a new meeting from a saved backup file (Settings menu)" },
                  ].map(({ label, detail }) => (
                    <li key={label} className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{label}:</span>{" "}
                      {detail}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}

          {mode === "workspace" ? (
            <>
              <section>
                <h3 className="text-base font-bold uppercase tracking-wide text-slate-500">
                  Feature Glossary
                </h3>
                <ul className="mt-4 space-y-3">
                  {[
                    { label: "Strategic Topics", detail: "longer-term themes your team tracks across multiple meetings" },
                    { label: "Cascading Communications", detail: "key messages to share with your broader organization after the meeting" },
                    { label: "Defining Objectives (DOs)", detail: "the critical outcomes your team is committed to achieving" },
                    { label: "Standard Operating Objectives (SOOs)", detail: "ongoing metrics and targets your team monitors each meeting" },
                    { label: "Tactical History", detail: "a record of all past meetings and their outcomes" },
                  ].map(({ label, detail }) => (
                    <li key={label} className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{label}:</span>{" "}
                      {detail}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-base font-bold uppercase tracking-wide text-slate-500">
                  This Workspace
                </h3>
                <ul className="mt-4 space-y-3">
                  {[
                    { label: "Start Meeting", detail: "begins the active meeting session" },
                    { label: "End Meeting", detail: "closes the meeting and locks notes" },
                    { label: "Manual Save", detail: "forces an immediate full workspace save" },
                    { label: "Settings menu (☰)", detail: "Edit Playbook, Export Backup, Tactical History, Change Password" },
                    { label: "Agenda Items", detail: "promote to Strategic Topic to track longer term" },
                    { label: "Test Mode", detail: "simulate a meeting on a different date" },
                  ].map(({ label, detail }) => (
                    <li key={label} className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{label}:</span>{" "}
                      {detail}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
