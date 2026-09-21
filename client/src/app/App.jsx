import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import ProtectedRoute from "../routes/ProtectedRoute";
import { useAuthStore } from "../store/authStore";
import AdminPage from "../pages/admin/AdminPage";
import LoginPage from "../pages/auth/LoginPage";
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
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin", "master"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
