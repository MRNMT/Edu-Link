import { createFileRoute } from "@tanstack/react-router";
import SecurityDashboard from "@/features/security";
import { useAppSelector } from "@/store";

export const Route = createFileRoute("/_app/security")({
  component: SecurityRoute,
});

function SecurityRoute() {
  const { loading } = useAppSelector((s) => s.auth);
  
  if (loading) return null;
  
  return <SecurityDashboard />;
}
