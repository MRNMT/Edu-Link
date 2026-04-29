import { useEffect, useState } from "react";
import { useAppSelector } from "@/store";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { localApi } from "@/lib/localApi";
import { QrCode, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { VoucherCard, DelegateVoucher } from "./VoucherCard";
import { ChildSelector } from "./ChildSelector";

interface Child {
  id: string;
  full_name: string;
  class_name: string;
  grade: string;
}

export default function DelegateDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);

  const [children, setChildren] = useState<Child[]>([]);
  const [vouchers, setVouchers] = useState<DelegateVoucher[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

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

        <ChildSelector
          children={children}
          selectedChild={selectedChild}
          onSelect={setSelectedChild}
        />

        {selectedChild && (
          <button
            onClick={() => generateVoucher(selectedChild)}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-success-foreground hover:bg-success/90 disabled:opacity-50"
          >
            <QrCode className="h-4 w-4" />
            {generating ? "Generating..." : "Generate Voucher"}
          </button>
        )}

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
              vouchers.map((voucher) => <VoucherCard key={voucher.id} voucher={voucher} />)
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
