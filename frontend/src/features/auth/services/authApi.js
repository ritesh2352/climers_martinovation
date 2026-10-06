    
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

export async function register({ email, userName, password }) {
  const response = await api.post("/api/auth/register", {
    email,
    userName,
    password,
  });
  return response.data;
}

export async function login({ email, password }) {
  const response = await api.post("/api/auth/login", { email, password });
  console.log(response.data);
  return response.data;
}

export async function logout() {
  const response = await api.get("/api/auth/logout");
  return response.data;
}

export async function getMe() {
  const response = await api.get("/api/auth/get-me");
  return response.data;
}

export async function forgotPassword({ email }) {
  const response = await api.post("/api/auth/forgot-password", { email });
  return response.data;
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const response = await api.post("/api/auth/verify-reset-otp", { email, otp });
  return response.data;
}

export async function resetPassword({ token, newPassword }) {
  const response = await api.post("/api/auth/reset-password", {
    token,
    newPassword,
  });
  return response.data;
}

export async function changePassword({ email, currentPassword, newPassword }) {
  const response = await api.post("/api/auth/change-password", {
    email,
    currentPassword,
    newPassword,
  });
  return response.data;
}