import { useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";

export default function TeacherAnnouncementsPage() {
  const [draft, setDraft] = useState({ class_name: "", title: "", message: "", priority: "medium" as any });
  const [saving, setSaving] = useState(false);

  const submitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await localApi.ops.teacher.sendClassAlert(draft);
      toast.success("Class alert sent");
      setDraft({ class_name: "", title: "", message: "", priority: "medium" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send class alert");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Announcements" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="panel p-5">
          <h3 className="text-lg font-semibold mb-3">Send class announcement</h3>
          <form onSubmit={submitAlert} className="space-y-3">
            <Input placeholder="Class name (e.g., 4A)" value={draft.class_name} onChange={(e) => setDraft((d) => ({ ...d, class_name: e.target.value }))} />
            <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            <Textarea rows={4} placeholder="Message" value={draft.message} onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))} />
            <div className="flex items-center gap-2">
              <select value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))} className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Send</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
