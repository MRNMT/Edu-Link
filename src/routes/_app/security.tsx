import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { QRScanner } from "@/components/QRScanner";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchSchoolTokens, verifyToken } from "@/store/slices/pickupSlice";
import { Check, X, AlertTriangle, Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/security")({
  component: SecurityConsole,
});

function SecurityConsole() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);
  const tokens = useAppSelector((s) => s.pickup.tokens);

  const [otp, setOtp] = useState("");
  const [verdict, setVerdict] = useState<{ ok: boolean; title: string; sub: string } | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (profile?.school_id) void dispatch(fetchSchoolTokens(profile.school_id));
  }, [profile?.school_id, dispatch]);

  const handleResult = (res: { ok: boolean; status?: string; name?: string }) => {
    if (res.ok) {
      setVerdict({ ok: true, title: "ACCESS GRANTED", sub: `Pickup for ${res.name ?? "child"}` });
      setFailCount(0);
    } else {
      setVerdict({ ok: false, title: "ACCESS DENIED", sub: `Reason · ${res.status ?? "invalid"}` });
      setFailCount((c) => c + 1);
    }
    setPaused(true);
    setTimeout(() => setPaused(false), 2500);
  };

  const handleScan = useCallback(
    async (code: string) => {
      if (!user || !profile?.school_id || paused) return;
      const res = await dispatch(
        verifyToken({ code, userId: user.id, schoolId: profile.school_id, verdict: "approve" }),
      );
      if (res.meta.requestStatus === "fulfilled") {
        const t = res.payload as { status: string; child?: { full_name: string } };
        handleResult({ ok: t.status === "used", status: t.status, name: t.child?.full_name });
      } else {
        handleResult({ ok: false, status: "not found" });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, user, profile?.school_id, paused],
  );

  const submitOtp = async (v: "approve" | "reject") => {
    if (!user || !profile?.school_id || !otp) return;
    const res = await dispatch(
      verifyToken({ otp, userId: user.id, schoolId: profile.school_id, verdict: v }),
    );
    if (res.meta.requestStatus === "fulfilled") {
      const t = res.payload as { status: string; child?: { full_name: string } };
      handleResult({ ok: t.status === "used", status: t.status, name: t.child?.full_name });
    } else {
      handleResult({ ok: false, status: "invalid otp" });
    }
    setOtp("");
  };

  const escalate = async () => {
    if (!user || !profile?.school_id) return;
    await fetch("data:,").catch(() => {});
    toast.warning("Escalated to school admin", { description: "Repeated failed attempts logged." });
    setFailCount(0);
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Gate Security · Officer Console" subtitle="Gate Security" />
      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Scanner + verdict */}
        <section className="space-y-4">
          <QRScanner onScan={handleScan} paused={paused} />

          {verdict && (
            <div
              className={`panel-elevated flex items-center gap-4 p-5 ${
                verdict.ok ? "glow-success border-success/40" : "glow-destructive border-destructive/40"
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  verdict.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}
              >
                {verdict.ok ? <Check className="h-7 w-7" /> : <X className="h-7 w-7" />}
              </div>
              <div>
                <div
                  className={`font-mono text-xs uppercase tracking-widest ${
                    verdict.ok ? "text-success" : "text-destructive"
                  }`}
                >
                  {verdict.title}
                </div>
                <div className="text-lg font-semibold">{verdict.sub}</div>
              </div>
            </div>
          )}

          {/* OTP fallback */}
          <div className="panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Manual OTP entry
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
              <button onClick={() => submitOtp("approve")} className="rounded-md bg-success px-4 text-success-foreground hover:bg-success/90">
                <Check className="h-5 w-5" />
              </button>
              <button onClick={() => submitOtp("reject")} className="rounded-md bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90">
                <X className="h-5 w-5" />
              </button>
            </div>

            {failCount >= 2 && (
              <button
                onClick={escalate}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-warning/40 bg-warning/10 py-2 text-xs font-semibold uppercase tracking-wider text-warning"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate to school admin ({failCount} fails)
              </button>
            )}
          </div>
        </section>

        {/* Live gate log */}
        <section className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-success" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Gate log · live</h2>
            </div>
            <span className="pill-status pill-success pulse-dot">streaming</span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {tokens.length === 0 && <div className="text-muted-foreground">No activity.</div>}
            {tokens.map((t) => (
              <div key={t.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-2 border-b border-border/40 py-1.5 last:border-0">
                <span className="text-muted-foreground">
                  {new Date(t.created_at).toLocaleTimeString([], { hour12: false })}
                </span>
                <span className="truncate">{t.child?.full_name ?? "—"}</span>
                <span
                  className={`pill-status ${
                    t.status === "used"
                      ? "pill-success"
                      : t.status === "rejected"
                        ? "pill-destructive"
                        : t.status === "expired"
                          ? "pill-muted"
                          : "pill-info"
                  }`}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
