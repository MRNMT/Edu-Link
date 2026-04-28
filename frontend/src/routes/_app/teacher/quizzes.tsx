import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { localApi, type QuizSummary } from "@/lib/localApi";
import { toast } from "sonner";

function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const list = await localApi.quizzes.teacherList();
        setQuizzes(list);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Quizzes" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="panel p-5">
          <h3 className="text-lg font-semibold mb-3">Recent quizzes</h3>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading quizzes…</div>
          ) : quizzes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No quizzes posted yet.</div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((q) => (
                <div key={q.id} className="rounded-xl border border-border bg-panel-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{q.title}</div>
                      <div className="text-xs text-muted-foreground">{q.class_name} · Due {q.due_date ?? "—"}</div>
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

export const Route = createFileRoute("/_app/teacher/quizzes")({
  component: QuizzesPage,
});

export default Route;
