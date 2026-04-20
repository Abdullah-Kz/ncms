"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface TopBarProps {
  searchPlaceholder?: string;
  rightContent?: React.ReactNode;
}

export default function TopBar({ searchPlaceholder = "Search patients, records...", rightContent }: TopBarProps) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profile) return;
    const fetchNotifications = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };
    fetchNotifications();
  }, [profile]);

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="input pl-8 py-1.5 text-xs h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {rightContent}

        <div className="text-xs text-[#475569]">
          <span className="text-[#94a3b8]">{format(time, "MMM d")}</span>
          {" · "}
          {format(time, "HH:mm")}
        </div>

        <button className="relative p-2 rounded-lg hover:bg-white/[0.05] transition-colors">
          <Bell size={16} className="text-[#94a3b8]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#4a9eff] rounded-full" />
          )}
        </button>

        <button className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors">
          <Settings size={16} className="text-[#94a3b8]" />
        </button>
      </div>
    </header>
  );
}
