import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { logoutThunk } from "@/store/slices/authSlice";
import { localApi, type ParentDashboardOverview } from "@/lib/localApi";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Bell,
  MessageSquare,
  CalendarDays,
  ClipboardPenLine,
  type LucideIcon,
} from "lucide-react";

interface ParentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function ParentLayout({ title, children }: ParentLayoutProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);
  const [overview, setOverview] = useState<ParentDashboardOverview | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await localApi.ops.parent.dashboard();
        setOverview(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load parent overview");
      }
    })();
  }, [user]);

  const unreadHomework = useMemo(
    () => (overview?.homework ?? []).filter((item) => !item.read_at).length,
    [overview],
  );
  const unreadNotifications =
    overview?.unread_notification_count ??
    (overview?.notifications ?? []).filter((item) => !item.read_at).length;

  const parentName = overview?.parent_name ?? profile?.full_name ?? user?.full_name ?? "Guardian";

  const doLogout = async () => {
    await dispatch(logoutThunk());
    navigate({ to: "/login" });
  };

  const navItems: Array<{
    to: string;
    label: string;
    icon: LucideIcon;
    badge?: number;
  }> = [
    { to: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/parent/my-children", label: "My Children", icon: Users },
    { to: "/parent/homework", label: "Homework", icon: BookOpen, badge: unreadHomework },
    {
      to: "/parent/notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadNotifications,
    },
    { to: "/parent/messages", label: "Messages", icon: MessageSquare },
    { to: "/parent/absences", label: "Absences", icon: CalendarDays },
    { to: "/parent/absence-report", label: "Absence", icon: ClipboardPenLine },
  ];

  return (
    <div id="app" className="active">
      <aside className="sidebar" id="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z"
                fill="rgba(255,255,255,0.85)"
              />
              <circle cx="12" cy="11" r="3" fill="#0e2a52" />
              <path
                d="M8 19c0-2.2 1.8-4 4-4s4 1.8 4 4"
                stroke="#0e2a52"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="sb-logo-text">
            EduSecure
          </div>
        </div>

        <div className="sb-user" id="sb-user">
          <div className="sb-avatar" id="sb-avatar">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div>
            <div className="sb-uname" id="sb-name">
              {parentName}
            </div>
            <div className="sb-urole" id="sb-role">
              GUARDIAN
            </div>
          </div>
        </div>

        <nav className="sb-nav" id="sb-nav">
          <div className="sb-section-lbl">Parent</div>
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={`nav-item ${active ? "active" : ""}`}>
                <div className="nav-icon">
                  <Icon className="h-4 w-4" />
                </div>
                {item.label}
                {!!item.badge && item.badge > 0 ? <div className="nav-badge">{item.badge}</div> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sb-bottom">
          <button type="button" className="btn-signout" onClick={doLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-crumb">EduSecure / Parent</div>
            </div>
          </div>
          <div className="topbar-right">
            <div style={{ textAlign: "right" }}>
              <div className="tb-username">{parentName}</div>
              <div className="tb-role">Guardian</div>
            </div>
            <div className="tb-avatar">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="content" id="main-content">
          {children}
        </div>
      </div>
    </div>
  );
}
