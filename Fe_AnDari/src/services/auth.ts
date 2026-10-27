// src/services/auth.ts
import axios from "axios";
import { saveAuth, clearAuth, AuthUser } from "./storage";

// ⚠️ IP ini tidak akan dipakai selama mode simulasi menyala
const API_URL = "http://192.168.110.12:8000/api";

// ✅ KUNCI SIMULASI: Ubah ini menjadi 'true' agar tidak butuh server Django
const USE_MOCK_API = true;

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { email: string; password: string; nama: string };
export type AuthResponse = { token: string; user: AuthUser };

// ============================================
// FUNGSI SIMULASI (MOCK)
// ============================================
async function mockLogin(payload: LoginPayload): Promise<AuthResponse> {
  console.log("🟡 [MOCK] Simulasi Login...");
  await new Promise((resolve) => setTimeout(resolve, 800)); // Pura-pura loading 0.8 detik

  const dummyUser: AuthUser = {
    id: 1,
    email: payload.email,
    nama: "User Simulasi",
  };
  const dummyToken = "simulasi-token-12345";

  await saveAuth(dummyToken, dummyUser);
  return { token: dummyToken, user: dummyUser };
}

async function mockRegister(payload: RegisterPayload): Promise<AuthResponse> {
  console.log("🟡 [MOCK] Simulasi Registrasi...");
  await new Promise((resolve) => setTimeout(resolve, 800));

  const dummyUser: AuthUser = {
    id: Date.now(),
    email: payload.email,
    nama: payload.nama,
  };
  const dummyToken = "simulasi-token-12345";

  await saveAuth(dummyToken, dummyUser);
  return { token: dummyToken, user: dummyUser };
}

// ============================================
// FUNGSI ASLI (API)
// ============================================
const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: true,
});

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  if (USE_MOCK_API) return mockLogin(payload);

  // Kode asli di bawah ini hanya jalan jika USE_MOCK_API = false
  try {
    console.log("🟢 [API] Mencoba Login ke:", `${API_URL}/auth/login/`);
    const res = await api.post("/auth/login/", payload);
    const { token, user } = res.data;
    if (!token || !user) throw new Error("Respons server tidak valid.");
    await saveAuth(token, user);
    return { token, user };
  } catch (error: any) {
    console.log("🔴 [API] Login Gagal:", error?.message);
    throw error;
  }
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  if (USE_MOCK_API) return mockRegister(payload);

  try {
    console.log("🟢 [API] Mencoba Register ke:", `${API_URL}/auth/register/`);
    const res = await api.post("/auth/register/", payload);
    const { token, user } = res.data;
    if (!token || !user) throw new Error("Respons server tidak valid.");
    await saveAuth(token, user);
    return { token, user };
  } catch (error: any) {
    console.log("🔴 [API] Register Gagal:", error?.message);
    throw error;
  }
}

export async function logout(): Promise<void> {
  await clearAuth();
}

export function parseAuthError(err: any): string {
  return err?.message || "Terjadi kesalahan sistem.";
}