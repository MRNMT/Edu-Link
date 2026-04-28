import { useEffect, useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi, type DelegateQueueItem } from "@/lib/localApi";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminLinkRequestsPage() {
  const [delegates, setDelegates] = useState<DelegateQueueItem[]>([]);

  const load = async () => {
    try {
      const rows = await localApi.ops.admin.delegates("pending");
      setDelegates(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load link requests");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const decide = async (id: string, decision: "approve" | "reject") => {
    try {
      await localApi.ops.admin.decideDelegate(id, decision);
      toast.success(decision === "approve" ? "Delegate approved" : "Delegate rejected");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Decision failed");
    }
  };

  return (
    <AdminLayout title="Link Requests">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Pending Link Requests</h2>
        <div className="space-y-2">
          {delegates.length === 0 && (
            <div className="text-sm text-muted-foreground">No pending delegates.</div>
          )}
          {delegates.map((delegate) => (
            <div key={delegate.id} className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
              <div>
                <div className="font-semibold">{delegate.delegate_name}</div>
                <div className="text-xs text-muted-foreground">{delegate.relationship} · {delegate.phone} · Parent {delegate.parent_name}</div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void decide(delegate.id, "approve")} className="rounded-md bg-success px-3 py-1.5 text-xs font-semibold uppercase text-success-foreground">
                  <CheckCircle className="mr-1 inline h-3.5 w-3.5" />Approve
                </button>
                <button type="button" onClick={() => void decide(delegate.id, "reject")} className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold uppercase text-destructive-foreground">
                  <XCircle className="mr-1 inline h-3.5 w-3.5" />Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
