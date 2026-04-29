import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  UserPlus,
  ShieldAlert,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { todayIso } from "@/features/admin/utils";
import { AdminNavMenu, AdminUserInfo, AdminTopbar, AdminLogo } from "./layout-components";

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
  const profile = useAppSelector((s) => s.auth.profile);

  const [stats, setStats] = useState<AdminSidebarStats>({ pendingLinks: 0 });

  useEffect(() => {
    if (!profile?.school_id) return;
    void (async () => {
      try {
        const [delegates, childLinks] = await Promise.all([
          localApi.ops.admin.delegates("pending"),
          localApi.ops.admin.childLinkRequests("pending"),
        ]);
        setStats({ pendingLinks: delegates.length + childLinks.length });
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
        to: "/admin/add-parent",
        label: "Add Parent",
        icon: UserPlus,
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

  return (
    <div id="app" className="active">
      <aside className="sidebar" id="sidebar">
        <AdminLogo />
        <AdminUserInfo fullName={profile?.full_name} />
        <AdminNavMenu navItems={navItems} />
        <div className="sb-bottom">
          <button type="button" className="btn-signout" onClick={doLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main">
        <AdminTopbar title={title} fullName={profile?.full_name} />
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
      childLinkRequests: [],
      auditRows: [],
    };
  }

  const [children, teachers, attendance, delegates, childLinkRequests, audit] = await Promise.all([
    localApi.children.schoolChildren(schoolId),
    localApi.ops.admin.listTeachers(),
    localApi.ops.admin.attendanceReview(todayIso),
    localApi.ops.admin.delegates("pending"),
    localApi.ops.admin.childLinkRequests("pending"),
    localApi.ops.admin.audit({ from: todayIso, to: todayIso, page: 1, pageSize: 20 }),
  ]);

  const presentToday = attendance.classes.reduce((sum, cls) => sum + cls.present, 0);
  const attendanceTotal = attendance.classes.reduce((sum, cls) => sum + cls.total, 0);

  return {
    learnersCount: children.length,
    teachersCount: teachers.length,
    presentToday,
    attendanceTotal,
    pendingLinks: delegates.length + childLinkRequests.length,
    delegates,
    childLinkRequests,
    auditRows: audit.rows,
  };
}
