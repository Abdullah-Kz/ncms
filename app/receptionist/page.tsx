"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Users, Clock, Activity, UserPlus } from "lucide-react";
import Link from "next/link";
import type { Token } from "@/types";
import { format } from "date-fns";

const STATUS_BADGE: Record<string, string> = {
  waiting: "badge-waiting",
  calling: "badge-calling",
  in_session: "badge-session",
  completed: "badge-completed",
  no_show: "badge-completed",
};

export default function ReceptionistDashboard() {
  const { profile } = useAuth();
  const [todayTokens, setTodayTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState({ total: 0, waiting: 0, inSession: 0, completed: 0 });

  useEffect(() => {
    fetchTodayTokens();
    const interval = setInterval(fetchTodayTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayTokens = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("tokens")
      .select("*, patient:patients(full_name, id_card_number), doctor:profiles!tokens_doctor_id_fkey(full_name)")
      .eq("date", today)
      .order("issued_at", { ascending: false })
      .limit(10);
    const tokens = (data || []) as Token[];
    setTodayTokens(tokens);
    setStats({
      total: tokens.length,
      waiting: tokens.filter((t) => t.status === "waiting").length,
      inSession: tokens.filter((t) => t.status === "in_session").length,
      completed: tokens.filter((t) => t.status === "completed").length,
    });
  };

  const callNext = async (tokenId: string) => {
    await supabase.from("tokens").update({ status: "calling", called_at: new Date().toISOString() }).eq("id", tokenId);
    fetchTodayTokens();
  };

  const STAT_CARDS = [
    { label: "Total Patients Today", value: stats.total, icon: Users, color: "#4a9eff" },
    { label: "Waiting", value: stats.waiting, icon: Clock, color: "#f59e0b", sub: "Est. wait ~12 min" },
    { label: "In Session", value: stats.inSession, icon: Activity, color: "#10b981" },
    { label: "Completed", value: stats.completed, icon: UserPlus, color: "#a78bfa" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Reception Overview</h1>
          <p className="page-subtitle">Managing patient flow and diagnostic queuing · {format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/receptionist/queue" className="btn-secondary">Assign Token</Link>
          <Link href="/receptionist/patients" className="btn-primary"><UserPlus size={15} /> Register Patient</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div>
                <div className="text-3xl font-semibold text-white">{String(card.value).padStart(2, "0")}</div>
                <div className="text-xs text-[#94a3b8] mt-0.5">{card.label}</div>
                {card.sub && <div className="text-xs text-[#475569] mt-0.5">{card.sub}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">Real-time Token Queue</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#10b981]">
              <div className="live-dot" />
              LIVE
            </div>
          </div>
          <Link href="/receptionist/queue" className="text-xs text-[#4a9eff] hover:underline">View full queue →</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <th className="table-head">Token #</th>
              <th className="table-head">Patient</th>
              <th className="table-head">Doctor</th>
              <th className="table-head">Category</th>
              <th className="table-head">Wait Time</th>
              <th className="table-head">Status</th>
              <th className="table-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {todayTokens.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-[#475569] text-sm">No tokens issued today</td></tr>
            ) : (
              todayTokens.slice(0, 6).map((token) => {
                const waited = token.issued_at
                  ? Math.round((Date.now() - new Date(token.issued_at).getTime()) / 60000)
                  : 0;
                return (
                  <tr key={token.id} className="table-row">
                    <td className="table-cell font-mono text-[#4a9eff] font-semibold">#{token.token_number}</td>
                    <td className="table-cell">
                      <div>
                        <div className="text-sm font-medium text-white">{(token as any).patient?.full_name || "—"}</div>
                        <div className="text-xs text-[#475569]">{(token as any).patient?.id_card_number}</div>
                      </div>
                    </td>
                    <td className="table-cell text-[#94a3b8] text-xs">{(token as any).doctor?.full_name || "—"}</td>
                    <td className="table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#94a3b8] uppercase tracking-wide">{token.category}</span>
                    </td>
                    <td className="table-cell text-[#94a3b8] text-sm">{waited} min</td>
                    <td className="table-cell">
                      <span className={STATUS_BADGE[token.status] || "badge-completed"}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {token.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="table-cell">
                      {token.status === "waiting" && (
                        <button onClick={() => callNext(token.id)} className="text-xs btn-secondary py-1 px-2">Call</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
