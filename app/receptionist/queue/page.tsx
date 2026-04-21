"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Patient, Profile, Service, Token } from "@/types";
import { Plus, Printer, X, Search, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const CATEGORIES = ["General", "Diagnostic", "Initial Consult", "Follow-Up", "Emergency", "Referral"];

const STATUS_BADGE: Record<string, string> = {
  waiting: "badge-waiting",
  calling: "badge-calling",
  in_session: "badge-session",
  completed: "badge-completed",
  no_show: "badge-completed",
};

interface ReceiptData {
  token_number: string;
  patient_name: string;
  patient_cnic: string;
  doctor_name: string;
  doctor_dept: string;
  service_name: string;
  amount: number;
  discount: number;
  total: number;
  receipt_number: string;
  issued_at: string;
  category: string;
}

export default function TokenQueue() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patient_id");

  const [tokens, setTokens] = useState<Token[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Profile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [tokenForm, setTokenForm] = useState({
    doctor_id: "", service_id: "", category: "General", chief_complaint: "", discount: 0,
  });
  const [issuing, setIssuing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTokens();
    fetchDoctorsWithSchedules();
    fetchServices();
    const interval = setInterval(fetchTokens, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (preselectedPatientId) {
      loadPreselectedPatient(preselectedPatientId);
      setShowIssueModal(true);
    }
  }, [preselectedPatientId]);

  const loadPreselectedPatient = async (id: string) => {
    const { data } = await supabase.from("patients").select("*").eq("id", id).single();
    if (data) setSelectedPatient(data as Patient);
  };

  const fetchTokens = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("tokens")
      .select(`
        *,
        patient:patients(full_name, id_card_number),
        doctor:profiles!tokens_doctor_id_fkey(full_name, specialization),
        service:services(name, fee)
      `)
      .eq("date", today)
      .not("status", "eq", "completed")
      .not("status", "eq", "no_show")
      .order("issued_at", { ascending: true });
    setTokens((data || []) as Token[]);
    setLoading(false);
  };

  // Only load doctors with schedule today AND not on leave
  const fetchDoctorsWithSchedules = async () => {
    const todayDay = new Date().getDay();
    const todayDate = format(new Date(), "yyyy-MM-dd");

    // Get doctors with schedule today
    const { data: schedules } = await supabase
      .from("doctor_schedules")
      .select("doctor_id")
      .eq("day_of_week", todayDay)
      .eq("is_active", true);

    if (!schedules || schedules.length === 0) {
      setAvailableDoctors([]);
      return;
    }

    // Get doctors on leave today
    const { data: onLeave } = await supabase
      .from("doctor_leaves")
      .select("doctor_id")
      .eq("leave_date", todayDate)
      .eq("status", "approved");

    const onLeaveIds = new Set((onLeave || []).map((l: any) => l.doctor_id));
    const availableIds = [...new Set(schedules.map((s: any) => s.doctor_id))].filter((id) => !onLeaveIds.has(id));

    if (availableIds.length === 0) {
      setAvailableDoctors([]);
      return;
    }

    const { data: doctors } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "doctor")
      .eq("is_active", true)
      .in("id", availableIds)
      .order("full_name");

    setAvailableDoctors(doctors || []);
  };

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").eq("is_active", true).order("name");
    setServices(data || []);
  };

  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 2) { setPatientResults([]); return; }
    const { data } = await supabase
      .from("patients")
      .select("*")
      .or(`full_name.ilike.%${q}%,id_card_number.ilike.%${q}%`)
      .limit(6);
    setPatientResults(data || []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch, searchPatients]);

  const issueToken = async () => {
    if (!selectedPatient) { toast.error("Select a patient"); return; }
    if (!tokenForm.doctor_id) { toast.error("Select a doctor"); return; }
    setIssuing(true);

    try {
      const doctor = availableDoctors.find((d) => d.id === tokenForm.doctor_id);
      const dept = (doctor?.specialization || "General").charAt(0).toUpperCase();
      const { data: tokenNum, error: tokenNumError } = await supabase.rpc("generate_token_number", { dept });
      if (tokenNumError) throw tokenNumError;

      const service = services.find((s) => s.id === tokenForm.service_id);
      const amount = service?.fee || 0;
      const discount = Math.min(tokenForm.discount, amount);
      const totalAmount = Math.max(0, amount - discount);

      // Create token
      const { data: token, error: tokenError } = await supabase
        .from("tokens")
        .insert({
          token_number: tokenNum,
          patient_id: selectedPatient.id,
          doctor_id: tokenForm.doctor_id,
          service_id: tokenForm.service_id || null,
          status: "waiting",
          category: tokenForm.category,
          created_by: profile?.id,
        })
        .select()
        .single();
      if (tokenError) throw tokenError;

      // Generate receipt number
      const { data: receiptNum, error: receiptNumError } = await supabase.rpc("generate_receipt_number");
      if (receiptNumError) throw receiptNumError;

      // Create receipt
      await supabase.from("receipts").insert({
        receipt_number: receiptNum,
        token_id: token.id,
        patient_id: selectedPatient.id,
        doctor_id: tokenForm.doctor_id,
        service_id: tokenForm.service_id || null,
        amount,
        discount,
        total_amount: totalAmount,
        issued_by: profile?.id,
      });

      // Create appointment
      const { data: appt } = await supabase.from("appointments").insert({
        patient_id: selectedPatient.id,
        doctor_id: tokenForm.doctor_id,
        service_id: tokenForm.service_id || null,
        scheduled_at: new Date().toISOString(),
        status: "confirmed",
        chief_complaint: tokenForm.chief_complaint || null,
        created_by: profile?.id,
      }).select().single();

      if (appt) {
        await supabase.from("tokens").update({ appointment_id: appt.id }).eq("id", token.id);
      }

      // Build receipt data for modal
      setReceiptData({
        token_number: tokenNum,
        patient_name: selectedPatient.full_name,
        patient_cnic: selectedPatient.id_card_number,
        doctor_name: doctor?.full_name || "",
        doctor_dept: doctor?.specialization || "",
        service_name: service?.name || "",
        amount,
        discount,
        total: totalAmount,
        receipt_number: receiptNum,
        issued_at: format(new Date(), "MMM d, yyyy · HH:mm"),
        category: tokenForm.category,
      });

      toast.success(`Token #${tokenNum} issued!`);
      setShowIssueModal(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setTokenForm({ doctor_id: "", service_id: "", category: "General", chief_complaint: "", discount: 0 });
      setShowReceiptModal(true);
      fetchTokens();
    } catch (err: any) {
      toast.error(err.message || "Failed to issue token");
    } finally {
      setIssuing(false);
    }
  };

  // Fix 2: Receptionist can only Call or mark No-Show — no session controls
  const callToken = async (tokenId: string) => {
    await supabase.from("tokens").update({ status: "calling", called_at: new Date().toISOString() }).eq("id", tokenId);
    fetchTokens();
    toast.success("Patient called");
  };

  const markNoShow = async (tokenId: string) => {
    await supabase.from("tokens").update({ status: "no_show" }).eq("id", tokenId);
    fetchTokens();
  };

  const selectedService = services.find((s) => s.id === tokenForm.service_id);
  const discountCapped = Math.min(tokenForm.discount, selectedService?.fee || 0);
  const finalTotal = Math.max(0, (selectedService?.fee || 0) - discountCapped);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Token Queue</h1>
          <p className="page-subtitle">Real-time queue management · {format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); setTokenForm({ doctor_id: "", service_id: "", category: "General", chief_complaint: "", discount: 0 }); setShowIssueModal(true); }} className="btn-primary">
          <Plus size={15} /> Issue Token
        </button>
      </div>

      {availableDoctors.length === 0 && (
        <div className="card p-4 flex items-center gap-3" style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.05)" }}>
          <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400">No doctors available today — either no schedules are set or all doctors are on leave.</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-[#10b981]"><div className="live-dot" /> LIVE</div>
          <span className="text-xs text-[#475569]">{tokens.length} active token{tokens.length !== 1 ? "s" : ""} today</span>
        </div>

        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <th className="table-head">Token #</th>
              <th className="table-head">Patient</th>
              <th className="table-head">Doctor</th>
              <th className="table-head">Category</th>
              <th className="table-head">Wait</th>
              <th className="table-head">Status</th>
              <th className="table-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#475569] text-sm">Loading queue...</td></tr>
            ) : tokens.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#475569] text-sm">No active tokens. Issue a token to get started.</td></tr>
            ) : tokens.map((token) => {
              const waitMin = token.issued_at ? Math.round((Date.now() - new Date(token.issued_at).getTime()) / 60000) : 0;
              return (
                <tr key={token.id} className="table-row">
                  <td className="table-cell font-mono font-semibold text-[#4a9eff]">#{token.token_number}</td>
                  <td className="table-cell">
                    <div>
                      <div className="text-sm font-medium text-white">{(token as any).patient?.full_name}</div>
                      <div className="text-xs text-[#475569]">{(token as any).patient?.id_card_number}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-[#94a3b8]">{(token as any).doctor?.full_name || "—"}</div>
                    <div className="text-xs text-[#475569]">{(token as any).doctor?.specialization}</div>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#94a3b8] uppercase tracking-wide">{token.category}</span>
                  </td>
                  <td className="table-cell text-[#94a3b8] text-sm">{waitMin} min</td>
                  <td className="table-cell">
                    <span className={STATUS_BADGE[token.status] || "badge-completed"}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {token.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-cell">
                    {/* Fix 2: Only Call and No-Show — no session start/end for receptionist */}
                    <div className="flex items-center gap-1.5">
                      {token.status === "waiting" && (
                        <button onClick={() => callToken(token.id)} className="text-xs btn-secondary py-1 px-2">Call</button>
                      )}
                      {(token.status === "waiting" || token.status === "calling") && (
                        <button onClick={() => markNoShow(token.id)} className="text-xs btn-danger py-1 px-2">No Show</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Issue Token Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Issue Token</h3>
              <button onClick={() => setShowIssueModal(false)}><X size={16} className="text-[#94a3b8]" /></button>
            </div>

            <div className="space-y-4">
              {/* Patient search */}
              <div>
                <label className="label">Patient *</label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#4a9eff]/10 border border-[#4a9eff]/20">
                    <div>
                      <div className="text-sm font-medium text-white">{selectedPatient.full_name}</div>
                      <div className="text-xs text-[#94a3b8]">{selectedPatient.id_card_number}</div>
                    </div>
                    <button onClick={() => setSelectedPatient(null)} className="text-[#475569] hover:text-white"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <input
                      ref={searchRef}
                      className="input pl-8"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Search by name or CNIC..."
                      autoComplete="off"
                    />
                    {patientResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 card z-10 overflow-hidden shadow-xl">
                        {patientResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => { setSelectedPatient(p); setPatientResults([]); setPatientSearch(""); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0"
                          >
                            <div className="text-sm text-white">{p.full_name}</div>
                            <div className="text-xs text-[#475569]">{p.id_card_number}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor */}
              <div>
                <label className="label">Doctor * {availableDoctors.length === 0 && <span className="text-amber-400 normal-case font-normal">(no availability today)</span>}</label>
                <select
                  className="input"
                  value={tokenForm.doctor_id}
                  onChange={(e) => setTokenForm({ ...tokenForm, doctor_id: e.target.value })}
                >
                  <option value="">Select doctor with schedule today</option>
                  {availableDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}</option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="label">Service</label>
                <select
                  className="input"
                  value={tokenForm.service_id}
                  onChange={(e) => setTokenForm({ ...tokenForm, service_id: e.target.value, discount: 0 })}
                >
                  <option value="">Select service (optional)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — PKR {s.fee.toLocaleString()}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="label">Visit Category</label>
                <select className="input" value={tokenForm.category} onChange={(e) => setTokenForm({ ...tokenForm, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="label">Chief Complaint</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={tokenForm.chief_complaint}
                  onChange={(e) => setTokenForm({ ...tokenForm, chief_complaint: e.target.value })}
                  placeholder="Brief description of reason for visit..."
                />
              </div>

              {/* Billing — Fix 3: show correct total */}
              {selectedService && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94a3b8]">Service Fee</span>
                    <span className="text-white font-medium">PKR {selectedService.fee.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs text-[#94a3b8]">Discount (PKR)</label>
                    <input
                      type="number"
                      min={0}
                      max={selectedService.fee}
                      step={1}
                      className="input w-32 text-right py-1.5 text-sm"
                      value={tokenForm.discount}
                      onChange={(e) => setTokenForm({ ...tokenForm, discount: Math.min(parseFloat(e.target.value) || 0, selectedService.fee) })}
                    />
                  </div>
                  {tokenForm.discount > 0 && (
                    <div className="flex justify-between text-xs text-[#475569]">
                      <span>Discount Applied</span>
                      <span className="text-emerald-400">- PKR {discountCapped.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t border-white/[0.06] pt-2">
                    <span className="text-[#f59e0b]">Total Payable</span>
                    <span className="text-[#f59e0b]">PKR {finalTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowIssueModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={issueToken} disabled={issuing || availableDoctors.length === 0} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {issuing
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : "Issue Token & Receipt"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal — Fix 3: Shows correct breakdown */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card w-full max-w-xs">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-white">NCMS</div>
                <div className="text-[10px] text-[#475569] uppercase tracking-widest">Clinical Portal</div>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="no-print"><X size={15} className="text-[#94a3b8]" /></button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#475569]">Token</span>
                <span className="font-mono font-bold text-[#4a9eff]">#{receiptData.token_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">Receipt #</span>
                <span className="text-[#94a3b8] font-mono">{receiptData.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#475569]">Date</span>
                <span className="text-[#94a3b8]">{receiptData.issued_at}</span>
              </div>

              <div className="border-t border-white/[0.06] pt-3 space-y-2">
                <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Patient</div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Name</span>
                  <span className="text-white font-medium">{receiptData.patient_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">CNIC</span>
                  <span className="text-[#94a3b8] font-mono">{receiptData.patient_cnic}</span>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-3 space-y-2">
                <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Appointment</div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Doctor</span>
                  <span className="text-white">{receiptData.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Department</span>
                  <span className="text-[#94a3b8]">{receiptData.doctor_dept}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Category</span>
                  <span className="text-[#94a3b8]">{receiptData.category}</span>
                </div>
                {receiptData.service_name && (
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Service</span>
                    <span className="text-[#94a3b8]">{receiptData.service_name}</span>
                  </div>
                )}
              </div>

              {/* Fix 3: Correct billing breakdown */}
              {receiptData.amount > 0 && (
                <div className="border-t border-white/[0.06] pt-3 space-y-2">
                  <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Billing</div>
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Fee</span>
                    <span className="text-[#94a3b8]">PKR {receiptData.amount.toLocaleString()}</span>
                  </div>
                  {receiptData.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#475569]">Discount</span>
                      <span className="text-emerald-400">- PKR {receiptData.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-sm pt-1 border-t border-white/[0.06]">
                    <span className="text-[#f59e0b]">Total Paid</span>
                    <span className="text-[#f59e0b]">PKR {receiptData.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-white/[0.06] pt-3 text-center text-[#475569]">
                <p>Keep this receipt for your records</p>
                <p className="mt-0.5">Thank you for choosing NCMS</p>
              </div>
            </div>

            <div className="p-3 flex gap-2 no-print border-t border-white/[0.06]">
              <button onClick={() => setShowReceiptModal(false)} className="btn-secondary flex-1 justify-center text-xs py-2">Close</button>
              <button onClick={() => window.print()} className="btn-primary flex-1 justify-center text-xs py-2">
                <Printer size={13} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
