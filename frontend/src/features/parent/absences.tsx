import { useEffect, useMemo, useState } from "react";
import { localApi, type ParentAttendanceRow } from "@/lib/localApi";
import { ParentLayout } from "@/features/parent/layout";
import { toast } from "sonner";

export default function ParentAbsencesPage() {
  const [attendanceRows, setAttendanceRows] = useState<ParentAttendanceRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await localApi.ops.parent.attendance();
        setAttendanceRows(rows);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load attendance");
      }
    })();
  }, []);

  const attendanceByChild = useMemo(() => {
    const grouped = new Map<
      string,
      {
        childName: string;
        className: string;
        grade: string;
        rows: ParentAttendanceRow[];
      }
    >();

    for (const row of attendanceRows) {
      if (!grouped.has(row.child_id)) {
        grouped.set(row.child_id, {
          childName: row.full_name,
          className: row.class_name,
          grade: row.grade,
          rows: [],
        });
      }
      if (row.attendance_date) {
        grouped.get(row.child_id)?.rows.push(row);
      }
    }

    return Array.from(grouped.values()).map((entry) => ({
      ...entry,
      rows: entry.rows.slice(0, 20),
    }));
  }, [attendanceRows]);

  return (
    <ParentLayout title="Attendance Per Child">
      <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 text-sm font-bold text-navy">Attendance History Per Child</div>
        {attendanceByChild.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
            No attendance records found yet.
          </div>
        ) : (
          <div className="space-y-4">
            {attendanceByChild.map((child) => (
              <div key={child.childName} className="rounded-xl border border-border bg-slate-50 p-3">
                <div className="mb-2">
                  <div className="font-semibold text-navy">{child.childName}</div>
                  <div className="text-xs text-navy/60">
                    {child.grade} · {child.className}
                  </div>
                </div>

                {child.rows.length === 0 ? (
                  <div className="text-xs text-navy/60">No attendance rows yet.</div>
                ) : (
                  <div className="space-y-1">
                    {child.rows.map((row, index) => (
                      <div
                        key={`${child.childName}-${row.attendance_date}-${index}`}
                        className="grid grid-cols-[120px_110px_1fr] items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs"
                      >
                        <span className="text-navy/70">{row.attendance_date}</span>
                        <span
                          className={`font-semibold uppercase ${
                            row.status === "present"
                              ? "text-emerald-700"
                              : row.status === "absent"
                                ? "text-rose-700"
                                : "text-amber-700"
                          }`}
                        >
                          {row.status ?? "n/a"}
                        </span>
                        <span className="text-navy/70">{row.reason || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </ParentLayout>
  );
}
