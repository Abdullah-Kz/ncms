"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Plus, X, Trash2, CalendarOff, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO } from "date-fns";

interface Doctor { id: string; full_name: string; specialization: string | null; }
interface Leave {
  id: string;
  doctor_id: string;
  leave_date: string;
  leave_type: string;
  reason: string | null;
  is_full_day: boolean;
  status: string;
  doctor?: Doctor;
}

const LEAVE_TYPES = ["Holiday", "Sick Leave", "Training", "Personal", "Emergency"];
const TYPE_COLORS: Record<string, string> = {
  holiday: "var(--accent-gold)",
  sick: "var(--accent-red)",
  training: "var(--accent-blue)",
  personal: "var(--accent-purple)",
  emergency: "var(--accent-red)",
  "sick leave": "var(--accent-red)",
};

export default function LeavePage() {
  const { profile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({ doctor_id: "", leave_type: "Holiday", reason: "", is_full_day: true });
  const [saving, setSaving] = useState(false);
  const [filterDoctor, setFilterDoctor] = useState("all");

  useEffect(() => { fetchDoctors(); fetchLeaves(); }, []);

  const fetchDoctors = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, specialization").eq("role", "doctor").eq("is_active", true).order("full_name");
    setDoctors(data || []);
  };

  const fetchLeaves = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("doctor_leaves")
      .select("*, doctor:profiles!doctor_leaves_doctor_id_fkey(id, full_name, specialization)")
      .order("leave_date", { ascending: true });
    setLeaves((data || []) as Leave[]);
    setLoading(false);
  };

  const openAddModal = (date?: Date) => {
    setSelectedDate(date || null);
    setForm({ doctor_id: "", leave_type: "Holiday", reason: "", is_full_day: true });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.doctor_id) { toast.error("Select a doctor"); return; }
    if (!selectedDate) { toast.error("Select a date"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("doctor_leaves").insert({
        doctor_id: form.doctor_id,
        leave_date: format(selectedDate, "yyyy-MM-dd"),
        leave_type: form.leave_type.toLowerCase().replace(" ", "_"),
        reason: form.reason || null,
        is_full_day: form.is_full_day,
        approved_by: profile?.id,
        status: "approved",
      });
      if (error) {
        if (error.message.includes("unique")) throw new Error("This doctor already has leave on this date");
        throw error;
      }
      toast.success("Leave added successfully");
      setShowModal(false);
      fetchLeaves();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const deleteLeave = async (id: string) => {
    if (!confirm("Remove this leave entry?")) return;
    const { error } = await supabase.from("doctor_leaves").delete().eq("id", id);
    if (error) { toast.error("Failed to remove"); return; }
    toast.success("Leave removed");
    fetchLeaves();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay();

  const filteredLeaves = filterDoctor === "all" ? leaves : leaves.filter((l) => l.doctor_id === filterDoctor);

  const getDayLeaves = (day: Date) => filteredLeaves.filter((l) => isSameDay(parseISO(l.leave_date), day));

  const upcomingLeaves = filteredLeaves
    .filter((l) => parseISO(l.leave_date) >= new Date())
    .slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Mark doctors as unavailable — they won't appear in receptionist booking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input py-1.5 text-sm w-auto" value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}>
            <option value="all">All Doctors</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
          <button onClick={() => openAddModal()} className="btn-primary">
            <Plus size={15} /> Add Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="card p-4 lg:col-span-2">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-bold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
            {calDays.map((day) => {
              const dayLeaves = getDayLeaves(day);
              const hasLeave = dayLeaves.length > 0;
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); openAddModal(day); }}
                  className="relative rounded-xl p-1 min-h-[44px] flex flex-col items-center gap-0.5 transition-all duration-100 group"
                  style={{
                    background: hasLeave ? "rgba(192,80,58,0.08)" : today ? "var(--nav-active-bg)" : "transparent",
                    border: today ? "1.5px solid var(--border-focus)" : "1.5px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!hasLeave) (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = hasLeave ? "rgba(192,80,58,0.08)" : today ? "var(--nav-active-bg)" : "transparent"; }}
                >
                  <span className="text-xs font-semibold"
                    style={{ color: today ? "var(--accent-blue)" : "var(--text-primary)" }}>
                    {format(day, "d")}
                  </span>
                  {hasLeave && (
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {dayLeaves.slice(0, 3).map((l) => (
                        <div key={l.id} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: TYPE_COLORS[l.leave_type] || "var(--accent-red)" }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            {Object.entries({ Holiday: "var(--accent-gold)", "Sick Leave": "var(--accent-red)", Training: "var(--accent-blue)", Personal: "var(--accent-purple)" }).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming leaves list */}
        <div className="card overflow-hidden">
          <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Upcoming Leaves</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{upcomingLeaves.length} scheduled</p>
          </div>
          <div className="divide-y overflow-y-auto max-h-96" style={{ borderColor: "var(--border)" }}>
            {loading ? (
              <div className="p-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>Loading...</div>
            ) : upcomingLeaves.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarOff size={24} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No upcoming leaves</p>
              </div>
            ) : upcomingLeaves.map((leave) => (
              <div key={leave.id} className="px-4 py-3 flex items-start justify-between gap-2 group">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: TYPE_COLORS[leave.leave_type] || "var(--accent-red)" }} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {leave.doctor?.full_name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {format(parseISO(leave.leave_date), "MMM d, yyyy")}
                    </div>
                    <div className="text-[10px] mt-0.5 capitalize" style={{ color: "var(--text-muted)" }}>
                      {leave.leave_type.replace("_", " ")} {leave.reason ? `· ${leave.reason}` : ""}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteLeave(leave.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: "var(--accent-red)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(192,80,58,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All leaves table */}
      <div className="card overflow-hidden">
        <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>All Leave Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-head">Doctor</th>
                <th className="table-head">Date</th>
                <th className="table-head">Type</th>
                <th className="table-head">Reason</th>
                <th className="table-head">Duration</th>
                <th className="table-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-xs" style={{ color: "var(--text-muted)" }}>No leave records found</td></tr>
              ) : filteredLeaves.map((leave) => (
                <tr key={leave.id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <div className="font-medium">{leave.doctor?.full_name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{leave.doctor?.specialization}</div>
                    </div>
                  </td>
                  <td className="table-cell text-sm" style={{ color: "var(--text-secondary)" }}>
                    {format(parseISO(leave.leave_date), "EEE, MMM d yyyy")}
                  </td>
                  <td className="table-cell">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                      style={{ background: `${TYPE_COLORS[leave.leave_type] || "var(--accent-red)"}15`, color: TYPE_COLORS[leave.leave_type] || "var(--accent-red)", border: `1px solid ${TYPE_COLORS[leave.leave_type] || "var(--accent-red)"}30` }}>
                      {leave.leave_type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-cell text-xs" style={{ color: "var(--text-secondary)" }}>{leave.reason || "—"}</td>
                  <td className="table-cell text-xs" style={{ color: "var(--text-muted)" }}>{leave.is_full_day ? "Full Day" : "Partial"}</td>
                  <td className="table-cell">
                    <button onClick={() => deleteLeave(leave.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-red)"; (e.currentTarget as HTMLElement).style.background = "rgba(192,80,58,0.08)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Add Leave</h3>
                {selectedDate && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)}>
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <div className="space-y-4">
              {!selectedDate && (
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input"
                    onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value + "T12:00:00") : null)} />
                </div>
              )}

              <div>
                <label className="label">Doctor *</label>
                <select className="input" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                  <option value="">Select doctor</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Leave Type</label>
                <select className="input" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Reason (optional)</label>
                <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Brief reason..." />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Full Day Leave</span>
                <button type="button" onClick={() => setForm({ ...form, is_full_day: !form.is_full_day })}
                  className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
                  style={{ background: form.is_full_day ? "var(--accent-blue)" : "var(--border)" }}>
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: form.is_full_day ? "translateX(20px)" : "translateX(0)" }} />
                </button>
              </div>

              {selectedDate && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: "rgba(192,80,58,0.06)", border: "1px solid rgba(192,80,58,0.15)" }}>
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent-red)" }} />
                  <span style={{ color: "var(--text-secondary)" }}>
                    The doctor will be marked unavailable on this date and won't appear in receptionist booking.
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Add Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
