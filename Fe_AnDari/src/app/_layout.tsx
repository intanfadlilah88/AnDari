// src/app/_layout.tsx

import "react-native-gesture-handler";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";

import * as SplashScreen from "expo-splash-screen";
import {
  useColorScheme,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// ✅ PERBAIKAN: Gunakan satu titik (../) untuk mundur ke folder src
import { AnimatedSplashOverlay } from "../components/animated-icon";
import AppTabs from "../components/app-tabs";

// ✅ PERBAIKAN: Gunakan satu titik (../) untuk mundur ke folder src
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import { getToken } from "../services/storage";

// Cegah splash screen auto-hide
SplashScreen.preventAutoHideAsync().catch(() => {});

// ============================================
// CUSTOM LIGHT THEME
// ============================================
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    border: "#E2E8F0",
    primary: "#0F172A",
    notification: "#EA580C",
  },
};

// ============================================
// CUSTOM DARK THEME
// ============================================
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0F172A",
    card: "#1E293B",
    text: "#F8FAFC",
    border: "#334155",
    primary: "#F59E0B",
    notification: "#EA580C",
  },
};

// ============================================
// ROOT LAYOUT (DENGAN AUTH STATE)
// ============================================
export default function RootLayout() {
  const colorScheme = useColorScheme();

  // State untuk cek login
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // Cek token saat pertama kali dibuka
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    const savedToken = await getToken();
    setToken(savedToken);
    setIsLoading(false);
  };

  // Loading Screen (menunggu AsyncStorage)
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  // Jika BELUM LOGIN -> Tampilkan Login / Register
  if (!token) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme}
          >
            {showRegister ? (
              <RegisterScreen
                onBack={() => setShowRegister(false)}
                onSuccessLogin={(newToken) => setToken(newToken)}
              />
            ) : (
              <LoginScreen
                onGoToRegister={() => setShowRegister(true)}
                onSuccessLogin={(newToken) => setToken(newToken)}
              />
            )}
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Jika SUDAH LOGIN -> Tampilkan Aplikasi Utama (AppTabs)
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme}
        >
          <AnimatedSplashOverlay />
          <AppTabs />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
});