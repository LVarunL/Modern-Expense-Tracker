import { request } from "./client";
import type {
  AuthResponse,
  DeleteAccountRequest,
  ForgotPasswordConfirmRequest,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  LogoutRequest,
  MessageResponse,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordConfirmRequest,
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

export function forgotPassword(
  payload: ForgotPasswordRequest
): Promise<MessageResponse> {
  return request<MessageResponse>("/v1/auth/forgot-password", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function confirmForgotPassword(
  payload: ForgotPasswordConfirmRequest
): Promise<void> {
  return request<void>("/v1/auth/forgot-password/confirm", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function requestResetPassword(): Promise<MessageResponse> {
  return request<MessageResponse>("/v1/auth/reset-password/request", {
    method: "POST",
  });
}

export function confirmResetPassword(
  payload: ResetPasswordConfirmRequest
): Promise<void> {
  return request<void>("/v1/auth/reset-password/confirm", {
    method: "POST",
    body: payload,
  });
}
