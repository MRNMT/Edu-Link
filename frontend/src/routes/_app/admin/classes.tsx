import { createFileRoute } from "@tanstack/react-router";
import AdminClassesPage from "@/features/admin/classes";

export const Route = createFileRoute("/_app/admin/classes")({
  component: AdminClassesPage,
});
