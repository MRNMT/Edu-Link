import { Link, useNavigate } from "@tanstack/react-router";
import { useAppDispatch, useAppSelector } from "@/store";
import { logoutThunk } from "@/store/slices/authSlice";
import { LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  parent: "Guardian",
  teacher: "Teacher",
  school_admin: "School Admin",
  delegate: "Delegate",
  system_admin: "System Admin",
  gate_security: "Gate Security",
};

export function ConsoleHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const profile = useAppSelector((s) => s.auth.profile);
  const activeRole = useAppSelector((s) => s.role.activeRole);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate({ to: "/login" });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link to="/" className="flex items-center gap-3">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-crumb">EduSecure-Link / {subtitle ?? "Secure Console"}</div>
          </div>
        </Link>
      </div>
      <div className="topbar-right">
        <div style={{ textAlign: "right" }}>
          <div className="tb-username">{profile?.full_name ?? "—"}</div>
          <div className="tb-role">{activeRole ? ROLE_LABEL[activeRole] : ""}</div>
        </div>
        <button onClick={handleLogout} className="btn-tb-signout">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
