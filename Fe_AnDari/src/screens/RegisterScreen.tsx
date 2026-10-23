// src/screens/RegisterScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { register, parseAuthError } from "../services/auth";

type Props = {
  onBack: () => void;
  onSuccessLogin: (token: string) => void;
};

export default function RegisterScreen({ onBack, onSuccessLogin }: Props) {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nama.trim()) {
      Alert.alert("Validasi", "Nama wajib diisi.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Validasi", "Email wajib diisi.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Validasi", "Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Validasi", "Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      const res = await register({
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert("✅ Berhasil", "Akun berhasil dibuat. Selamat datang!", [
        {
          text: "OK",
          onPress: () => onSuccessLogin(res.token),
        },
      ]);
    } catch (err: any) {
      // ✅ PERBAIKAN: Blok try-catch-finally sekarang ditutup dengan benar
      console.log("🔴 [UI] Menangkap error dari API:", err?.message);
      Alert.alert("Registrasi Gagal", parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }; // ✅ Penutup fungsi handleRegister

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.titleHeader}>Daftar Akun</Text>
              <Text style={styles.subtitleHeader}>
                Buat akun untuk mulai merancang rumah
              </Text>
            </View>
          </View>

          {/* FORM */}
          <View style={styles.card}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Nama lengkap kamu"
                placeholderTextColor="#94A3B8"
                value={nama}
                onChangeText={setNama}
              />
            </View>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="email@contoh.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass((s) => !s)}>
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Konfirmasi Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#64748B"
              />
              <TextInput
                style={styles.input}
                placeholder="Ulangi password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPass}
                value={confirm}
                onChangeText={setConfirm}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.btnText}>Daftar</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Sudah punya akun? </Text>
              <TouchableOpacity onPress={onBack}>
                <Text style={styles.footerLink}>Masuk di sini</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A2B4C" },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitleHeader: {
    color: "#D1D5DB",
    fontSize: 13,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 28,
    flex: 1,
    minHeight: 500,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 10,
  },

  btn: {
    backgroundColor: "#F5A623",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: { color: "#64748B", fontSize: 14 },
  footerLink: { color: "#F5A623", fontSize: 14, fontWeight: "700" },
});