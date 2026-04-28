import { useState } from "react";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

interface HomeworkFormProps {
  classOptions: string[];
  onHomeworkPosted: () => void;
}

export function HomeworkForm({ classOptions, onHomeworkPosted }: HomeworkFormProps) {
  const [draft, setDraft] = useState({
    class_name: "",
    title: "",
    description: "",
    due_date: "",
    attachment_url: "",
  });
  const [homeworkList, setHomeworkList] = useState<any[]>([]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.class_name.trim() || !draft.title.trim()) {
      toast.error("Class and title are required");
      return;
    }

    try {
      await localApi.ops.teacher.postHomework(draft);
      toast.success("Homework posted and parents notified");
      setDraft({
        class_name: "",
        title: "",
        description: "",
        due_date: "",
        attachment_url: "",
      });
      onHomeworkPosted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post homework");
    }
  };

  return (
    <div className="panel p-5">
      <h2 className="mb-3 text-lg font-semibold">Homework Posting</h2>
      <form onSubmit={submit} className="grid gap-2">
        <select
          value={draft.class_name}
          onChange={(e) => setDraft((d) => ({ ...d, class_name: e.target.value }))}
          className="rounded-md border border-border bg-input px-3 py-2"
        >
          <option value="">Select class...</option>
          {classOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border border-border bg-input px-3 py-2"
          placeholder="Title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        <textarea
          className="rounded-md border border-border bg-input px-3 py-2"
          rows={3}
          placeholder="Description"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="date"
            className="rounded-md border border-border bg-input px-3 py-2"
            value={draft.due_date}
            onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
          />
          <input
            className="rounded-md border border-border bg-input px-3 py-2"
            placeholder="Attachment URL"
            value={draft.attachment_url}
            onChange={(e) => setDraft((d) => ({ ...d, attachment_url: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground"
        >
          Post homework
        </button>
      </form>
    </div>
  );
}
