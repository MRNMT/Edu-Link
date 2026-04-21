import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { logoutThunk } from "@/store/slices/authSlice";
import { Shield, LogOut, Moon, Sun } from "lucide-react";

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("sentinel-theme");
    const nextTheme = saved === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate({ to: "/login" });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
    localStorage.setItem("sentinel-theme", nextTheme);
  };

  return (
    <header className="border-b border-border/60 bg-panel/80 backdrop-blur supports-[backdrop-filter]:bg-panel/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sentinel · {subtitle ?? "Secure Console"}
            </div>
            <div className="text-sm font-semibold tracking-tight">{title}</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium">{profile?.full_name ?? "—"}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {activeRole ? ROLE_LABEL[activeRole] : ""}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-panel-elevated px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-panel-elevated px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
