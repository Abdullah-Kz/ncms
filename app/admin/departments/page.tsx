"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Plus, Edit2, Trash2, X, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Department {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDepartments() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true });
    setDepartments(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (d: Department) => {
    setEditItem(d);
    setForm({ name: d.name, description: d.description || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Department name is required"); return; }
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase
          .from("departments")
          .update({ name: form.name.trim(), description: form.description.trim() || null })
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("Department updated");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({ name: form.name.trim(), description: form.description.trim() || null, created_by: profile?.id });
        if (error) {
          if (error.message.includes("unique")) throw new Error("Department already exists");
          throw error;
        }
        toast.success("Department added");
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: Department) => {
    await supabase.from("departments").update({ is_active: !d.is_active }).eq("id", d.id);
    toast.success(`Department ${d.is_active ? "deactivated" : "activated"}`);
    fetchDepartments();
  };

  const deleteDepartment = async (d: Department) => {
    if (!confirm(`Delete "${d.name}"? This may affect existing doctor profiles.`)) return;
    const { error } = await supabase.from("departments").delete().eq("id", d.id);
    if (error) { toast.error("Failed to delete department"); return; }
    toast.success("Department deleted");
    fetchDepartments();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage clinical departments and specializations</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-[#475569] text-sm">Loading...</div>
        ) : departments.length === 0 ? (
          <div className="col-span-3 card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <Building2 size={22} className="text-[#475569]" />
            </div>
            <p className="text-[#94a3b8] text-sm font-medium">No departments yet</p>
            <p className="text-[#475569] text-xs mt-1">Add departments to assign doctors to specializations</p>
            <button onClick={openAdd} className="btn-primary mx-auto mt-4">
              <Plus size={15} /> Add First Department
            </button>
          </div>
        ) : (
          departments.map((d) => (
            <div key={d.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#4a9eff]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-[#4a9eff]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{d.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-1 inline-block ${d.is_active ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : "border-white/[0.06] text-[#475569] bg-white/[0.03]"}`}>
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-white/[0.06] text-[#94a3b8] hover:text-white transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deleteDepartment(d)} className="p-1.5 rounded hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {d.description && (
                <p className="text-xs text-[#94a3b8]">{d.description}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#475569]">Added {format(new Date(d.created_at), "MMM d, yyyy")}</span>
                <button
                  onClick={() => toggleActive(d)}
                  className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
                >
                  {d.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">
                {editItem ? "Edit Department" : "Add Department"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={16} className="text-[#94a3b8]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Department Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cardiology"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this department..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : editItem ? "Update" : "Add Department"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
