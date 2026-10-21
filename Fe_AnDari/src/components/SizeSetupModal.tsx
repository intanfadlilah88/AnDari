import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { useFloorPlanStore } from "@/store/floorPlanStore";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SizeSetupModal({ visible, onClose }: Props) {
  const { data, updateData } = useFloorPlanStore();
  const [width, setWidth] = useState(String(data.totalWidth));
  const [height, setHeight] = useState(String(data.totalHeight));
  const [gridSize, setGridSize] = useState(String(data.gridSize));

  const handleApply = () => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    const g = parseFloat(gridSize);

    if (isNaN(w) || isNaN(h) || isNaN(g)) {
      alert("Masukkan angka yang valid");
      return;
    }
    if (w < 100 || h < 100) {
      alert("Ukuran minimal 100cm");
      return;
    }

    updateData((d) => ({
      ...d,
      totalWidth: w,
      totalHeight: h,
      gridSize: g,
    }));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>📐 Atur Ukuran Lahan</Text>

          <Text style={styles.label}>Lebar (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={width}
            onChangeText={setWidth}
            placeholder="contoh: 900"
          />

          <Text style={styles.label}>Tinggi (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            placeholder="contoh: 600"
          />

          <Text style={styles.label}>Ukuran Grid (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={gridSize}
            onChangeText={setGridSize}
            placeholder="contoh: 50"
          />

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onClose}
            >
              <Text>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnApply]}
              onPress={handleApply}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Terapkan
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  label: { fontSize: 12, color: "#666", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  btn: { flex: 1, padding: 12, borderRadius: 6, alignItems: "center" },
  btnCancel: { backgroundColor: "#eee" },
  btnApply: { backgroundColor: "#27ae60" },
});
