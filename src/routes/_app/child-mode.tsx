import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { exitChildMode } from "@/store/slices/childModeSlice";
import { reauthenticateThunk } from "@/store/slices/authSlice";
import { Lock, BookOpen, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/child-mode")({
  component: ChildModePage,
});

function ChildModePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const childModeActive = useAppSelector((s) => s.childMode.active);
  const profile = useAppSelector((s) => s.auth.profile);
  const [showExit, setShowExit] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  // If parent navigated here without entering child mode, kick back
  useEffect(() => {
    if (!childModeActive) navigate({ to: "/parent" });
  }, [childModeActive, navigate]);

  const submitExit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await dispatch(reauthenticateThunk(pwd));
    setBusy(false);
    if (res.meta.requestStatus === "fulfilled") {
      dispatch(exitChildMode());
      toast.success("Parent mode restored");
      navigate({ to: "/parent" });
    } else {
      toast.error("Incorrect password");
      setPwd("");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Locked header */}
      <header className="border-b border-border/60 bg-panel/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/10 ring-1 ring-warning/40">
              <Lock className="h-4 w-4 text-warning" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-warning">
                CHILD MODE · LOCKED
              </div>
              <div className="text-sm font-semibold">Hi {profile?.full_name?.split(" ")[0] ?? "there"}!</div>
            </div>
          </div>
          <button
            onClick={() => setShowExit(true)}
            className="inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-warning transition hover:bg-warning/20"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Parent unlock
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <div className="panel p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // KID-SAFE VIEW
          </div>
          <h1 className="mt-2 text-3xl font-bold">My homework</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only homework and class messages are visible here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { subject: "Math", title: "Worksheet pg. 24", due: "Tomorrow" },
            { subject: "Science", title: "Plant cell drawing", due: "Friday" },
            { subject: "English", title: "Read chapter 3", due: "Monday" },
            { subject: "Art", title: "Bring a leaf", due: "Wed" },
          ].map((h, i) => (
            <div key={i} className="panel-elevated flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {h.subject}
                </div>
                <div className="mt-0.5 font-semibold">{h.title}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="pill-status pill-warning">Due · {h.due}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3 w-3" /> Mark done
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Exit modal */}
      {showExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <form onSubmit={submitExit} className="panel-elevated w-full max-w-sm p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              // RE-AUTHENTICATE
            </div>
            <h2 className="mt-2 text-xl font-bold">Parent password required</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              To leave child mode and access guardian features, enter your password.
            </p>
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Password"
              className="mt-4 w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowExit(false); setPwd(""); }}
                className="flex-1 rounded-md border border-border bg-panel px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !pwd}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
