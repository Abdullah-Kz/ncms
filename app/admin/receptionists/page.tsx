"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { Plus, Edit2, UserX, UserCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AdminReceptionists() {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("role", "receptionist").order("created_at", { ascending: false });
    setStaff(data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditItem(null); setForm({ full_name: "", email: "", phone: "", password: "" }); setShowModal(true); };
  const openEdit = (p: Profile) => { setEditItem(p); setForm({ full_name: p.full_name, email: p.email, phone: p.phone || "", password: "" }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.full_name || !form.email) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Receptionist updated");
      } else {
        if (!form.password) { toast.error("Password required"); setSaving(false); return; }
        const res = await fetch("/api/admin/create-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, role: "receptionist" }) });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        toast.success("Receptionist created");
      }
      setShowModal(false);
      fetchStaff();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const toggleActive = async (p: Profile) => {
    await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
    toast.success(`${p.is_active ? "Deactivated" : "Activated"}`);
    fetchStaff();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Receptionists</h1>
          <p className="page-subtitle">Manage front desk and intake staff</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Receptionist</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="table-head">Staff Member</th>
              <th className="table-head">Phone</th>
              <th className="table-head">Status</th>
              <th className="table-head">Joined</th>
              <th className="table-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-[#475569] text-sm">Loading...</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-[#475569] text-sm">No receptionists found</td></tr>
            ) : staff.map((p) => (
              <tr key={p.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#4a9eff]/10 flex items-center justify-center text-xs font-semibold text-[#4a9eff]">{p.full_name.charAt(0)}</div>
                    <div>
                      <div className="text-sm font-medium text-white">{p.full_name}</div>
                      <div className="text-xs text-[#475569]">{p.email}</div>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-[#94a3b8]">{p.phone || "—"}</td>
                <td className="table-cell">
                  <span className={p.is_active ? "badge-session" : "badge-completed"}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.is_active ? "#10b981" : "#64748b" }} />
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="table-cell text-[#475569] text-xs">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-white/[0.06] text-[#94a3b8] hover:text-white transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => toggleActive(p)} className="p-1.5 rounded hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors">
                      {p.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">{editItem ? "Edit Receptionist" : "Add Receptionist"}</h3>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-[#94a3b8]" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" /></div>
              {!editItem && <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@hospital.com" /></div>}
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" /></div>
              {!editItem && <div><label className="label">Password *</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 characters" /></div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : editItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
