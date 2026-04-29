import { useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

export default function AdminLearnersPage() {
  const [wizard, setWizard] = useState({
    child_full_name: "",
    class_name: "",
    grade: "",
    parent_identifier: "",
    parent_invite_email: "",
    parent_invite_phone: "",
  });

  const onboardLearner = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.admin.onboardLearner({
        child_full_name: wizard.child_full_name,
        class_name: wizard.class_name,
        grade: wizard.grade,
        parent_identifier: wizard.parent_identifier || null,
        parent_invite:
          wizard.parent_invite_email || wizard.parent_invite_phone
            ? {
                email: wizard.parent_invite_email || undefined,
                phone: wizard.parent_invite_phone || undefined,
              }
            : null,
      });
      toast.success("Learner onboarded");
      setWizard({
        child_full_name: "",
        class_name: "",
        grade: "",
        parent_identifier: "",
        parent_invite_email: "",
        parent_invite_phone: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Onboarding failed");
    }
  };

  return (
    <AdminLayout title="Learners">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-bold text-navy">Learner Onboarding Wizard</div>
        <form onSubmit={onboardLearner} className="grid gap-3 md:grid-cols-3">
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Child full name" value={wizard.child_full_name} onChange={(e) => setWizard((v) => ({ ...v, child_full_name: e.target.value }))} />
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Class" value={wizard.class_name} onChange={(e) => setWizard((v) => ({ ...v, class_name: e.target.value }))} />
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Grade" value={wizard.grade} onChange={(e) => setWizard((v) => ({ ...v, grade: e.target.value }))} />
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Parent identifier (optional)" value={wizard.parent_identifier} onChange={(e) => setWizard((v) => ({ ...v, parent_identifier: e.target.value }))} />
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Invite parent email (optional)" value={wizard.parent_invite_email} onChange={(e) => setWizard((v) => ({ ...v, parent_invite_email: e.target.value }))} />
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Invite parent phone (optional)" value={wizard.parent_invite_phone} onChange={(e) => setWizard((v) => ({ ...v, parent_invite_phone: e.target.value }))} />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground">
            Create learner + link
          </button>
        </form>
      </section>
    </AdminLayout>
  );
}
