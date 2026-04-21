"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Download, TrendingUp, Users, Activity, Clock, FileText } from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import toast from "react-hot-toast";

const COLORS = ["#4a9eff", "#10b981", "#f59e0b", "#a78bfa", "#ef4444", "#06b6d4"];

interface Summary {
  totalPatients: number;
  totalSessions: number;
  totalRevenue: number;
  avgSessionTime: number;
  completedSessions: number;
}

export default function AdminReports() {
  const [range, setRange] = useState<"week" | "month" | "quarter">("month");
  const [sessionsByDoctor, setSessionsByDoctor] = useState<{ name: string; sessions: number; avgDuration: number }[]>([]);
  const [dailyFlow, setDailyFlow] = useState<{ day: string; patients: number; sessions: number }[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalPatients: 0, totalSessions: 0, totalRevenue: 0, avgSessionTime: 0, completedSessions: 0 });
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchReportData(); }, [range]);

  const getDateRange = () => {
    const end = new Date();
    const days = range === "week" ? 7 : range === "month" ? 30 : 90;
    return { start: subDays(end, days), end };
  };

  const fetchReportData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const [sessionsRes, patientsRes, receiptsRes] = await Promise.all([
      supabase.from("sessions")
        .select("id, status, duration_minutes, created_at, doctor_id, doctor:profiles!sessions_doctor_id_fkey(full_name)")
        .gte("created_at", startStr).lte("created_at", endStr),
      supabase.from("patients").select("id, created_at").gte("created_at", startStr).lte("created_at", endStr),
      supabase.from("receipts").select("total_amount, service:services(name), issued_at").gte("issued_at", startStr).lte("issued_at", endStr),
    ]);

    const sessions = sessionsRes.data || [];
    const patients = patientsRes.data || [];
    const receipts = receiptsRes.data || [];

    const completed = sessions.filter((s) => s.status === "completed");
    const totalRevenue = receipts.reduce((sum, r: any) => sum + (r.total_amount || 0), 0);
    // Fix 3: proper avg session duration
    const totalDuration = completed.reduce((sum, s: any) => sum + (s.duration_minutes || 0), 0);
    const avgTime = completed.length > 0 ? Math.round(totalDuration / completed.length) : 0;

    setSummary({
      totalPatients: patients.length,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      totalRevenue,
      avgSessionTime: avgTime,
    });

    // Doctor breakdown with avg duration — Fix 3
    const doctorMap: Record<string, { name: string; sessions: number; totalDuration: number }> = {};
    sessions.forEach((s: any) => {
      const name = s.doctor?.full_name || "Unknown";
      if (!doctorMap[name]) doctorMap[name] = { name, sessions: 0, totalDuration: 0 };
      doctorMap[name].sessions++;
      doctorMap[name].totalDuration += s.duration_minutes || 0;
    });
    setSessionsByDoctor(
      Object.values(doctorMap)
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 8)
        .map((d) => ({ name: d.name, sessions: d.sessions, avgDuration: d.sessions > 0 ? Math.round(d.totalDuration / d.sessions) : 0 }))
    );

    // Daily flow
    const days = eachDayOfInterval({ start, end }).slice(-14);
    setDailyFlow(days.map((day) => {
      const ds = format(day, "yyyy-MM-dd");
      return {
        day: format(day, "MMM d"),
        patients: patients.filter((p) => format(new Date(p.created_at), "yyyy-MM-dd") === ds).length,
        sessions: sessions.filter((s) => format(new Date(s.created_at), "yyyy-MM-dd") === ds).length,
      };
    }));

    // Service breakdown
    const svcMap: Record<string, number> = {};
    receipts.forEach((r: any) => { const n = r.service?.name || "Other"; svcMap[n] = (svcMap[n] || 0) + 1; });
    setServiceBreakdown(Object.entries(svcMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6));

    setLoading(false);
  };

  // Fix 2: PDF export using browser print with styled content
  const exportPDF = () => {
    const { start, end } = getDateRange();
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Allow popups to export PDF"); return; }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NCMS Report - ${range.charAt(0).toUpperCase() + range.slice(1)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .logo { font-size: 22px; font-weight: 700; color: #0f172a; }
    .logo span { display: block; font-size: 11px; font-weight: 400; color: #64748b; margin-top: 2px; letter-spacing: 0.1em; text-transform: uppercase; }
    .meta { text-align: right; color: #64748b; font-size: 12px; line-height: 1.6; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .stat-val { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
    .stat-blue .stat-val { color: #3b82f6; }
    .stat-green .stat-val { color: #10b981; }
    .stat-amber .stat-val { color: #f59e0b; }
    .stat-purple .stat-val { color: #8b5cf6; }
    h2 { font-size: 15px; font-weight: 600; color: #0f172a; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 14px; text-align: left; }
    td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">NCMS <span>Clinical Portal</span></div>
    <div class="meta">
      <div><strong>Report Period:</strong> ${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}</div>
      <div><strong>Generated:</strong> ${format(new Date(), "MMMM d, yyyy · HH:mm")}</div>
      <div><strong>Range:</strong> ${range.charAt(0).toUpperCase() + range.slice(1)}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat stat-blue"><div class="stat-val">${summary.totalPatients}</div><div class="stat-label">New Patients</div></div>
    <div class="stat stat-green"><div class="stat-val">${summary.completedSessions}</div><div class="stat-label">Completed Sessions</div></div>
    <div class="stat stat-amber"><div class="stat-val">PKR ${summary.totalRevenue.toLocaleString()}</div><div class="stat-label">Total Revenue</div></div>
    <div class="stat stat-purple"><div class="stat-val">${summary.avgSessionTime} min</div><div class="stat-label">Avg Session Duration</div></div>
  </div>

  <h2>Sessions by Doctor</h2>
  <table>
    <thead><tr><th>#</th><th>Doctor</th><th>Sessions</th><th>Avg Duration</th></tr></thead>
    <tbody>
      ${sessionsByDoctor.map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${d.name}</td>
          <td>${d.sessions}</td>
          <td>${d.avgDuration > 0 ? d.avgDuration + " min" : "—"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h2>Daily Patient Flow (Last 14 Days)</h2>
  <table>
    <thead><tr><th>Date</th><th>New Patients</th><th>Sessions</th></tr></thead>
    <tbody>
      ${dailyFlow.slice(-14).map((d) => `
        <tr>
          <td>${d.day}</td>
          <td>${d.patients}</td>
          <td>${d.sessions}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  ${serviceBreakdown.length > 0 ? `
  <h2>Services Breakdown</h2>
  <table>
    <thead><tr><th>Service</th><th>Appointments</th></tr></thead>
    <tbody>
      ${serviceBreakdown.map((s) => `<tr><td>${s.name}</td><td>${s.value}</td></tr>`).join("")}
    </tbody>
  </table>` : ""}

  <div class="footer">
    <span>NCMS Clinical Portal — Confidential Medical Report</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    toast.success("PDF report generated");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) return (
      <div className="card p-3 text-xs space-y-1 shadow-xl">
        <p className="font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
        {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.name?.includes("Duration") ? " min" : ""}</p>)}
      </div>
    );
    return null;
  };

  const SUMMARY_CARDS = [
    { label: "New Patients", value: summary.totalPatients, icon: Users, color: "#4a9eff" },
    { label: "Total Sessions", value: summary.totalSessions, icon: Activity, color: "#10b981" },
    { label: "Revenue (PKR)", value: summary.totalRevenue.toLocaleString(), icon: TrendingUp, color: "#f59e0b" },
    { label: "Avg Duration", value: `${summary.avgSessionTime} min`, icon: Clock, color: "#a78bfa" },  // Fix 3
  ];

  return (
    <div className="space-y-5" ref={reportRef}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Clinical performance metrics · {format(getDateRange().start, "MMM d")} – {format(new Date(), "MMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["week", "month", "quarter"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className="px-3 py-1.5 text-xs font-medium transition-colors capitalize"
                style={{ background: range === r ? "#4a9eff" : "transparent", color: range === r ? "white" : "var(--text-secondary)" }}>
                {r}
              </button>
            ))}
          </div>
          {/* Fix 2: PDF export button */}
          <button onClick={exportPDF} className="btn-secondary gap-2">
            <FileText size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${card.color}15` }}>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div>
                {loading
                  ? <div className="w-16 h-6 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                  : <div className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{card.value}</div>
                }
                <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Daily Patient Flow</h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Intake vs sessions · last 14 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#4a5a72", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#4a5a72", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8fa3bf" }} />
              <Line type="monotone" dataKey="patients" stroke="#4a9eff" strokeWidth={2} dot={false} name="New Patients" />
              <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} dot={false} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Services</h2>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>By appointment count</p>
          {serviceBreakdown.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: "var(--text-muted)" }}>No service data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={110}>
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28}>
                    {serviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {serviceBreakdown.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs truncate max-w-[130px]" style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fix 3: Sessions by doctor with avg duration */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Sessions by Doctor</h2>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>Performance comparison · includes average session duration</p>
        {sessionsByDoctor.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No session data for this period</p>
        ) : (
          <>
            {/* Mobile: table view */}
            <div className="block md:hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left py-2 pr-4" style={{ color: "var(--text-muted)" }}>Doctor</th>
                    <th className="text-right py-2 pr-4" style={{ color: "var(--text-muted)" }}>Sessions</th>
                    <th className="text-right py-2" style={{ color: "var(--text-muted)" }}>Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsByDoctor.map((d) => (
                    <tr key={d.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="py-2 pr-4" style={{ color: "var(--text-primary)" }}>{d.name}</td>
                      <td className="py-2 pr-4 text-right" style={{ color: "#4a9eff" }}>{d.sessions}</td>
                      <td className="py-2 text-right" style={{ color: "var(--text-secondary)" }}>{d.avgDuration > 0 ? `${d.avgDuration} min` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Desktop: bar chart */}
            <div className="hidden md:block">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sessionsByDoctor} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#4a5a72", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a5a72", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#8fa3bf" }} />
                  <Bar dataKey="sessions" fill="#4a9eff" radius={[4, 4, 0, 0]} fillOpacity={0.85} name="Sessions" />
                  <Bar dataKey="avgDuration" fill="#10b981" radius={[4, 4, 0, 0]} fillOpacity={0.7} name="Avg Duration (min)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
