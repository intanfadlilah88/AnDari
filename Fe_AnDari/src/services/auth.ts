// src/services/auth.ts
import axios from "axios";
import { saveAuth, clearAuth, AuthUser } from "./storage";

// ⚠️ GANTI IP INI (pastikan sama persis dengan IPv4 di CMD laptop Anda)
const API_URL = "http://192.168.110.12:8000/api";

// ✅ PERBAIKAN 1: Buat instance Axios dengan konfigurasi khusus
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Naikkan timeout menjadi 15 detik (jaringan lokal kadang lambat)
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  // ✅ PERBAIKAN 2: Izinkan pengiriman cookie/kredensial antar origin
  withCredentials: true,
});

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  nama: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  try {
    console.log("🟢 [AUTH] Mencoba Login ke:", `${API_URL}/auth/login/`);

    // ✅ PERBAIKAN 3: Gunakan 'api.post' bukan 'axios.post'
    const res = await api.post("/auth/login/", payload);

    console.log("🟢 [AUTH] Login Sukses:", res.data);
    const { token, user } = res.data;

    if (!token || !user) throw new Error("Respons server tidak valid.");
    await saveAuth(token, user);
    return { token, user };
  } catch (error: any) {
    console.log("🔴 [AUTH] Login Gagal!");
    console.log("🔴 Detail Error:", error?.message);
    if (error?.response) {
      console.log(
        "🔴 Server Merespons:",
        error.response.status,
        error.response.data,
      );
    }
    throw error;
  }
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  try {
    console.log("🟢 [AUTH] Mencoba Register ke:", `${API_URL}/auth/register/`);

    const res = await api.post("/auth/register/", payload);

    console.log("🟢 [AUTH] Register Sukses:", res.data);
    const { token, user } = res.data;

    if (!token || !user) throw new Error("Respons server tidak valid.");
    await saveAuth(token, user);
    return { token, user };
  } catch (error: any) {
    console.log("🔴 [AUTH] Register Gagal!");
    console.log("🔴 Detail Error:", error?.message);
    if (error?.response) {
      console.log(
        "🔴 Server Merespons:",
        error.response.status,
        error.response.data,
      );
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await clearAuth();
}

export function parseAuthError(err: any): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    if (data.message) return data.message;

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      if (Array.isArray(val)) return val[0];
      if (typeof val === "string") return val;
    }
  }
  if (err?.code === "ECONNABORTED") return "Koneksi timeout. Periksa jaringan.";
  if (err?.message === "Network Error")
    return "Gagal terhubung. Pastikan Django jalan di 0.0.0.0:8000 dan IP benar.";

  return err?.message || "Terjadi kesalahan sistem.";
}