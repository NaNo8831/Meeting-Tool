"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)]" />
      <div className="absolute inset-0 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        {/* Auth modal is the only entry point — modal cannot be closed. */}
        <AuthModal
          isOpen={true}
          isConfigured={isConfigured}
          isLoading={isLoading}
          session={session}
          onClose={() => undefined}
          onSignIn={signIn}
          onSignUp={signUp}
          onRequestPasswordReset={requestPasswordReset}
          onSignOut={signOut}
          onContinueLocally={() => router.push("/meeting/local")}
        />
      </div>
    </main>
  );
}
