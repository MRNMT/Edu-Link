import { createFileRoute } from "@tanstack/react-router";
import TeacherDashboard from "@/features/teacher";

export const Route = createFileRoute("/_app/teacher/dashboard")({
  component: TeacherDashboard,
});

export default Route;
