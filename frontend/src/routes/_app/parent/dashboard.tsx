import { createFileRoute } from "@tanstack/react-router";
import ParentDashboardPage from "@/features/parent/dashboard";

export const Route = createFileRoute("/_app/parent/dashboard")({
  component: ParentDashboardPage,
});
