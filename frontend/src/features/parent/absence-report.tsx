import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { localApi, type Child } from "@/lib/localApi";
import { ParentLayout } from "@/features/parent/layout";
import { toast } from "sonner";

export default function ParentAbsenceReportPage() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [form, setForm] = useState({
    child_id: "",
    reason: "",
    attendance_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    void (async () => {
      try {
        const rows = await localApi.children.myParentChildren();
        setChildren(rows);
        if (rows[0]) {
          setForm((current) => ({ ...current, child_id: rows[0].id }));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load children");
      }
    })();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.parent.reportAbsence(form);
      toast.success("Absence reported");
      navigate({ to: "/parent/absences" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to report absence");
    }
  };

  return (
    <ParentLayout title="Report Absence">
      <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 text-sm font-bold text-navy">Absence Reporting</div>
        <form className="max-w-xl space-y-3" onSubmit={submit}>
          <select
            className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal"
            value={form.child_id}
            onChange={(e) => setForm((current) => ({ ...current, child_id: e.target.value }))}
            required
          >
            <option value="">Select child</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.full_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal"
            value={form.attendance_date}
            onChange={(e) => setForm((current) => ({ ...current, attendance_date: e.target.value }))}
            required
          />

          <textarea
            className="w-full rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal"
            rows={3}
            placeholder="Reason for absence"
            value={form.reason}
            onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-warning px-4 py-2 text-xs font-semibold uppercase tracking-wider text-warning-foreground"
          >
            Submit Absence
          </button>
        </form>
      </section>
    </ParentLayout>
  );
}
