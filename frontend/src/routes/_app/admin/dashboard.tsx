import { createFileRoute } from "@tanstack/react-router";
import AdminDashboardPage from "@/features/admin/dashboard";

export const Route = createFileRoute("/_app/admin/dashboard")({
  component: AdminDashboardPage,
});
