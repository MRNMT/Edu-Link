import { createFileRoute } from "@tanstack/react-router";
import AdminReportsPage from "@/features/admin/reports";

export const Route = createFileRoute("/_app/admin/reports")({
  component: AdminReportsPage,
});
