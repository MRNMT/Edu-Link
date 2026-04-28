import { useEffect, useState } from "react";
import { useAppDispatch } from "@/store";
import { useNavigate } from "@tanstack/react-router";
import { ParentLayout } from "@/features/parent/layout";
import { localApi, type ParentDashboardOverview } from "@/lib/localApi";
import { enterChildModeThunk } from "@/store/slices/childModeSlice";
import { toast } from "sonner";

export default function ParentDashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<ParentDashboardOverview | null>(null);
  const [activeFeed, setActiveFeed] = useState<"homework" | "notifications">("homework");

  useEffect(() => {
    void (async () => {
      try {
        const data = await localApi.ops.parent.dashboard();
        setOverview(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
      }
    })();
  }, []);

  const parentName = overview?.parent_name ?? "Guardian";
  const children = overview?.children ?? [];
  const homework = overview?.homework ?? [];
  const notifications = overview?.notifications ?? [];

  const switchToChild = async (childId: string) => {
    const result = await dispatch(enterChildModeThunk({ childId }) as any);
    if (result.meta.requestStatus === "fulfilled") {
      navigate({ to: "/child-mode" });
    }
  };

  return (
    <ParentLayout title="Dashboard">
      <div className="welcome-banner wb-default mb-5 rounded-2xl p-7" style={{ background: "var(--teal)", color: "white" }}>
        <div className="wb-h text-3xl font-extrabold">Good morning, {parentName}!</div>
        <div className="wb-p mt-1 text-sm opacity-90">Here&apos;s what&apos;s happening with your children today.</div>
      </div>

      <div className="summary-bar mb-5 flex max-w-full overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="sum-item flex flex-1 items-center gap-4 border-r border-border p-5">
          <div className="sum-icon si-teal flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">MC</div>
          <div>
            <div className="sum-val text-2xl font-extrabold text-navy">{children.length}</div>
            <div className="sum-lbl mt-1 text-xs font-semibold text-navy/60">Children</div>
          </div>
        </div>
        <div className="sum-item flex flex-1 items-center gap-4 border-r border-border p-5">
          <div className="sum-icon si-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">DG</div>
          <div>
            <div className="sum-val text-2xl font-extrabold text-navy">{overview?.active_delegate_count ?? 0}</div>
            <div className="sum-lbl mt-1 text-xs font-semibold text-navy/60">Active Delegates</div>
          </div>
        </div>
        <div className="sum-item flex flex-1 items-center gap-4 p-5">
          <div className="sum-icon si-amber flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">NT</div>
          <div>
            <div className="sum-val text-2xl font-extrabold text-navy">{overview?.unread_notification_count ?? 0}</div>
            <div className="sum-lbl mt-1 text-xs font-semibold text-navy/60">New Notifications</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-4 text-sm font-bold text-navy">My Children</div>
            {children.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">No linked children found.</div>
            ) : (
              <div className="space-y-2">
                {children.slice(0, 3).map((child) => (
                  <div key={child.id} className="flex items-center gap-3 rounded-lg border border-border bg-slate-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 font-bold text-navy">
                      {child.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-navy">{child.full_name}</div>
                      <div className="text-xs text-navy/60">{child.grade} · {child.class_name}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600"
                      onClick={() => void switchToChild(child.id)}
                    >
                      Switch to Child
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-bold text-navy">Quick Actions</div>
            <div className="grid grid-cols-3 gap-3">
              <button type="button" className="rounded-xl border border-border bg-slate-50 py-4 text-xs font-semibold text-navy" onClick={() => navigate({ to: "/parent/absence-report" })}>Report Absence</button>
              <button type="button" className="rounded-xl border border-border bg-slate-50 py-4 text-xs font-semibold text-navy" onClick={() => navigate({ to: "/parent/notifications" })}>Notifications</button>
              <button type="button" className="rounded-xl border border-border bg-slate-50 py-4 text-xs font-semibold text-navy" onClick={() => navigate({ to: "/parent/messages" })}>Messages</button>
            </div>
          </section>
        </div>

        <section className="card rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 text-sm font-bold text-navy">Combined Activities</div>
          <div className="mb-3 flex border-b border-border">
            <button type="button" onClick={() => setActiveFeed("homework")} className={`border-b-2 pb-2 pr-4 text-sm font-semibold ${activeFeed === "homework" ? "border-teal text-teal" : "border-transparent text-navy/60"}`}>Homework</button>
            <button type="button" onClick={() => setActiveFeed("notifications")} className={`border-b-2 pb-2 pl-4 text-sm font-semibold ${activeFeed === "notifications" ? "border-teal text-teal" : "border-transparent text-navy/60"}`}>Notifications</button>
          </div>

          {activeFeed === "homework" ? (
            homework.length === 0 ? (
              <div className="py-10 text-center text-sm text-navy/60">No current homework</div>
            ) : (
              <div className="space-y-2">
                {homework.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-3">
                    <div className="font-semibold text-navy">{item.title}</div>
                    <div className="text-xs text-navy/60">{item.class_name}</div>
                  </div>
                ))}
              </div>
            )
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-navy/60">No current notifications</div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-3">
                  <div className="font-semibold text-navy">{item.title}</div>
                  <div className="text-xs text-navy/60">{item.category}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ParentLayout>
  );
}
