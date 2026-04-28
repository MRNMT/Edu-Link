import { useEffect, useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi, type LocalUser } from "@/lib/localApi";
import { toast } from "sonner";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<LocalUser[]>([]);
  const [newTeacher, setNewTeacher] = useState({ full_name: "", email: "" });

  const loadTeachers = async () => {
    try {
      const rows = await localApi.ops.admin.listTeachers();
      setTeachers(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load teachers");
    }
  };

  useEffect(() => {
    void loadTeachers();
  }, []);

  const createTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.admin.createTeacher(newTeacher);
      toast.success("Teacher invited");
      setNewTeacher({ full_name: "", email: "" });
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Teacher create failed");
    }
  };

  return (
    <AdminLayout title="Teachers">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Teacher Management</h2>
        <form onSubmit={createTeacher} className="mb-4 grid gap-2 md:grid-cols-3">
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Teacher name" value={newTeacher.full_name} onChange={(e) => setNewTeacher((v) => ({ ...v, full_name: e.target.value }))} />
          <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Teacher email" value={newTeacher.email} onChange={(e) => setNewTeacher((v) => ({ ...v, email: e.target.value }))} />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
            Create teacher
          </button>
        </form>
        <div className="max-h-80 space-y-2 overflow-auto pr-1 text-sm">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-2">
              <div>
                <div className="font-semibold">{teacher.full_name}</div>
                <div className="text-xs text-muted-foreground">{teacher.email}</div>
              </div>
              <button type="button" onClick={() => void localApi.ops.admin.deactivateTeacher(teacher.id).then(loadTeachers)} className="rounded-md border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground">
                Deactivate
              </button>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
