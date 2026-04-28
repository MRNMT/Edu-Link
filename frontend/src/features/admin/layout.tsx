import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { logoutThunk } from "@/store/slices/authSlice";
import { localApi } from "@/lib/localApi";
import {
  LayoutDashboard,
  School,
  GraduationCap,
  BookOpenText,
  Users,
  CalendarCheck,
  UserRoundCheck,
  ShieldAlert,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { todayIso } from "@/features/admin/utils";

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

interface AdminSidebarStats {
  pendingLinks: number;
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useAppSelector((s) => s.auth.profile);

  const [stats, setStats] = useState<AdminSidebarStats>({ pendingLinks: 0 });

  useEffect(() => {
    if (!profile?.school_id) return;
    void (async () => {
      try {
        const delegates = await localApi.ops.admin.delegates("pending");
        setStats({ pendingLinks: delegates.length });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load admin sidebar data");
      }
    })();
  }, [profile?.school_id]);

  const doLogout = async () => {
    await dispatch(logoutThunk());
    navigate({ to: "/login" });
  };

  const navItems: Array<{
    to: string;
    label: string;
    icon: LucideIcon;
    section: "main" | "management" | "reports";
    badge?: number;
  }> = useMemo(
    () => [
      {
        to: "/admin/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        section: "main",
      },
      {
        to: "/admin/school-overview",
        label: "School Overview",
        icon: School,
        section: "main",
      },
      {
        to: "/admin/learners",
        label: "Learners",
        icon: GraduationCap,
        section: "management",
      },
      {
        to: "/admin/classes",
        label: "Classes",
        icon: BookOpenText,
        section: "management",
      },
      {
        to: "/admin/teachers",
        label: "Teachers",
        icon: Users,
        section: "management",
      },
      {
        to: "/admin/attendance",
        label: "Attendance",
        icon: CalendarCheck,
        section: "management",
      },
      {
        to: "/admin/parents-guardians",
        label: "Parents & Guardians",
        icon: UserRoundCheck,
        section: "management",
      },
      {
        to: "/admin/link-requests",
        label: "Link Requests",
        icon: ShieldAlert,
        section: "reports",
        badge: stats.pendingLinks,
      },
      {
        to: "/admin/reports",
        label: "Reports",
        icon: BarChart3,
        section: "reports",
      },
    ],
    [stats.pendingLinks],
  );

  const renderSection = (section: "main" | "management" | "reports", label: string) => (
    <>
      <div className="sb-section-lbl">{label}</div>
      {navItems
        .filter((item) => item.section === section)
        .map((item) => {
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
    </>
  );

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
            </svg>
          </div>
          <div className="sb-logo-text">
            EduSecure-<span>Link</span>
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
              {profile?.full_name ?? "School Admin"}
            </div>
            <div className="sb-urole" id="sb-role">
              SCHOOL ADMINISTRATOR
            </div>
          </div>
        </div>

        <nav className="sb-nav" id="sb-nav">
          {renderSection("main", "Main")}
          {renderSection("management", "Management")}
          {renderSection("reports", "Access & Reports")}
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
              <div className="topbar-crumb">EduSecure-Link / {title}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div style={{ textAlign: "right" }}>
              <div className="tb-username">{profile?.full_name ?? "School Admin"}</div>
              <div className="tb-role">School Administrator</div>
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

export async function loadAdminDashboardData(schoolId: string | null) {
  if (!schoolId) {
    return {
      learnersCount: 0,
      teachersCount: 0,
      presentToday: 0,
      attendanceTotal: 0,
      pendingLinks: 0,
      delegates: [],
      auditRows: [],
    };
  }

  const [children, teachers, attendance, delegates, audit] = await Promise.all([
    localApi.children.schoolChildren(schoolId),
    localApi.ops.admin.listTeachers(),
    localApi.ops.admin.attendanceReview(todayIso),
    localApi.ops.admin.delegates("pending"),
    localApi.ops.admin.audit({ from: todayIso, to: todayIso, page: 1, pageSize: 20 }),
  ]);

  const presentToday = attendance.classes.reduce((sum, cls) => sum + cls.present, 0);
  const attendanceTotal = attendance.classes.reduce((sum, cls) => sum + cls.total, 0);

  return {
    learnersCount: children.length,
    teachersCount: teachers.length,
    presentToday,
    attendanceTotal,
    pendingLinks: delegates.length,
    delegates,
    auditRows: audit.rows,
  };
}
