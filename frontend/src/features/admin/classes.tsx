import { useEffect, useState } from "react";
import { useAppSelector } from "@/store";
import { AdminLayout } from "@/features/admin/layout";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

type ClassItem = { id: string; name: string; grade_level: string; capacity: number; created_at: string };

export default function AdminClassesPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [newClass, setNewClass] = useState({ name: "", grade_level: "", capacity: "" });

  const loadClasses = async () => {
    if (!profile?.school_id) return;
    try {
      const rows = await localApi.ops.admin.listClasses();
      setClasses(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load classes");
    }
  };

  useEffect(() => {
    void loadClasses();
  }, [profile?.school_id]);

  const createClass = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newClass.name.trim()) {
      toast.error("Class name is required");
      return;
    }

    if (!newClass.grade_level.trim()) {
      toast.error("Grade level is required");
      return;
    }

    if (!newClass.capacity) {
      toast.error("Capacity is required");
      return;
    }

    try {
      await localApi.ops.admin.createClass({
        name: newClass.name.trim(),
        grade_level: newClass.grade_level.trim(),
        capacity: Number(newClass.capacity),
      });
      toast.success("Class created");
      setNewClass({ name: "", grade_level: "", capacity: "" });
      await loadClasses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create class");
    }
  };

  const deleteClass = async (classId: string) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await localApi.ops.admin.deleteClass(classId);
      toast.success("Class deleted");
      await loadClasses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete class");
    }
  };

  return (
    <AdminLayout title="Classes">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Class Management</h2>
        <form onSubmit={createClass} className="mb-4 grid gap-2 md:grid-cols-4">
          <input
            required
            className="rounded-md border border-border bg-input px-3 py-2"
            placeholder="Class name (e.g. A or B)"
            value={newClass.name}
            onChange={(e) => setNewClass((v) => ({ ...v, name: e.target.value }))}
          />
          <input
            required
            className="rounded-md border border-border bg-input px-3 py-2"
            placeholder="Grade level (e.g. Grade 4)"
            value={newClass.grade_level}
            onChange={(e) => setNewClass((v) => ({ ...v, grade_level: e.target.value }))}
          />
          <input
            type="number"
            required
            className="rounded-md border border-border bg-input px-3 py-2"
            placeholder="Capacity"
            min="1"
            value={newClass.capacity}
            onChange={(e) => setNewClass((v) => ({ ...v, capacity: e.target.value }))}
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground"
          >
            Add Class
          </button>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <div key={cls.id} className="rounded-lg border border-border bg-slate-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold text-navy">{cls.name}</div>
                  {cls.grade_level && <div className="text-xs text-navy/60">Grade: {cls.grade_level}</div>}
                  {cls.capacity && <div className="text-xs text-navy/60">Capacity: {cls.capacity}</div>}
                </div>
                <button
                  onClick={() => deleteClass(cls.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {classes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
              No classes created yet.
            </div>
          ) : null}
        </div>
      </section>
    </AdminLayout>
  );
}
