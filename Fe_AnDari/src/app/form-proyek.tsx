// src/app/form-proyek.tsx

import React, { useState, useMemo, useRef } from "react";
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
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

// ✅ IMPORT FUNGSI DATABASE LOKAL
import { simpanProyekBaru } from "../db";

// ============================================
// 1. DATA KABUPATEN (JAWA TENGAH & DIY)
// ============================================
type RegionOption = {
  id: string;
  nama: string;
  provinsi: string;
  latitude: number;
  longitude: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const REGIONS_KABUPATEN: RegionOption[] = [
  // --- D.I. YOGYAKARTA ---
  {
    id: "yk_1",
    nama: "Kota Yogyakarta",
    provinsi: "DI Yogyakarta",
    latitude: -7.7956,
    longitude: 110.3695,
    minLat: -7.83,
    maxLat: -7.76,
    minLng: 110.34,
    maxLng: 110.42,
  },
  {
    id: "yk_2",
    nama: "Kab. Sleman",
    provinsi: "DI Yogyakarta",
    latitude: -7.7161,
    longitude: 110.3554,
    minLat: -7.85,
    maxLat: -7.58,
    minLng: 110.25,
    maxLng: 110.48,
  },
  {
    id: "yk_3",
    nama: "Kab. Bantul",
    provinsi: "DI Yogyakarta",
    latitude: -7.8889,
    longitude: 110.3286,
    minLat: -8.0,
    maxLat: -7.78,
    minLng: 110.25,
    maxLng: 110.45,
  },
  {
    id: "yk_4",
    nama: "Kab. Gunungkidul",
    provinsi: "DI Yogyakarta",
    latitude: -7.9667,
    longitude: 110.6,
    minLat: -8.15,
    maxLat: -7.78,
    minLng: 110.4,
    maxLng: 110.85,
  },
  {
    id: "yk_5",
    nama: "Kab. Kulon Progo",
    provinsi: "DI Yogyakarta",
    latitude: -7.825,
    longitude: 110.1667,
    minLat: -7.95,
    maxLat: -7.65,
    minLng: 110.0,
    maxLng: 110.25,
  },

  // --- JAWA TENGAH ---
  {
    id: "jt_1",
    nama: "Kota Semarang",
    provinsi: "Jawa Tengah",
    latitude: -6.9667,
    longitude: 110.4167,
    minLat: -7.05,
    maxLat: -6.9,
    minLng: 110.25,
    maxLng: 110.5,
  },
  {
    id: "jt_2",
    nama: "Kab. Semarang",
    provinsi: "Jawa Tengah",
    latitude: -7.2,
    longitude: 110.45,
    minLat: -7.35,
    maxLat: -7.0,
    minLng: 110.25,
    maxLng: 110.6,
  },
  {
    id: "jt_3",
    nama: "Kota Surakarta (Solo)",
    provinsi: "Jawa Tengah",
    latitude: -7.5755,
    longitude: 110.8243,
    minLat: -7.6,
    maxLat: -7.53,
    minLng: 110.78,
    maxLng: 110.87,
  },
  {
    id: "jt_4",
    nama: "Kab. Boyolali",
    provinsi: "Jawa Tengah",
    latitude: -7.525,
    longitude: 110.6,
    minLat: -7.65,
    maxLat: -7.3,
    minLng: 110.45,
    maxLng: 110.75,
  },
  {
    id: "jt_5",
    nama: "Kab. Klaten",
    provinsi: "Jawa Tengah",
    latitude: -7.7,
    longitude: 110.6,
    minLat: -7.8,
    maxLat: -7.55,
    minLng: 110.45,
    maxLng: 110.75,
  },
  {
    id: "jt_6",
    nama: "Kab. Magelang",
    provinsi: "Jawa Tengah",
    latitude: -7.4667,
    longitude: 110.2167,
    minLat: -7.65,
    maxLat: -7.3,
    minLng: 110.0,
    maxLng: 110.35,
  },
  {
    id: "jt_7",
    nama: "Kota Magelang",
    provinsi: "Jawa Tengah",
    latitude: -7.47,
    longitude: 110.2178,
    minLat: -7.5,
    maxLat: -7.44,
    minLng: 110.19,
    maxLng: 110.24,
  },
  {
    id: "jt_8",
    nama: "Kab. Purworejo",
    provinsi: "Jawa Tengah",
    latitude: -7.7167,
    longitude: 110.0,
    minLat: -7.9,
    maxLat: -7.55,
    minLng: 109.8,
    maxLng: 110.15,
  },
  {
    id: "jt_9",
    nama: "Kab. Kebumen",
    provinsi: "Jawa Tengah",
    latitude: -7.6667,
    longitude: 109.65,
    minLat: -7.85,
    maxLat: -7.45,
    minLng: 109.3,
    maxLng: 109.85,
  },
  {
    id: "jt_10",
    nama: "Kab. Banyumas",
    provinsi: "Jawa Tengah",
    latitude: -7.45,
    longitude: 109.2333,
    minLat: -7.65,
    maxLat: -7.25,
    minLng: 109.0,
    maxLng: 109.45,
  },
];

// ============================================
// TIPE BENTUK LAHAN & HELPER
// ============================================
type BentukLahan = "kotak" | "polygon-sisi" | "polygon-bebas";
type ArahMataAngin = "utara" | "timur" | "selatan" | "barat";

type SisiLahan = { id: string; panjang: number; arah: ArahMataAngin };

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

function sisiKePolygon(sisiList: SisiLahan[]): { x: number; y: number }[] {
  let x = 0,
    y = 0;
  const points = [{ x, y }];
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

function hitungSisiPenutup(sisiList: SisiLahan[]) {
  let x = 0,
    y = 0;
  for (const sisi of sisiList) {
    const arah = ARAH_LIST.find((a) => a.key === sisi.arah);
    if (!arah) continue;
    const rad = (arah.derajat * Math.PI) / 180;
    x += sisi.panjang * Math.cos(rad);
    y += sisi.panjang * Math.sin(rad);
  }
  const dx = -x,
    dy = -y;
  const panjang = Math.hypot(dx, dy);
  if (panjang < 0.1)
    return {
      perlu: false,
      panjang: 0,
      arah: "barat" as ArahMataAngin,
      pesan: "Tertutup sempurna",
    };
  let arah: ArahMataAngin =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? "timur"
        : "barat"
      : dy > 0
        ? "utara"
        : "selatan";
  return {
    perlu: true,
    panjang: Math.round(panjang * 100) / 100,
    arah,
    pesan: `Sisi penutup: ${panjang.toFixed(2)}m`,
  };
}

function luasPolygon(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  let luas = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    luas += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(luas) / 2;
}

function boundingBox(points: { x: number; y: number }[]) {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

// ============================================
// KOMPONEN UTAMA
// ============================================
export default function FormProyekScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // ==== STATE PROYEK ====
  const [namaProyek, setNamaProyek] = useState("");
  const [bentukLahan, setBentukLahan] = useState<BentukLahan>("kotak");
  const [panjang, setPanjang] = useState(0);
  const [lebar, setLebar] = useState(0);
  const [sisiList, setSisiList] = useState<SisiLahan[]>([
    { id: "s1", panjang: 0, arah: "utara" },
    { id: "s2", panjang: 0, arah: "timur" },
    { id: "s3", panjang: 0, arah: "selatan" },
    { id: "s4", panjang: 0, arah: "barat" },
  ]);

  // ==== STATE LOKASI & PETA ====
  const [selectedRegion, setSelectedRegion] = useState<RegionOption | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [mapVisible, setMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -7.7956,
    longitude: 110.3695,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoord, setMarkerCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [searchingMap, setSearchingMap] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // HITUNG LUAS
  // ============================================
  const totalLuas = useMemo(() => {
    if (bentukLahan === "kotak") return Math.round(panjang * lebar * 100) / 100;
    if (bentukLahan === "polygon-sisi")
      return Math.round(luasPolygon(sisiKePolygon(sisiList)) * 100) / 100;
    return 0;
  }, [bentukLahan, panjang, lebar, sisiList]);

  const areaBangun = Math.round(totalLuas * 0.6);
  const polygonPoints = useMemo(
    () => (bentukLahan !== "polygon-sisi" ? null : sisiKePolygon(sisiList)),
    [bentukLahan, sisiList],
  );
  const bbox = useMemo(
    () =>
      !polygonPoints || polygonPoints.length < 3
        ? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
        : boundingBox(polygonPoints),
    [polygonPoints],
  );

  const sisiPenutup = useMemo(() => {
    if (bentukLahan === "kotak")
      return {
        perlu: false,
        panjang: 0,
        arah: "barat" as ArahMataAngin,
        pesan: "",
      };
    return hitungSisiPenutup(sisiList);
  }, [bentukLahan, sisiList]);

  // ============================================
  // HANDLER SISI
  // ============================================
  const tambahSisi = () =>
    setSisiList((prev) => [
      ...prev,
      { id: `s${Date.now()}`, panjang: 0, arah: "timur" },
    ]);
  const hapusSisi = (id: string) => {
    if (sisiList.length <= 3)
      return Alert.alert("Minimal 3 Sisi", "Polygon butuh minimal 3 sisi.");
    setSisiList((prev) => prev.filter((s) => s.id !== id));
  };
  const updateSisi = (id: string, patch: Partial<SisiLahan>) =>
    setSisiList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  // ============================================
  // HANDLER LOKASI (SINKRONISASI & BATAS WILAYAH)
  // ============================================
  const handleSelectRegion = (region: RegionOption) => {
    setSelectedRegion(region);
    setModalVisible(false);
    setSearchQuery("");

    const newCoord = { latitude: region.latitude, longitude: region.longitude };
    setMarkerCoord(newCoord);
    setMapRegion({ ...newCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 });

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { ...newCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        800,
      );
    }
  };

  const handleOpenMap = () => {
    if (!selectedRegion) {
      return Alert.alert(
        "Pilih Kabupaten",
        "Harap pilih Kabupaten/Kota terlebih dahulu sebelum membuka peta.",
      );
    }

    if (markerCoord) {
      setMapRegion({
        ...markerCoord,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } else {
      const newCoord = {
        latitude: selectedRegion.latitude,
        longitude: selectedRegion.longitude,
      };
      setMarkerCoord(newCoord);
      setMapRegion({ ...newCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    }
    setMapSearchQuery("");
    setMapVisible(true);
  };

  const isValidCoordinate = (lat: number, lng: number) => {
    if (!selectedRegion) return false;
    return (
      lat >= selectedRegion.minLat &&
      lat <= selectedRegion.maxLat &&
      lng >= selectedRegion.minLng &&
      lng <= selectedRegion.maxLng
    );
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    if (!isValidCoordinate(latitude, longitude)) {
      Alert.alert(
        "Di Luar Wilayah",
        `Titik yang Anda pilih berada di luar Kabupaten ${selectedRegion?.nama}. Silakan pilih titik di dalam wilayah tersebut.`,
      );
      return;
    }

    setMarkerCoord({ latitude, longitude });
  };

  // ============================================
  // PENCARIAN PETA (MENGGUNAKAN NOMINATIM - TOLERAN)
  // ============================================
  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    setSearchingMap(true);
    try {
      const viewbox = `${selectedRegion?.minLng},${selectedRegion?.maxLat},${selectedRegion?.maxLng},${selectedRegion?.minLat}`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=5&viewbox=${viewbox}`,
        { headers: { "User-Agent": "AndariApp/1.0" } },
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        if (isValidCoordinate(lat, lon)) {
          const newCoord = { latitude: lat, longitude: lon };
          setMarkerCoord(newCoord);
          setMapRegion({
            ...newCoord,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });

          if (mapRef.current) {
            mapRef.current.animateToRegion(
              { ...newCoord, latitudeDelta: 0.01, longitudeDelta: 0.01 },
              800,
            );
          }
        } else {
          Alert.alert(
            "Lokasi Di Luar Wilayah",
            `Lokasi "${item.display_name}" ditemukan, tetapi berada di luar Kabupaten ${selectedRegion?.nama}.\n\nApakah Anda ingin tetap menggunakan titik ini?`,
            [
              { text: "Batal", style: "cancel" },
              {
                text: "Gunakan Tetap",
                onPress: () => {
                  const newCoord = { latitude: lat, longitude: lon };
                  setMarkerCoord(newCoord);
                  setMapRegion({
                    ...newCoord,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                  if (mapRef.current) {
                    mapRef.current.animateToRegion(
                      {
                        ...newCoord,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      },
                      800,
                    );
                  }
                },
              },
            ],
          );
        }
      } else {
        Alert.alert(
          "Tidak Ditemukan",
          `Tempat dengan nama "${mapSearchQuery}" tidak ditemukan. Coba ketik nama jalan atau kecamatan.`,
        );
      }
    } catch (err) {
      Alert.alert("Error", "Gagal mencari lokasi. Periksa koneksi internet.");
    } finally {
      setSearchingMap(false);
    }
  };

  const handleConfirmLocation = () => {
    if (!markerCoord) {
      Alert.alert("Pilih Lokasi", "Ketuk peta untuk memilih titik lokasi.");
      return;
    }

    if (!isValidCoordinate(markerCoord.latitude, markerCoord.longitude)) {
      Alert.alert(
        "Di Luar Wilayah",
        "Pin berada di luar batas kabupaten yang dipilih.",
      );
      return;
    }

    setSelectedRegion({
      ...selectedRegion!,
      latitude: markerCoord.latitude,
      longitude: markerCoord.longitude,
    });

    setMapVisible(false);
  };

  // ============================================
  // SUBMIT (SIMPAN KE DATABASE LOKAL SQLITE)
  // ============================================
  const handleSubmit = async () => {
    if (!namaProyek.trim())
      return Alert.alert("Validasi", "Nama proyek wajib diisi.");
    if (!selectedRegion)
      return Alert.alert("Validasi", "Pilih lokasi/daerah terlebih dahulu.");

    if (bentukLahan === "kotak" && (panjang <= 0 || lebar <= 0))
      return Alert.alert("Validasi", "Panjang & lebar harus > 0.");
    if (bentukLahan === "polygon-sisi") {
      if (sisiList.length < 3)
        return Alert.alert("Validasi", "Polygon butuh minimal 3 sisi.");
      if (sisiList.some((s) => s.panjang <= 0))
        return Alert.alert("Validasi", "Semua sisi harus > 0.");
    }

    try {
      setSubmitting(true);

      let bentukFinal = bentukLahan,
        panjangFinal = 0,
        lebarFinal = 0,
        polygonFinal = null,
        bboxFinal = { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        luasFinal = 0;

      if (bentukLahan === "kotak") {
        panjangFinal = panjang;
        lebarFinal = lebar;
        bboxFinal = { minX: 0, minY: 0, maxX: panjang, maxY: lebar };
        luasFinal = Math.round(panjang * lebar * 100) / 100;
      } else if (bentukLahan === "polygon-sisi") {
        const rawPoly = sisiKePolygon(sisiList);
        const jarak = Math.hypot(
          rawPoly[rawPoly.length - 1].x - rawPoly[0].x,
          rawPoly[rawPoly.length - 1].y - rawPoly[0].y,
        );
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

      // ✅ SIMPAN KE DATABASE LOKAL (SQLite)
      // Fungsi ini mengembalikan ID unik dari database
      const newProjectId = simpanProyekBaru(
        namaProyek.trim(),
        `${panjangFinal}m x ${lebarFinal}m`,
        bentukFinal === "kotak"
          ? "Kotak"
          : bentukFinal === "polygon-sisi"
            ? "Polygon Sisi"
            : "Polygon Bebas",
        dataLahan,
      );

      // ✅ LANJUT KE HALAMAN GRID DENAH
      router.push({
        pathname: "/grid-denah",
        params: {
          projectId: newProjectId.toString(), // Mengirim ID dari SQLite
          buildingId: "local",
          dataLahan: JSON.stringify(dataLahan),
          panjang: panjangFinal.toString(),
          lebar: lebarFinal.toString(),
          regionId: selectedRegion.id.toString(),
          namaProyek: namaProyek.trim(),
          backendOK: "false", // Selalu false karena kita murni offline
          latitude: (
            markerCoord?.latitude ||
            selectedRegion.latitude ||
            ""
          ).toString(),
          longitude: (
            markerCoord?.longitude ||
            selectedRegion.longitude ||
            ""
          ).toString(),
        },
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Terjadi kesalahan saat menyimpan.");
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

          {/* INPUT DIMENSI / SISI */}
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
                      onChangeText={(t) =>
                        setLebar(parseFloat(t.replace(/[^0-9.]/g, "")) || 0)
                      }
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
                      onChangeText={(t) =>
                        setPanjang(parseFloat(t.replace(/[^0-9.]/g, "")) || 0)
                      }
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
                      onChangeText={(t) =>
                        updateSisi(sisi.id, {
                          panjang: parseFloat(t.replace(/[^0-9.]/g, "")) || 0,
                        })
                      }
                      keyboardType="numeric"
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
                    { color: !sisiPenutup.perlu ? "#166534" : "#1E3A8A" },
                  ]}
                >
                  {sisiPenutup.perlu
                    ? `Sisi penutup: ${sisiPenutup.panjang}m arah ${sisiPenutup.arah.toUpperCase()}`
                    : "Polygon tertutup sempurna!"}
                </Text>
              </View>
            </View>
          )}

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
                sudut lahan, lalu tutup dengan titik pertama.
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
                <Text style={styles.cardTitle}>Lokasi Proyek</Text>
                <Text style={styles.cardSubtitle}>
                  Pilih Kabupaten/Kota di Jawa Tengah & DIY.
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
                  name="list"
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
                    {selectedRegion
                      ? selectedRegion.nama
                      : "Pilih dari daftar kabupaten..."}
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

            <TouchableOpacity
              style={[
                styles.locationButton,
                { marginTop: 10 },
                !selectedRegion && { opacity: 0.5 },
              ]}
              onPress={handleOpenMap}
              disabled={!selectedRegion}
              activeOpacity={0.7}
            >
              <View style={styles.locationLeft}>
                <Ionicons name="map" size={18} color="#2563EB" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.locationButtonText}>
                    Tentukan Titik Koordinat di Peta
                  </Text>
                  {markerCoord && (
                    <Text style={styles.locationButtonSub}>
                      {markerCoord.latitude.toFixed(5)},{" "}
                      {markerCoord.longitude.toFixed(5)}
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

        {/* MODAL DAFTAR KABUPATEN */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Kabupaten / Kota</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari kabupaten (misal: Sleman)"
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
                data={REGIONS_KABUPATEN.filter(
                  (r) =>
                    r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.provinsi
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                )}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                style={{ marginTop: 12 }}
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
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* MODAL PETA (TERBATAS) */}
        <Modal
          visible={mapVisible}
          animationType="slide"
          onRequestClose={() => setMapVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <SafeAreaView
              edges={["top"]}
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <View style={styles.mapHeader}>
                <TouchableOpacity
                  onPress={() => setMapVisible(false)}
                  style={styles.mapHeaderBtn}
                >
                  <Ionicons name="close" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.mapHeaderTitle}>
                  Wilayah: {selectedRegion?.nama}
                </Text>
                <TouchableOpacity
                  onPress={handleConfirmLocation}
                  style={styles.mapConfirmBtn}
                >
                  <Text style={styles.mapConfirmText}>Pilih</Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: "#FFFFFF",
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F8FAFC",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    height: 44,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Ionicons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      fontSize: 14,
                      color: "#0F172A",
                    }}
                    placeholder={`Cari nama jalan/tempat di ${selectedRegion?.nama}...`}
                    placeholderTextColor="#94A3B8"
                    value={mapSearchQuery}
                    onChangeText={setMapSearchQuery}
                    onSubmitEditing={handleMapSearch}
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    onPress={handleMapSearch}
                    disabled={searchingMap}
                  >
                    {searchingMap ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Text
                        style={{
                          color: "#2563EB",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        Cari
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>

            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              provider={PROVIDER_GOOGLE}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {markerCoord && (
                <Marker coordinate={markerCoord} title="Lokasi Proyek" />
              )}
            </MapView>

            <View style={styles.mapHint}>
              <Ionicons name="information-circle" size={16} color="#92400E" />
              <Text style={styles.mapHintText}>
                Ketuk peta di dalam area {selectedRegion?.nama} untuk menggeser
                pin.
              </Text>
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
  headerBackBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 10 },
  headerTitleWrap: { alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  headerSubtitle: { fontSize: 11, color: "#64748B", marginTop: 2 },
  headerSettingsBtn: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },
  scrollContent: { padding: 20, paddingBottom: 60 },
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
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  cardSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 14,
  },
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
  bentukBtnActive: { backgroundColor: "#FFF7ED", borderColor: "#EA580C" },
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
  arahWrap: { flexDirection: "row", gap: 4, flex: 1, justifyContent: "center" },
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
  bebasHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  bebasTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  bebasDesc: { fontSize: 12, color: "#475569", lineHeight: 20 },
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
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  mapHeaderBtn: { padding: 4 },
  mapHeaderTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  mapConfirmBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapConfirmText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  mapHint: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  mapHintText: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "600" },
});
