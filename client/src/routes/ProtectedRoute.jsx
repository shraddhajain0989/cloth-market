import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getValidatedTokenRole, isTokenExpired } from "../utils/token";

export default function ProtectedRoute({ children, roles, loginPath = "/login" }) {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

  // 1. Unauthenticated visitor check
  if (!user || !accessToken) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  // 2. Token expiration check
  if (isTokenExpired(accessToken)) {
    logout();
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  // 3. Token claim validation (prevents localStorage role tampering)
  const tokenRole = getValidatedTokenRole(accessToken);
  if (!tokenRole) {
    logout();
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  // Authoritative role comes from signed token claims, not mutable client state
  const effectiveRole = tokenRole;

  // 4. Role Hierarchy Check
  if (roles && roles.length > 0) {
    // Master Admin has role inheritance over admin routes
    const hasPermission =
      roles.includes(effectiveRole) ||
      (roles.includes("admin") && effectiveRole === "master");

    if (!hasPermission) {
      // Normal customer attempting to access /admin or /master-admin, or admin attempting /master-admin
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
