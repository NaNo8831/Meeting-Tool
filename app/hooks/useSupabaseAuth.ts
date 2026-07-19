"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPasswordResetRedirectUrl,
  isRefreshTokenRejected,
  isSupabaseConfigured,
  supabaseAuthClient,
  type SupabaseAuthSession,
} from "@/app/lib/supabaseClient";

const authSessionStorageKey = "meeting-tool-supabase-auth-session";
const sessionRefreshBufferSeconds = 60;

// How long to wait before retrying after a transient renewal failure (network
// blip, Supabase 5xx). Short enough to recover well inside the remaining token
// lifetime, long enough not to hammer a struggling endpoint.
const sessionRefreshRetryDelayMs = 30_000;

// setTimeout stores its delay in a signed 32-bit int; anything larger wraps
// around and fires immediately. Sessions are ~1 hour so this is defensive only.
const maxTimeoutDelayMs = 2_147_483_647;

const readStoredSession = () => {
  if (typeof window === "undefined") return null;

  const storedSession = window.localStorage.getItem(authSessionStorageKey);
  if (storedSession === null) return null;

  try {
    return JSON.parse(storedSession) as SupabaseAuthSession;
  } catch {
    window.localStorage.removeItem(authSessionStorageKey);
    return null;
  }
};

const writeStoredSession = (session: SupabaseAuthSession | null) => {
  if (typeof window === "undefined") return;

  if (session === null) {
    window.localStorage.removeItem(authSessionStorageKey);
    return;
  }

  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
};

// ---------------------------------------------------------------------------
// Module-scope session coordination
//
// useSupabaseAuth is called from three places (app/page.tsx,
// app/dashboard/page.tsx, MeetingWorkspace.tsx). Each call is an independent
// hook instance with its own React state, but all of them share one
// localStorage key and one Supabase session.
//
// The state below is deliberately module-scope so those instances coordinate:
//   - refresh is single-flight, so two instances can never redeem the same
//     refresh token concurrently (Supabase invalidates a token redeemed twice,
//     which would sign the user out mid-meeting — worse than the bug this
//     sprint fixes);
//   - a session published by any instance is broadcast to all of them, so no
//     instance is left holding a stale access token.
// ---------------------------------------------------------------------------

let inFlightSessionRefresh: Promise<SupabaseAuthSession> | null = null;

const sessionSubscribers = new Set<
  (session: SupabaseAuthSession | null) => void
>();

const publishSession = (session: SupabaseAuthSession | null) => {
  writeStoredSession(session);
  sessionSubscribers.forEach((subscriber) => subscriber(session));
};

const getSecondsUntilExpiry = (session: SupabaseAuthSession) =>
  session.expiresAt - Math.floor(Date.now() / 1000);

const isSessionWithinRefreshBuffer = (session: SupabaseAuthSession) =>
  getSecondsUntilExpiry(session) <= sessionRefreshBufferSeconds;

const isSessionExpired = (session: SupabaseAuthSession) =>
  getSecondsUntilExpiry(session) <= 0;

/**
 * Renew the stored session, coalescing concurrent callers onto one request.
 *
 * Every caller — the mount load, the scheduled timer, the visibility handler,
 * and the autosave retry path — goes through here, so only one refresh token
 * redemption is ever in flight. Returns null when there is no stored session.
 * Throws when the refresh fails; callers decide whether that warrants signing
 * out (see isRefreshTokenRejected).
 */
export const refreshStoredSession =
  async (): Promise<SupabaseAuthSession | null> => {
    if (inFlightSessionRefresh !== null) return inFlightSessionRefresh;

    const storedSession = readStoredSession();
    if (storedSession === null) return null;

    inFlightSessionRefresh = (async () => {
      try {
        const nextSession = await supabaseAuthClient.refreshSession(
          storedSession.refreshToken,
        );

        // The user may have signed out while this was in flight. Publishing
        // here would resurrect a session they deliberately ended.
        if (readStoredSession() !== null) {
          publishSession(nextSession);
        }

        return nextSession;
      } finally {
        inFlightSessionRefresh = null;
      }
    })();

    return inFlightSessionRefresh;
  };

export const useSupabaseAuth = () => {
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<SupabaseAuthSession | null>(null);

  const saveSession = useCallback((nextSession: SupabaseAuthSession | null) => {
    publishSession(nextSession);
  }, []);

  // Mirror module-level session changes into this instance's React state, so a
  // renewal performed by any instance (or by the autosave retry path) is seen
  // by all of them.
  useEffect(() => {
    const subscriber = (nextSession: SupabaseAuthSession | null) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
    };

    sessionSubscribers.add(subscriber);
    return () => {
      sessionSubscribers.delete(subscriber);
    };
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      const storedSession = readStoredSession();
      if (storedSession === null) {
        setIsLoading(false);
        return;
      }

      try {
        if (isSessionWithinRefreshBuffer(storedSession)) {
          await refreshStoredSession();
        } else {
          publishSession({
            ...storedSession,
            user: await supabaseAuthClient.getUser(storedSession.accessToken),
          });
        }
      } catch (error) {
        // Only end the session when it is genuinely unusable. A transient
        // failure against a still-valid token must not sign the user out; the
        // scheduler below will retry.
        if (isRefreshTokenRejected(error) || isSessionExpired(storedSession)) {
          publishSession(null);
        } else {
          publishSession(storedSession);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, []);

  // Keep the access token fresh for as long as the tab is open.
  //
  // Re-runs whenever the session changes, so each successful renewal schedules
  // the next one from the new expiresAt. Timers are cleared on unmount and
  // before every reschedule, so navigating between dashboard and workspace
  // cannot accumulate them.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (session === null) return;

    let isCancelled = false;

    const clearRefreshTimer = () => {
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    const runRefresh = async () => {
      if (isCancelled) return;

      try {
        await refreshStoredSession();
      } catch (error) {
        if (isCancelled) return;

        if (isRefreshTokenRejected(error)) {
          publishSession(null);
          return;
        }

        // Transient failure. The current token may still be valid, so keep the
        // session and try again shortly rather than signing the user out.
        clearRefreshTimer();
        refreshTimerRef.current = setTimeout(() => {
          void runRefresh();
        }, sessionRefreshRetryDelayMs);
      }
    };

    // Scheduled from the session's own expiresAt rather than a fixed interval,
    // so it stays correct if Supabase returns a different expires_in.
    const scheduleRefresh = () => {
      clearRefreshTimer();

      const refreshAtMs =
        (session.expiresAt - sessionRefreshBufferSeconds) * 1000;
      const delayMs = Math.min(
        Math.max(0, refreshAtMs - Date.now()),
        maxTimeoutDelayMs,
      );

      refreshTimerRef.current = setTimeout(() => {
        void runRefresh();
      }, delayMs);
    };

    scheduleRefresh();

    // A laptop that suspends, or a background tab whose timers are throttled,
    // can wake up already past expiry. Re-check on every return to visibility.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const currentSession = sessionRef.current;
      if (currentSession === null) return;

      if (isSessionWithinRefreshBuffer(currentSession)) {
        void runRefresh();
      } else {
        scheduleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      clearRefreshTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      const nextSession = await supabaseAuthClient.signUp(email, password);
      saveSession(nextSession);
      return nextSession;
    },
    [saveSession],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const nextSession = await supabaseAuthClient.signIn(email, password);
      saveSession(nextSession);
      return nextSession;
    },
    [saveSession],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await supabaseAuthClient.requestPasswordReset(
      email,
      getPasswordResetRedirectUrl(),
    );
  }, []);

  const signOut = useCallback(async () => {
    const currentAccessToken = session?.accessToken;
    saveSession(null);

    if (currentAccessToken) {
      await supabaseAuthClient.signOut(currentAccessToken);
    }
  }, [saveSession, session?.accessToken]);

  return {
    session,
    isConfigured: isSupabaseConfigured,
    isLoading,
    signUp,
    signIn,
    requestPasswordReset,
    signOut,
  };
};
