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
import { Stack } from "expo-router"; // ✅ Tambahkan import Stack

import { AnimatedSplashOverlay } from "../components/animated-icon";
import AppTabs from "../components/app-tabs";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import { getToken, saveAuth } from "../services/storage";

SplashScreen.preventAutoHideAsync().catch(() => {});

// ============================================
// CUSTOM THEME
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
// ROOT LAYOUT
// ============================================
export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

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

  const handleBypassLogin = async (newToken: string) => {
    await saveAuth(newToken, {
      id: 0,
      email: "admin@andari.com",
      nama: "Admin",
    });
    setToken(newToken);
  };

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

  // TAMPILAN JIKA BELUM LOGIN
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
                onBypassLogin={handleBypassLogin}
              />
            )}
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // TAMPILAN JIKA SUDAH LOGIN (MENGGUNAKAN STACK NAVIGATOR)
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme}
        >
          <AnimatedSplashOverlay />

          {/* ✅ PERBAIKAN: Bungkus AppTabs dengan Stack agar bisa navigasi ke halaman lain */}
          <Stack screenOptions={{ headerShown: false }}>
            {/* Layar Utama (Tab) */}
            <Stack.Screen name="index" />

            {/* Layar Tujuan Navigasi */}
            <Stack.Screen name="form-proyek" />
            <Stack.Screen name="grid-denah" />
            <Stack.Screen name="viewer-3d" />
            <Stack.Screen name="rab" />
            <Stack.Screen name="projek" />
            <Stack.Screen name="explore" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
});