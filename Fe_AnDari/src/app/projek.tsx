// src/app/projek.tsx
import React, { useState, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";

// ✅ IMPORT FUNGSI DATABASE LOKAL (SQLite)
import { ambilSemuaProyek, hapusProyek } from "../db";

// Tipe data disesuaikan dengan struktur tabel SQLite
type Project = {
  id: number;
  nama_proyek: string;
  dimensi: string;
  tipe: string;
  data_desain: string;
  tanggal_dibuat: string;
};

export default function ProjekScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Fetch data dari SQLite Lokal
  const fetchProjects = useCallback((isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = ambilSemuaProyek() as Project[];
      setProjects(data);
    } catch (err) {
      console.error("Gagal mengambil proyek lokal:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ✅ Refresh otomatis saat halaman dibuka
  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects]),
  );

  const onRefresh = () => {
    fetchProjects(true);
  };

  // ============================================
  // HANDLER: BUKA & EDIT PROYEK
  // ============================================
  const handlePressProject = (item: Project) => {
    try {
      // Parse data desain dari SQLite (jika ada)
      const dataDesain = item.data_desain ? JSON.parse(item.data_desain) : {};

      // Ekstrak panjang dan lebar dari string dimensi (misal: "12m x 7m")
      const dimensiSplit = item.dimensi.replace(/m/g, "").split("x");
      const panjang = parseFloat(dimensiSplit[0]?.trim()) || 0;
      const lebar = parseFloat(dimensiSplit[1]?.trim()) || 0;

      // ✅ Lempar ke halaman Grid Denah untuk diedit
      router.push({
        pathname: "/grid-denah",
        params: {
          projectId: item.id.toString(),
          buildingId: "local",
          namaProyek: item.nama_proyek,
          panjang: panjang.toString(),
          lebar: lebar.toString(),
          regionId: "local_region",
          backendOK: "false",
          // Data lahan (bentuk, polygon, bbox)
          dataLahan: JSON.stringify({
            bentuk: item.tipe.toLowerCase().replace(" ", "-"),
            panjang: panjang,
            lebar: lebar,
            luas: panjang * lebar,
            polygon: dataDesain.lahanPolygon || null,
            bbox: dataDesain.lahanPolygon
              ? { minX: 0, minY: 0, maxX: panjang, maxY: lebar }
              : { minX: 0, minY: 0, maxX: panjang || 20, maxY: lebar || 20 },
          }),
          // Data ruangan, dinding, dan area yang sudah pernah digambar
          savedRooms: JSON.stringify(dataDesain.rooms || []),
          savedWalls: JSON.stringify(dataDesain.walls || []),
          savedAreas: JSON.stringify(dataDesain.areas || []),
        },
      });
    } catch (error) {
      Alert.alert("Error", "Gagal membuka detail proyek.");
      console.error(error);
    }
  };

  // ============================================
  // HANDLER: HAPUS PROYEK
  // ============================================
  const handleDeleteProject = (item: Project) => {
    Alert.alert(
      "Hapus Proyek",
      `Apakah Anda yakin ingin menghapus proyek "${item.nama_proyek}" secara permanen?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            try {
              hapusProyek(item.id);
              fetchProjects(); // Refresh list setelah dihapus
            } catch (error) {
              Alert.alert("Error", "Gagal menghapus proyek.");
            }
          },
        },
      ],
    );
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
      onLongPress={() => handleDeleteProject(item)} // ✅ Tekan lama untuk hapus
      activeOpacity={0.7}
      delayLongPress={400}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.nama_proyek || "Tanpa Nama"}
        </Text>

        <Text style={styles.cardSub}>{item.dimensi}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardSub}>{item.tipe}</Text>
          <Text style={styles.cardDate}>
            {formatTanggal(item.tanggal_dibuat)}
          </Text>
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

      {!loading && projects.length === 0 && (
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
          keyExtractor={(item) => item.id.toString()}
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
