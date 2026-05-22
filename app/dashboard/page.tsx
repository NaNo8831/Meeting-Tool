"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";
import {
  isSupabaseConfigured,
  supabaseMeetingClient,
  type SupabaseMeeting,
} from "@/app/lib/supabaseClient";

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
  const [meetings, setMeetings] = useState<SupabaseMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [newMeetingName, setNewMeetingName] = useState("");
  const [message, setMessage] = useState("");

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

  const handleCreateMeeting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || isCreatingMeeting) return;

    const trimmedName = newMeetingName.trim();
    if (!trimmedName) {
      setMessage("Name the meeting before creating it.");
      return;
    }

    setIsCreatingMeeting(true);
    setMessage("");

    try {
      const meeting = await supabaseMeetingClient.createWorkspace({
        accessToken: session.accessToken,
        ownerId: session.user.id,
        name: trimmedName,
      });

      setMeetings((currentMeetings) => [meeting, ...currentMeetings]);
      setNewMeetingName("");
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Team</h1>
          <p className="mt-1 text-base text-slate-600">{teamName}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={handleCreateMeeting}
            >
              <input
                type="text"
                value={newMeetingName}
                onChange={(event) => setNewMeetingName(event.target.value)}
                placeholder="Create a recurring meeting"
                maxLength={80}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="submit"
                disabled={isCreatingMeeting}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingMeeting ? "Creating…" : "Create Meeting"}
              </button>
            </form>

            <Link
              href="/meeting/local"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Continue Locally
            </Link>
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
        </header>

        <section className="space-y-3">
          {isLoadingMeetings ? (
            <p className="text-sm text-slate-500">Loading meetings…</p>
          ) : meetings.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 shadow-sm">
              No meetings yet. Create your first recurring meeting above.
            </p>
          ) : (
            meetings.map((meeting) => (
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

                <div className="flex items-center gap-2">
                  <Link
                    href={`/meeting/${meeting.id}`}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600"
                    aria-label={`More options for ${meeting.name}`}
                  >
                    More
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        {message ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
