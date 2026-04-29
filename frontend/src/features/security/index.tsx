import { useEffect, useCallback, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { QRScanner } from "@/components/QRScanner";
import { useAppDispatch, useAppSelector } from "@/store";
import { verifyToken } from "@/store/slices/pickupSlice";
import { Zap, X, Check } from "lucide-react";
import { toast } from "sonner";
import { localApi } from "@/lib/localApi";

export default function SecurityDashboard() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);

  const [failCount, setFailCount] = useState(0);
  const [verdict, setVerdict] = useState<{
    ok: boolean;
    child?: string;
    msg: string;
  } | null>(null);
  const [otp, setOtp] = useState("");
  const [rejectedLogs, setRejectedLogs] = useState<
    Array<{ id: string; created_at: string; action: string; target: string | null }>
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const logs = await localApi.audit.list(100);
        setRejectedLogs(
          logs
            .filter(
              (row) => row.action.includes("rejected") || row.action.includes("gate.rejected"),
            )
            .slice(0, 20),
        );
      } catch {
        // keep silent
      }
    })();
  }, []);

  const handleScan = useCallback(
    async (code: string) => {
      if (!user || !profile?.school_id) return;
      const res = await dispatch(
        verifyToken({
          code,
          userId: user.id,
          schoolId: profile.school_id,
          verdict: "approve",
        }) as any,
      );

      if (res.meta.requestStatus === "fulfilled") {
        const t = res.payload as { status: string; child?: { full_name: string } };
        if (t.status === "used") {
          setVerdict({
            ok: true,
            child: t.child?.full_name,
            msg: "APPROVED",
          });
          setFailCount(0);
          toast.success(`✓ ${t.child?.full_name} approved`);
          await localApi.audit.create({
            action: "gate.approved",
            target: t.child?.full_name ?? "unknown",
          });
        } else {
          setFailCount((f) => f + 1);
          setVerdict({ ok: false, msg: `DENIED (${t.status.toUpperCase()})` });
          toast.error(`✗ Token ${t.status}`);
          await localApi.audit.create({
            action: "gate.rejected",
            target: t.child?.full_name ?? "unknown",
            metadata: { reason: t.status },
          });
        }
      } else {
        setFailCount((f) => f + 1);
        setVerdict({ ok: false, msg: "DENIED (INVALID)" });
        toast.error("✗ Invalid QR");
        await localApi.audit.create({ action: "gate.rejected", target: "invalid_qr" });
      }
    },
    [dispatch, user, profile?.school_id],
  );

  const verifyOtp = async (v: "approve" | "reject") => {
    if (!user || !profile?.school_id || !otp) return;
    const res = await dispatch(
      verifyToken({ otp, userId: user.id, schoolId: profile.school_id, verdict: v }) as any,
    );

    if (res.meta.requestStatus === "fulfilled") {
      const t = res.payload as { status: string; child?: { full_name: string } };
      if (t.status === "used") {
        setVerdict({ ok: true, child: t.child?.full_name, msg: "APPROVED" });
        setFailCount(0);
        toast.success("✓ Approved");
        await localApi.audit.create({
          action: "gate.approved",
          target: t.child?.full_name ?? "unknown",
        });
      } else {
        setFailCount((f) => f + 1);
        setVerdict({ ok: false, msg: `DENIED (${t.status})` });
        toast.error("✗ Denied");
        await localApi.audit.create({
          action: "gate.rejected",
          target: t.child?.full_name ?? "unknown",
        });
      }
      setOtp("");
    } else {
      setFailCount((f) => f + 1);
      setVerdict({ ok: false, msg: "DENIED (INVALID OTP)" });
      toast.error("✗ Invalid OTP");
      await localApi.audit.create({ action: "gate.rejected", target: "invalid_otp" });
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Gate Security" subtitle="Security" />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <QRScanner onScan={handleScan} />

        {verdict && (
          <div
            className={`mt-6 rounded-lg border-2 p-8 text-center ${
              verdict.ok
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10"
            }`}
          >
            <div className="mb-2 flex justify-center">
              {verdict.ok ? (
                <Check className="h-12 w-12 text-success" />
              ) : (
                <X className="h-12 w-12 text-destructive" />
              )}
            </div>
            <div
              className={`text-3xl font-bold ${verdict.ok ? "text-success" : "text-destructive"}`}
            >
              {verdict.msg}
            </div>
            {verdict.child && (
              <div className="mt-2 font-semibold text-foreground">{verdict.child}</div>
            )}
          </div>
        )}

        <div className="mt-6 space-y-4">
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
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => verifyOtp("reject")}
                className="rounded-md bg-destructive px-4 text-destructive-foreground transition hover:bg-destructive/90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {failCount > 2 && (
            <button className="w-full rounded-md border-2 border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-amber-600 transition hover:bg-amber-500/20">
              <Zap className="mr-2 inline h-4 w-4" />
              Escalate to admin ({failCount} fails)
            </button>
          )}

          <div className="panel p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Unauthorized attempt log
            </div>
            <div className="max-h-48 space-y-1 overflow-auto pr-1 text-xs">
              {rejectedLogs.length === 0 && (
                <div className="text-muted-foreground">No rejected scans logged.</div>
              )}
              {rejectedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b border-border/40 py-1 last:border-0"
                >
                  <span className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span className="text-destructive">{log.action}</span>
                  <span>{log.target ?? "n/a"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
