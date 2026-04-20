"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Download, TrendingUp, Users, Activity, Clock } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import toast from "react-hot-toast";

const COLORS = ["#4a9eff", "#10b981", "#f59e0b", "#a78bfa", "#ef4444", "#06b6d4"];

export default function AdminReports() {
  const [range, setRange] = useState<"week" | "month" | "quarter">("month");
  const [sessionsByDoctor, setSessionsByDoctor] = useState<{ name: string; sessions: number; revenue: number }[]>([]);
  const [dailyFlow, setDailyFlow] = useState<{ day: string; patients: number; sessions: number }[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [summary, setSummary] = useState({ totalPatients: 0, totalSessions: 0, totalRevenue: 0, avgSessionTime: 0 });

  useEffect(() => { fetchReportData(); }, [range]);

  const getDateRange = () => {
    const end = new Date();
    const days = range === "week" ? 7 : range === "month" ? 30 : 90;
    return { start: subDays(end, days), end };
  };

  const fetchReportData = async () => {
    const { start, end } = getDateRange();
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const [sessionsRes, patientsRes, receiptsRes] = await Promise.all([
      supabase.from("sessions").select("*, doctor:profiles!sessions_doctor_id_fkey(full_name), patient:patients(full_name)").gte("created_at", startStr).lte("created_at", endStr),
      supabase.from("patients").select("id, created_at").gte("created_at", startStr).lte("created_at", endStr),
      supabase.from("receipts").select("total_amount, service:services(name), issued_at").gte("issued_at", startStr).lte("issued_at", endStr),
    ]);

    const sessions = sessionsRes.data || [];
    const patients = patientsRes.data || [];
    const receipts = receiptsRes.data || [];

    const totalRevenue = receipts.reduce((sum, r: any) => sum + (r.total_amount || 0), 0);
    const completedSessions = sessions.filter((s) => s.status === "completed");
    const avgTime = completedSessions.length > 0
      ? completedSessions.reduce((sum, s: any) => sum + (s.duration_minutes || 0), 0) / completedSessions.length
      : 0;

    setSummary({ totalPatients: patients.length, totalSessions: sessions.length, totalRevenue, avgSessionTime: Math.round(avgTime) });

    const doctorMap: Record<string, { name: string; sessions: number; revenue: number }> = {};
    sessions.forEach((s: any) => {
      const name = s.doctor?.full_name || "Unknown";
      if (!doctorMap[name]) doctorMap[name] = { name, sessions: 0, revenue: 0 };
      doctorMap[name].sessions++;
    });
    receipts.forEach((r: any) => { });
    setSessionsByDoctor(Object.values(doctorMap).sort((a, b) => b.sessions - a.sessions).slice(0, 8));

    const days = eachDayOfInterval({ start, end }).slice(-14);
    const flowData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const p = patients.filter((pt) => format(new Date(pt.created_at), "yyyy-MM-dd") === dayStr).length;
      const s = sessions.filter((se: any) => format(new Date(se.created_at), "yyyy-MM-dd") === dayStr).length;
      return { day: format(day, "MMM d"), patients: p, sessions: s };
    });
    setDailyFlow(flowData);

    const serviceMap: Record<string, number> = {};
    receipts.forEach((r: any) => {
      const name = r.service?.name || "Other";
      serviceMap[name] = (serviceMap[name] || 0) + 1;
    });
    setServiceBreakdown(Object.entries(serviceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6));
  };

  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Patients", summary.totalPatients],
      ["Total Sessions", summary.totalSessions],
      ["Total Revenue (PKR)", summary.totalRevenue],
      ["Avg Session Time (min)", summary.avgSessionTime],
      [],
      ["Doctor", "Sessions"],
      ...sessionsByDoctor.map((d) => [d.name, d.sessions]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ncms-report-${range}-${format(new Date(), "yyyyMMdd")}.csv`; a.click();
    toast.success("Report exported");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) return (
      <div className="card p-3 text-xs space-y-1">
        <p className="text-[#94a3b8] font-medium">{label}</p>
        {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
      </div>
    );
    return null;
  };

  const SUMMARY_CARDS = [
    { label: "Total Patients", value: summary.totalPatients, icon: Users, color: "#4a9eff" },
    { label: "Sessions Conducted", value: summary.totalSessions, icon: Activity, color: "#10b981" },
    { label: "Revenue (PKR)", value: `${summary.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "#f59e0b" },
    { label: "Avg Session Time", value: `${summary.avgSessionTime} min`, icon: Clock, color: "#a78bfa" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Real-time performance metrics and clinical output analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-white/[0.06]">
            {(["week", "month", "quarter"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${range === r ? "bg-[#4a9eff] text-white" : "text-[#94a3b8] hover:text-white hover:bg-white/[0.05]"}`}>{r}</button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn-secondary"><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map((card) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-1">Daily Patient Flow</h2>
          <p className="text-xs text-[#475569] mb-4">Intake vs. sessions over selected period</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Line type="monotone" dataKey="patients" stroke="#4a9eff" strokeWidth={2} dot={false} name="New Patients" />
              <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} dot={false} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Services Breakdown</h2>
          <p className="text-xs text-[#475569] mb-4">By appointment count</p>
          {serviceBreakdown.length === 0 ? (
            <p className="text-xs text-[#475569] text-center py-8">No service data available</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                    {serviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {serviceBreakdown.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-[#94a3b8] truncate max-w-[120px]">{s.name}</span>
                    </div>
                    <span className="text-xs text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Sessions by Doctor</h2>
        <p className="text-xs text-[#475569] mb-5">Performance comparison across medical staff</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sessionsByDoctor} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="sessions" fill="#4a9eff" radius={[4, 4, 0, 0]} fillOpacity={0.85} name="Sessions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
