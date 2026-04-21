import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, KeyRound, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import { clearError, loginThunk } from "@/store/slices/authSlice";
import { setActiveRole } from "@/store/slices/roleSlice";
import { roleHomePath } from "@/lib/roleRouting";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const DEMO = [
  { label: "Guardian", email: "parent@demo.school" },
  { label: "Teacher", email: "teacher@demo.school" },
  { label: "School Admin", email: "admin@demo.school" },
  { label: "Gate Security", email: "security@demo.school" },
  { label: "Delegate", email: "delegate@demo.school" },
  { label: "System Admin", email: "sysadmin@demo.school" },
];

function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { session, roles, loading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState("parent@demo.school");
  const [password, setPassword] = useState("demo1234");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Once session + roles known → redirect
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Once session + roles known → redirect
  useEffect(() => {
    if (session && roles.length > 0) {
      const r = roles[0];
      dispatch(setActiveRole({ role: r }));
      navigate({ to: roleHomePath(r) });
    }
  }, [session, roles, navigate, dispatch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    dispatch(clearError());
    await dispatch(loginThunk({ email, password }));
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: brand panel */}
        <div className="panel relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Sentinel · v1.0
                </div>
                <div className="text-lg font-semibold">School Security Console</div>
              </div>
            </div>
            <h1 className="mt-12 text-4xl font-bold leading-tight tracking-tight">
              Every pickup,
              <br />
              <span className="text-primary">verified</span> at the gate.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Encrypted QR tokens, OTP fallback, child-mode lock and an immutable
              audit trail — built for parents, teachers, school admins and gate
              security officers.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["AES", "QR encryption"],
              ["30 min", "Token lifetime"],
              ["6 roles", "RBAC enforced"],
            ].map(([k, v]) => (
              <div key={v} className="panel-elevated p-3">
                <div className="font-mono text-base font-bold text-primary">{k}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: login form */}
        <div className="panel p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // SECURE TERMINAL
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Sign in to console</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use school-issued credentials.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm text-foreground outline-none ring-primary/40 transition focus:border-primary focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm text-foreground outline-none ring-primary/40 transition focus:border-primary focus:ring-2"
              />
            </label>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!hydrated || submitting || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Authenticate
            </button>
          </form>

          <div className="mt-8 border-t border-border/60 pt-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Demo accounts · password <span className="text-primary">demo1234</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword("demo1234");
                  }}
                  className="rounded-md border border-border bg-panel-elevated px-3 py-2 text-left text-xs font-medium transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="text-foreground">{d.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
