import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { PickupTokenCard } from "@/components/PickupTokenCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store";
import { localApi } from "@/lib/localApi";
import { fetchMyTokens, generatePickupToken } from "@/store/slices/pickupSlice";
import { enterChildModeThunk } from "@/store/slices/childModeSlice";
import { Baby, QrCode, AlertOctagon, Users, Bell, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Child {
  id: string;
  full_name: string;
  class_name: string;
  grade: string;
}

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
  tone?: "primary" | "default";
}

function ActionCard({ icon, label, description, onClick, tone = "default" }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`panel-elevated flex flex-col items-start gap-2 p-4 text-left transition hover:border-primary/50 ${
        tone === "primary" ? "border-primary/20 bg-primary/5" : ""
      }`}
    >
      <div className={tone === "primary" ? "text-primary" : "text-muted-foreground"}>{icon}</div>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

function ParentDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);
  const tokens = useAppSelector((s) => s.pickup.tokens);
  const generating = useAppSelector((s) => s.pickup.generating);
  const [children, setChildren] = useState<Child[]>([]);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [homework, setHomework] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [delegateForm, setDelegateForm] = useState({ delegate_name: "", phone: "", relationship: "" });
  const [absenceForm, setAbsenceForm] = useState({ child_id: "", reason: "", attendance_date: new Date().toISOString().slice(0, 10) });
  const [deletionReason, setDeletionReason] = useState("");

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchMyTokens());
    (async () => {
      const [list, hw, inbox] = await Promise.all([
        localApi.children.myParentChildren(),
        localApi.ops.parent.homeworkFeed(),
        localApi.ops.parent.notifications(),
      ]);
      setChildren(list);
      setHomework(hw);
      setNotifications(inbox);
    })();
  }, [user, dispatch]);

  const issueToken = async (child: Child) => {
    if (!user || !profile?.school_id) return;
    const res = await dispatch(
      generatePickupToken({
        childId: child.id,
        schoolId: profile.school_id,
        userId: user.id,
        childName: child.full_name,
      }) as any
    );
    if (res.meta.requestStatus === "fulfilled") {
      toast.success(`Pickup token issued for ${child.full_name}`, {
        description: "Valid for 30 minutes",
      });
    } else {
      toast.error("Failed to issue token");
    }
  };

  const goToChildMode = async () => {
    if (children.length === 0) {
      toast.error("No linked child found", {
        description: "Link at least one child before handing over this device.",
      });
      return;
    }

    if (children.length > 1) {
      setChildPickerOpen(true);
      return;
    }

    await enterChildMode(children[0]);
  };

  const enterChildMode = async (targetChild: Child) => {
    const res = await dispatch(
      enterChildModeThunk({
        childId: targetChild.id,
      }) as any,
    );

    if (res.meta.requestStatus === "fulfilled") {
      setChildPickerOpen(false);
      navigate({ to: "/child-mode" });
    } else {
      const errorText = typeof res.payload === "string" ? res.payload : "Failed to enter child mode";
      toast.error(errorText);
    }
  };

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Guardian Console" subtitle="Parent" />

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard
            icon={<Baby className="h-4 w-4" />}
            label="Hand device to child"
            description="Locks console, then asks which child (if multiple)"
            onClick={goToChildMode}
            tone="primary"
          />
          <ActionCard
            icon={<AlertOctagon className="h-4 w-4" />}
            label="Report absence"
            description="Notify school instantly"
            onClick={() => document.getElementById("absence-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
          <ActionCard
            icon={<Users className="h-4 w-4" />}
            label="Manage delegates"
            description="Add grandparent, driver, etc."
            onClick={() => document.getElementById("delegate-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <h2 className="text-lg font-semibold">Homework Feed</h2>
            </div>
            <div className="space-y-2">
              {homework.length === 0 && <div className="text-sm text-muted-foreground">No homework posted yet.</div>}
              {homework.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-panel-elevated p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{item.title}</div>
                    {!item.read_at && (
                      <button
                        type="button"
                        onClick={async () => {
                          await localApi.ops.parent.markHomeworkRead(item.id);
                          setHomework((current) => current.map((row) => (row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)));
                        }}
                        className="rounded-md border border-border px-2 py-1 text-[11px] uppercase text-muted-foreground"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Class {item.class_name} · Due {item.due_date || "N/A"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <h2 className="text-lg font-semibold">Notifications Inbox</h2>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {notifications.length === 0 && <div className="text-sm text-muted-foreground">No notifications.</div>}
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-md border border-border bg-panel-elevated p-3">
                  <div className="font-semibold">{notification.title}</div>
                  <div className="text-xs text-muted-foreground">{notification.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="delegate-section" className="grid gap-4 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold">Delegate Management</h2>
            <form
              className="grid gap-2 md:grid-cols-4"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await localApi.ops.parent.createDelegate(delegateForm);
                  toast.success("Delegate request submitted");
                  setDelegateForm({ delegate_name: "", phone: "", relationship: "" });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Delegate request failed");
                }
              }}
            >
              <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Name" value={delegateForm.delegate_name} onChange={(e) => setDelegateForm((v) => ({ ...v, delegate_name: e.target.value }))} />
              <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Phone" value={delegateForm.phone} onChange={(e) => setDelegateForm((v) => ({ ...v, phone: e.target.value }))} />
              <input className="rounded-md border border-border bg-input px-3 py-2" placeholder="Relationship" value={delegateForm.relationship} onChange={(e) => setDelegateForm((v) => ({ ...v, relationship: e.target.value }))} />
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground">Submit</button>
            </form>
          </div>

          <div id="absence-section" className="panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Report Absence</h2>
            <form
              className="space-y-2"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await localApi.ops.parent.reportAbsence(absenceForm);
                  toast.success("Absence reported");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Absence report failed");
                }
              }}
            >
              <select className="w-full rounded-md border border-border bg-input px-3 py-2" value={absenceForm.child_id} onChange={(e) => setAbsenceForm((v) => ({ ...v, child_id: e.target.value }))}>
                <option value="">Select child</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>{child.full_name}</option>
                ))}
              </select>
              <input type="date" className="w-full rounded-md border border-border bg-input px-3 py-2" value={absenceForm.attendance_date} onChange={(e) => setAbsenceForm((v) => ({ ...v, attendance_date: e.target.value }))} />
              <textarea className="w-full rounded-md border border-border bg-input px-3 py-2" rows={3} placeholder="Reason" value={absenceForm.reason} onChange={(e) => setAbsenceForm((v) => ({ ...v, reason: e.target.value }))} />
              <button type="submit" className="w-full rounded-md bg-warning px-4 py-2 text-xs font-semibold uppercase tracking-wider text-warning-foreground">Report</button>
            </form>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="mb-2 text-lg font-semibold">Request Data Deletion</h2>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await localApi.ops.parent.requestDeletion({ reason: deletionReason });
                toast.success("Deletion request submitted");
                setDeletionReason("");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to submit deletion request");
              }
            }}
          >
            <input className="flex-1 rounded-md border border-border bg-input px-3 py-2" placeholder="Reason (optional)" value={deletionReason} onChange={(e) => setDeletionReason(e.target.value)} />
            <button type="submit" className="rounded-md bg-destructive px-4 py-2 text-xs font-semibold uppercase tracking-wider text-destructive-foreground"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Submit request</button>
          </form>
        </section>

        {/* Children */}
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">My Children</h2>
              <p className="text-xs text-muted-foreground">
                Issue a one-time pickup token at the school gate after the last class.
              </p>
            </div>
            <span className="pill-status pill-info">{children.length} linked</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {children.length === 0 && (
              <div className="text-sm text-muted-foreground">No children linked yet.</div>
            )}
            {children.map((c) => (
              <div key={c.id} className="panel-elevated flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{c.full_name}</div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {c.grade} · Class {c.class_name}
                  </div>
                </div>
                <button
                  onClick={() => issueToken(c)}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Issue pickup
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Tokens */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent pickup tokens</h2>
              <p className="text-xs text-muted-foreground">
                Show the QR or OTP at the gate. Tokens self-expire.
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {tokens.length === 0 && (
              <div className="panel p-8 text-center text-sm text-muted-foreground">
                No tokens issued yet.
              </div>
            )}
            {tokens.map((t) => (
              <PickupTokenCard
                key={t.id}
                code={t.code}
                otp={t.otp}
                expiresAt={t.expires_at}
                childName={t.child?.full_name}
                status={t.status}
              />
            ))}
          </div>
        </section>
      </main>

      <Dialog open={childPickerOpen} onOpenChange={setChildPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hand device to child</DialogTitle>
            <DialogDescription>Click the child name to hand over this device.</DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => void enterChildMode(child)}
                className="flex w-full items-center justify-between rounded-md border border-border bg-panel-elevated px-4 py-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
              >
                <div>
                  <div className="font-semibold">{child.full_name}</div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {child.grade} · Class {child.class_name}
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Select</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ParentDashboard;
