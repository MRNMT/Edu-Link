import React, { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import type { Child } from "@/lib/localApi";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

interface AttendanceTrackerProps {
  children: Child[];
  onSubmit: () => void;
  submitted: boolean;
}

export function AttendanceTracker({ children, onSubmit, submitted }: AttendanceTrackerProps) {
  const [present, setPresentState] = useState<Record<string, boolean>>({});

  const handleSubmit = async () => {
    const entries = children.map((child) => ({
      child_id: child.id,
      status: present[child.id] ? ("present" as const) : ("absent" as const),
    }));

    try {
      await localApi.ops.teacher.submitAttendanceBatch({
        attendance_date: new Date().toISOString().slice(0, 10),
        entries,
      });

      toast.success("Attendance submitted", {
        description: `${entries.filter((entry) => entry.status === "present").length} of ${entries.length} present`,
      });
      onSubmit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit attendance");
    }
  };

  return (
    <section className="panel p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Attendance · Today</h2>
          <p className="text-xs text-muted-foreground">One-tap roll call.</p>
        </div>
        <span className={`pill-status ${submitted ? "pill-success" : "pill-warning"}`}>
          {submitted ? "Submitted" : "Pending"}
        </span>
      </div>

      <div className="mt-4 max-h-[340px] space-y-2 overflow-auto pr-1">
        {children.map((child) => (
          <label
            key={child.id}
            className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-sm transition ${
              present[child.id] ? "border-success/40 bg-success/5" : "border-border bg-panel-elevated"
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
              onChange={(event) => setPresentState((current) => ({ ...current, [child.id]: event.target.checked }))}
              className="h-5 w-5 accent-primary"
            />
          </label>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        <ClipboardCheck className="h-4 w-4" />
        Submit attendance
      </button>
    </section>
  );
}
