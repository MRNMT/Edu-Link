import { Link, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { type LucideIcon } from "lucide-react";

interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  section: "main" | "management" | "reports";
  badge?: number;
}

interface AdminNavMenuProps {
  navItems: AdminNavItem[];
}

export function AdminNavMenu({ navItems }: AdminNavMenuProps) {
  const location = useLocation();

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
    <nav className="sb-nav" id="sb-nav">
      {renderSection("main", "Main")}
      {renderSection("management", "Management")}
      {renderSection("reports", "Access & Reports")}
    </nav>
  );
}

interface AdminUserInfoProps {
  fullName?: string;
}

export function AdminUserInfo({ fullName }: AdminUserInfoProps) {
  return (
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
          {fullName ?? "School Admin"}
        </div>
        <div className="sb-urole" id="sb-role">
          SCHOOL ADMINISTRATOR
        </div>
      </div>
    </div>
  );
}

interface AdminTopbarProps {
  title: string;
  fullName?: string;
}

export function AdminTopbar({ title, fullName }: AdminTopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-crumb">EduSecure / {title}</div>
        </div>
      </div>
      <div className="topbar-right">
        <div style={{ textAlign: "right" }}>
          <div className="tb-username">{fullName ?? "School Admin"}</div>
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
  );
}

interface AdminLogoProps {}

export function AdminLogo({}: AdminLogoProps) {
  return (
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
        EduSecure
      </div>
    </div>
  );
}
