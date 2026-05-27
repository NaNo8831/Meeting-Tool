"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseAuthSession } from "@/app/lib/supabaseClient";

type AuthMode = "signIn" | "signUp";

type AuthModalProps = {
  isOpen: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  session: SupabaseAuthSession | null;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<SupabaseAuthSession>;
  onSignUp: (
    email: string,
    password: string,
  ) => Promise<SupabaseAuthSession | null>;
  onSignOut: () => Promise<void>;
};

export function AuthModal({
  isOpen,
  isConfigured,
  isLoading,
  session,
  onClose,
  onSignIn,
  onSignUp,
  onSignOut,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (mode === "signIn") {
        await onSignIn(email.trim(), password);
        setFeedback({ type: "success", message: "Signed in successfully." });
      } else {
        const nextSession = await onSignUp(email.trim(), password);
        setMode("signIn");
        setFeedback({
          type: "success",
          message: nextSession
            ? "Account created and signed in."
            : "Account created. Check your email if confirmation is required before signing in.",
        });
      }
      setPassword("");
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Supabase Auth request failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      await onSignOut();
      setFeedback({ type: "success", message: "Signed out successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to sign out cleanly. Local session was cleared.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Account Access
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {session ? "Account" : mode === "signIn" ? "Sign In" : "Sign Up"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close authentication panel"
          >
            ×
          </button>
        </div>

        {!isConfigured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Sign-in is not configured for this environment. Add
            <code className="mx-1 rounded bg-white/70 px-1">
              NEXT_PUBLIC_SUPABASE_URL
            </code>
            and
            <code className="mx-1 rounded bg-white/70 px-1">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            locally or in Vercel to enable sign in.
          </div>
        ) : session ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Signed in as</p>
              <p className="mt-1 break-all text-lg font-semibold text-slate-900">
                {session.user.email}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Workspace data stays in this browser for now. Signing in lets you
              connect to cloud meetings, but doesn&apos;t auto-merge local data.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSubmitting || isLoading}
              className="w-full rounded-full bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Password"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full rounded-full bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? mode === "signIn"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "signIn"
                  ? "Sign In"
                  : "Sign Up"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signIn" ? "signUp" : "signIn");
                setFeedback(null);
              }}
              className="w-full rounded-full border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              {mode === "signIn"
                ? "Need an account? Sign Up"
                : "Have an account? Sign In"}
            </button>
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
    </div>
  );
}
