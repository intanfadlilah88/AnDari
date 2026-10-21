import { create } from "zustand";
import {
  FloorPlanData,
  Door,
  WindowItem,
  CUSTOMER_ORDER,
} from "@/components/FloorPlanCanvas";

type EditMode = "select" | "add-door" | "add-window" | "add-wall" | "add-room";

type SelectedItem = {
  type: "door" | "window" | "wall" | "room";
  id: string;
} | null;

type FloorPlanState = {
  data: FloorPlanData;
  mode: EditMode;
  selected: SelectedItem;
  history: FloorPlanData[];
  historyIndex: number;
  showGrid: boolean;
  snapEnabled: boolean;
  gridSize: number;
  setGridSize: (size: number) => void;

  setMode: (mode: EditMode) => void;
  setSelected: (item: SelectedItem) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  addDoor: (x: number, y: number) => void;
  addWindow: (x: number, y: number) => void;
  updateItem: (type: string, id: string, changes: any) => void;
  deleteItem: (type: string, id: string) => void;
  setData: (data: FloorPlanData) => void; // ✅ BARU
  undo: () => void;
  redo: () => void;
};

const snapVal = (v: number, gs: number) => Math.round(v / gs) * gs;

export const useFloorPlanStore = create<FloorPlanState>((set, get) => ({
  data: CUSTOMER_ORDER,
  mode: "select",
  selected: null,
  history: [CUSTOMER_ORDER],
  historyIndex: 0,
  showGrid: true,
  snapEnabled: true,
  gridSize: 50, // ✅ BARU: default value

  setGridSize: (size) => set({ gridSize: size }),

  setMode: (mode) => {
    console.log("🔄 [Store] Mode:", mode);
    set({ mode, selected: null });
  },
  setSelected: (selected) => set({ selected }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  setData: (data) => {
    const newHistory = [...get().history, data];
    set({
      data,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addDoor: (x, y) => {
    const { data, snapEnabled, gridSize } = get(); // ✅ pakai gridSize state
    const fx = snapEnabled ? snapVal(x, gridSize) : x;
    const fy = snapEnabled ? snapVal(y, gridSize) : y;
    const newDoor: Door = {
      id: `door-${Date.now()}`,
      x: fx,
      y: fy,
      width: 80,
      rotation: 0,
      swing: "right",
    };
    const newData = { ...data, doors: [...data.doors, newDoor] };
    const newHistory = [...get().history, newData];
    set({
      data: newData,
      selected: { type: "door", id: newDoor.id },
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addWindow: (x, y) => {
    const { data, snapEnabled, gridSize } = get();
    const fx = snapEnabled ? snapVal(x, gridSize) : x;
    const fy = snapEnabled ? snapVal(y, gridSize) : y;
    const newWin: WindowItem = {
      id: `win-${Date.now()}`,
      x: fx,
      y: fy,
      width: 100,
      rotation: 0,
    };
    const newData = { ...data, windows: [...data.windows, newWin] };
    const newHistory = [...get().history, newData];
    set({
      data: newData,
      selected: { type: "window", id: newWin.id },
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateItem: (type, id, changes) => {
    const { data, history, historyIndex } = get();
    const key =
      type === "door"
        ? "doors"
        : type === "window"
          ? "windows"
          : type === "wall"
            ? "walls"
            : "rooms";
    const newData = {
      ...data,
      [key]: (data as any)[key].map((item: any) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    set({
      data: newData,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  deleteItem: (type, id) => {
    const { data, history, historyIndex } = get();
    const key =
      type === "door"
        ? "doors"
        : type === "window"
          ? "windows"
          : type === "wall"
            ? "walls"
            : "rooms";
    const newData = {
      ...data,
      [key]: (data as any)[key].filter((item: any) => item.id !== id),
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    set({
      data: newData,
      selected: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const i = historyIndex - 1;
      set({ data: history[i], historyIndex: i, selected: null });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const i = historyIndex + 1;
      set({ data: history[i], historyIndex: i, selected: null });
    }
  },
}));
