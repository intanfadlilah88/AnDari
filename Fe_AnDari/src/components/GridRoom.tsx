// src/components/GridRoom.tsx

import React, { useRef, useState, useMemo } from "react";
import { View, Text, StyleSheet, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type EdgeType = "top" | "right" | "bottom" | "left";
export type Door = { edge: EdgeType; position: number };
export type Window = { edge: EdgeType; position: number };

export type PlacedRoom = {
  id: string;
  nama: string;
  x: number;
  y: number;
  panjang: number;
  lebar: number;
  color: string;
  doors: Door[];
  windows: Window[];
};

type Props = {
  room: PlacedRoom;
  isSelected: boolean;
  gridSize: number;
  maxWidth: number;
  maxHeight: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updated: Partial<PlacedRoom>) => void;
  onEdgeTap: (id: string, edge: EdgeType) => void;
};

export default function GridRoom({
  room,
  isSelected,
  gridSize,
  maxWidth,
  maxHeight,
  onSelect,
  onUpdate,
  onEdgeTap,
}: Props) {
  const [draft, setDraft] = useState({
    x: room.x,
    y: room.y,
    panjang: room.panjang,
    lebar: room.lebar,
  });

  const draftRef = useRef(draft);
  draftRef.current = draft;

  // ============================================
  // DRAG — tahan seluruh area ruangan
  // ============================================
  const startDragRef = useRef({ x: 0, y: 0 });

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        // ✅ Ambil gesture langsung
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          // ✅ Hanya ambil kalau gerakan > 5px (biar tap tetap bisa)
          return Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5;
        },
        onMoveShouldSetPanResponderCapture: (_, g) => {
          return Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5;
        },

        onPanResponderGrant: () => {
          onSelect(room.id);
          startDragRef.current = {
            x: draftRef.current.x,
            y: draftRef.current.y,
          };
        },
        onPanResponderMove: (_, g) => {
          const dxM = g.dx / gridSize;
          const dyM = g.dy / gridSize;

          let nx = startDragRef.current.x + dxM;
          let ny = startDragRef.current.y + dyM;

          nx = Math.max(0, Math.min(nx, maxWidth - draftRef.current.panjang));
          ny = Math.max(0, Math.min(ny, maxHeight - draftRef.current.lebar));

          setDraft((d) => ({ ...d, x: nx, y: ny }));
        },
        onPanResponderRelease: () => {
          const snapX = Math.round(draftRef.current.x);
          const snapY = Math.round(draftRef.current.y);
          onUpdate(room.id, { x: snapX, y: snapY });
          setDraft((d) => ({ ...d, x: snapX, y: snapY }));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [room.id, gridSize, maxWidth, maxHeight, onSelect, onUpdate],
  );

  // ============================================
  // RESIZE — handle di sudut kanan bawah
  // ============================================
  const startResizeRef = useRef({ panjang: 0, lebar: 0 });

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: () => {
          onSelect(room.id);
          startResizeRef.current = {
            panjang: draftRef.current.panjang,
            lebar: draftRef.current.lebar,
          };
        },
        onPanResponderMove: (_, g) => {
          const dwM = g.dx / gridSize;
          const dhM = g.dy / gridSize;

          let np = startResizeRef.current.panjang + dwM;
          let nl = startResizeRef.current.lebar + dhM;

          np = Math.max(1, Math.min(np, maxWidth - draftRef.current.x));
          nl = Math.max(1, Math.min(nl, maxHeight - draftRef.current.y));

          setDraft((d) => ({ ...d, panjang: np, lebar: nl }));
        },
        onPanResponderRelease: () => {
          const snapP = Math.round(draftRef.current.panjang);
          const snapL = Math.round(draftRef.current.lebar);
          onUpdate(room.id, { panjang: snapP, lebar: snapL });
          setDraft((d) => ({ ...d, panjang: snapP, lebar: snapL }));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [room.id, gridSize, maxWidth, maxHeight, onSelect, onUpdate],
  );

  const pxX = draft.x * gridSize;
  const pxY = draft.y * gridSize;
  const pxW = draft.panjang * gridSize;
  const pxH = draft.lebar * gridSize;

  return (
    <View
      {...dragResponder.panHandlers}
      style={[
        styles.roomBox,
        {
          left: pxX,
          top: pxY,
          width: pxW,
          height: pxH,
          backgroundColor: room.color,
          borderColor: isSelected ? "#EA580C" : "#0F172A",
          borderWidth: isSelected ? 3 : 1.5,
          zIndex: isSelected ? 100 : 1,
        },
      ]}
    >
      {/* Nama ruangan */}
      <Text style={styles.roomText} numberOfLines={1}>
        {room.nama}
      </Text>

      {/* Info ukuran */}
      <Text style={styles.sizeText}>
        {draft.panjang}×{draft.lebar}m
      </Text>

      {/* Pintu */}
      {room.doors.map((d, i) => (
        <View
          key={`d-${i}`}
          style={[
            styles.dot,
            styles.doorDot,
            getEdgeDotStyle(d.edge, d.position),
          ]}
          pointerEvents="none"
        >
          <Text style={styles.dotLabel}>P</Text>
        </View>
      ))}

      {/* Jendela */}
      {room.windows.map((w, i) => (
        <View
          key={`w-${i}`}
          style={[
            styles.dot,
            styles.windowDot,
            getEdgeDotStyle(w.edge, w.position),
          ]}
          pointerEvents="none"
        >
          <Text style={styles.dotLabel}>J</Text>
        </View>
      ))}

      {/* ============ TOMBOL P/J (saat dipilih) ============ */}
      {isSelected && (
        <>
          {/* Atas */}
          <View
            style={[styles.edgeBtnWrapper, { top: -20, alignSelf: "center" }]}
          >
            <Text style={styles.edgeBtnLabel}>↕</Text>
            <View style={styles.edgeBtnRow}>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#DC2626" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "top")}
              >
                <Text style={styles.edgeBtnText}>P</Text>
              </View>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#2563EB" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "top")}
              >
                <Text style={styles.edgeBtnText}>J</Text>
              </View>
            </View>
          </View>

          {/* Bawah */}
          <View
            style={[
              styles.edgeBtnWrapper,
              { bottom: -20, alignSelf: "center" },
            ]}
          >
            <View style={styles.edgeBtnRow}>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#DC2626" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "bottom")}
              >
                <Text style={styles.edgeBtnText}>P</Text>
              </View>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#2563EB" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "bottom")}
              >
                <Text style={styles.edgeBtnText}>J</Text>
              </View>
            </View>
          </View>

          {/* Kiri */}
          <View style={[styles.edgeBtnWrapper, { left: -20, top: "40%" }]}>
            <View style={styles.edgeBtnCol}>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#DC2626" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "left")}
              >
                <Text style={styles.edgeBtnText}>P</Text>
              </View>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#2563EB" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "left")}
              >
                <Text style={styles.edgeBtnText}>J</Text>
              </View>
            </View>
          </View>

          {/* Kanan */}
          <View style={[styles.edgeBtnWrapper, { right: -20, top: "40%" }]}>
            <View style={styles.edgeBtnCol}>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#DC2626" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "right")}
              >
                <Text style={styles.edgeBtnText}>P</Text>
              </View>
              <View
                style={[styles.edgeBtn, { backgroundColor: "#2563EB" }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => onEdgeTap(room.id, "right")}
              >
                <Text style={styles.edgeBtnText}>J</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Resize handle (kanan bawah) */}
      <View {...resizeResponder.panHandlers} style={styles.resizeHandle}>
        <Ionicons name="resize" size={16} color="white" />
      </View>
    </View>
  );
}

function getEdgeDotStyle(edge: EdgeType, position: number) {
  const size = 14;
  const p = `${position * 100}%`;

  switch (edge) {
    case "top":
      return {
        top: -size / 2,
        left: p,
        marginLeft: -size / 2,
        width: size,
        height: size,
      };
    case "bottom":
      return {
        bottom: -size / 2,
        left: p,
        marginLeft: -size / 2,
        width: size,
        height: size,
      };
    case "left":
      return {
        left: -size / 2,
        top: p,
        marginTop: -size / 2,
        width: size,
        height: size,
      };
    case "right":
      return {
        right: -size / 2,
        top: p,
        marginTop: -size / 2,
        width: size,
        height: size,
      };
  }
}

const styles = StyleSheet.create({
  roomBox: {
    position: "absolute",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  roomText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  sizeText: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "600",
  },

  dot: {
    position: "absolute",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  doorDot: { backgroundColor: "#DC2626" },
  windowDot: { backgroundColor: "#2563EB" },
  dotLabel: { fontSize: 8, color: "white", fontWeight: "700" },

  // Tombol P/J
  edgeBtnWrapper: {
    position: "absolute",
    alignItems: "center",
  },
  edgeBtnRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  edgeBtnCol: {
    flexDirection: "column",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  edgeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  edgeBtnText: {
    color: "white",
    fontSize: 11,
    fontWeight: "800",
  },
  edgeBtnLabel: {
    fontSize: 10,
    color: "#64748B",
  },

  resizeHandle: {
    position: "absolute",
    right: -14,
    bottom: -14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 6,
    zIndex: 30,
  },
});