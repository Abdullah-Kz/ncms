"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, UserPlus, Coins, Stethoscope, BarChart3,
  Users, Settings, LogOut, Bell, Activity, ClipboardList,
  Calendar, Shield, Layers, Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

const NAV_ITEMS = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/admin/receptionists", label: "Receptionists", icon: Users },
    { href: "/admin/departments", label: "Departments", icon: Building2 },
    { href: "/admin/services", label: "Services", icon: Layers },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
  receptionist: [
    { href: "/receptionist", label: "Dashboard", icon: LayoutDashboard },
    { href: "/receptionist/patients", label: "Register Patient", icon: UserPlus },
    { href: "/receptionist/queue", label: "Token Queue", icon: Coins },
    { href: "/receptionist/history", label: "Patient History", icon: ClipboardList },
    { href: "/receptionist/appointments", label: "Appointments", icon: Calendar },
  ],
  doctor: [
    { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/doctor/sessions", label: "My Sessions", icon: Activity },
    { href: "/doctor/patients", label: "My Patients", icon: Users },
    { href: "/doctor/schedule", label: "Schedule", icon: Calendar },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#f59e0b",
  receptionist: "#4a9eff",
  doctor: "#10b981",
};

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!profile) return null;

  const navItems = NAV_ITEMS[profile.role] || [];
  const roleColor = ROLE_COLORS[profile.role];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/auth/login");
  };

  return (
    <aside
      className="w-[220px] min-h-screen flex flex-col"
      style={{
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${roleColor}15`, border: `1px solid ${roleColor}30` }}
          >
            <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: roleColor }} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm tracking-tight">NCMS</div>
            <div className="text-[10px] text-[#475569] uppercase tracking-widest">Clinical Portal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/receptionist" && item.href !== "/doctor" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx("nav-link", active && "nav-link-active")}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: `${roleColor}20`, color: roleColor }}
          >
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-medium text-[#f1f5f9] truncate">{profile.full_name}</div>
            <div className="text-[10px] text-[#475569] capitalize">{profile.role}</div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
