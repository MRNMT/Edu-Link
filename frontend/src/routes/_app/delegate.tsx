import { createFileRoute } from "@tanstack/react-router";
import DelegateDashboard from "@/features/delegate";
import { useAppSelector } from "@/store";

export const Route = createFileRoute("/_app/delegate")({
  component: DelegateRoute,
});

function DelegateRoute() {
  const { loading } = useAppSelector((s) => s.auth);
  
  if (loading) return null;
  
  return <DelegateDashboard />;
}
