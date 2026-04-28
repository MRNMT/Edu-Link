import { useEffect, useState } from "react";
import { localApi, type HomeworkItem } from "@/lib/localApi";
import { ParentLayout } from "@/features/parent/layout";
import { toast } from "sonner";

export default function ParentHomeworkPage() {
  const [homework, setHomework] = useState<HomeworkItem[]>([]);

  const load = async () => {
    try {
      const rows = await localApi.ops.parent.homeworkFeed();
      setHomework(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load homework");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markRead = async (id: string) => {
    try {
      await localApi.ops.parent.markHomeworkRead(id);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark homework");
    }
  };

  return (
    <ParentLayout title="Homework Updates">
      <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 text-sm font-bold text-navy">Homework Notifications</div>
        {homework.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
            No homework updates yet.
          </div>
        ) : (
          <div className="space-y-2">
            {homework.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-navy">{item.title}</div>
                    <div className="text-xs text-navy/60">
                      {item.class_name} · Due {item.due_date || "N/A"}
                    </div>
                  </div>
                  {!item.read_at && (
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground"
                      onClick={() => void markRead(item.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
                {item.description && <div className="mt-2 text-sm text-navy/80">{item.description}</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </ParentLayout>
  );
}
