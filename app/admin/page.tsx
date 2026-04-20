"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Users, Stethoscope, Activity, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import Link from "next/link";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ doctors: 0, receptionists: 0, patients: 0, sessions: 0 });
  const [sessionData, setSessionData] = useState<{ day: string; sessions: number }[]>([]);
  const [topDoctors, setTopDoctors] = useState<{ name: string; sessions: number }[]>([]);
  const [recentPatients, setRecentPatients] = useState<{ id: string; full_name: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchSessionTrend(), fetchTopDoctors(), fetchRecentPatients()]);
    setLoading(false);
  };

  // Fix 4: Use .select("id") and data.length — avoids RLS issues with count queries
  const fetchStats = async () => {
    const [doctorsRes, recepRes, patientsRes, sessionsRes] = await Promise.all([
      supabase.from("profiles").select("id").eq("role", "doctor").eq("is_active", true),
      supabase.from("profiles").select("id").eq("role", "receptionist").eq("is_active", true),
      supabase.from("patients").select("id"),
      supabase.from("sessions").select("id").eq("status", "completed"),
    ]);
    setStats({
      doctors: (doctorsRes.data || []).length,
      receptionists: (recepRes.data || []).length,
      patients: (patientsRes.data || []).length,
      sessions: (sessionsRes.data || []).length,
    });
  };

  const fetchSessionTrend = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("created_at")
      .gte("created_at", subDays(new Date(), 6).toISOString());

    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    const results = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const count = (data || []).filter((s) => format(new Date(s.created_at), "yyyy-MM-dd") === dayStr).length;
      return { day: format(day, "EEE"), sessions: count };
    });
    setSessionData(results);
  };

  const fetchTopDoctors = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("doctor_id, doctor:profiles!sessions_doctor_id_fkey(full_name)")
      .eq("status", "completed");

    if (!data) return;
    const counts: Record<string, { name: string; count: number }> = {};
    data.forEach((s: any) => {
      const name = s.doctor?.full_name || "Unknown";
      if (!counts[s.doctor_id]) counts[s.doctor_id] = { name, count: 0 };
      counts[s.doctor_id].count++;
    });
    setTopDoctors(
      Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5).map((d) => ({ name: d.name, sessions: d.count }))
    );
  };

  const fetchRecentPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentPatients(data || []);
  };

  const STAT_CARDS = [
    { label: "Active Doctors", value: stats.doctors, icon: Stethoscope, color: "#10b981" },
    { label: "Receptionists", value: stats.receptionists, icon: Users, color: "#4a9eff" },
    { label: "Total Patients", value: stats.patients, icon: Users, color: "#f59e0b" },
    { label: "Completed Sessions", value: stats.sessions, icon: Activity, color: "#a78bfa" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="card p-3 text-xs">
          <p className="text-[#94a3b8]">{label}</p>
          <p className="text-[#4a9eff] font-semibold">{payload[0].value} sessions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Welcome back, {profile?.full_name}. Here&apos;s your system overview.</p>
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
                {loading
                  ? <div className="w-10 h-7 bg-white/[0.06] rounded animate-pulse" />
                  : <div className="text-2xl font-semibold text-white">{card.value.toLocaleString()}</div>
                }
                <div className="text-xs text-[#94a3b8] mt-0.5">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-1">Session Trends</h2>
          <p className="text-xs text-[#475569] mb-4">Last 7 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sessionData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sessions" fill="#4a9eff" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Doctors</h2>
          {topDoctors.length === 0 ? (
            <p className="text-xs text-[#475569] text-center py-8">No completed sessions yet</p>
          ) : (
            <div className="space-y-3">
              {topDoctors.map((doc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#4a9eff]/10 flex items-center justify-center text-[10px] font-semibold text-[#4a9eff] flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{doc.name}</div>
                    <div className="mt-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4a9eff] rounded-full" style={{ width: `${(doc.sessions / (topDoctors[0]?.sessions || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-xs text-[#94a3b8]">{doc.sessions}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Registrations</h2>
            <Link href="/admin/reports" className="text-xs text-[#4a9eff] hover:underline">View all</Link>
          </div>
          {recentPatients.length === 0 ? (
            <p className="text-xs text-[#475569] text-center py-8">No patients registered yet</p>
          ) : (
            <div className="space-y-1">
              {recentPatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#f59e0b]/10 flex items-center justify-center text-xs font-semibold text-[#f59e0b]">
                      {p.full_name.charAt(0)}
                    </div>
                    <span className="text-sm text-white">{p.full_name}</span>
                  </div>
                  <span className="text-xs text-[#475569]">{format(new Date(p.created_at), "MMM d")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Doctor", href: "/admin/doctors", icon: Stethoscope, color: "#10b981" },
              { label: "Add Receptionist", href: "/admin/receptionists", icon: Users, color: "#4a9eff" },
              { label: "Departments", href: "/admin/departments", icon: Activity, color: "#f59e0b" },
              { label: "View Reports", href: "/admin/reports", icon: TrendingUp, color: "#a78bfa" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="card-hover p-4 flex flex-col gap-2 rounded-xl">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${action.color}15` }}>
                    <Icon size={15} style={{ color: action.color }} />
                  </div>
                  <span className="text-xs font-medium text-[#94a3b8]">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
