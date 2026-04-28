import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/features/admin/layout";
import { localApi, type AdminAttendanceClass } from "@/lib/localApi";
import { todayIso, downloadCsv } from "@/features/admin/utils";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function AdminAttendancePage() {
  const [attendanceDate, setAttendanceDate] = useState(todayIso);
  const [attendanceClasses, setAttendanceClasses] = useState<AdminAttendanceClass[]>([]);

  const load = async () => {
    try {
      const attendance = await localApi.ops.admin.attendanceReview(attendanceDate);
      setAttendanceClasses(attendance.classes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load attendance");
    }
  };

  useEffect(() => {
    void load();
  }, [attendanceDate]);

  const totals = useMemo(
    () =>
      attendanceClasses.reduce(
        (acc, cls) => ({
          present: acc.present + cls.present,
          absent: acc.absent + cls.absent,
          total: acc.total + cls.total,
        }),
        { present: 0, absent: 0, total: 0 },
      ),
    [attendanceClasses],
  );

  const exportCsv = () => {
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

  return (
    <AdminLayout title="Attendance">
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Daily Attendance Review</h2>
          <div className="flex items-center gap-2">
            <input type="date" className="rounded-md border border-border bg-input px-2 py-1" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            <button type="button" onClick={exportCsv} className="rounded-md border border-border bg-panel-elevated px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
              <Download className="mr-1 inline h-3.5 w-3.5" />CSV
            </button>
          </div>
        </div>
        <div className="mb-2 text-xs text-muted-foreground">Present {totals.present} / {totals.total} · Absent {totals.absent}</div>
        <div className="space-y-3">
          {attendanceClasses.map((cls) => (
            <div key={cls.class_name} className="rounded-md border border-border bg-panel-elevated p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold">Class {cls.class_name}</div>
                <div className="text-xs text-muted-foreground">{cls.present} present · {cls.absent} absent</div>
              </div>
              <div className="space-y-1 text-sm">
                {cls.learners.map((learner) => (
                  <div key={learner.child_id} className="flex items-center justify-between border-b border-border/40 py-1 last:border-0">
                    <span>{learner.full_name}</span>
                    <span className={learner.status === "present" ? "text-success" : "text-destructive"}>{learner.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
