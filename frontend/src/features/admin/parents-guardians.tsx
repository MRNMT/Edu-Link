import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi, type AdminParentItem, type DelegateQueueItem } from "@/lib/localApi";
import { Lock, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminParentsGuardiansPage() {
  const [parents, setParents] = useState<AdminParentItem[]>([]);
  const [guardians, setGuardians] = useState<DelegateQueueItem[]>([]);
  const [query, setQuery] = useState("");
  const [busyParentId, setBusyParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [parentsRows, guardianRows] = await Promise.all([
        localApi.ops.admin.listParents(),
        localApi.ops.admin.delegates("all"),
      ]);
      setParents(parentsRows);
      setGuardians(guardianRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load parents and guardians");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredParents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return parents;

    return parents.filter((parent) => {
      return (
        parent.full_name.toLowerCase().includes(term) ||
        parent.email.toLowerCase().includes(term) ||
        (parent.parent_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [parents, query]);

  const setFrozen = async (parent: AdminParentItem, freeze: boolean) => {
    try {
      setBusyParentId(parent.id);
      const reason = freeze ? `Frozen by admin on parents and guardians tab` : undefined;
      await localApi.ops.admin.freezeAccount(parent.id, freeze, reason);
      setParents((current) =>
        current.map((entry) =>
          entry.id === parent.id
            ? {
                ...entry,
                frozen_at: freeze ? new Date().toISOString() : null,
                frozen_reason: freeze ? reason : null,
              }
            : entry,
        ),
      );
      toast.success(freeze ? "Parent account frozen" : "Parent account unfrozen");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account status");
    } finally {
      setBusyParentId(null);
    }
  };

  return (
    <AdminLayout title="Parents & Guardians">
      <section className="space-y-5 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Parents</h2>
            <p className="text-sm text-muted-foreground">Search parents and freeze or unfreeze accounts.</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3"
              placeholder="Search by name, email, or parent ID"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Parent</th>
                <th className="px-3 py-2">Parent ID</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Loading parents...</td>
                </tr>
              ) : filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No parents found.</td>
                </tr>
              ) : (
                filteredParents.map((parent) => {
                  const frozen = Boolean(parent.frozen_at);
                  const processing = busyParentId === parent.id;

                  return (
                    <tr key={parent.id} className="border-t border-border/70">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-navy">{parent.full_name}</div>
                        <div className="text-xs text-muted-foreground">{parent.email}</div>
                        <div className="text-xs text-muted-foreground">User ID: {parent.id}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{parent.parent_id || "—"}</td>
                      <td className="px-3 py-3">
                        {frozen ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                            <ShieldAlert className="h-3.5 w-3.5" /> Frozen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <ShieldCheck className="h-3.5 w-3.5" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => void setFrozen(parent, !frozen)}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${frozen ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"} disabled:opacity-60`}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          {processing ? "Updating..." : frozen ? "Unfreeze" : "Freeze"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Guardians</h2>
        <p className="mb-3 text-sm text-muted-foreground">Delegated guardians linked by parents.</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Guardian</th>
                <th className="px-3 py-2">Parent</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {guardians.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No guardians found.</td>
                </tr>
              ) : (
                guardians.map((guardian) => (
                  <tr key={guardian.id} className="border-t border-border/70">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-navy">{guardian.delegate_name}</div>
                      <div className="text-xs text-muted-foreground">{guardian.phone || "No phone"}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{guardian.parent_name}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-semibold capitalize text-muted-foreground">
                        {guardian.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
