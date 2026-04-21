import { createFileRoute } from "@tanstack/react-router";
import DelegateDashboard from "@/features/delegate";

export const Route = createFileRoute("/_app/delegate")({
  component: DelegateDashboard,
});
