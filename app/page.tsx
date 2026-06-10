"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/app/components/auth/AuthModal";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";

export default function LandingPage() {
  const router = useRouter();
  const {
    session,
    isConfigured,
    isLoading,
    signIn,
    signOut,
    signUp,
    requestPasswordReset,
  } = useSupabaseAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)]" />
      <div className="absolute inset-0 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md space-y-4">
        <AuthModal
          isOpen={isAuthModalOpen}
          isConfigured={isConfigured}
          isLoading={isLoading}
          session={session}
          onClose={() => setIsAuthModalOpen(false)}
          onSignIn={signIn}
          onSignUp={signUp}
          onRequestPasswordReset={requestPasswordReset}
          onSignOut={signOut}
          onContinueLocally={() => router.push("/meeting/local")}
        />

        <div className="rounded-3xl border border-white/20 bg-white/10 p-5 text-center text-white shadow-xl backdrop-blur-md">
          <h1 className="text-lg font-semibold">Meeting Tool by LyArk</h1>
          <p className="mt-2 text-sm text-slate-200">
            Sign in for Cloud Meetings or use the browser-only Local Workspace.
          </p>
          <button
            type="button"
            onClick={() => router.push("/meeting/local")}
            className="mt-4 w-full rounded-full border border-white/40 px-4 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Continue locally — browser only
          </button>
        </div>
      </div>
    </main>
  );
}
