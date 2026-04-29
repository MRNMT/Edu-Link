import { createFileRoute } from "@tanstack/react-router";
import ParentMyChildrenPage from "@/features/parent/mychidren";

export const Route = createFileRoute("/_app/parent/my-children")({
  component: ParentMyChildrenPage,
});
