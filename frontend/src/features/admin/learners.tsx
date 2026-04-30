import { useEffect, useState } from "react";
import { useAppSelector } from "@/store";
import { AdminLayout } from "@/features/admin/layout";
import { localApi, type Child } from "@/lib/localApi";
import { toast } from "sonner";
import { Trash2, Search } from "lucide-react";

export default function AdminLearnersPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [wizard, setWizard] = useState({
    child_id: "",
    child_full_name: "",
    class_name: "",
    grade: "",
    parent_identifier: "",
    parent_invite_email: "",
    parent_invite_phone: "",
  });
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadChildren = async () => {
    try {
      setLoading(true);
      if (profile?.school_id) {
        const rows = await localApi.children.schoolChildren(profile.school_id);
        setChildren(rows);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load children");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChildren();
  }, [profile?.school_id]);

  const onboardLearner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!wizard.child_id.trim()) {
      toast.error("Child ID is required");
      return;
    }
    if (!wizard.parent_identifier.trim()) {
      toast.error("Parent ID is required");
      return;
    }
    try {
      await localApi.ops.admin.onboardLearner({
        child_id: wizard.child_id.trim(),
        child_full_name: wizard.child_full_name,
        class_name: wizard.class_name,
        grade: wizard.grade,
        parent_identifier: wizard.parent_identifier.trim(),
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
        child_id: "",
        child_full_name: "",
        class_name: "",
        grade: "",
        parent_identifier: "",
        parent_invite_email: "",
        parent_invite_phone: "",
      });
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Onboarding failed");
    }
  };

  const filteredChildren = children.filter(
    (child) =>
      child.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Learners">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-5">
          <div className="mb-3 text-sm font-bold text-navy">Learner Onboarding Wizard</div>
          <form onSubmit={onboardLearner} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-md border border-border bg-input px-3 py-2"
                placeholder="Child ID"
                value={wizard.child_id}
                onChange={(e) => setWizard((v) => ({ ...v, child_id: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-border bg-input px-3 py-2"
                placeholder="Child full name"
                value={wizard.child_full_name}
                onChange={(e) => setWizard((v) => ({ ...v, child_full_name: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-border bg-input px-3 py-2"
                placeholder="Class"
                value={wizard.class_name}
                onChange={(e) => setWizard((v) => ({ ...v, class_name: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-md border border-border bg-input px-3 py-2"
                placeholder="Grade"
                value={wizard.grade}
                onChange={(e) => setWizard((v) => ({ ...v, grade: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-border bg-input px-3 py-2"
                placeholder="Parent ID"
                value={wizard.parent_identifier}
                onChange={(e) => setWizard((v) => ({ ...v, parent_identifier: e.target.value }))}
                required
              />
              <input
                className="rounded-md border border-border bg-input px-3 py-2"
                placeholder="Invite parent email (optional)"
                value={wizard.parent_invite_email}
                onChange={(e) => setWizard((v) => ({ ...v, parent_invite_email: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-md border border-border bg-input px-3 py-2"
                placeholder="Invite parent phone (optional)"
                value={wizard.parent_invite_phone}
                onChange={(e) => setWizard((v) => ({ ...v, parent_invite_phone: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground md:w-auto"
            >
              Create learner + link
            </button>
          </form>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy">Added Learners</h2>
            <p className="text-sm text-muted-foreground">All learners added to the school.</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm"
              placeholder="Search learners..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading learners...</div>
        ) : children.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-slate-50 p-8 text-center text-muted-foreground">
            No learners added yet. Use the wizard above to add learners.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Linked Parents</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChildren.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      No learners match your search.
                    </td>
                  </tr>
                ) : (
                  filteredChildren.map((child) => (
                    <tr key={child.id} className="border-t border-border/70 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-navy">{child.full_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{child.class_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{child.grade}</td>
                      <td className="px-4 py-3">
                        {child.linked_parents && child.linked_parents.length > 0 ? (
                          <div className="space-y-1">
                            {child.linked_parents.map((parent) => (
                              <div key={parent.id} className="text-sm">
                                <div className="font-semibold text-navy">{parent.full_name}</div>
                                <div className="text-xs text-muted-foreground">{parent.email}</div>
                                <div className="text-xs text-muted-foreground capitalize">{parent.relationship}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No parents linked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                          title="Delete learner"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
