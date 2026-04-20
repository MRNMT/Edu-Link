import { useEffect, useState } from "react";

interface Props {
  expiresAt: string; // ISO
  size?: number;
}

export function CountdownRing({ expiresAt, size = 56 }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const total = 30 * 60 * 1000;
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const ratio = Math.min(1, remaining / total);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = remaining <= 0;

  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * ratio;

  const color = expired
    ? "var(--color-destructive)"
    : ratio < 0.2
      ? "var(--color-warning)"
      : "var(--color-success)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-border)" strokeWidth="3" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold tabular-nums" style={{ color }}>
        {expired ? "00:00" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
      </div>
    </div>
  );
}
