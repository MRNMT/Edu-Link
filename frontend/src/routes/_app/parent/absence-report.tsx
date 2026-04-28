import { createFileRoute } from "@tanstack/react-router";
import ParentAbsenceReportPage from "@/features/parent/absence-report";

export const Route = createFileRoute("/_app/parent/absence-report")({
  component: ParentAbsenceReportPage,
});
