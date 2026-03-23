import api from "./axios";
import type { LoginResponse, MeResponse } from "../types/auth";

export const loginRequest = async (username: string, password: string) => {
  const response = await api.post<LoginResponse>("/api/admin/auth/login/", {
    username,
    password,
  });
  return response.data;
};

export const refreshRequest = async (refresh: string) => {
  const response = await api.post<{ access: string }>("/api/admin/auth/refresh/", {
    refresh,
  });
  return response.data;
};

export const meRequest = async () => {
  const response = await api.get<MeResponse>("/api/admin/auth/me/");
  return response.data;
};