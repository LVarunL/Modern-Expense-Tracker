import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteAccount as deleteAccountRequest,
  login,
  loginWithGoogle,
  logout as logoutRequest,
  register,
} from "../api/authApi";
import type { AuthUser } from "../api/types";
import { queryClient } from "../queryClient";
import {
  clearAuthSnapshot,
  loadAuthSnapshot,
  refreshSession,
  saveAuthSnapshot,
  setAuthFromResponse,
  type AuthSnapshot,
} from "./authStorage";

interface AuthContextValue {
  isLoading: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null,
  });

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      const stored = await loadAuthSnapshot();
      let next = stored;
      const isExpired = stored.expiresAt
        ? stored.expiresAt <= Date.now()
        : true;
      if (stored.refreshToken && (!stored.accessToken || isExpired)) {
        const refreshed = await refreshSession();
        if (refreshed) {
          next = refreshed;
        } else {
          next = {
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            user: null,
          };
        }
      }
      if (active) {
        setSnapshot(next);
        setIsLoading(false);
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const applyAuthResponse = useCallback(async (response: AuthSnapshot) => {
    setSnapshot(response);
  }, []);

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const response = await login({ email, password });
      const next = await setAuthFromResponse(response);
      await applyAuthResponse(next);
    },
    [applyAuthResponse]
  );

  const registerWithPassword = useCallback(
    async (email: string, password: string) => {
      const response = await register({ email, password });
      const next = await setAuthFromResponse(response);
      await applyAuthResponse(next);
    },
    [applyAuthResponse]
  );

  const loginWithGoogleToken = useCallback(
    async (idToken: string) => {
      const response = await loginWithGoogle({ id_token: idToken });
      const next = await setAuthFromResponse(response);
      await applyAuthResponse(next);
    },
    [applyAuthResponse]
  );

  const logout = useCallback(async () => {
    const stored = await loadAuthSnapshot();
    if (stored.refreshToken) {
      try {
        await logoutRequest({ refresh_token: stored.refreshToken });
      } catch {
        // Best-effort revoke; continue to clear local state.
      }
    }
    await clearAuthSnapshot();
    await queryClient.clear();
    setSnapshot({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
    });
  }, []);

  const deleteAccount = useCallback(async (password?: string) => {
    await deleteAccountRequest(password ? { password } : undefined);
    await clearAuthSnapshot();
    await queryClient.clear();
    setSnapshot({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
    });
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setSnapshot((prev) => {
      if (!prev.user) {
        return prev;
      }
      const next = {
        ...prev,
        user: {
          ...prev.user,
          ...updates,
        },
      };
      void saveAuthSnapshot(next);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      user: snapshot.user,
      isAuthenticated: Boolean(snapshot.accessToken && snapshot.user),
      loginWithPassword,
      registerWithPassword,
      loginWithGoogleToken,
      logout,
      deleteAccount,
      updateUser,
    }),
    [
      isLoading,
      snapshot,
      loginWithPassword,
      registerWithPassword,
      loginWithGoogleToken,
      logout,
      deleteAccount,
      updateUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
