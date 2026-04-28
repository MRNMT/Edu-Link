import { createFileRoute } from "@tanstack/react-router";
import TeacherQuizzesPage from "@/features/teacher/quizzes";

export const Route = createFileRoute("/_app/teacher/quizzes")({
  component: TeacherQuizzesPage,
});

export default Route;
