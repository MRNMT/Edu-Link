import { createFileRoute } from "@tanstack/react-router";
import TeacherHomeworkPage from "@/features/teacher/homework";

export const Route = createFileRoute("/_app/teacher/homework")({
  component: TeacherHomeworkPage,
});

export default Route;
