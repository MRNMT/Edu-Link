import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi, type Child } from "@/lib/localApi";
import { toast } from "sonner";
import { Download } from "lucide-react";

export default function TeacherAttendancePage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [tab, setTab] = useState<"today" | "review">("today");
  const [children, setChildren] = useState<Child[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void (async () => {
      try {
        setLoading(true);
        const [schoolChildren, teacherClassRows, history] = await Promise.all([
          localApi.children.schoolChildren(sid),
          localApi.ops.teacher.classes(),
          localApi.ops.teacher.reviewAttendance(),
        ]);
        const classNames = teacherClassRows.map((entry) => entry.class_name);
        setAssignedClasses(classNames);
        setChildren(schoolChildren.filter((child) => classNames.includes(child.class_name)));
        setAttendanceHistory(history);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.school_id]);

  const submitAttendance = async () => {
    if (!children.length) return;
    try {
      const entries = children.map((child) => ({
        child_id: child.id,
        status: present[child.id] ? ("present" as const) : ("absent" as const),
      }));
      await localApi.ops.teacher.submitAttendanceBatch({
        attendance_date: new Date().toISOString().slice(0, 10),
        entries,
      });
      setSubmitted(true);
      toast.success("Attendance submitted", {
        description: `${entries.filter((e) => e.status === "present").length} of ${entries.length} present`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit attendance");
    }
  };

  const exportCsv = () => {
    if (!attendanceHistory.length) {
      toast.error("No attendance records to export");
      return;
    }
    try {
      const rows = [["Date", "Child Name", "Status"]];
      attendanceHistory.forEach((record) => {
        rows.push([record.attendance_date, record.full_name, record.status]);
      });
      const csv = rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Attendance exported");
    } catch {
      toast.error("Failed to export");
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Attendance" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("today")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                tab === "today" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              Today's Roll
            </button>
            <button
              onClick={() => setTab("review")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                tab === "review" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              History
            </button>
          </div>
        </div>

        {tab === "today" && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Today's Attendance · {new Date().toLocaleDateString()}</h3>
                <p className="text-xs text-muted-foreground">
                  One-tap roll call for {assignedClasses.length ? `Class ${assignedClasses[0]}` : "your assigned classes"}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  submitted ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                }`}
              >
                {submitted ? "✓ Submitted" : "⚠ Pending"}
              </span>
            </div>

            <div className="max-h-[400px] space-y-2 overflow-auto pr-1">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading children…</div>
              ) : children.length === 0 ? (
                <div className="text-sm text-muted-foreground">No children found for your school.</div>
              ) : (
                children.map((child) => (
                  <label
                    key={child.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-3 text-sm transition ${
                      present[child.id] ? "border-success/40 bg-success/5" : "border-border bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{child.full_name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Class {child.class_name}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!present[child.id]}
                      onChange={(e) => setPresent((c) => ({ ...c, [child.id]: e.target.checked }))}
                      className="h-5 w-5 accent-primary"
                    />
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitAttendance}
                disabled={submitted || loading}
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                Submit Attendance
              </button>
              <button
                onClick={() => {
                  setPresent({});
                  setSubmitted(false);
                }}
                className="px-4 py-2.5 rounded-md border border-border hover:bg-muted transition text-sm font-semibold"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {tab === "review" && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Attendance History</h3>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted transition text-sm"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading history…</div>
              ) : attendanceHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground">No attendance records yet.</div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b sticky top-0 bg-muted">
                        <th className="text-left p-2 font-semibold">Child Name</th>
                        <th className="text-left p-2 font-semibold">Date</th>
                        <th className="text-left p-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.map((record, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          <td className="p-2">{record.full_name}</td>
                          <td className="p-2 text-muted-foreground">{record.attendance_date}</td>
                          <td className="p-2">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                record.status === "present"
                                  ? "bg-success/20 text-success"
                                  : "bg-destructive/20 text-destructive"
                              }`}
                            >
                              {record.status === "present" ? "✓ Present" : "✗ Absent"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
