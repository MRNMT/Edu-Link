import { createFileRoute } from "@tanstack/react-router";
import ParentHomeworkPage from "@/features/parent/homework";

export const Route = createFileRoute("/_app/parent/homework")({
  component: ParentHomeworkPage,
});
