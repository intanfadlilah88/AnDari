import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import { API_TIMEOUT, API_URL } from "../../constants/config";
import { clearAdminToken, getAdminToken } from "../../utils/admin-auth";

type Region = {
  id: number;
  nama: string;
  provinsi?: string | null;
  kode?: string | null;
  is_active: boolean;
};
type Material = {
  id: number;
  nama_material: string;
  satuan: string;
  harga_satuan: string;
  region: number;
  region_nama?: string;
  is_active: boolean;
};
type Labor = {
  id: number;
  nama_peran: string;
  kategori: string;
  satuan: string;
  deskripsi?: string | null;
  is_active: boolean;
};
type LaborPrice = {
  id: number;
  labor: number;
  region: number;
  region_nama?: string;
  upah_per_satuan: string;
  source: string;
  is_active: boolean;
};
type DashboardStats = {
  total_materials: number;
  total_labor_roles: number;
  total_labor_prices: number;
  total_regions: number;
  total_projects: number;
  visits_today: number;
  visits_total: number;
  unique_visitors: number;
};
type Section = "materials" | "labor-prices" | "labors" | "regions";
type ApiItem = Material | LaborPrice | Labor | Region;

function getList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    typeof data === "object" &&
    data !== null &&
    "results" in data &&
    Array.isArray(data.results)
  ) {
    return data.results as T[];
  }
  throw new Error("Format data dari server tidak dikenali.");
}

const emptyStats: DashboardStats = {
  total_materials: 0,
  total_labor_roles: 0,
  total_labor_prices: 0,
  total_regions: 0,
  total_projects: 0,
  visits_today: 0,
  visits_total: 0,
  unique_visitors: 0,
};

export default function SuperAdminDashboardScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [regions, setRegions] = useState<Region[]>([]);
  const [labors, setLabors] = useState<Labor[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [laborPrices, setLaborPrices] = useState<LaborPrice[]>([]);
  const [section, setSection] = useState<Section>("materials");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ApiItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [province, setProvince] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [regionId, setRegionId] = useState<number | null>(null);
  const [laborId, setLaborId] = useState<number | null>(null);

  const handleUnauthorized = useCallback(
    async (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearAdminToken();
        setToken(null);
        router.replace("/(tabs)/super-admin-login");
        return true;
      }
      return false;
    },
    [router],
  );

  const loadDashboard = useCallback(
    async (accessToken: string) => {
      const headers = { Authorization: `Token ${accessToken}` };
      try {
        const [
          dashboardResponse,
          regionResponse,
          laborResponse,
          materialResponse,
          laborPriceResponse,
        ] = await Promise.all([
          axios.get<DashboardStats>(`${API_URL}/admin/dashboard/`, {
            headers,
            timeout: API_TIMEOUT,
          }),
          axios.get(`${API_URL}/regions/`, { headers, timeout: API_TIMEOUT }),
          axios.get(`${API_URL}/labors/`, { headers, timeout: API_TIMEOUT }),
          axios.get(`${API_URL}/materials/`, { headers, timeout: API_TIMEOUT }),
          axios.get(`${API_URL}/labor-prices/`, {
            headers,
            timeout: API_TIMEOUT,
          }),
        ]);
        setStats(dashboardResponse.data);
        setRegions(getList<Region>(regionResponse.data));
        setLabors(getList<Labor>(laborResponse.data));
        setMaterials(getList<Material>(materialResponse.data));
        setLaborPrices(getList<LaborPrice>(laborPriceResponse.data));
      } catch (error: unknown) {
        if (await handleUnauthorized(error)) return;
        const message = axios.isAxiosError(error)
          ? (error.response?.data?.error ?? error.message)
          : error instanceof Error
            ? error.message
            : "Tidak dapat memuat data dashboard.";
        Alert.alert("Dashboard gagal dimuat", String(message));
      } finally {
        setLoading(false);
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    let active = true;
    void getAdminToken().then((savedToken) => {
      if (!active) return;
      if (!savedToken) {
        router.replace("/(tabs)/super-admin-login");
        return;
      }
      setToken(savedToken);
      void loadDashboard(savedToken);
    });
    return () => {
      active = false;
    };
  }, [loadDashboard, router]);

  const list: ApiItem[] = {
    materials,
    "labor-prices": laborPrices,
    labors,
    regions,
  }[section];

  const openCreate = () => {
    setEditing(null);
    setName("");
    setUnit("");
    setProvince("");
    setRegionCode("");
    setCategory("");
    setDescription("");
    setAmount("");
    setRegionId(regions.find((region) => region.is_active)?.id ?? null);
    setLaborId(labors.find((labor) => labor.is_active)?.id ?? null);
    setModalVisible(true);
  };

  const openEdit = (item: ApiItem) => {
    setEditing(item);
    if (section === "materials") {
      const material = item as Material;
      setName(material.nama_material);
      setUnit(material.satuan);
      setAmount(String(material.harga_satuan));
      setRegionId(material.region);
    } else if (section === "labor-prices") {
      const laborPrice = item as LaborPrice;
      setAmount(String(laborPrice.upah_per_satuan));
      setRegionId(laborPrice.region);
      setLaborId(laborPrice.labor);
    } else if (section === "labors") {
      const labor = item as Labor;
      setName(labor.nama_peran);
      setCategory(labor.kategori);
      setUnit(labor.satuan);
      setDescription(labor.deskripsi ?? "");
    } else {
      const region = item as Region;
      setName(region.nama);
      setProvince(region.provinsi ?? "");
      setRegionCode(region.kode ?? "");
    }
    setModalVisible(true);
  };

  const saveItem = async () => {
    const hasPrice = section === "materials" || section === "labor-prices";
    const number = amount.trim() === "" ? Number.NaN : Number(amount);
    if (hasPrice && (!Number.isFinite(number) || number < 0)) {
      Alert.alert(
        "Harga tidak valid",
        "Harga/upah wajib diisi dan tidak boleh negatif.",
      );
      return;
    }
    if (
      ["materials", "labors", "regions"].includes(section) &&
      !name.trim()
    ) {
      Alert.alert("Data belum lengkap", "Nama wajib diisi.");
      return;
    }
    if (section === "materials" && (!unit.trim() || !regionId)) {
      Alert.alert("Data belum lengkap", "Satuan dan wilayah wajib dipilih.");
      return;
    }
    if (section === "labor-prices" && (!laborId || !regionId)) {
      Alert.alert(
        "Data belum lengkap",
        "Jenis tenaga kerja dan wilayah wajib dipilih.",
      );
      return;
    }
    if (section === "labors" && (!category.trim() || !unit.trim())) {
      Alert.alert(
        "Data belum lengkap",
        "Kategori dan satuan tenaga kerja wajib diisi.",
      );
      return;
    }
    if (!token) return;

    setSaving(true);
    const endpoint = section;
    const payload: Record<string, string | number | boolean | null> =
      section === "materials"
        ? {
            nama_material: name.trim(),
            satuan: unit.trim(),
            harga_satuan: number,
            region: regionId,
            source: "manual",
            external_url: "",
            is_active: editing?.is_active ?? true,
          }
        : section === "labor-prices"
          ? {
              labor: laborId,
              region: regionId,
              upah_per_satuan: number,
              source: "MANUAL",
              is_active: editing?.is_active ?? true,
            }
          : section === "labors"
            ? {
                nama_peran: name.trim(),
                kategori: category.trim(),
                satuan: unit.trim(),
                deskripsi: description.trim(),
                is_active: editing?.is_active ?? true,
              }
            : {
                nama: name.trim(),
                provinsi: province.trim(),
                kode: regionCode.trim() || null,
                is_active: editing?.is_active ?? true,
              };
    const existingLaborPrice =
      section === "labor-prices" && !editing
        ? laborPrices.find(
            (price) => price.labor === laborId && price.region === regionId,
          )
        : undefined;
    try {
      const config = {
        headers: { Authorization: `Token ${token}` },
        timeout: API_TIMEOUT,
      };
      if (editing || existingLaborPrice) {
        const itemId = editing?.id ?? existingLaborPrice?.id;
        await axios.patch(`${API_URL}/${endpoint}/${itemId}/`, payload, config);
      } else {
        await axios.post(`${API_URL}/${endpoint}/`, payload, config);
      }
      setModalVisible(false);
      await loadDashboard(token);
    } catch (error: unknown) {
      if (await handleUnauthorized(error)) return;
      const message = axios.isAxiosError<{ detail?: string }>(error)
        ? (error.response?.data?.detail ?? error.message)
        : error instanceof Error
          ? error.message
          : "Perubahan tidak dapat disimpan.";
      Alert.alert("Gagal menyimpan", String(message));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (item: ApiItem) => {
    if (!token) return;
    const isActive = item.is_active;
    Alert.alert(
      isActive ? "Nonaktifkan data?" : "Aktifkan data?",
      isActive
        ? "Data tetap tersimpan, tetapi tidak akan ditawarkan kepada customer atau digunakan untuk RAB."
        : "Data akan tersedia kembali untuk customer dan perhitungan RAB.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: isActive ? "Nonaktifkan" : "Aktifkan",
          style: isActive ? "destructive" : "default",
          onPress: () => {
            void (async () => {
              try {
                await axios.patch(
                  `${API_URL}/${section}/${item.id}/`,
                  { is_active: !isActive },
                  {
                    headers: { Authorization: `Token ${token}` },
                    timeout: API_TIMEOUT,
                  },
                );
                await loadDashboard(token);
              } catch (error: unknown) {
                if (await handleUnauthorized(error)) return;
                Alert.alert(
                  "Status tidak dapat diubah",
                  axios.isAxiosError(error)
                    ? error.message
                    : "Data tidak dapat diperbarui.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(
          `${API_URL}/admin/logout/`,
          {},
          {
            headers: { Authorization: `Token ${token}` },
            timeout: API_TIMEOUT,
          },
        );
      }
    } catch (error: unknown) {
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        Alert.alert(
          "Logout server gagal",
          "Token lokal dihapus, tetapi sesi server mungkin masih aktif.",
        );
      }
    } finally {
      await clearAdminToken();
      router.replace("/(tabs)/super-admin-login");
    }
  };

  if (loading || !token) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Memuat dashboard super admin...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PANEL PENGELOLA</Text>
            <Text style={styles.title}>Dashboard Admin</Text>
            <Text style={styles.subtitle}>Ringkasan data aplikasi AnDari</Text>
          </View>
          <TouchableOpacity onPress={() => void logout()} style={styles.logout}>
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Aktivitas pengunjung</Text>
        <View style={styles.statsRow}>
          <StatCard
            label="Kunjungan hari ini"
            value={stats.visits_today}
            icon="◷"
          />
          <StatCard
            label="Total kunjungan"
            value={stats.visits_total}
            icon="↗"
          />
        </View>
        <View style={styles.visitorCard}>
          <View style={styles.visitorIcon}>
            <Text style={styles.visitorIconText}>◎</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.visitorValue}>{stats.unique_visitors}</Text>
            <Text style={styles.visitorLabel}>Perangkat unik tercatat</Text>
          </View>
          <Text style={styles.privacyNote}>anonim</Text>
        </View>

        <Text style={styles.sectionTitle}>Ringkasan data</Text>
        <View style={styles.statsRow}>
          <StatCard label="Bahan" value={stats.total_materials} icon="▦" />
          <StatCard
            label="Upah tersimpan"
            value={stats.total_labor_prices}
            icon="Rp"
          />
        </View>
        <View style={styles.smallStats}>
          <Text style={styles.smallStat}>
            {stats.total_labor_roles} jenis tenaga kerja
          </Text>
          <Text style={styles.smallStat}>
            {stats.total_regions} wilayah aktif
          </Text>
          <Text style={styles.smallStat}>{stats.total_projects} proyek</Text>
        </View>

        <View style={styles.manageHeader}>
          <View>
            <Text style={styles.sectionTitle}>Kelola data aplikasi</Text>
            <Text style={styles.manageHint}>
              Perubahan tersimpan ke database.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={openCreate}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>＋ Tambah</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segment}
        >
          <SectionButton
            title="Bahan"
            selected={section === "materials"}
            onPress={() => setSection("materials")}
          />
          <SectionButton
            title="Harga upah"
            selected={section === "labor-prices"}
            onPress={() => setSection("labor-prices")}
          />
          <SectionButton
            title="Tenaga kerja"
            selected={section === "labors"}
            onPress={() => setSection("labors")}
          />
          <SectionButton
            title="Wilayah"
            selected={section === "regions"}
            onPress={() => setSection("regions")}
          />
        </ScrollView>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Belum ada data</Text>
            <Text style={styles.emptyText}>
              Tambahkan data pertama menggunakan tombol Tambah.
            </Text>
          </View>
        ) : (
          list.map((item) => (
            <DataRow
              key={`${section}-${item.id}`}
              item={item}
              section={section}
              regions={regions}
              labors={labors}
              onEdit={() => openEdit(item)}
              onToggleActive={() => toggleActive(item)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editing ? "Ubah data" : "Tambah data"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeText}>Tutup</Text>
                </TouchableOpacity>
              </View>

              {section === "materials" ? (
                <>
                  <Field label="Nama bahan">
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Contoh: Batu Bata"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                  <Field label="Satuan">
                    <TextInput
                      style={styles.input}
                      value={unit}
                      onChangeText={setUnit}
                      placeholder="Contoh: buah, zak, m3"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                </>
              ) : section === "labor-prices" ? (
                <Field label="Jenis tenaga kerja">
                  <View style={styles.chips}>
                    {labors
                      .filter(
                        (labor) =>
                          labor.is_active || labor.id === laborId,
                      )
                      .map((labor) => (
                      <ChoiceChip
                        key={labor.id}
                        title={`${labor.nama_peran} (${labor.satuan})${labor.is_active ? "" : " · Nonaktif"}`}
                        selected={laborId === labor.id}
                        onPress={() => setLaborId(labor.id)}
                      />
                      ))}
                  </View>
                </Field>
              ) : section === "labors" ? (
                <>
                  <Field label="Nama tenaga kerja">
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Contoh: Tukang Batu"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                  <Field label="Kategori">
                    <TextInput
                      style={styles.input}
                      value={category}
                      onChangeText={setCategory}
                      placeholder="Contoh: Sipil"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                  <Field label="Satuan">
                    <TextInput
                      style={styles.input}
                      value={unit}
                      onChangeText={setUnit}
                      placeholder="Contoh: OH"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                  <Field label="Deskripsi (opsional)">
                    <TextInput
                      style={styles.input}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Keterangan tenaga kerja"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Nama wilayah">
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Contoh: Bandung"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                  <Field label="Provinsi (opsional)">
                    <TextInput
                      style={styles.input}
                      value={province}
                      onChangeText={setProvince}
                      placeholder="Contoh: Jawa Barat"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                  <Field label="Kode (opsional)">
                    <TextInput
                      style={styles.input}
                      value={regionCode}
                      onChangeText={setRegionCode}
                      placeholder="Contoh: JBR"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                </>
              )}

              {(section === "materials" || section === "labor-prices") && (
                <>
                  <Field
                    label={
                      section === "materials"
                        ? "Harga satuan (Rp)"
                        : "Upah per satuan (Rp)"
                    }
                  >
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                    />
                  </Field>
                  <Field label="Wilayah">
                    <View style={styles.chips}>
                      {regions
                        .filter(
                          (region) =>
                            region.is_active || region.id === regionId,
                        )
                        .map((region) => (
                          <ChoiceChip
                            key={region.id}
                            title={`${region.nama}${region.is_active ? "" : " · Nonaktif"}`}
                            selected={regionId === region.id}
                            onPress={() => setRegionId(region.id)}
                          />
                        ))}
                    </View>
                  </Field>
                </>
              )}
              <TouchableOpacity
                disabled={saving}
                onPress={() => void saveItem()}
                style={[styles.saveButton, saving && { opacity: 0.6 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan ke database</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionButton({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
    >
      <Text
        style={[styles.segmentText, selected && styles.segmentTextSelected]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function DataRow({
  item,
  section,
  regions,
  labors,
  onEdit,
  onToggleActive,
}: {
  item: ApiItem;
  section: Section;
  regions: Region[];
  labors: Labor[];
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  let title: string;
  let detail: string;
  let price: string | null = null;
  if (section === "materials") {
    const material = item as Material;
    title = material.nama_material;
    detail = `${material.region_nama ?? regions.find((region) => region.id === material.region)?.nama ?? "Wilayah"} · ${material.satuan}`;
    price = material.harga_satuan;
  } else if (section === "labor-prices") {
    const wage = item as LaborPrice;
    title =
      labors.find((labor) => labor.id === wage.labor)?.nama_peran ??
      "Tenaga kerja";
    detail = `${wage.region_nama ?? regions.find((region) => region.id === wage.region)?.nama ?? "Wilayah"} · ${labors.find((labor) => labor.id === wage.labor)?.satuan ?? ""}`;
    price = wage.upah_per_satuan;
  } else if (section === "labors") {
    const labor = item as Labor;
    title = labor.nama_peran;
    detail = `${labor.kategori} · ${labor.satuan}`;
  } else {
    const region = item as Region;
    title = region.nama;
    detail = [region.provinsi, region.kode].filter(Boolean).join(" · ") || "Data wilayah";
  }

  return (
    <View style={styles.dataRow}>
      <View style={styles.dataMain}>
        <Text style={styles.dataName}>{title}</Text>
        <Text style={styles.dataMeta}>{detail}</Text>
        {price !== null && (
          <Text style={styles.dataPrice}>
            Rp {Number(price).toLocaleString("id-ID")}
          </Text>
        )}
        <Text
          style={[
            styles.statusBadge,
            item.is_active ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          {item.is_active ? "Aktif" : "Nonaktif"}
        </Text>
      </View>
      <View style={styles.dataActions}>
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editText}>Ubah</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onToggleActive}
          style={[
            styles.statusButton,
            item.is_active ? styles.disableButton : styles.enableButton,
          ]}
        >
          <Text
            style={[
              styles.statusButtonText,
              item.is_active ? styles.disableText : styles.enableText,
            ]}
          >
            {item.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChoiceChip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  loading: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, color: "#475569" },
  content: { padding: 18, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  eyebrow: {
    color: "#EA580C",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: { color: "#0F172A", fontSize: 25, fontWeight: "800", marginTop: 5 },
  subtitle: { color: "#64748B", fontSize: 13, marginTop: 4 },
  logout: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  logoutText: { color: "#334155", fontSize: 13, fontWeight: "700" },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statIcon: {
    width: 34,
    height: 34,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    borderRadius: 10,
    color: "#C2410C",
    backgroundColor: "#FFEDD5",
    fontSize: 18,
    fontWeight: "800",
  },
  statValue: { color: "#0F172A", fontSize: 25, fontWeight: "800" },
  statLabel: { color: "#64748B", fontSize: 12, marginTop: 12 },
  visitorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 15,
    marginBottom: 24,
  },
  visitorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  visitorIconText: { color: "#FDBA74", fontSize: 22, fontWeight: "700" },
  visitorValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  visitorLabel: { color: "#CBD5E1", fontSize: 12, marginTop: 2 },
  privacyNote: { color: "#FDBA74", fontSize: 11, fontWeight: "700" },
  smallStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 25,
  },
  smallStat: {
    color: "#475569",
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "600",
  },
  manageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  manageHint: { color: "#64748B", fontSize: 12, marginTop: -7 },
  addButton: {
    backgroundColor: "#EA580C",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  segment: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    padding: 4,
    borderRadius: 11,
    marginBottom: 12,
    gap: 4,
  },
  segmentButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentButtonSelected: { backgroundColor: "#FFFFFF" },
  segmentText: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  segmentTextSelected: { color: "#0F172A" },
  empty: {
    alignItems: "center",
    padding: 24,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: { color: "#0F172A", fontSize: 15, fontWeight: "700" },
  emptyText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    padding: 13,
    marginBottom: 9,
  },
  dataMain: { flex: 1 },
  dataName: { color: "#0F172A", fontSize: 14, fontWeight: "700" },
  dataMeta: { color: "#64748B", fontSize: 11, marginTop: 4 },
  dataPrice: {
    color: "#C2410C",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  activeBadge: { color: "#15803D", backgroundColor: "#DCFCE7" },
  inactiveBadge: { color: "#64748B", backgroundColor: "#E2E8F0" },
  dataActions: { gap: 7, marginLeft: 8 },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 7,
  },
  editText: { color: "#1D4ED8", fontWeight: "700", fontSize: 11 },
  statusButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  disableButton: { backgroundColor: "#FEF2F2" },
  enableButton: { backgroundColor: "#F0FDF4" },
  statusButtonText: { fontWeight: "700", fontSize: 11 },
  disableText: { color: "#B91C1C" },
  enableText: { color: "#15803D" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#0F172A99",
  },
  modalScroll: { flexGrow: 1, justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 35,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { color: "#0F172A", fontSize: 19, fontWeight: "800" },
  closeText: { color: "#64748B", fontWeight: "700" },
  field: { marginTop: 15 },
  fieldLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#0F172A",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  chipSelected: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  chipText: { color: "#475569", fontSize: 11, fontWeight: "600" },
  chipTextSelected: { color: "#C2410C" },
  saveButton: {
    minHeight: 47,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 23,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
