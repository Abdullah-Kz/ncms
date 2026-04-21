"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Settings, X, Check, Lock, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function TopBar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [time, setTime] = useState(new Date());
  const [showNotif, setShowNotif] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();
  }, [profile]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12);
    const notifs = (data || []) as Notification[];
    setNotifications(notifs);
    setUnread(notifs.filter((n) => !n.is_read).length);
  };

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", profile.id).eq("is_read", false);
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  const changePassword = async () => {
    if (newPassword.length < 8) { toast.error("Minimum 8 characters"); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setNewPassword("");
    setShowSettings(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const TYPE_DOT: Record<string, string> = {
    info: "var(--accent-blue)", success: "var(--accent-green)",
    warning: "var(--accent-gold)", error: "var(--accent-red)",
  };

  const panelStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-lg)",
  };

  const isDark = theme === "dark";

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0 md:mt-0 mt-14"
      style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Left — date/time */}
      <div className="topbar-time hidden md:flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {format(time, "EEEE, MMMM d")}
        </span>
        <span style={{ color: "var(--text-muted)" }}>·</span>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {format(time, "HH:mm")}
        </span>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="relative p-2 rounded-lg transition-all duration-150 group"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
        >
          <span className="theme-icon block">
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotif(!showNotif); setShowSettings(false); }}
            className="relative p-2 rounded-lg transition-all duration-150"
            style={{
              background: showNotif ? "var(--nav-active-bg)" : "transparent",
              color: showNotif ? "var(--accent-blue)" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => { if (!showNotif) { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; } }}
            onMouseLeave={(e) => { if (!showNotif) { (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
          >
            <Bell size={17} />
            {unread > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: "var(--accent-red)" }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl overflow-hidden animate-slide-up" style={panelStyle}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</span>
                  {unread > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-red)", color: "white" }}>
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs font-medium" style={{ color: "var(--accent-blue)" }}>
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotif(false)}>
                    <X size={14} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell size={20} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>No notifications yet</p>
                  </div>
                ) : notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors"
                    style={{
                      background: n.is_read ? "transparent" : "var(--nav-active-bg)",
                      borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.is_read ? "transparent" : "var(--nav-active-bg)"; }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: n.is_read ? "var(--border)" : (TYPE_DOT[n.type] || "var(--accent-blue)") }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{n.title}</div>
                      <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{n.message}</div>
                      <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(n.created_at), "MMM d · HH:mm")}
                      </div>
                    </div>
                    {!n.is_read && <Check size={11} className="mt-1 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowNotif(false); }}
            className="p-2 rounded-lg transition-all duration-150"
            style={{
              background: showSettings ? "var(--bg-input)" : "transparent",
              color: showSettings ? "var(--text-primary)" : "var(--text-secondary)",
            }}
            onMouseEnter={(e) => { if (!showSettings) { (e.currentTarget as HTMLElement).style.background = "var(--bg-input)"; } }}
            onMouseLeave={(e) => { if (!showSettings) { (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
          >
            <Settings size={17} />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-xl overflow-hidden animate-slide-up" style={panelStyle}>
              {/* Profile */}
              <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "var(--nav-active-bg)", color: "var(--accent-blue)" }}
                  >
                    {profile?.full_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{profile?.full_name}</div>
                    <div className="text-xs capitalize truncate" style={{ color: "var(--text-muted)" }}>{profile?.role} · Smartly Brain</div>
                  </div>
                </div>
              </div>

              {/* Theme toggle in settings too */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isDark ? <Moon size={14} style={{ color: "var(--text-muted)" }} /> : <Sun size={14} style={{ color: "var(--accent-gold)" }} />}
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{isDark ? "Dark Mode" : "Light Mode"}</span>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={toggleTheme}
                    className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
                    style={{ background: isDark ? "var(--accent-blue)" : "var(--text-muted)" }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                      style={{ transform: isDark ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </button>
                </div>
              </div>

              {/* Change Password */}
              <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={13} style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Change Password
                  </span>
                </div>
                <input
                  type="password"
                  className="input text-xs py-2"
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && changePassword()}
                />
                <button
                  onClick={changePassword}
                  disabled={savingPw || newPassword.length < 8}
                  className="btn-primary w-full justify-center mt-2 py-2 text-xs"
                >
                  {savingPw
                    ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    : "Update Password"
                  }
                </button>
              </div>

              {/* Sign out */}
              <div className="px-4 py-3">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left"
                  style={{ color: "var(--accent-red)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
