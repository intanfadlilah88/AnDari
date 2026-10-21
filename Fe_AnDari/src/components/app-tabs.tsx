// src/components/app-tabs.tsx

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_BASE_HEIGHT = 60;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#EA580C",
        tabBarInactiveTintColor: "#334155",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginBottom: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* ============================================================ */}
      {/* TAB YANG TAMPIL DI BOTTOM BAR */}
      {/* ============================================================ */}

      {/* 🏠 HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* 📁 PROJEK */}
      <Tabs.Screen
        name="projek"
        options={{
          title: "Projek",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "folder" : "folder-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* 🧭 EXPLORE */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />

      {/* ============================================================ */}
      {/* ROUTE TERSEMBUNYI — hanya diakses via router.push */}
      {/* ⚠️ HANYA daftarkan yang file-nya SUDAH ADA di src/app/ */}
      {/* ============================================================ */}

      <Tabs.Screen name="form-proyek" options={{ href: null }} />

      <Tabs.Screen name="grid-denah" options={{ href: null }} />

      <Tabs.Screen name="rab" options={{ href: null }} />
    </Tabs>
  );
}
