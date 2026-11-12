// src/app/rab.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ✅ IMPORT FUNGSI DATABASE LOKAL
import { ambilDetailProyek } from "../db";

export default function RabScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      // ✅ Ambil data dari SQLite lokal berdasarkan ID yang diklik dari halaman projek
      const data = ambilDetailProyek(Number(projectId));
      setProject(data);
    }
    setLoading(false);
  }, [projectId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="#F87171" />
        <Text style={styles.errorText}>
          Data proyek tidak ditemukan di HP ini.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Proyek</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* KARTU INFORMASI PROYEK */}
        <View style={styles.card}>
          <Text style={styles.label}>Nama Proyek:</Text>
          <Text style={styles.value}>{project.nama_proyek}</Text>

          <Text style={styles.label}>Dimensi Lahan:</Text>
          <Text style={styles.value}>{project.dimensi}</Text>

          <Text style={styles.label}>Bentuk Lahan:</Text>
          <Text style={styles.value}>{project.tipe}</Text>

          <Text style={styles.label}>Terakhir Diubah:</Text>
          <Text style={styles.value}>
            {new Date(project.tanggal_dibuat).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* KARTU DATA DESAIN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Data Denah Tersimpan</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {project.data_desain?.rooms?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Ruangan</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {project.data_desain?.walls?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Dinding</Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            *Data ini dibaca langsung dari memori HP Anda tanpa internet.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    color: "#B91C1C",
    fontWeight: "bold",
    textAlign: "center",
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: { color: "white", fontWeight: "bold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  content: { padding: 20, gap: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: { fontSize: 12, color: "#64748B", marginBottom: 4, marginTop: 8 },
  value: { fontSize: 16, fontWeight: "600", color: "#0F172A", marginBottom: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statBox: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 32, fontWeight: "900", color: "#EA580C" },
  statLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 4,
  },
  statDivider: { width: 1, height: 40, backgroundColor: "#E2E8F0" },
});
