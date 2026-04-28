import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppDispatch, useAppSelector } from "@/store";
import { exitChildModeThunk } from "@/store/slices/childModeSlice";
import { localApi, type Quiz, type QuizSubmissionAnswer } from "@/lib/localApi";
import { BookOpen, Lock, LogOut, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { QuizCard } from "./QuizCard";

export default function ChildModeDashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const childMode = useAppSelector((s) => s.childMode);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [openQuizId, setOpenQuizId] = useState<string | null>(null);
  const [answersByQuiz, setAnswersByQuiz] = useState<Record<string, Record<string, string>>>({});
  const [submittingQuizId, setSubmittingQuizId] = useState<string | null>(null);

  useEffect(() => {
    const childId = childMode.activeChildId;
    if (!childId) {
      setQuizzes([]);
      setOpenQuizId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingQuizzes(true);
        const payload = await localApi.quizzes.forChild(childId);
        if (cancelled) return;
        setQuizzes(payload.quizzes);
        setOpenQuizId(payload.quizzes[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          toast.error(loadError instanceof Error ? loadError.message : "Failed to load quizzes");
        }
      } finally {
        if (!cancelled) {
          setLoadingQuizzes(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childMode.activeChildId]);

  const handleExit = async () => {
    if (!password) {
      setError("Password required");
      return;
    }
    const res = await dispatch(exitChildModeThunk(password));
    if (res.meta.requestStatus === "fulfilled") {
      void navigate({ to: "/parent" });
    } else {
      setError("Incorrect password");
    }
  };

  const selectQuizAnswer = (quizId: string, questionId: string, optionId: string) => {
    setAnswersByQuiz((current) => ({
      ...current,
      [quizId]: {
        ...(current[quizId] ?? {}),
        [questionId]: optionId,
      },
    }));
  };

  const submitQuiz = async (quiz: Quiz) => {
    const childId = childMode.activeChildId;
    if (!childId) {
      toast.error("Child session missing");
      return;
    }

    const selectedAnswers = answersByQuiz[quiz.id] ?? {};
    const unanswered = quiz.questions.find((question) => !selectedAnswers[question.id]);
    if (unanswered) {
      toast.error("Answer every question before submitting");
      return;
    }

    const submission: QuizSubmissionAnswer[] = quiz.questions.map((question) => ({
      question_id: question.id,
      option_id: selectedAnswers[question.id],
    }));

    try {
      setSubmittingQuizId(quiz.id);
      const result = await localApi.quizzes.submit(childId, quiz.id, submission);
      setQuizzes((current) =>
        current.map((currentQuiz) =>
          currentQuiz.id === quiz.id
            ? {
                ...currentQuiz,
                attempt: result,
              }
            : currentQuiz,
        ),
      );
      toast.success(`Quiz submitted · ${result.score}/${result.total_questions}`);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Failed to submit quiz");
    } finally {
      setSubmittingQuizId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Child Mode Active" subtitle="Learner" />

      <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <div className="panel p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // KID-SAFE VIEW
          </div>
          <h1 className="mt-2 text-3xl font-bold">My homework and quizzes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only homework, class messages, and teacher quizzes are visible here.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Teacher quizzes</h2>
            <span className="pill-status pill-info">{quizzes.length} available</span>
          </div>

          {loadingQuizzes ? (
            <div className="panel-elevated p-4 text-sm text-muted-foreground">Loading quizzes…</div>
          ) : quizzes.length === 0 ? (
            <div className="panel-elevated p-4 text-sm text-muted-foreground">
              No quizzes posted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  selectedAnswers={answersByQuiz[quiz.id] ?? {}}
                  onSelectAnswer={(questionId, optionId) =>
                    selectQuizAnswer(quiz.id, questionId, optionId)
                  }
                  onSubmit={() => void submitQuiz(quiz)}
                  open={openQuizId === quiz.id}
                  onToggle={() =>
                    setOpenQuizId((current) => (current === quiz.id ? null : quiz.id))
                  }
                  submitting={submittingQuizId === quiz.id}
                />
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { subject: "Math", title: "Worksheet pg. 24", due: "Tomorrow" },
            { subject: "Science", title: "Plant cell drawing", due: "Friday" },
            { subject: "English", title: "Read chapter 3", due: "Monday" },
            { subject: "Art", title: "Bring a leaf", due: "Wed" },
          ].map((h, i) => (
            <div key={i} className="panel-elevated flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {h.subject}
                </div>
                <div className="mt-0.5 font-semibold">{h.title}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="pill-status pill-warning">Due · {h.due}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3 w-3" /> Mark done
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {error && (
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-lg border border-border bg-panel-elevated p-6">
          <div className="mb-4 flex justify-center">
            <Lock className="h-16 w-16 text-foreground/40" />
          </div>

          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter parental password"
              className="w-full rounded-md border border-border bg-input px-4 py-2.5 text-center font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleExit}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
            >
              <LogOut className="h-4 w-4" />
              Unlock device
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          This session: {childMode.activeChildId}
        </p>
      </div>
    </div>
  );
}
