import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { useAppSelector } from "@/store";
import { localApi } from "@/lib/localApi";
import {
  Activity,
  BarChart3,
  Building2,
  Users,
  AlertCircle,
  Zap,
  Server,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

interface School {
  id: string;
  name: string;
  code: string;
  user_count?: number;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  school_id: string | null;
  created_at: string;
}

interface PlatformMetrics {
  totalSchools: number;
  totalUsers: number;
  activeUsers: number;
  totalAuditEvents: number;
}

interface SystemLog {
  id: string;
  action: string;
  target: string | null;
  actor_id: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export default function SystemAdminDashboard() {
  const profile = useAppSelector((s) => s.auth.profile);

  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch system logs
        const logs = await localApi.audit.list(20);
        setSystemLogs(logs);

        // Simulated platform metrics
        setMetrics({
          totalSchools: 24,
          totalUsers: 1847,
          activeUsers: 1203,
          totalAuditEvents: logs.length,
        });

        // Simulated schools list
        setSchools([
          {
            id: "1",
            name: "Sentinel Academy",
            code: "DEMO",
            user_count: 156,
            created_at: new Date().toISOString(),
          },
        ]);

        setLoading(false);
      } catch (err) {
        console.error("Failed to load system data:", err);
        toast.error("Failed to load system data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="System Admin Console" subtitle="Platform Administration" />

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Platform KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Total Schools
                </div>
                <div className="mt-2 text-2xl font-bold">{metrics?.totalSchools ?? "—"}</div>
              </div>
              <Building2 className="h-8 w-8 text-primary/40" />
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Total Users
                </div>
                <div className="mt-2 text-2xl font-bold">{metrics?.totalUsers ?? "—"}</div>
              </div>
              <Users className="h-8 w-8 text-info/40" />
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Active Now
                </div>
                <div className="mt-2 text-2xl font-bold text-success">
                  {metrics?.activeUsers ?? "—"}
                </div>
              </div>
              <Activity className="h-8 w-8 text-success/40" />
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Platform Status
                </div>
                <div className="mt-2 text-2xl font-bold text-success">Healthy</div>
              </div>
              <Server className="h-8 w-8 text-success/40" />
            </div>
          </div>
        </div>

        {/* System Health & Monitoring */}
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Platform Health & Metrics</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">API Response Time</span>
                <span className="font-mono text-xs text-success">45ms</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">Database Connection</span>
                <span className="font-mono text-xs text-success">Connected</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">Uptime</span>
                <span className="font-mono text-xs text-success">99.98%</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">Server CPU</span>
                <span className="font-mono text-xs text-warning">34%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="font-mono text-xs text-info">2.1 GB / 8 GB</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">Active Sessions</span>
                <span className="font-mono text-xs text-primary">847</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">Auth Service</span>
                <span className="font-mono text-xs text-success">Running</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-3">
                <span className="text-sm font-medium">Backup Status</span>
                <span className="font-mono text-xs text-success">Last 1h ago</span>
              </div>
            </div>
          </div>
        </section>

        {/* Schools & Districts Management */}
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Schools & Districts</h2>
            </div>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition hover:bg-primary/90">
              + Add School
            </button>
          </div>

          {schools.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No schools configured yet.
            </div>
          ) : (
            <div className="space-y-2">
              {schools.map((school) => (
                <div
                  key={school.id}
                  className="flex items-center justify-between rounded-md border border-border bg-panel-elevated p-4"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{school.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Code: <span className="font-mono">{school.code}</span> ·{" "}
                      {school.user_count || 0} users
                    </div>
                  </div>
                  <button className="rounded p-2 text-muted-foreground transition hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* User Account Administration */}
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-semibold">User Account Administration</h2>
            </div>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition hover:bg-primary/90">
              + Add User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Email</th>
                  <th className="px-4 py-2 text-left font-semibold">Role</th>
                  <th className="px-4 py-2 text-left font-semibold">School</th>
                  <th className="px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                      No users to display.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{user.full_name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{user.email}</td>
                      <td className="px-4 py-2">
                        <span className="pill-status pill-info">{user.role}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">—</td>
                      <td className="px-4 py-2">
                        <button className="text-xs font-semibold uppercase text-primary transition hover:text-primary/80">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Logs & Audit Trails */}
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">System Logs & Audit Trails</h2>
            <span className="ml-auto pill-status pill-info">{systemLogs.length} events</span>
          </div>

          <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
            {systemLogs.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">No system logs.</div>
            ) : (
              systemLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-1.5 px-2 border-b border-border/40 last:border-0 hover:bg-muted/30"
                >
                  <span className="text-muted-foreground shrink-0 min-w-[100px]">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span className="text-foreground font-semibold shrink-0 min-w-[120px]">
                    {log.action}
                  </span>
                  <span className="text-info flex-1 truncate">{log.target}</span>
                </div>
              ))
            )}
          </div>

          <button className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary transition hover:text-primary/80">
            Export full audit report →
          </button>
        </section>

        {/* Quick Actions */}
        <section className="panel p-5">
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button className="rounded-md border border-border bg-panel-elevated px-4 py-3 text-xs font-semibold uppercase transition hover:border-primary/50 hover:bg-muted">
              Backup Database
            </button>
            <button className="rounded-md border border-border bg-panel-elevated px-4 py-3 text-xs font-semibold uppercase transition hover:border-primary/50 hover:bg-muted">
              Clear Cache
            </button>
            <button className="rounded-md border border-border bg-panel-elevated px-4 py-3 text-xs font-semibold uppercase transition hover:border-primary/50 hover:bg-muted">
              Sync Schools
            </button>
            <button className="rounded-md border border-border bg-panel-elevated px-4 py-3 text-xs font-semibold uppercase transition hover:border-primary/50 hover:bg-muted">
              System Settings
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
