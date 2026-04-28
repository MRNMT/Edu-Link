import { createFileRoute } from "@tanstack/react-router";
import SystemAdminDashboard from "@/features/system";
import { useAppSelector } from "@/store";

export const Route = createFileRoute("/_app/system")({
  component: SystemRoute,
});

function SystemRoute() {
  const { loading } = useAppSelector((s) => s.auth);
  
  if (loading) return null;
  
  return <SystemAdminDashboard />;
}
