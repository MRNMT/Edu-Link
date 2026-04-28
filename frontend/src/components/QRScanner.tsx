import { useEffect, useRef, useState } from "react";

interface Props {
  onScan: (code: string) => void;
  paused?: boolean;
}

export function QRScanner({ onScan, paused }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let scanner: {
      start: (...a: unknown[]) => Promise<void>;
      stop: () => Promise<void>;
      clear: () => void;
    } | null = null;

    (async () => {
      if (paused || !containerRef.current) return;
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const id = "qr-reader-region";
        scanner = new Html5Qrcode(id) as unknown as typeof scanner;
        scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };

        await (
          scanner as unknown as {
            start: (
              cam: unknown,
              cfg: unknown,
              ok: (t: string) => void,
              fail?: () => void,
            ) => Promise<void>;
          }
        ).start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            onScan(decoded);
          },
          () => {},
        );
        setActive(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera unavailable";
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scannerRef.current?.clear();
            } catch {
              /* noop */
            }
          });
        scannerRef.current = null;
      }
    };
  }, [onScan, paused]);

  return (
    <div className="panel-elevated overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Camera scanner
        </div>
        <div
          className={`pill-status ${active && !paused ? "pill-success pulse-dot" : "pill-muted"}`}
        >
          {active && !paused ? "Live feed" : paused ? "Paused" : "Initializing"}
        </div>
      </div>
      <div className="relative aspect-square w-full bg-black">
        <div id="qr-reader-region" ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-destructive">
              Camera offline
            </div>
            <p className="text-xs text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">Use the OTP fallback below.</p>
          </div>
        )}
      </div>
    </div>
  );
}
