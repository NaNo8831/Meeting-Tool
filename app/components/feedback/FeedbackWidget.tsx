"use client";

import { useState, type FormEvent } from "react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import {
  isSupabaseConfigured,
  supabaseFeedbackClient,
  type SupabaseAuthSession,
  type SupabaseFeedbackSeverity,
  type SupabaseFeedbackType,
} from "@/app/lib/supabaseClient";

const feedbackTypes: SupabaseFeedbackType[] = [
  "Bug",
  "UX Friction",
  "Suggestion",
  "Confusing Workflow",
];

const feedbackSeverities: SupabaseFeedbackSeverity[] = ["Minor", "Blocking"];

const appVersion =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  null;

type FeedbackWidgetProps = {
  session: SupabaseAuthSession | null;
  onCollectWorkspaceSnapshot: () => Record<string, unknown>;
};

type FeedbackMessage = {
  type: "success" | "error";
  message: string;
};

const getPageLocation = () => {
  if (typeof window === "undefined") return "";

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const getBrowserInfo = () => {
  if (typeof window === "undefined") return "";

  return window.navigator.userAgent;
};

export function FeedbackWidget({
  session,
  onCollectWorkspaceSnapshot,
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] =
    useState<SupabaseFeedbackType>("Bug");
  const [severity, setSeverity] = useState<SupabaseFeedbackSeverity>("Minor");
  const [note, setNote] = useState("");
  const [intent, setIntent] = useState("");
  const [includeWorkspaceSnapshot, setIncludeWorkspaceSnapshot] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] =
    useState<FeedbackMessage | null>(null);
  useBodyScrollLock(isOpen);

  const resetForm = () => {
    setFeedbackType("Bug");
    setSeverity("Minor");
    setNote("");
    setIntent("");
    setIncludeWorkspaceSnapshot(false);
  };

  const closeModal = () => {
    if (isSubmitting) return;

    setIsOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setFeedbackMessage({
        type: "error",
        message: "Add a short note before sending feedback.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    let workspaceSnapshot: Record<string, unknown> | null = null;
    let snapshotError: string | null = null;

    if (includeWorkspaceSnapshot) {
      try {
        workspaceSnapshot = onCollectWorkspaceSnapshot();
      } catch (error) {
        snapshotError =
          error instanceof Error
            ? error.message
            : "Workspace snapshot could not be collected.";
      }
    }

    try {
      await supabaseFeedbackClient.submitFeedback({
        accessToken: session?.accessToken,
        feedback: {
          user_id: session?.user.id ?? null,
          user_email: session?.user.email ?? null,
          type: feedbackType,
          severity,
          note: trimmedNote,
          intent: intent.trim() || null,
          page: getPageLocation(),
          browser: getBrowserInfo(),
          app_version: appVersion,
          workspace_snapshot: workspaceSnapshot,
          metadata_json: {
            submitted_at: new Date().toISOString(),
            snapshot_requested: includeWorkspaceSnapshot,
            snapshot_error: snapshotError,
            auth_state: session ? "authenticated" : "anonymous",
          },
        },
      });

      setFeedbackMessage({
        type: "success",
        message: snapshotError
          ? "Feedback sent. Workspace snapshot was skipped."
          : "Feedback sent. Thank you!",
      });
      resetForm();
      window.setTimeout(() => setIsOpen(false), 900);
    } catch (error) {
      setFeedbackMessage({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Feedback could not be sent. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setFeedbackMessage(null);
        }}
        className="fixed bottom-5 right-5 z-30 rounded-full border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Open feedback form"
      >
        Feedback
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 px-4 py-6 sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Phase 2 Feedback
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Send quick feedback
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Lightweight tester notes only — not a ticket workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close feedback form"
              >
                ×
              </button>
            </div>

            {!isSupabaseConfigured ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Supabase is not configured in this environment, so feedback
                cannot be submitted here.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    Feedback Type
                  </span>
                  <select
                    value={feedbackType}
                    onChange={(event) =>
                      setFeedbackType(event.target.value as SupabaseFeedbackType)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {feedbackTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    Severity
                  </span>
                  <select
                    value={severity}
                    onChange={(event) =>
                      setSeverity(event.target.value as SupabaseFeedbackSeverity)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {feedbackSeverities.map((severityOption) => (
                      <option key={severityOption} value={severityOption}>
                        {severityOption}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Feedback Note
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="What happened, felt confusing, or could be better?"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  What were you trying to do? <span className="font-normal text-slate-500">Optional</span>
                </span>
                <input
                  type="text"
                  value={intent}
                  onChange={(event) => setIntent(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Example: prepare the weekly leadership meeting"
                />
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeWorkspaceSnapshot}
                  onChange={(event) =>
                    setIncludeWorkspaceSnapshot(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
                />
                <span>
                  <span className="font-semibold">
                    Include current workspace snapshot
                  </span>
                  <span className="block text-slate-500">
                    Optional localStorage JSON to help reproduce the issue.
                  </span>
                </span>
              </label>

              {feedbackMessage ? (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    feedbackMessage.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {feedbackMessage.message}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-500 px-5 py-2 font-semibold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isSupabaseConfigured}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Sending…" : "Send Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
