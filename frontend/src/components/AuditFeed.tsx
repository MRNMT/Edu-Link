import { AuditEntry } from "@/store/slices/auditSlice";

interface AuditFeedProps {
  entries: AuditEntry[];
  loading?: boolean;
  onLoadMore?: () => void;
}

/**
 * AuditFeed — Monospace log stream showing audit entries
 */
export function AuditFeed({ entries, loading = false, onLoadMore }: AuditFeedProps) {
  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("en-US", { hour12: false });
    } catch {
      return "??:??:??";
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("enter")) return "text-green-500";
    if (action.includes("exit")) return "text-yellow-500";
    if (action.includes("reject")) return "text-destructive";
    if (action.includes("approve") || action.includes("used")) return "text-green-500";
    return "text-muted-foreground";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold text-muted-foreground">AUDIT LOG</h3>
          <span className="font-mono text-xs text-muted-foreground">{entries.length} ENTRIES</span>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-mono text-xs text-muted-foreground">&gt; waiting for events...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="font-mono text-xs leading-relaxed text-muted-foreground hover:bg-muted/50"
              >
                <div className="flex gap-2 px-2 py-1">
                  <span className="text-muted-foreground/60">&gt;</span>
                  <span className="text-muted-foreground/80 min-w-fit">
                    {formatTimestamp(entry.created_at)}
                  </span>
                  <span className={`min-w-fit font-semibold ${getActionColor(entry.action)}`}>
                    {entry.action}
                  </span>
                  <span className="text-muted-foreground/60">
                    {entry.actor_name || `actor#${entry.actor_id}`}
                  </span>
                  {entry.target && (
                    <span className="text-muted-foreground/40">
                      ⟹ {entry.target}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
