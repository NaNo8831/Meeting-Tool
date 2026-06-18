"use client";

import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";

const glossaryTerms = [
  {
    term: "Strategic Topics",
    definition:
      "Longer-term themes your team tracks across multiple meetings.",
  },
  {
    term: "Cascading Communications",
    definition:
      "Key messages to share with your broader organization after the meeting.",
  },
  {
    term: "Defining Objectives (DOs)",
    definition:
      "The critical outcomes your team is committed to achieving.",
  },
  {
    term: "Standard Operating Objectives (SOOs)",
    definition:
      "Ongoing metrics and targets your team monitors each meeting.",
  },
  {
    term: "Tactical History",
    definition: "A record of all past meetings and their outcomes.",
  },
];

type HelpPanelProps = {
  onClose: () => void;
};

export function HelpPanel({ onClose }: HelpPanelProps) {
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
          <section>
            <h3 className="text-base font-bold uppercase tracking-wide text-slate-500">
              Quick Start
            </h3>
            <ol className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  1
                </span>
                <span className="text-sm text-slate-700">Create a meeting</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  2
                </span>
                <span className="text-sm text-slate-700">
                  Run it with your team
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  3
                </span>
                <span className="text-sm text-slate-700">
                  Review outcomes and follow up
                </span>
              </li>
            </ol>
          </section>

          <section>
            <h3 className="text-base font-bold uppercase tracking-wide text-slate-500">
              Feature Glossary
            </h3>
            <dl className="mt-4 space-y-4">
              {glossaryTerms.map(({ term, definition }) => (
                <div key={term}>
                  <dt className="text-sm font-semibold text-slate-900">
                    {term}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-600">{definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
