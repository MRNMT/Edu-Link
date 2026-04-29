import { useState } from "react";
import { UserPlus, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/layout";
import { localApi } from "@/lib/localApi";

export default function AdminAddParentPage() {
  const [form, setForm] = useState({ full_name: "", email: "", parent_id: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Full name and email are required");
      return;
    }

    try {
      setSubmitting(true);
      const result = await localApi.ops.admin.createParent({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        parent_id: form.parent_id.trim() || undefined,
      });

      toast.success("Parent account created", {
        description: result.credentials_emailed
          ? "Temporary credentials were emailed to the parent."
          : "Parent account was created.",
      });

      setForm({ full_name: "", email: "", parent_id: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add parent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Add Parent">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-navy">Register Parent Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a parent profile and automatically email temporary login credentials.
            </p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
        </div>

        <form onSubmit={submit} className="max-w-xl space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Parent ID
            </label>
            <input
              value={form.parent_id}
              onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))}
              className="w-full rounded-md border border-border bg-input px-3 py-2"
              placeholder="PARENT-001"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full Name
            </label>
            <input
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              className="w-full rounded-md border border-border bg-input px-3 py-2"
              placeholder="Parent full name"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-md border border-border bg-input px-3 py-2"
              placeholder="parent@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            <MailCheck className="h-4 w-4" />
            {submitting ? "Creating..." : "Create Parent & Send Credentials"}
          </button>
        </form>
      </section>
    </AdminLayout>
  );
}
