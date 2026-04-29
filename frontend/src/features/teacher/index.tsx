import { useEffect, useMemo, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi, type Child, type HomeworkItem, type QuizSummary, type TeacherClass } from "@/lib/localApi";
import { toast } from "sonner";
import { BookOpenText, ClipboardCheck, FileText, GraduationCap } from "lucide-react";


export default function TeacherDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);

  const [children, setChildren] = useState<Child[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const classOptions = useMemo(
    () => teacherClasses.map((entry) => entry.class_name),
    [teacherClasses],
  );

  const todayPresent = useMemo(
    () => children.filter((child) => presentMap[child.id] ?? true).length,
    [children, presentMap],
  );

  const activeAssignments = homework.slice(0, 2);
  const attendanceRows = children.slice(0, 4);

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;

    loadDashboardData(sid);
  }, [profile?.school_id]);

  const loadDashboardData = async (schoolId: string) => {
    try {
      setLoading(true);
      const [schoolChildren, teacherQuizzes, teacherHomework, teacherClassRows] = await Promise.all([
        localApi.children.schoolChildren(schoolId),
        localApi.quizzes.teacherList(),
        localApi.ops.teacher.listHomework(),
        localApi.ops.teacher.classes(),
      ]);
      setTeacherClasses(teacherClassRows);
      setQuizzes(teacherQuizzes);
      setHomework(teacherHomework);
      const assignedClasses = new Set(teacherClassRows.map((entry) => entry.class_name));
      const filteredChildren = schoolChildren.filter((child) => assignedClasses.has(child.class_name));
      setChildren(filteredChildren);
      setPresentMap(Object.fromEntries(filteredChildren.map((child, index) => [child.id, index % 13 !== 0])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load teacher data");
    } finally {
      setLoading(false);
    }
  };

  const presentRate = children.length ? Math.round((todayPresent / children.length) * 1000) / 10 : 0;

  if (loading) {
    return (
      <div className="min-h-screen">
        <ConsoleHeader title="Dashboard" subtitle="Dashboard" />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">Unable to load user data. Please try refreshing the page.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Dashboard" subtitle="Dashboard" />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-[1.35rem] bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 px-6 py-7 text-white shadow-[0_12px_40px_rgba(15,118,110,0.2)]">
          <h1 className="text-xl font-semibold tracking-tight">Good morning, {user.full_name.split(" ")[0]}!</h1>
          <p className="mt-1 text-sm text-white/80">{children.length} students across {classOptions.length} classes today.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Total Students", value: children.length, icon: GraduationCap, accent: "bg-teal-50 text-teal-700" },
            {
              title: "Present Today",
              value: todayPresent,
              meta: `${presentRate}% rate`,
              icon: ClipboardCheck,
              accent: "bg-sky-50 text-sky-700",
            },
            { title: "Active Assignments", value: homework.length, icon: FileText, accent: "bg-amber-50 text-amber-700" },
            { title: "Active Quizzes", value: quizzes.length, icon: BookOpenText, accent: "bg-blue-50 text-blue-700" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{card.value}</div>
                <div className="mt-1 text-sm font-medium text-slate-500">{card.title}</div>
                {card.meta ? <div className="mt-2 text-xs font-semibold text-emerald-500">{card.meta}</div> : null}
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Today&apos;s Attendance — Class 4B</h2>
                <p className="mt-1 text-xs text-slate-500">Quick roll call with immediate present/absent status.</p>
              </div>
              <button className="rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-600">
                Mark Attendance
              </button>
            </div>

            <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {attendanceRows.map((child, index) => {
                const isPresent = presentMap[child.id] ?? true;
                return (
                  <div key={child.id} className="flex items-center justify-between gap-3 px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {child.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{child.full_name}</div>
                        <div className="text-xs text-slate-500">Class {child.class_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPresentMap((current) => ({ ...current, [child.id]: true }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isPresent ? "bg-emerald-500 text-white" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresentMap((current) => ({ ...current, [child.id]: false }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${!isPresent ? "bg-rose-500 text-white" : "border border-rose-200 bg-rose-50 text-rose-600"}`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <h2 className="text-base font-semibold text-slate-900">Active Assignments</h2>
            <div className="mt-5 space-y-3">
              {activeAssignments.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 px-4 py-5 text-sm text-slate-500">No homework posted yet.</div>
              ) : (
                activeAssignments.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${index === 0 ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"}`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500">Due {item.due_date ?? "—"} · {item.class_name}</div>
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${index === 0 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                      {item.read_count ?? 0}/{children.length || 28}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
