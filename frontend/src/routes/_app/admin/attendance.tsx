import { createFileRoute } from "@tanstack/react-router";
import AdminAttendancePage from "@/features/admin/attendance";

export const Route = createFileRoute("/_app/admin/attendance")({
  component: AdminAttendancePage,
});
