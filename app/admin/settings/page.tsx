"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Shield, Lock } from "lucide-react";

export default function AdminSettings() {
  const { profile } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) { toast.error("Passwords don't match"); return; }
    if (passwordForm.newPass.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    if (error) { toast.error(error.message); } else { toast.success("Password updated successfully"); setPasswordForm({ current: "", newPass: "", confirm: "" }); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your administrator account</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center"><Shield size={15} className="text-[#f59e0b]" /></div>
          <h2 className="text-sm font-semibold text-white">Account Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Full Name</label><div className="input bg-white/[0.02] text-[#94a3b8]">{profile?.full_name}</div></div>
          <div><label className="label">Email</label><div className="input bg-white/[0.02] text-[#94a3b8]">{profile?.email}</div></div>
          <div><label className="label">Role</label><div className="input bg-white/[0.02] text-[#f59e0b] capitalize">{profile?.role}</div></div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#4a9eff]/10 flex items-center justify-center"><Lock size={15} className="text-[#4a9eff]" /></div>
          <h2 className="text-sm font-semibold text-white">Change Password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div><label className="label">New Password</label><input className="input" type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} placeholder="Minimum 8 characters" /></div>
          <div><label className="label">Confirm New Password</label><input className="input" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} placeholder="Repeat new password" /></div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
