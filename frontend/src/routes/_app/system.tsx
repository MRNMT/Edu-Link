import { createFileRoute } from "@tanstack/react-router";
import SystemAdminDashboard from "@/features/system";

export const Route = createFileRoute("/_app/system")({
  component: SystemAdminDashboard,
});
