import { useEffect, useMemo, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import {
  localApi,
  type AdminAttendanceClass,
  type AuditEntry,
  type DelegateQueueItem,
  type LocalUser,
} from "@/lib/localApi";
import { useAppSelector } from "@/store";
import { CheckCircle, Download, Lock, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";

const todayIso = new Date().toISOString().slice(0, 10);

function downloadCsv(filename: string, rows: string[][]) {
  const escapeCell = (value: string) =>
    /[,"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const csv = rows.map((row) => row.map((cell) => escapeCell(cell ?? "")).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [attendanceDate, setAttendanceDate] = useState(todayIso);
  const [attendanceClasses, setAttendanceClasses] = useState<AdminAttendanceClass[]>([]);
  const [delegates, setDelegates] = useState<DelegateQueueItem[]>([]);
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [teachers, setTeachers] = useState<LocalUser[]>([]);

  const [wizard, setWizard] = useState({
    child_full_name: "",
    class_name: "",
    grade: "",
    parent_id: "",
    parent_invite_email: "",
    parent_invite_phone: "",
  });
  const [newTeacher, setNewTeacher] = useState({ full_name: "", email: "" });
  const [freezeForm, setFreezeForm] = useState({ user_id: "", reason: "" });
  const [auditFilter, setAuditFilter] = useState({
    actorId: "",
    action: "",
    from: todayIso,
    to: todayIso,
    page: 1,
  });

  const attendanceTotals = useMemo(() => {
    return attendanceClasses.reduce(
      (acc, cls) => {
        acc.present += cls.present;
        acc.absent += cls.absent;
        acc.total += cls.total;
        return acc;
      },
      { present: 0, absent: 0, total: 0 },
    );
  }, [attendanceClasses]);

  const loadAdminData = async () => {
    if (!profile?.school_id) return;
    try {
      const [attendance, queue, audit, allTeachers] = await Promise.all([
        localApi.ops.admin.attendanceReview(attendanceDate),
        localApi.ops.admin.delegates("pending"),
        localApi.ops.admin.audit(auditFilter),
        localApi.ops.admin.listTeachers(),
      ]);

      setAttendanceClasses(attendance.classes);
      setDelegates(queue);
      setAuditRows(audit.rows);
      setTeachers(allTeachers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admin console");
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, [
    profile?.school_id,
    attendanceDate,
    auditFilter.actorId,
    auditFilter.action,
    auditFilter.from,
    auditFilter.to,
    auditFilter.page,
  ]);

  const onboardLearner = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.admin.onboardLearner({
        child_full_name: wizard.child_full_name,
        class_name: wizard.class_name,
        grade: wizard.grade,
        parent_id: wizard.parent_id || null,
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
        parent_id: "",
        parent_invite_email: "",
        parent_invite_phone: "",
      });
      await loadAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Onboarding failed");
    }
  };

  const decideDelegate = async (id: string, decision: "approve" | "reject") => {
    try {
      await localApi.ops.admin.decideDelegate(id, decision);
      toast.success(decision === "approve" ? "Delegate approved" : "Delegate rejected");
      await loadAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Decision failed");
    }
  };

  const exportAttendanceCsv = () => {
    const rows = [["class_name", "child_name", "status", "reason", "date"]];
    for (const cls of attendanceClasses) {
      for (const learner of cls.learners) {
        rows.push([
          cls.class_name,
          learner.full_name,
          learner.status,
          learner.reason ?? "",
          learner.attendance_date,
        ]);
      }
    }
    downloadCsv(`attendance-${attendanceDate}.csv`, rows);
  };

  const createTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.admin.createTeacher(newTeacher);
      toast.success("Teacher invited");
      setNewTeacher({ full_name: "", email: "" });
      await loadAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Teacher create failed");
    }
  };

  const freezeAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.admin.freezeAccount(freezeForm.user_id, true, freezeForm.reason);
      toast.success("Account frozen");
      setFreezeForm({ user_id: "", reason: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Freeze failed");
    }
  };

  const exportAuditCsv = () => {
    const rows = [["created_at", "actor_id", "action", "target"]];
    for (const row of auditRows) {
      rows.push([
        String(row.created_at),
        String(row.actor_id ?? ""),
        row.action,
        String(row.target ?? ""),
      ]);
    }
    downloadCsv("audit-log.csv", rows);
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Admin Console" subtitle="School Administration" />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Learner Onboarding Wizard</h2>
          </div>
          <form onSubmit={onboardLearner} className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Child full name"
              value={wizard.child_full_name}
              onChange={(e) => setWizard((v) => ({ ...v, child_full_name: e.target.value }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Class"
              value={wizard.class_name}
              onChange={(e) => setWizard((v) => ({ ...v, class_name: e.target.value }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Grade"
              value={wizard.grade}
              onChange={(e) => setWizard((v) => ({ ...v, grade: e.target.value }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Existing parent ID (optional)"
              value={wizard.parent_id}
              onChange={(e) => setWizard((v) => ({ ...v, parent_id: e.target.value }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Invite parent email (optional)"
              value={wizard.parent_invite_email}
              onChange={(e) => setWizard((v) => ({ ...v, parent_invite_email: e.target.value }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2"
              placeholder="Invite parent phone (optional)"
              value={wizard.parent_invite_phone}
              onChange={(e) => setWizard((v) => ({ ...v, parent_invite_phone: e.target.value }))}
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground"
            >
              Create learner + link
            </button>
          </form>
        </section>

        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Daily Attendance Review</h2>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="rounded-md border border-border bg-input px-2 py-1"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
              <button
                type="button"
                onClick={exportAttendanceCsv}
                className="rounded-md border border-border bg-panel-elevated px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
              >
                <Download className="mr-1 inline h-3.5 w-3.5" />
                CSV
              </button>
            </div>
          </div>
          <div className="mb-2 text-xs text-muted-foreground">
            Present {attendanceTotals.present} / {attendanceTotals.total} · Absent{" "}
            {attendanceTotals.absent}
          </div>
          <div className="space-y-3">
            {attendanceClasses.map((cls) => (
              <div
                key={cls.class_name}
                className="rounded-md border border-border bg-panel-elevated p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold">Class {cls.class_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {cls.present} present · {cls.absent} absent
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {cls.learners.map((learner) => (
                    <div
                      key={learner.child_id}
                      className="flex items-center justify-between border-b border-border/40 py-1 last:border-0"
                    >
                      <span>{learner.full_name}</span>
                      <span
                        className={
                          learner.status === "present" ? "text-success" : "text-destructive"
                        }
                      >
                        {learner.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-lg font-semibold">Delegate Approval Queue</h2>
          <div className="space-y-2">
            {delegates.length === 0 && (
              <div className="text-sm text-muted-foreground">No pending delegates.</div>
            )}
            {delegates.map((delegate) => (
              <div
                key={delegate.id}
                className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3"
              >
                <div>
                  <div className="font-semibold">{delegate.delegate_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {delegate.relationship} · {delegate.phone} · Parent {delegate.parent_name}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void decideDelegate(delegate.id, "approve")}
                    className="rounded-md bg-success px-3 py-1.5 text-xs font-semibold uppercase text-success-foreground"
                  >
                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void decideDelegate(delegate.id, "reject")}
                    className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold uppercase text-destructive-foreground"
                  >
                    <XCircle className="mr-1 inline h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Account Freeze</h2>
            <form onSubmit={freezeAccount} className="space-y-3">
              <input
                className="w-full rounded-md border border-border bg-input px-3 py-2"
                placeholder="Parent user ID"
                value={freezeForm.user_id}
                onChange={(e) => setFreezeForm((v) => ({ ...v, user_id: e.target.value }))}
              />
              <input
                className="w-full rounded-md border border-border bg-input px-3 py-2"
                placeholder="Reason"
                value={freezeForm.reason}
                onChange={(e) => setFreezeForm((v) => ({ ...v, reason: e.target.value }))}
              />
              <button
                type="submit"
                className="rounded-md bg-destructive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-destructive-foreground"
              >
                <Lock className="mr-1 inline h-3.5 w-3.5" />
                Freeze account
              </button>
            </form>
          </div>

          <div className="panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Teacher Management</h2>
            <form onSubmit={createTeacher} className="mb-4 grid gap-2">
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
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground"
              >
                Create teacher
              </button>
            </form>
            <div className="max-h-48 space-y-2 overflow-auto pr-1 text-sm">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-2"
                >
                  <div>{teacher.full_name}</div>
                  <button
                    type="button"
                    onClick={() =>
                      void localApi.ops.admin.deactivateTeacher(teacher.id).then(loadAdminData)
                    }
                    className="rounded-md border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground"
                  >
                    Deactivate
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Audit Log Viewer</h2>
            <button
              type="button"
              onClick={exportAuditCsv}
              className="rounded-md border border-border bg-panel-elevated px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <Download className="mr-1 inline h-3.5 w-3.5" />
              CSV
            </button>
          </div>
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            <input
              className="rounded-md border border-border bg-input px-3 py-2 text-sm"
              placeholder="Actor ID"
              value={auditFilter.actorId}
              onChange={(e) => setAuditFilter((f) => ({ ...f, actorId: e.target.value, page: 1 }))}
            />
            <input
              className="rounded-md border border-border bg-input px-3 py-2 text-sm"
              placeholder="Action"
              value={auditFilter.action}
              onChange={(e) => setAuditFilter((f) => ({ ...f, action: e.target.value, page: 1 }))}
            />
            <input
              type="date"
              className="rounded-md border border-border bg-input px-3 py-2 text-sm"
              value={auditFilter.from}
              onChange={(e) => setAuditFilter((f) => ({ ...f, from: e.target.value, page: 1 }))}
            />
            <input
              type="date"
              className="rounded-md border border-border bg-input px-3 py-2 text-sm"
              value={auditFilter.to}
              onChange={(e) => setAuditFilter((f) => ({ ...f, to: e.target.value, page: 1 }))}
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-auto font-mono text-xs">
            {auditRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[160px_140px_1fr] gap-3 border-b border-border/40 py-1.5 last:border-0"
              >
                <span className="text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
                <span>{row.actor_id}</span>
                <span>{row.action}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
