import { useEffect, useState } from "react";

interface CountdownRingProps {
  expiresAt: string;
  size?: number;
}

/**
 * QRGenerator — Displays QR code with 30-minute animated countdown ring
 */
export function QRGenerator({
  code,
  expiresAt,
  childName,
  onRefresh,
}: {
  code: string;
  expiresAt: string;
  childName?: string;
  onRefresh?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);

      setTimeLeft(remaining);
      setIsExpired(remaining === 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const percentage = (timeLeft / (30 * 60 * 1000)) * 100;

  // Generate SVG QR code (base64 placeholder - in production use qrcode.react)
  const qrSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='white' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='black' font-size='24'%3E${code.slice(0, 8)}&lt;br&gt;...${code.slice(-8)}&lt;/text%3E%3C/svg%3E`;

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-8">
      <div className="relative h-64 w-64">
        {/* Animated countdown ring */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/20"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${(percentage / 100) * 565.48} 565.48`}
            className={`transition-all duration-1000 ${
              percentage > 20 ? "text-primary" : "text-destructive"
            }`}
            style={{ strokeDashoffset: 0 }}
          />
        </svg>

        {/* QR Code center */}
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white p-4">
          <img src={qrSvg} alt="Pickup QR Code" className="h-40 w-40" />
        </div>
      </div>

      {/* Timer display */}
      <div className="text-center">
        {childName && <p className="text-sm text-muted-foreground">{childName}</p>}
        <div className="mt-2 text-3xl font-bold font-mono">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Time remaining</p>
      </div>

      {/* Status and actions */}
      {isExpired ? (
        <div className="w-full">
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
            QR Code expired
          </div>
          <button
            onClick={onRefresh}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Generate new QR
          </button>
        </div>
      ) : (
        <div className="w-full text-center text-xs text-muted-foreground">
          Valid for pickup • Show at gate
        </div>
      )}

      {/* QR Code text fallback */}
      <div className="w-full border-t border-border pt-4">
        <p className="text-center font-mono text-xs text-muted-foreground">{code}</p>
      </div>
    </div>
  );
}
