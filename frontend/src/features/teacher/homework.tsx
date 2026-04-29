import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi } from "@/lib/localApi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export default function TeacherHomeworkPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [draft, setDraft] = useState({
    class_name: "",
    title: "",
    description: "",
    due_date: "",
    attachment_url: "",
  });

  const classOptions = assignedClasses;

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void loadHomework();
    void (async () => {
      try {
        const [data, teacherClassRows] = await Promise.all([
          localApi.children.schoolChildren(sid),
          localApi.ops.teacher.classes(),
        ]);
        setChildren(data);
        setAssignedClasses(teacherClassRows.map((entry) => entry.class_name));
      } catch (e) {
        console.error("Failed to load children", e);
      }
    })();
  }, [profile?.school_id]);

  const loadHomework = async () => {
    try {
      setLoading(true);
      const postedHomework = await localApi.ops.teacher.listHomework();
      setHomeworkList(postedHomework);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load homework");
    } finally {
      setLoading(false);
    }
  };

  const submitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.class_name.trim() || !draft.title.trim()) {
      toast.error("Class and title are required");
      return;
    }
    try {
      setSaving(true);
      await localApi.ops.teacher.postHomework(draft);
      toast.success("Homework posted and parents notified");
      setDraft({ class_name: "", title: "", description: "", due_date: "", attachment_url: "" });
      setShowForm(false);
      await loadHomework();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post homework");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Homework" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Homework</h2>
          <button
            onClick={() => (showForm ? setShowForm(false) : setShowForm(true))}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Post Homework
          </button>
        </div>

        {showForm && (
          <div className="panel p-6 space-y-4 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Post New Homework</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitHomework} className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={draft.class_name}
                  onChange={(e) => setDraft((d) => ({ ...d, class_name: e.target.value }))}
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
                  onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                  className="h-9 rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <Input
                placeholder="Homework title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <Textarea
                placeholder="Description"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={3}
              />
              <Input
                placeholder="Attachment URL (optional)"
                value={draft.attachment_url}
                onChange={(e) => setDraft((d) => ({ ...d, attachment_url: e.target.value }))}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Posting..." : "Post Homework"}
              </button>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          <h3 className="text-lg font-semibold">{homeworkList.length} Assignments</h3>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : homeworkList.length === 0 ? (
            <div className="text-sm text-muted-foreground">No homework posted yet.</div>
          ) : (
            <div className="space-y-3">
              {homeworkList.map((hw) => (
                <div key={hw.id} className="rounded-lg border border-border p-4 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{hw.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {hw.class_name} · {hw.read_count || 0} parents read · Due {hw.due_date ?? "-"}
                      </p>
                      {hw.description && <p className="text-sm text-foreground mt-2">{hw.description}</p>}
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
