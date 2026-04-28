import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppSelector } from "@/store";
import { useAppDispatch } from "@/store";
import { logoutThunk } from "@/store/slices/authSlice";
import type { AppRole } from "@/store/slices/authSlice";

const ROLE_LABEL: Record<AppRole, string> = {
  parent: "Guardian",
  teacher: "Teacher",
  school_admin: "School Admin",
  delegate: "Delegate",
  system_admin: "System Admin",
  gate_security: "Gate Security",
};

export const Route = createFileRoute("/_app")({
  component: AppGuard,
});

function AppGuard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, profile, roles } = useAppSelector((s) => s.auth);
  const activeRole = useAppSelector((s) => s.role.activeRole);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          ▮▮▮ Establishing secure session…
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isStandaloneLayoutRoute =
    location.pathname.startsWith("/parent") ||
    location.pathname.startsWith("/child-mode") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/teacher") ||
    location.pathname.startsWith("/delegate") ||
    location.pathname.startsWith("/security") ||
    location.pathname.startsWith("/system");

  if (isStandaloneLayoutRoute) {
    return <Outlet />;
  }

  const effectiveRole = activeRole ?? roles[0] ?? null;

  const navItems: Array<{ to: string; label: string; role: AppRole }> = [
    { to: "/parent", label: "Parent Console", role: "parent" },
    { to: "/teacher", label: "Teacher Console", role: "teacher" },
    { to: "/admin", label: "Admin Console", role: "school_admin" },
    { to: "/delegate", label: "Delegate Console", role: "delegate" },
    { to: "/security", label: "Gate Security", role: "gate_security" },
    { to: "/system", label: "System Console", role: "system_admin" },
  ].filter((item) => roles.includes(item.role));

  const doLogout = async () => {
    await dispatch(logoutThunk());
    navigate({ to: "/login" });
  };

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
            <div className="sb-uname">{profile?.full_name ?? session.user.full_name}</div>
            <div className="sb-urole">{effectiveRole?.replace("_", " ") ?? "Role"}</div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-lbl">Main</div>
          {navItems.map((item) => {
            const selected = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`nav-item ${selected ? "active" : ""}`}>
                <div className="nav-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sb-bottom">
          <button type="button" className="btn-signout" onClick={doLogout}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
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
