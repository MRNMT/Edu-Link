import { createFileRoute } from "@tanstack/react-router";
import ChildModeDashboard from "@/features/child-mode";

export const Route = createFileRoute("/_app/child-mode")({
  component: ChildModeDashboard,
});
