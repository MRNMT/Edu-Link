import { useEffect, useState } from "react";
import { useAppDispatch } from "@/store";
import { useNavigate } from "@tanstack/react-router";
import { enterChildModeThunk } from "@/store/slices/childModeSlice";
import { ParentLayout } from "@/features/parent/layout";
import { localApi, type Child } from "@/lib/localApi";
import { toast } from "sonner";

export default function ParentMyChildrenPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [linkForm, setLinkForm] = useState({ child_id: "", relationship: "parent" });

  const loadChildren = async () => {
    try {
      const rows = await localApi.children.myParentChildren();
      setChildren(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load children");
    }
  };

  useEffect(() => {
    void loadChildren();
  }, []);

  const switchToChild = async (childId: string) => {
    const result = await dispatch(enterChildModeThunk({ childId }) as any);
    if (result.meta.requestStatus === "fulfilled") {
      navigate({ to: "/child-mode" });
    }
  };

  const linkChild = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.parent.linkChild(linkForm);
      toast.success("Child linked successfully");
      setLinkForm({ child_id: "", relationship: "parent" });
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to link child");
    }
  };

  return (
    <ParentLayout title="My Children">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-bold text-navy">Linked Children</div>
          {children.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
              No linked children found.
            </div>
          ) : (
            <div className="space-y-2">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-slate-50 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-navy">
                    {child.full_name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-navy">{child.full_name}</div>
                    <div className="text-xs text-navy/60">
                      {child.grade} · {child.class_name}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600"
                    onClick={() => void switchToChild(child.id)}
                  >
                    Switch to Child Mode
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-bold text-navy">Link a Child</div>
          <p className="mb-4 text-xs text-navy/60">
            Enter a child ID provided by your school to link the child to your parent account.
          </p>
          <form onSubmit={linkChild} className="space-y-3">
            <input
              value={linkForm.child_id}
              onChange={(e) => setLinkForm((v) => ({ ...v, child_id: e.target.value }))}
              className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal"
              placeholder="Child ID"
              required
            />
            <select
              value={linkForm.relationship}
              onChange={(e) => setLinkForm((v) => ({ ...v, relationship: e.target.value || "parent" }))}
              className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal"
            >
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="caregiver">Caregiver</option>
            </select>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground"
            >
              Link Child
            </button>
          </form>
        </section>
      </div>
    </ParentLayout>
  );
}
