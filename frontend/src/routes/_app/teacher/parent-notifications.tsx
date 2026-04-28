import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { AlertCircle } from "lucide-react";

function ParentNotificationsPage() {
  const [notifications] = useState<Array<{ id: string; type: string; title: string; message: string; timestamp: string }>>([
    { id: "1", type: "announcement", title: "Math Quiz Announcement", message: "Reminder: Quiz on fractions next Wednesday", timestamp: "2026-04-28T09:30:00" },
    { id: "2", type: "alert", title: "Attendance Alert", message: "Your child was absent today", timestamp: "2026-04-27T15:45:00" },
    { id: "3", type: "homework", title: "Homework Posted", message: "New homework assignment in Language Arts", timestamp: "2026-04-27T14:20:00" },
  ]);

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Parent Notifications" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="panel p-5">
          <h3 className="text-lg font-semibold mb-3">Sent notifications</h3>
          {notifications.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notifications sent yet.</div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-panel-elevated p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-sm text-muted-foreground">{n.message}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.timestamp).toLocaleDateString()} at {new Date(n.timestamp).toLocaleTimeString()}
                      </div>
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

export const Route = createFileRoute("/_app/teacher/parent-notifications")({
  component: ParentNotificationsPage,
});

export default Route;
