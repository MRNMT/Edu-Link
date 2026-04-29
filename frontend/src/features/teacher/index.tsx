import { useEffect, useMemo, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchSchoolTokens } from "@/store/slices/pickupSlice";
import { localApi, type Child, type HomeworkItem, type QuizSummary } from "@/lib/localApi";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

type AttendanceState = Record<string, "present" | "absent" | undefined>;

function formatDueDate(value: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

export default function TeacherDashboard() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);

  const [children, setChildren] = useState<Child[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const classOptions = useMemo(
    () => Array.from(new Set(children.map((child) => child.class_name).filter(Boolean))).sort(),
    [children],
  );

  useEffect(() => {
    const schoolId = profile?.school_id;
    if (!schoolId) return;

    void dispatch(fetchSchoolTokens(schoolId));
    void loadDashboardData(schoolId);
  }, [profile?.school_id, dispatch]);

  const loadDashboardData = async (schoolId: string) => {
    try {
      setLoading(true);
      const [schoolChildren, teacherQuizzes, teacherHomework] = await Promise.all([
        localApi.children.schoolChildren(schoolId),
        localApi.quizzes.teacherList(),
        localApi.ops.teacher.listHomework(),
      ]);
      setChildren(schoolChildren);
      setQuizzes(teacherQuizzes);
      setHomework(teacherHomework);
      setAttendance({});
      setSubmitted(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load teacher data");
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSubmit = async () => {
    try {
      setSavingAttendance(true);
      await localApi.ops.teacher.submitAttendanceBatch({
        attendance_date: new Date().toISOString().slice(0, 10),
        entries: children.map((child) => ({
          child_id: child.id,
          status: attendance[child.id] === "present" ? "present" : "absent",
        })),
      });
      setSubmitted(true);
      toast.success("Attendance submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <ConsoleHeader title="Dashboard" subtitle="Dashboard" />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen">
        <ConsoleHeader title="Dashboard" subtitle="Dashboard" />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-muted-foreground">Unable to load user data. Please try refreshing the page.</p>
          </div>
        </main>
      </div>
    );
  }

  const greetingName = user.full_name.split(" ")[0] ?? user.full_name;
  const presentCount = children.reduce(
    (count, child) => count + (attendance[child.id] === "present" ? 1 : 0),
    0,
  );
  const attendanceRate = children.length > 0 ? Math.round((presentCount / children.length) * 100) : 0;
  const activeHomework = homework.length;
  const activeQuizzes = quizzes.length;
  const topClass = classOptions[0] ?? "Class";

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Dashboard" subtitle="Dashboard" />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-[10px] bg-gradient-to-r from-[#23b8a8] to-[#27b7a7] px-6 py-6 text-white shadow-[0_10px_28px_rgba(35,184,168,0.14)] net-bg">
          <h1 className="text-[20px] font-semibold leading-tight">Good morning, {greetingName}!</h1>
          <p className="mt-1 text-[13px] text-white/75">
            {children.length} students across {classOptions.length} classes today.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={GraduationCap} label="Total Students" value={children.length} tone="teal" />
          <StatCard icon={CheckCircle2} label="Present Today" value={presentCount} subtitle={`${attendanceRate}% rate`} tone="blue" />
          <StatCard icon={FileText} label="Active Assignments" value={activeHomework} tone="amber" />
          <StatCard icon={ClipboardList} label="Active Quizzes" value={activeQuizzes} tone="indigo" />
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
          <div className="overflow-hidden rounded-[10px] border border-border bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] xl:col-span-3">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-navy">Today&apos;s Attendance — {topClass}</h2>
                <p className="text-xs text-muted-foreground">Mark present or absent, then submit the roll call.</p>
              </div>
              <button
                onClick={() => void handleAttendanceSubmit()}
                disabled={savingAttendance || submitted}
                className="btn btn-primary btn-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitted ? "Submitted" : savingAttendance ? "Saving..." : "Mark Attendance"}
              </button>
            </div>

            <div className="max-h-[330px] divide-y divide-border/60 overflow-auto">
              {children.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No learners available yet.
                </div>
              ) : (
                children.map((child, index) => {
                  const state = attendance[child.id];
                  return (
                    <div key={child.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-6 text-[12px] font-semibold text-navy/90 flex items-center justify-center">{String.fromCharCode(76 + (index % 4))}</div>
                        <div>
                          <div className="text-[13px] font-semibold text-navy">{child.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">{String.fromCharCode(65 + (index % 26))} · {child.class_name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAttendance((current) => ({ ...current, [child.id]: "present" }))}
                          className={`btn btn-sm ${state === "present" ? "btn-green" : "btn-outline text-[#1aa66d]"}`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendance((current) => ({ ...current, [child.id]: "absent" }))}
                          className={`btn btn-sm ${state === "absent" ? "btn-danger" : "btn-outline text-[#ef4a4a]"}`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-border bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] xl:col-span-2">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-navy">Active Assignments</h2>
                <p className="text-xs text-muted-foreground">Upcoming work and submission progress.</p>
              </div>
            </div>

            <div className="space-y-3 px-5 py-4">
              {homework.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  No homework posted yet.
                </div>
              ) : (
                homework.slice(0, 2).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-[10px] border border-border bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eef6fb] text-[#496b8f]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-navy">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Due {formatDueDate(item.due_date)} · {item.class_name}
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-[11px] font-semibold border ${index === 0 ? "border-[#fde6c8] bg-[#fffaf0] text-[#f59e0b]" : "border-[#dfe9ff] bg-[#f6fbff] text-[#3b6fdc]"}`}>
                      {item.read_count ?? 0}/{children.length || 28}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtitle?: string;
  tone: "teal" | "blue" | "amber" | "indigo";
}) {
  return (
    <div className={`stat-card ${
      tone === "teal" ? "sc-teal" : tone === "blue" ? "sc-blue" : tone === "amber" ? "sc-amber" : "sc-navy"
    }`}>
      <div className={`si ${tone === "teal" ? "si-teal" : tone === "blue" ? "si-blue" : tone === "amber" ? "si-amber" : "si-navy"}`}>
        <Icon className="h-4 w-4 text-current" />
      </div>
      <div className="stat-num">{value}</div>
      <div className="stat-lbl">{label}</div>
      {subtitle && <div className="stat-note">{subtitle}</div>}
    </div>
  );
}
