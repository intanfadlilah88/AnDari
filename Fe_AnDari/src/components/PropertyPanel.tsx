import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useFloorPlanStore } from "@/store/floorPlanStore";

export default function PropertyPanel() {
  const { data, selected, updateItem, deleteItem } = useFloorPlanStore();

  if (!selected || !data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          👆 Tap item pada denah untuk mengedit
        </Text>
      </View>
    );
  }

  const list: any[] =
    selected.type === "door"
      ? data.doors
      : selected.type === "window"
        ? data.windows
        : selected.type === "wall"
          ? data.walls
          : data.rooms;
  const item = list.find((it) => it.id === selected.id);
  if (!item) return null;

  const update = (changes: any) =>
    updateItem(selected.type, selected.id, changes);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {selected.type === "door" && "🚪 Pintu"}
          {selected.type === "window" && "🪟 Jendela"}
          {selected.type === "wall" && "🧱 Dinding"}
          {selected.type === "room" && "🏠 Ruangan"}
          <Text style={styles.idText}> · {selected.id}</Text>
        </Text>
        <TouchableOpacity
          style={styles.btnDelete}
          onPress={() => deleteItem(selected.type, selected.id)}
        >
          <Text style={styles.btnDeleteText}>🗑️ Hapus</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {/* X */}
          <Field
            label="X (cm)"
            value={item.x}
            onChange={(v) => update({ x: v })}
          />

          {/* Y */}
          <Field
            label="Y (cm)"
            value={item.y}
            onChange={(v) => update({ y: v })}
          />

          {/* Width — untuk pintu/jendela */}
          {(selected.type === "door" || selected.type === "window") && (
            <Field
              label="Lebar (cm)"
              value={item.width}
              onChange={(v) => update({ width: v })}
            />
          )}

          {/* Width & Height — untuk wall/room */}
          {(selected.type === "wall" || selected.type === "room") && (
            <>
              <Field
                label="W (cm)"
                value={item.width}
                onChange={(v) => update({ width: v })}
              />
              <Field
                label="H (cm)"
                value={item.height}
                onChange={(v) => update({ height: v })}
              />
            </>
          )}

          {/* Rotation */}
          {(selected.type === "door" || selected.type === "window") && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Rotasi</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    (item.rotation ?? 0) === 0 && styles.chipActive,
                  ]}
                  onPress={() => update({ rotation: 0 })}
                >
                  <Text style={styles.chipText}>⬌ 0°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    item.rotation === 90 && styles.chipActive,
                  ]}
                  onPress={() => update({ rotation: 90 })}
                >
                  <Text style={styles.chipText}>⬍ 90°</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Swing (khusus pintu) */}
          {selected.type === "door" && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Arah Buka</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    item.swing === "left" && styles.chipActive,
                  ]}
                  onPress={() => update({ swing: "left" })}
                >
                  <Text style={styles.chipText}>↰ Kiri</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    item.swing !== "left" && styles.chipActive,
                  ]}
                  onPress={() => update({ swing: "right" })}
                >
                  <Text style={styles.chipText}>↱ Kanan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        defaultValue={String(value)}
        onEndEditing={(e) => {
          const n = parseFloat(e.nativeEvent.text);
          if (!isNaN(n)) onChange(n);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 8,
  },
  empty: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    padding: 14,
    alignItems: "center",
  },
  emptyText: { color: "#888", fontSize: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  title: { fontSize: 13, fontWeight: "bold", color: "#222" },
  idText: { fontSize: 10, color: "#999", fontWeight: "normal" },
  btnDelete: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#e57373",
  },
  btnDeleteText: { color: "#c62828", fontSize: 11, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, paddingHorizontal: 12 },
  fieldGroup: { gap: 4 },
  label: { fontSize: 10, color: "#666", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 70,
    fontSize: 12,
    backgroundColor: "#fafafa",
  },
  btnRow: { flexDirection: "row", gap: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  chipActive: { borderColor: "#1976d2", backgroundColor: "#e3f2fd" },
  chipText: { fontSize: 11, color: "#333" },
});