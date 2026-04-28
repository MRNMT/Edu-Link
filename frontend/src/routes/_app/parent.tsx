import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/parent")({
  component: ParentRouteLayout,
});

function ParentRouteLayout() {
  return <Outlet />;
}
