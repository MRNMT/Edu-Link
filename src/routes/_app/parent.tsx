import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { PickupTokenCard } from "@/components/PickupTokenCard";
import { useAppDispatch, useAppSelector } from "@/store";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyTokens, generatePickupToken } from "@/store/slices/pickupSlice";
import { enterChildMode } from "@/store/slices/childModeSlice";
import { Baby, QrCode, AlertOctagon, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/parent")({
  component: ParentDashboard,
});

interface Child {
  id: string;
  full_name: string;
  class_name: string;
  grade: string;
}

function ParentDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useAppSelector((s) => s.auth.profile);
  const tokens = useAppSelector((s) => s.pickup.tokens);
  const generating = useAppSelector((s) => s.pickup.generating);
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchMyTokens(user.id));
    (async () => {
      const { data } = await supabase
        .from("parent_children")
        .select("child:children(id, full_name, class_name, grade)")
        .eq("parent_id", user.id);
      const list = (data ?? [])
        .map((r) => r.child as unknown as Child)
        .filter(Boolean);
      setChildren(list);
    })();
  }, [user, dispatch]);

  const issueToken = async (child: Child) => {
    if (!user || !profile?.school_id) return;
    const res = await dispatch(
      generatePickupToken({
        childId: child.id,
        schoolId: profile.school_id,
        userId: user.id,
      }),
    );
    if (res.meta.requestStatus === "fulfilled") {
      toast.success(`Pickup token issued for ${child.full_name}`, {
        description: "Valid for 30 minutes",
      });
    } else {
      toast.error("Failed to issue token");
    }
  };

  const goToChildMode = () => {
    dispatch(enterChildMode());
    navigate({ to: "/child-mode" });
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
            description="Locks console, password required to exit"
            onClick={goToChildMode}
            tone="primary"
          />
          <ActionCard
            icon={<AlertOctagon className="h-4 w-4" />}
            label="Report absence"
            description="Notify school instantly"
            onClick={() => toast("Absence flow — Phase 2")}
          />
          <ActionCard
            icon={<Users className="h-4 w-4" />}
            label="Manage delegates"
            description="Add grandparent, driver, etc."
            onClick={() => toast("Delegate flow — Phase 2")}
          />
        </div>

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
                childName={t.child?.full_name ?? "—"}
                status={t.status}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ActionCard({
  icon, label, description, onClick, tone,
}: {
  icon: React.ReactNode; label: string; description: string; onClick: () => void; tone?: "primary";
}) {
  return (
    <button
      onClick={onClick}
      className={`panel-elevated group flex items-start gap-3 p-4 text-left transition hover:border-primary/50 ${tone === "primary" ? "ring-1 ring-primary/30" : ""}`}
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone === "primary" ? "bg-primary/15 text-primary" : "bg-panel text-muted-foreground"}`}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}
