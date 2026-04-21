"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && (!profile || profile.role !== "doctor")) router.push("/auth/login");
  }, [profile, loading, router]);
  if (loading || !profile) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" /></div>;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
