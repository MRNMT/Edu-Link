import { AlertCircle } from "lucide-react";

interface SystemLog {
  id: string;
  action: string;
  target: string | null;
  actor_id: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export function AuditLogs({ systemLogs }: { systemLogs: SystemLog[] }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <h2 className="text-lg font-semibold">System Logs & Audit Trails</h2>
        <span className="ml-auto pill-status pill-info">{systemLogs.length} events</span>
      </div>

      <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
        {systemLogs.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center">No system logs.</div>
        ) : (
          systemLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 py-1.5 px-2 border-b border-border/40 last:border-0 hover:bg-muted/30"
            >
              <span className="text-muted-foreground shrink-0 min-w-[100px]">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
              <span className="text-foreground font-semibold shrink-0 min-w-[120px]">
                {log.action}
              </span>
              <span className="text-info flex-1 truncate">{log.target}</span>
            </div>
          ))
        )}
      </div>

      <button className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary transition hover:text-primary/80">
        Export full audit report →
      </button>
    </section>
  );
}
