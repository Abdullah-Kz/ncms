"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.push("/auth/login");
    } else {
      const routes: Record<string, string> = {
        admin: "/admin",
        receptionist: "/receptionist",
        doctor: "/doctor",
      };
      router.push(routes[profile.role] || "/auth/login");
    }
  }, [profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#4a9eff] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#94a3b8] text-sm">Loading NCMS...</p>
      </div>
    </div>
  );
}
