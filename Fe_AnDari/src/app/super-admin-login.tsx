import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { saveAdminToken } from "../../utils/admin-auth";

type LoginResponse = { token: string; username: string };

export default function SuperAdminLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username.trim() || !password) {
      Alert.alert(
        "Data belum lengkap",
        "Masukkan username dan password admin.",
      );
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/admin/login/`,
        { username: username.trim(), password },
        { timeout: API_TIMEOUT },
      );
      if (!response.data.token) {
        throw new Error("Server tidak mengirim token admin.");
      }
      await saveAdminToken(response.data.token);
      router.replace("/(tabs)/super-admin");
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ error?: string }>(error)
        ? (error.response?.data?.error ??
          "Tidak dapat masuk. Periksa koneksi backend dan akun super admin.")
        : error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat login.";
      Alert.alert("Login admin gagal", message);
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.replace("/(tabs)")}
        style={styles.back}
      >
        <Text style={styles.backText}>‹ Kembali</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>◆</Text>
        </View>
        <Text style={styles.title}>Masuk Super Admin</Text>
        <Text style={styles.subtitle}>
          Akses khusus untuk pengelolaan data AnDari.
        </Text>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          placeholder="Username admin"
          placeholderTextColor="#94A3B8"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          placeholder="Password"
          placeholderTextColor="#94A3B8"
          onSubmitEditing={() => void login()}
        />
        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading}
          onPress={() => void login()}
          style={[styles.button, loading && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Masuk</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9", padding: 20 },
  back: { paddingVertical: 10, alignSelf: "flex-start" },
  backText: { color: "#334155", fontSize: 15, fontWeight: "600" },
  card: {
    marginTop: 45,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
    marginBottom: 18,
  },
  icon: { color: "#EA580C", fontSize: 24 },
  title: { color: "#0F172A", fontSize: 23, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 14, lineHeight: 21, marginTop: 7 },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  button: {
    minHeight: 48,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  disabled: { opacity: 0.65 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
