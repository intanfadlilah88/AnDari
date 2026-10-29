// src/app/index.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ============================================
// DATA ALUR APLIKASI
// (id tetap ada untuk key React, tapi tidak ditampilkan)
// ============================================
const ALUR_APLIKASI = [
  {
    id: "01",
    title: "Luas Tanah",
    desc: "Atur lebar, panjang, bentuk lahan, dan lokasi.",
    icon: "home-outline",
    route: "/form-proyek",
    color: "#F59E0B",
  },
  {
    id: "02",
    title: "Denah 2D",
    desc: "Susun tata letak ruangan di atas grid meter.",
    icon: "grid-outline",
    route: "/grid-denah",
    color: "#3B82F6",
  },
  {
    id: "03",
    title: "Tampilan 3D",
    desc: "Lihat visualisasi bentuk rumah dari berbagai sisi.",
    icon: "cube-outline",
    route: "/viewer-3d",
    color: "#8B5CF6",
  },
  {
    id: "04",
    title: "Daerah & RAB",
    desc: "Estimasi harga bahan, upah, dan total biaya.",
    icon: "calculator-outline",
    route: "/rab",
    color: "#10B981",
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================ */}
        {/* HERO SECTION                                 */}
        {/* ============================================ */}
        <View style={styles.heroSection}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <SafeAreaView edges={["top"]}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="business" size={28} color="#F5A623" />
                <Text style={styles.headerTitle}>AnDari</Text>
              </View>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                Desain Rumahmu,{"\n"}Hitung Estimasi{" "}
                <Text style={styles.heroHighlight}>RAB</Text>-nya!
              </Text>
              <Text style={styles.heroDescription}>
                Rancang rumah impian mulai dari ukuran tanah, susun denah 2D,
                lihat visualisasi 3D, hingga estimasi biaya pembangunan.
              </Text>
            </View>
          </SafeAreaView>
        </View>

        {/* ============================================ */}
        {/* ALUR APLIKASI (TANPA ANGKA)                  */}
        {/* ============================================ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alur Aplikasi</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4 Langkah</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Ketuk pada salah satu langkah di bawah untuk memulai.
          </Text>

          <View style={styles.cardsContainer}>
            {ALUR_APLIKASI.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={item.color}
                  />
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    {/* ✅ Hanya Menampilkan Judul, Angka Dihilangkan */}
                    <Text style={styles.cardTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>

                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ============================================ */}
        {/* FOOTER INFO PEMBUAT & PEMILIK                */}
        {/* ============================================ */}
        <View style={styles.footerSection}>
          <View style={styles.footerCard}>
            <View style={styles.footerHeader}>
              <Ionicons name="code-slash" size={20} color="#EA580C" />
              <Text style={styles.footerHeaderText}>Tim Pengembang</Text>
            </View>

            <View style={styles.teamContainer}>
              <View style={styles.teamBadge}>
                <Ionicons name="school-outline" size={16} color="#64748B" />
                <Text style={styles.teamBadgeText}>Mahasiswa Magang UTDI</Text>
              </View>
              <Text style={styles.teamSubText}>
                Universitas Teknologi Digital Indonesia
              </Text>

              <View style={styles.memberList}>
                <View style={styles.memberItem}>
                  <View
                    style={[styles.memberDot, { backgroundColor: "#3B82F6" }]}
                  />
                  <Text style={styles.memberName}>Intan Fadlilah</Text>
                </View>
                <View style={styles.memberItem}>
                  <View
                    style={[styles.memberDot, { backgroundColor: "#F59E0B" }]}
                  />
                  <Text style={styles.memberName}>
                    Setiawan Rizki Putra Wicaksono
                  </Text>
                </View>
                <View style={styles.memberItem}>
                  <View
                    style={[styles.memberDot, { backgroundColor: "#10B981" }]}
                  />
                  <Text style={styles.memberName}>Yoanita Ersyputri</Text>
                </View>
              </View>
            </View>

            <View style={styles.footerDivider} />

            <View style={styles.ownerContainer}>
              <View style={styles.ownerIcon}>
                <Ionicons name="business" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerLabel}>Pemilik Aplikasi</Text>
                <Text style={styles.ownerName}>PUPR</Text>
                <Text style={styles.ownerSub}>
                  Kementerian Pekerjaan Umum dan Perumahan Rakyat
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.copyright}>
            © {new Date().getFullYear()} AnDari · Dibuat dengan ❤️ untuk
            Indonesia
          </Text>
        </View>
      </ScrollView>

      {/* ============================================ */}
      {/* BOTTOM NAVIGATION BAR                        */}
      {/* ============================================ */}
      <View style={styles.bottomNavWrapper} pointerEvents="box-none">
        <View style={styles.bottomNavBar}>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => router.replace("/")}
            activeOpacity={0.8}
          >
            <View style={styles.activeIndicator} />
            <Ionicons name="home" size={26} color="#EA580C" />
            <Text style={styles.bottomNavText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // ============ HERO ============
  heroSection: {
    backgroundColor: "#1A2B4C",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 40,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -80,
    left: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(245, 166, 35, 0.08)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: "#F5A623",
  },
  heroDescription: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: "95%",
  },

  // ============ SECTION ============
  sectionContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  stepBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 20,
  },

  // ============ CARDS ============
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ============ FOOTER ============
  footerSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  footerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  footerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  footerHeaderText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  teamContainer: {
    marginBottom: 16,
  },
  teamBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  teamSubText: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
    marginBottom: 12,
  },
  memberList: {
    gap: 8,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  ownerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ownerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
  },
  ownerLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EA580C",
    letterSpacing: -0.3,
  },
  ownerSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  copyright: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 24,
    marginBottom: 8,
    fontWeight: "500",
  },

  // ============ BOTTOM NAV ============
  bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    pointerEvents: "box-none",
  },
  bottomNavBar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  activeIndicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#EA580C",
  },
  bottomNavText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
    marginTop: 2,
  },
});
