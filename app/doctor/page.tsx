"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Token, Session } from "@/types";
import { Activity, Clock, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  waiting: "badge-waiting",
  calling: "badge-calling",
  in_session: "badge-session",
  completed: "badge-completed",
};

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const [todayQueue, setTodayQueue] = useState<Token[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({ todayPatients: 0, completed: 0, waiting: 0, avgTime: 0 });
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const [queueRes, sessionsRes, activeRes] = await Promise.all([
      supabase
        .from("tokens")
        .select("*, patient:patients(full_name, id_card_number, date_of_birth, gender), service:services(name)")
        .eq("doctor_id", profile.id)
        .eq("date", today)
        .not("status", "eq", "completed")
        .not("status", "eq", "no_show")
        .order("issued_at", { ascending: true }),
      supabase
        .from("sessions")
        .select("*, patient:patients(full_name, id_card_number)")
        .eq("doctor_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("sessions")
        .select("*, patient:patients(full_name, id_card_number, date_of_birth, gender, medical_history, allergies)")
        .eq("doctor_id", profile.id)
        .eq("status", "in_progress")
        .single(),
    ]);

    const queue = (queueRes.data || []) as Token[];
    setTodayQueue(queue);
    setRecentSessions((sessionsRes.data || []) as Session[]);
    setActiveSession(activeRes.data as Session || null);

    const todaySessions = (sessionsRes.data || []).filter((s: any) => format(new Date(s.created_at), "yyyy-MM-dd") === today);
    const completed = todaySessions.filter((s: any) => s.status === "completed");
    const avgTime = completed.length > 0 ? completed.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) / completed.length : 0;

    setStats({
      todayPatients: queue.length + completed.length,
      completed: completed.length,
      waiting: queue.filter((t) => t.status === "waiting").length,
      avgTime: Math.round(avgTime),
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Dr. {profile?.full_name}</h1>
        <p className="page-subtitle">{profile?.specialization} · {format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {activeSession && (
        <div className="card p-4 border-[#10b981]/30 bg-[#10b981]/5" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="live-dot" />
              <div>
                <div className="text-sm font-semibold text-[#10b981]">Active Session</div>
                <div className="text-xs text-[#94a3b8]">Patient: {(activeSession as any).patient?.full_name}</div>
              </div>
            </div>
            <Link href="/doctor/sessions" className="btn-success py-1.5 text-xs">Continue Session →</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Patients", value: stats.todayPatients, icon: Users, color: "#4a9eff" },
          { label: "Waiting", value: stats.waiting, icon: Clock, color: "#f59e0b" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "#10b981" },
          { label: "Avg Session Time", value: `${stats.avgTime} min`, icon: Activity, color: "#a78bfa" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">{card.value}</div>
                <div className="text-xs text-[#94a3b8] mt-0.5">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Today's Queue</h2>
            <Link href="/doctor/sessions" className="text-xs text-[#4a9eff] hover:underline">Manage sessions →</Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {todayQueue.length === 0 ? (
              <div className="text-center py-10 text-[#475569] text-sm">No patients in queue</div>
            ) : todayQueue.map((token, i) => {
              const waitMin = token.issued_at ? Math.round((Date.now() - new Date(token.issued_at).getTime()) / 60000) : 0;
              return (
                <div key={token.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="w-7 h-7 rounded-full bg-[#4a9eff]/10 flex items-center justify-center text-xs font-semibold text-[#4a9eff]">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{(token as any).patient?.full_name}</div>
                    <div className="text-xs text-[#475569]">{(token as any).service?.name || token.category} · {waitMin} min wait</div>
                  </div>
                  <span className={STATUS_BADGE[token.status] || "badge-completed"}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {token.status.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Recent Sessions</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentSessions.length === 0 ? (
              <div className="text-center py-10 text-[#475569] text-sm">No sessions yet</div>
            ) : recentSessions.map((s) => (
              <div key={s.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{(s as any).patient?.full_name}</div>
                    <div className="text-xs text-[#475569] mt-0.5">{s.diagnosis ? s.diagnosis.substring(0, 50) + (s.diagnosis.length > 50 ? "..." : "") : "No diagnosis recorded"}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-xs text-[#475569]">{format(new Date(s.created_at), "MMM d")}</div>
                    {s.duration_minutes && <div className="text-xs text-[#94a3b8] mt-0.5">{s.duration_minutes} min</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
