import { createFileRoute } from "@tanstack/react-router";
import TeacherAttendancePage from "@/features/teacher/attendance";

export const Route = createFileRoute("/_app/teacher/attendance")({
  component: TeacherAttendancePage,
});

export default Route;
