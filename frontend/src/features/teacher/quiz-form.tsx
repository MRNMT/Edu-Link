import { useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { localApi, type QuizReviewMode } from "@/lib/localApi";

interface DraftOption {
  text: string;
  is_correct: boolean;
}

interface DraftQuestion {
  prompt: string;
  options: DraftOption[];
}

export interface DraftQuiz {
  title: string;
  description: string;
  class_name: string;
  due_date: string;
  review_mode: QuizReviewMode;
  questions: DraftQuestion[];
}

const REVIEW_MODE_OPTIONS: Array<{ value: QuizReviewMode; label: string }> = [
  { value: "none", label: "No answers" },
  { value: "wrong_only", label: "Wrong only" },
  { value: "correct_only", label: "Correct only" },
  { value: "both", label: "Both" },
];

interface QuestionEditorProps {
  question: DraftQuestion;
  index: number;
  onlyOne: boolean;
  onUpdate: (patch: Partial<DraftQuestion>) => void;
  onOptionChange: (oIdx: number, patch: Partial<DraftOption>) => void;
  onMarkCorrect: (oIdx: number) => void;
  onDelete: () => void;
}

export function QuestionEditor({
  question,
  index,
  onlyOne,
  onUpdate,
  onOptionChange,
  onMarkCorrect,
  onDelete,
}: QuestionEditorProps) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex items-start justify-between gap-2">
        <textarea
          value={question.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder={`Question ${index + 1}`}
          className="flex-1 min-h-8 rounded border border-input bg-transparent px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={onDelete}
          disabled={onlyOne}
          className="text-destructive hover:bg-destructive/10 p-1 rounded disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {question.options.map((o, oIdx) => (
          <div key={oIdx} className="flex items-center gap-2">
            <input
              type="radio"
              checked={o.is_correct}
              onChange={() => onMarkCorrect(oIdx)}
              name={`question-${index}`}
              className="h-4 w-4"
            />
            <input
              type="text"
              value={o.text}
              onChange={(e) => onOptionChange(oIdx, { text: e.target.value })}
              placeholder={`Option ${oIdx + 1}`}
              className="flex-1 h-8 rounded border border-input bg-transparent px-2 py-1 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function createDraftQuestion(): DraftQuestion {
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

export function createDraftQuiz(): DraftQuiz {
  return {
    title: "",
    description: "",
    class_name: "",
    due_date: "",
    review_mode: "none",
    questions: [createDraftQuestion()],
  };
}

interface QuizFormProps {
  draft: DraftQuiz;
  editingId: string | null;
  saving: boolean;
  classOptions: string[];
  onDraftChange: (draft: DraftQuiz) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function QuizForm({
  draft,
  editingId,
  saving,
  classOptions,
  onDraftChange,
  onSave,
  onCancel,
}: QuizFormProps) {
  const updateQuestion = (i: number, patch: Partial<DraftQuestion>) => {
    onDraftChange({
      ...draft,
      questions: draft.questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    });
  };

  const updateOption = (qIdx: number, oIdx: number, patch: Partial<DraftOption>) => {
    onDraftChange({
      ...draft,
      questions: draft.questions.map((q, qi) =>
        qi === qIdx
          ? { ...q, options: q.options.map((o, oi) => (oi === oIdx ? { ...o, ...patch } : o)) }
          : q,
      ),
    });
  };

  const markCorrect = (qIdx: number, oIdx: number) => {
    onDraftChange({
      ...draft,
      questions: draft.questions.map((q, qi) =>
        qi === qIdx
          ? { ...q, options: q.options.map((o, oi) => ({ ...o, is_correct: oi === oIdx })) }
          : q,
      ),
    });
  };

  return (
    <div className="panel p-6 space-y-4 border-2 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{editingId ? "Edit Quiz" : "Create Quiz"}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={onSave} className="space-y-4">
        <Input
          placeholder="Quiz title"
          value={draft.title}
          onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
        />
        <Textarea
          placeholder="Description (optional)"
          value={draft.description}
          onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
          rows={2}
        />
        <div className="flex gap-2">
          <select
            value={draft.class_name}
            onChange={(e) => onDraftChange({ ...draft, class_name: e.target.value })}
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select class...</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={draft.due_date}
            onChange={(e) => onDraftChange({ ...draft, due_date: e.target.value })}
            className="h-9 rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>
        <select
          value={draft.review_mode}
          onChange={(e) => onDraftChange({ ...draft, review_mode: e.target.value as QuizReviewMode })}
          className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          {REVIEW_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold">Questions ({draft.questions.length})</h4>
          {draft.questions.map((q, qIdx) => (
            <QuestionEditor
              key={qIdx}
              question={q}
              index={qIdx}
              onlyOne={draft.questions.length === 1}
              onUpdate={(patch) => updateQuestion(qIdx, patch)}
              onOptionChange={(oIdx, patch) => updateOption(qIdx, oIdx, patch)}
              onMarkCorrect={(oIdx) => markCorrect(qIdx, oIdx)}
              onDelete={() => onDraftChange({ ...draft, questions: draft.questions.filter((_, i) => i !== qIdx) })}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              onDraftChange({ ...draft, questions: [...draft.questions, createDraftQuestion()] })
            }
            className="text-sm text-primary hover:underline"
          >
            + Add question
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving..." : editingId ? "Update Quiz" : "Create Quiz"}
        </button>
      </form>
    </div>
  );
}
