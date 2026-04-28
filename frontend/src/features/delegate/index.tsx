import { useEffect, useState } from "react";
import { useAppSelector } from "@/store";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { localApi } from "@/lib/localApi";
import { QrCode, Clock, CheckCircle, AlertCircle, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Child {
  id: string;
  full_name: string;
  class_name: string;
  grade: string;
}

interface DelegateVoucher {
  id: string;
  child_id: string;
  child_name: string;
  code: string;
  otp: string;
  status: "active" | "used" | "expired" | "rejected";
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export default function DelegateDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);

  const [children, setChildren] = useState<Child[]>([]);
  const [vouchers, setVouchers] = useState<DelegateVoucher[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch children and voucher history on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [approvedChildren, activePasses] = await Promise.all([
          localApi.ops.delegate.children(),
          localApi.passes.my(),
        ]);
        setChildren(approvedChildren);
        setVouchers(
          activePasses.map((token) => ({
            id: token.id,
            child_id: token.child_id ?? "",
            child_name: token.child?.full_name ?? "Unknown child",
            code: token.code,
            otp: token.otp,
            status: token.status,
            expires_at: token.expires_at,
            created_at: token.created_at,
            used_at: token.used_at,
          })),
        );
      } catch (error) {
        toast.error("Failed to load delegate data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Generate 30-minute pickup voucher
  const generateVoucher = async (child: Child) => {
    if (!user || !profile?.school_id) return;

    try {
      setGenerating(true);
      const token = await localApi.ops.delegate.createPickupPass({ child_id: child.id });
      const newVoucher: DelegateVoucher = {
        id: token.id,
        child_id: token.child_id ?? child.id,
        child_name: token.child?.full_name ?? child.full_name,
        code: token.code,
        otp: token.otp,
        status: token.status,
        expires_at: token.expires_at,
        created_at: token.created_at,
        used_at: token.used_at,
      };
      setVouchers([newVoucher, ...vouchers]);
      toast.success(`Voucher generated for ${child.full_name}`, {
        description: "Valid for 30 minutes",
      });
      setSelectedChild(null);
    } catch (error) {
      toast.error("Failed to generate voucher");
    } finally {
      setGenerating(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // Status indicator color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "used":
        return "text-success bg-success/10 border-success/40";
      case "active":
        return "text-info bg-info/10 border-info/40";
      case "expired":
        return "text-muted-foreground bg-muted/10 border-muted/40";
      case "rejected":
        return "text-destructive bg-destructive/10 border-destructive/40";
      default:
        return "text-foreground bg-background border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "used":
        return <CheckCircle className="h-4 w-4" />;
      case "active":
        return <QrCode className="h-4 w-4" />;
      case "expired":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const activeVouchersCount = vouchers.filter((v) => v.status === "active").length;
  const usedVouchersCount = vouchers.filter((v) => v.status === "used").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          ▮▮▮ Loading delegate console…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ConsoleHeader title="Delegate Guardian Console" subtitle="Delegate" />

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Active Vouchers
                </div>
                <div className="mt-2 text-3xl font-bold text-info">{activeVouchersCount}</div>
              </div>
              <QrCode className="h-8 w-8 text-info/40" />
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Used Today
                </div>
                <div className="mt-2 text-3xl font-bold text-success">{usedVouchersCount}</div>
              </div>
              <CheckCircle className="h-8 w-8 text-success/40" />
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Children Available
                </div>
                <div className="mt-2 text-3xl font-bold text-primary">{children.length}</div>
              </div>
              <RefreshCw className="h-8 w-8 text-primary/40" />
            </div>
          </div>
        </div>

        {/* Generate Voucher Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Generate Pickup Voucher</h2>
            <p className="text-xs text-muted-foreground">
              Select a child to create a 30-minute pickup voucher
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`panel-elevated border-2 p-4 text-left transition ${
                  selectedChild?.id === child.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-semibold">{child.full_name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {child.class_name} • {child.grade}
                </div>
              </button>
            ))}
          </div>

          {selectedChild && (
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Generating for
                  </div>
                  <div className="mt-2 font-semibold">{selectedChild.full_name}</div>
                  <div className="text-xs text-muted-foreground">Expires in 30 minutes</div>
                </div>
                <button
                  onClick={() => generateVoucher(selectedChild)}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-success-foreground hover:bg-success/90 disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4" />
                  {generating ? "Generating..." : "Generate Voucher"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Voucher History */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Voucher History</h2>
            <p className="text-xs text-muted-foreground">
              All pickup vouchers you've generated today
            </p>
          </div>

          <div className="space-y-2">
            {vouchers.length === 0 ? (
              <div className="panel p-8 text-center text-sm text-muted-foreground">
                No vouchers generated yet.
              </div>
            ) : (
              vouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className={`panel-elevated border-l-4 p-4 transition ${getStatusColor(voucher.status)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{voucher.child_name}</div>
                        <div className="flex items-center gap-1 rounded-md bg-background/50 px-2 py-1 text-xs font-mono uppercase tracking-widest">
                          {getStatusIcon(voucher.status)}
                          {voucher.status}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="text-xs text-muted-foreground">QR Code</div>
                          <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-background/50 px-3 py-1 font-mono text-xs">
                            {voucher.code}
                            <button
                              onClick={() => copyToClipboard(voucher.code, "QR code")}
                              className="ml-2 hover:text-primary"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground">OTP Fallback</div>
                          <div className="mt-1 inline-flex items-center gap-2 rounded-md bg-background/50 px-3 py-1 font-mono text-xs tracking-widest">
                            {voucher.otp}
                            <button
                              onClick={() => copyToClipboard(voucher.otp, "OTP")}
                              className="ml-2 hover:text-primary"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground/70">Created:</span>{" "}
                          {new Date(voucher.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">Expires:</span>{" "}
                          {new Date(voucher.expires_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {voucher.used_at && (
                          <div>
                            <span className="text-muted-foreground/70">Used:</span>{" "}
                            {new Date(voucher.used_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
