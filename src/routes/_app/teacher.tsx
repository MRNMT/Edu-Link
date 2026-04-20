import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppDispatch, useAppSelector } from "@/store";
import { supabase } from "@/integrations/supabase/client";
import { verifyToken, fetchSchoolTokens } from "@/store/slices/pickupSlice";
import { QRScanner } from "@/components/QRScanner";
import { Check, X, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/teacher")({
  component: TeacherDashboard,
});

interface Child { id: string; full_name: string; class_name: string }

function TeacherDashboard() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);
  const tokens = useAppSelector((s) => s.pickup.tokens);

  const [children, setChildren] = useState<Child[]>([]);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [otp, setOtp] = useState("");
  const [lastVerdict, setLastVerdict] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void dispatch(fetchSchoolTokens(sid));
    (async () => {
      const { data } = await supabase
        .from("children")
        .select("id, full_name, class_name")
        .eq("school_id", sid)
        .order("full_name");
      setChildren((data ?? []) as Child[]);
    })();
  }, [profile?.school_id, dispatch]);

  const submitAttendance = async () => {
    if (!user || !profile?.school_id) return;
    const summary = {
      present: Object.values(present).filter(Boolean).length,
      total: children.length,
    };
    await supabase.from("audit_logs").insert({
      school_id: profile.school_id,
      actor_id: user.id,
      action: "attendance.submitted",
      target: profile.school_id,
      metadata: { ...summary, by_child: present },
    });
    setSubmitted(true);
    toast.success("Attendance submitted", {
      description: `${summary.present} of ${summary.total} present`,
    });
  };

  const handleScan = useCallback(
    async (code: string) => {
      if (!user || !profile?.school_id) return;
      const res = await dispatch(
        verifyToken({ code, userId: user.id, schoolId: profile.school_id, verdict: "approve" }),
      );
      if (res.meta.requestStatus === "fulfilled") {
        const t = res.payload as { status: string; child?: { full_name: string } };
        if (t.status === "used") {
          setLastVerdict({ ok: true, msg: `✓ Pickup approved for ${t.child?.full_name ?? "child"}` });
          toast.success(`Approved · ${t.child?.full_name}`);
        } else {
          setLastVerdict({ ok: false, msg: `✗ Token ${t.status.toUpperCase()}` });
          toast.error(`Token ${t.status}`);
        }
      } else {
        setLastVerdict({ ok: false, msg: "✗ Token not found" });
        toast.error("Token not found");
      }
    },
    [dispatch, user, profile?.school_id],
  );

  const verifyOtp = async (verdict: "approve" | "reject") => {
    if (!user || !profile?.school_id || !otp) return;
    const res = await dispatch(
      verifyToken({ otp, userId: user.id, schoolId: profile.school_id, verdict }),
    );
    if (res.meta.requestStatus === "fulfilled") {
      const t = res.payload as { status: string; child?: { full_name: string } };
      setLastVerdict({
        ok: t.status === "used",
        msg: t.status === "used" ? `✓ Approved ${t.child?.full_name}` : `✗ ${t.status.toUpperCase()}`,
      });
      toast[t.status === "used" ? "success" : "error"](`OTP ${t.status}`);
      setOtp("");
    } else {
      setLastVerdict({ ok: false, msg: "✗ Invalid OTP" });
      toast.error("Invalid OTP");
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Teacher Console" subtitle="Teacher" />
      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-2">
        {/* Attendance */}
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Attendance · Today</h2>
              <p className="text-xs text-muted-foreground">One-tap roll call.</p>
            </div>
            <span className={`pill-status ${submitted ? "pill-success" : "pill-warning"}`}>
              {submitted ? "Submitted" : "Pending"}
            </span>
          </div>

          <div className="mt-4 max-h-[340px] space-y-2 overflow-auto pr-1">
            {children.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-sm transition ${
                  present[c.id]
                    ? "border-success/40 bg-success/5"
                    : "border-border bg-panel-elevated"
                }`}
              >
                <div>
                  <div className="font-medium">{c.full_name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Class {c.class_name}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!present[c.id]}
                  onChange={(e) => setPresent((p) => ({ ...p, [c.id]: e.target.checked }))}
                  className="h-5 w-5 accent-primary"
                />
              </label>
            ))}
          </div>

          <button
            onClick={submitAttendance}
            disabled={submitted}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            <ClipboardCheck className="h-4 w-4" />
            Submit attendance
          </button>
        </section>

        {/* Pickup verifier */}
        <section className="space-y-4">
          <QRScanner onScan={handleScan} />

          <div className="panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              OTP fallback
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={() => verifyOtp("approve")}
                className="rounded-md bg-success px-4 text-success-foreground transition hover:bg-success/90"
                aria-label="Approve"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => verifyOtp("reject")}
                className="rounded-md bg-destructive px-4 text-destructive-foreground transition hover:bg-destructive/90"
                aria-label="Reject"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {lastVerdict && (
              <div
                className={`mt-3 rounded-md border px-3 py-2 font-mono text-xs ${
                  lastVerdict.ok
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {lastVerdict.msg}
              </div>
            )}
          </div>

          <div className="panel p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Recent gate activity
            </div>
            <div className="space-y-1 text-xs">
              {tokens.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
                  <span className="font-mono text-muted-foreground">
                    {new Date(t.created_at).toLocaleTimeString()}
                  </span>
                  <span>{t.child?.full_name ?? "—"}</span>
                  <span
                    className={`pill-status ${
                      t.status === "used" ? "pill-success" : t.status === "rejected" ? "pill-destructive" : t.status === "expired" ? "pill-muted" : "pill-info"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
              {tokens.length === 0 && <div className="text-muted-foreground">No activity yet.</div>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
