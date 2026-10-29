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
// HELPER: LUAS POLYGON (SHOELACE)
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

  // ==== STATE DIMENSI KOTAK ====
  const [panjang, setPanjang] = useState(0);
  const [lebar, setLebar] = useState(0);

  // ==== STATE POLYGON ====
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
      await axios.get(`${API_URL}/regions/`, { timeout: 5000 });
      return true;
    } catch (err: any) {
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
      const cek = hitungSisiPenutup(sisiList);
      if (cek.perlu && cek.panjang > 50) {
        Alert.alert(
          "Validasi",
          "Polygon terlalu jauh dari titik awal. Periksa kembali arah & panjang sisi.",
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      let projectId = `local-${Date.now()}`;
      let buildingId = `local-${Date.now()}`;
      let backendOK = false;

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
        const rawPoly = sisiKePolygon(sisiList);
        const first = rawPoly[0];
        const last = rawPoly[rawPoly.length - 1];
        const jarak = Math.hypot(last.x - first.x, last.y - first.y);
        const polygonClean = jarak < 0.01 ? rawPoly.slice(0, -1) : rawPoly;

        const bb = boundingBox(polygonClean);

        polygonFinal = polygonClean;
        bboxFinal = {
          minX: bb.minX,
          minY: bb.minY,
          maxX: bb.maxX,
          maxY: bb.maxY,
        };

        panjangFinal = Math.round((bb.maxX - bb.minX) * 100) / 100;
        lebarFinal = Math.round((bb.maxY - bb.minY) * 100) / 100;
        luasFinal = Math.round(luasPolygon(polygonClean) * 100) / 100;
      } else {
        bentukFinal = "polygon-bebas";
        panjangFinal = 20;
        lebarFinal = 20;
        polygonFinal = null;
        bboxFinal = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
        luasFinal = 400;
      }

      const dataLahan = {
        bentuk: bentukFinal,
        panjang: panjangFinal,
        lebar: lebarFinal,
        polygon: polygonFinal,
        bbox: bboxFinal,
        luas: luasFinal,
      };

      const ok = await testKoneksi();
      backendOK = ok;

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

          const projectRes = await axios.post(
            `${API_URL}/projects/`,
            payloadProject,
            { timeout: API_TIMEOUT },
          );

          projectId = projectRes.data.id.toString();

          const buildingRes = await axios.post(
            `${API_URL}/buildings/`,
            { project: projectId, nama: "Bangunan Utama" },
            { timeout: API_TIMEOUT },
          );

          buildingId = buildingRes.data.id.toString();

          await axios.post(
            `${API_URL}/floors/`,
            { building: buildingId, level: 1, tinggi_dinding: 3.0 },
            { timeout: API_TIMEOUT },
          );
        } catch (submitErr: any) {
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

      router.push({
        pathname: "/grid-denah",
        params: {
          projectId: projectId.toString(),
          buildingId: buildingId.toString(),
          dataLahan: JSON.stringify(dataLahan),
          panjang: panjangFinal.toString(),
          lebar: lebarFinal.toString(),
          regionId: selectedRegion.id.toString(),
          namaProyek: namaProyek.trim(),
          backendOK: backendOK ? "true" : "false",
        },
      });
    } catch (err: any) {
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
        {/* HEADER BARU */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Data Proyek</Text>
            <Text style={styles.headerSubtitle}>
              Mulai rancangan rumah Anda
            </Text>
          </View>
          <TouchableOpacity style={styles.headerSettingsBtn}>
            <Ionicons name="settings-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* NAMA PROYEK */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBoxBlue}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#2563EB"
                />
              </View>
              <Text style={styles.cardTitle}>Nama Proyek</Text>
            </View>
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
            <View style={styles.cardHeader}>
              <View style={styles.iconBoxOrange}>
                <Ionicons name="shapes-outline" size={16} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Bentuk Lahan</Text>
                <Text style={styles.cardSubtitle}>
                  Pilih bentuk yang sesuai dengan kondisi tanah.
                </Text>
              </View>
            </View>

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
                    size={18}
                    color={bentukLahan === "kotak" ? "#FFFFFF" : "#64748B"}
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
                <Text style={styles.bentukDesc}>Persegi</Text>
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
                    size={18}
                    color={
                      bentukLahan === "polygon-sisi" ? "#FFFFFF" : "#64748B"
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
                <Text style={styles.bentukDesc}>Per Sisi</Text>
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
                    size={18}
                    color={
                      bentukLahan === "polygon-bebas" ? "#FFFFFF" : "#64748B"
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
                <Text style={styles.bentukDesc}>Grid</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* INPUT KOTAK */}
          {bentukLahan === "kotak" && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBoxGreen}>
                  <Ionicons name="resize-outline" size={16} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>Dimensi Lahan</Text>
              </View>

              <View style={styles.dimensiRow}>
                <View style={styles.dimensiBox}>
                  <Text style={styles.dimensiLabel}>Lebar (m)</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setLebar(Math.max(0, lebar - 1))}
                    >
                      <Ionicons name="remove" size={18} color="#0F172A" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.stepValue}
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
                      <Ionicons name="add" size={18} color="#0F172A" />
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
                      <Ionicons name="remove" size={18} color="#0F172A" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.stepValue}
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
                      <Ionicons name="add" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* INPUT POLYGON SISI */}
          {bentukLahan === "polygon-sisi" && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBoxOrange}>
                  <Ionicons
                    name="analytics-outline"
                    size={16}
                    color="#EA580C"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Sisi Lahan</Text>
                  <Text style={styles.cardSubtitle}>
                    Masukkan panjang & arah tiap sisi.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addSisiBtn}
                  onPress={tambahSisi}
                >
                  <Ionicons name="add" size={14} color="#FFFFFF" />
                  <Text style={styles.addSisiText}>Sisi</Text>
                </TouchableOpacity>
              </View>

              {sisiList.map((sisi, idx) => (
                <View key={sisi.id} style={styles.sisiRow}>
                  <View style={styles.sisiNumber}>
                    <Text style={styles.sisiNumberText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.sisiStepper}>
                    <TouchableOpacity
                      style={styles.sisiStepBtn}
                      onPress={() =>
                        updateSisi(sisi.id, {
                          panjang: Math.max(0, sisi.panjang - 1),
                        })
                      }
                    >
                      <Ionicons name="remove" size={14} color="#0F172A" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.sisiStepValue}
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
                    <TouchableOpacity
                      style={styles.sisiStepBtn}
                      onPress={() =>
                        updateSisi(sisi.id, {
                          panjang: Math.min(999, sisi.panjang + 1),
                        })
                      }
                    >
                      <Ionicons name="add" size={14} color="#0F172A" />
                    </TouchableOpacity>
                  </View>

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
                          size={14}
                          color={sisi.arah === a.key ? "#FFFFFF" : "#64748B"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.sisiDeleteBtn}
                    onPress={() => hapusSisi(sisi.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}

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
                  color={!sisiPenutup.perlu ? "#16A34A" : "#2563EB"}
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
                    ? `Sisi penutup: ${sisiPenutup.panjang}m arah ${sisiPenutup.arah.toUpperCase()}`
                    : "Polygon tertutup sempurna!"}
                </Text>
              </View>
            </View>
          )}

          {/* INFO POLYGON BEBAS */}
          {bentukLahan === "polygon-bebas" && (
            <View style={styles.card}>
              <View style={styles.bebasHeader}>
                <View style={styles.iconBoxOrange}>
                  <Ionicons name="brush-outline" size={16} color="#EA580C" />
                </View>
                <Text style={styles.bebasTitle}>Gambar Bebas di Grid</Text>
              </View>
              <Text style={styles.bebasDesc}>
                Anda akan diarahkan ke halaman Grid Denah. Ketuk titik-titik
                sudut lahan pada grid, lalu tutup dengan mengetuk titik pertama.
              </Text>
            </View>
          )}

          {/* TOTAL LAHAN */}
          {bentukLahan !== "polygon-bebas" && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View>
                  <Text style={styles.infoLabel}>Total Luas Lahan</Text>
                  <Text style={styles.infoValue}>{totalLuas} m²</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.infoLabel}>Area Bangun (60%)</Text>
                  <Text style={[styles.infoValue, { color: "#F5A623" }]}>
                    {areaBangun} m²
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* LOKASI */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBoxBlue}>
                <Ionicons name="location-outline" size={16} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Lokasi / Daerah</Text>
                <Text style={styles.cardSubtitle}>
                  Pilih kota tempat rumah dibangun.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.locationLeft}>
                <Ionicons
                  name="map"
                  size={18}
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
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
                <Ionicons name="arrow-forward" size={18} color="white" />
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
                  <Ionicons name="close" size={20} color="#0F172A" />
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  // ==== HEADER MODERN ====
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerBackBtn: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  headerSettingsBtn: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },

  scrollContent: { padding: 20, paddingBottom: 60 },

  // ==== CARD MODERN ====
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 14,
  },

  // Ikon-Ikon Warna (Dikecilkan)
  iconBoxBlue: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxOrange: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxGreen: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  // ==== PILIHAN BENTUK LAHAN ====
  bentukRow: { flexDirection: "row", gap: 8 },
  bentukBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#F1F5F9",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  bentukBtnActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#EA580C",
  },
  bentukIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  bentukIconBoxActive: { backgroundColor: "#EA580C" },
  bentukLabel: { fontSize: 12, fontWeight: "800", color: "#334155" },
  bentukLabelActive: { color: "#EA580C" },
  bentukDesc: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
    fontWeight: "500",
  },

  // ==== DIMENSI / STEPPER ====
  dimensiRow: { flexDirection: "row", gap: 12 },
  dimensiBox: { flex: 1 },
  dimensiLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 2,
  },
  stepBtn: { padding: 8, justifyContent: "center", alignItems: "center" },
  stepValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    paddingVertical: 6,
  },

  // ==== POLYGON SISI ====
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
    borderBottomColor: "#F8FAFC",
  },
  sisiNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sisiNumberText: { fontSize: 11, fontWeight: "800", color: "#475569" },

  sisiStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F1F5F9",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 2,
    width: 100,
  },
  sisiStepBtn: { padding: 6, justifyContent: "center", alignItems: "center" },
  sisiStepValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    paddingVertical: 4,
    textAlign: "center",
  },

  arahWrap: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  arahBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  arahBtnActive: { backgroundColor: "#EA580C" },
  sisiDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  // ==== KOTAK VALIDASI ====
  validasiBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  validasiBoxOK: { backgroundColor: "#DCFCE7" },
  validasiBoxInfo: { backgroundColor: "#EFF6FF" },
  validasiText: { fontSize: 11, fontWeight: "700", flex: 1 },

  // ==== POLYGON BEBAS ====
  bebasHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  bebasTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  bebasDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 20,
  },

  // ==== KARTU TOTAL LUAS (DARK MODE) ====
  infoCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },

  // ==== INPUT & LOKASI ====
  input: {
    borderWidth: 2,
    borderColor: "#F1F5F9",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },

  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#F8FAFC",
  },
  locationLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  locationButtonText: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  locationPlaceholder: { color: "#94A3B8", fontWeight: "500" },
  locationButtonSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },

  // ==== MODAL LOKASI ====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "85%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 6,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 6,
    fontWeight: "600",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderRadius: 12,
    marginTop: 4,
  },
  dropdownItemActive: { backgroundColor: "#FFF7ED" },
  dropdownItemText: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  dropdownItemSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  dropdownEmpty: {
    padding: 32,
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },

  // ==== TOMBOL LANJUT ====
  btn: {
    marginTop: 16,
    backgroundColor: "#EA580C",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
