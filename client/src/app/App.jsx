import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import ProtectedRoute from "../routes/ProtectedRoute";
import { useAuthStore } from "../store/authStore";
import AdminPage from "../pages/admin/AdminPage";
import MasterAdminPage from "../pages/admin/MasterAdminPage";
import LoginPage from "../pages/auth/LoginPage";
import AdminLoginPage from "../pages/auth/AdminLoginPage";
import MasterAdminLoginPage from "../pages/auth/MasterAdminLoginPage";
import SignupPage from "../pages/auth/SignupPage";
import AiLabPage from "../pages/shop/AiLabPage";
import HomePage from "../pages/shop/HomePage";
import ProfilePage from "../pages/profile/ProfilePage";
import SocialPage from "../pages/social/SocialPage";

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      {/* Customer Application (/) */}
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/ai-lab" element={<AiLabPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={["user", "admin", "master"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Admin Route (/admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin", "master"]} loginPath="/admin/login">
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Master Admin Route (/master-admin) */}
        <Route
          path="/master-admin"
          element={
            <ProtectedRoute roles={["master"]} loginPath="/master-admin/login">
              <MasterAdminPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Customer Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Dedicated Role Login Pages */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/master-admin/login" element={<MasterAdminLoginPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
