"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Appointment } from "@/types";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-waiting",
  confirmed: "badge-calling",
  completed: "badge-session",
  cancelled: "badge-completed",
  referred: "badge-completed",
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => { fetchAppointments(); }, [dateFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, patient:patients(full_name, id_card_number, phone), doctor:profiles!appointments_doctor_id_fkey(full_name, specialization), service:services(name, fee)")
      .gte("scheduled_at", `${dateFilter}T00:00:00`)
      .lte("scheduled_at", `${dateFilter}T23:59:59`)
      .order("scheduled_at", { ascending: true });
    setAppointments((data || []) as Appointment[]);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Daily appointment schedule and status tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#475569]" />
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input py-1.5 text-sm" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="table-head">Time</th>
              <th className="table-head">Patient</th>
              <th className="table-head">Doctor</th>
              <th className="table-head">Service</th>
              <th className="table-head">Complaint</th>
              <th className="table-head">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-[#475569] text-sm">Loading...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-[#475569] text-sm">No appointments for this date</td></tr>
            ) : appointments.map((appt) => (
              <tr key={appt.id} className="table-row">
                <td className="table-cell text-xs font-mono text-[#94a3b8]">{format(new Date(appt.scheduled_at), "HH:mm")}</td>
                <td className="table-cell">
                  <div>
                    <div className="text-sm font-medium text-white">{(appt as any).patient?.full_name}</div>
                    <div className="text-xs text-[#475569]">{(appt as any).patient?.phone}</div>
                  </div>
                </td>
                <td className="table-cell">
                  <div>
                    <div className="text-sm text-[#94a3b8]">{(appt as any).doctor?.full_name}</div>
                    <div className="text-xs text-[#475569]">{(appt as any).doctor?.specialization}</div>
                  </div>
                </td>
                <td className="table-cell text-sm text-[#94a3b8]">{(appt as any).service?.name || "—"}</td>
                <td className="table-cell text-xs text-[#94a3b8] max-w-xs truncate">{appt.chief_complaint || "—"}</td>
                <td className="table-cell">
                  <span className={STATUS_BADGE[appt.status] || "badge-completed"}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {appt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
