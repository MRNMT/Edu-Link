import { createFileRoute } from "@tanstack/react-router";
import AdminTeachersPage from "@/features/admin/teachers";

export const Route = createFileRoute("/_app/admin/teachers")({
  component: AdminTeachersPage,
});
