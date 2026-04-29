import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi, type QuizSummary, type QuizCreateQuestionInput } from "@/lib/localApi";
import { toast } from "sonner";
import { Edit2, Trash2, Plus } from "lucide-react";
import { QuizForm, DraftQuiz, createDraftQuiz } from "./quiz-form";

export default function TeacherQuizzesPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftQuiz>(createDraftQuiz());
  const [children, setChildren] = useState<any[]>([]);

  const classOptions = Array.from(new Set(children.map((c) => c.class_name).filter(Boolean))).sort();

  useEffect(() => {
    void loadQuizzes();
    if (profile?.school_id) {
      void (async () => {
        try {
          const data = await localApi.children.schoolChildren(profile.school_id);
          setChildren(data);
        } catch (e) {
          console.error("Failed to load children", e);
        }
      })();
    }
  }, [profile?.school_id]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const list = await localApi.quizzes.teacherList();
      setQuizzes(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const validateDraft = (): string | null => {
    if (!draft.title.trim()) return "Title required";
    if (!draft.class_name.trim()) return "Class name required";
    if (draft.questions.length === 0) return "Add at least one question";
    for (const [i, q] of draft.questions.entries()) {
      if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt`;
      const nonEmpty = q.options.filter((o) => o.text.trim().length > 0);
      if (nonEmpty.length < 2) return `Question ${i + 1} needs at least 2 options`;
      if (!nonEmpty.some((o) => o.is_correct)) return `Question ${i + 1} needs a correct answer`;
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateDraft();
    if (error) {
      toast.error(error);
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        class_name: draft.class_name.trim(),
        due_date: draft.due_date || null,
        review_mode: draft.review_mode,
        questions: draft.questions.map((q): QuizCreateQuestionInput => ({
          prompt: q.prompt.trim(),
          options: q.options
            .filter((o) => o.text.trim())
            .map((o) => ({ text: o.text.trim(), is_correct: o.is_correct })),
        })),
      };
      const saved = editingId
        ? await localApi.quizzes.update(editingId, payload)
        : await localApi.quizzes.create(payload);
      setQuizzes((prev) => (editingId ? prev.map((q) => (q.id === saved.id ? saved : q)) : [saved, ...prev]));
      toast.success(editingId ? "Quiz updated" : "Quiz created");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quiz?")) return;
    try {
      await localApi.quizzes.delete(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success("Quiz deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleEdit = async (id: string) => {
    try {
      setSaving(true);
      const detail = await localApi.quizzes.teacherDetail(id);
      const mappedQuestions = detail.questions
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((q) => ({
          prompt: q.prompt,
          options: q.options
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((o) => ({ text: o.option_text, is_correct: o.is_correct })),
        }));
      setEditingId(id);
      setDraft({
        title: detail.title,
        description: detail.description ?? "",
        class_name: detail.class_name,
        due_date: detail.due_date ?? "",
        review_mode: detail.review_mode,
        questions: mappedQuestions,
      });
      setShowForm(true);
    } catch {
      toast.error("Failed to load quiz");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDraft(createDraftQuiz());
    setShowForm(false);
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Quizzes" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Manage Quizzes</h2>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New Quiz
          </button>
        </div>

        {showForm && (
          <QuizForm
            draft={draft}
            editingId={editingId}
            saving={saving}
            classOptions={classOptions}
            onDraftChange={setDraft}
            onSave={handleSave}
            onCancel={resetForm}
          />
        )}

        <div className="grid gap-4">
          <h3 className="text-lg font-semibold">{quizzes.length} Quizzes</h3>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : quizzes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No quizzes yet. Create one to get started!</div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((q) => (
                <div key={q.id} className="rounded-lg border border-border p-4 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{q.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {q.class_name} · {q.question_count} questions · Due {q.due_date ?? "—"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => void handleEdit(q.id)}
                        className="p-2 hover:bg-primary/10 rounded transition"
                      >
                        <Edit2 className="h-4 w-4 text-primary" />
                      </button>
                      <button
                        onClick={() => void handleDelete(q.id)}
                        className="p-2 hover:bg-destructive/10 rounded transition"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
