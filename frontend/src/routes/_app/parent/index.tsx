import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/parent/")({
  beforeLoad: () => {
    throw redirect({ to: "/parent/dashboard" });
  },
  component: () => null,
});
