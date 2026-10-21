export const API_HOST = "192.168.110.120";
export const API_PORT = "8000";

// URL lengkap ke backend (auto-generate)
export const API_URL = `http://${API_HOST}:${API_PORT}/api`;

// ============================================
// KONFIGURASI APP
// ============================================
export const APP_NAME = "AnDari";
export const APP_VERSION = "1.0.0";

// Timeout untuk request API (dalam milidetik)
export const API_TIMEOUT = 10000;

// ============================================
// DEBUG: Print URL saat aplikasi jalan
// ============================================
if (__DEV__) {
  console.log("🔵 API_URL:", API_URL);
  console.log("🔵 API_HOST:", API_HOST);
  console.log("🔵 API_PORT:", API_PORT);
}
