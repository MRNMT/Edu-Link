import { createFileRoute } from "@tanstack/react-router";
import ParentAbsencesPage from "@/features/parent/absences";

export const Route = createFileRoute("/_app/parent/absences")({
  component: ParentAbsencesPage,
});
