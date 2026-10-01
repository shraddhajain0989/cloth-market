import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children, roles, loginPath = "/login" }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    // If regular user attempts admin/master-admin, redirect away
    return <Navigate to="/" replace />;
  }

  return children;
}
