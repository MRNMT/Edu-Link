import { createFileRoute } from "@tanstack/react-router";
import AdminAddParentPage from "@/features/admin/add-parent";

export const Route = createFileRoute("/_app/admin/add-parent")({
  component: AdminAddParentPage,
});
