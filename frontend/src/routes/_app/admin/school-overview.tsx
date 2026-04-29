import { createFileRoute } from "@tanstack/react-router";
import AdminSchoolOverviewPage from "@/features/admin/school-overview";

export const Route = createFileRoute("/_app/admin/school-overview")({
  component: AdminSchoolOverviewPage,
});
