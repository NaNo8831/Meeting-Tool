"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isSupabaseConfigured,
  supabaseAuthClient,
  type SupabaseAuthSession,
} from "@/app/lib/supabaseClient";

const authSessionStorageKey = "meeting-tool-supabase-auth-session";
const sessionRefreshBufferSeconds = 60;

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

export const useSupabaseAuth = () => {
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveSession = useCallback((nextSession: SupabaseAuthSession | null) => {
    writeStoredSession(nextSession);
    setSession(nextSession);
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
        const shouldRefresh =
          storedSession.expiresAt <=
          Math.floor(Date.now() / 1000) + sessionRefreshBufferSeconds;
        const nextSession = shouldRefresh
          ? await supabaseAuthClient.refreshSession(storedSession.refreshToken)
          : {
              ...storedSession,
              user: await supabaseAuthClient.getUser(storedSession.accessToken),
            };

        saveSession(nextSession);
      } catch {
        saveSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, [saveSession]);

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
    signOut,
  };
};
