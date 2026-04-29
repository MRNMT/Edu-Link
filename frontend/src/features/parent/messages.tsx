import { useEffect, useState } from "react";
import { useAppSelector } from "@/store";
import { localApi, type ParentTeacherContact, type ParentTeacherMessage } from "@/lib/localApi";
import { ParentLayout } from "@/features/parent/layout";
import { toast } from "sonner";

export default function ParentMessagesPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [teachers, setTeachers] = useState<ParentTeacherContact[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [messages, setMessages] = useState<ParentTeacherMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");

  const loadTeachers = async () => {
    try {
      const rows = await localApi.ops.parent.teachers();
      setTeachers(rows);
      if (!selectedTeacherId && rows[0]) {
        setSelectedTeacherId(rows[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load teachers");
    }
  };

  const loadMessages = async (teacherId: string) => {
    if (!teacherId) {
      setMessages([]);
      return;
    }
    try {
      const rows = await localApi.ops.parent.messages(teacherId);
      setMessages(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load messages");
    }
  };

  useEffect(() => {
    void loadTeachers();
  }, []);

  useEffect(() => {
    void loadMessages(selectedTeacherId);
  }, [selectedTeacherId]);

  const submitMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTeacherId || !messageDraft.trim()) return;

    try {
      await localApi.ops.parent.sendMessage({
        teacher_id: selectedTeacherId,
        message: messageDraft.trim(),
      });
      setMessageDraft("");
      await loadMessages(selectedTeacherId);
      toast.success("Message sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    }
  };

  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null;

  return (
    <ParentLayout title="Messages">
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <section className="card rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-navy">Teachers</div>
          {teachers.length === 0 ? (
            <div className="text-xs text-navy/60">
              No linked teachers found yet. Teachers appear once they teach at least one of your
              children&apos;s classes.
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <button
                  key={`${teacher.id}-${teacher.class_name}`}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedTeacherId === teacher.id
                      ? "border-teal bg-teal/10 text-teal-dark"
                      : "border-border bg-slate-50 text-navy"
                  }`}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                >
                  <div className="font-semibold">{teacher.full_name}</div>
                  <div className="text-[11px] opacity-80">Class {teacher.class_name}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-bold text-navy">
            {selectedTeacher ? `Chat with ${selectedTeacher.full_name}` : "Messages"}
          </div>

          <div className="mb-3 max-h-80 space-y-2 overflow-auto rounded-lg border border-border bg-slate-50 p-3">
            {messages.length === 0 ? (
              <div className="text-sm text-navy/60">No messages yet.</div>
            ) : (
              messages.map((message) => {
                const mine = String(message.sender_id) === String(user?.id);
                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      mine
                        ? "ml-auto bg-teal text-white"
                        : "mr-auto border border-border bg-white text-navy"
                    }`}
                  >
                    <div>{message.message}</div>
                    <div className={`mt-1 text-[10px] ${mine ? "text-white/85" : "text-navy/60"}`}>
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={submitMessage} className="flex gap-2">
            <input
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-slate-50 p-2.5 text-sm text-navy outline-none focus:border-teal"
              placeholder="Write a message to teacher..."
              disabled={!selectedTeacherId}
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
              disabled={!selectedTeacherId || !messageDraft.trim()}
            >
              Send
            </button>
          </form>
        </section>
      </div>
    </ParentLayout>
  );
}
