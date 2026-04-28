import { createFileRoute } from "@tanstack/react-router";
import TeacherAnnouncementsPage from "@/features/teacher/announcements";

export const Route = createFileRoute("/_app/teacher/announcements")({
  component: TeacherAnnouncementsPage,
});

export default Route;
