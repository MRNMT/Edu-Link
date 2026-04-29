import { useEffect, useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi, type AdminTeacherItem } from "@/lib/localApi";
import { toast } from "sonner";

type TeacherAssignmentForm = {
  class_name: string;
  grade_level: string;
};

type ClassOption = { id: string; name: string; grade_level: string; capacity: number };

type EditingTeacher = AdminTeacherItem | null;
type ManagingTeacherId = string | null;

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<AdminTeacherItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [newTeacher, setNewTeacher] = useState({ full_name: "", email: "", teacher_id: "" });
  const [assignments, setAssignments] = useState<TeacherAssignmentForm[]>([{ class_name: "", grade_level: "" }]);
  const [editingTeacher, setEditingTeacher] = useState<EditingTeacher>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", teacher_id: "" });
  const [managingTeacherId, setManagingTeacherId] = useState<ManagingTeacherId>(null);
  const [managingAssignments, setManagingAssignments] = useState<TeacherAssignmentForm[]>([]);

  const loadTeachers = async () => {
    try {
      const rows = await localApi.ops.admin.listTeachers();
      setTeachers(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load teachers");
    }
  };

  const loadClasses = async () => {
    try {
      const rows = await localApi.ops.admin.listClasses();
      setClasses(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load classes");
    }
  };

  useEffect(() => {
    void loadTeachers();
    void loadClasses();
  }, []);

  const updateAssignment = (index: number, patch: Partial<TeacherAssignmentForm>) => {
    setAssignments((current) => current.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)));
  };

  const addAssignmentRow = () => {
    setAssignments((current) => [...current, { class_name: "", grade_level: "" }]);
  };

  const removeAssignmentRow = (index: number) => {
    setAssignments((current) => current.filter((_, idx) => idx !== index));
  };

  const openEditTeacher = (teacher: AdminTeacherItem) => {
    setEditingTeacher(teacher);
    setEditForm({
      full_name: teacher.full_name,
      email: teacher.email,
      teacher_id: teacher.teacher_id || "",
    });
  };

  const saveTeacherEdits = async () => {
    if (!editingTeacher) return;

    if (!editForm.full_name.trim()) {
      toast.error("Teacher name is required");
      return;
    }

    if (!editForm.email.trim()) {
      toast.error("Teacher email is required");
      return;
    }

    try {
      await localApi.ops.admin.updateTeacher(editingTeacher.id, {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
      });
      toast.success("Teacher updated");
      setEditingTeacher(null);
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update teacher");
    }
  };

  const openManageAssignments = (teacher: AdminTeacherItem) => {
    setManagingTeacherId(teacher.id);
    setManagingAssignments(
      (teacher.assignments ?? []).length > 0
        ? teacher.assignments.map((a) => ({ class_name: a.class_name, grade_level: String(a.grade_level) }))
        : [{ class_name: "", grade_level: "" }]
    );
  };

  const updateManagingAssignment = (index: number, patch: Partial<TeacherAssignmentForm>) => {
    setManagingAssignments((current) => current.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)));
  };

  const addManagingAssignmentRow = () => {
    setManagingAssignments((current) => [...current, { class_name: "", grade_level: "" }]);
  };

  const removeManagingAssignmentRow = (index: number) => {
    setManagingAssignments((current) => current.filter((_, idx) => idx !== index));
  };

  const saveTeacherAssignments = async () => {
    if (!managingTeacherId) return;

    const normalizedAssignments = managingAssignments
      .map((entry) => ({
        class_name: entry.class_name.trim(),
        grade_level: Number(entry.grade_level),
      }))
      .filter((entry) => entry.class_name.length > 0 && !isNaN(entry.grade_level));

    if (normalizedAssignments.length === 0) {
      toast.error("Please add at least one valid class assignment");
      return;
    }

    const invalidGrade = normalizedAssignments.some(
      (entry) => !Number.isInteger(entry.grade_level) || entry.grade_level < 1 || entry.grade_level > 7,
    );

    if (invalidGrade) {
      toast.error("All assignments must have a grade level between Grade 1 and Grade 7");
      return;
    }

    try {
      await localApi.ops.admin.updateTeacherAssignments(managingTeacherId, normalizedAssignments);
      toast.success("Class assignments updated");
      setManagingTeacherId(null);
      setManagingAssignments([]);
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update assignments");
    }
  };

  const toggleTeacherStatus = async (teacher: AdminTeacherItem) => {
    try {
      if (teacher.is_active) {
        await localApi.ops.admin.deactivateTeacher(teacher.id);
        toast.success("Teacher suspended");
      } else {
        await localApi.ops.admin.reactivateTeacher(teacher.id);
        toast.success("Teacher reactivated");
      }
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update teacher status");
    }
  };

  const removeTeacherAssignment = async (teacherId: string, className: string, gradeLevel: number) => {
    try {
      const teacher = teachers.find((t) => t.id === teacherId);
      if (!teacher) return;

      const updatedAssignments = (teacher.assignments ?? [])
        .filter((a) => !(a.class_name === className && a.grade_level === gradeLevel))
        .map((a) => ({ class_name: a.class_name, grade_level: a.grade_level }));

      await localApi.ops.admin.updateTeacherAssignments(teacherId, updatedAssignments);
      toast.success("Class unassigned");
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unassign class");
    }
  };

  const createTeacher = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedAssignments = assignments
      .map((entry) => ({
        class_name: entry.class_name.trim(),
        grade_level: Number(entry.grade_level),
      }))
      .filter((entry) => entry.class_name.length > 0 && !isNaN(entry.grade_level));

    if (normalizedAssignments.length === 0) {
      toast.error("Please add at least one valid class assignment");
      return;
    }

    const invalidGrade = normalizedAssignments.some(
      (entry) => !Number.isInteger(entry.grade_level) || entry.grade_level < 1 || entry.grade_level > 7,
    );

    if (invalidGrade) {
      toast.error("All assignments must have a grade level between Grade 1 and Grade 7");
      return;
    }

    try {
      await localApi.ops.admin.createTeacher({
        full_name: newTeacher.full_name,
        email: newTeacher.email,
        teacher_id: newTeacher.teacher_id.trim() || undefined,
        assignments: normalizedAssignments,
      });
      toast.success("Teacher invited");
      setNewTeacher({ full_name: "", email: "", teacher_id: "" });
      setAssignments([{ class_name: "", grade_level: "" }]);
      await loadTeachers();
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("teacher_id"))) {
        toast.error("Teacher ID is required");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Teacher create failed");
    }
  };

  return (
    <AdminLayout title="Teachers">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Teacher Management</h2>
        <form onSubmit={createTeacher} className="mb-4 space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Teacher name"
              value={newTeacher.full_name}
              onChange={(e) => setNewTeacher((v) => ({ ...v, full_name: e.target.value }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Teacher email"
              value={newTeacher.email}
              onChange={(e) => setNewTeacher((v) => ({ ...v, email: e.target.value }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Teacher ID"
              value={newTeacher.teacher_id}
              onChange={(e) => setNewTeacher((v) => ({ ...v, teacher_id: e.target.value }))}
              required
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground"
            >
              Create teacher
            </button>
          </div>
        </form>

        <div className="max-h-80 space-y-2 overflow-auto pr-1 text-sm">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex items-start justify-between rounded-md border border-border bg-panel-elevated p-3">
              <div className="flex-1">
                <div className="font-semibold">{teacher.full_name}</div>
                <div className="text-xs text-muted-foreground">{teacher.email}</div>
                {teacher.teacher_id && <div className="text-xs text-muted-foreground">ID: {teacher.teacher_id}</div>}
              <div className="mt-1 text-xs text-muted-foreground">
                {(teacher.assignments ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(teacher.assignments ?? []).map((entry, idx) => (
                      <div
                        key={`${idx}-${entry.class_name}`}
                        className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
                      >
                        <span>
                          {entry.class_name} (Grade {entry.grade_level})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTeacherAssignment(teacher.id, entry.class_name, entry.grade_level)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          title="Unassign class"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  "No assigned classes"
                )}
              </div>
              </div>
              <div className="ml-3 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => openEditTeacher(teacher)}
                  className="rounded-md border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground hover:bg-panel-elevated"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => openManageAssignments(teacher)}
                  className="rounded-md border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground hover:bg-panel-elevated"
                >
                  Classes
                </button>
                <button
                  type="button"
                  onClick={() => toggleTeacherStatus(teacher)}
                  className={`rounded-md border px-2 py-1 text-[11px] uppercase ${
                    teacher.is_active
                      ? "border-red-300 text-red-600 hover:bg-red-50"
                      : "border-green-300 text-green-600 hover:bg-green-50"
                  }`}
                >
                  {teacher.is_active ? "Suspend" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Teacher Modal */}
        {editingTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-lg border border-border bg-white p-5 shadow-lg max-w-md w-full mx-4">
              <h3 className="mb-4 text-lg font-semibold">Edit Teacher</h3>
              <div className="space-y-3">
                <input
                  className="w-full rounded-md border border-border bg-input px-3 py-2"
                  placeholder="Teacher name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((v) => ({ ...v, full_name: e.target.value }))}
                />
                <input
                  className="w-full rounded-md border border-border bg-input px-3 py-2"
                  placeholder="Teacher email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((v) => ({ ...v, email: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={saveTeacherEdits}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase text-primary-foreground"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTeacher(null)}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Assignments Modal */}
        {managingTeacherId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-lg border border-border bg-white p-5 shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <h3 className="mb-4 text-lg font-semibold">Manage Class Assignments</h3>
              <div className="space-y-2 mb-4">
                {managingAssignments.map((assignment, index) => {
                  const filteredClasses = assignment.grade_level
                    ? classes.filter((c) => String(c.grade_level) === String(assignment.grade_level))
                    : [];
                  
                  return (
                    <div key={`${index}-${assignment.class_name}`} className="grid gap-2 md:grid-cols-[140px_1fr_100px]">
                      <select
                        className="rounded-md border border-border bg-input px-3 py-2"
                        value={assignment.grade_level}
                        onChange={(e) => updateManagingAssignment(index, { grade_level: e.target.value, class_name: "" })}
                      >
                        <option value="">Select grade</option>
                        {Array.from({ length: 7 }, (_, i) => i + 1).map((grade) => (
                          <option key={grade} value={String(grade)}>
                            Grade {grade}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-md border border-border bg-input px-3 py-2"
                        value={assignment.class_name}
                        onChange={(e) => updateManagingAssignment(index, { class_name: e.target.value })}
                        disabled={!assignment.grade_level}
                      >
                        <option value="">
                          {assignment.grade_level ? "Select a class" : "Select grade first"}
                        </option>
                        {filteredClasses.map((cls) => (
                          <option key={cls.id} value={cls.name}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeManagingAssignmentRow(index)}
                        disabled={managingAssignments.length === 1}
                        className="rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addManagingAssignmentRow}
                className="mb-4 rounded-md border border-border px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground"
              >
                Add class
              </button>
              <div className="flex gap-2">
                <button
                  onClick={saveTeacherAssignments}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase text-primary-foreground"
                >
                  Save
                </button>
                <button
                  onClick={() => setManagingTeacherId(null)}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
