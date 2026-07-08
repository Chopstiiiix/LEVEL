"use client";
import type { DashboardData } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import Dashboard from "./Dashboard";
import LoginScreen from "./LoginScreen";

export default function Shell({ initial }: { initial: DashboardData }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen relative z-10 flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-mute">
          <span className="livedot" />
          <span className="num text-[12px] tracking-wide">LOADING TERMINAL…</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  // session exists but profile still resolving on first paint
  if (!profile) {
    return (
      <div className="min-h-screen relative z-10 flex items-center justify-center">
        <div className="num text-[12px] text-ink-mute">resolving access…</div>
      </div>
    );
  }

  return <Dashboard initial={initial} />;
}
