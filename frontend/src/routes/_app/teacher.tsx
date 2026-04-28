import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { store } from "@/store";
import { useAppSelector } from "@/store";

export const Route = createFileRoute("/_app/teacher")({
  beforeLoad: () => {
    const state = store.getState();
    const { roles, loading } = state.auth;
    // Allow if still loading (auth will be checked in _app)
    if (loading) return;
    // Redirect to login if user doesn't have teacher role
    if (!roles.includes("teacher")) {
      throw redirect({ to: "/login" });
    }
  },
  component: TeacherLayout,
});

function TeacherLayout() {
  const { roles, loading } = useAppSelector((s) => s.auth);
  
  if (loading) return null;
  
  if (!roles.includes("teacher")) {
    return null;
  }
  
  return <Outlet />;
}
