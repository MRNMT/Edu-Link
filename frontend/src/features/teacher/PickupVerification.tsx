import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { verifyToken } from "@/store/slices/pickupSlice";
import { Check, X } from "lucide-react";
import { QRScanner } from "@/components/QRScanner";
import { toast } from "sonner";

interface PickupVerificationProps {
  userId: string;
  schoolId: string;
}

export function PickupVerification({ userId, schoolId }: PickupVerificationProps) {
  const dispatch = useAppDispatch();
  const tokens = useAppSelector((s) => s.pickup.tokens);
  const [otp, setOtp] = useState("");
  const [lastVerdict, setLastVerdict] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleScan = useCallback(
    async (code: string) => {
      const res = await dispatch(
        verifyToken({
          code,
          userId,
          schoolId,
          verdict: "approve",
        }) as any,
      );

      if (res.meta.requestStatus === "fulfilled") {
        const t = res.payload as { status: string; child?: { full_name: string } };
        if (t.status === "used") {
          setLastVerdict({
            ok: true,
            msg: `✓ Pickup approved for ${t.child?.full_name ?? "child"}`,
          });
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
    [dispatch, userId, schoolId],
  );

  const verifyOtp = async (verdict: "approve" | "reject") => {
    if (!otp) return;

    const res = await dispatch(
      verifyToken({ otp, userId, schoolId, verdict }) as any,
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
    <section className="space-y-4 lg:col-span-1">
      <QRScanner onScan={handleScan} />

      <div className="panel p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">OTP fallback</div>
        <div className="mt-2 flex gap-2">
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
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
          {tokens.slice(0, 6).map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0"
            >
              <span className="font-mono text-muted-foreground">
                {new Date(token.created_at).toLocaleTimeString()}
              </span>
              <span className={token.status === "used" ? "text-success" : "text-muted-foreground"}>
                {token.child?.full_name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
