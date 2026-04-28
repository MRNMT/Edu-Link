import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/teacher/")({
  beforeLoad: () => {
    throw redirect({ to: "/teacher/dashboard" });
  },
  component: () => null,
});
