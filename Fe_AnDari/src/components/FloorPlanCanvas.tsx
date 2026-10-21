import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G, Path } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

// ============ TIPE ============
export type Wall = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type Door = {
  id: string;
  x: number;
  y: number;
  width: number;
  rotation?: number;
  swing?: "left" | "right";
};
export type WindowItem = {
  id: string;
  x: number;
  y: number;
  width: number;
  rotation?: number;
};
export type Room = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
};
export type FloorPlanData = {
  buildingName: string;
  totalWidth: number;
  totalHeight: number;
  gridSize: number;
  walls: Wall[];
  doors: Door[];
  windows: WindowItem[];
  rooms: Room[];
};

export const CUSTOMER_ORDER: FloorPlanData = {
  buildingName: "Rumah Type 45 - Bpk. Andi",
  totalWidth: 900,
  totalHeight: 600,
  gridSize: 50,
  walls: [
    { id: "w1", x: 0, y: 0, width: 900, height: 15 },
    { id: "w2", x: 0, y: 0, width: 15, height: 600 },
    { id: "w3", x: 885, y: 0, width: 15, height: 600 },
    { id: "w4", x: 0, y: 585, width: 900, height: 15 },
    { id: "w5", x: 400, y: 0, width: 15, height: 350 },
    { id: "w6", x: 400, y: 350, width: 500, height: 15 },
    { id: "w7", x: 700, y: 0, width: 15, height: 350 },
  ],
  doors: [
    { id: "d1", x: 420, y: 585, width: 90, rotation: 0, swing: "right" },
    { id: "d2", x: 300, y: 355, width: 80, rotation: 0, swing: "left" },
    { id: "d3", x: 700, y: 200, width: 80, rotation: 90, swing: "right" },
    { id: "d4", x: 500, y: 355, width: 70, rotation: 0, swing: "right" },
  ],
  windows: [
    { id: "win1", x: 100, y: 0, width: 120, rotation: 0 },
    { id: "win2", x: 750, y: 0, width: 100, rotation: 0 },
    { id: "win3", x: 885, y: 400, width: 100, rotation: 90 },
    { id: "win4", x: 600, y: 585, width: 100, rotation: 0 },
  ],
  rooms: [
    {
      id: "r1",
      name: "R. Tamu",
      x: 15,
      y: 15,
      width: 385,
      height: 335,
      color: "#e3f2fd",
    },
    {
      id: "r2",
      name: "Kamar 1",
      x: 415,
      y: 15,
      width: 285,
      height: 335,
      color: "#fff3e0",
    },
    {
      id: "r3",
      name: "Kamar 2",
      x: 715,
      y: 15,
      width: 170,
      height: 335,
      color: "#f3e5f5",
    },
    {
      id: "r4",
      name: "Dapur",
      x: 15,
      y: 365,
      width: 885,
      height: 220,
      color: "#e8f5e9",
    },
  ],
};

type SelectedItem = {
  type: "door" | "window" | "wall" | "room";
  id: string;
} | null;

type Props = {
  data?: FloorPlanData;
  scale?: number;
  showGrid?: boolean;
  showDimensions?: boolean;
  showLabels?: boolean;
  selected?: SelectedItem;
  snapEnabled?: boolean;
  /** Dipanggil saat user drag item terpilih */
  onMoveItem?: (type: string, id: string, x: number, y: number) => void;
};

export default function FloorPlanCanvas({
  data = CUSTOMER_ORDER,
  scale = 0.5,
  showGrid = true,
  showDimensions = true,
  showLabels = true,
  selected = null,
  snapEnabled = true,
  onMoveItem,
}: Props) {
  // ===== Shared values untuk pan & zoom =====
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scaleZoom = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // ===== Shared values untuk drag item terpilih =====
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Guard SETELAH hooks
  if (!data || !data.walls) {
    return (
      <View style={styles.container}>
        <SvgText>Loading data...</SvgText>
      </View>
    );
  }

  const { walls, doors, windows, rooms, gridSize } = data;
  const canvasWidth = data.totalWidth * scale;
  const canvasHeight = data.totalHeight * scale;

  const isSel = (type: string, id: string) =>
    selected?.type === type && selected.id === id;

  // Cari item terpilih untuk drag
  const selectedItem: any = (() => {
    if (!selected) return null;
    const list: any[] =
      selected.type === "door"
        ? doors
        : selected.type === "window"
          ? windows
          : selected.type === "wall"
            ? walls
            : rooms;
    return list.find((it) => it.id === selected.id);
  })();

  const snap = (v: number) =>
    snapEnabled ? Math.round(v / gridSize) * gridSize : v;

  // ===== Gesture drag untuk item terpilih =====
  const dragGesture = Gesture.Pan()
    .enabled(!!selectedItem)
    .onStart(() => {
      isDragging.value = true;
      dragX.value = 0;
      dragY.value = 0;
    })
    .onUpdate((e) => {
      dragX.value = e.translationX / scale / scaleZoom.value;
      dragY.value = e.translationY / scale / scaleZoom.value;
    })
    .onEnd(() => {
      const newX = snap(selectedItem.x + dragX.value);
      const newY = snap(selectedItem.y + dragY.value);
      if (onMoveItem && selected) {
        runOnJS(onMoveItem)(selected.type, selected.id, newX, newY);
      }
      dragX.value = 0;
      dragY.value = 0;
      isDragging.value = false;
    });

  // ===== Pan & Pinch untuk canvas =====
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scaleZoom.value = Math.max(0.3, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scaleZoom.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scaleZoom.value },
    ],
  }));

  // ===== Render grid (mengikuti gridSize dari data) =====
  const renderGrid = () => {
    if (!showGrid) return null;
    const lines: React.ReactNode[] = [];
    const step = gridSize * scale;
    for (let x = 0; x <= canvasWidth; x += step) {
      const isThick = Math.round(x / step) % 4 === 0;
      lines.push(
        <Line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasHeight}
          stroke={isThick ? "#d0d0d0" : "#ececec"}
          strokeWidth={isThick ? 1 : 0.5}
        />,
      );
    }
    for (let y = 0; y <= canvasHeight; y += step) {
      const isThick = Math.round(y / step) % 4 === 0;
      lines.push(
        <Line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={canvasWidth}
          y2={y}
          stroke={isThick ? "#d0d0d0" : "#ececec"}
          strokeWidth={isThick ? 1 : 0.5}
        />,
      );
    }
    return lines;
  };

  const renderRooms = () =>
    rooms.map((r) => {
      const isSelected = isSel("room", r.id);
      const dx = isSelected && isDragging.value ? dragX.value : 0;
      const dy = isSelected && isDragging.value ? dragY.value : 0;
      return (
        <G key={r.id}>
          <Rect
            x={(r.x + dx) * scale}
            y={(r.y + dy) * scale}
            width={r.width * scale}
            height={r.height * scale}
            fill={r.color ?? "#f5f5f5"}
            stroke={isSelected ? "#1976d2" : "#bbb"}
            strokeWidth={isSelected ? 2 : 0.5}
          />
          {showLabels && (
            <SvgText
              x={(r.x + dx + r.width / 2) * scale}
              y={(r.y + dy + r.height / 2) * scale}
              fontSize={10}
              fill="#555"
              textAnchor="middle"
              fontWeight="bold"
            >
              {r.name}
            </SvgText>
          )}
        </G>
      );
    });

  const renderWalls = () =>
    walls.map((w) => {
      const isSelected = isSel("wall", w.id);
      const dx = isSelected && isDragging.value ? dragX.value : 0;
      const dy = isSelected && isDragging.value ? dragY.value : 0;
      return (
        <Rect
          key={w.id}
          x={(w.x + dx) * scale}
          y={(w.y + dy) * scale}
          width={w.width * scale}
          height={w.height * scale}
          fill="#222"
          stroke={isSelected ? "#1976d2" : "none"}
          strokeWidth={2}
        />
      );
    });

  const renderDoors = () =>
    doors.map((d) => {
      const w = d.width * scale;
      const isSelected = isSel("door", d.id);
      const dx = isSelected && isDragging.value ? dragX.value : 0;
      const dy = isSelected && isDragging.value ? dragY.value : 0;
      const x = (d.x + dx) * scale;
      const y = (d.y + dy) * scale;
      const isVertical = d.rotation === 90;
      const swingRight = d.swing !== "left";
      const arcPath = isVertical
        ? swingRight
          ? `M ${x} ${y} A ${w} ${w} 0 0 1 ${x} ${y + w}`
          : `M ${x} ${y} A ${w} ${w} 0 0 0 ${x} ${y + w}`
        : swingRight
          ? `M ${x} ${y} A ${w} ${w} 0 0 1 ${x + w} ${y}`
          : `M ${x} ${y} A ${w} ${w} 0 0 0 ${x + w} ${y}`;

      const color = isSelected ? "#1976d2" : "#8d6e63";

      return (
        <G key={d.id}>
          <Rect
            x={isVertical ? x - 3 : x}
            y={isVertical ? y : y - 3}
            width={isVertical ? 6 : w}
            height={isVertical ? w : 6}
            fill="#ffffff"
          />
          <Line
            x1={x}
            y1={y}
            x2={isVertical ? x : x + w}
            y2={isVertical ? y + w : y}
            stroke={color}
            strokeWidth={isSelected ? 3 : 2}
          />
          <Path
            d={arcPath}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3,3"
            fill="none"
          />
          {showLabels && (
            <SvgText
              x={isVertical ? x + 8 : x + w / 2}
              y={isVertical ? y + w / 2 : y - 6}
              fontSize={7}
              fill={color}
              textAnchor="middle"
            >
              {d.width}cm
            </SvgText>
          )}
        </G>
      );
    });

  const renderWindows = () =>
    windows.map((win) => {
      const w = win.width * scale;
      const isSelected = isSel("window", win.id);
      const dx = isSelected && isDragging.value ? dragX.value : 0;
      const dy = isSelected && isDragging.value ? dragY.value : 0;
      const x = (win.x + dx) * scale;
      const y = (win.y + dy) * scale;
      const isVertical = win.rotation === 90;
      const color = isSelected ? "#d32f2f" : "#1976d2";
      return (
        <G key={win.id}>
          <Rect
            x={isVertical ? x - 3 : x}
            y={isVertical ? y : y - 3}
            width={isVertical ? 6 : w}
            height={isVertical ? w : 6}
            fill="#ffffff"
          />
          <Line
            x1={x}
            y1={y}
            x2={isVertical ? x : x + w}
            y2={isVertical ? y + w : y}
            stroke={color}
            strokeWidth={isSelected ? 5 : 3}
          />
          <Line
            x1={isVertical ? x - 2 : x}
            y1={isVertical ? y : y - 2}
            x2={isVertical ? x - 2 : x + w}
            y2={isVertical ? y + w : y - 2}
            stroke="#64b5f6"
            strokeWidth={1}
          />
          {showLabels && (
            <SvgText
              x={isVertical ? x - 8 : x + w / 2}
              y={isVertical ? y + w / 2 : y - 6}
              fontSize={7}
              fill={color}
              textAnchor="middle"
            >
              {win.width}cm
            </SvgText>
          )}
        </G>
      );
    });

  const renderDimensions = () => {
    if (!showDimensions) return null;
    const W = data.totalWidth * scale;
    const H = data.totalHeight * scale;
    return (
      <G>
        <Line
          x1={0}
          y1={canvasHeight + 15}
          x2={W}
          y2={canvasHeight + 15}
          stroke="#666"
          strokeWidth={1}
        />
        <Line
          x1={0}
          y1={canvasHeight + 10}
          x2={0}
          y2={canvasHeight + 20}
          stroke="#666"
          strokeWidth={1}
        />
        <Line
          x1={W}
          y1={canvasHeight + 10}
          x2={W}
          y2={canvasHeight + 20}
          stroke="#666"
          strokeWidth={1}
        />
        <SvgText
          x={W / 2}
          y={canvasHeight + 30}
          fontSize={9}
          fill="#333"
          textAnchor="middle"
        >
          {data.totalWidth} cm
        </SvgText>
        <Line
          x1={canvasWidth + 15}
          y1={0}
          x2={canvasWidth + 15}
          y2={H}
          stroke="#666"
          strokeWidth={1}
        />
        <SvgText
          x={canvasWidth + 28}
          y={H / 2}
          fontSize={9}
          fill="#333"
          textAnchor="middle"
          rotation={-90}
          origin={`${canvasWidth + 28}, ${H / 2}`}
        >
          {data.totalHeight} cm
        </SvgText>
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
          <GestureDetector gesture={dragGesture}>
            <Svg
              width={canvasWidth + 40}
              height={canvasHeight + 40}
              style={styles.svg}
            >
              {showLabels && (
                <SvgText
                  x={canvasWidth / 2}
                  y={-10}
                  fontSize={11}
                  fill="#222"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {data.buildingName}
                </SvgText>
              )}
              {renderGrid()}
              {renderRooms()}
              {renderWalls()}
              {renderDoors()}
              {renderWindows()}
              {renderDimensions()}
            </Svg>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  canvasWrapper: { alignItems: "center", justifyContent: "center" },
  svg: { backgroundColor: "#ffffff" },
});
