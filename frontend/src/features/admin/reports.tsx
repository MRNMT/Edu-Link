import { useEffect, useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi, type AuditEntry } from "@/lib/localApi";
import { todayIso, downloadCsv } from "@/features/admin/utils";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState({ actorId: "", action: "", from: todayIso, to: todayIso, page: 1 });

  const load = async () => {
    try {
      const audit = await localApi.ops.admin.audit(filter);
      setAuditRows(audit.rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reports");
    }
  };

  useEffect(() => {
    void load();
  }, [filter.actorId, filter.action, filter.from, filter.to, filter.page]);

  const exportAuditCsv = () => {
    const rows = [["created_at", "actor_id", "action", "target"]];
    for (const row of auditRows) {
      rows.push([String(row.created_at), String(row.actor_id ?? ""), row.action, String(row.target ?? "")]);
    }
    downloadCsv("audit-log.csv", rows);
  };

  return (
    <AdminLayout title="Reports">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Audit Log Viewer</h2>
          <button type="button" onClick={exportAuditCsv} className="rounded-md border border-border bg-panel-elevated px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
            <Download className="mr-1 inline h-3.5 w-3.5" />CSV
          </button>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input className="rounded-md border border-border bg-input px-3 py-2 text-sm" placeholder="Actor ID" value={filter.actorId} onChange={(e) => setFilter((f) => ({ ...f, actorId: e.target.value, page: 1 }))} />
          <input className="rounded-md border border-border bg-input px-3 py-2 text-sm" placeholder="Action" value={filter.action} onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value, page: 1 }))} />
          <input type="date" className="rounded-md border border-border bg-input px-3 py-2 text-sm" value={filter.from} onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value, page: 1 }))} />
          <input type="date" className="rounded-md border border-border bg-input px-3 py-2 text-sm" value={filter.to} onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value, page: 1 }))} />
        </div>
        <div className="max-h-72 space-y-1 overflow-auto font-mono text-xs">
          {auditRows.map((row) => (
            <div key={row.id} className="grid grid-cols-[160px_140px_1fr] gap-3 border-b border-border/40 py-1.5 last:border-0">
              <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
              <span>{row.actor_id}</span>
              <span>{row.action}</span>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
