import { createFileRoute } from "@tanstack/react-router";
import ParentDashboard from "@/features/parent";

export const Route = createFileRoute("/_app/parent")({
  component: ParentDashboard,
});
