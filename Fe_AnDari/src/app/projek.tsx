// src/app/projek.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ GANTI IP INI dengan IP laptop kamu (cek dengan `ipconfig`)
const API_URL = "http://192.168.110.12:8000/api";
const LOCAL_PROJECTS_KEY = "@andari_local_projects";

// Tipe data disamakan dengan output form-proyek.tsx
type Project = {
  id: number | string;
  nama_proyek: string;
  bentuk_lahan: string;
  panjang_lahan: number;
  lebar_lahan: number;
  luas_lahan: number;
  region_nama?: string;
  created_at: string;
  backendOK?: boolean;
};

export default function ProjekScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch data dari Backend DAN Local Storage (Offline Mode)
  const fetchProjects = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      let allProjects: Project[] = [];

      // 1. Ambil data dari Local Storage (Hasil input form-proyek yang Offline)
      try {
        const localData = await AsyncStorage.getItem(LOCAL_PROJECTS_KEY);
        if (localData) {
          allProjects = [...JSON.parse(localData)];
        }
      } catch (e) {
        console.warn("Gagal baca local projects", e);
      }

      // 2. Ambil data dari Backend API (Jika server menyala)
      try {
        const res = await axios.get(`${API_URL}/projects/`, {
          timeout: 5000, // Timeout sebentar agar tidak kelamaan loading
        });
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data.results ?? []);

        // Gabungkan data API dengan data Lokal
        allProjects = [...data, ...allProjects];
      } catch (err: any) {
        console.log("Gagal mengambil dari server, menggunakan data lokal.");
        // Jika API gagal, kita tetap tampilkan data lokal (jika ada)
        if (allProjects.length === 0) {
          setError("Gagal terhubung ke server & belum ada proyek lokal.");
        }
      }

      setProjects(allProjects);
    } catch (err: any) {
      setError("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const onRefresh = () => {
    fetchProjects(true);
  };

  const handlePressProject = (item: Project) => {
    // Arahkan ke halaman RAB dengan membawa ID proyek
    router.push({
      pathname: "/rab",
      params: { projectId: item.id.toString() },
    });
  };

  const handleCreateNew = () => {
    router.push("/form-proyek");
  };

  const formatTanggal = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const renderItem = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePressProject(item)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.nama_proyek || "Tanpa Nama"}
        </Text>

        {/* Menampilkan data persis seperti di form-proyek */}
        <Text style={styles.cardSub}>
          {item.panjang_lahan} m × {item.lebar_lahan} m • {item.luas_lahan} m²
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardSub}>
            {item.bentuk_lahan === "kotak"
              ? "Kotak"
              : item.bentuk_lahan === "polygon-sisi"
                ? "Polygon Sisi"
                : "Polygon Bebas"}
          </Text>
          <Text style={styles.cardDate}>{formatTanggal(item.created_at)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Proyek Saya</Text>
        <Text style={styles.subtitle}>
          Riwayat rancangan yang pernah dibuat
        </Text>
      </View>

      {loading && !refreshing && (
        <ActivityIndicator
          size="large"
          color="#0F172A"
          style={{ marginTop: 40 }}
        />
      )}

      {!loading && error && projects.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={60} color="#F87171" />
          <Text style={[styles.emptyText, { color: "#B91C1C" }]}>
            Gagal memuat data
          </Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchProjects()}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && projects.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={60} color="#CBD5E1" />
          <Text style={styles.emptyText}>Belum ada proyek</Text>
          <Text style={styles.emptySub}>
            Mulai buat rancangan rumah pertamamu dengan tap tombol + di bawah
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleCreateNew}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}> Buat Proyek Baru</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && projects.length > 0 && (
        <FlatList
          data={projects}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0F172A"]}
              tintColor="#0F172A"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNew}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={26} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: "#0F172A" },
  subtitle: { color: "#64748B", marginTop: 4 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  cardSub: { color: "#64748B", fontSize: 13, marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardDate: { color: "#94A3B8", fontSize: 12 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySub: {
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 20,
  },

  retryBtn: {
    marginTop: 20,
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  retryText: { color: "white", fontWeight: "600" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: "#0F172A",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});