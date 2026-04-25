"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, UserPlus, Coins, Stethoscope, BarChart3,
  Users, Settings, LogOut, Activity, ClipboardList,
  Calendar, Layers, Building2, Menu, X, Brain,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useState } from "react";

const NAV_ITEMS = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/admin/receptionists", label: "Receptionists", icon: Users },
    { href: "/admin/departments", label: "Departments", icon: Building2 },
    { href: "/admin/services", label: "Services", icon: Layers },
    { href: "/admin/leaves", label: "Leave Management", icon: Calendar },
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
  admin: "#c9922a",
  receptionist: "#6b8e5a",
  doctor: "#5a9a6f",
};

function NavItem({ item, active, onClick }: { item: any; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onClick} className={clsx("nav-link", active && "nav-link-active")}>
      <Icon size={16} />
      <span>{item.label}</span>
    </Link>
  );
}

const Logo = ({ roleColor }: { roleColor: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${roleColor}18`, border: `1.5px solid ${roleColor}35` }}>
      <Brain size={18} style={{ color: roleColor }} />
    </div>
    <div className="min-w-0">
      <div className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
        Smartify Brain
      </div>
      <div className="text-[9px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
        Child Development & Rehab
      </div>
    </div>
  </div>
);

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!profile) return null;

  const navItems = (NAV_ITEMS as any)[profile.role] || [];
  const roleColor = ROLE_COLORS[profile.role] || "var(--accent-blue)";

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin" && href !== "/receptionist" && href !== "/doctor" && pathname.startsWith(href));

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/auth/login");
  };

  const mobileNavItems = navItems.slice(0, 4);

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <Logo roleColor={roleColor} />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item: any) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} onClick={onItemClick} />
        ))}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${roleColor}20`, color: roleColor }}>
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{profile.full_name}</div>
            <div className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>{profile.role}</div>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-left"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent-red)"; (e.currentTarget as HTMLElement).style.background = "rgba(192,80,58,0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = ""; }}
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar w-[230px] min-h-screen flex-shrink-0 hidden md:flex flex-col"
        style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4"
        style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        <Logo roleColor={roleColor} />
        <div className="flex items-center gap-2">
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{profile.full_name.split(" ")[0]}</div>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl" style={{ background: "var(--bg-input)" }}>
            <Menu size={17} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 flex flex-col h-full animate-slide-right"
            style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border)" }}>
            <div className="absolute top-3 right-3">
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg" style={{ background: "var(--bg-input)" }}>
                <X size={16} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around h-16 px-2"
        style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border)" }}>
        {mobileNavItems.map((item: any) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all min-w-0"
              style={{ color: active ? roleColor : "var(--text-muted)" }}>
              <Icon size={20} />
              <span className="text-[10px] font-semibold truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
