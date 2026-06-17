"use client";

import { useState, type FormEvent } from "react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";

type ProfileSetupModalProps = {
  accessToken: string;
  userId: string;
  onComplete: () => void;
  onSave: (firstName: string, lastName: string) => Promise<void>;
};

export function ProfileSetupModal({
  onComplete,
  onSave,
}: ProfileSetupModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useBodyScrollLock(true);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setError("Both fields are required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSave(trimmedFirst, trimmedLast);
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your name. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome — tell us your name
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          This is how you&apos;ll appear to collaborators.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              First Name
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="First name"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Last Name
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Last name"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
