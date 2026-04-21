"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { Search, X, ChevronDown, ChevronUp, AlertCircle, Activity, Clock, Heart } from "lucide-react";

interface VitalSigns {
  bp?: string;
  pulse?: string | number;
  temperature?: string | number;
  spo2?: string | number;
  weight?: string | number;
  height?: string | number;
}

interface SessionRecord {
  id: string;
  patient_id: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  duration_minutes: number | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  prescription: string | null;
  follow_up_date: string | null;
  history_of_illness: string | null;
  examination_findings: string | null;
  vital_signs: VitalSigns | null;
  status: string;
  patient: {
    id: string;
    full_name: string;
    id_card_number: string;
    date_of_birth: string | null;
    gender: string | null;
    blood_group: string | null;
    medical_history: string | null;
    allergies: string | null;
    phone: string | null;
  } | null;
}

function VitalsRow({ vitals }: { vitals: VitalSigns }) {
  const items = [
    { label: "BP", value: vitals.bp, unit: "mmHg" },
    { label: "Pulse", value: vitals.pulse, unit: "bpm" },
    { label: "Temp", value: vitals.temperature, unit: "°C" },
    { label: "SpO₂", value: vitals.spo2, unit: "%" },
    { label: "Weight", value: vitals.weight, unit: "kg" },
    { label: "Height", value: vitals.height, unit: "cm" },
  ].filter((i) => i.value);

  if (items.length === 0) return null;

  return (
    <div className="mt-3 p-3 rounded-xl border" style={{ background: "rgba(74,158,255,0.04)", borderColor: "rgba(74,158,255,0.12)" }}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Heart size={11} style={{ color: "#4a9eff" }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#4a9eff" }}>Vital Signs</span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{item.label}</div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{item.value}</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DoctorPatients() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (profile) fetchSessions();
  }, [profile]);

  const fetchSessions = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, patient_id, started_at, ended_at, created_at, duration_minutes,
        chief_complaint, diagnosis, treatment_plan, prescription, follow_up_date,
        history_of_illness, examination_findings, vital_signs, status,
        patient:patients(id, full_name, id_card_number, date_of_birth, gender, blood_group, medical_history, allergies, phone)
      `)
      .eq("doctor_id", profile.id)
      .eq("status", "completed")
      .order("ended_at", { ascending: false });
    if (error) console.error("Patients fetch error:", error);
    setSessions((data || []) as unknown as SessionRecord[]);
    setLoading(false);
  };

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.patient?.full_name?.toLowerCase().includes(q) ||
      s.patient?.id_card_number?.toLowerCase().includes(q) ||
      (s.diagnosis || "").toLowerCase().includes(q)
    );
  });

  // Group by patient
  const patientMap = new Map<string, { patient: SessionRecord["patient"]; sessions: SessionRecord[] }>();
  filtered.forEach((s) => {
    const pid = s.patient_id;
    if (!patientMap.has(pid)) patientMap.set(pid, { patient: s.patient, sessions: [] });
    patientMap.get(pid)!.sessions.push(s);
  });
  const patients = Array.from(patientMap.values());

  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const avgDuration = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">My Patients</h1>
          <p className="page-subtitle">{patients.length} unique patient{patients.length !== 1 ? "s" : ""} · {sessions.length} total sessions</p>
        </div>
        {sessions.length > 0 && (
          <div className="flex gap-3">
            <div className="card px-4 py-2 text-center">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Total Sessions</div>
              <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{sessions.length}</div>
            </div>
            <div className="card px-4 py-2 text-center">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Duration</div>
              <div className="text-lg font-semibold" style={{ color: "#4a9eff" }}>{avgDuration} min</div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-3 flex items-center gap-2.5">
        <Search size={14} style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search by name, CNIC or diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {search && <button onClick={() => setSearch("")}><X size={14} style={{ color: "var(--text-muted)" }} /></button>}
      </div>

      {loading ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading patients...</div>
      ) : patients.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {search ? "No patients match your search" : "No completed sessions yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map(({ patient, sessions: patSessions }) => {
            if (!patient) return null;
            const isOpen = expanded === patient.id;
            const lastSession = patSessions[0];
            const age = patient.date_of_birth
              ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
              : null;
            const totalMin = patSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

            return (
              <div key={patient.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : patient.id)}
                  className="w-full flex items-center gap-3 p-4 text-left transition-colors"
                  style={{ background: isOpen ? "rgba(255,255,255,0.02)" : "transparent" }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                    {patient.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{patient.full_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {[patient.id_card_number, age ? `${age}y` : null, patient.blood_group, patient.gender].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 mr-1 hidden sm:block">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{patSessions.length} session{patSessions.length !== 1 ? "s" : ""}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{totalMin} min total</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Last visit</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {lastSession ? format(new Date(lastSession.ended_at || lastSession.created_at), "MMM d, yyyy") : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
                </button>

                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Patient header info */}
                    {(patient.allergies || patient.medical_history || patient.phone) && (
                      <div className="px-4 py-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid var(--border)" }}>
                        {patient.allergies && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "#f87171" }}>
                            <AlertCircle size={12} className="flex-shrink-0" />
                            <span><strong>Allergy:</strong> {patient.allergies}</span>
                          </div>
                        )}
                        {patient.medical_history && (
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            <span style={{ color: "var(--text-muted)" }}>History: </span>{patient.medical_history}
                          </div>
                        )}
                        {patient.phone && (
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>Phone: {patient.phone}</div>
                        )}
                      </div>
                    )}

                    {/* Sessions */}
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {patSessions.map((s, idx) => (
                        <div key={s.id} className="px-4 py-4">
                          {/* Session header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(74,158,255,0.1)", color: "#60a5fa" }}>
                                Session {patSessions.length - idx}
                              </span>
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {format(new Date(s.ended_at || s.created_at), "MMMM d, yyyy · HH:mm")}
                              </span>
                            </div>
                            {s.duration_minutes && (
                              <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                                <Clock size={11} />
                                {s.duration_minutes} min
                              </div>
                            )}
                          </div>

                          {/* Vitals — Fix 1: Now displayed */}
                          {s.vital_signs && Object.values(s.vital_signs).some(Boolean) && (
                            <VitalsRow vitals={s.vital_signs} />
                          )}

                          {/* Clinical notes */}
                          <div className="mt-3 space-y-2">
                            {s.chief_complaint && (
                              <div className="text-xs">
                                <span style={{ color: "var(--text-muted)" }}>Complaint: </span>
                                <span style={{ color: "var(--text-secondary)" }}>{s.chief_complaint}</span>
                              </div>
                            )}
                            {s.history_of_illness && (
                              <div className="text-xs">
                                <span style={{ color: "var(--text-muted)" }}>History: </span>
                                <span style={{ color: "var(--text-secondary)" }}>{s.history_of_illness}</span>
                              </div>
                            )}
                            {s.examination_findings && (
                              <div className="text-xs">
                                <span style={{ color: "var(--text-muted)" }}>Examination: </span>
                                <span style={{ color: "var(--text-secondary)" }}>{s.examination_findings}</span>
                              </div>
                            )}
                            {s.diagnosis && (
                              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                Dx: {s.diagnosis}
                              </div>
                            )}
                            {s.treatment_plan && (
                              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                <span style={{ color: "var(--text-muted)" }}>Plan: </span>{s.treatment_plan}
                              </div>
                            )}
                            {s.prescription && (
                              <div className="p-3 rounded-lg text-xs font-mono whitespace-pre-wrap"
                                style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                                {s.prescription}
                              </div>
                            )}
                            {s.follow_up_date && (
                              <div className="text-xs" style={{ color: "#4a9eff" }}>
                                Follow-up: {format(new Date(s.follow_up_date), "MMMM d, yyyy")}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
