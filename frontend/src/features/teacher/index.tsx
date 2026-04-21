import { useCallback, useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { QRScanner } from "@/components/QRScanner";
import { useAppDispatch, useAppSelector } from "@/store";
import { verifyToken, fetchSchoolTokens } from "@/store/slices/pickupSlice";
import {
  localApi,
  type Child,
  type QuizCreateQuestionInput,
  type QuizReviewMode,
  type QuizSummary,
} from "@/lib/localApi";
import { Check, X, ClipboardCheck, BookOpen, CalendarDays, ListChecks, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface DraftOption {
  text: string;
  is_correct: boolean;
}

interface DraftQuestion {
  prompt: string;
  options: DraftOption[];
}

interface DraftQuiz {
  title: string;
  description: string;
  class_name: string;
  due_date: string;
  review_mode: QuizReviewMode;
  questions: DraftQuestion[];
}

const REVIEW_MODE_OPTIONS: Array<{ value: QuizReviewMode; label: string; help: string }> = [
  { value: "none", label: "No answers", help: "Learners only see score." },
  { value: "wrong_only", label: "Wrong answers only", help: "Reveal mistakes and corrections." },
  { value: "correct_only", label: "Correct answers", help: "Reveal answer key only." },
  { value: "both", label: "Both", help: "Reveal selections and correct answers." },
];

const REVIEW_MODE_LABEL: Record<QuizReviewMode, string> = {
  none: "No answers",
  wrong_only: "Wrong only",
  correct_only: "Correct only",
  both: "Both",
};

function createDraftQuestion(): DraftQuestion {
  return {
    prompt: "",
    options: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  };
}

function createDraftQuiz(): DraftQuiz {
  return {
    title: "",
    description: "",
    class_name: "",
    due_date: "",
    review_mode: "none",
    questions: [createDraftQuestion()],
  };
}

export default function TeacherDashboard() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);
  const tokens = useAppSelector((s) => s.pickup.tokens);

  const [children, setChildren] = useState<Child[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [otp, setOtp] = useState("");
  const [lastVerdict, setLastVerdict] = useState<{ ok: boolean; msg: string } | null>(null);
  const [draft, setDraft] = useState<DraftQuiz>(() => createDraftQuiz());
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [homeworkDraft, setHomeworkDraft] = useState({ class_name: "", title: "", description: "", due_date: "", attachment_url: "" });
  const [alertDraft, setAlertDraft] = useState({ class_name: "", title: "", message: "", priority: "medium" as "low" | "medium" | "high" | "critical" });
  const [homeworkList, setHomeworkList] = useState<any[]>([]);

  const classOptions = Array.from(new Set(children.map((child) => child.class_name).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;

    void dispatch(fetchSchoolTokens(sid));

    (async () => {
      try {
        setLoadingQuizzes(true);
        const [schoolChildren, teacherQuizzes, postedHomework] = await Promise.all([
          localApi.children.schoolChildren(sid),
          localApi.quizzes.teacherList(),
          localApi.ops.teacher.listHomework(),
        ]);
        setChildren(schoolChildren);
        setQuizzes(teacherQuizzes);
        setHomeworkList(postedHomework);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load teacher data");
      } finally {
        setLoadingQuizzes(false);
      }
    })();
  }, [profile?.school_id, dispatch]);

  const submitAttendance = async () => {
    if (!user || !profile?.school_id) return;
    const entries = children.map((child) => ({
      child_id: child.id,
      status: present[child.id] ? "present" as const : "absent" as const,
    }));
    await localApi.ops.teacher.submitAttendanceBatch({
      attendance_date: new Date().toISOString().slice(0, 10),
      entries,
    });
    setSubmitted(true);
    toast.success("Attendance submitted", {
      description: `${entries.filter((entry) => entry.status === "present").length} of ${entries.length} present`,
    });
  };

  const submitHomework = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.teacher.postHomework(homeworkDraft);
      toast.success("Homework posted and parents notified");
      setHomeworkDraft({ class_name: "", title: "", description: "", due_date: "", attachment_url: "" });
      const postedHomework = await localApi.ops.teacher.listHomework();
      setHomeworkList(postedHomework);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post homework");
    }
  };

  const submitAlert = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.teacher.sendClassAlert(alertDraft);
      toast.success("Class alert sent");
      setAlertDraft({ class_name: "", title: "", message: "", priority: "medium" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send class alert");
    }
  };

  const handleScan = useCallback(
    async (code: string) => {
      if (!user || !profile?.school_id) return;
      const res = await dispatch(
        verifyToken({ code, userId: user.id, schoolId: profile.school_id, verdict: "approve" }) as any,
      );
      if (res.meta.requestStatus === "fulfilled") {
        const t = res.payload as { status: string; child?: { full_name: string } };
        if (t.status === "used") {
          setLastVerdict({ ok: true, msg: `✓ Pickup approved for ${t.child?.full_name ?? "child"}` });
          toast.success(`Approved · ${t.child?.full_name}`);
        } else {
          setLastVerdict({ ok: false, msg: `✗ Token ${t.status.toUpperCase()}` });
          toast.error(`Token ${t.status}`);
        }
      } else {
        setLastVerdict({ ok: false, msg: "✗ Token not found" });
        toast.error("Token not found");
      }
    },
    [dispatch, user, profile?.school_id],
  );

  const verifyOtp = async (verdict: "approve" | "reject") => {
    if (!user || !profile?.school_id || !otp) return;
    const res = await dispatch(
      verifyToken({ otp, userId: user.id, schoolId: profile.school_id, verdict }) as any,
    );
    if (res.meta.requestStatus === "fulfilled") {
      const t = res.payload as { status: string; child?: { full_name: string } };
      setLastVerdict({
        ok: t.status === "used",
        msg: t.status === "used" ? `✓ Approved ${t.child?.full_name}` : `✗ ${t.status.toUpperCase()}`,
      });
      toast[t.status === "used" ? "success" : "error"](`OTP ${t.status}`);
      setOtp("");
    } else {
      setLastVerdict({ ok: false, msg: "✗ Invalid OTP" });
      toast.error("Invalid OTP");
    }
  };

  const updateDraftQuestion = (questionIndex: number, patch: Partial<DraftQuestion>) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...patch } : question,
      ),
    }));
  };

  const updateDraftOption = (questionIndex: number, optionIndex: number, patch: Partial<DraftOption>) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, currentIndex) =>
            currentIndex === optionIndex ? { ...option, ...patch } : option,
          ),
        };
      }),
    }));
  };

  const markCorrectOption = (questionIndex: number, optionIndex: number) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, currentIndex) => ({
            ...option,
            is_correct: currentIndex === optionIndex,
          })),
        };
      }),
    }));
  };

  const addDraftQuestion = () => {
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, createDraftQuestion()],
    }));
  };

  const removeDraftQuestion = (questionIndex: number) => {
    setDraft((current) => {
      if (current.questions.length === 1) {
        return current;
      }

      return {
        ...current,
        questions: current.questions.filter((_, index) => index !== questionIndex),
      };
    });
  };

  const validateQuizDraft = () => {
    if (!draft.title.trim()) return "Quiz title is required";
    if (!draft.class_name.trim()) return "Class name is required";
    if (draft.questions.length === 0) return "Add at least one question";

    for (const [questionIndex, question] of draft.questions.entries()) {
      if (!question.prompt.trim()) {
        return `Question ${questionIndex + 1} needs a prompt`;
      }

      const nonEmptyOptions = question.options.filter((option) => option.text.trim().length > 0);
      if (nonEmptyOptions.length < 2) {
        return `Question ${questionIndex + 1} needs at least two answer choices`;
      }

      const correctChoices = question.options.filter((option) => option.is_correct);
      if (correctChoices.length !== 1) {
        return `Question ${questionIndex + 1} needs exactly one correct answer`;
      }
    }

    return null;
  };

  const resetQuizDraft = () => {
    setEditingQuizId(null);
    setDraft(createDraftQuiz());
  };

  const startEditQuiz = async (quizId: string) => {
    try {
      setSavingQuiz(true);
      const detail = await localApi.quizzes.teacherDetail(quizId);
      const mappedQuestions = detail.questions
        .slice()
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((question) => ({
          prompt: question.prompt,
          options: question.options
            .slice()
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((option) => ({ text: option.option_text, is_correct: option.is_correct })),
        }));

      setEditingQuizId(detail.id);
      setDraft({
        title: detail.title,
        description: detail.description ?? "",
        class_name: detail.class_name,
        due_date: detail.due_date ?? "",
        review_mode: detail.review_mode,
        questions: mappedQuestions.length > 0 ? mappedQuestions : [createDraftQuestion()],
      });
      toast.success("Quiz loaded for editing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load quiz details");
    } finally {
      setSavingQuiz(false);
    }
  };

  const submitQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateQuizDraft();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSavingQuiz(true);
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        class_name: draft.class_name.trim(),
        due_date: draft.due_date || null,
        review_mode: draft.review_mode,
        questions: draft.questions.map((question): QuizCreateQuestionInput => ({
          prompt: question.prompt.trim(),
          options: question.options
            .filter((option) => option.text.trim().length > 0)
            .map((option) => ({
              text: option.text.trim(),
              is_correct: option.is_correct,
            })),
        })),
      };

      const saved = editingQuizId
        ? await localApi.quizzes.update(editingQuizId, payload)
        : await localApi.quizzes.create(payload);

      setQuizzes((current) => {
        if (editingQuizId) {
          return current.map((quiz) => (quiz.id === saved.id ? saved : quiz));
        }
        return [saved, ...current];
      });

      resetQuizDraft();
      toast.success(editingQuizId ? `Quiz updated for ${saved.class_name}` : `Quiz posted for ${saved.class_name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create quiz");
    } finally {
      setSavingQuiz(false);
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Teacher Console" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel p-5">
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
                    present[child.id]
                      ? "border-success/40 bg-success/5"
                      : "border-border bg-panel-elevated"
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
                    onChange={(event) => setPresent((current) => ({ ...current, [child.id]: event.target.checked }))}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={submitAttendance}
              disabled={submitted}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <ClipboardCheck className="h-4 w-4" />
              Submit attendance
            </button>
          </section>

          <section className="space-y-4">
            <QRScanner onScan={handleScan} />
            <div className="panel p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                OTP fallback
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={() => verifyOtp("approve")}
                  className="rounded-md bg-success px-4 text-success-foreground transition hover:bg-success/90"
                  aria-label="Approve"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={() => verifyOtp("reject")}
                  className="rounded-md bg-destructive px-4 text-destructive-foreground transition hover:bg-destructive/90"
                  aria-label="Reject"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {lastVerdict && (
                <div
                  className={`mt-3 rounded-md border px-3 py-2 font-mono text-xs ${
                    lastVerdict.ok
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-destructive/40 bg-destructive/10 text-destructive"
                  }`}
                >
                  {lastVerdict.msg}
                </div>
              )}
            </div>
            <div className="panel p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Recent gate activity
              </div>
              <div className="space-y-1 text-xs">
                {tokens.slice(0, 6).map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0"
                  >
                    <span className="font-mono text-muted-foreground">
                      {new Date(token.created_at).toLocaleTimeString()}
                    </span>
                    <span className={token.status === "used" ? "text-success" : "text-muted-foreground"}>
                      {token.child?.full_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{editingQuizId ? "Edit Quiz" : "Quiz Builder"}</h2>
              <p className="text-xs text-muted-foreground">
                Create or edit multiple-choice quizzes and control what learners can review after submitting.
              </p>
            </div>
            <span className="pill-status pill-info">{quizzes.length} posted</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={submitQuiz} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Quiz title
                  </div>
                  <Input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Math warm-up"
                  />
                </label>
                <label className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Class name
                  </div>
                  <Input
                    list="teacher-class-options"
                    value={draft.class_name}
                    onChange={(event) => setDraft((current) => ({ ...current, class_name: event.target.value }))}
                    placeholder="4A"
                  />
                  <datalist id="teacher-class-options">
                    {classOptions.map((className) => (
                      <option key={className} value={className} />
                    ))}
                  </datalist>
                </label>
              </div>

              {classOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {classOptions.map((className) => (
                    <button
                      key={className}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, class_name: className }))}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        draft.class_name === className
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-panel-elevated text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {className}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Due date
                  </div>
                  <Input
                    type="date"
                    value={draft.due_date}
                    onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value }))}
                  />
                </label>
                <label className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Answer review access
                  </div>
                  <select
                    value={draft.review_mode}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, review_mode: event.target.value as QuizReviewMode }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  >
                    {REVIEW_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {REVIEW_MODE_OPTIONS.find((option) => option.value === draft.review_mode)?.help}
                  </p>
                </label>
                <label className="space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Description
                  </div>
                  <Textarea
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Optional quiz instructions or context"
                    rows={3}
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Questions
                    </div>
                    <div className="text-sm text-muted-foreground">Mark one answer as correct for each question.</div>
                  </div>
                  <button
                    type="button"
                    onClick={addDraftQuestion}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-panel-elevated px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add question
                  </button>
                </div>

                <div className="space-y-4">
                  {draft.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="rounded-xl border border-border bg-panel-elevated p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Question {questionIndex + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraftQuestion(questionIndex)}
                          disabled={draft.questions.length === 1}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>

                      <div className="mt-3 space-y-3">
                        <Input
                          value={question.prompt}
                          onChange={(event) => updateDraftQuestion(questionIndex, { prompt: event.target.value })}
                          placeholder="What is 2 + 2?"
                        />

                        <div className="grid gap-2 md:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="rounded-lg border border-border bg-background p-3">
                              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                Option {optionIndex + 1}
                              </div>
                              <Input
                                value={option.text}
                                onChange={(event) =>
                                  updateDraftOption(questionIndex, optionIndex, { text: event.target.value })
                                }
                                placeholder={`Answer ${optionIndex + 1}`}
                                className="mt-2"
                              />
                              <button
                                type="button"
                                onClick={() => markCorrectOption(questionIndex, optionIndex)}
                                className={`mt-2 inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                                  option.is_correct
                                    ? "bg-success/10 text-success"
                                    : "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                }`}
                              >
                                <ListChecks className="h-3.5 w-3.5" />
                                {option.is_correct ? "Correct answer" : "Mark correct"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingQuiz}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                <BookOpen className="h-4 w-4" />
                {savingQuiz ? "Saving quiz…" : editingQuizId ? "Save changes" : "Post quiz"}
              </button>
              {editingQuizId && (
                <button
                  type="button"
                  onClick={resetQuizDraft}
                  className="ml-2 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-panel-elevated px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  Cancel edit
                </button>
              )}
            </form>

            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Learner visibility
                </div>
                <div className="mt-2 text-sm font-medium">Quizzes appear in child mode for matching class names.</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Learners see the quiz as soon as it is posted and can answer it from the restricted device view.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Recent quizzes</h3>
                </div>

                {loadingQuizzes ? (
                  <div className="rounded-xl border border-border bg-panel-elevated p-4 text-sm text-muted-foreground">
                    Loading quizzes…
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="rounded-xl border border-border bg-panel-elevated p-4 text-sm text-muted-foreground">
                    No quizzes posted yet.
                  </div>
                ) : (
                  quizzes.map((quiz) => (
                    <div key={quiz.id} className="rounded-xl border border-border bg-panel-elevated p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{quiz.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {quiz.class_name} · {quiz.question_count} questions
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="pill-status pill-info">{quiz.attempt_count} attempts</span>
                          <button
                            type="button"
                            disabled={savingQuiz}
                            onClick={() => void startEditQuiz(quiz.id)}
                            className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      {quiz.description && <p className="mt-3 text-sm text-muted-foreground">{quiz.description}</p>}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Due {quiz.due_date || "not set"}</span>
                        <span>{REVIEW_MODE_LABEL[quiz.review_mode]}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Homework Posting</h2>
            <form onSubmit={submitHomework} className="grid gap-2">
              <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Class" value={homeworkDraft.class_name} onChange={(e) => setHomeworkDraft((d) => ({ ...d, class_name: e.target.value }))} />
              <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Title" value={homeworkDraft.title} onChange={(e) => setHomeworkDraft((d) => ({ ...d, title: e.target.value }))} />
              <textarea className="rounded-md border border-border bg-input px-3 py-2" rows={3} placeholder="Description" value={homeworkDraft.description} onChange={(e) => setHomeworkDraft((d) => ({ ...d, description: e.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="date" className="rounded-md border border-border bg-input px-3 py-2" value={homeworkDraft.due_date} onChange={(e) => setHomeworkDraft((d) => ({ ...d, due_date: e.target.value }))} />
                <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Attachment URL" value={homeworkDraft.attachment_url} onChange={(e) => setHomeworkDraft((d) => ({ ...d, attachment_url: e.target.value }))} />
              </div>
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground">Post homework</button>
            </form>
            <div className="mt-4 max-h-40 space-y-2 overflow-auto text-sm">
              {homeworkList.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-panel-elevated p-2">
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.class_name} · Reads {item.read_count ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Class Alerts</h2>
            <form onSubmit={submitAlert} className="grid gap-2">
              <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Class" value={alertDraft.class_name} onChange={(e) => setAlertDraft((d) => ({ ...d, class_name: e.target.value }))} />
              <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Alert title" value={alertDraft.title} onChange={(e) => setAlertDraft((d) => ({ ...d, title: e.target.value }))} />
              <textarea className="rounded-md border border-border bg-input px-3 py-2" rows={4} placeholder="Message" value={alertDraft.message} onChange={(e) => setAlertDraft((d) => ({ ...d, message: e.target.value }))} />
              <select className="rounded-md border border-border bg-input px-3 py-2" value={alertDraft.priority} onChange={(e) => setAlertDraft((d) => ({ ...d, priority: e.target.value as "low" | "medium" | "high" | "critical" }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <button type="submit" className="rounded-md bg-warning px-4 py-2 text-xs font-semibold uppercase tracking-wider text-warning-foreground">Broadcast alert</button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
