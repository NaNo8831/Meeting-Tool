"use client";

import { useState, type FormEvent } from "react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import type { SupabaseAuthSession } from "@/app/lib/supabaseClient";

type AuthMode = "signIn" | "signUp" | "forgotPassword";

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
  onRequestPasswordReset: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onContinueLocally?: () => void;
};

export function AuthModal({
  isOpen,
  isConfigured,
  isLoading,
  session,
  onClose,
  onSignIn,
  onSignUp,
  onRequestPasswordReset,
  onSignOut,
  onContinueLocally,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (mode === "signIn") {
        await onSignIn(email.trim(), password);
        setFeedback({ type: "success", message: "Signed in successfully." });
        setPassword("");
      } else if (mode === "signUp") {
        const nextSession = await onSignUp(email.trim(), password);
        setMode("signIn");
        setFeedback({
          type: "success",
          message: nextSession
            ? "Account created and signed in."
            : "Account created. Check your email if confirmation is required before signing in.",
        });
        setPassword("");
      } else {
        await onRequestPasswordReset(email.trim());
        setForgotPasswordSent(true);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
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
            <h2 className="text-2xl font-bold text-slate-900">
              {session
                ? "Account"
                : mode === "signIn"
                  ? "Sign In"
                  : mode === "signUp"
                    ? "Sign Up"
                    : "Reset Password"}
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
            Supabase Auth is not configured for this environment. Add
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
              You&apos;re signed in. Your meetings are saved to the cloud.
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
        ) : forgotPasswordSent ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✓
            </div>
            <p className="font-semibold text-slate-900">Check your email</p>
            <p className="text-sm text-slate-600">
              If an account exists for {email || "that address"}, a password
              reset link has been sent.
            </p>
            <button
              type="button"
              onClick={() => {
                setForgotPasswordSent(false);
                setMode("signIn");
                setEmail("");
                setFeedback(null);
              }}
              className="w-full rounded-full border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Sign In
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
            {mode === "forgotPassword" ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                Enter your account email and we&apos;ll send a password reset
                link if an account exists.
              </div>
            ) : (
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
                {mode === "signUp" ? (
                  <span className="mt-1 block text-xs text-slate-500">
                    Minimum 6 characters.
                  </span>
                ) : null}
              </label>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full rounded-full bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? mode === "signIn"
                  ? "Signing in…"
                  : mode === "signUp"
                    ? "Creating account…"
                    : "Sending reset link…"
                : mode === "signIn"
                  ? "Sign In"
                  : mode === "signUp"
                    ? "Sign Up"
                    : "Send reset link"}
            </button>
            {mode === "signIn" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("forgotPassword");
                  setPassword("");
                  setFeedback(null);
                }}
                className="w-full text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Forgot password?
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signIn" ? "signUp" : "signIn");
                setPassword("");
                setFeedback(null);
              }}
              className="w-full rounded-full border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              {mode === "signIn"
                ? "Need an account? Sign Up"
                : "Have an account? Sign In"}
            </button>
            {onContinueLocally ? (
              <p className="text-center text-xs text-slate-400">
                <button
                  type="button"
                  onClick={onContinueLocally}
                  className="underline hover:text-slate-600"
                >
                  Continue without an account (browser only)
                </button>
              </p>
            ) : null}
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
