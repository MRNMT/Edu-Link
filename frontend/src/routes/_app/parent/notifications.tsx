import { createFileRoute } from "@tanstack/react-router";
import ParentNotificationsPage from "@/features/parent/notifications";

export const Route = createFileRoute("/_app/parent/notifications")({
  component: ParentNotificationsPage,
});
