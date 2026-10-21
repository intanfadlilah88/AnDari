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

// ⚠️ GANTI IP INI dengan IP laptop kamu (cek dengan `ipconfig`)
const API_URL = "http://192.168.110.12:8000/api";

type Project = {
  id: number;
  nama_proyek: string;
  panjang_lahan: string;
  lebar_lahan: string;
  jumlah_lantai: number;
  gaya_arsitektur: string;
  created_at: string;
};

export default function ProjekScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Pakai useCallback supaya bisa dipanggil berulang tanpa re-render
  const fetchProjects = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await axios.get(`${API_URL}/projects/`, {
        timeout: 10000, // ✅ Timeout 10 detik, biar tidak nunggu selamanya
      });

      // ✅ Pastikan data yang diterima berupa array
      const data = Array.isArray(res.data)
        ? res.data
        : (res.data.results ?? []);
      setProjects(data);
    } catch (err: any) {
      console.error("Gagal ambil proyek:", err?.message);

      // ✅ Pesan error yang lebih jelas
      let pesan = "Tidak bisa terhubung ke server.";
      if (err?.code === "ECONNABORTED") {
        pesan = "Koneksi timeout. Periksa jaringan kamu.";
      } else if (err?.response?.status === 404) {
        pesan = "Endpoint /api/projects/ tidak ditemukan di server.";
      } else if (err?.response?.status >= 500) {
        pesan = "Server sedang bermasalah. Coba lagi nanti.";
      }
      setError(pesan);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ✅ Fetch pertama kali
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ✅ Handler saat user tarik layar ke bawah
  const onRefresh = () => {
    fetchProjects(true);
  };

  // ✅ Handler saat user klik item proyek
  const handlePressProject = (item: Project) => {
    router.push({
      pathname: "/rab",
      params: { projectId: item.id.toString() },
    });
  };

  // ✅ Format tanggal (opsional, biar rapi)
  const formatTanggal = (iso: string) => {
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
          {item.nama_proyek}
        </Text>
        <Text style={styles.cardSub}>
          {item.panjang_lahan}m × {item.lebar_lahan}m · {item.jumlah_lantai}{" "}
          lantai
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardSub}>{item.gaya_arsitektur}</Text>
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

      {/* 🔄 State: LOADING */}
      {loading && !refreshing && (
        <ActivityIndicator
          size="large"
          color="#0F172A"
          style={{ marginTop: 40 }}
        />
      )}

      {/* ❌ State: ERROR */}
      {!loading && error && (
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

      {/* 📭 State: KOSONG */}
      {!loading && !error && projects.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={60} color="#CBD5E1" />
          <Text style={styles.emptyText}>Belum ada proyek</Text>
          <Text style={styles.emptySub}>
            Mulai buat rancangan rumah pertamamu
          </Text>
        </View>
      )}

      {/* 📋 State: ADA DATA */}
      {!loading && !error && projects.length > 0 && (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ➕ FAB: Buat proyek baru */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/")}
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
    // shadow ringan biar terlihat modern
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
  emptySub: { color: "#64748B", marginTop: 4, textAlign: "center" },

  retryBtn: {
    marginTop: 20,
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
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
