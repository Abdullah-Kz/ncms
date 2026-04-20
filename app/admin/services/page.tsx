"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types";
import { Plus, Edit2, Trash2, X, Clock, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";

export default function AdminServices() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", description: "", duration_minutes: 30, fee: 0, department: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchServices(); fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
    setDepartments(data || []);
  };

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").order("created_at", { ascending: false });
    setServices(data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditItem(null); setForm({ name: "", description: "", duration_minutes: 30, fee: 0, department: "" }); setShowModal(true); };
  const openEdit = (s: Service) => { setEditItem(s); setForm({ name: s.name, description: s.description || "", duration_minutes: s.duration_minutes, fee: s.fee, department: s.department || "" }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.department) { toast.error("Name and department required"); return; }
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase.from("services").update(form).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Service updated");
      } else {
        const { error } = await supabase.from("services").insert({ ...form, created_by: profile?.id });
        if (error) throw error;
        toast.success("Service created");
      }
      setShowModal(false);
      fetchServices();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error("Cannot delete: service is in use"); return; }
    toast.success("Service deleted");
    fetchServices();
  };

  const toggleActive = async (s: Service) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    fetchServices();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Services</h1>
          <p className="page-subtitle">Manage clinical services and pricing</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Service</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-[#475569] text-sm">Loading...</div>
        ) : services.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-[#475569] text-sm">No services found. Add your first service.</div>
        ) : services.map((s) => (
          <div key={s.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                <span className="text-xs text-[#475569] bg-white/[0.04] px-2 py-0.5 rounded-full mt-1 inline-block">{s.department}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-white/[0.06] text-[#94a3b8] hover:text-white transition-colors"><Edit2 size={13} /></button>
                <button onClick={() => deleteService(s.id)} className="p-1.5 rounded hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
            {s.description && <p className="text-xs text-[#94a3b8]">{s.description}</p>}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]"><Clock size={12} /> {s.duration_minutes} min</div>
              <div className="flex items-center gap-1.5 text-xs text-[#f59e0b] font-medium"><DollarSign size={12} /> {s.fee.toLocaleString()}</div>
              <button onClick={() => toggleActive(s)} className={`ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors ${s.is_active ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : "border-white/[0.06] text-[#475569] bg-white/[0.03]"}`}>
                {s.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">{editItem ? "Edit Service" : "Add Service"}</h3>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-[#94a3b8]" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="label">Service Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. MRI Brain Scan" /></div>
              <div><label className="label">Department *</label>
                <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief service description..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Duration (minutes)</label><input className="input" type="number" min={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })} /></div>
                <div><label className="label">Fee (PKR)</label><input className="input" type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: parseFloat(e.target.value) || 0 })} /></div>
              </div>
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
