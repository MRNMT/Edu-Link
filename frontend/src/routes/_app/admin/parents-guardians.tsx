import { createFileRoute } from "@tanstack/react-router";
import AdminParentsGuardiansPage from "@/features/admin/parents-guardians";

export const Route = createFileRoute("/_app/admin/parents-guardians")({
  component: AdminParentsGuardiansPage,
});
