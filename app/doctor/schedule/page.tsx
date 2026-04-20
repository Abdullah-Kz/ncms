"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { DoctorSchedule } from "@/types";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorSchedule() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ day_of_week: 1, start_time: "09:00", end_time: "17:00", slot_duration_minutes: 30, max_patients: 20 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) fetchSchedules(); }, [profile]);

  const fetchSchedules = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase.from("doctor_schedules").select("*").eq("doctor_id", profile.id).order("day_of_week");
    setSchedules(data || []);
    setLoading(false);
  };

  const saveSchedule = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("doctor_schedules").insert({ ...form, doctor_id: profile.id });
    if (error) { toast.error(error.message.includes("unique") ? "Schedule already exists for this day/time" : error.message); setSaving(false); return; }
    toast.success("Schedule added");
    setShowModal(false);
    fetchSchedules();
    setSaving(false);
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("doctor_schedules").delete().eq("id", id);
    toast.success("Schedule removed");
    fetchSchedules();
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">My Schedule</h1>
          <p className="page-subtitle">Set your weekly availability for patient appointments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Add Slot</button>
      </div>

      <div className="space-y-3">
        {DAYS.map((day, dayIndex) => {
          const daySchedules = schedules.filter((s) => s.day_of_week === dayIndex);
          return (
            <div key={day} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${daySchedules.length > 0 ? "bg-[#10b981]" : "bg-white/[0.1]"}`} />
                  <span className="text-sm font-medium text-white">{day}</span>
                  {daySchedules.length === 0 && <span className="text-xs text-[#475569]">No slots</span>}
                </div>
              </div>
              {daySchedules.length > 0 && (
                <div className="mt-3 space-y-2">
                  {daySchedules.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03]">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-[#94a3b8]">{s.start_time} – {s.end_time}</span>
                        <span className="text-xs text-[#475569]">{s.slot_duration_minutes} min slots · Max {s.max_patients} patients</span>
                      </div>
                      <button onClick={() => deleteSchedule(s.id)} className="p-1.5 rounded hover:bg-red-500/10 text-[#475569] hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Add Schedule Slot</h3>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-[#94a3b8]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Day of Week</label>
                <select className="input" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Start Time</label><input className="input" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div><label className="label">End Time</label><input className="input" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                <div><label className="label">Slot Duration (min)</label><input className="input" type="number" min={10} max={120} value={form.slot_duration_minutes} onChange={(e) => setForm({ ...form, slot_duration_minutes: parseInt(e.target.value) })} /></div>
                <div><label className="label">Max Patients</label><input className="input" type="number" min={1} max={100} value={form.max_patients} onChange={(e) => setForm({ ...form, max_patients: parseInt(e.target.value) })} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={saveSchedule} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Add Slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
