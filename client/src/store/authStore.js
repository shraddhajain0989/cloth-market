import { create } from "zustand";
import { authApi } from "../api/endpoints";

const persisted = JSON.parse(localStorage.getItem("cloth-market-auth") || "null");

export const useAuthStore = create((set, get) => ({
  user: persisted?.user || null,
  accessToken: persisted?.accessToken || null,
  refreshToken: persisted?.refreshToken || null,
  loading: false,
  error: "",
  bootstrap: () => {
    const next = JSON.parse(localStorage.getItem("cloth-market-auth") || "null");
    if (next) {
      set({ user: next.user, accessToken: next.accessToken, refreshToken: next.refreshToken });
    }
  },
  setTokens: (accessToken, refreshToken) => {
    const current = get();
    const updated = {
      user: current.user,
      accessToken,
      refreshToken: refreshToken || current.refreshToken
    };
    localStorage.setItem("cloth-market-auth", JSON.stringify(updated));
    set({ accessToken, refreshToken: updated.refreshToken });
  },
  login: async (payload) => {
    set({ loading: true, error: "" });
    try {
      const { data } = await authApi.login(payload);
      const session = data.data;
      localStorage.setItem("cloth-market-auth", JSON.stringify(session));
      set({ ...session, loading: false });
      return session;
    } catch (error) {
      const message = error.response?.data?.message || "Login failed.";
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },
  signup: async (payload) => {
    set({ loading: true, error: "" });
    try {
      const { data } = await authApi.signup(payload);
      set({ loading: false });
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || "Signup failed.";
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },
  logout: () => {
    const state = get();
    if (state.refreshToken) {
      authApi.logout({ refreshToken: state.refreshToken }).catch(() => {});
    }
    localStorage.removeItem("cloth-market-auth");
    set({ user: null, accessToken: null, refreshToken: null });
  }
}));
