import { useState } from "react";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

interface ClassAlertsFormProps {
  classOptions: string[];
  onAlertSent: () => void;
}

export function ClassAlertsForm({ classOptions, onAlertSent }: ClassAlertsFormProps) {
  const [draft, setDraft] = useState({
    class_name: "",
    title: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await localApi.ops.teacher.sendClassAlert(draft);
      toast.success("Class alert sent");
      setDraft({ class_name: "", title: "", message: "", priority: "medium" });
      onAlertSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send class alert");
    }
  };

  return (
    <div className="panel p-5">
      <h2 className="mb-3 text-lg font-semibold">Class Alerts</h2>
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
          placeholder="Alert title"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        <textarea
          className="rounded-md border border-border bg-input px-3 py-2"
          rows={4}
          placeholder="Message"
          value={draft.message}
          onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
        />
        <select
          className="rounded-md border border-border bg-input px-3 py-2"
          value={draft.priority}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              priority: e.target.value as "low" | "medium" | "high" | "critical",
            }))
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-warning px-4 py-2 text-xs font-semibold uppercase tracking-wider text-warning-foreground"
        >
          Broadcast alert
        </button>
      </form>
    </div>
  );
}
