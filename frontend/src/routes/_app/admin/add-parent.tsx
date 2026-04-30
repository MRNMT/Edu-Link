import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/add-parent")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/parents-guardians" });
  },
});
