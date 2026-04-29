import { useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi } from "@/lib/localApi";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export default function AdminParentsGuardiansPage() {
  const [freezeForm, setFreezeForm] = useState({ user_id: "", reason: "" });

  const freezeAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.admin.freezeAccount(freezeForm.user_id, true, freezeForm.reason);
      toast.success("Account frozen");
      setFreezeForm({ user_id: "", reason: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Freeze failed");
    }
  };

  return (
    <AdminLayout title="Parents & Guardians">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Account Freeze</h2>
        <form onSubmit={freezeAccount} className="max-w-xl space-y-3">
          <input className="w-full rounded-md border border-border bg-input px-3 py-2" placeholder="Parent user ID" value={freezeForm.user_id} onChange={(e) => setFreezeForm((v) => ({ ...v, user_id: e.target.value }))} />
          <input className="w-full rounded-md border border-border bg-input px-3 py-2" placeholder="Reason" value={freezeForm.reason} onChange={(e) => setFreezeForm((v) => ({ ...v, reason: e.target.value }))} />
          <button type="submit" className="rounded-md bg-destructive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-destructive-foreground">
            <Lock className="mr-1 inline h-3.5 w-3.5" /> Freeze account
          </button>
        </form>
      </section>
    </AdminLayout>
  );
}
