// src/screens/LoginScreen.tsx
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

// ✅ PERBAIKAN: Gunakan path relatif mundur satu folder (../) untuk mencari folder services
import { login, parseAuthError } from "../services/auth";

type Props = {
  onSuccessLogin: (token: string) => void;
  onGoToRegister: () => void;
};

export default function LoginScreen({ onSuccessLogin, onGoToRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validasi", "Email dan password wajib diisi.");
      return;
    }
    try {
      setLoading(true);
      // Fungsi login dari services/auth.ts
      const res = await login({ email: email.trim(), password });
      // Jika sukses, panggil props untuk ubah state di _layout.tsx
      onSuccessLogin(res.token);
    } catch (err: any) {
      Alert.alert("Login Gagal", parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

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
          {/* HEADER LOGO */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Ionicons name="home" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.brand}>AnDari</Text>
            <Text style={styles.subtitle}>
              Masuk untuk melanjutkan rancangan rumahmu
            </Text>
          </View>

          {/* FORM */}
          <View style={styles.card}>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.cardSub}>
              Gunakan email & password yang terdaftar
            </Text>

            {/* EMAIL */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="email@contoh.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* PASSWORD */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Password"
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

            {/* LOGIN BUTTON */}
            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.btnText}>Masuk</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* LINK REGISTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Belum punya akun? </Text>
              <TouchableOpacity onPress={onGoToRegister}>
                <Text style={styles.footerLink}>Daftar Sekarang</Text>
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
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    color: "#D1D5DB",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 28,
    flex: 1,
    minHeight: 400,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  cardSub: { fontSize: 13, color: "#64748B", marginTop: 4, marginBottom: 20 },

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
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 10,
  },

  btn: {
    backgroundColor: "#1A2B4C",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
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
