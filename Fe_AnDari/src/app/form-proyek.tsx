// src/app/form-proyek.tsx

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";

import { REGIONS, RegionOption } from "../constants/regions";
import { API_URL, API_TIMEOUT } from "../constants/config";

// ============================================
// TIPE BENTUK LAHAN
// ============================================
type BentukLahan = "kotak" | "polygon-sisi" | "polygon-bebas";

// ============================================
// SISI POLYGON
// ============================================
type ArahMataAngin = "utara" | "timur" | "selatan" | "barat";

type SisiLahan = {
  id: string;
  panjang: number;
  arah: ArahMataAngin;
};

const ARAH_LIST: {
  key: ArahMataAngin;
  label: string;
  icon: string;
  derajat: number;
}[] = [
  { key: "utara", label: "Utara", icon: "arrow-up", derajat: 90 },
  { key: "timur", label: "Timur", icon: "arrow-forward", derajat: 0 },
  { key: "selatan", label: "Selatan", icon: "arrow-down", derajat: 270 },
  { key: "barat", label: "Barat", icon: "arrow-back", derajat: 180 },
];

// ============================================
// HELPER: KONVERSI SISI → POLYGON
// TIDAK auto-close. Skia akan close via "Z".
// ============================================
function sisiKePolygon(sisiList: SisiLahan[]): { x: number; y: number }[] {
  let x = 0;
  let y = 0;
  const points: { x: number; y: number }[] = [{ x, y }];

  for (const sisi of sisiList) {
    const arah = ARAH_LIST.find((a) => a.key === sisi.arah);
    if (!arah) continue;
    const rad = (arah.derajat * Math.PI) / 180;
    x += sisi.panjang * Math.cos(rad);
    y += sisi.panjang * Math.sin(rad);
    points.push({ x, y });
  }

  return points;
}

// ============================================
// HELPER: HITUNG SISI PENUTUP OTOMATIS
// ============================================
function hitungSisiPenutup(sisiList: SisiLahan[]) {
  let x = 0;
  let y = 0;
  for (const sisi of sisiList) {
    const arah = ARAH_LIST.find((a) => a.key === sisi.arah);
    if (!arah) continue;
    const rad = (arah.derajat * Math.PI) / 180;
    x += sisi.panjang * Math.cos(rad);
    y += sisi.panjang * Math.sin(rad);
  }

  const dx = -x;
  const dy = -y;
  const panjang = Math.hypot(dx, dy);

  if (panjang < 0.1) {
    return {
      perlu: false,
      panjang: 0,
      arah: "barat" as ArahMataAngin,
      pesan: "Polygon sudah tertutup sempurna!",
    };
  }

  let arah: ArahMataAngin;
  if (Math.abs(dx) > Math.abs(dy)) {
    arah = dx > 0 ? "timur" : "barat";
  } else {
    arah = dy > 0 ? "utara" : "selatan";
  }

  return {
    perlu: true,
    panjang: Math.round(panjang * 100) / 100,
    arah,
    pesan: `Sisi penutup otomatis: ${panjang.toFixed(2)}m arah ${arah.toUpperCase()}`,
  };
}

// ============================================
// HELPER: LUAS POLYGON (SHOELACE — MODULO VERSION)
// ============================================
function luasPolygon(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  let luas = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    luas += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(luas) / 2;
}

// ============================================
// HELPER: BOUNDING BOX
// ============================================
function boundingBox(points: { x: number; y: number }[]) {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// ============================================
// KOMPONEN UTAMA
// ============================================
export default function FormProyekScreen() {
  const router = useRouter();

  // ==== STATE PROYEK ====
  const [namaProyek, setNamaProyek] = useState("");
  const [bentukLahan, setBentukLahan] = useState<BentukLahan>("kotak");

  // ==== STATE DIMENSI KOTAK — DEFAULT 0 ====
  const [panjang, setPanjang] = useState(0);
  const [lebar, setLebar] = useState(0);

  // ==== STATE POLYGON — DEFAULT 3 SISI DENGAN PANJANG 0 ====
  const [sisiList, setSisiList] = useState<SisiLahan[]>([
    { id: "s1", panjang: 0, arah: "utara" },
    { id: "s2", panjang: 0, arah: "timur" },
    { id: "s3", panjang: 0, arah: "selatan" },
    { id: "s4", panjang: 0, arah: "barat" },
  ]);

  // ==== STATE LOKASI ====
  const [selectedRegion, setSelectedRegion] = useState<RegionOption | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // HITUNG LUAS
  // ============================================
  const totalLuas = useMemo(() => {
    if (bentukLahan === "kotak") {
      const luas = panjang * lebar;
      return Math.round(luas * 100) / 100;
    }
    if (bentukLahan === "polygon-sisi") {
      const points = sisiKePolygon(sisiList);
      return Math.round(luasPolygon(points) * 100) / 100;
    }
    // polygon-bebas: akan digambar di grid-denah
    return 0;
  }, [bentukLahan, panjang, lebar, sisiList]);

  const areaBangun = Math.round(totalLuas * 0.6);

  // ============================================
  // HITUNG POLYGON, BBOX, SISI PENUTUP
  // ============================================
  const polygonPoints = useMemo(() => {
    if (bentukLahan !== "polygon-sisi") return null;
    return sisiKePolygon(sisiList);
  }, [bentukLahan, sisiList]);

  const bbox = useMemo(() => {
    if (!polygonPoints || polygonPoints.length < 3) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    return boundingBox(polygonPoints);
  }, [polygonPoints]);

  const sisiPenutup = useMemo(() => {
    if (bentukLahan === "kotak") {
      return {
        perlu: false,
        panjang: 0,
        arah: "barat" as ArahMataAngin,
        pesan: "",
      };
    }
    return hitungSisiPenutup(sisiList);
  }, [bentukLahan, sisiList]);

  // ============================================
  // FILTER REGION
  // ============================================
  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return REGIONS;
    const q = searchQuery.toLowerCase();
    return REGIONS.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.provinsi.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // ============================================
  // HANDLER SISI
  // ============================================
  const tambahSisi = () => {
    setSisiList((prev) => [
      ...prev,
      { id: `s${Date.now()}`, panjang: 0, arah: "timur" },
    ]);
  };

  const hapusSisi = (id: string) => {
    if (sisiList.length <= 3) {
      Alert.alert("Minimal 3 Sisi", "Polygon butuh minimal 3 sisi.");
      return;
    }
    setSisiList((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSisi = (id: string, patch: Partial<SisiLahan>) => {
    setSisiList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  // ============================================
  // PILIH REGION
  // ============================================
  const handleSelectRegion = (region: RegionOption) => {
    setSelectedRegion(region);
    setModalVisible(false);
    setSearchQuery("");
  };

  // ============================================
  // TEST KONEKSI
  // ============================================
  const testKoneksi = async (): Promise<boolean> => {
    try {
      console.log("🔵 Test koneksi ke:", `${API_URL}/regions/`);
      await axios.get(`${API_URL}/regions/`, { timeout: 5000 });
      console.log("🟢 Koneksi ke backend berhasil!");
      return true;
    } catch (err: any) {
      console.error("🔴 Test koneksi GAGAL:", err?.message);
      return false;
    }
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async () => {
    // ============ VALIDASI ============
    if (!namaProyek.trim()) {
      Alert.alert("Validasi", "Nama proyek wajib diisi.");
      return;
    }
    if (!selectedRegion) {
      Alert.alert("Validasi", "Pilih lokasi/daerah terlebih dahulu.");
      return;
    }

    if (bentukLahan === "kotak") {
      if (panjang <= 0 || lebar <= 0) {
        Alert.alert(
          "Validasi",
          "Panjang & lebar harus lebih dari 0. Isi dimensi lahan terlebih dahulu.",
        );
        return;
      }
    } else if (bentukLahan === "polygon-sisi") {
      if (sisiList.length < 3) {
        Alert.alert("Validasi", "Polygon butuh minimal 3 sisi.");
        return;
      }
      const adaSisiKosong = sisiList.some((s) => s.panjang <= 0);
      if (adaSisiKosong) {
        Alert.alert(
          "Validasi",
          "Semua sisi harus memiliki panjang lebih dari 0.",
        );
        return;
      }
      // Cek apakah polygon bisa ditutup (sisi penutup tidak terlalu panjang)
      const cek = hitungSisiPenutup(sisiList);
      if (cek.perlu && cek.panjang > 50) {
        Alert.alert(
          "Validasi",
          "Polygon terlalu jauh dari titik awal. Periksa kembali arah & panjang sisi.",
        );
        return;
      }
    } else if (bentukLahan === "polygon-bebas") {
      // Tidak perlu validasi dimensi — digambar di grid-denah
    }

    try {
      setSubmitting(true);

      let projectId = `local-${Date.now()}`;
      let buildingId = `local-${Date.now()}`;
      let backendOK = false;

      // ============ HITUNG DATA LAHAN (SATU KALI SAJA) ============
      let bentukFinal: BentukLahan = bentukLahan;
      let panjangFinal = 0;
      let lebarFinal = 0;
      let polygonFinal: { x: number; y: number }[] | null = null;
      let bboxFinal = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      let luasFinal = 0;

      if (bentukLahan === "kotak") {
        panjangFinal = panjang;
        lebarFinal = lebar;
        polygonFinal = null;
        bboxFinal = { minX: 0, minY: 0, maxX: panjang, maxY: lebar };
        luasFinal = Math.round(panjang * lebar * 100) / 100;
      } else if (bentukLahan === "polygon-sisi") {
        // Ambil polygon asli
        const rawPoly = sisiKePolygon(sisiList);

        // Hapus duplikat close point jika ada
        const first = rawPoly[0];
        const last = rawPoly[rawPoly.length - 1];
        const jarak = Math.hypot(last.x - first.x, last.y - first.y);
        const polygonClean = jarak < 0.01 ? rawPoly.slice(0, -1) : rawPoly;

        // Hitung bbox dari polygon asli
        const bb = boundingBox(polygonClean);

        // ❌ JANGAN normalize polygon — kirim koordinat asli
        polygonFinal = polygonClean;

        bboxFinal = {
          minX: bb.minX,
          minY: bb.minY,
          maxX: bb.maxX,
          maxY: bb.maxY,
        };

        // Fallback params: ukuran bbox
        panjangFinal = Math.round((bb.maxX - bb.minX) * 100) / 100;
        lebarFinal = Math.round((bb.maxY - bb.minY) * 100) / 100;

        luasFinal = Math.round(luasPolygon(polygonClean) * 100) / 100;
      } else {
        // polygon-bebas: placeholder, digambar di grid-denah
        bentukFinal = "polygon-bebas";
        panjangFinal = 20;
        lebarFinal = 20;
        polygonFinal = null;
        bboxFinal = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
        luasFinal = 400;
      }

      // ============ CONSTRUCT DATA LAHAN ============
      const dataLahan = {
        bentuk: bentukFinal,
        panjang: panjangFinal,
        lebar: lebarFinal,
        polygon: polygonFinal,
        bbox: bboxFinal,
        luas: luasFinal,
      };

      console.log("🟢 [FORM] Data lahan dikirim:", JSON.stringify(dataLahan));

      // ============ SIMPAN KE BACKEND ============
      const ok = await testKoneksi();
      backendOK = ok;

      if (!ok) {
        console.warn("🟡 Backend tidak tersedia. Lanjut mode offline.");
      }

      if (backendOK) {
        try {
          const payloadProject = {
            nama_proyek: namaProyek.trim(),
            panjang_lahan: panjangFinal,
            lebar_lahan: lebarFinal,
            region: selectedRegion.id,
            bentuk_lahan: bentukFinal,
            polygon: polygonFinal ? JSON.stringify(polygonFinal) : null,
            luas_lahan: luasFinal,
          };

          console.log("🔵 POST /projects/:", payloadProject);

          const projectRes = await axios.post(
            `${API_URL}/projects/`,
            payloadProject,
            { timeout: API_TIMEOUT },
          );

          projectId = projectRes.data.id.toString();
          console.log("🟢 Project dibuat, ID:", projectId);

          const buildingRes = await axios.post(
            `${API_URL}/buildings/`,
            { project: projectId, nama: "Bangunan Utama" },
            { timeout: API_TIMEOUT },
          );

          buildingId = buildingRes.data.id.toString();
          console.log("🟢 Building dibuat, ID:", buildingId);

          const floorRes = await axios.post(
            `${API_URL}/floors/`,
            { building: buildingId, level: 1, tinggi_dinding: 3.0 },
            { timeout: API_TIMEOUT },
          );
          console.log("🟢 Floor dibuat, ID:", floorRes.data.id);
        } catch (submitErr: any) {
          console.error("🔴 Gagal simpan ke server:", submitErr?.message);
          backendOK = false;
        }
      }

      if (!backendOK) {
        Alert.alert(
          "⚠️ Mode Offline",
          `Tidak bisa terhubung ke server.\n\nData akan disimpan sementara di HP.`,
          [{ text: "OK, Lanjut" }],
        );
      }

      // ============ NAVIGATE ============
      console.log(
        backendOK
          ? "🟢 Navigate ke grid-denah (ONLINE)"
          : "🟡 Navigate ke grid-denah (OFFLINE)",
      );

      router.push({
        pathname: "/grid-denah",
        params: {
          projectId: projectId.toString(),
          buildingId: buildingId.toString(),
          // Kirim dataLahan lengkap — SOURCE OF TRUTH
          dataLahan: JSON.stringify(dataLahan),
          // Fallback param
          panjang: panjangFinal.toString(),
          lebar: lebarFinal.toString(),
          regionId: selectedRegion.id.toString(),
          namaProyek: namaProyek.trim(),
          backendOK: backendOK ? "true" : "false",
        },
      });
    } catch (err: any) {
      console.error("🔴 ERROR:", err?.message);
      Alert.alert("Error", err?.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DATA PROYEK</Text>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Data Proyek</Text>
          <Text style={styles.pageSubtitle}>
            Isi data dasar untuk memulai rancangan rumah.
          </Text>

          {/* NAMA PROYEK */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nama Proyek</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Rumah Keluarga Budi"
              placeholderTextColor="#94A3B8"
              value={namaProyek}
              onChangeText={setNamaProyek}
            />
          </View>

          {/* BENTUK LAHAN */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bentuk Lahan</Text>
            <Text style={styles.cardSubtitle}>
              Pilih bentuk lahan sesuai kondisi tanah Anda.
            </Text>

            <View style={styles.bentukRow}>
              {/* Kotak */}
              <TouchableOpacity
                style={[
                  styles.bentukBtn,
                  bentukLahan === "kotak" && styles.bentukBtnActive,
                ]}
                onPress={() => setBentukLahan("kotak")}
              >
                <View
                  style={[
                    styles.bentukIconBox,
                    bentukLahan === "kotak" && styles.bentukIconBoxActive,
                  ]}
                >
                  <Ionicons
                    name="square-outline"
                    size={22}
                    color={bentukLahan === "kotak" ? "#FFFFFF" : "#334155"}
                  />
                </View>
                <Text
                  style={[
                    styles.bentukLabel,
                    bentukLahan === "kotak" && styles.bentukLabelActive,
                  ]}
                >
                  Kotak
                </Text>
                <Text style={styles.bentukDesc}>Persegi panjang</Text>
              </TouchableOpacity>

              {/* Polygon Sisi */}
              <TouchableOpacity
                style={[
                  styles.bentukBtn,
                  bentukLahan === "polygon-sisi" && styles.bentukBtnActive,
                ]}
                onPress={() => setBentukLahan("polygon-sisi")}
              >
                <View
                  style={[
                    styles.bentukIconBox,
                    bentukLahan === "polygon-sisi" &&
                      styles.bentukIconBoxActive,
                  ]}
                >
                  <Ionicons
                    name="shapes-outline"
                    size={22}
                    color={
                      bentukLahan === "polygon-sisi" ? "#FFFFFF" : "#334155"
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.bentukLabel,
                    bentukLahan === "polygon-sisi" && styles.bentukLabelActive,
                  ]}
                >
                  Polygon
                </Text>
                <Text style={styles.bentukDesc}>Input per sisi</Text>
              </TouchableOpacity>

              {/* Polygon Bebas */}
              <TouchableOpacity
                style={[
                  styles.bentukBtn,
                  bentukLahan === "polygon-bebas" && styles.bentukBtnActive,
                ]}
                onPress={() => setBentukLahan("polygon-bebas")}
              >
                <View
                  style={[
                    styles.bentukIconBox,
                    bentukLahan === "polygon-bebas" &&
                      styles.bentukIconBoxActive,
                  ]}
                >
                  <Ionicons
                    name="brush-outline"
                    size={22}
                    color={
                      bentukLahan === "polygon-bebas" ? "#FFFFFF" : "#334155"
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.bentukLabel,
                    bentukLahan === "polygon-bebas" && styles.bentukLabelActive,
                  ]}
                >
                  Bebas
                </Text>
                <Text style={styles.bentukDesc}>Gambar di grid</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* INPUT KOTAK */}
          {bentukLahan === "kotak" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dimensi Lahan</Text>
              <View style={styles.dimensiRow}>
                <View style={styles.dimensiBox}>
                  <Text style={styles.dimensiLabel}>Lebar (m)</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setLebar(Math.max(0, lebar - 1))}
                    >
                      <Ionicons name="remove" size={20} color="#64748B" />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.stepValue, { textAlign: "center" }]}
                      value={String(lebar)}
                      onChangeText={(t) => {
                        const v = parseFloat(t.replace(/[^0-9.]/g, "")) || 0;
                        setLebar(v);
                      }}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setLebar(Math.min(999, lebar + 1))}
                    >
                      <Ionicons name="add" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dimensiBox}>
                  <Text style={styles.dimensiLabel}>Panjang (m)</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setPanjang(Math.max(0, panjang - 1))}
                    >
                      <Ionicons name="remove" size={20} color="#64748B" />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.stepValue, { textAlign: "center" }]}
                      value={String(panjang)}
                      onChangeText={(t) => {
                        const v = parseFloat(t.replace(/[^0-9.]/g, "")) || 0;
                        setPanjang(v);
                      }}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setPanjang(Math.min(999, panjang + 1))}
                    >
                      <Ionicons name="add" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* INPUT POLYGON SISI */}
          {bentukLahan === "polygon-sisi" && (
            <View style={styles.card}>
              <View style={styles.sisiHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Sisi Lahan</Text>
                  <Text style={styles.cardSubtitle}>
                    Masukkan panjang & arah tiap sisi. Sisi penutup otomatis
                    dihitung.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addSisiBtn}
                  onPress={tambahSisi}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addSisiText}>Sisi</Text>
                </TouchableOpacity>
              </View>

              {sisiList.map((sisi, idx) => (
                <View key={sisi.id} style={styles.sisiRow}>
                  <View style={styles.sisiNumber}>
                    <Text style={styles.sisiNumberText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.sisiInputWrap}>
                    <TextInput
                      style={styles.sisiInput}
                      value={sisi.panjang.toString()}
                      onChangeText={(t) => {
                        const v = parseFloat(t.replace(/[^0-9.]/g, "")) || 0;
                        updateSisi(sisi.id, { panjang: v });
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      selectTextOnFocus
                    />
                    <Text style={styles.sisiInputSatuan}>m</Text>
                  </View>

                  {/* Tombol arah (ikon panah) */}
                  <View style={styles.arahWrap}>
                    {ARAH_LIST.map((a) => (
                      <TouchableOpacity
                        key={a.key}
                        style={[
                          styles.arahBtn,
                          sisi.arah === a.key && styles.arahBtnActive,
                        ]}
                        onPress={() => updateSisi(sisi.id, { arah: a.key })}
                      >
                        <Ionicons
                          name={a.icon as any}
                          size={16}
                          color={sisi.arah === a.key ? "#FFFFFF" : "#64748B"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.sisiDeleteBtn}
                    onPress={() => hapusSisi(sisi.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* STATUS SISI PENUTUP */}
              <View
                style={[
                  styles.validasiBox,
                  !sisiPenutup.perlu
                    ? styles.validasiBoxOK
                    : styles.validasiBoxInfo,
                ]}
              >
                <Ionicons
                  name={
                    !sisiPenutup.perlu
                      ? "checkmark-circle"
                      : "information-circle"
                  }
                  size={16}
                  color={!sisiPenutup.perlu ? "#16A34A" : "#1E40AF"}
                />
                <Text
                  style={[
                    styles.validasiText,
                    {
                      color: !sisiPenutup.perlu ? "#166534" : "#1E3A8A",
                    },
                  ]}
                >
                  {sisiPenutup.perlu
                    ? `Sisi penutup otomatis: ${sisiPenutup.panjang}m arah ${sisiPenutup.arah.toUpperCase()}`
                    : "Polygon sudah tertutup sempurna!"}
                </Text>
              </View>

              {/* LUAS */}
              <View style={styles.polygonInfoRow}>
                <Text style={styles.polygonInfoLabel}>Luas lahan:</Text>
                <Text style={styles.polygonInfoValue}>{totalLuas} m²</Text>
              </View>
            </View>
          )}

          {/* INFO POLYGON BEBAS */}
          {bentukLahan === "polygon-bebas" && (
            <View style={styles.card}>
              <View style={styles.bebasHeader}>
                <Ionicons name="brush-outline" size={20} color="#EA580C" />
                <Text style={styles.bebasTitle}>
                  Gambar Lahan di Grid Denah
                </Text>
              </View>
              <Text style={styles.bebasDesc}>
                Anda akan diarahkan ke halaman Grid Denah dalam mode{" "}
                <Text style={{ fontWeight: "700", color: "#EA580C" }}>
                  Gambar Lahan
                </Text>
                . Tap titik-titik sudut lahan, lalu tap titik pertama untuk
                menutup polygon.
              </Text>
              <View style={styles.bebasHint}>
                <Ionicons name="information-circle" size={14} color="#1E40AF" />
                <Text style={styles.bebasHintText}>
                  Cocok untuk lahan dengan bentuk tidak beraturan.
                </Text>
              </View>
            </View>
          )}

          {/* TOTAL LAHAN */}
          {bentukLahan !== "polygon-bebas" && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Luas Lahan</Text>
                <Text style={styles.infoLabel}>Area Bangun (60%)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>{totalLuas} m²</Text>
                <Text style={[styles.infoValue, { color: "#EA580C" }]}>
                  {areaBangun} m²
                </Text>
              </View>
            </View>
          )}

          {/* LOKASI */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lokasi / Daerah</Text>
            <Text style={styles.cardSubtitle}>
              Pilih kota tempat rumah akan dibangun.
            </Text>

            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.locationLeft}>
                <Ionicons
                  name="location"
                  size={20}
                  color={selectedRegion ? "#EA580C" : "#94A3B8"}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.locationButtonText,
                      !selectedRegion && styles.locationPlaceholder,
                    ]}
                  >
                    {selectedRegion ? selectedRegion.nama : "Cari kota..."}
                  </Text>
                  {selectedRegion && (
                    <Text style={styles.locationButtonSub}>
                      {selectedRegion.provinsi}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* TOMBOL LANJUT */}
          <TouchableOpacity
            style={[styles.btn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.btnText}>
                  {bentukLahan === "polygon-bebas"
                    ? "Lanjut & Gambar Lahan"
                    : "Lanjut ke Grid Denah"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* MODAL LOKASI */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Lokasi</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari kota (misal: Jakarta)"
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredRegions}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                style={{ marginTop: 12 }}
                ListEmptyComponent={
                  <Text style={styles.dropdownEmpty}>
                    Tidak ada kota yang cocok.
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedRegion?.id === item.id &&
                        styles.dropdownItemActive,
                    ]}
                    onPress={() => handleSelectRegion(item)}
                  >
                    <Ionicons
                      name="location"
                      size={18}
                      color={
                        selectedRegion?.id === item.id ? "#EA580C" : "#64748B"
                      }
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedRegion?.id === item.id && {
                            color: "#EA580C",
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {item.nama}
                      </Text>
                      <Text style={styles.dropdownItemSub}>
                        {item.provinsi}
                      </Text>
                    </View>
                    {selectedRegion?.id === item.id && (
                      <Ionicons name="checkmark" size={20} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },

  scrollContent: { padding: 16, paddingBottom: 40 },

  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 16,
  },

  bentukRow: { flexDirection: "row", gap: 8 },
  bentukBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  bentukBtnActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#EA580C",
  },
  bentukIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  bentukIconBoxActive: { backgroundColor: "#EA580C" },
  bentukLabel: { fontSize: 13, fontWeight: "700", color: "#334155" },
  bentukLabelActive: { color: "#EA580C" },
  bentukDesc: { fontSize: 10, color: "#94A3B8", textAlign: "center" },

  dimensiRow: { flexDirection: "row", gap: 12 },
  dimensiBox: { flex: 1 },
  dimensiLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
  },
  stepBtn: { padding: 8, justifyContent: "center", alignItems: "center" },
  stepValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    paddingVertical: 6,
    minWidth: 40,
  },

  sisiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  addSisiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EA580C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSisiText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  sisiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sisiNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sisiNumberText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  sisiInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    width: 80,
  },
  sisiInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    paddingVertical: 6,
    textAlign: "right",
  },
  sisiInputSatuan: { fontSize: 12, color: "#64748B", marginLeft: 2 },
  arahWrap: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  arahBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  arahBtnActive: { backgroundColor: "#EA580C" },
  sisiDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  validasiBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  validasiBoxOK: { backgroundColor: "#DCFCE7" },
  validasiBoxInfo: { backgroundColor: "#DBEAFE" },
  validasiText: { fontSize: 12, fontWeight: "600", flex: 1 },

  polygonInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  polygonInfoLabel: { fontSize: 13, fontWeight: "600", color: "#334155" },
  polygonInfoValue: { fontSize: 16, fontWeight: "800", color: "#EA580C" },

  bebasHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  bebasTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  bebasDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 10,
  },
  bebasHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DBEAFE",
    padding: 10,
    borderRadius: 8,
  },
  bebasHintText: { fontSize: 11, color: "#1E40AF", flex: 1 },

  infoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: { color: "#CBD5E1", fontSize: 12, fontWeight: "500" },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "#0F172A",
  },

  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#F8FAFC",
  },
  locationLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  locationButtonText: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  locationPlaceholder: { color: "#94A3B8", fontWeight: "400" },
  locationButtonSub: { fontSize: 12, color: "#64748B", marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemActive: { backgroundColor: "#FFF7ED" },
  dropdownItemText: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  dropdownItemSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  dropdownEmpty: {
    padding: 24,
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
  },

  btn: {
    marginTop: 8,
    backgroundColor: "#EA580C",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});