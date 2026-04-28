import { useEffect, useState } from "react";
import { useAppSelector } from "@/store";
import { AdminLayout } from "@/features/admin/layout";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

export default function AdminSchoolOverviewPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [counts, setCounts] = useState({ learners: 0, teachers: 0 });

  useEffect(() => {
    if (!profile?.school_id) return;
    void (async () => {
      try {
        const [children, teachers] = await Promise.all([
          localApi.children.schoolChildren(profile.school_id),
          localApi.ops.admin.listTeachers(),
        ]);
        setCounts({ learners: children.length, teachers: teachers.length });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load school overview");
      }
    })();
  }, [profile?.school_id]);

  return (
    <AdminLayout title="School Overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-navy/60">School</div>
          <div className="mt-2 text-xl font-bold text-navy">{profile?.school_id ? `ID ${profile.school_id}` : "Unknown"}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-navy/60">Learners</div>
          <div className="mt-2 text-3xl font-extrabold text-navy">{counts.learners}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-navy/60">Teachers</div>
          <div className="mt-2 text-3xl font-extrabold text-navy">{counts.teachers}</div>
        </div>
      </div>
    </AdminLayout>
  );
}
