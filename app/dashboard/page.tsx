"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/app/hooks/useSupabaseAuth";

export default function DashboardPage() {
  const router = useRouter();
  const { session, isLoading } = useSupabaseAuth();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/");
    }
  }, [isLoading, router, session]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Dashboard placeholder
        </h1>
        <p className="mt-3 text-slate-600">
          Full dashboard is intentionally out of scope for this sprint.
        </p>

        <div className="mt-6">
          <Link
            href="/meeting/local"
            className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Open active meeting workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
