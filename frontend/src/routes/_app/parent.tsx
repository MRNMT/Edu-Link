import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAppSelector } from "@/store";

export const Route = createFileRoute("/_app/parent")({
  component: ParentRouteLayout,
});

function ParentRouteLayout() {
  const { loading } = useAppSelector((s) => s.auth);
  
  if (loading) return null;
  
  return <Outlet />;
}
