import { QRCodeSVG } from "qrcode.react";
import { CountdownRing } from "./CountdownRing";

interface Props {
  code: string;
  otp: string;
  expiresAt: string;
  childName: string;
  status: "active" | "used" | "expired" | "rejected";
}

const STATUS: Record<Props["status"], { label: string; cls: string }> = {
  active: { label: "LIVE · AWAITING SCAN", cls: "pill-success pulse-dot" },
  used: { label: "PICKUP COMPLETE", cls: "pill-info" },
  expired: { label: "EXPIRED", cls: "pill-muted" },
  rejected: { label: "REJECTED", cls: "pill-destructive" },
};

export function PickupTokenCard({ code, otp, expiresAt, childName, status }: Props) {
  const isLive = status === "active" && new Date(expiresAt).getTime() > Date.now();
  const s = STATUS[status];
  return (
    <div className={`panel-elevated relative overflow-hidden p-5 ${isLive ? "glow-success" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Pickup token · {childName}
          </div>
          <div className={`pill-status ${s.cls} mt-2`}>{s.label}</div>
        </div>
        <CountdownRing expiresAt={expiresAt} />
      </div>

      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
        <div className={`relative rounded-md bg-white p-3 ${isLive ? "scanline" : "opacity-60"}`}>
          <QRCodeSVG value={code} size={148} level="H" />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              OTP fallback
            </div>
            <div className="mt-1 font-mono text-3xl font-bold tracking-[0.4em] text-primary">
              {otp}
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Token id · {code.slice(0, 12)}…
          </div>
        </div>
      </div>
    </div>
  );
}
