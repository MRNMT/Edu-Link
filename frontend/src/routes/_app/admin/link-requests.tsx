import { createFileRoute } from "@tanstack/react-router";
import AdminLinkRequestsPage from "@/features/admin/link-requests";

export const Route = createFileRoute("/_app/admin/link-requests")({
  component: AdminLinkRequestsPage,
});
