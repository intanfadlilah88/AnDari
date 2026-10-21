import { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useFloorPlanStore } from "@/store/floorPlanStore";
import SizeSetupModal from "./SizeSetupModal";

const modes = [
  { key: "select", label: "👆 Pilih" },
  { key: "add-door", label: "🚪 Pintu" },
  { key: "add-window", label: "🪟 Jendela" },
  { key: "add-wall", label: "🧱 Dinding" },
  { key: "add-room", label: "🏠 Ruangan" },
];

const gridOptions = [30, 50, 100];

export default function Toolbar() {
  const {
    mode,
    setMode,
    showGrid,
    toggleGrid,
    snapEnabled,
    toggleSnap,
    gridSize,
    setGridSize,
    undo,
    redo,
    history,
    historyIndex,
    updateItem,
    data,
  } = useFloorPlanStore();

  const [showSizeModal, setShowSizeModal] = useState(false);

  // ✅ Set gridSize sekaligus update data.gridSize agar grid di canvas berubah
  const handleSetGrid = (size: number) => {
    setGridSize(size);
    // update data.gridSize supaya renderGrid() di canvas ikut berubah
    useFloorPlanStore.setState({
      data: { ...data, gridSize: size },
    });
  };

  return (
    <View style={styles.container}>
      {/* BARIS 1: MODE */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.btn, mode === m.key && styles.btnActive]}
              onPress={() => setMode(m.key as any)}
            >
              <Text
                style={[styles.btnText, mode === m.key && styles.btnTextActive]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.btn, showGrid && styles.btnGrid]}
            onPress={toggleGrid}
          >
            <Text style={styles.btnText}>
              {showGrid ? "📐 Grid ON" : "📐 Grid OFF"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, snapEnabled && styles.btnSnap]}
            onPress={toggleSnap}
          >
            <Text style={styles.btnText}>
              {snapEnabled ? "🧲 Snap ON" : "🧲 Snap OFF"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, historyIndex <= 0 && styles.btnDisabled]}
            onPress={undo}
            disabled={historyIndex <= 0}
          >
            <Text style={styles.btnText}>↩️ Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              historyIndex >= history.length - 1 && styles.btnDisabled,
            ]}
            onPress={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Text style={styles.btnText}>↪️ Redo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BARIS 2: UKURAN GRID */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          <Text style={styles.label}>📏 Grid:</Text>

          {gridOptions.map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.btn, gridSize === size && styles.btnGridSize]}
              onPress={() => handleSetGrid(size)}
            >
              <Text
                style={[
                  styles.btnText,
                  gridSize === size && styles.btnTextActive,
                ]}
              >
                {size} cm
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.btn, styles.btnSetup]}
            onPress={() => setShowSizeModal(true)}
          >
            <Text style={styles.btnText}>⚙️ Atur Lahan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SizeSetupModal
        visible={showSizeModal}
        onClose={() => setShowSizeModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  btnActive: {
    borderColor: "#1976d2",
    borderWidth: 2,
    backgroundColor: "#e3f2fd",
  },
  btnGrid: {
    borderColor: "#27ae60",
    borderWidth: 2,
    backgroundColor: "#e8f5e9",
  },
  btnSnap: {
    borderColor: "#e67e22",
    borderWidth: 2,
    backgroundColor: "#fff3e0",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 11, color: "#333" },
  btnTextActive: { fontWeight: "bold", color: "#000" },
  label: { fontSize: 11, color: "#666", marginRight: 4, fontWeight: "600" },
  btnGridSize: {
    borderColor: "#27ae60",
    borderWidth: 2,
    backgroundColor: "#e8f5e9",
  },
  btnSetup: { borderColor: "#9b59b6", backgroundColor: "#f3e5f5" },
});