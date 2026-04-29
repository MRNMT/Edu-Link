import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localApi } from "@/lib/localApi";
import { toast } from "sonner";
import { AlertCircle, Plus, Trash2, X } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  class_name?: string;
  timestamp: string;
}

export default function TeacherParentNotificationsPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "1", type: "announcement", title: "Math Quiz Announcement", message: "Reminder: Quiz on fractions next Wednesday", class_name: "4A", timestamp: "2026-04-28T09:30:00" },
    { id: "2", type: "alert", title: "Attendance Alert", message: "Your child was absent today", class_name: "4A", timestamp: "2026-04-27T15:45:00" },
    { id: "3", type: "homework", title: "Homework Posted", message: "New homework assignment in Language Arts", class_name: "4B", timestamp: "2026-04-27T14:20:00" },
  ]);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [draft, setDraft] = useState({
    class_name: "",
    title: "",
    message: "",
    type: "announcement" as const,
  });

  const classOptions = Array.from(new Set(children.map((c) => c.class_name).filter(Boolean))).sort();

  useEffect(() => {
    const sid = profile?.school_id;
    if (!sid) return;
    void (async () => {
      try {
        const data = await localApi.children.schoolChildren(sid);
        setChildren(data);
      } catch (e) {
        console.error("Failed to load children", e);
      }
    })();
  }, [profile?.school_id]);

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.class_name.trim() || !draft.title.trim() || !draft.message.trim()) {
      toast.error("All fields are required");
      return;
    }
    try {
      setSaving(true);
      const newNotif: Notification = {
        id: Date.now().toString(),
        type: draft.type,
        title: draft.title,
        message: draft.message,
        class_name: draft.class_name,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
      toast.success("Notification sent to parents");
      setDraft({ class_name: "", title: "", message: "", type: "announcement" });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSaving(false);
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification deleted");
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Parent Notifications" subtitle="Teacher" />
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Parent Communication</h2>
          <button
            onClick={() => (showForm ? setShowForm(false) : setShowForm(true))}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Send Message
          </button>
        </div>

        {showForm && (
          <div className="panel p-6 space-y-4 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send Notification to Parents</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={sendNotification} className="space-y-4">
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
                <select
                  value={draft.type}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as any }))}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="announcement">Announcement</option>
                  <option value="alert">Alert</option>
                  <option value="homework">Homework</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <Input
                placeholder="Notification title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <Textarea
                placeholder="Message to parents"
                value={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                rows={4}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Sending..." : "Send Notification"}
              </button>
            </form>
          </div>
        )}

        <div className="panel p-6 space-y-4">
          <h3 className="text-lg font-semibold">{notifications.length} Notifications</h3>
          {notifications.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notifications sent yet.</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-auto">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-border p-4 hover:bg-muted/50 transition">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-muted-foreground flex-shrink-0">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{n.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {n.class_name && `Class ${n.class_name} · `}
                            {new Date(n.timestamp).toLocaleDateString()} at{" "}
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm text-foreground mt-2">{n.message}</div>
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
