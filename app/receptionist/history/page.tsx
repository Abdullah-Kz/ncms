"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Session, Receipt } from "@/types";
import { Search, FileText, Activity, CreditCard, User } from "lucide-react";
import { format } from "date-fns";

export default function PatientHistory() {
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "receipts">("sessions");

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from("patients")
      .select("*")
      .or(`id_card_number.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(1)
      .single();
    if (!data) { setPatient(null); setSessions([]); setReceipts([]); setLoading(false); return; }
    setPatient(data);

    const [sData, rData] = await Promise.all([
      supabase.from("sessions").select("*, doctor:profiles!sessions_doctor_id_fkey(full_name, specialization)").eq("patient_id", data.id).order("created_at", { ascending: false }),
      supabase.from("receipts").select("*, doctor:profiles!receipts_doctor_id_fkey(full_name), service:services(name)").eq("patient_id", data.id).order("issued_at", { ascending: false }),
    ]);
    setSessions((sData.data || []) as Session[]);
    setReceipts((rData.data || []) as Receipt[]);
    setLoading(false);
  };

  const age = patient?.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <div>
        <h1 className="page-title">Patient History</h1>
        <p className="page-subtitle">Look up patient records by CNIC or name</p>
      </div>

      <div className="card p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Enter CNIC number or patient name..."
            />
          </div>
          <button onClick={search} disabled={loading} className="btn-primary px-6">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Search"}
          </button>
        </div>
      </div>

      {searched && !patient && !loading && (
        <div className="card p-10 text-center">
          <p className="text-[#475569] text-sm">No patient found with that CNIC or name</p>
        </div>
      )}

      {patient && (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#4a9eff]/10 flex items-center justify-center text-xl font-semibold text-[#4a9eff] flex-shrink-0">
                {patient.full_name.charAt(0)}
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><div className="label mb-0">Full Name</div><div className="text-sm font-semibold text-white mt-1">{patient.full_name}</div></div>
                <div><div className="label mb-0">CNIC</div><div className="text-sm text-[#94a3b8] font-mono mt-1">{patient.id_card_number}</div></div>
                {age && <div><div className="label mb-0">Age</div><div className="text-sm text-[#94a3b8] mt-1">{age} years</div></div>}
                <div><div className="label mb-0">Gender</div><div className="text-sm text-[#94a3b8] mt-1 capitalize">{patient.gender || "—"}</div></div>
                <div><div className="label mb-0">Phone</div><div className="text-sm text-[#94a3b8] mt-1">{patient.phone || "—"}</div></div>
                <div><div className="label mb-0">Blood Group</div><div className="text-sm text-[#94a3b8] mt-1">{patient.blood_group || "—"}</div></div>
                {patient.medical_history && <div className="col-span-2 md:col-span-3"><div className="label mb-0">Medical History</div><div className="text-sm text-[#94a3b8] mt-1">{patient.medical_history}</div></div>}
                {patient.allergies && <div className="col-span-2 md:col-span-3"><div className="label mb-0">Allergies</div><div className="text-sm text-red-400 mt-1">{patient.allergies}</div></div>}
              </div>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg w-fit border border-white/[0.06]">
            {(["sessions", "receipts"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-[#4a9eff] text-white" : "text-[#94a3b8] hover:text-white"}`}>
                {tab === "sessions" ? <Activity size={14} /> : <CreditCard size={14} />}
                {tab} ({tab === "sessions" ? sessions.length : receipts.length})
              </button>
            ))}
          </div>

          {activeTab === "sessions" && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="table-head">Date</th>
                  <th className="table-head">Doctor</th>
                  <th className="table-head">Duration</th>
                  <th className="table-head">Diagnosis</th>
                  <th className="table-head">Status</th>
                </tr></thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-[#475569] text-sm">No sessions recorded</td></tr>
                  ) : sessions.map((s) => (
                    <tr key={s.id} className="table-row">
                      <td className="table-cell text-xs text-[#94a3b8]">{format(new Date(s.created_at), "MMM d, yyyy")}</td>
                      <td className="table-cell text-sm text-white">{(s as any).doctor?.full_name || "—"}</td>
                      <td className="table-cell text-xs text-[#94a3b8]">{s.duration_minutes ? `${s.duration_minutes} min` : "—"}</td>
                      <td className="table-cell text-xs text-[#94a3b8] max-w-xs truncate">{s.diagnosis || "—"}</td>
                      <td className="table-cell">
                        <span className={s.status === "completed" ? "badge-session" : "badge-waiting"}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />{s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "receipts" && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="table-head">Receipt #</th>
                  <th className="table-head">Date</th>
                  <th className="table-head">Service</th>
                  <th className="table-head">Amount</th>
                  <th className="table-head">Status</th>
                </tr></thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-[#475569] text-sm">No receipts found</td></tr>
                  ) : receipts.map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell font-mono text-xs text-[#4a9eff]">{r.receipt_number}</td>
                      <td className="table-cell text-xs text-[#94a3b8]">{format(new Date(r.issued_at), "MMM d, yyyy")}</td>
                      <td className="table-cell text-sm text-[#94a3b8]">{(r as any).service?.name || "—"}</td>
                      <td className="table-cell text-sm font-medium text-[#f59e0b]">PKR {r.total_amount.toLocaleString()}</td>
                      <td className="table-cell"><span className="badge-session"><span className="w-1.5 h-1.5 rounded-full bg-current" />{r.payment_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
