import { Navigate } from "@tanstack/react-router";
import { useSelector } from "react-redux";
import { AppRole } from "@/store/slices/authSlice";
import { RootState } from "@/store";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  fallbackRoute?: string;
}

/**
 * RoleGuard — Role-based access control wrapper
 * Redirects to login or fallback route if user doesn't have required role
 */
export function RoleGuard({ children, allowedRoles, fallbackRoute = "/login" }: RoleGuardProps) {
  const { user, loading } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackRoute} />;
  }

  return <>{children}</>;
}

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * RequireAuth — Ensures user is authenticated before rendering
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading, session } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
