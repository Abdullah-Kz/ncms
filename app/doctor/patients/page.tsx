"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { Search, X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

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
  } | null;
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

    // Fix 6: Use explicit column select to avoid ambiguous FK errors
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        id, patient_id, started_at, ended_at, created_at, duration_minutes,
        chief_complaint, diagnosis, treatment_plan, prescription, follow_up_date, status,
        patient:patients(id, full_name, id_card_number, date_of_birth, gender, blood_group, medical_history, allergies)
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

  // Group sessions by patient ID
  const patientMap = new Map<string, { patient: SessionRecord["patient"]; sessions: SessionRecord[] }>();
  filtered.forEach((s) => {
    const pid = s.patient_id;
    if (!patientMap.has(pid)) patientMap.set(pid, { patient: s.patient, sessions: [] });
    patientMap.get(pid)!.sessions.push(s);
  });
  const patients = Array.from(patientMap.values());

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="page-title">My Patients</h1>
        <p className="page-subtitle">{patients.length} unique patient{patients.length !== 1 ? "s" : ""} treated</p>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <Search size={14} className="text-[#475569]" />
        <input
          type="text"
          placeholder="Search by name, CNIC or diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#f1f5f9] placeholder-[#475569] focus:outline-none"
        />
        {search && <button onClick={() => setSearch("")}><X size={14} className="text-[#475569]" /></button>}
      </div>

      {loading ? (
        <div className="card p-10 text-center text-[#475569] text-sm">Loading patients...</div>
      ) : patients.length === 0 ? (
        <div className="card p-10 text-center text-[#475569] text-sm">
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

            return (
              <div key={patient.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : patient.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center text-sm font-semibold text-[#10b981] flex-shrink-0">
                    {patient.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{patient.full_name}</div>
                    <div className="text-xs text-[#475569] mt-0.5">
                      {[patient.id_card_number, age ? `${age}y` : null, patient.blood_group].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <div className="text-xs text-[#94a3b8]">{patSessions.length} session{patSessions.length !== 1 ? "s" : ""}</div>
                    <div className="text-xs text-[#475569] mt-0.5">
                      Last: {lastSession ? format(new Date(lastSession.ended_at || lastSession.created_at), "MMM d, yyyy") : "—"}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-[#475569]" /> : <ChevronDown size={14} className="text-[#475569]" />}
                </button>

                {isOpen && (
                  <div className="border-t border-white/[0.06]">
                    {patient.allergies && (
                      <div className="px-4 py-2 bg-red-500/5 border-b border-white/[0.04] flex items-center gap-2">
                        <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400 font-medium">Allergy: {patient.allergies}</span>
                      </div>
                    )}
                    {patient.medical_history && (
                      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.04]">
                        <div className="text-xs font-medium text-[#94a3b8] mb-1">Medical History</div>
                        <p className="text-xs text-[#475569]">{patient.medical_history}</p>
                      </div>
                    )}

                    <div className="divide-y divide-white/[0.04]">
                      {patSessions.map((s) => (
                        <div key={s.id} className="px-4 py-4">
                          <div className="text-xs font-medium text-[#475569] mb-2">
                            {format(new Date(s.ended_at || s.created_at), "MMMM d, yyyy")}
                            {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                          </div>

                          {s.chief_complaint && (
                            <div className="mb-1">
                              <span className="text-xs text-[#475569]">Complaint: </span>
                              <span className="text-xs text-[#94a3b8]">{s.chief_complaint}</span>
                            </div>
                          )}
                          {s.diagnosis && (
                            <div className="text-sm font-medium text-white mb-1">{s.diagnosis}</div>
                          )}
                          {s.treatment_plan && (
                            <div className="text-xs text-[#94a3b8] mb-2">{s.treatment_plan}</div>
                          )}
                          {s.prescription && (
                            <div className="p-2.5 bg-white/[0.03] rounded-lg text-xs text-[#94a3b8] whitespace-pre-wrap font-mono">
                              {s.prescription}
                            </div>
                          )}
                          {s.follow_up_date && (
                            <div className="text-xs text-[#4a9eff] mt-2">
                              Follow-up: {format(new Date(s.follow_up_date), "MMMM d, yyyy")}
                            </div>
                          )}
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
