interface StatusPillProps {
  verdict: "approve" | "reject" | "pending" | "expired";
  childName?: string;
  timestamp?: string;
}

/**
 * StatusPill — Visual verdict indicator with icon and color
 * Shows ✓ (approved), ✗ (rejected), ⏳ (pending), or ⛔ (expired)
 */
export function StatusPill({ verdict, childName, timestamp }: StatusPillProps) {
  const config = {
    approve: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-400",
      icon: "✓",
      label: "Pickup Approved",
    },
    reject: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      icon: "✗",
      label: "Pickup Rejected",
    },
    pending: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      icon: "⏳",
      label: "Pending Verification",
    },
    expired: {
      bg: "bg-slate-50 dark:bg-slate-950/30",
      border: "border-slate-200 dark:border-slate-800",
      text: "text-slate-700 dark:text-slate-400",
      icon: "⛔",
      label: "Code Expired",
    },
  };

  const cfg = config[verdict];

  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`text-2xl font-bold ${cfg.text}`}>{cfg.icon}</div>
        <div className="flex-1">
          <h4 className={`font-semibold ${cfg.text}`}>{cfg.label}</h4>
          {childName && <p className="mt-1 text-sm text-muted-foreground">{childName}</p>}
          {timestamp && (
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
