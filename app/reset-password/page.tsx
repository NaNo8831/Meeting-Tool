"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  isSupabaseConfigured,
  supabaseAuthClient,
} from "@/app/lib/supabaseClient";

type ResetSession = {
  accessToken: string;
  type: string | null;
};

const readRecoverySession = (): ResetSession | null => {
  if (typeof window === "undefined") return null;

  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, ""),
  );
  const queryParams = new URLSearchParams(window.location.search);
  const accessToken =
    hashParams.get("access_token") ?? queryParams.get("access_token");

  if (!accessToken) return null;

  return {
    accessToken,
    type: hashParams.get("type") ?? queryParams.get("type"),
  };
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [recoverySession, setRecoverySession] = useState<ResetSession | null>(
    null,
  );
  const [hasCheckedResetLink, setHasCheckedResetLink] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkResetLink = window.setTimeout(() => {
      const nextSession = readRecoverySession();
      setRecoverySession(nextSession);
      setHasCheckedResetLink(true);

      if (nextSession) {
        window.history.replaceState(null, "", "/reset-password");
      }
    }, 0);

    return () => window.clearTimeout(checkResetLink);
  }, []);

  const canSubmit = useMemo(
    () =>
      isSupabaseConfigured &&
      recoverySession !== null &&
      newPassword.length >= 6 &&
      newPassword === confirmPassword &&
      !isSubmitting,
    [confirmPassword, isSubmitting, newPassword, recoverySession],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!recoverySession) {
      setFeedback({
        type: "error",
        message:
          "This reset link is missing or expired. Request a new password reset email from the sign-in screen.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);

    try {
      await supabaseAuthClient.updatePassword(
        recoverySession.accessToken,
        newPassword,
      );
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({
        type: "success",
        message: "Password updated. Redirecting you to sign in…",
      });
      window.setTimeout(() => router.replace("/"), 1500);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update password. Request a new reset link and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)]" />
      <div className="absolute inset-0 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Supabase Auth
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Reset Password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Enter a new password for your Meeting Tool account. Password reset
          links expire, so request a new link if this page cannot verify your
          reset session.
        </p>

        {!isSupabaseConfigured ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Supabase Auth is not configured for this environment. Add the
            Supabase public URL and anon key before resetting a password.
          </div>
        ) : !hasCheckedResetLink ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Checking your reset link…
          </div>
        ) : !recoverySession ? (
          <div className="mt-5 space-y-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>
              This reset link is missing or expired. Request a new password
              reset email from the sign-in screen.
            </p>
            <Link
              href="/"
              className="inline-flex rounded-full bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {recoverySession.type && recoverySession.type !== "recovery" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                This link was opened with a {recoverySession.type} auth session.
                Continue only if you intended to reset your password.
              </div>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                New password
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="New password"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Confirm password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Confirm password"
              />
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-full bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating password…" : "Update password"}
            </button>
            <Link
              href="/"
              className="block w-full rounded-full border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to sign in
            </Link>
          </form>
        )}

        {feedback ? (
          <div
            className={`mt-4 rounded-2xl border p-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
