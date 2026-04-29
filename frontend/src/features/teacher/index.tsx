import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchSchoolTokens } from "@/store/slices/pickupSlice";
import { localApi, type Child, type QuizSummary } from "@/lib/localApi";
import { QuizBuilder } from "./QuizBuilder";
import { AttendanceTracker } from "./AttendanceTracker";
import { PickupVerification } from "./PickupVerification";
import { HomeworkForm } from "./HomeworkForm";
import { ClassAlertsForm } from "./ClassAlertsForm";
import { toast } from "sonner";


export default function TeacherDashboard() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);

  const [children, setChildren] = useState<Child[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const classOptions = Array.from(
    new Set(children.map((child) => child.class_name).filter(Boolean)),
  ).sort();

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;

    void dispatch(fetchSchoolTokens(sid));
    loadDashboardData(sid);
  }, [profile?.school_id, dispatch]);

  const loadDashboardData = async (schoolId: string) => {
    try {
      setLoading(true);
      const [schoolChildren, teacherQuizzes] = await Promise.all([
        localApi.children.schoolChildren(schoolId),
        localApi.quizzes.teacherList(),
      ]);
      setChildren(schoolChildren);
      setQuizzes(teacherQuizzes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load teacher data");
    } finally {
      setLoading(false);
    }
  };

  const handleDataRefresh = () => {
    if (profile?.school_id) {
      loadDashboardData(profile.school_id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <ConsoleHeader title="Teacher Console" subtitle="Teacher" />
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
        <ConsoleHeader title="Teacher Console" subtitle="Teacher" />
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
      <ConsoleHeader title="Teacher Console" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Header Stats */}
        <div className="space-y-6">
          <div className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 p-6 text-white">
            <h1 className="text-xl font-semibold">Good morning, {user.full_name.split(" ")[0]}!</h1>
            <p className="text-sm opacity-90">
              {children.length} students across {classOptions.length} classes today.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel p-4">
              <div className="text-sm text-muted-foreground">Total Students</div>
              <div className="mt-3 text-2xl font-semibold">{children.length}</div>
            </div>
            <div className="panel p-4">
              <div className="text-sm text-muted-foreground">Classes</div>
              <div className="mt-3 text-2xl font-semibold">{classOptions.length}</div>
            </div>
            <div className="panel p-4">
              <div className="text-sm text-muted-foreground">Active Quizzes</div>
              <div className="mt-3 text-2xl font-semibold">{quizzes.length}</div>
            </div>
            <div className="panel p-4">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="mt-3 text-2xl font-semibold">{submitted ? "✓" : "—"}</div>
            </div>
          </div>
        </div>

        {/* Attendance + Pickup */}
        <div className="grid gap-6 lg:grid-cols-3">
          <AttendanceTracker
            children={children}
            onSubmit={() => setSubmitted(true)}
            submitted={submitted}
          />
          {user.id && profile.school_id && (
            <PickupVerification userId={user.id} schoolId={profile.school_id} />
          )}
        </div>

        {/* Quiz Builder */}
        <QuizBuilder classOptions={classOptions} quizzes={quizzes} onQuizzesChange={setQuizzes} />

        {/* Homework + Alerts */}
        <section className="grid gap-4 lg:grid-cols-2">
          <HomeworkForm classOptions={classOptions} onHomeworkPosted={handleDataRefresh} />
          <ClassAlertsForm classOptions={classOptions} onAlertSent={handleDataRefresh} />
        </section>
      </main>
    </div>
  );
}
