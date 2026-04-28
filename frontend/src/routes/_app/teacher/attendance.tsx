import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi, type Child } from "@/lib/localApi";
import { toast } from "sonner";

function AttendancePage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [children, setChildren] = useState<Child[]>([]);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void (async () => {
      try {
        setLoading(true);
        const schoolChildren = await localApi.children.schoolChildren(sid);
        setChildren(schoolChildren);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load children");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.school_id]);

  const submitAttendance = async () => {
    if (!children.length) return;
    try {
      const entries = children.map((child) => ({ child_id: child.id, status: present[child.id] ? "present" : "absent" }));
      await localApi.ops.teacher.submitAttendanceBatch({ attendance_date: new Date().toISOString().slice(0, 10), entries });
      setSubmitted(true);
      toast.success("Attendance submitted", { description: `${entries.filter((e) => e.status === "present").length} of ${entries.length} present` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit attendance");
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Attendance" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Attendance · Today</h2>
              <p className="text-xs text-muted-foreground">One-tap roll call.</p>
            </div>
            <span className={`pill-status ${submitted ? "pill-success" : "pill-warning"}`}>{submitted ? "Submitted" : "Pending"}</span>
          </div>

          <div className="mt-4 max-h-[340px] space-y-2 overflow-auto pr-1">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading children…</div>
            ) : children.length === 0 ? (
              <div className="text-sm text-muted-foreground">No children found for your school.</div>
            ) : (
              children.map((child) => (
                <label key={child.id} className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-sm transition ${present[child.id] ? "border-success/40 bg-success/5" : "border-border bg-panel-elevated"}`}>
                  <div>
                    <div className="font-medium">{child.full_name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Class {child.class_name}</div>
                  </div>
                  <input type="checkbox" checked={!!present[child.id]} onChange={(e) => setPresent((c) => ({ ...c, [child.id]: e.target.checked }))} className="h-5 w-5 accent-primary" />
                </label>
              ))
            )}
          </div>

          <button onClick={submitAttendance} disabled={submitted || loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            Submit attendance
          </button>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/_app/teacher/attendance")({
  component: AttendancePage,
});

export default Route;
