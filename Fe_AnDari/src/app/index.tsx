// src/app/index.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ============================================
// DATA ALUR APLIKASI (Dengan tujuan Navigasi)
// ============================================
const ALUR_APLIKASI = [
  {
    id: "01",
    title: "Luas tanah",
    desc: "Lebar, panjang, bentuk lahan, lokasi",
    icon: "home-outline",
    route: "/form-proyek", // Mengarah ke input data proyek/lahan
  },
  {
    id: "02",
    title: "Denah 2D",
    desc: "Susun ruangan di atas grid meter",
    icon: "grid-outline",
    route: "/grid-denah", // Mengarah ke halaman grid denah
  },
  {
    id: "03",
    title: "Tampilan 3D",
    desc: "Lihat bentuk rumah dari berbagai sisi",
    icon: "cube-outline",
    route: "/viewer-3d", // Mengarah ke halaman 3D
  },
  {
    id: "04",
    title: "Daerah & RAB",
    desc: "Estimasi harga bahan, toko, upah, alat, total",
    icon: "calculator-outline",
    route: "/rab", // Mengarah ke halaman RAB
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AnDari</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroSubtitle}>AnDari</Text>
          <Text style={styles.heroTitle}>
            Desain Rumahmu,{"\n"}Hitung Estimasi RAB-nya!
          </Text>
          <Text style={styles.heroDescription}>
            Rancang rumah impianmu mulai dari ukuran tanah, susun denah 2D,
            lihat bentuk rumah 3D, lalu hitung estimasi biaya pembagunannya
            dengan mudah bersama AnDari.
          </Text>
        </View>

        {/* Alur Aplikasi */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Alur aplikasi</Text>
          <Text style={styles.sectionSubtitle}>
            Ketuk pada salah satu langkah di bawah untuk mulai.
          </Text>

          {ALUR_APLIKASI.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardNumber}>{item.id}</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1A2B4C",
  },

  scrollContent: {
    paddingBottom: 120,
    backgroundColor: "#F3F4F6",
    flexGrow: 1,
  },

  // ============ HEADER ============
  header: {
    backgroundColor: "#1A2B4C",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  settingsButton: { padding: 5 },

  // ============ HERO ============
  heroSection: {
    backgroundColor: "#1A2B4C",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroSubtitle: {
    color: "#F5A623",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
    marginBottom: 12,
  },
  heroDescription: {
    color: "#D1D5DB",
    fontSize: 14,
    lineHeight: 20,
  },

  // ============ SECTION ============
  sectionContainer: {
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },

  // ============ CARD ============
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F5A623",
    marginRight: 16,
    width: 40,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
  },
});
