import { createFileRoute } from "@tanstack/react-router";
import ParentMessagesPage from "@/features/parent/messages";

export const Route = createFileRoute("/_app/parent/messages")({
  component: ParentMessagesPage,
});
