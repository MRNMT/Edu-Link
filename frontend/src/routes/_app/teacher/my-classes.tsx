import { createFileRoute } from "@tanstack/react-router";
import TeacherMyClassesPage from "@/features/teacher/my-classes";

export const Route = createFileRoute("/_app/teacher/my-classes")({
  component: TeacherMyClassesPage,
});

export default Route;
