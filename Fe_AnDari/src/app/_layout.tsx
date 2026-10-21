// src/app/_layout.tsx

import "react-native-gesture-handler";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";

import * as SplashScreen from "expo-splash-screen";
import { useColorScheme, StyleSheet } from "react-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context"; // ✅ dipakai

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

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
// ROOT LAYOUT
// ============================================
export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* ✅ SafeAreaProvider WAJIB untuk useSafeAreaInsets */}
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