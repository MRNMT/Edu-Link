import { Quiz, QuizSubmissionAnswer } from "@/lib/localApi";
import {
  AlertCircle,
  CheckCircle2,
  Send,
} from "lucide-react";

export function QuizCard({
  quiz,
  selectedAnswers,
  onSelectAnswer,
  onSubmit,
  open,
  onToggle,
  submitting,
}: {
  quiz: Quiz;
  selectedAnswers: Record<string, string>;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  open: boolean;
  onToggle: () => void;
  submitting: boolean;
}) {
  const attempt = quiz.attempt;
  const completed = Boolean(attempt);
  const reviewByQuestion = new Map(
    (quiz.review?.items ?? []).map((item) => [item.question_id, item]),
  );

  return (
    <div className="panel-elevated overflow-hidden border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/30"
      >
        <div>
          <div className="font-semibold">{quiz.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {quiz.class_name} · {quiz.question_count} questions
          </div>
          {quiz.description && (
            <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>
          )}
        </div>
        <span className={`pill-status ${completed ? "pill-success" : "pill-info"}`}>
          {completed ? `Score ${attempt?.score}/${attempt?.total_questions}` : "Open"}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60 p-4">
          {completed ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Quiz completed
                </div>
                <p className="mt-2 text-xs text-success/80">
                  You scored {attempt?.score} out of {attempt?.total_questions}. Your answers were
                  saved.
                </p>
              </div>

              {quiz.review?.mode === "none" ? (
                <div className="rounded-lg border border-border bg-panel-elevated p-4 text-xs text-muted-foreground">
                  Your teacher has not enabled answer review for this quiz.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Review mode · {quiz.review?.mode.replace("_", " ")}
                  </div>
                  {quiz.questions.map((question, index) => {
                    const reviewItem = reviewByQuestion.get(question.id);
                    if (!reviewItem) return null;

                    const selectedOption = question.options.find(
                      (option) => option.id === reviewItem.selected_option_id,
                    );
                    const correctOption = question.options.find(
                      (option) => option.id === reviewItem.correct_option_id,
                    );

                    return (
                      <div
                        key={question.id}
                        className="rounded-lg border border-border bg-panel-elevated p-4"
                      >
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Question {index + 1}
                        </div>
                        <div className="mt-1 text-sm font-semibold">{question.prompt}</div>

                        {selectedOption && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Your answer:{" "}
                            <span className="text-foreground">{selectedOption.option_text}</span>
                          </div>
                        )}

                        {correctOption && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Correct answer:{" "}
                            <span className="text-success">{correctOption.option_text}</span>
                          </div>
                        )}

                        {typeof reviewItem.correct === "boolean" && (
                          <div
                            className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                              reviewItem.correct
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {reviewItem.correct ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {reviewItem.correct ? "Correct" : "Needs review"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {quiz.questions.map((question, questionIndex) => (
                <div
                  key={question.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Question {questionIndex + 1}
                  </div>
                  <h4 className="mt-2 text-base font-semibold">{question.prompt}</h4>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {question.options.map((option) => {
                      const selected = selectedAnswers[question.id] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onSelectAnswer(question.id, option.id)}
                          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-panel-elevated hover:border-primary/40"
                          }`}
                        >
                          {option.option_text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit quiz"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
