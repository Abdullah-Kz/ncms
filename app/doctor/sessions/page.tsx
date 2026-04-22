"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Play, Square, Save, AlertCircle, Clock, CheckCircle2,
  Activity, ChevronRight, X, Stethoscope, FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface QueueToken {
  id: string;
  token_number: string;
  status: string;
  category: string;
  issued_at: string;
  appointment_id: string | null;
  patient_id: string;
  patient: {
    id: string;
    full_name: string;
    id_card_number: string;
    date_of_birth: string | null;
    gender: string | null;
    allergies: string | null;
    medical_history: string | null;
    blood_group: string | null;
  } | null;
  service: { name: string } | null;
}

interface PastSession {
  id: string;
  ended_at: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  category: string | null;
}

interface ActiveSession {
  id: string;
  patient_id: string;
  token_id: string | null;
  appointment_id: string | null;
  started_at: string;
  patient: {
    full_name: string;
    id_card_number: string;
    date_of_birth: string | null;
    gender: string | null;
    allergies: string | null;
    medical_history: string | null;
    blood_group: string | null;
  } | null;
}

interface DoctorProfile {
  id: string;
  full_name: string;
  specialization: string | null;
}

interface SessionForm {
  chief_complaint: string;
  history_of_illness: string;
  examination_findings: string;
  diagnosis: string;
  treatment_plan: string;
  prescription: string;
  follow_up_date: string;
  referral_doctor_id: string;
  referral_notes: string;
  vital_signs: { bp: string; pulse: string; temperature: string; spo2: string; weight: string; height: string };
}

const EMPTY_FORM: SessionForm = {
  chief_complaint: "", history_of_illness: "", examination_findings: "",
  diagnosis: "", treatment_plan: "", prescription: "", follow_up_date: "",
  referral_doctor_id: "", referral_notes: "",
  vital_signs: { bp: "", pulse: "", temperature: "", spo2: "", weight: "", height: "" },
};

function formatTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatWait(issuedAt: string) {
  const mins = Math.floor((Date.now() - new Date(issuedAt).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:00`;
}

export default function DoctorSessions() {
  const { profile } = useAuth();
  const [queue, setQueue] = useState<QueueToken[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [vitalsChecked, setVitalsChecked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNotesPanel, setShowNotesPanel] = useState(false);


  useEffect(() => {
    if (activeSession?.started_at) {
      const start = new Date(activeSession.started_at).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession?.started_at]);

  const fetchQueue = async () => {
    if (!profile) return;
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("tokens")
      .select(`
        id, token_number, status, category, issued_at, appointment_id, patient_id,
        patient:patients(id, full_name, id_card_number, date_of_birth, gender, allergies, medical_history, blood_group),
        service:services(name)
      `)
      .eq("doctor_id", profile.id)
      .eq("date", today)
      .in("status", ["waiting", "calling", "in_session"])
      .order("issued_at", { ascending: true });

    if (error) console.error("Queue error:", error);
    setQueue((data || []) as unknown as QueueToken[]);
    setLoading(false);
  };

  const fetchActiveSession = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, patient_id, token_id, appointment_id, started_at,
        patient:patients(full_name, id_card_number, date_of_birth, gender, allergies, medical_history, blood_group),
        chief_complaint, history_of_illness, examination_findings, diagnosis,
        treatment_plan, prescription, follow_up_date, referral_doctor_id, referral_notes, vital_signs
      `)
      .eq("doctor_id", profile.id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (error) console.error("Active session error:", error);
    if (data) {
      setActiveSession(data as unknown as ActiveSession);
      const vs = (data as any).vital_signs;
      setVitalsChecked(!!(vs?.bp || vs?.pulse || vs?.temperature));
      setForm({
        chief_complaint: (data as any).chief_complaint || "",
        history_of_illness: (data as any).history_of_illness || "",
        examination_findings: (data as any).examination_findings || "",
        diagnosis: (data as any).diagnosis || "",
        treatment_plan: (data as any).treatment_plan || "",
        prescription: (data as any).prescription || "",
        follow_up_date: (data as any).follow_up_date || "",
        referral_doctor_id: (data as any).referral_doctor_id || "",
        referral_notes: (data as any).referral_notes || "",
        vital_signs: vs || EMPTY_FORM.vital_signs,
      });
    }
  };

  const fetchPastSessions = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("sessions")
      .select("id, ended_at, chief_complaint, diagnosis, category")
      .eq("doctor_id", profile.id)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(4);
    setPastSessions((data || []) as PastSession[]);
  };

  const fetchOtherDoctors = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, specialization")
      .eq("role", "doctor")
      .eq("is_active", true)
      .neq("id", profile.id)
      .order("full_name");
    setDoctors(data || []);
  };

  const startSession = async (token: QueueToken) => {
    if (activeSession) { toast.error("End your current session first"); return; }
    try {
      await supabase.from("tokens").update({ status: "in_session", session_start: new Date().toISOString() }).eq("id", token.id);
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          token_id: token.id,
          patient_id: token.patient_id,
          doctor_id: profile!.id,
          appointment_id: token.appointment_id || null,
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .select(`
          id, patient_id, token_id, appointment_id, started_at,
          patient:patients(full_name, id_card_number, date_of_birth, gender, allergies, medical_history, blood_group)
        `)
        .single();
      if (error) throw error;
      setActiveSession(data as unknown as ActiveSession);
      setForm(EMPTY_FORM);
      setVitalsChecked(false);
      setElapsed(0);
      toast.success("Session started");
      fetchQueue();
    } catch (err: any) { toast.error(err.message); }
  };

  const saveProgress = async () => {
    if (!activeSession) return;
    setSaving(true);
    const { error } = await supabase.from("sessions").update({
      ...form,
      vital_signs: form.vital_signs,
      referral_doctor_id: form.referral_doctor_id || null,
      referral_notes: form.referral_notes || null,
      follow_up_date: form.follow_up_date || null,
    }).eq("id", activeSession.id);
    setSaving(false);
    if (error) { toast.error("Save failed"); return; }
    const vs = form.vital_signs;
    setVitalsChecked(!!(vs.bp || vs.pulse || vs.temperature));
    toast.success("Progress saved");
  };

  const endSession = async () => {
    if (!activeSession) return;
    if (!form.diagnosis.trim()) { toast.error("Enter a diagnosis before ending"); return; }
    if (!confirm("End and complete this session?")) return;
    setSaving(true);
    try {
      const endTime = new Date();
      const durationMin = Math.round((endTime.getTime() - new Date(activeSession.started_at).getTime()) / 60000);
      await supabase.from("sessions").update({
        ...form,
        vital_signs: form.vital_signs,
        referral_doctor_id: form.referral_doctor_id || null,
        referral_notes: form.referral_notes || null,
        follow_up_date: form.follow_up_date || null,
        status: "completed",
        ended_at: endTime.toISOString(),
        duration_minutes: durationMin,
      }).eq("id", activeSession.id);

      if (activeSession.token_id) await supabase.from("tokens").update({ status: "completed", session_end: endTime.toISOString() }).eq("id", activeSession.token_id);
      if (activeSession.appointment_id) await supabase.from("appointments").update({ status: "completed" }).eq("id", activeSession.appointment_id);
      if (form.referral_doctor_id) {
        await supabase.from("referrals").insert({
          session_id: activeSession.id,
          from_doctor_id: profile!.id,
          to_doctor_id: form.referral_doctor_id,
          patient_id: activeSession.patient_id,
          reason: form.referral_notes || null,
          priority: "routine",
        });
        const refDoc = doctors.find((d) => d.id === form.referral_doctor_id);
        toast.success(`Referred to ${refDoc?.full_name}`);
      }

      if (timerRef.current) clearInterval(timerRef.current);
      setActiveSession(null);
      setForm(EMPTY_FORM);
      setElapsed(0);
      setShowNotesPanel(false);
      toast.success(`Session completed · ${durationMin} min`);
      fetchQueue();
      fetchPastSessions();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const updateField = (key: keyof SessionForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));
  const updateVital = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, vital_signs: { ...p.vital_signs, [key]: e.target.value } }));

  const patient = activeSession?.patient;
  const activeToken = queue.find((t) => activeSession?.token_id === t.id);
  const pendingQueue = queue.filter((t) => t.status !== "in_session");
  const age = patient?.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const queueStatusLabel = pendingQueue.length === 0 ? "Clear" : pendingQueue.length <= 2 ? "Light" : pendingQueue.length <= 5 ? "Normal" : "Busy";
  const queueStatusColor = pendingQueue.length === 0 ? "#10b981" : pendingQueue.length <= 2 ? "#4a9eff" : pendingQueue.length <= 5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Therapist Workspace</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-[#94a3b8]">
            <span>{format(new Date(), "EEEE, d MMMM")}</span>
            <span className="text-[#475569]">·</span>
            <span>{pendingQueue.length} Patient{pendingQueue.length !== 1 ? "s" : ""} Pending</span>
          </div>
        </div>
        <div className="card px-4 py-2.5 flex items-center gap-3">
          <div>
            <div className="text-[10px] text-[#475569] uppercase tracking-widest">Queue Status</div>
            <div className="text-base font-semibold" style={{ color: queueStatusColor }}>{queueStatusLabel}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Active Session Hero + Queue */}
        <div className="lg:col-span-2 space-y-4">

          {/* Active Session Card */}
          {activeSession ? (
            <div className="card p-6 space-y-5" style={{ background: "linear-gradient(135deg, #111827 0%, #0f1e35 100%)", borderColor: "rgba(74,158,255,0.15)" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#4a9eff]/20 text-[#4a9eff] border border-[#4a9eff]/30 uppercase tracking-wider">In Progress</span>
                  <span className="text-xs text-[#475569]">Token #{activeToken?.token_number || "—"}</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#475569] uppercase tracking-widest">Session Timer</div>
                  <div className="text-3xl font-mono font-bold text-white mt-0.5">{formatTimer(elapsed)}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#4a9eff]/10 border border-[#4a9eff]/15 flex items-center justify-center text-xl font-bold text-[#4a9eff] flex-shrink-0">
                  {patient?.full_name?.charAt(0) || "?"}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">{patient?.full_name}</h2>
                  <p className="text-sm text-[#94a3b8] italic">
                    {form.chief_complaint || activeToken?.service?.name || activeToken?.category || "Consultation"}
                  </p>
                </div>
              </div>

              {patient?.allergies && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-400 font-medium">Allergy: {patient.allergies}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                  <Clock size={16} className="text-[#94a3b8] mx-auto mb-1" />
                  <div className="text-[10px] text-[#475569] uppercase tracking-wide">Wait Time</div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {activeToken?.issued_at ? formatWait(activeToken.issued_at) : "—"}
                  </div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                  <CheckCircle2 size={16} className={vitalsChecked ? "text-[#10b981] mx-auto mb-1" : "text-[#475569] mx-auto mb-1"} />
                  <div className="text-[10px] text-[#475569] uppercase tracking-wide">Vitals</div>
                  <div className={`text-sm font-semibold mt-0.5 ${vitalsChecked ? "text-[#10b981]" : "text-[#94a3b8]"}`}>
                    {vitalsChecked ? "Recorded" : "Pending"}
                  </div>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                  <Activity size={16} className="text-[#94a3b8] mx-auto mb-1" />
                  <div className="text-[10px] text-[#475569] uppercase tracking-wide">Category</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{activeToken?.category || "General"}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={endSession}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #4a9eff, #2563eb)", color: "white" }}
                >
                  <Square size={15} /> End Session
                </button>
                <button
                  onClick={() => setShowNotesPanel(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-white/[0.08] bg-white/[0.04] text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <FileText size={15} /> Notes
                </button>
                <button
                  onClick={saveProgress}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-white/[0.08] bg-white/[0.04] text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  {saving ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={15} /> Save</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center" style={{ background: "linear-gradient(135deg, #111827 0%, #0c0f1a 100%)" }}>
              <div className="w-16 h-16 rounded-2xl bg-[#4a9eff]/10 border border-[#4a9eff]/15 flex items-center justify-center mx-auto mb-4">
                <Stethoscope size={24} className="text-[#4a9eff]" />
              </div>
              <p className="text-[#94a3b8] font-medium">No Active Session</p>
              <p className="text-[#475569] text-xs mt-1">Select a patient from the queue below to start a session</p>
            </div>
          )}

          {/* Queue Cards */}
          {pendingQueue.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Queue Management</h2>
                <span className="text-xs text-[#475569]">Total Pending: {pendingQueue.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {pendingQueue.map((token) => {
                  const pat = token.patient;
                  return (
                    <div key={token.id} className="card p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-lg font-bold text-[#4a9eff]">
                          {token.token_number}
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[#475569] uppercase tracking-wide">Waiting For</div>
                          <div className="text-sm font-mono font-semibold text-[#f59e0b]">{formatWait(token.issued_at)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-white">{pat?.full_name || "Unknown"}</div>
                        <div className="text-xs text-[#475569] mt-0.5">
                          Token #{token.token_number} · {token.service?.name || token.category}
                        </div>
                      </div>

                      {pat?.allergies && (
                        <div className="flex items-center gap-1.5 text-xs text-red-400">
                          <AlertCircle size={11} /> {pat.allergies}
                        </div>
                      )}

                      <button
                        onClick={() => startSession(token)}
                        disabled={!!activeSession}
                        className="w-full py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border"
                        style={{
                          background: activeSession ? "rgba(255,255,255,0.03)" : "rgba(74,158,255,0.1)",
                          borderColor: activeSession ? "rgba(255,255,255,0.06)" : "rgba(74,158,255,0.25)",
                          color: activeSession ? "#475569" : "#4a9eff",
                          cursor: activeSession ? "not-allowed" : "pointer",
                        }}
                      >
                        Start Session
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && queue.length === 0 && !activeSession && (
            <div className="card p-8 text-center text-[#475569] text-sm">No patients in today&apos;s queue</div>
          )}
        </div>

        {/* RIGHT: Patient History */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
              <Activity size={15} className="text-[#4a9eff]" />
              <h2 className="text-sm font-semibold text-white">Patient History</h2>
            </div>

            {activeSession && patient ? (
              <div className="p-4 border-b border-white/[0.06] bg-[#4a9eff]/5">
                <div className="text-xs font-semibold text-[#4a9eff] mb-2">Current Patient</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Name</span>
                    <span className="text-white font-medium">{patient.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475569]">CNIC</span>
                    <span className="text-[#94a3b8] font-mono">{patient.id_card_number}</span>
                  </div>
                  {age && <div className="flex justify-between"><span className="text-[#475569]">Age</span><span className="text-[#94a3b8]">{age} years</span></div>}
                  {patient.blood_group && <div className="flex justify-between"><span className="text-[#475569]">Blood</span><span className="text-[#94a3b8]">{patient.blood_group}</span></div>}
                </div>
                {patient.medical_history && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Medical History</div>
                    <p className="text-xs text-[#94a3b8] line-clamp-3">{patient.medical_history}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-xs text-[#475569] text-center border-b border-white/[0.06]">
                Start a session to see patient details
              </div>
            )}

            <div className="divide-y divide-white/[0.04]">
              {pastSessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#475569]">No past sessions</div>
              ) : pastSessions.map((s) => (
                <div key={s.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="text-xs text-[#475569] mb-1">
                    {s.ended_at ? format(new Date(s.ended_at), "MMM d, yyyy") : "—"}
                  </div>
                  <div className="text-sm text-white font-medium line-clamp-2">
                    {s.diagnosis || s.chief_complaint || "No notes"}
                  </div>
                  {s.category && (
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#475569]">
                      {s.category}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-white/[0.06]">
              <a href="/doctor/patients" className="flex items-center justify-center gap-1 text-xs text-[#4a9eff] hover:underline">
                View Full Medical Records <ChevronRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Slide-over Panel */}
      {showNotesPanel && activeSession && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowNotesPanel(false)} />
          <div className="w-full max-w-xl bg-[#0c0f1a] border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-semibold text-white">Clinical Notes</h3>
                <p className="text-xs text-[#475569] mt-0.5">{patient?.full_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveProgress} disabled={saving} className="btn-secondary py-1.5 text-xs">
                  {saving ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={12} /> Save</>}
                </button>
                <button onClick={() => setShowNotesPanel(false)} className="p-1.5 rounded hover:bg-white/[0.06]">
                  <X size={16} className="text-[#94a3b8]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Vitals */}
              <div>
                <h4 className="section-title mb-3">Vital Signs</h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { k: "bp", label: "BP", ph: "120/80" },
                    { k: "pulse", label: "Pulse", ph: "72 bpm" },
                    { k: "temperature", label: "Temp °C", ph: "37.0" },
                    { k: "spo2", label: "SpO2 %", ph: "98" },
                    { k: "weight", label: "Weight kg", ph: "70" },
                    { k: "height", label: "Height cm", ph: "170" },
                  ].map((v) => (
                    <div key={v.k}>
                      <label className="label text-[10px]">{v.label}</label>
                      <input className="input py-1.5 text-sm" value={(form.vital_signs as any)[v.k]} onChange={updateVital(v.k)} placeholder={v.ph} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Notes */}
              {[
                { k: "chief_complaint", label: "Chief Complaint", ph: "Primary reason for visit...", rows: 2 },
                { k: "history_of_illness", label: "History of Illness", ph: "Onset, duration, progression...", rows: 2 },
                { k: "examination_findings", label: "Examination Findings", ph: "Physical examination findings...", rows: 3 },
                { k: "diagnosis", label: "Diagnosis *", ph: "Provisional or confirmed diagnosis...", rows: 2 },
                { k: "treatment_plan", label: "Treatment Plan", ph: "Planned interventions...", rows: 2 },
                { k: "prescription", label: "Prescription", ph: "Name · Dose · Frequency · Duration", rows: 3 },
              ].map((f) => (
                <div key={f.k}>
                  <label className="label">{f.label}</label>
                  <textarea className="input resize-none" rows={f.rows} value={(form as any)[f.k]} onChange={updateField(f.k as keyof SessionForm)} placeholder={f.ph} />
                </div>
              ))}

              <div>
                <label className="label">Follow-up Date</label>
                <input className="input" type="date" value={form.follow_up_date} onChange={updateField("follow_up_date")} />
              </div>

              {/* Referral */}
              <div>
                <label className="label">Refer to Doctor</label>
                <select className="input" value={form.referral_doctor_id} onChange={updateField("referral_doctor_id")}>
                  <option value="">No referral</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}</option>)}
                </select>
              </div>
              {form.referral_doctor_id && (
                <div>
                  <label className="label">Referral Notes</label>
                  <textarea className="input resize-none" rows={2} value={form.referral_notes} onChange={updateField("referral_notes")} placeholder="Reason for referral..." />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.06] flex gap-3">
              <button onClick={saveProgress} disabled={saving} className="btn-secondary flex-1 justify-center">
                {saving ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={14} /> Save Progress</>}
              </button>
              <button onClick={() => { saveProgress(); endSession(); }} disabled={saving} className="btn-primary flex-1 justify-center">
                <Square size={14} /> End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
