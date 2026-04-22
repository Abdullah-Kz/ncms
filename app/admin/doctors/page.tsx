"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { Plus, Edit2, UserX, UserCheck, Search, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Link from "next/link";

interface Department {
  id: string;
  name: string;
  is_active: boolean;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", specialization: "", password: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!search) { setFiltered(doctors); return; }
    const q = search.toLowerCase();
    setFiltered(doctors.filter((d) =>
      d.full_name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      (d.specialization || "").toLowerCase().includes(q)
    ));
  }, [search, doctors]);

  const fetchDoctors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "doctor")
      .order("created_at", { ascending: false });
    setDoctors(data || []);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name");
    setDepartments(data || []);
  };

  const openAdd = () => {
    setEditDoc(null);
    setForm({ full_name: "", email: "", phone: "", specialization: "", password: "" });
    setShowModal(true);
  };

  const openEdit = (doc: Profile) => {
    setEditDoc(doc);
    setForm({ full_name: doc.full_name, email: doc.email, phone: doc.phone || "", specialization: doc.specialization || "", password: "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.specialization) {
      toast.error("Fill all required fields");
      return;
    }
    setSaving(true);
    try {
      if (editDoc) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: form.full_name, phone: form.phone, specialization: form.specialization })
          .eq("id", editDoc.id);
        if (error) throw error;
        toast.success("Doctor updated");
      } else {
        if (!form.password) { toast.error("Password required for new user"); setSaving(false); return; }
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, role: "doctor" }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        toast.success("Doctor created successfully");
      }
      setShowModal(false);
      fetchDoctors();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (doc: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !doc.is_active })
      .eq("id", doc.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Doctor ${doc.is_active ? "deactivated" : "activated"}`);
    fetchDoctors();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-subtitle">Manage medical staff and their specializations</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Add Doctor
        </button>
      </div>

      {departments.length === 0 && (
        <div className="card p-4 flex items-center gap-3" style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.05)" }}>
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400">
            No departments found.{" "}
            <Link href="/admin/departments" className="underline font-medium">Add departments first</Link>{" "}
            before adding doctors.
          </p>
        </div>
      )}

      <div className="card p-4 flex items-center gap-3">
        <Search size={14} style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search by name, email or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {search && (
          <button onClick={() => setSearch("")}>
            <X size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="table-head">Doctor</th>
              <th className="table-head">Department</th>
              <th className="table-head">Phone</th>
              <th className="table-head">Status</th>
              <th className="table-head">Joined</th>
              <th className="table-head">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>No doctors found</td></tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: "rgba(90,154,111,0.12)", color: "var(--accent-green)" }}>
                        {doc.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{doc.full_name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{doc.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    {doc.specialization ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: "var(--nav-active-bg)", color: "var(--accent-blue)", border: "1px solid var(--nav-active-border)" }}>
                        {doc.specialization}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="table-cell" style={{ color: "var(--text-secondary)" }}>{doc.phone || "—"}</td>
                  <td className="table-cell">
                    <span className={doc.is_active ? "badge-session" : "badge-completed"}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: doc.is_active ? "var(--accent-green)" : "var(--text-muted)" }} />
                      {doc.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(doc.created_at), "MMM d, yyyy")}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => toggleActive(doc)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = doc.is_active ? "rgba(192,80,58,0.08)" : "rgba(90,154,111,0.08)"; (e.currentTarget as HTMLElement).style.color = doc.is_active ? "var(--accent-red)" : "var(--accent-green)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                        {doc.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                {editDoc ? "Edit Doctor" : "Add New Doctor"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Dr. John Smith"
                />
              </div>
              {!editDoc && (
                <div>
                  <label className="label">Email *</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                  />
                </div>
              )}
              <div>
                <label className="label">Department / Specialization *</label>
                {departments.length === 0 ? (
                  <div className="input flex items-center gap-2 text-amber-400 bg-amber-500/5 border-amber-500/20">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span className="text-xs">
                      No departments available —{" "}
                      <Link href="/admin/departments" className="underline">add departments first</Link>
                    </span>
                  </div>
                ) : (
                  <select
                    className="input"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+92 300 0000000"
                />
              </div>
              {!editDoc && (
                <div>
                  <label className="label">Password *</label>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || departments.length === 0}
                className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : editDoc ? "Update" : "Create Doctor"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
