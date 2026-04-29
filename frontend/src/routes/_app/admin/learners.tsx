import { createFileRoute } from "@tanstack/react-router";
import AdminLearnersPage from "@/features/admin/learners";

export const Route = createFileRoute("/_app/admin/learners")({
  component: AdminLearnersPage,
});
