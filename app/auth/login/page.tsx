"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

type Role = "admin" | "receptionist" | "doctor";

const ROLES: { id: Role; label: string; color: string }[] = [
  { id: "admin", label: "Admin", color: "#f59e0b" },
  { id: "receptionist", label: "Receptionist", color: "#4a9eff" },
  { id: "doctor", label: "Doctor", color: "#10b981" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("receptionist");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Profile not found. Contact your administrator.");
      }
      if (profile.role !== role) {
        await supabase.auth.signOut();
        throw new Error(`You are not registered as ${role}.`);
      }
      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error("Account is inactive. Contact administrator.");
      }

      toast.success(`Welcome, ${profile.full_name}!`);
      const routes: Record<Role, string> = { admin: "/admin", receptionist: "/receptionist", doctor: "/doctor" };
      router.push(routes[profile.role as Role]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#4a9eff]/10 border border-[#4a9eff]/20 flex items-center justify-center mx-auto mb-4">
            <div className="w-5 h-5 rounded-full border-2 border-[#4a9eff]" />
          </div>
          <h1 className="text-xl font-semibold text-white">NCMS Clinical Portal</h1>
          <p className="text-sm text-[#475569] mt-1">Sign in to your account</p>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Login as</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className="py-2 px-3 rounded-lg border text-xs font-medium transition-all duration-150"
                  style={{
                    background: role === r.id ? `${r.color}15` : "rgba(255,255,255,0.03)",
                    borderColor: role === r.id ? `${r.color}40` : "rgba(255,255,255,0.06)",
                    color: role === r.id ? r.color : "#94a3b8",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
                required
                autoComplete="email"
                className="input"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8]"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-2.5"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                : "Sign In"
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#475569] mt-4">
          Access restricted to authorized medical personnel only
        </p>
      </div>
    </div>
  );
}
