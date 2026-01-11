import { request } from "./client";
import type {
  AuthResponse,
  DeleteAccountRequest,
  GoogleLoginRequest,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
} from "./types";

export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/v1/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/v1/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function loginWithGoogle(
  payload: GoogleLoginRequest
): Promise<AuthResponse> {
  return request<AuthResponse>("/v1/auth/google", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function refreshAuth(payload: RefreshRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/v1/auth/refresh", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function logout(payload: LogoutRequest): Promise<void> {
  return request<void>("/v1/auth/logout", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function deleteAccount(payload?: DeleteAccountRequest): Promise<void> {
  return request<void>("/v1/auth/account", {
    method: "DELETE",
    body: payload,
  });
}
