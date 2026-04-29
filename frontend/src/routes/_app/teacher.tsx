import { createFileRoute, redirect, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAppDispatch, useAppSelector, store } from "@/store";
import { logoutThunk } from "@/store/slices/authSlice";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  BookOpenText,
  ClipboardList,
  Megaphone,
  BellRing,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_app/teacher")({
  beforeLoad: () => {
    const state = store.getState();
    const { roles, loading } = state.auth;
    if (loading) return;
    if (!roles.includes("teacher")) {
      throw redirect({ to: "/login" });
    }
  },
  component: TeacherLayout,
});

function TeacherLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, profile, user } = useAppSelector((s) => s.auth);

  const navItems = useMemo(
    () => [
      { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Main" },
      { to: "/teacher/my-classes", label: "My Classes", icon: Users, section: "Academic" },
      { to: "/teacher/attendance", label: "Attendance", icon: CalendarCheck2, section: "Academic" },
      { to: "/teacher/homework", label: "Homework", icon: BookOpenText, section: "Academic" },
      { to: "/teacher/quizzes", label: "Quizzes", icon: ClipboardList, section: "Academic" },
      { to: "/teacher/announcements", label: "Announcements", icon: Megaphone, section: "Communication" },
      {
        to: "/teacher/parent-notifications",
        label: "Parent Notifications",
        icon: BellRing,
        section: "Communication",
      },
    ],
    [],
  );

  const doLogout = async () => {
    await dispatch(logoutThunk());
    navigate({ to: "/login" });
  };

  if (loading) return null;

  const fullName = profile?.full_name ?? user?.full_name ?? "Teacher";

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
            EduSecure-<span>Link</span>
          </div>
        </div>

        <div className="sb-user">
          <div className="sb-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div>
            <div className="sb-uname">{fullName}</div>
            <div className="sb-urole">TEACHER</div>
          </div>
        </div>

        <nav className="sb-nav" id="sb-nav">
          {[
            { name: "Main", items: navItems.filter((item) => item.section === "Main") },
            { name: "Academic", items: navItems.filter((item) => item.section === "Academic") },
            { name: "Communication", items: navItems.filter((item) => item.section === "Communication") },
          ].map((section) => (
            <div key={section.name}>
              <div className="sb-section-lbl">{section.name}</div>
              {section.items.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                const Icon = item.icon as LucideIcon;
                return (
                  <Link key={item.to} to={item.to} className={`nav-item ${active ? "active" : ""}`}>
                    <div className="nav-icon">
                      <Icon className="h-4 w-4" />
                    </div>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sb-bottom">
          <button type="button" className="btn-signout" onClick={doLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
