import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppSelector } from "@/store";

export const Route = createFileRoute("/_app")({
  component: AppGuard,
});

function AppGuard() {
  const navigate = useNavigate();
  const { session, loading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          ▮▮▮ Establishing secure session…
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <Outlet />;
}
