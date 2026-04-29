import { useEffect, useState } from "react";
import { localApi, type NotificationItem } from "@/lib/localApi";
import { ParentLayout } from "@/features/parent/layout";
import { toast } from "sonner";

export default function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await localApi.ops.parent.notifications();
        setNotifications(rows);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load notifications");
      }
    })();
  }, []);

  return (
    <ParentLayout title="All Notifications">
      <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-4 text-sm font-bold text-navy">All Notifications</div>
        {notifications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
            No notifications found.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-navy">{item.title}</div>
                    <div className="text-xs text-navy/60">
                      {item.category} · {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!item.read_at && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      New
                    </span>
                  )}
                </div>
                {item.body && <div className="mt-2 text-sm text-navy/80">{item.body}</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </ParentLayout>
  );
}
