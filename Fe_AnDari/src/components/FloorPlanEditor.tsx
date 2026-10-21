import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useFloorPlanStore } from "@/store/floorPlanStore";
import Toolbar from "./Toolbar";
import PropertyPanel from "./PropertyPanel";
import FloorPlanCanvas from "./FloorPlanCanvas";

export default function FloorPlanEditor() {
  const {
    data,
    mode,
    selected,
    setSelected,
    addDoor,
    addWindow,
    updateItem,
    showGrid,
    snapEnabled,
  } = useFloorPlanStore();

  const scale = 0.5;

  if (!data || !data.rooms) {
    return (
      <View style={styles.container}>
        <Text>Loading data denah...</Text>
      </View>
    );
  }

  const handlePress = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    // kurangi padding 20 (kiri atas svg + 20)
    const canvasX = (locationX - 20) / scale;
    const canvasY = (locationY - 20) / scale;

    if (mode === "add-door") addDoor(canvasX, canvasY);
    else if (mode === "add-window") addWindow(canvasX, canvasY);
    else if (mode === "select") {
      const hit = hitTest(canvasX, canvasY, data);
      setSelected(hit);
    }
  };

  const handleMoveItem = (type: string, id: string, x: number, y: number) => {
    console.log("📍 [Move]", type, id, x, y);
    updateItem(type, id, { x, y });
  };

  const canvasW = data.totalWidth * scale;
  const canvasH = data.totalHeight * scale;

  return (
    <View style={styles.container}>
      <Toolbar />
      <View style={styles.canvasArea}>
        <View style={{ width: canvasW + 40, height: canvasH + 40 }}>
          <FloorPlanCanvas
            data={data}
            scale={scale}
            showGrid={showGrid}
            selected={selected}
            snapEnabled={snapEnabled}
            onMoveItem={handleMoveItem}
          />
          {/* Overlay hanya aktif di mode non-select agar tidak blokir drag */}
          {mode !== "select" && (
            <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />
          )}
          {mode === "select" && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handlePress}
              pointerEvents="box-only"
            />
          )}
        </View>
      </View>
      <PropertyPanel />
    </View>
  );
}

function hitTest(x: number, y: number, data: any) {
  // Pintu & jendela prioritas (karena ukurannya kecil)
  for (const d of data.doors) {
    const dx = Math.abs(x - d.x);
    const dy = Math.abs(y - d.y);
    if (dx < 30 && dy < 30) return { type: "door", id: d.id };
  }
  for (const w of data.windows) {
    const dx = Math.abs(x - w.x);
    const dy = Math.abs(y - w.y);
    if (dx < 30 && dy < 30) return { type: "window", id: w.id };
  }
  for (const w of data.walls) {
    if (x >= w.x && x <= w.x + w.width && y >= w.y && y <= w.y + w.height)
      return { type: "wall", id: w.id };
  }
  for (const r of data.rooms) {
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)
      return { type: "room", id: r.id };
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  canvasArea: {
    flex: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8e8e8",
  },
});
