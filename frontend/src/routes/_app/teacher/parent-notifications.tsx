import { createFileRoute } from "@tanstack/react-router";
import TeacherParentNotificationsPage from "@/features/teacher/parent-notifications";

export const Route = createFileRoute("/_app/teacher/parent-notifications")({
  component: TeacherParentNotificationsPage,
});

export default Route;
