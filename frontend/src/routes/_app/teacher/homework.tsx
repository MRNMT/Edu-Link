import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi } from "@/lib/localApi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function HomeworkPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({ class_name: "", title: "", description: "", due_date: "", attachment_url: "" });

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void (async () => {
      try {
        setLoading(true);
        const postedHomework = await localApi.ops.teacher.listHomework();
        setHomeworkList(postedHomework);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load homework");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.school_id]);

  const submitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await localApi.ops.teacher.postHomework(draft);
      toast.success("Homework posted and parents notified");
      setDraft({ class_name: "", title: "", description: "", due_date: "", attachment_url: "" });
      const postedHomework = await localApi.ops.teacher.listHomework();
      setHomeworkList(postedHomework);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post homework");
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Homework" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel p-5">
            <h3 className="text-lg font-semibold mb-3">Post Homework</h3>
            <form onSubmit={submitHomework} className="space-y-3">
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">Class name</div>
                <Input value={draft.class_name} onChange={(e) => setDraft((d) => ({ ...d, class_name: e.target.value }))} />
              </label>
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">Title</div>
                <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
              </label>
              <label className="space-y-1">
                <div className="text-xs text-muted-foreground">Description</div>
                <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={4} />
              </label>
              <div className="flex gap-2">
                <Input type="date" value={draft.due_date} onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))} />
                <Input placeholder="Attachment URL (optional)" value={draft.attachment_url} onChange={(e) => setDraft((d) => ({ ...d, attachment_url: e.target.value }))} />
              </div>
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Post homework</button>
            </form>
          </section>

          <section className="panel p-5">
            <h3 className="text-lg font-semibold mb-3">Recent Homework</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : homeworkList.length === 0 ? (
              <div className="text-sm text-muted-foreground">No homework posted yet.</div>
            ) : (
              <div className="space-y-3">
                {homeworkList.map((h) => (
                  <div key={h.id} className="rounded-md border border-border p-3">
                    <div className="font-medium">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{h.class_name} · Due {h.due_date}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/_app/teacher/homework")({
  component: HomeworkPage,
});

export default Route;
