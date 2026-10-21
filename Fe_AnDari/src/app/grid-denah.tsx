// src/app/grid-denah.tsx

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Canvas, Line, Rect, Group, Path } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";

const API_URL = "http://192.168.110.12:8000/api";
const API_TIMEOUT = 10000;

// ============================================
// KONSTANTA
// ============================================
const MIN_SCALE = 8;
const MAX_SCALE = 80;

const PADDING_X = 40;
const PADDING_Y = 40;
const GRID_METER = 1;
const WALL_THICKNESS = 4;
const HIT_THRESHOLD = 0.35;
const WALL_HIT_THRESHOLD = 0.4;

// ============================================
// TIPE
// ============================================
type BentukLahan = "kotak" | "polygon-sisi" | "polygon-bebas";

type DataLahan = {
  bentuk: BentukLahan;
  panjang: number;
  lebar: number;
  polygon: { x: number; y: number }[] | null;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  luas: number;
};

type DrawingMode =
  | "idle"
  | "draw-room"
  | "place-door"
  | "place-window"
  | "draw-wall"
  | "erase"
  | "place-area"
  | "draw-lahan";

type EdgeType = "top" | "right" | "bottom" | "left";

type Door = {
  edge: EdgeType;
  position: number;
  swingDirection: "in" | "out";
  hingeSide: "left" | "right";
};

type WindowType = "casement" | "sliding" | "awning" | "fixed" | "jalousie";

type Window = {
  edge: EdgeType;
  position: number;
  type: WindowType;
  swingDirection?: "in" | "out";
  hingeSide?: "left" | "right";
};

type Wall = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nama?: string;
  doors: Door[];
  windows: Window[];
};

type PlacedRoom = {
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

type PlacedArea = {
  id: string;
  nama: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

const ROOM_TYPES = [
  { nama: "K. Tidur", color: "rgba(173, 216, 230, 0.55)" },
  { nama: "K. Mandi", color: "rgba(255, 228, 196, 0.65)" },
  { nama: "R. Tamu", color: "rgba(200, 230, 201, 0.55)" },
  { nama: "Dapur", color: "rgba(255, 205, 210, 0.55)" },
  { nama: "R. Makan", color: "rgba(216, 191, 216, 0.55)" },
];

const snapGrid = (v: number) => Math.round(v / GRID_METER) * GRID_METER;

// ============================================
// HELPER: NORMALIZE POLYGON KE (0,0)
// (dipindahkan ke TOP-LEVEL agar tidak re-create tiap render)
// ============================================
function normalizePolygonToOrigin(poly: { x: number; y: number }[]) {
  if (!poly || poly.length === 0) return poly;
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return poly.map((p) => ({
    x: Math.round((p.x - minX) * 100) / 100,
    y: Math.round((p.y - minY) * 100) / 100,
  }));
}

// ============================================
// GEOMETRI
// ============================================
const distanceToSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

function isPointInPolygon(
  x: number,
  y: number,
  polygon: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isRoomInsidePolygon(
  room: { x: number; y: number; panjang: number; lebar: number },
  polygon: { x: number; y: number }[],
): boolean {
  const corners = [
    { x: room.x, y: room.y },
    { x: room.x + room.panjang, y: room.y },
    { x: room.x + room.panjang, y: room.y + room.lebar },
    { x: room.x, y: room.y + room.lebar },
  ];
  return corners.every((c) => isPointInPolygon(c.x, c.y, polygon));
}

function polygonArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

function doSegmentsIntersect(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
): boolean {
  const d1 = crossProduct(bx1, by1, bx2, by2, ax1, ay1);
  const d2 = crossProduct(bx1, by1, bx2, by2, ax2, ay2);
  const d3 = crossProduct(ax1, ay1, ax2, ay2, bx1, by1);
  const d4 = crossProduct(ax1, ay1, ax2, ay2, bx2, by2);
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  )
    return true;
  if (d1 === 0 && onSegment(bx1, by1, bx2, by2, ax1, ay1)) return true;
  if (d2 === 0 && onSegment(bx1, by1, bx2, by2, ax2, ay2)) return true;
  if (d3 === 0 && onSegment(ax1, ay1, ax2, ay2, bx1, by1)) return true;
  if (d4 === 0 && onSegment(ax1, ay1, ax2, ay2, bx2, by2)) return true;
  return false;
}

function crossProduct(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  return (
    Math.min(ax, bx) <= cx &&
    cx <= Math.max(ax, bx) &&
    Math.min(ay, by) <= cy &&
    cy <= Math.max(ay, by)
  );
}

function doWallCrossPolygon(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  polygon: { x: number; y: number }[],
): boolean {
  if (polygon.length < 3) return false;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    if (doSegmentsIntersect(ax, ay, bx, by, p1.x, p1.y, p2.x, p2.y)) {
      return true;
    }
  }
  return false;
}

function lineSegmentIntersection(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
): { t: number; x: number; y: number } | null {
  const dx1 = ax2 - ax1,
    dy1 = ay2 - ay1;
  const dx2 = bx2 - bx1,
    dy2 = by2 - by1;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((bx1 - ax1) * dy2 - (by1 - ay1) * dx2) / denom;
  const u = ((bx1 - ax1) * dy1 - (by1 - ay1) * dx1) / denom;
  if (t < -0.0001 || t > 1.0001) return null;
  if (u < -0.0001 || u > 1.0001) return null;
  return { t: Math.max(0, Math.min(1, t)), x: ax1 + t * dx1, y: ay1 + t * dy1 };
}

function clipLineToPolygon(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  polygon: { x: number; y: number }[],
): { x1: number; y1: number; x2: number; y2: number }[] {
  if (polygon.length < 3) return [];
  const ts: { t: number; x: number; y: number }[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const inter = lineSegmentIntersection(
      ax1,
      ay1,
      ax2,
      ay2,
      p1.x,
      p1.y,
      p2.x,
      p2.y,
    );
    if (inter) ts.push(inter);
  }
  ts.push({ t: 0, x: ax1, y: ay1 });
  ts.push({ t: 1, x: ax2, y: ay2 });
  ts.sort((a, b) => a.t - b.t);
  const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const a = ts[i];
    const b = ts[i + 1];
    if (b.t - a.t < 0.0001) continue;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    if (isPointInPolygon(midX, midY, polygon)) {
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
  return segs;
}

function findNearestWall(
  mx: number,
  my: number,
  walls: Wall[],
): { wallId: string; edge: EdgeType; position: number } | null {
  let best: {
    wallId: string;
    edge: EdgeType;
    position: number;
    dist: number;
  } | null = null;
  for (const w of walls) {
    const isHorizontal = Math.abs(w.y1 - w.y2) < 0.001;
    const isVertical = Math.abs(w.x1 - w.x2) < 0.001;
    const dist = distanceToSegment(mx, my, w.x1, w.y1, w.x2, w.y2);
    if (dist > WALL_HIT_THRESHOLD) continue;
    let edge: EdgeType;
    let position: number;
    if (isHorizontal) {
      const xMin = Math.min(w.x1, w.x2);
      const xMax = Math.max(w.x1, w.x2);
      if (mx < xMin || mx > xMax) continue;
      edge = "top";
      position = (mx - xMin) / (xMax - xMin);
    } else if (isVertical) {
      const yMin = Math.min(w.y1, w.y2);
      const yMax = Math.max(w.y1, w.y2);
      if (my < yMin || my > yMax) continue;
      edge = "left";
      position = (my - yMin) / (yMax - yMin);
    } else {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const t = Math.max(
        0,
        Math.min(
          1,
          ((mx - w.x1) * (w.x2 - w.x1) + (my - w.y1) * (w.y2 - w.y1)) /
            (len * len),
        ),
      );
      const projX = w.x1 + t * (w.x2 - w.x1);
      const projY = w.y1 + t * (w.y2 - w.y1);
      const dx = mx - projX,
        dy = my - projY;
      if (Math.abs(dx) > Math.abs(dy)) edge = dx > 0 ? "right" : "left";
      else edge = dy > 0 ? "bottom" : "top";
      position = t;
    }
    position = Math.max(0.05, Math.min(0.95, position));
    if (!best || dist < best.dist)
      best = { wallId: w.id, edge, position, dist };
  }
  if (!best) return null;
  return { wallId: best.wallId, edge: best.edge, position: best.position };
}

function findEnclosingArea(
  mx: number,
  my: number,
  walls: Wall[],
): { left: number; right: number; top: number; bottom: number } | null {
  let left = -Infinity,
    right = Infinity,
    top = -Infinity,
    bottom = Infinity;
  for (const w of walls) {
    const isHorizontal = Math.abs(w.y1 - w.y2) < 0.001;
    const isVertical = Math.abs(w.x1 - w.x2) < 0.001;
    if (isHorizontal) {
      const wy = w.y1;
      const xMin = Math.min(w.x1, w.x2);
      const xMax = Math.max(w.x1, w.x2);
      if (mx >= xMin - 0.001 && mx <= xMax + 0.001) {
        if (wy < my && wy > top) top = wy;
        if (wy > my && wy < bottom) bottom = wy;
      }
    } else if (isVertical) {
      const wx = w.x1;
      const yMin = Math.min(w.y1, w.y2);
      const yMax = Math.max(w.y1, w.y2);
      if (my >= yMin - 0.001 && my <= yMax + 0.001) {
        if (wx < mx && wx > left) left = wx;
        if (wx > mx && wx < right) right = wx;
      }
    }
  }
  if (
    left === -Infinity ||
    right === Infinity ||
    top === -Infinity ||
    bottom === Infinity
  )
    return null;
  if (right - left < 1 || bottom - top < 1) return null;
  return { left, right, top, bottom };
}

// ============================================
// HELPER PINTU & JENDELA
// ============================================
function getDoorCenterMeter(room: PlacedRoom, door: Door) {
  const pos = door.position;
  if (door.edge === "top") return { x: room.x + pos * room.panjang, y: room.y };
  if (door.edge === "bottom")
    return { x: room.x + pos * room.panjang, y: room.y + room.lebar };
  if (door.edge === "left") return { x: room.x, y: room.y + pos * room.lebar };
  return { x: room.x + room.panjang, y: room.y + pos * room.lebar };
}

function getDoorSideMeter(
  room: PlacedRoom,
  door: Door,
  offsetAlongWall: number,
) {
  const pos = door.position;
  if (door.edge === "top" || door.edge === "bottom") {
    const y = door.edge === "top" ? room.y : room.y + room.lebar;
    return { x: room.x + pos * room.panjang + offsetAlongWall, y };
  }
  const x = door.edge === "left" ? room.x : room.x + room.panjang;
  return { x, y: room.y + pos * room.lebar + offsetAlongWall };
}

function getWindowCenterMeter(room: PlacedRoom, win: Window) {
  const pos = win.position;
  if (win.edge === "top") return { x: room.x + pos * room.panjang, y: room.y };
  if (win.edge === "bottom")
    return { x: room.x + pos * room.panjang, y: room.y + room.lebar };
  if (win.edge === "left") return { x: room.x, y: room.y + pos * room.lebar };
  return { x: room.x + room.panjang, y: room.y + pos * room.lebar };
}

function getWindowSideMeter(
  room: PlacedRoom,
  win: Window,
  offsetAlongWall: number,
) {
  const pos = win.position;
  if (win.edge === "top" || win.edge === "bottom") {
    const y = win.edge === "top" ? room.y : room.y + room.lebar;
    return { x: room.x + pos * room.panjang + offsetAlongWall, y };
  }
  const x = win.edge === "left" ? room.x : room.x + room.panjang;
  return { x, y: room.y + pos * room.lebar + offsetAlongWall };
}

function getWallDoorCenterMeter(wall: Wall, door: Door) {
  const t = door.position;
  return {
    x: wall.x1 + t * (wall.x2 - wall.x1),
    y: wall.y1 + t * (wall.y2 - wall.y1),
  };
}

function getWallDoorSideMeter(wall: Wall, door: Door, offsetAlongWall: number) {
  const t = door.position;
  const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  if (len === 0) return { x: wall.x1, y: wall.y1 };
  const ux = (wall.x2 - wall.x1) / len;
  const uy = (wall.y2 - wall.y1) / len;
  const cx = wall.x1 + t * (wall.x2 - wall.x1);
  const cy = wall.y1 + t * (wall.y2 - wall.y1);
  return { x: cx + ux * offsetAlongWall, y: cy + uy * offsetAlongWall };
}

function getWallWindowCenterMeter(wall: Wall, win: Window) {
  const t = win.position;
  return {
    x: wall.x1 + t * (wall.x2 - wall.x1),
    y: wall.y1 + t * (wall.y2 - wall.y1),
  };
}

function getWallWindowSideMeter(
  wall: Wall,
  win: Window,
  offsetAlongWall: number,
) {
  const t = win.position;
  const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  if (len === 0) return { x: wall.x1, y: wall.y1 };
  const ux = (wall.x2 - wall.x1) / len;
  const uy = (wall.y2 - wall.y1) / len;
  const cx = wall.x1 + t * (wall.x2 - wall.x1);
  const cy = wall.y1 + t * (wall.y2 - wall.y1);
  return { x: cx + ux * offsetAlongWall, y: cy + uy * offsetAlongWall };
}

// ============================================
// KOMPONEN UTAMA
// ============================================
export default function GridDenahScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const projectId = (params.projectId as string) || "local";
  const buildingId = (params.buildingId as string) || "local";
  const backendOK = params.backendOK !== "false";

  // ============================================
  // PARSE DATA LAHAN
  // ============================================
  const dataLahan: DataLahan = useMemo(() => {
    if (params.dataLahan) {
      try {
        const parsed =
          typeof params.dataLahan === "string"
            ? JSON.parse(params.dataLahan)
            : params.dataLahan;
        if (parsed && typeof parsed === "object") {
          const bentuk = (parsed.bentuk as BentukLahan) || "kotak";
          const panjang = Number(parsed.panjang) || 0;
          const lebar = Number(parsed.lebar) || 0;
          const polygon = parsed.polygon || null;
          let bbox = parsed.bbox;

          if (!bbox || typeof bbox !== "object") {
            if (polygon && polygon.length >= 3) {
              const xs = polygon.map((p: any) => p.x);
              const ys = polygon.map((p: any) => p.y);
              bbox = {
                minX: Math.min(...xs),
                minY: Math.min(...ys),
                maxX: Math.max(...xs),
                maxY: Math.max(...ys),
              };
            } else {
              bbox = {
                minX: 0,
                minY: 0,
                maxX: panjang || 10,
                maxY: lebar || 10,
              };
            }
          }

          const luas =
            Number(parsed.luas) ||
            (polygon && polygon.length >= 3
              ? polygonArea(polygon)
              : panjang * lebar) ||
            0;

          return { bentuk, panjang, lebar, polygon, bbox, luas };
        }
      } catch (err) {
        console.warn("Gagal parse dataLahan:", err);
      }
    }

    const p = Number(params.panjang) || 10;
    const l = Number(params.lebar) || 10;
    return {
      bentuk: "kotak" as BentukLahan,
      panjang: p,
      lebar: l,
      polygon: null,
      bbox: { minX: 0, minY: 0, maxX: p, maxY: l },
      luas: p * l,
    };
  }, [params.dataLahan, params.panjang, params.lebar]);

  const bbox = dataLahan.bbox;

  // ============================================
  // STATE POLYGON LAHAN
  // ============================================
  const [lahanPolygon, setLahanPolygon] = useState<
    { x: number; y: number }[] | null
  >(() => {
    if (
      dataLahan.bentuk === "polygon-bebas" &&
      (!dataLahan.polygon || dataLahan.luas === 0)
    ) {
      return null;
    }
    if (dataLahan.polygon && dataLahan.polygon.length >= 3) {
      return normalizePolygonToOrigin(dataLahan.polygon);
    }
    const w = Math.max(bbox.maxX - bbox.minX, 1);
    const h = Math.max(bbox.maxY - bbox.minY, 1);
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
  });

  const [lahanDraft, setLahanDraft] = useState<{ x: number; y: number }[]>([]);

  const isBebasBelumDigambar =
    dataLahan.bentuk === "polygon-bebas" &&
    (!lahanPolygon || lahanPolygon.length < 3);

  // ============================================
  // effectiveBBox — DIDEKLARASI LEBIH DULU
  // ============================================
  const effectiveBBox = useMemo(() => {
    if (isBebasBelumDigambar) {
      return { minX: 0, minY: 0, maxX: 20, maxY: 20 };
    }
    if (lahanPolygon && lahanPolygon.length >= 3) {
      const xs = lahanPolygon.map((p) => p.x);
      const ys = lahanPolygon.map((p) => p.y);
      const maxX = Math.max(...xs, 1);
      const maxY = Math.max(...ys, 1);
      return { minX: 0, minY: 0, maxX, maxY };
    }
    const w = Math.max(bbox.maxX - bbox.minX, 1);
    const h = Math.max(bbox.maxY - bbox.minY, 1);
    return { minX: 0, minY: 0, maxX: w, maxY: h };
  }, [isBebasBelumDigambar, lahanPolygon, bbox]);

  // ============================================
  // panjangLahan & tinggiLahan — DERIVED DARI effectiveBBox
  // ============================================
  const panjangLahan = useMemo(
    () => Math.max(effectiveBBox.maxX - effectiveBBox.minX, 1),
    [effectiveBBox],
  );
  const tinggiLahan = useMemo(
    () => Math.max(effectiveBBox.maxY - effectiveBBox.minY, 1),
    [effectiveBBox],
  );

  const [selectedRoomType, setSelectedRoomType] = useState(ROOM_TYPES[0]);
  const [placedRooms, setPlacedRooms] = useState<PlacedRoom[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<DrawingMode>(
    dataLahan.bentuk === "polygon-bebas" ? "draw-lahan" : "draw-room",
  );

  const [placedAreas, setPlacedAreas] = useState<PlacedArea[]>([]);
  const [pendingArea, setPendingArea] = useState<{
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [areaValue, setAreaValue] = useState("");

  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [wallEnd, setWallEnd] = useState<{ x: number; y: number } | null>(null);

  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasTranslate, setCanvasTranslate] = useState({ x: 0, y: 0 });

  const savedCanvasScale = useRef(1);
  const savedCanvasTranslate = useRef({ x: 0, y: 0 });

  const [doorModalVisible, setDoorModalVisible] = useState(false);
  const [pendingDoor, setPendingDoor] = useState<{
    targetType: "room" | "wall";
    targetId: string;
    edge: EdgeType;
    position: number;
  } | null>(null);
  const [doorSwing, setDoorSwing] = useState<"in" | "out">("out");
  const [doorHinge, setDoorHinge] = useState<"left" | "right">("left");

  const [windowModalVisible, setWindowModalVisible] = useState(false);
  const [pendingWindow, setPendingWindow] = useState<{
    targetType: "room" | "wall";
    targetId: string;
    edge: EdgeType;
    position: number;
  } | null>(null);
  const [windowType, setWindowType] = useState<WindowType>("sliding");
  const [windowSwing, setWindowSwing] = useState<"in" | "out">("out");
  const [windowHinge, setWindowHinge] = useState<"left" | "right">("left");

  const [renameWallModalVisible, setRenameWallModalVisible] = useState(false);
  const [renameWallValue, setRenameWallValue] = useState("");

  // ============================================
  // SCALE ADAPTIF
  // ============================================
  const [scale, setScale] = useState(20);
  const scaleRef = useRef(scale);

  useEffect(() => {
    const availableW = screenW - PADDING_X * 2;
    const availableH = screenH - 380;

    const scaleByW = availableW / Math.max(panjangLahan, 1);
    const scaleByH = availableH / Math.max(tinggiLahan, 1);
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, Math.min(scaleByW, scaleByH)),
    );
    setScale(newScale);
    scaleRef.current = newScale;
  }, [panjangLahan, tinggiLahan, screenW, screenH]);

  const mToPx = useCallback((m: number) => m * scale, [scale]);

  // ============================================
  // REFS
  // ============================================
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawEndRef = useRef<{ x: number; y: number } | null>(null);
  const wallStartRef = useRef<{ x: number; y: number } | null>(null);
  const wallEndRef = useRef<{ x: number; y: number } | null>(null);
  const modeRef = useRef(mode);
  const roomsRef = useRef(placedRooms);
  const wallsRef = useRef(walls);
  const areasRef = useRef(placedAreas);
  const selectedRoomTypeRef = useRef(selectedRoomType);
  const canvasScaleRef = useRef(canvasScale);
  const canvasTranslateRef = useRef(canvasTranslate);
  const lahanPolygonRef = useRef(lahanPolygon);
  const lahanDraftRef = useRef(lahanDraft);
  const bboxRef = useRef(effectiveBBox);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    roomsRef.current = placedRooms;
  }, [placedRooms]);
  useEffect(() => {
    wallsRef.current = walls;
  }, [walls]);
  useEffect(() => {
    areasRef.current = placedAreas;
  }, [placedAreas]);
  useEffect(() => {
    selectedRoomTypeRef.current = selectedRoomType;
  }, [selectedRoomType]);
  useEffect(() => {
    canvasScaleRef.current = canvasScale;
  }, [canvasScale]);
  useEffect(() => {
    canvasTranslateRef.current = canvasTranslate;
  }, [canvasTranslate]);
  useEffect(() => {
    lahanPolygonRef.current = lahanPolygon;
  }, [lahanPolygon]);
  useEffect(() => {
    lahanDraftRef.current = lahanDraft;
  }, [lahanDraft]);
  useEffect(() => {
    bboxRef.current = effectiveBBox;
  }, [effectiveBBox]);

  // ============================================
  // DERIVED
  // ============================================
  const selectedRoom = placedRooms.find((r) => r.id === selectedRoomId);
  const selectedWall = walls.find((w) => w.id === selectedWallId);
  const selectedArea = placedAreas.find((a) => a.id === selectedAreaId);

  const totalLuasTerpakai = useMemo(
    () => placedRooms.reduce((sum, r) => sum + r.panjang * r.lebar, 0),
    [placedRooms],
  );

  const totalLuasLahan = useMemo(() => {
    if (isBebasBelumDigambar) return 0;
    if (lahanPolygon && lahanPolygon.length >= 3) {
      return Math.round(polygonArea(lahanPolygon) * 100) / 100;
    }
    return Math.round(panjangLahan * tinggiLahan * 100) / 100;
  }, [lahanPolygon, panjangLahan, tinggiLahan, isBebasBelumDigambar]);

  const luasTersisa = totalLuasLahan - totalLuasTerpakai;

  const cekOverlap = useCallback(
    (newRoom: PlacedRoom, existing: PlacedRoom[], excludeId?: string) => {
      for (const r of existing) {
        if (excludeId && r.id === excludeId) continue;
        const overlapX =
          newRoom.x < r.x + r.panjang && newRoom.x + newRoom.panjang > r.x;
        const overlapY =
          newRoom.y < r.y + r.lebar && newRoom.y + newRoom.lebar > r.y;
        if (overlapX && overlapY) return true;
      }
      return false;
    },
    [],
  );

  // ============================================
  // CANVAS DIMENSION & OFFSET — FULL LAYAR + CENTER
  // ============================================
  const canvasW = useMemo(() => screenW, [screenW]);
  const canvasH = useMemo(() => Math.max(screenH - 380, 300), [screenH]);

  const offsetX = useMemo(() => {
    const contentW = panjangLahan * scale;
    return Math.max((canvasW - contentW) / 2, 0);
  }, [canvasW, panjangLahan, scale]);

  const offsetY = useMemo(() => {
    const contentH = tinggiLahan * scale;
    return Math.max((canvasH - contentH) / 2, 0);
  }, [canvasH, tinggiLahan, scale]);

  // Reset canvasScale saat ukuran lahan berubah
  useEffect(() => {
    setCanvasScale(1);
    setCanvasTranslate({ x: 0, y: 0 });
    savedCanvasScale.current = 1;
    savedCanvasTranslate.current = { x: 0, y: 0 };
  }, [panjangLahan, tinggiLahan]);

  // ============================================
  // SCREEN → METER (reverse transform dengan pivot center)
  // ============================================
  const screenToMeter = useCallback(
    (screenX: number, screenY: number) => {
      const s = canvasScaleRef.current;
      const t = canvasTranslateRef.current;
      const pivotX = canvasW / 2;
      const pivotY = canvasH / 2;

      const localX = (screenX - pivotX - t.x) / s + pivotX;
      const localY = (screenY - pivotY - t.y) / s + pivotY;

      const mx = (localX - offsetX) / scaleRef.current + effectiveBBox.minX;
      const my = (localY - offsetY) / scaleRef.current + effectiveBBox.minY;
      return { mx, my };
    },
    [
      offsetX,
      offsetY,
      effectiveBBox.minX,
      effectiveBBox.minY,
      canvasW,
      canvasH,
    ],
  );

  // ============================================
  // GESTURE: TAP
  // ============================================
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .hitSlop({ left: 10, right: 10, top: 10, bottom: 10 })
    .onEnd((e) => {
      const { mx, my } = screenToMeter(e.x, e.y);
      const m = modeRef.current;
      const rooms = roomsRef.current;
      const allWalls = wallsRef.current;
      const areas = areasRef.current;
      const bboxNow = bboxRef.current;

      // ============ MODE DRAW-LAHAN ============
      if (m === "draw-lahan") {
        const sx = Math.max(bboxNow.minX, Math.min(bboxNow.maxX, snapGrid(mx)));
        const sy = Math.max(bboxNow.minY, Math.min(bboxNow.maxY, snapGrid(my)));
        const draft = lahanDraftRef.current;

        if (draft.length >= 3) {
          const first = draft[0];
          const dist = Math.hypot(sx - first.x, sy - first.y);
          if (dist < 0.6) {
            const area = polygonArea(draft);
            if (area < 1) {
              Alert.alert("Area Terlalu Kecil", "Luas lahan minimal 1 m².");
              return;
            }
            const normalized = normalizePolygonToOrigin(draft);
            setLahanPolygon(normalized);
            setLahanDraft([]);
            setMode("draw-room");
            Alert.alert(
              "✅ Lahan Selesai",
              `Luas lahan: ${Math.round(area * 100) / 100} m².`,
            );
            return;
          }
        }
        setLahanDraft((prev) => [...prev, { x: sx, y: sy }]);
        return;
      }

      // ============ MODE PLACE-AREA ============
      if (m === "place-area") {
        const existingArea = areas.find(
          (a) => mx >= a.left && mx <= a.right && my >= a.top && my <= a.bottom,
        );
        if (existingArea) {
          Alert.alert(
            "Area Sudah Ada",
            `Area "${existingArea.nama}" sudah ada.`,
          );
          return;
        }
        const found = findEnclosingArea(mx, my, allWalls);
        if (!found) {
          Alert.alert(
            "Tidak Ada Area Tertutup",
            "Titik tap tidak berada di dalam area yang dibatasi dinding.",
          );
          return;
        }
        setPendingArea({
          ...found,
          centerX: (found.left + found.right) / 2,
          centerY: (found.top + found.bottom) / 2,
        });
        setAreaValue("");
        setAreaModalVisible(true);
        return;
      }

      // ============ MODE ERASE ============
      if (m === "erase") {
        const areaFound = areas.find(
          (a) => mx >= a.left && mx <= a.right && my >= a.top && my <= a.bottom,
        );
        if (areaFound) {
          Alert.alert("Hapus Area?", `Area "${areaFound.nama}"`, [
            { text: "Batal", style: "cancel" },
            {
              text: "Hapus Area",
              style: "destructive",
              onPress: () => {
                setPlacedAreas((prev) =>
                  prev.filter((a) => a.id !== areaFound.id),
                );
                if (selectedAreaId === areaFound.id) setSelectedAreaId(null);
              },
            },
          ]);
          return;
        }

        const DOOR_WIDTH_METER = 0.8;
        const WINDOW_WIDTH_METER = 1.2;

        for (const room of rooms) {
          for (let i = 0; i < room.doors.length; i++) {
            const door = room.doors[i];
            const center = getDoorCenterMeter(room, door);
            const side1 = getDoorSideMeter(room, door, -DOOR_WIDTH_METER / 2);
            const side2 = getDoorSideMeter(room, door, DOOR_WIDTH_METER / 2);
            const minDist = Math.min(
              Math.hypot(mx - center.x, my - center.y),
              Math.hypot(mx - side1.x, my - side1.y),
              Math.hypot(mx - side2.x, my - side2.y),
            );
            if (minDist < HIT_THRESHOLD) {
              Alert.alert("Hapus Pintu?", `Pintu di ${room.nama}`, [
                { text: "Batal", style: "cancel" },
                {
                  text: "Hapus Pintu",
                  style: "destructive",
                  onPress: () => {
                    setPlacedRooms((prev) =>
                      prev.map((r) =>
                        r.id === room.id
                          ? { ...r, doors: r.doors.filter((_, di) => di !== i) }
                          : r,
                      ),
                    );
                  },
                },
              ]);
              return;
            }
          }
        }

        for (const room of rooms) {
          for (let i = 0; i < room.windows.length; i++) {
            const win = room.windows[i];
            const center = getWindowCenterMeter(room, win);
            const side1 = getWindowSideMeter(
              room,
              win,
              -WINDOW_WIDTH_METER / 2,
            );
            const side2 = getWindowSideMeter(room, win, WINDOW_WIDTH_METER / 2);
            const minDist = Math.min(
              Math.hypot(mx - center.x, my - center.y),
              Math.hypot(mx - side1.x, my - side1.y),
              Math.hypot(mx - side2.x, my - side2.y),
            );
            if (minDist < HIT_THRESHOLD) {
              Alert.alert(
                "Hapus Jendela?",
                `Jendela ${win.type} di ${room.nama}`,
                [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Hapus Jendela",
                    style: "destructive",
                    onPress: () => {
                      setPlacedRooms((prev) =>
                        prev.map((r) =>
                          r.id === room.id
                            ? {
                                ...r,
                                windows: r.windows.filter((_, wi) => wi !== i),
                              }
                            : r,
                        ),
                      );
                    },
                  },
                ],
              );
              return;
            }
          }
        }

        for (const wall of allWalls) {
          for (let i = 0; i < wall.doors.length; i++) {
            const door = wall.doors[i];
            const center = getWallDoorCenterMeter(wall, door);
            const side1 = getWallDoorSideMeter(
              wall,
              door,
              -DOOR_WIDTH_METER / 2,
            );
            const side2 = getWallDoorSideMeter(
              wall,
              door,
              DOOR_WIDTH_METER / 2,
            );
            const minDist = Math.min(
              Math.hypot(mx - center.x, my - center.y),
              Math.hypot(mx - side1.x, my - side1.y),
              Math.hypot(mx - side2.x, my - side2.y),
            );
            if (minDist < HIT_THRESHOLD) {
              Alert.alert(
                "Hapus Pintu?",
                `Pintu di ${wall.nama || "dinding"}`,
                [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Hapus Pintu",
                    style: "destructive",
                    onPress: () => {
                      setWalls((prev) =>
                        prev.map((w) =>
                          w.id === wall.id
                            ? {
                                ...w,
                                doors: w.doors.filter((_, di) => di !== i),
                              }
                            : w,
                        ),
                      );
                    },
                  },
                ],
              );
              return;
            }
          }
          for (let i = 0; i < wall.windows.length; i++) {
            const win = wall.windows[i];
            const center = getWallWindowCenterMeter(wall, win);
            const side1 = getWallWindowSideMeter(
              wall,
              win,
              -WINDOW_WIDTH_METER / 2,
            );
            const side2 = getWallWindowSideMeter(
              wall,
              win,
              WINDOW_WIDTH_METER / 2,
            );
            const minDist = Math.min(
              Math.hypot(mx - center.x, my - center.y),
              Math.hypot(mx - side1.x, my - side1.y),
              Math.hypot(mx - side2.x, my - side2.y),
            );
            if (minDist < HIT_THRESHOLD) {
              Alert.alert("Hapus Jendela?", `Jendela ${win.type}`, [
                { text: "Batal", style: "cancel" },
                {
                  text: "Hapus Jendela",
                  style: "destructive",
                  onPress: () => {
                    setWalls((prev) =>
                      prev.map((w) =>
                        w.id === wall.id
                          ? {
                              ...w,
                              windows: w.windows.filter((_, wi) => wi !== i),
                            }
                          : w,
                      ),
                    );
                  },
                },
              ]);
              return;
            }
          }
        }

        const wallThreshold = 0.3;
        for (const w of allWalls) {
          const dist = distanceToSegment(mx, my, w.x1, w.y1, w.x2, w.y2);
          if (dist < wallThreshold) {
            const length = Math.hypot(w.x2 - w.x1, w.y2 - w.y1).toFixed(2);
            Alert.alert("Hapus Dinding?", `Panjang: ${length}m`, [
              { text: "Batal", style: "cancel" },
              {
                text: "Hapus",
                style: "destructive",
                onPress: () => {
                  setWalls((prev) => prev.filter((wall) => wall.id !== w.id));
                },
              },
            ]);
            return;
          }
        }

        const found = rooms.find(
          (r) =>
            mx >= r.x &&
            mx < r.x + r.panjang &&
            my >= r.y &&
            my < r.y + r.lebar,
        );
        if (found) {
          Alert.alert("Hapus Ruangan?", `${found.nama}`, [
            { text: "Batal", style: "cancel" },
            {
              text: "Hapus Ruangan",
              style: "destructive",
              onPress: () => {
                setPlacedRooms((prev) => prev.filter((r) => r.id !== found.id));
                if (selectedRoomId === found.id) setSelectedRoomId(null);
              },
            },
          ]);
        }
        return;
      }

      // ============ MODE IDLE ============
      if (m === "idle") {
        const areaFound = areas.find(
          (a) => mx >= a.left && mx <= a.right && my >= a.top && my <= a.bottom,
        );
        if (areaFound) {
          setSelectedAreaId(areaFound.id);
          setSelectedRoomId(null);
          setSelectedWallId(null);
          return;
        }
        const wallThreshold = 0.3;
        for (const w of allWalls) {
          const dist = distanceToSegment(mx, my, w.x1, w.y1, w.x2, w.y2);
          if (dist < wallThreshold) {
            setSelectedWallId(w.id);
            setSelectedRoomId(null);
            setSelectedAreaId(null);
            return;
          }
        }
        const found = rooms.find(
          (r) =>
            mx >= r.x &&
            mx < r.x + r.panjang &&
            my >= r.y &&
            my < r.y + r.lebar,
        );
        if (found) {
          setSelectedRoomId(found.id);
          setSelectedWallId(null);
          setSelectedAreaId(null);
        } else {
          setSelectedRoomId(null);
          setSelectedWallId(null);
          setSelectedAreaId(null);
        }
        return;
      }

      // ============ MODE PLACE DOOR / WINDOW ============
      if (m === "place-door" || m === "place-window") {
        const room = rooms.find(
          (r) =>
            mx >= r.x &&
            mx < r.x + r.panjang &&
            my >= r.y &&
            my < r.y + r.lebar,
        );
        if (room) {
          const relX = mx - room.x;
          const relY = my - room.y;
          const distances = [
            { edge: "top" as const, d: relY },
            { edge: "bottom" as const, d: room.lebar - relY },
            { edge: "left" as const, d: relX },
            { edge: "right" as const, d: room.panjang - relX },
          ];
          distances.sort((a, b) => a.d - b.d);
          const nearest = distances[0].edge;
          let position = 0.5;
          if (nearest === "top" || nearest === "bottom")
            position = relX / room.panjang;
          else position = relY / room.lebar;
          position = Math.max(0.05, Math.min(0.95, position));

          if (m === "place-door") {
            setPendingDoor({
              targetType: "room",
              targetId: room.id,
              edge: nearest,
              position,
            });
            setDoorSwing("out");
            setDoorHinge("left");
            setDoorModalVisible(true);
          } else {
            setPendingWindow({
              targetType: "room",
              targetId: room.id,
              edge: nearest,
              position,
            });
            setWindowType("sliding");
            setWindowSwing("out");
            setWindowHinge("left");
            setWindowModalVisible(true);
          }
          return;
        }

        const nearestWall = findNearestWall(mx, my, allWalls);
        if (!nearestWall) {
          Alert.alert("Tidak Ada Target", "Tap di ruangan atau dekat dinding.");
          return;
        }

        if (m === "place-door") {
          setPendingDoor({
            targetType: "wall",
            targetId: nearestWall.wallId,
            edge: nearestWall.edge,
            position: nearestWall.position,
          });
          setDoorSwing("out");
          setDoorHinge("left");
          setDoorModalVisible(true);
        } else {
          setPendingWindow({
            targetType: "wall",
            targetId: nearestWall.wallId,
            edge: nearestWall.edge,
            position: nearestWall.position,
          });
          setWindowType("sliding");
          setWindowSwing("out");
          setWindowHinge("left");
          setWindowModalVisible(true);
        }
        return;
      }
    })
    .runOnJS(true);

  // ============================================
  // GESTURE: PAN DRAW (RUANGAN & DINDING)
  // ============================================
  const panDrawGesture = Gesture.Pan()
    .minDistance(8)
    .maxPointers(1)
    .onStart((e) => {
      const m = modeRef.current;
      if (m !== "draw-room" && m !== "draw-wall") return;
      const bboxNow = bboxRef.current;
      const { mx, my } = screenToMeter(e.x, e.y);
      const sx = Math.max(bboxNow.minX, Math.min(bboxNow.maxX, snapGrid(mx)));
      const sy = Math.max(bboxNow.minY, Math.min(bboxNow.maxY, snapGrid(my)));
      if (m === "draw-room") {
        drawStartRef.current = { x: sx, y: sy };
        drawEndRef.current = { x: sx, y: sy };
        setDrawStart({ x: sx, y: sy });
        setDrawEnd({ x: sx, y: sy });
      } else {
        wallStartRef.current = { x: sx, y: sy };
        wallEndRef.current = { x: sx, y: sy };
        setWallStart({ x: sx, y: sy });
        setWallEnd({ x: sx, y: sy });
      }
    })
    .onUpdate((e) => {
      const m = modeRef.current;
      if (m !== "draw-room" && m !== "draw-wall") return;
      const bboxNow = bboxRef.current;
      const { mx, my } = screenToMeter(e.x, e.y);
      const ex = Math.max(bboxNow.minX, Math.min(bboxNow.maxX, snapGrid(mx)));
      const ey = Math.max(bboxNow.minY, Math.min(bboxNow.maxY, snapGrid(my)));
      if (m === "draw-room" && drawStartRef.current) {
        drawEndRef.current = { x: ex, y: ey };
        setDrawEnd({ x: ex, y: ey });
      } else if (m === "draw-wall" && wallStartRef.current) {
        wallEndRef.current = { x: ex, y: ey };
        setWallEnd({ x: ex, y: ey });
      }
    })
    .onEnd(() => {
      const m = modeRef.current;

      if (m === "draw-room") {
        const start = drawStartRef.current;
        const end = drawEndRef.current;
        setDrawStart(null);
        setDrawEnd(null);
        drawStartRef.current = null;
        drawEndRef.current = null;
        if (!start || !end) return;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        const panjang = maxX - minX;
        const lebar = maxY - minY;
        if (panjang < 1 || lebar < 1) {
          Alert.alert("Terlalu Kecil", "Gambar minimal 1×1 meter.");
          return;
        }
        const rt = selectedRoomTypeRef.current;
        const newRoom: PlacedRoom = {
          id: `room-${Date.now()}-${Math.random()}`,
          nama: rt.nama,
          x: minX,
          y: minY,
          panjang,
          lebar,
          color: rt.color,
          doors: [],
          windows: [],
        };

        const poly = lahanPolygonRef.current;
        if (poly && poly.length >= 3) {
          if (!isRoomInsidePolygon(newRoom, poly)) {
            Alert.alert(
              "Keluar Batas Lahan",
              "Ruangan ini keluar dari batas lahan.",
            );
            return;
          }
        }

        const rooms = roomsRef.current;
        if (cekOverlap(newRoom, rooms)) {
          Alert.alert("Bertumpukan", "Ruangan bertumpukan dengan yang lain.");
          return;
        }
        const total = rooms.reduce((s, r) => s + r.panjang * r.lebar, 0);
        if (total + newRoom.panjang * newRoom.lebar > totalLuasLahan) {
          Alert.alert("Luas Melebihi", "Total melebihi luas lahan.");
          return;
        }
        setPlacedRooms((prev) => [...prev, newRoom]);
        setSelectedRoomId(newRoom.id);
        return;
      }

      if (m === "draw-wall") {
        const start = wallStartRef.current;
        const end = wallEndRef.current;
        setWallStart(null);
        setWallEnd(null);
        wallStartRef.current = null;
        wallEndRef.current = null;
        if (!start || !end) return;
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        if (length < 0.5) {
          Alert.alert("Terlalu Pendek", "Dinding minimal 0.5 meter.");
          return;
        }
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        let finalEnd = { ...end };
        if (dx > dy) finalEnd.y = start.y;
        else finalEnd.x = start.x;

        const poly = lahanPolygonRef.current;
        if (poly && poly.length >= 3) {
          const startInside = isPointInPolygon(start.x, start.y, poly);
          const endInside = isPointInPolygon(finalEnd.x, finalEnd.y, poly);
          if (!startInside || !endInside) {
            Alert.alert("Keluar Batas Lahan", "Dinding ini keluar dari lahan.");
            return;
          }
          if (
            doWallCrossPolygon(start.x, start.y, finalEnd.x, finalEnd.y, poly)
          ) {
            Alert.alert(
              "Melewati Batas Lahan",
              "Dinding melewati batas lahan.",
            );
            return;
          }
        }

        const newWall: Wall = {
          id: `wall-${Date.now()}-${Math.random()}`,
          x1: start.x,
          y1: start.y,
          x2: finalEnd.x,
          y2: finalEnd.y,
          nama: "",
          doors: [],
          windows: [],
        };
        setWalls((prev) => [...prev, newWall]);
        return;
      }
    })
    .runOnJS(true);

  // ============================================
  // GESTURE: PAN CANVAS + PINCH
  // ============================================
  const panCanvasGesture = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      savedCanvasTranslate.current = canvasTranslateRef.current;
    })
    .onUpdate((e) => {
      setCanvasTranslate({
        x: savedCanvasTranslate.current.x + e.translationX,
        y: savedCanvasTranslate.current.y + e.translationY,
      });
    })
    .runOnJS(true);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedCanvasScale.current = canvasScaleRef.current;
    })
    .onUpdate((e) => {
      const newScale = Math.max(
        0.3,
        Math.min(3, savedCanvasScale.current * e.scale),
      );
      setCanvasScale(newScale);
    })
    .runOnJS(true);

  const composed = Gesture.Simultaneous(
    Gesture.Race(tapGesture, panDrawGesture),
    Gesture.Simultaneous(panCanvasGesture, pinchGesture),
  );

  // ============================================
  // HANDLER: SELESAI LAHAN (BEBAS)
  // ============================================
  const handleSelesaiLahan = () => {
    if (lahanDraft.length < 3) {
      Alert.alert("Minimal 3 Titik", "Tambahkan minimal 3 titik sudut.");
      return;
    }
    const area = polygonArea(lahanDraft);
    if (area < 1) {
      Alert.alert("Area Terlalu Kecil", "Luas lahan minimal 1 m².");
      return;
    }
    const normalized = normalizePolygonToOrigin(lahanDraft);
    setLahanPolygon(normalized);
    setLahanDraft([]);
    setMode("draw-room");
    Alert.alert(
      "✅ Lahan Selesai",
      `Luas lahan: ${Math.round(area * 100) / 100} m².`,
    );
  };

  const handleUndoTitik = () => {
    if (lahanDraft.length === 0) return;
    setLahanDraft((prev) => prev.slice(0, -1));
  };

  // ============================================
  // HANDLER: RESIZE
  // ============================================
  const handleResize = (dPanjang: number, dLebar: number) => {
    if (!selectedRoomId) return;
    setPlacedRooms((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoomId) return r;
        const newP = Math.max(1, r.panjang + dPanjang);
        const newL = Math.max(1, r.lebar + dLebar);
        const merged = { ...r, panjang: newP, lebar: newL };
        if (cekOverlap(merged, prev, r.id)) return r;
        const poly = lahanPolygonRef.current;
        if (poly && poly.length >= 3) {
          if (!isRoomInsidePolygon(merged, poly)) return r;
        }
        return merged;
      }),
    );
  };

  // ============================================
  // HANDLER: DELETE
  // ============================================
  const handleDeleteRoom = () => {
    if (!selectedRoomId) return;
    Alert.alert("Hapus Ruangan", "Yakin hapus ruangan ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          setPlacedRooms((prev) => prev.filter((r) => r.id !== selectedRoomId));
          setSelectedRoomId(null);
        },
      },
    ]);
  };

  const handleDeleteWall = () => {
    if (!selectedWallId) return;
    Alert.alert("Hapus Dinding", "Yakin hapus dinding ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          setWalls((prev) => prev.filter((w) => w.id !== selectedWallId));
          setSelectedWallId(null);
        },
      },
    ]);
  };

  const handleClearElements = () => {
    if (!selectedRoomId) return;
    setPlacedRooms((prev) =>
      prev.map((r) =>
        r.id === selectedRoomId ? { ...r, doors: [], windows: [] } : r,
      ),
    );
  };

  const handleResetCanvas = () => {
    setCanvasScale(1);
    setCanvasTranslate({ x: 0, y: 0 });
    savedCanvasScale.current = 1;
    savedCanvasTranslate.current = { x: 0, y: 0 };
  };

  const handleClearAll = () => {
    Alert.alert(
      "Hapus Semua",
      "Yakin hapus semua ruangan, dinding, dan area?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Semua",
          style: "destructive",
          onPress: () => {
            setPlacedRooms([]);
            setWalls([]);
            setPlacedAreas([]);
            setSelectedRoomId(null);
            setSelectedWallId(null);
            setSelectedAreaId(null);
          },
        },
      ],
    );
  };

  // ============================================
  // HANDLER: AREA
  // ============================================
  const handleConfirmArea = () => {
    if (!pendingArea) return;
    const trimmed = areaValue.trim();
    if (!trimmed) {
      Alert.alert("Nama Kosong", "Nama area tidak boleh kosong.");
      return;
    }
    const newArea: PlacedArea = {
      id: `area-${Date.now()}-${Math.random()}`,
      nama: trimmed,
      left: pendingArea.left,
      right: pendingArea.right,
      top: pendingArea.top,
      bottom: pendingArea.bottom,
      centerX: pendingArea.centerX,
      centerY: pendingArea.centerY,
    };
    setPlacedAreas((prev) => [...prev, newArea]);
    setAreaModalVisible(false);
    setPendingArea(null);
    setAreaValue("");
    setTimeout(() => setMode("idle"), 100);
  };

  const handleCancelArea = () => {
    setAreaModalVisible(false);
    setPendingArea(null);
    setAreaValue("");
    setTimeout(() => setMode("idle"), 100);
  };

  const handleDeleteArea = () => {
    if (!selectedAreaId) return;
    const area = placedAreas.find((a) => a.id === selectedAreaId);
    if (!area) return;
    Alert.alert("Hapus Area", `Yakin hapus area "${area.nama}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          setPlacedAreas((prev) => prev.filter((a) => a.id !== selectedAreaId));
          setSelectedAreaId(null);
        },
      },
    ]);
  };

  const handleRenameArea = () => {
    if (!selectedAreaId) return;
    const area = placedAreas.find((a) => a.id === selectedAreaId);
    if (!area) return;
    setAreaValue(area.nama);
    setPendingArea({
      left: area.left,
      right: area.right,
      top: area.top,
      bottom: area.bottom,
      centerX: area.centerX,
      centerY: area.centerY,
    });
    setAreaModalVisible(true);
  };

  // ============================================
  // HANDLER: RENAME WALL
  // ============================================
  const handleOpenRenameWall = () => {
    if (!selectedWallId) return;
    const wall = walls.find((w) => w.id === selectedWallId);
    if (!wall) return;
    setRenameWallValue(wall.nama || "");
    setRenameWallModalVisible(true);
  };

  const handleRenameWall = () => {
    if (!selectedWallId) return;
    const trimmed = renameWallValue.trim();
    setWalls((prev) =>
      prev.map((w) => (w.id === selectedWallId ? { ...w, nama: trimmed } : w)),
    );
    setRenameWallModalVisible(false);
    setRenameWallValue("");
  };

  const handleCancelRenameWall = () => {
    setRenameWallModalVisible(false);
    setRenameWallValue("");
  };

  // ============================================
  // HANDLER: PINTU & JENDELA
  // ============================================
  const handleConfirmDoor = () => {
    if (!pendingDoor) return;
    if (pendingDoor.targetType === "room") {
      setPlacedRooms((prev) =>
        prev.map((r) =>
          r.id === pendingDoor.targetId
            ? {
                ...r,
                doors: [
                  ...r.doors,
                  {
                    edge: pendingDoor.edge,
                    position: pendingDoor.position,
                    swingDirection: doorSwing,
                    hingeSide: doorHinge,
                  },
                ],
              }
            : r,
        ),
      );
    } else {
      setWalls((prev) =>
        prev.map((w) =>
          w.id === pendingDoor.targetId
            ? {
                ...w,
                doors: [
                  ...w.doors,
                  {
                    edge: pendingDoor.edge,
                    position: pendingDoor.position,
                    swingDirection: doorSwing,
                    hingeSide: doorHinge,
                  },
                ],
              }
            : w,
        ),
      );
    }
    setDoorModalVisible(false);
    setPendingDoor(null);
    setTimeout(() => setMode("idle"), 100);
  };

  const handleCancelDoor = () => {
    setDoorModalVisible(false);
    setPendingDoor(null);
    setTimeout(() => setMode("idle"), 100);
  };

  const handleConfirmWindow = () => {
    if (!pendingWindow) return;
    const needsSwing = windowType === "casement" || windowType === "awning";
    if (pendingWindow.targetType === "room") {
      setPlacedRooms((prev) =>
        prev.map((r) =>
          r.id === pendingWindow.targetId
            ? {
                ...r,
                windows: [
                  ...r.windows,
                  {
                    edge: pendingWindow.edge,
                    position: pendingWindow.position,
                    type: windowType,
                    ...(needsSwing
                      ? { swingDirection: windowSwing, hingeSide: windowHinge }
                      : {}),
                  },
                ],
              }
            : r,
        ),
      );
    } else {
      setWalls((prev) =>
        prev.map((w) =>
          w.id === pendingWindow.targetId
            ? {
                ...w,
                windows: [
                  ...w.windows,
                  {
                    edge: pendingWindow.edge,
                    position: pendingWindow.position,
                    type: windowType,
                    ...(needsSwing
                      ? { swingDirection: windowSwing, hingeSide: windowHinge }
                      : {}),
                  },
                ],
              }
            : w,
        ),
      );
    }
    setWindowModalVisible(false);
    setPendingWindow(null);
    setTimeout(() => setMode("idle"), 100);
  };

  const handleCancelWindow = () => {
    setWindowModalVisible(false);
    setPendingWindow(null);
    setTimeout(() => setMode("idle"), 100);
  };

  // ============================================
  // HANDLER: VIEWER 3D
  // ============================================
  const goToViewer3D = (floorId?: string | number) => {
    const payload = {
      panjangLahan,
      lebarLahan: tinggiLahan,
      buildingId,
      projectId,
      floorId: floorId || null,
      rooms: placedRooms,
      walls,
      areas: placedAreas,
      lahanPolygon,
      bentukLahan: dataLahan.bentuk,
    };
    router.push({
      pathname: "/viewer-3d",
      params: { data: JSON.stringify(payload) },
    });
  };

  // ============================================
  // HANDLER: SUBMIT
  // ============================================
  const handleSubmit = async () => {
    if (placedRooms.length === 0 && walls.length === 0) {
      Alert.alert("Kosong", "Tambahkan minimal 1 ruangan atau dinding.");
      return;
    }

    if (!backendOK) {
      Alert.alert(
        "💾 Disimpan Lokal",
        `${placedRooms.length} ruangan tersimpan di HP.\n\nLanjut ke tampilan 3D?`,
        [
          { text: "Nanti", style: "cancel" },
          { text: "Lihat 3D", onPress: () => goToViewer3D() },
        ],
      );
      return;
    }

    try {
      setSaving(true);
      const floorRes = await axios.get(
        `${API_URL}/floors/?building=${buildingId}`,
        { timeout: API_TIMEOUT },
      );
      const floorId = floorRes.data?.[0]?.id;
      if (!floorId) {
        Alert.alert("Error", "Floor tidak ditemukan.");
        return;
      }
      for (const r of placedRooms) {
        await axios.post(
          `${API_URL}/rooms/`,
          {
            floor: floorId,
            nama: r.nama,
            x: r.x,
            y: r.y,
            panjang: r.panjang,
            lebar: r.lebar,
          },
          { timeout: API_TIMEOUT },
        );
      }
      for (const w of walls) {
        try {
          await axios.post(
            `${API_URL}/walls/`,
            {
              floor: floorId,
              start_x: w.x1,
              start_y: w.y1,
              end_x: w.x2,
              end_y: w.y2,
              tebal: 0.15,
              tinggi: 3.0,
              nama: w.nama || "",
            },
            { timeout: API_TIMEOUT },
          );
        } catch (wallErr) {
          console.log("Dinding gagal disimpan:", wallErr);
        }
      }
      Alert.alert(
        "✅ Berhasil!",
        `${placedRooms.length} ruangan & ${walls.length} dinding tersimpan.\n\nLanjut ke tampilan 3D?`,
        [
          { text: "Nanti", style: "cancel" },
          { text: "Lihat 3D", onPress: () => goToViewer3D(floorId) },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        "Gagal Simpan",
        err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message || "Cek koneksi.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // GRID LINES
  // ============================================
   const gridLines = useMemo(() => {
     const lines: {
       x1: number;
       y1: number;
       x2: number;
       y2: number;
       thick: boolean;
       label?: string;
     }[] = [];

     // ✅ Grid SELALU dimunculkan (termasuk saat mode gambar lahan bebas)
     const bb = effectiveBBox;
     const startX = Math.floor(bb.minX);
     const endX = Math.ceil(bb.maxX);
     const startY = Math.floor(bb.minY);
     const endY = Math.ceil(bb.maxY);

     // Saat mode gambar lahan bebas, paksa grid kotak penuh (karena belum ada polygon)
     if (isBebasBelumDigambar || dataLahan.bentuk === "kotak") {
       for (let x = startX; x <= endX; x++) {
         const px = (x - bb.minX) * scale;
         lines.push({
           x1: px,
           y1: (startY - bb.minY) * scale,
           x2: px,
           y2: (endY - bb.minY) * scale,
           thick: x % 5 === 0,
         });
       }
       for (let y = startY; y <= endY; y++) {
         const py = (y - bb.minY) * scale;
         lines.push({
           x1: (startX - bb.minX) * scale,
           y1: py,
           x2: (endX - bb.minX) * scale,
           y2: py,
           thick: y % 5 === 0,
         });
       }
       return lines;
     }

     // MODE POLYGON: clip grid ke polygon
     if (lahanPolygon && lahanPolygon.length >= 3) {
       for (let x = startX; x <= endX; x++) {
         const segs = clipLineToPolygon(
           x,
           bb.minY - 1,
           x,
           bb.maxY + 1,
           lahanPolygon,
         );
         for (const s of segs) {
           lines.push({
             x1: (s.x1 - bb.minX) * scale,
             y1: (s.y1 - bb.minY) * scale,
             x2: (s.x2 - bb.minX) * scale,
             y2: (s.y2 - bb.minY) * scale,
             thick: x % 5 === 0,
           });
         }
       }
       for (let y = startY; y <= endY; y++) {
         const segs = clipLineToPolygon(
           bb.minX - 1,
           y,
           bb.maxX + 1,
           y,
           lahanPolygon,
         );
         for (const s of segs) {
           lines.push({
             x1: (s.x1 - bb.minX) * scale,
             y1: (s.y1 - bb.minY) * scale,
             x2: (s.x2 - bb.minX) * scale,
             y2: (s.y2 - bb.minY) * scale,
             thick: y % 5 === 0,
           });
         }
       }
     }
     return lines;
   }, [
     effectiveBBox,
     dataLahan.bentuk,
     lahanPolygon,
     scale,
     isBebasBelumDigambar,
   ]);

  const previewRect = useMemo(() => {
    if (!drawStart || !drawEnd) return null;
    const bb = effectiveBBox;
    const minX = Math.min(drawStart.x, drawEnd.x);
    const maxX = Math.max(drawStart.x, drawEnd.x);
    const minY = Math.min(drawStart.y, drawEnd.y);
    const maxY = Math.max(drawStart.y, drawEnd.y);
    return {
      x: (minX - bb.minX) * scale,
      y: (minY - bb.minY) * scale,
      width: (maxX - minX) * scale,
      height: (maxY - minY) * scale,
    };
  }, [drawStart, drawEnd, effectiveBBox, scale]);

  const previewWall = useMemo(() => {
    if (!wallStart || !wallEnd) return null;
    const bb = effectiveBBox;
    return {
      x1: (wallStart.x - bb.minX) * scale,
      y1: (wallStart.y - bb.minY) * scale,
      x2: (wallEnd.x - bb.minX) * scale,
      y2: (wallEnd.y - bb.minY) * scale,
    };
  }, [wallStart, wallEnd, effectiveBBox, scale]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Susun Denah</Text>
          <Text style={styles.headerSub}>
            {isBebasBelumDigambar
              ? "Mode Gambar Lahan • Tap titik sudut untuk mulai"
              : `Lahan ${panjangLahan.toFixed(1)}m × ${tinggiLahan.toFixed(1)}m • ${dataLahan.bentuk} • ${totalLuasLahan} m²`}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={handleClearAll}>
          <Ionicons name="trash" size={20} color="#DC2626" />
        </TouchableOpacity>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: backendOK ? "#DCFCE7" : "#FEF3C7" },
          ]}
        >
          <Ionicons
            name={backendOK ? "cloud-done" : "cloud-offline"}
            size={12}
            color={backendOK ? "#166534" : "#92400E"}
          />
          <Text
            style={[
              styles.statusText,
              { color: backendOK ? "#166534" : "#92400E" },
            ]}
          >
            {backendOK ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      {/* BANNER MODE GAMBAR LAHAN */}
      {(mode === "draw-lahan" || isBebasBelumDigambar) && (
        <View style={styles.lahanBanner}>
          <Ionicons name="construct" size={16} color="#7C2D12" />
          <Text style={styles.lahanBannerText}>
            {lahanDraft.length === 0
              ? "Tap untuk mulai menggambar lahan"
              : `${lahanDraft.length} titik • tap titik pertama untuk menutup`}
          </Text>
          <View style={styles.lahanBannerBtns}>
            <TouchableOpacity style={styles.lahanBtn} onPress={handleUndoTitik}>
              <Ionicons name="arrow-undo" size={14} color="#FFFFFF" />
              <Text style={styles.lahanBtnText}>Undo</Text>
            </TouchableOpacity>
            {lahanDraft.length >= 3 && (
              <TouchableOpacity
                style={[styles.lahanBtn, { backgroundColor: "#16A34A" }]}
                onPress={handleSelesaiLahan}
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.lahanBtnText}>Selesai</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* INFO PANEL */}
      <View style={styles.infoPanel}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Lahan</Text>
          <Text style={styles.infoValue}>
            {isBebasBelumDigambar ? "—" : `${totalLuasLahan} m²`}
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Terpakai</Text>
          <Text style={[styles.infoValue, { color: "#EA580C" }]}>
            {totalLuasTerpakai.toFixed(1)} m²
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Sisa</Text>
          <Text style={[styles.infoValue, { color: "#16A34A" }]}>
            {isBebasBelumDigambar ? "—" : `${luasTersisa.toFixed(1)} m²`}
          </Text>
        </View>
      </View>

      {/* MODE BAR */}
      <View style={styles.modeBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeBarContent}
        >
          {[
            { key: "draw-room", label: "Ruangan", icon: "pencil" },
            { key: "draw-wall", label: "Dinding", icon: "remove" },
            { key: "place-area", label: "Area", icon: "text" },
            { key: "idle", label: "Pilih", icon: "hand-left" },
            { key: "place-door", label: "Pintu", icon: "enter" },
            { key: "place-window", label: "Jendela", icon: "browsers" },
            { key: "erase", label: "Hapus", icon: "trash-outline" },
          ].map((item) => {
            const active = mode === item.key;
            const isErase = item.key === "erase";
            const disabled = isBebasBelumDigambar && item.key !== "draw-lahan";
            return (
              <TouchableOpacity
                key={item.key}
                disabled={disabled}
                style={[
                  styles.modeBtn,
                  active &&
                    (isErase ? styles.modeBtnErase : styles.modeBtnActive),
                  disabled && { opacity: 0.4 },
                ]}
                onPress={() => {
                  setMode(item.key as DrawingMode);
                  setSelectedRoomId(null);
                  setSelectedWallId(null);
                  setSelectedAreaId(null);
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={active ? "#FFFFFF" : isErase ? "#DC2626" : "#334155"}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    active && styles.modeBtnTextActive,
                    !active && isErase && { color: "#DC2626" },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* PICKER RUANGAN */}
      {mode === "draw-room" && !isBebasBelumDigambar && (
        <View style={styles.pickerWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pickerContent}>
              {ROOM_TYPES.map((r) => {
                const isActive = selectedRoomType.nama === r.nama;
                return (
                  <TouchableOpacity
                    key={r.nama}
                    style={[styles.roomChip, isActive && styles.roomChipActive]}
                    onPress={() => setSelectedRoomType(r)}
                  >
                    <View
                      style={[styles.chipColor, { backgroundColor: r.color }]}
                    />
                    <Text
                      style={[
                        styles.roomChipText,
                        isActive && styles.roomChipTextActive,
                      ]}
                    >
                      {r.nama}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* HINT BAR */}
      <View style={styles.hintBar}>
        <Ionicons name="information-circle" size={14} color="#92400E" />
        <Text style={styles.hintText}>
          {isBebasBelumDigambar
            ? "Tap titik sudut lahan, tap titik pertama untuk menutup"
            : mode === "draw-room"
              ? "Tap & drag 1 jari untuk gambar ruangan · 2 jari untuk geser/zoom"
              : mode === "draw-wall"
                ? "Tap & drag untuk gambar dinding"
                : mode === "place-area"
                  ? "Tap di dalam area tertutup dinding → beri nama"
                  : mode === "place-door"
                    ? "Tap ruangan/dinding → atur pintu"
                    : mode === "place-window"
                      ? "Tap ruangan/dinding → pilih jendela"
                      : mode === "erase"
                        ? "Tap elemen untuk hapus"
                        : "Tap ruangan/dinding/area untuk pilih"}
        </Text>
      </View>

      {/* ============================================
          CANVAS — BACKGROUND PUTIH FIX, KONTEN IKUT ZOOM/PAN
          ============================================ */}
      <View style={styles.canvasContainer}>
        <GestureDetector gesture={composed}>
          <View
            style={{
              width: canvasW,
              height: canvasH,
              backgroundColor: "#FFFFFF",
            }}
          >
            <Canvas
              style={{
                width: canvasW,
                height: canvasH,
                backgroundColor: "#FFFFFF",
              }}
            >
              {/* LAYER 1: BACKGROUND PUTIH (FIX) */}
              <Rect
                x={0}
                y={0}
                width={canvasW}
                height={canvasH}
                color="#FFFFFF"
              />

              {/* LAYER 2: KONTEN (IKUT ZOOM & PAN) */}
              <Group
                transform={[
                  { translateX: canvasTranslate.x },
                  { translateY: canvasTranslate.y },
                  { scale: canvasScale },
                ]}
                origin={{ x: canvasW / 2, y: canvasH / 2 }}
              >
                <Group
                  transform={[{ translateX: offsetX }, { translateY: offsetY }]}
                >
                  {/* BORDER LAHAN */}
                  {lahanPolygon && lahanPolygon.length >= 3 && (
                    <>
                      <Path
                        path={
                          `M ${(lahanPolygon[0].x - effectiveBBox.minX) * scale} ${(lahanPolygon[0].y - effectiveBBox.minY) * scale} ` +
                          lahanPolygon
                            .slice(1)
                            .map(
                              (p) =>
                                `L ${(p.x - effectiveBBox.minX) * scale} ${(p.y - effectiveBBox.minY) * scale}`,
                            )
                            .join(" ") +
                          " Z"
                        }
                        color="rgba(241, 245, 249, 0.4)"
                      />
                      <Path
                        path={
                          `M ${(lahanPolygon[0].x - effectiveBBox.minX) * scale} ${(lahanPolygon[0].y - effectiveBBox.minY) * scale} ` +
                          lahanPolygon
                            .slice(1)
                            .map(
                              (p) =>
                                `L ${(p.x - effectiveBBox.minX) * scale} ${(p.y - effectiveBBox.minY) * scale}`,
                            )
                            .join(" ") +
                          " Z"
                        }
                        color="#0F172A"
                        style="stroke"
                        strokeWidth={3}
                      />
                    </>
                  )}

                  {/* GRID */}
                  {gridLines.map((l, i) => (
                    <Line
                      key={`g-${i}`}
                      p1={{ x: l.x1, y: l.y1 }}
                      p2={{ x: l.x2, y: l.y2 }}
                      color={l.thick ? "#64748B" : "#CBD5E1"}
                      strokeWidth={l.thick ? 1.5 : 1}
                    />
                  ))}

                  {/* DRAFT LAHAN */}
                  {lahanDraft.length > 0 && (
                    <>
                      {lahanDraft.map((p, i) => {
                        if (i === 0) return null;
                        const prev = lahanDraft[i - 1];
                        return (
                          <Line
                            key={`draft-line-${i}`}
                            p1={{
                              x: (prev.x - effectiveBBox.minX) * scale,
                              y: (prev.y - effectiveBBox.minY) * scale,
                            }}
                            p2={{
                              x: (p.x - effectiveBBox.minX) * scale,
                              y: (p.y - effectiveBBox.minY) * scale,
                            }}
                            color="#EA580C"
                            strokeWidth={3}
                          />
                        );
                      })}
                      {lahanDraft.map((p, i) => (
                        <Rect
                          key={`draft-dot-${i}`}
                          x={(p.x - effectiveBBox.minX) * scale - 6}
                          y={(p.y - effectiveBBox.minY) * scale - 6}
                          width={12}
                          height={12}
                          color={i === 0 ? "#16A34A" : "#EA580C"}
                        />
                      ))}
                    </>
                  )}

                  {/* DINDING MANUAL */}
                  {walls.map((w) => {
                    const isSelected = selectedWallId === w.id;
                    return (
                      <Line
                        key={w.id}
                        p1={{
                          x: (w.x1 - effectiveBBox.minX) * scale,
                          y: (w.y1 - effectiveBBox.minY) * scale,
                        }}
                        p2={{
                          x: (w.x2 - effectiveBBox.minX) * scale,
                          y: (w.y2 - effectiveBBox.minY) * scale,
                        }}
                        color={isSelected ? "#EA580C" : "#334155"}
                        strokeWidth={
                          isSelected ? WALL_THICKNESS + 3 : WALL_THICKNESS
                        }
                        strokeCap="square"
                      />
                    );
                  })}

                  {/* RUANGAN FILL */}
                  {placedRooms.map((room) => (
                    <Rect
                      key={`fill-${room.id}`}
                      x={(room.x - effectiveBBox.minX) * scale}
                      y={(room.y - effectiveBBox.minY) * scale}
                      width={room.panjang * scale}
                      height={room.lebar * scale}
                      color={room.color}
                    />
                  ))}

                  {/* DINDING RUANGAN */}
                  {placedRooms.map((room) => {
                    const x = (room.x - effectiveBBox.minX) * scale;
                    const y = (room.y - effectiveBBox.minY) * scale;
                    const w = room.panjang * scale;
                    const h = room.lebar * scale;
                    const isSelected = selectedRoomId === room.id;
                    return (
                      <React.Fragment key={`wall-${room.id}`}>
                        <Line
                          p1={{ x, y }}
                          p2={{ x: x + w, y }}
                          color={isSelected ? "#EA580C" : "#1E293B"}
                          strokeWidth={WALL_THICKNESS}
                          strokeCap="square"
                        />
                        <Line
                          p1={{ x, y: y + h }}
                          p2={{ x: x + w, y: y + h }}
                          color={isSelected ? "#EA580C" : "#1E293B"}
                          strokeWidth={WALL_THICKNESS}
                          strokeCap="square"
                        />
                        <Line
                          p1={{ x, y }}
                          p2={{ x, y: y + h }}
                          color={isSelected ? "#EA580C" : "#1E293B"}
                          strokeWidth={WALL_THICKNESS}
                          strokeCap="square"
                        />
                        <Line
                          p1={{ x: x + w, y }}
                          p2={{ x: x + w, y: y + h }}
                          color={isSelected ? "#EA580C" : "#1E293B"}
                          strokeWidth={WALL_THICKNESS}
                          strokeCap="square"
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* PINTU RUANGAN */}
                  {placedRooms.map((room) =>
                    room.doors.map((door, idx) => {
                      const doorWidth = 0.8;
                      const halfWidth = doorWidth / 2;
                      let px1 = 0,
                        py1 = 0,
                        px2 = 0,
                        py2 = 0;
                      const pos = door.position;
                      if (door.edge === "top") {
                        const cx =
                          (room.x + pos * room.panjang - effectiveBBox.minX) *
                          scale;
                        const cy = (room.y - effectiveBBox.minY) * scale;
                        px1 = cx - halfWidth * scale;
                        px2 = cx + halfWidth * scale;
                        py1 = py2 = cy;
                      } else if (door.edge === "bottom") {
                        const cx =
                          (room.x + pos * room.panjang - effectiveBBox.minX) *
                          scale;
                        const cy =
                          (room.y + room.lebar - effectiveBBox.minY) * scale;
                        px1 = cx - halfWidth * scale;
                        px2 = cx + halfWidth * scale;
                        py1 = py2 = cy;
                      } else if (door.edge === "left") {
                        const cx = (room.x - effectiveBBox.minX) * scale;
                        const cy =
                          (room.y + pos * room.lebar - effectiveBBox.minY) *
                          scale;
                        px1 = px2 = cx;
                        py1 = cy - halfWidth * scale;
                        py2 = cy + halfWidth * scale;
                      } else {
                        const cx =
                          (room.x + room.panjang - effectiveBBox.minX) * scale;
                        const cy =
                          (room.y + pos * room.lebar - effectiveBBox.minY) *
                          scale;
                        px1 = px2 = cx;
                        py1 = cy - halfWidth * scale;
                        py2 = cy + halfWidth * scale;
                      }
                      const hingeX = door.hingeSide === "left" ? px1 : px2;
                      const hingeY = door.hingeSide === "left" ? py1 : py2;
                      const otherX = door.hingeSide === "left" ? px2 : px1;
                      const otherY = door.hingeSide === "left" ? py2 : py1;
                      const doorLengthPx = doorWidth * scale;
                      const inwardSign = door.swingDirection === "in" ? 1 : -1;
                      let openX = 0,
                        openY = 0;
                      if (door.edge === "top") {
                        openX = hingeX;
                        openY = hingeY + inwardSign * doorLengthPx;
                      } else if (door.edge === "bottom") {
                        openX = hingeX;
                        openY = hingeY - inwardSign * doorLengthPx;
                      } else if (door.edge === "left") {
                        openX = hingeX + inwardSign * doorLengthPx;
                        openY = hingeY;
                      } else {
                        openX = hingeX - inwardSign * doorLengthPx;
                        openY = hingeY;
                      }
                      return (
                        <React.Fragment key={`${room.id}-door-${idx}`}>
                          <Line
                            p1={{ x: px1, y: py1 }}
                            p2={{ x: px2, y: py2 }}
                            color="#FFFFFF"
                            strokeWidth={WALL_THICKNESS + 1}
                          />
                          <Line
                            p1={{ x: hingeX, y: hingeY }}
                            p2={{ x: openX, y: openY }}
                            color="#DC2626"
                            strokeWidth={2}
                          />
                          <Line
                            p1={{ x: hingeX, y: hingeY }}
                            p2={{ x: otherX, y: otherY }}
                            color="#DC2626"
                            strokeWidth={0.8}
                            opacity={0.4}
                          />
                          <Line
                            p1={{ x: openX, y: openY }}
                            p2={{ x: otherX, y: otherY }}
                            color="#DC2626"
                            strokeWidth={0.8}
                            opacity={0.5}
                          />
                          <Rect
                            x={hingeX - 2}
                            y={hingeY - 2}
                            width={4}
                            height={4}
                            color="#DC2626"
                          />
                        </React.Fragment>
                      );
                    }),
                  )}

                  {/* PINTU DINDING MANUAL */}
                  {walls.map((wall) =>
                    wall.doors.map((door, idx) => {
                      const doorWidth = 0.8;
                      const halfWidth = doorWidth / 2;
                      const side1 = getWallDoorSideMeter(
                        wall,
                        door,
                        -halfWidth,
                      );
                      const side2 = getWallDoorSideMeter(wall, door, halfWidth);
                      const px1 = (side1.x - effectiveBBox.minX) * scale;
                      const py1 = (side1.y - effectiveBBox.minY) * scale;
                      const px2 = (side2.x - effectiveBBox.minX) * scale;
                      const py2 = (side2.y - effectiveBBox.minY) * scale;
                      const len = Math.hypot(
                        wall.x2 - wall.x1,
                        wall.y2 - wall.y1,
                      );
                      const ux = len > 0 ? (wall.x2 - wall.x1) / len : 0;
                      const uy = len > 0 ? (wall.y2 - wall.y1) / len : 0;
                      const hingeMeter =
                        door.hingeSide === "left" ? side1 : side2;
                      const otherMeter =
                        door.hingeSide === "left" ? side2 : side1;
                      const hingeX =
                        (hingeMeter.x - effectiveBBox.minX) * scale;
                      const hingeY =
                        (hingeMeter.y - effectiveBBox.minY) * scale;
                      const otherX =
                        (otherMeter.x - effectiveBBox.minX) * scale;
                      const otherY =
                        (otherMeter.y - effectiveBBox.minY) * scale;
                      const nx = -uy,
                        ny = ux;
                      const swingSign = door.swingDirection === "out" ? 1 : -1;
                      const doorLengthPx = doorWidth * scale;
                      const openX = hingeX + nx * swingSign * doorLengthPx;
                      const openY = hingeY + ny * swingSign * doorLengthPx;
                      return (
                        <React.Fragment key={`${wall.id}-door-${idx}`}>
                          <Line
                            p1={{ x: px1, y: py1 }}
                            p2={{ x: px2, y: py2 }}
                            color="#FFFFFF"
                            strokeWidth={WALL_THICKNESS + 1}
                          />
                          <Line
                            p1={{ x: hingeX, y: hingeY }}
                            p2={{ x: openX, y: openY }}
                            color="#DC2626"
                            strokeWidth={2}
                          />
                          <Line
                            p1={{ x: hingeX, y: hingeY }}
                            p2={{ x: otherX, y: otherY }}
                            color="#DC2626"
                            strokeWidth={0.8}
                            opacity={0.4}
                          />
                          <Line
                            p1={{ x: openX, y: openY }}
                            p2={{ x: otherX, y: otherY }}
                            color="#DC2626"
                            strokeWidth={0.8}
                            opacity={0.5}
                          />
                          <Rect
                            x={hingeX - 2}
                            y={hingeY - 2}
                            width={4}
                            height={4}
                            color="#DC2626"
                          />
                        </React.Fragment>
                      );
                    }),
                  )}

                  {/* JENDELA RUANGAN */}
                  {placedRooms.map((room) =>
                    room.windows.map((win, idx) => {
                      const windowWidth = 1.2;
                      let centerX = 0,
                        centerY = 0;
                      const pos = win.position;
                      if (win.edge === "top") {
                        centerX =
                          (room.x + pos * room.panjang - effectiveBBox.minX) *
                          scale;
                        centerY = (room.y - effectiveBBox.minY) * scale;
                      } else if (win.edge === "bottom") {
                        centerX =
                          (room.x + pos * room.panjang - effectiveBBox.minX) *
                          scale;
                        centerY =
                          (room.y + room.lebar - effectiveBBox.minY) * scale;
                      } else if (win.edge === "left") {
                        centerX = (room.x - effectiveBBox.minX) * scale;
                        centerY =
                          (room.y + pos * room.lebar - effectiveBBox.minY) *
                          scale;
                      } else {
                        centerX =
                          (room.x + room.panjang - effectiveBBox.minX) * scale;
                        centerY =
                          (room.y + pos * room.lebar - effectiveBBox.minY) *
                          scale;
                      }
                      const isVerticalEdge =
                        win.edge === "left" || win.edge === "right";
                      const boxLength = windowWidth * scale;
                      const boxDepth = 10;
                      let rectX = 0,
                        rectY = 0,
                        rectW = 0,
                        rectH = 0;
                      if (isVerticalEdge) {
                        rectX = centerX - boxDepth / 2;
                        rectY = centerY - boxLength / 2;
                        rectW = boxDepth;
                        rectH = boxLength;
                      } else {
                        rectX = centerX - boxLength / 2;
                        rectY = centerY - boxDepth / 2;
                        rectW = boxLength;
                        rectH = boxDepth;
                      }
                      return (
                        <React.Fragment key={`${room.id}-win-${idx}`}>
                          <Rect
                            x={isVerticalEdge ? rectX - 2 : rectX}
                            y={isVerticalEdge ? rectY : rectY - 2}
                            width={isVerticalEdge ? rectW + 4 : rectW}
                            height={isVerticalEdge ? rectH : rectH + 4}
                            color="#FFFFFF"
                          />
                          <Rect
                            x={rectX}
                            y={rectY}
                            width={rectW}
                            height={rectH}
                            color="#2563EB"
                          />
                          <Rect
                            x={rectX + 1.5}
                            y={rectY + 1.5}
                            width={rectW - 3}
                            height={rectH - 3}
                            color="#FFFFFF"
                          />
                          {win.type === "sliding" &&
                            (isVerticalEdge ? (
                              <Line
                                p1={{ x: rectX, y: centerY }}
                                p2={{ x: rectX + rectW, y: centerY }}
                                color="#2563EB"
                                strokeWidth={1.5}
                              />
                            ) : (
                              <Line
                                p1={{ x: centerX, y: rectY }}
                                p2={{ x: centerX, y: rectY + rectH }}
                                color="#2563EB"
                                strokeWidth={1.5}
                              />
                            ))}
                          {win.type === "fixed" && (
                            <>
                              <Line
                                p1={{ x: rectX + 3, y: rectY + 3 }}
                                p2={{
                                  x: rectX + rectW - 3,
                                  y: rectY + rectH - 3,
                                }}
                                color="#93C5FD"
                                strokeWidth={1}
                              />
                              <Line
                                p1={{ x: rectX + 3, y: rectY + rectH - 3 }}
                                p2={{ x: rectX + rectW - 3, y: rectY + 3 }}
                                color="#93C5FD"
                                strokeWidth={1}
                              />
                            </>
                          )}
                          {win.type === "jalousie" && (
                            <>
                              {Array.from({ length: 4 }).map((_, li) => {
                                const t = (li + 1) / 5;
                                if (isVerticalEdge) {
                                  return (
                                    <Line
                                      key={`jal-${li}`}
                                      p1={{
                                        x: rectX + 1,
                                        y: rectY + rectH * t,
                                      }}
                                      p2={{
                                        x: rectX + rectW - 1,
                                        y: rectY + rectH * t,
                                      }}
                                      color="#93C5FD"
                                      strokeWidth={1}
                                    />
                                  );
                                } else {
                                  return (
                                    <Line
                                      key={`jal-${li}`}
                                      p1={{
                                        x: rectX + rectW * t,
                                        y: rectY + 1,
                                      }}
                                      p2={{
                                        x: rectX + rectW * t,
                                        y: rectY + rectH - 1,
                                      }}
                                      color="#93C5FD"
                                      strokeWidth={1}
                                    />
                                  );
                                }
                              })}
                            </>
                          )}
                        </React.Fragment>
                      );
                    }),
                  )}

                  {/* JENDELA DINDING MANUAL */}
                  {walls.map((wall) =>
                    wall.windows.map((win, idx) => {
                      const windowWidth = 1.2;
                      const center = getWallWindowCenterMeter(wall, win);
                      const len = Math.hypot(
                        wall.x2 - wall.x1,
                        wall.y2 - wall.y1,
                      );
                      const ux = len > 0 ? (wall.x2 - wall.x1) / len : 0;
                      const uy = len > 0 ? (wall.y2 - wall.y1) / len : 0;
                      const nx = -uy,
                        ny = ux;
                      const boxLength = windowWidth * scale;
                      const boxDepth = 10;
                      const cx = (center.x - effectiveBBox.minX) * scale;
                      const cy = (center.y - effectiveBBox.minY) * scale;
                      const hx = ux * (boxLength / 2);
                      const hy = uy * (boxLength / 2);
                      const dx = nx * (boxDepth / 2);
                      const dy = ny * (boxDepth / 2);
                      const p1 = { x: cx - hx + dx, y: cy - hy + dy };
                      const p2 = { x: cx + hx + dx, y: cy + hy + dy };
                      const p3 = { x: cx + hx - dx, y: cy + hy - dy };
                      const p4 = { x: cx - hx - dx, y: cy - hy - dy };
                      return (
                        <React.Fragment key={`${wall.id}-win-${idx}`}>
                          <Line
                            p1={p1}
                            p2={p2}
                            color="#FFFFFF"
                            strokeWidth={WALL_THICKNESS + 4}
                          />
                          <Line
                            p1={p1}
                            p2={p2}
                            color="#2563EB"
                            strokeWidth={1.5}
                          />
                          <Line
                            p1={p2}
                            p2={p3}
                            color="#2563EB"
                            strokeWidth={1.5}
                          />
                          <Line
                            p1={p3}
                            p2={p4}
                            color="#2563EB"
                            strokeWidth={1.5}
                          />
                          <Line
                            p1={p4}
                            p2={p1}
                            color="#2563EB"
                            strokeWidth={1.5}
                          />
                          <Line
                            p1={{ x: cx - hx, y: cy - hy }}
                            p2={{ x: cx + hx, y: cy + hy }}
                            color="#2563EB"
                            strokeWidth={1}
                          />
                        </React.Fragment>
                      );
                    }),
                  )}

                  {/* PREVIEW RECT */}
                  {previewRect && (
                    <>
                      <Rect
                        x={previewRect.x}
                        y={previewRect.y}
                        width={previewRect.width}
                        height={previewRect.height}
                        color="rgba(234, 88, 12, 0.25)"
                      />
                      <Rect
                        x={previewRect.x}
                        y={previewRect.y}
                        width={previewRect.width}
                        height={previewRect.height}
                        color="#EA580C"
                        style="stroke"
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {/* PREVIEW WALL */}
                  {previewWall && (
                    <Line
                      p1={{ x: previewWall.x1, y: previewWall.y1 }}
                      p2={{ x: previewWall.x2, y: previewWall.y2 }}
                      color="#EA580C"
                      strokeWidth={WALL_THICKNESS + 2}
                      strokeCap="square"
                    />
                  )}
                </Group>
              </Group>
            </Canvas>

            {/* LABEL OVERLAY (IKUT TRANSFORM) */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { width: canvasW, height: canvasH },
              ]}
              pointerEvents="none"
            >
              <View
                style={{
                  flex: 1,
                  transform: [
                    { translateX: canvasTranslate.x },
                    { translateY: canvasTranslate.y },
                    { scale: canvasScale },
                  ],
                }}
              >
                {/* Label meter horizontal — SELALU MUNCUL */}
                {Array.from({ length: Math.floor(panjangLahan) + 1 }).map(
                  (_, i) => {
                    if (i === 0) return null;
                    const localX = offsetX + i * scale - 15;
                    const localY = offsetY - 22;
                    return (
                      <View
                        key={`mx-${i}`}
                        style={[
                          styles.meterLabelH,
                          { left: localX, top: localY },
                        ]}
                      >
                        <Text style={styles.meterLabelText}>{`${i}m`}</Text>
                      </View>
                    );
                  },
                )}

                {/* Label meter vertikal — SELALU MUNCUL */}
                {Array.from({ length: Math.floor(tinggiLahan) + 1 }).map(
                  (_, i) => {
                    if (i === 0) return null;
                    const localX = offsetX - 38;
                    const localY = offsetY + i * scale - 8;
                    return (
                      <View
                        key={`my-${i}`}
                        style={[
                          styles.meterLabelV,
                          { left: localX, top: localY },
                        ]}
                      >
                        <Text style={styles.meterLabelText}>{`${i}m`}</Text>
                      </View>
                    );
                  },
                )}

                {placedRooms.map((room) => {
                  const localX =
                    offsetX +
                    (room.x + room.panjang / 2 - effectiveBBox.minX) * scale -
                    40;
                  const localY =
                    offsetY +
                    (room.y + room.lebar / 2 - effectiveBBox.minY) * scale -
                    12;
                  return (
                    <View
                      key={`lbl-${room.id}`}
                      style={[styles.roomLabel, { left: localX, top: localY }]}
                    >
                      <Text style={styles.roomLabelName}>{room.nama}</Text>
                      <Text style={styles.roomLabelSize}>
                        {room.panjang}×{room.lebar}m
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </GestureDetector>

        {/* OVERLAY HINT — saat bebas belum digambar */}
        {isBebasBelumDigambar && lahanDraft.length === 0 && (
          <View
            style={{
              position: "absolute",
              top: "30%",
              left: 20,
              right: 20,
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(234, 88, 12, 0.95)",
                paddingHorizontal: 24,
                paddingVertical: 20,
                borderRadius: 16,
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons name="hand-left" size={36} color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Tap untuk mulai menggambar lahan
              </Text>
              <Text
                style={{
                  color: "#FFEDD5",
                  fontSize: 12,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                Tap titik sudut satu per satu.{"\n"}Tap titik pertama untuk
                menutup polygon.
              </Text>
            </View>
          </View>
        )}

        {isBebasBelumDigambar && lahanDraft.length > 0 && (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              backgroundColor: "rgba(22, 163, 74, 0.95)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
              {lahanDraft.length} titik • tap titik pertama untuk menutup
            </Text>
          </View>
        )}

        <View style={styles.zoomInfo}>
          <Text style={styles.zoomInfoText}>
            Zoom: {Math.round(canvasScale * 100)}% • {scale.toFixed(1)}px/m
          </Text>
        </View>

        <TouchableOpacity
          style={styles.resetCanvasBtn}
          onPress={handleResetCanvas}
        >
          <Ionicons name="locate" size={14} color="#FFFFFF" />
          <Text style={styles.resetCanvasText}>Fit</Text>
        </TouchableOpacity>
      </View>

      {/* EDIT PANEL RUANGAN */}
      {selectedRoom && mode === "idle" && !isBebasBelumDigambar && (
        <View style={styles.editPanel}>
          <View style={styles.editPanelHeader}>
            <Text style={styles.editPanelTitle}>
              ✏️ {selectedRoom.nama} ({selectedRoom.panjang}×
              {selectedRoom.lebar}m)
            </Text>
            <TouchableOpacity
              style={styles.deleteIconBtn}
              onPress={handleDeleteRoom}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
          <Text style={styles.editLabel}>Ubah Ukuran:</Text>
          <View style={styles.sizeRow}>
            <View style={styles.sizeControl}>
              <Text style={styles.sizeControlLabel}>Panjang</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleResize(-1, 0)}
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{selectedRoom.panjang}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleResize(1, 0)}
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.sizeControl}>
              <Text style={styles.sizeControlLabel}>Lebar</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleResize(0, -1)}
                >
                  <Ionicons name="remove" size={16} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{selectedRoom.lebar}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleResize(0, 1)}
                >
                  <Ionicons name="add" size={16} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
              onPress={handleClearElements}
            >
              <Ionicons name="refresh" size={14} color="#DC2626" />
              <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>
                Reset P/J
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#DC2626" }]}
              onPress={handleDeleteRoom}
            >
              <Ionicons name="trash" size={14} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: "#FFFFFF" }]}>
                Hapus
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* EDIT PANEL DINDING */}
      {selectedWall && mode === "idle" && !isBebasBelumDigambar && (
        <View style={styles.editPanel}>
          <View style={styles.editPanelHeader}>
            <Text style={styles.editPanelTitle}>
              🧱 {selectedWall.nama ? selectedWall.nama : "Dinding Terpilih"}
            </Text>
            <TouchableOpacity
              style={styles.deleteIconBtn}
              onPress={handleDeleteWall}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
          <Text style={styles.editLabel}>
            Panjang:{" "}
            {Math.hypot(
              selectedWall.x2 - selectedWall.x1,
              selectedWall.y2 - selectedWall.y1,
            ).toFixed(2)}{" "}
            m
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#E0E7FF" }]}
              onPress={handleOpenRenameWall}
            >
              <Ionicons name="pricetag" size={14} color="#4338CA" />
              <Text style={[styles.actionBtnText, { color: "#4338CA" }]}>
                Beri Nama
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#DC2626" }]}
              onPress={handleDeleteWall}
            >
              <Ionicons name="trash" size={14} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: "#FFFFFF" }]}>
                Hapus Dinding
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* EDIT PANEL AREA */}
      {selectedArea && mode === "idle" && !isBebasBelumDigambar && (
        <View style={styles.editPanel}>
          <View style={styles.editPanelHeader}>
            <Text style={styles.editPanelTitle}>🏠 {selectedArea.nama}</Text>
            <TouchableOpacity
              style={styles.deleteIconBtn}
              onPress={handleDeleteArea}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
          <Text style={styles.editLabel}>
            Ukuran: {Math.round(selectedArea.right - selectedArea.left)}×
            {Math.round(selectedArea.bottom - selectedArea.top)} m
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#E0E7FF" }]}
              onPress={handleRenameArea}
            >
              <Ionicons name="pricetag" size={14} color="#4338CA" />
              <Text style={[styles.actionBtnText, { color: "#4338CA" }]}>
                Ubah Nama
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#DC2626" }]}
              onPress={handleDeleteArea}
            >
              <Ionicons name="trash" size={14} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: "#FFFFFF" }]}>
                Hapus Area
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.btn,
            (saving || isBebasBelumDigambar) && { opacity: 0.5 },
          ]}
          onPress={handleSubmit}
          disabled={saving || isBebasBelumDigambar}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.btnText}>
                {isBebasBelumDigambar
                  ? "Selesaikan Lahan Dulu"
                  : `Simpan Denah (${placedRooms.length + placedAreas.length})`}
              </Text>
              <Ionicons name="checkmark" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL PINTU */}
      <Modal
        visible={doorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelDoor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Arah Buka Pintu</Text>
              <TouchableOpacity onPress={handleCancelDoor}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              {pendingDoor?.targetType === "wall"
                ? "Pintu akan dipasang di dinding manual."
                : "Tentukan arah buka pintu dan posisi engsel."}
            </Text>
            <Text style={styles.modalLabel}>Arah Buka:</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  doorSwing === "in" && styles.optionBtnActive,
                ]}
                onPress={() => setDoorSwing("in")}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={doorSwing === "in" ? "#FFFFFF" : "#0F172A"}
                />
                <Text
                  style={[
                    styles.optionText,
                    doorSwing === "in" && styles.optionTextActive,
                  ]}
                >
                  Ke Dalam
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  doorSwing === "out" && styles.optionBtnActive,
                ]}
                onPress={() => setDoorSwing("out")}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={doorSwing === "out" ? "#FFFFFF" : "#0F172A"}
                />
                <Text
                  style={[
                    styles.optionText,
                    doorSwing === "out" && styles.optionTextActive,
                  ]}
                >
                  Ke Luar
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Posisi Engsel:</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  doorHinge === "left" && styles.optionBtnActive,
                ]}
                onPress={() => setDoorHinge("left")}
              >
                <Text
                  style={[
                    styles.optionText,
                    doorHinge === "left" && styles.optionTextActive,
                  ]}
                >
                  Kiri
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  doorHinge === "right" && styles.optionBtnActive,
                ]}
                onPress={() => setDoorHinge("right")}
              >
                <Text
                  style={[
                    styles.optionText,
                    doorHinge === "right" && styles.optionTextActive,
                  ]}
                >
                  Kanan
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelDoor}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmDoor}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmText}>Tambahkan Pintu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL JENDELA */}
      <Modal
        visible={windowModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelWindow}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipe Jendela</Text>
              <TouchableOpacity onPress={handleCancelWindow}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              {pendingWindow?.targetType === "wall"
                ? "Jendela akan dipasang di dinding manual."
                : "Pilih jenis jendela yang diinginkan."}
            </Text>
            <Text style={styles.modalLabel}>Tipe:</Text>
            <View style={styles.windowTypeGrid}>
              {(
                [
                  { key: "casement", label: "Casement", desc: "Buka luar" },
                  { key: "sliding", label: "Sliding", desc: "Geser" },
                  { key: "awning", label: "Awning", desc: "Buka atas" },
                  { key: "fixed", label: "Fixed", desc: "Mati" },
                  { key: "jalousie", label: "Jalousie", desc: "Kisi" },
                ] as { key: WindowType; label: string; desc: string }[]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.windowTypeBtn,
                    windowType === opt.key && styles.windowTypeBtnActive,
                  ]}
                  onPress={() => setWindowType(opt.key)}
                >
                  <Text
                    style={[
                      styles.windowTypeLabel,
                      windowType === opt.key && styles.windowTypeLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.windowTypeDesc,
                      windowType === opt.key && styles.windowTypeDescActive,
                    ]}
                  >
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {(windowType === "casement" || windowType === "awning") && (
              <>
                <Text style={styles.modalLabel}>Arah Buka:</Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity
                    style={[
                      styles.optionBtn,
                      windowSwing === "in" && styles.optionBtnActive,
                    ]}
                    onPress={() => setWindowSwing("in")}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        windowSwing === "in" && styles.optionTextActive,
                      ]}
                    >
                      Ke Dalam
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionBtn,
                      windowSwing === "out" && styles.optionBtnActive,
                    ]}
                    onPress={() => setWindowSwing("out")}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        windowSwing === "out" && styles.optionTextActive,
                      ]}
                    >
                      Ke Luar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {windowType === "casement" && (
              <>
                <Text style={styles.modalLabel}>Posisi Engsel:</Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity
                    style={[
                      styles.optionBtn,
                      windowHinge === "left" && styles.optionBtnActive,
                    ]}
                    onPress={() => setWindowHinge("left")}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        windowHinge === "left" && styles.optionTextActive,
                      ]}
                    >
                      Kiri
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionBtn,
                      windowHinge === "right" && styles.optionBtnActive,
                    ]}
                    onPress={() => setWindowHinge("right")}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        windowHinge === "right" && styles.optionTextActive,
                      ]}
                    >
                      Kanan
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelWindow}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmWindow}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmText}>Tambahkan Jendela</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL RENAME WALL */}
      <Modal
        visible={renameWallModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelRenameWall}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beri Nama Dinding</Text>
              <TouchableOpacity onPress={handleCancelRenameWall}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Masukkan nama untuk dinding ini.
            </Text>
            <TextInput
              style={styles.renameInput}
              value={renameWallValue}
              onChangeText={setRenameWallValue}
              placeholder="Nama dinding..."
              placeholderTextColor="#94A3B8"
              autoFocus
              maxLength={30}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelRenameWall}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleRenameWall}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmText}>Simpan Nama</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL AREA */}
      <Modal
        visible={areaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelArea}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beri Nama Area</Text>
              <TouchableOpacity onPress={handleCancelArea}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Beri nama untuk area ini.</Text>
            {pendingArea && (
              <Text style={styles.areaSizeInfo}>
                Ukuran: {Math.round(pendingArea.right - pendingArea.left)}×
                {Math.round(pendingArea.bottom - pendingArea.top)} m
              </Text>
            )}
            <TextInput
              style={styles.renameInput}
              value={areaValue}
              onChangeText={setAreaValue}
              placeholder="Nama area..."
              placeholderTextColor="#94A3B8"
              autoFocus
              maxLength={30}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelArea}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmArea}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmText}>Simpan Area</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  headerSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  lahanBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FED7AA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDBA74",
  },
  lahanBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#7C2D12",
    fontWeight: "600",
    lineHeight: 16,
  },
  lahanBannerBtns: { flexDirection: "row", gap: 6 },
  lahanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EA580C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lahanBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  infoPanel: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  infoItem: { flex: 1, alignItems: "center" },
  infoLabel: { fontSize: 11, color: "#64748B" },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  infoDivider: { width: 1, backgroundColor: "#E2E8F0" },
  modeBarWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modeBarContent: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 6,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    minWidth: 80,
  },
  modeBtnActive: { backgroundColor: "#EA580C" },
  modeBtnErase: { backgroundColor: "#DC2626" },
  modeBtnText: { fontSize: 11, fontWeight: "700", color: "#334155" },
  modeBtnTextActive: { color: "#FFFFFF" },
  pickerWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  pickerContent: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  roomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  roomChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  chipColor: { width: 12, height: 12, borderRadius: 3 },
  roomChipText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  roomChipTextActive: { color: "#FFFFFF" },
  hintBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintText: { fontSize: 11, color: "#92400E", flex: 1 },
  canvasContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
    overflow: "hidden",
  },
  meterLabelH: { position: "absolute", width: 30, alignItems: "center" },
  meterLabelV: {
    position: "absolute",
    width: 30,
    alignItems: "flex-end",
    paddingRight: 4,
  },
  meterLabelText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 2,
  },
  roomLabel: { position: "absolute", width: 80, alignItems: "center" },
  roomLabelName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  roomLabelSize: { fontSize: 9, color: "#475569", fontWeight: "600" },
  zoomInfo: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  zoomInfoText: { fontSize: 10, color: "#334155", fontWeight: "700" },
  resetCanvasBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16A34A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  resetCanvasText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  editPanel: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EA580C",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  editPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editPanelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  deleteIconBtn: { padding: 6, backgroundColor: "#FEE2E2", borderRadius: 6 },
  editLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
    marginTop: 4,
  },
  sizeRow: { flexDirection: "row", gap: 12 },
  sizeControl: { flex: 1 },
  sizeControlLabel: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
    marginBottom: 4,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  stepBtn: { padding: 8 },
  stepValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 10,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: "700" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  btn: {
    backgroundColor: "#EA580C",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  modalSub: { fontSize: 13, color: "#64748B", marginBottom: 16 },
  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 8,
  },
  optionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  optionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  optionBtnActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  optionText: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  optionTextActive: { color: "#FFFFFF" },
  modalActionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  modalConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#EA580C",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  windowTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  windowTypeBtn: {
    width: "31%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  windowTypeBtnActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  windowTypeLabel: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  windowTypeLabelActive: { color: "#FFFFFF" },
  windowTypeDesc: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  windowTypeDescActive: { color: "#DBEAFE" },
  renameInput: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    marginBottom: 16,
  },
});