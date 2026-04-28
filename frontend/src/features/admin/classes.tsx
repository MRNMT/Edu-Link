import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store";
import { AdminLayout } from "@/features/admin/layout";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

export default function AdminClassesPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [children, setChildren] = useState<Array<{ id: string; class_name: string; full_name: string }>>([]);

  useEffect(() => {
    if (!profile?.school_id) return;
    void (async () => {
      try {
        const rows = await localApi.children.schoolChildren(profile.school_id);
        setChildren(rows.map((row) => ({ id: row.id, class_name: row.class_name, full_name: row.full_name })));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load classes");
      }
    })();
  }, [profile?.school_id]);

  const byClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const child of children) {
      const key = child.class_name || "Unassigned";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [children]);

  return (
    <AdminLayout title="Classes">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-bold text-navy">Class Directory</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byClass.map(([className, count]) => (
            <div key={className} className="rounded-lg border border-border bg-slate-50 p-4">
              <div className="text-lg font-bold text-navy">{className}</div>
              <div className="text-xs text-navy/60">{count} learners</div>
            </div>
          ))}
          {byClass.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
              No class data available.
            </div>
          ) : null}
        </div>
      </section>
    </AdminLayout>
  );
}
