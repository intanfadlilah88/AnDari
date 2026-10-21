import { create } from "zustand";

export interface Wall {
  id: number;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  tebal: string;
  tinggi: string;
  floor: number;
}

export interface Room {
  id: number;
  floor: number;
  nama: string;
  x: number;
  y: number;
  panjang: number;
  lebar: number;
}

export interface Door {
  id: number;
  wall: number;
  offset: number;
  lebar: string;
  tinggi: string;
}

export interface Window {
  id: number;
  wall: number;
  offset: number;
  lebar: string;
  tinggi: string;
}

export interface Floor {
  id: number;
  level: number;
  building: number;
  walls: Wall[];
  rooms: Room[];
}

export interface Building {
  id: number;
  nama: string;
  project: number;
  floors: Floor[];
}

export type EditorMode = "select" | "draw" | "room" | "door" | "window";

// Tipe elemen yang bisa dipilih
export type SelectedElement =
  | { type: "wall"; id: number }
  | { type: "door"; id: number }
  | { type: "window"; id: number }
  | null;

interface DesignState {
  currentBuilding: Building | null;
  selectedWallId: number | null;
  selectedElement: SelectedElement;
  mode: EditorMode;
  doors: Door[];
  windows: Window[];
  setCurrentBuilding: (building: Building) => void;
  addWall: (wall: Wall) => void;
  addRoom: (room: Room) => void;
  addDoor: (door: Door) => void;
  addWindow: (win: Window) => void;
  removeWall: (id: number) => void;
  removeDoor: (id: number) => void;
  removeWindow: (id: number) => void;
  updateWallLocal: (wall: Wall) => void;
  setSelectedWallId: (id: number | null) => void;
  setSelectedElement: (el: SelectedElement) => void;
  setMode: (mode: EditorMode) => void;
}

export const useDesignStore = create<DesignState>((set) => ({
  currentBuilding: null,
  selectedWallId: null,
  selectedElement: null,
  mode: "select",
  doors: [],
  windows: [],

  setCurrentBuilding: (building) => set({ currentBuilding: building }),
  setMode: (mode) => set({ mode, selectedWallId: null, selectedElement: null }),

  addWall: (wall) =>
    set((state) => {
      if (!state.currentBuilding) return state;
      const floors = [...state.currentBuilding.floors];
      if (floors.length === 0) return state;
      floors[0] = { ...floors[0], walls: [...floors[0].walls, wall] };
      return { currentBuilding: { ...state.currentBuilding, floors } };
    }),

  addRoom: (room) =>
    set((state) => {
      if (!state.currentBuilding) return state;
      const floors = [...state.currentBuilding.floors];
      if (floors.length === 0) return state;
      floors[0] = {
        ...floors[0],
        rooms: [...(floors[0].rooms || []), room],
      };
      return { currentBuilding: { ...state.currentBuilding, floors } };
    }),

  addDoor: (door) => set((state) => ({ doors: [...state.doors, door] })),
  addWindow: (win) => set((state) => ({ windows: [...state.windows, win] })),

  removeWall: (id) =>
    set((state) => {
      if (!state.currentBuilding) return state;
      const floors = state.currentBuilding.floors.map((floor) => ({
        ...floor,
        walls: floor.walls.filter((w) => w.id !== id),
      }));
      return {
        currentBuilding: { ...state.currentBuilding, floors },
        selectedWallId: null,
        selectedElement: null,
      };
    }),

  removeDoor: (id) =>
    set((state) => ({
      doors: state.doors.filter((d) => d.id !== id),
      selectedElement: null,
    })),

  removeWindow: (id) =>
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
      selectedElement: null,
    })),

  updateWallLocal: (wall) =>
    set((state) => {
      if (!state.currentBuilding) return state;
      const floors = state.currentBuilding.floors.map((floor) => ({
        ...floor,
        walls: floor.walls.map((w) => (w.id === wall.id ? wall : w)),
      }));
      return { currentBuilding: { ...state.currentBuilding, floors } };
    }),

  setSelectedWallId: (id) =>
    set({
      selectedWallId: id,
      selectedElement: id ? { type: "wall", id } : null,
    }),

  setSelectedElement: (el) => set({ selectedElement: el }),
}));
