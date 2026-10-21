import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Line, Rect, Text as SvgText, G } from "react-native-svg";

type ViewMode = "grid" | "plan";

type Props = {
  children: React.ReactNode; // FloorPlanCanvas versi 2D
  buildingId?: number;
};

const GRID_STEP_PX = 50;       // jarak antar grid (pixel)
const GRID_COLOR_THIN = "#ececec";
const GRID_COLOR_THICK = "#d0d0d0";
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

export default function FloorPlanViewer({ children }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");

  return (
    <View style={styles.container}>
      {/* Toolbar Toggle */}
      <View style={styles.toolbar}>
        <Text style={styles.title}>🏗️ Denah Rumah</Text>
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.btn, mode === "grid" && styles.btnActiveGrid]}
            onPress={() => setMode("grid")}
          >
            <Text style={[styles.btnText, mode === "grid" && styles.btnTextActive]}>
              📐 Grid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, mode === "plan" && styles.btnActivePlan]}
            onPress={() => setMode("plan")}
          >
            <Text style={[styles.btnText, mode === "plan" && styles.btnTextActive]}>
              🏠 Denah 2D
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Konten */}
      <View style={styles.content}>
        {mode === "grid" ? (
          <GridOnlyView />
        ) : (
          <View style={styles.planWrapper}>{children}</View>
        )}
      </View>
    </View>
  );
}

// ==========================================
// Tampilan Grid Kosong
// ==========================================
function GridOnlyView() {
  const thinLines: React.ReactNode[] = [];
  const thickLines: React.ReactNode[] = [];

  // Grid tipis setiap 50px
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_STEP_PX) {
    thinLines.push(
      <Line
        key={`tv-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={CANVAS_HEIGHT}
        stroke={GRID_COLOR_THIN}
        strokeWidth={1}
      />
    );
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_STEP_PX) {
    thinLines.push(
      <Line
        key={`th-${y}`}
        x1={0}
        y1={y}
        x2={CANVAS_WIDTH}
        y2={y}
        stroke={GRID_COLOR_THIN}
        strokeWidth={1}
      />
    );
  }

  // Grid tebal setiap 200px
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_STEP_PX * 4) {
    thickLines.push(
      <Line
        key={`bv-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={CANVAS_HEIGHT}
        stroke={GRID_COLOR_THICK}
        strokeWidth={1.5}
      />
    );
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_STEP_PX * 4) {
    thickLines.push(
      <Line
        key={`bh-${y}`}
        x1={0}
        y1={y}
        x2={CANVAS_WIDTH}
        y2={y}
        stroke={GRID_COLOR_THICK}
        strokeWidth={1.5}
      />
    );
  }

  return (
    <View style={styles.gridContainer}>
      <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={styles.svg}>
        <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#ffffff" />
        {thinLines}
        {thickLines}

        {/* Label koordinat di sudut */}
        <SvgText x={8} y={16} fontSize={10} fill="#999">
          0,0
        </SvgText>
        <SvgText x={CANVAS_WIDTH - 60} y={16} fontSize={10} fill="#999">
          {CANVAS_WIDTH}px
        </SvgText>
        <SvgText x={8} y={CANVAS_HEIGHT - 6} fontSize={10} fill="#999">
          {CANVAS_HEIGHT}px
        </SvgText>

        {/* Info di tengah */}
        <G>
          <SvgText
            x={CANVAS_WIDTH / 2}
            y={CANVAS_HEIGHT / 2 - 10}
            fontSize={16}
            fill="#888"
            textAnchor="middle"
            fontWeight="bold"
          >
            📐 Kanvas Kosong
          </SvgText>
          <SvgText
            x={CANVAS_WIDTH / 2}
            y={CANVAS_HEIGHT / 2 + 15}
            fontSize={12}
            fill="#aaa"
            textAnchor="middle"
          >
            Tekan "🏠 Denah 2D" untuk menampilkan denah
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  btnGroup: {
    flexDirection: "row",
    gap: 6,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  btnActiveGrid: {
    backgroundColor: "#e3f2fd",
    borderColor: "#1976d2",
  },
  btnActivePlan: {
    backgroundColor: "#e8f5e9",
    borderColor: "#27ae60",
  },
  btnText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
  },
  btnTextActive: {
    color: "#111",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  svg: {
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  planWrapper: {
    flex: 1,
    width: "100%",
  },
});