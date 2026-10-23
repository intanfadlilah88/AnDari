// src/services/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@andari_token";
const USER_KEY = "@andari_user";

export type AuthUser = {
  id: number;
  email: string;
  nama: string;
  username?: string;
};

// Fungsi untuk menyimpan token dan data user setelah login/register sukses
export async function saveAuth(token: string, user: AuthUser) {
  try {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
  } catch (error) {
    console.error("Gagal menyimpan data auth:", error);
  }
}

// Fungsi untuk mengambil token (dipakai di _layout.tsx untuk cek apakah sudah login)
export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Fungsi untuk mengambil data user
export async function getUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Fungsi untuk menghapus token dan user (dipakai saat Logout)
export async function clearAuth() {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.error("Gagal menghapus data auth:", error);
  }
}
