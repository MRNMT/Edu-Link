import { useEffect, useState } from "react";
import { useAppSelector } from "@/store";
import { AdminLayout, loadAdminDashboardData } from "@/features/admin/layout";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { localApi } from "@/lib/localApi";

interface DashboardData {
  learnersCount: number;
  teachersCount: number;
  presentToday: number;
  attendanceTotal: number;
  pendingLinks: number;
  delegates: Array<any>;
  auditRows: Array<any>;
}

export default function AdminDashboardPage() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [data, setData] = useState<DashboardData | null>(null);

  const load = async () => {
    try {
      const result = await loadAdminDashboardData(profile?.school_id ?? null);
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    }
  };

  useEffect(() => {
    void load();
  }, [profile?.school_id]);

  const approveReject = async (id: string, decision: "approve" | "reject") => {
    try {
      await localApi.ops.admin.decideDelegate(id, decision);
      toast.success(decision === "approve" ? "Request approved" : "Request denied");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    }
  };

  const presentPct =
    data && data.attendanceTotal > 0
      ? Math.round((data.presentToday / data.attendanceTotal) * 100)
      : 0;

  return (
    <AdminLayout title="Dashboard">
      <div className="mb-5 rounded-2xl bg-teal p-7 text-white">
        <div className="text-3xl font-extrabold">
          Good morning, {profile?.full_name?.split(" ")[0] ?? "Admin"}!
        </div>
        <div className="mt-1 text-sm opacity-90">School operations are live for today.</div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-navy">{data?.learnersCount ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-navy/60">Total Learners</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-navy">{data?.teachersCount ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-navy/60">Teachers</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-navy">{data?.presentToday ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-navy/60">Present Today ({presentPct}%)</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-navy">{data?.pendingLinks ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-navy/60">Link Requests</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-navy">Pending Link Requests</div>
            <div className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">
              {data?.pendingLinks ?? 0} pending
            </div>
          </div>
          <div className="space-y-2">
            {(data?.delegates ?? []).slice(0, 5).map((delegate) => (
              <div key={delegate.id} className="rounded-lg border border-border bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-navy">
                      {delegate.delegate_name} requesting link
                    </div>
                    <div className="text-xs text-navy/60">
                      Parent {delegate.parent_name} · {delegate.relationship}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void approveReject(delegate.id, "approve")}
                      className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void approveReject(delegate.id, "reject")}
                      className="rounded-md bg-rose-500 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      <XCircle className="mr-1 inline h-3.5 w-3.5" />
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(data?.delegates ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
                No pending requests.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-bold text-navy">Today&apos;s Logs</div>
          <div className="space-y-2">
            {(data?.auditRows ?? []).slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-slate-50 p-3">
                <div className="font-semibold text-navy">{row.action}</div>
                <div className="text-xs text-navy/60">{new Date(row.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(data?.auditRows ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-sm text-navy/60">
                No audit events for today.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
