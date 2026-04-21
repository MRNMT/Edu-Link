import { Construction } from "lucide-react";

export function ComingSoon({
  phase, title, features,
}: { phase: string; title: string; features: string[] }) {
  return (
    <div className="panel p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-warning/10 ring-1 ring-warning/30 text-warning">
          <Construction className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-warning">
            {phase} · scheduled
          </div>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This console is wired into the platform but feature build-out is queued.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f}
            className="panel-elevated flex items-start gap-2 p-3 text-sm"
          >
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
