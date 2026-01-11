import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { API_BASE_URL } from "../api/config";
import type { AuthResponse, AuthUser } from "../api/types";

export interface AuthSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
}

const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";
const EXPIRES_AT_KEY = "auth.expiresAt";
const USER_KEY = "auth.user";

let cachedSnapshot: AuthSnapshot | null = null;
let secureStoreAvailable: boolean | null = null;
let refreshPromise: Promise<AuthSnapshot | null> | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (secureStoreAvailable !== null) {
    return secureStoreAvailable;
  }
  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }
  return secureStoreAvailable;
}

async function getItem(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string | null): Promise<void> {
  if (await canUseSecureStore()) {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await SecureStore.setItemAsync(key, value);
    return;
  }
  if (value === null) {
    await AsyncStorage.removeItem(key);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

export async function loadAuthSnapshot(): Promise<AuthSnapshot> {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }
  const [accessToken, refreshToken, expiresAtRaw, userRaw] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
    getItem(EXPIRES_AT_KEY),
    getItem(USER_KEY),
  ]);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;
  let user: AuthUser | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as AuthUser;
    } catch {
      user = null;
    }
  }
  cachedSnapshot = {
    accessToken,
    refreshToken,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
    user,
  };
  return cachedSnapshot;
}

export async function saveAuthSnapshot(
  snapshot: AuthSnapshot
): Promise<AuthSnapshot> {
  cachedSnapshot = snapshot;
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, snapshot.accessToken),
    setItem(REFRESH_TOKEN_KEY, snapshot.refreshToken),
    setItem(
      EXPIRES_AT_KEY,
      snapshot.expiresAt ? String(snapshot.expiresAt) : null
    ),
    setItem(USER_KEY, snapshot.user ? JSON.stringify(snapshot.user) : null),
  ]);
  return snapshot;
}

export async function clearAuthSnapshot(): Promise<void> {
  cachedSnapshot = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null,
  };
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, null),
    setItem(REFRESH_TOKEN_KEY, null),
    setItem(EXPIRES_AT_KEY, null),
    setItem(USER_KEY, null),
  ]);
}

export async function setAuthFromResponse(
  response: AuthResponse
): Promise<AuthSnapshot> {
  const snapshot: AuthSnapshot = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000,
    user: response.user,
  };
  return saveAuthSnapshot(snapshot);
}

export async function refreshSession(): Promise<AuthSnapshot | null> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    const snapshot = await loadAuthSnapshot();
    if (!snapshot.refreshToken) {
      return null;
    }
    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: snapshot.refreshToken }),
    });
    if (!response.ok) {
      await clearAuthSnapshot();
      return null;
    }
    const data = (await response.json()) as AuthResponse;
    return await setAuthFromResponse(data);
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const snapshot = await loadAuthSnapshot();
  if (!snapshot.accessToken || !snapshot.expiresAt) {
    return null;
  }
  const now = Date.now();
  if (snapshot.expiresAt - now > 30_000) {
    return snapshot.accessToken;
  }
  const refreshed = await refreshSession();
  return refreshed?.accessToken ?? null;
}
