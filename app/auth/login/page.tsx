"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Eye, EyeOff, Brain, Shield, Stethoscope, UserCheck } from "lucide-react";

type Role = "admin" | "receptionist" | "doctor";

const ROLES: { id: Role; label: string; icon: any; color: string }[] = [
  { id: "admin", label: "Admin", icon: Shield, color: "#c9922a" },
  { id: "receptionist", label: "Receptionist", icon: UserCheck, color: "#6b8e5a" },
  { id: "doctor", label: "Doctor", icon: Stethoscope, color: "#5a9a6f" },
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
        .from("profiles").select("*").eq("id", data.user.id).single();
      if (profileError || !profile) { await supabase.auth.signOut(); throw new Error("Profile not found. Contact your administrator."); }
      if (profile.role !== role) { await supabase.auth.signOut(); throw new Error(`You are not registered as ${role}.`); }
      if (!profile.is_active) { await supabase.auth.signOut(); throw new Error("Account is inactive. Contact administrator."); }
      toast.success(`Welcome, ${profile.full_name}!`);
      const routes: Record<Role, string> = { admin: "/admin", receptionist: "/receptionist", doctor: "/doctor" };
      router.push(routes[profile.role as Role]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const activeRole = ROLES.find((r) => r.id === role)!;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* Left panel — decorative, hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-96 p-10 relative overflow-hidden flex-shrink-0"
        style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border)" }}>
        {/* Organic shapes */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #6b8e5a, transparent)" }} />
        <div className="absolute bottom-20 -right-10 w-48 h-48 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #c9922a, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #5a9a6f, transparent)" }} />

        {/* Logo top */}
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(107,142,90,0.15)", border: "1.5px solid rgba(107,142,90,0.3)" }}>
            <Brain size={22} style={{ color: "var(--accent-blue)" }} />
          </div>
          <div>
            <div className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>Smartly Brain</div>
            <div className="text-[10px] leading-snug mt-0.5" style={{ color: "var(--text-muted)" }}>Child Development & Rehabilitation Center</div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative space-y-4">
          <h1 className="text-3xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            Every child
            <br />
            <span style={{ color: "var(--accent-blue)" }}>deserves</span> to
            <br />
            thrive.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Integrated care management for child development and rehabilitation specialists.
          </p>
        </div>

        {/* Footer */}
        <div className="relative text-xs" style={{ color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} Smartly Brain · Child Development & Rehabilitation Center
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(107,142,90,0.15)", border: "1.5px solid rgba(107,142,90,0.3)" }}>
            <Brain size={20} style={{ color: "var(--accent-blue)" }} />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Smartly Brain</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Child Development & Rehab Center</div>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Sign in to your portal account</p>
          </div>

          <div className="card p-6 space-y-5">
            {/* Role selector */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const active = role === r.id;
                  return (
                    <button key={r.id} type="button" onClick={() => setRole(r.id)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all duration-150"
                      style={{
                        background: active ? `${r.color}12` : "var(--bg-input)",
                        borderColor: active ? `${r.color}40` : "var(--border)",
                        color: active ? r.color : "var(--text-muted)",
                      }}
                    >
                      <Icon size={16} />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@smartlybrain.com" required autoComplete="email" className="input" />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" required autoComplete="current-password"
                    className="input pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-3 text-sm"
                style={{ background: activeRole.color }}>
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                  : `Sign In as ${activeRole.label}`
                }
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            Access restricted to authorized Smartly Brain staff only
          </p>
        </div>
      </div>
    </div>
  );
}
