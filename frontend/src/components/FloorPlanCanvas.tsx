import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useDesignStore } from '../store/designStore';
import type { Building } from '../store/designStore';
import {
  getBuilding,
  createWall,
  deleteWall,
  updateWall,
  createRoom,
  createDoor,
  createWindow,
  deleteDoor,
  deleteWindow,
} from '../services/api';

interface FloorPlanCanvasProps {
  buildingId: number;
}

const SCALE = 100;
const OFFSET_X = 50;
const OFFSET_Y = 50;
const GRID = 0.5;
const TOOLBAR_HEIGHT = 55;

const pixelToMeter = (px: number, offset: number) => (px - offset) / SCALE;
const meterToPixel = (m: number, offset: number) => m * SCALE + offset;
const snapGrid = (value: number) => Math.round(value / GRID) * GRID;

const wallLengthMeters = (wall: {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
}) => Math.hypot(wall.end_x - wall.start_x, wall.end_y - wall.start_y);

const snapToEndpoint = (
  x: number,
  y: number,
  walls: { start_x: number; start_y: number; end_x: number; end_y: number }[]
): { x: number; y: number; snapped: boolean } => {
  const THRESHOLD = 0.3;
  let best: { x: number; y: number; dist: number } | null = null;
  for (const w of walls) {
    const points = [
      { x: w.start_x, y: w.start_y },
      { x: w.end_x, y: w.end_y },
    ];
    for (const p of points) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= THRESHOLD && (!best || d < best.dist)) {
        best = { x: p.x, y: p.y, dist: d };
      }
    }
  }
  if (best) return { x: best.x, y: best.y, snapped: true };
  return { x: snapGrid(x), y: snapGrid(y), snapped: false };
};

const closestPointOnSegment = (
  ax: number, ay: number,
  bx: number, by: number,
  px: number, py: number
) => {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: ax, y: ay, t: 0 };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy, t };
};

const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({ buildingId }) => {
  const {
    currentBuilding,
    setCurrentBuilding,
    addWall,
    addRoom,
    addDoor,
    addWindow,
    removeWall,
    removeDoor,
    removeWindow,
    updateWallLocal,
    selectedWallId,
    setSelectedWallId,
    selectedElement,
    setSelectedElement,
    mode,
    setMode,
    doors,
    windows,
  } = useDesignStore();

  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    wallStartX: number;
    wallStartY: number;
    wallEndX: number;
    wallEndY: number;
  } | null>(null);

  // State untuk drag endpoint
  const [draggingEndpoint, setDraggingEndpoint] = useState<{
    wallId: number;
    which: 'start' | 'end';
  } | null>(null);

  // ======== PAN & ZOOM STATE ========
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  // ======== UKURAN KANVAS ========
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 100,
  });

  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight - 100,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const t1 = setTimeout(updateSize, 100);
    const t2 = setTimeout(updateSize, 400);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Load building
  useEffect(() => {
    const load = async () => {
      try {
        const data: any = await getBuilding(buildingId);
        setCurrentBuilding(data);

        const allDoors: any[] = [];
        const allWindows: any[] = [];
        data.floors.forEach((floor: any) => {
          floor.walls.forEach((wall: any) => {
            if (wall.doors) {
              wall.doors.forEach((d: any) => allDoors.push(d));
            }
            if (wall.windows) {
              wall.windows.forEach((w: any) => allWindows.push(w));
            }
          });
        });
        useDesignStore.setState({ doors: allDoors, windows: allWindows });
      } catch (err) {
        console.error('Gagal memuat building:', err);
      }
    };
    load();
  }, [buildingId, setCurrentBuilding]);

  const allWalls = currentBuilding
    ? currentBuilding.floors.flatMap((f) => f.walls)
    : [];
  const allRooms = currentBuilding
    ? currentBuilding.floors.flatMap((f) => f.rooms || [])
    : [];

  // ============ PAN & ZOOM ============
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScaleRaw = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const newScale = Math.max(0.2, Math.min(5, newScaleRaw));
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setStageScale(newScale);
    setStagePos(newPos);
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isMiddleClick = e.evt.button === 1;
    if (isMiddleClick || spacePressed) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setIsPanning(true);
      panStartRef.current = { x: pointer.x - stagePos.x, y: pointer.y - stagePos.y };
      return;
    }
    handleMouseDown(e);
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      const stage = stageRef.current;
      if (!stage || !panStartRef.current) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setStagePos({
        x: pointer.x - panStartRef.current.x,
        y: pointer.y - panStartRef.current.y,
      });
      return;
    }
    handleMouseMove();
  };

  const handleStageMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }
    handleMouseUp();
  };
  // =====================================

  // Draw/room
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (mode !== 'draw' && mode !== 'room') return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;
    const rawX = pixelToMeter(pointer.x, OFFSET_X);
    const rawY = pixelToMeter(pointer.y, OFFSET_Y);
    let mx: number, my: number;
    if (mode === 'draw') {
      const snapped = snapToEndpoint(rawX, rawY, allWalls);
      mx = snapped.x;
      my = snapped.y;
    } else {
      mx = snapGrid(rawX);
      my = snapGrid(rawY);
    }
    setDrawStart({ x: mx, y: my });
    setDrawEnd({ x: mx, y: my });
  };

  const handleMouseMove = () => {
    if ((mode !== 'draw' && mode !== 'room') || !drawStart) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;
    const rawX = pixelToMeter(pointer.x, OFFSET_X);
    const rawY = pixelToMeter(pointer.y, OFFSET_Y);
    if (mode === 'draw') {
      const snapped = snapToEndpoint(rawX, rawY, allWalls);
      setDrawEnd({ x: snapped.x, y: snapped.y });
      setSnapIndicator(snapped.snapped ? { x: snapped.x, y: snapped.y } : null);
    } else {
      setDrawEnd({ x: snapGrid(rawX), y: snapGrid(rawY) });
    }
  };

  const handleMouseUp = async () => {
    if ((mode !== 'draw' && mode !== 'room') || !drawStart || !drawEnd) return;
    if (!currentBuilding) return;
    if (drawStart.x === drawEnd.x && drawStart.y === drawEnd.y) {
      setDrawStart(null);
      setDrawEnd(null);
      setSnapIndicator(null);
      return;
    }
    const floorId = currentBuilding.floors[0]?.id;
    if (!floorId) {
      alert('Tidak ada lantai');
      return;
    }
    if (mode === 'draw') {
      const newWall = {
        floor: floorId,
        start_x: drawStart.x,
        start_y: drawStart.y,
        end_x: drawEnd.x,
        end_y: drawEnd.y,
        tebal: '0.15',
        tinggi: '3.00',
      };
      try {
        const created = await createWall(newWall);
        addWall(created);
      } catch (err) {
        console.error('Gagal menambah dinding:', err);
      }
    } else if (mode === 'room') {
      const x1 = Math.min(drawStart.x, drawEnd.x);
      const y1 = Math.min(drawStart.y, drawEnd.y);
      const x2 = Math.max(drawStart.x, drawEnd.x);
      const y2 = Math.max(drawStart.y, drawEnd.y);
      const panjang = x2 - x1;
      const lebar = y2 - y1;
      const nama = prompt('Nama ruangan (misal: Kamar Utama):');
      if (!nama) {
        setDrawStart(null);
        setDrawEnd(null);
        return;
      }
      const newRoom = {
        floor: floorId,
        nama,
        x: x1,
        y: y1,
        panjang: panjang.toFixed(2),
        lebar: lebar.toFixed(2),
      };
      try {
        const created = await createRoom(newRoom);
        addRoom(created);
      } catch (err) {
        console.error('Gagal menambah ruangan:', err);
      }
    }
    setDrawStart(null);
    setDrawEnd(null);
    setSnapIndicator(null);
  };

  const handleDelete = async () => {
    if (!selectedElement) return;
    try {
      if (selectedElement.type === 'wall') {
        await deleteWall(selectedElement.id);
        removeWall(selectedElement.id);
      } else if (selectedElement.type === 'door') {
        await deleteDoor(selectedElement.id);
        removeDoor(selectedElement.id);
      } else if (selectedElement.type === 'window') {
        await deleteWindow(selectedElement.id);
        removeWindow(selectedElement.id);
      }
    } catch (err) {
      console.error('Gagal menghapus:', err);
    }
  };

  const handleWallClick = async (
    wall: any,
    e: Konva.KonvaEventObject<MouseEvent>
  ) => {
    if (mode === 'select') {
      setSelectedWallId(wall.id);
      return;
    }
    if (mode === 'door' || mode === 'window') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      const mx = pixelToMeter(pointer.x, OFFSET_X);
      const my = pixelToMeter(pointer.y, OFFSET_Y);
      const closest = closestPointOnSegment(
        wall.start_x, wall.start_y,
        wall.end_x, wall.end_y,
        mx, my
      );
      const wallLength = Math.hypot(
        wall.end_x - wall.start_x,
        wall.end_y - wall.start_y
      );
      const offset = closest.t * wallLength;
      const defaultLebar = mode === 'door' ? '0.9' : '1.2';
      const defaultTinggi = mode === 'door' ? '2.1' : '1.5';
      const lebarStr = prompt(
        `Lebar ${mode === 'door' ? 'pintu' : 'jendela'} (meter):`,
        defaultLebar
      );
      if (!lebarStr) return;
      const tinggiStr = prompt(
        `Tinggi ${mode === 'door' ? 'pintu' : 'jendela'} (meter):`,
        defaultTinggi
      );
      if (!tinggiStr) return;
      const data = {
        wall: wall.id,
        offset: offset,
        lebar: parseFloat(lebarStr).toFixed(2),
        tinggi: parseFloat(tinggiStr).toFixed(2),
      };
      try {
        if (mode === 'door') {
          const created = await createDoor(data);
          addDoor(created);
        } else {
          const created = await createWindow(data);
          addWindow(created);
        }
      } catch (err) {
        console.error('Gagal menambah:', err);
      }
    }
  };

  // ============ DRAG ENDPOINT ============
  const handleEndpointDragMove = (
    wall: any,
    which: 'start' | 'end',
    e: Konva.KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const rawX = pixelToMeter(node.x(), OFFSET_X);
    const rawY = pixelToMeter(node.y(), OFFSET_Y);
    const otherWalls = allWalls.filter((w) => w.id !== wall.id);
    const snapped = snapToEndpoint(rawX, rawY, otherWalls);
    const newWall = { ...wall };
    if (which === 'start') {
      newWall.start_x = snapped.x;
      newWall.start_y = snapped.y;
    } else {
      newWall.end_x = snapped.x;
      newWall.end_y = snapped.y;
    }
    updateWallLocal(newWall);
  };

  const handleEndpointDragEnd = async (
    wall: any,
    which: 'start' | 'end',
    e: Konva.KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const rawX = pixelToMeter(node.x(), OFFSET_X);
    const rawY = pixelToMeter(node.y(), OFFSET_Y);
    const otherWalls = allWalls.filter((w) => w.id !== wall.id);
    const snapped = snapToEndpoint(rawX, rawY, otherWalls);
    const newWall = { ...wall };
    if (which === 'start') {
      newWall.start_x = snapped.x;
      newWall.start_y = snapped.y;
    } else {
      newWall.end_x = snapped.x;
      newWall.end_y = snapped.y;
    }
    updateWallLocal(newWall);
    setDraggingEndpoint(null);
    try {
      await updateWall(wall.id, {
        start_x: newWall.start_x,
        start_y: newWall.start_y,
        end_x: newWall.end_x,
        end_y: newWall.end_y,
      });
    } catch (err) {
      console.error('Gagal menyimpan ujung dinding:', err);
    }
  };
  // ======================================

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(true);
        if (e.target === document.body) e.preventDefault();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        handleDelete();
      }
      if (e.key === 'Escape') {
        setDrawStart(null);
        setDrawEnd(null);
        setSnapIndicator(null);
        setMode('select');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedElement]);

  if (!currentBuilding) return <div>Loading...</div>;

  const cursorStyle = isPanning
    ? 'grabbing'
    : spacePressed
    ? 'grab'
    : mode === 'draw' || mode === 'room'
    ? 'crosshair'
    : mode === 'door' || mode === 'window'
    ? 'pointer'
    : 'default';

  // ===== Grid dinamis =====
  const worldLeft = -stagePos.x / stageScale;
  const worldTop = -stagePos.y / stageScale;
  const worldRight = (canvasSize.width - stagePos.x) / stageScale;
  const worldBottom = (canvasSize.height - stagePos.y) / stageScale;

  const thinStep = 50;
  const thinGridLines: JSX.Element[] = [];
  const thinStartX = Math.floor(worldLeft / thinStep) * thinStep;
  const thinEndX = Math.ceil(worldRight / thinStep) * thinStep;
  const thinStartY = Math.floor(worldTop / thinStep) * thinStep;
  const thinEndY = Math.ceil(worldBottom / thinStep) * thinStep;

  for (let x = thinStartX; x <= thinEndX; x += thinStep) {
    thinGridLines.push(
      <Line
        key={`gv-thin-${x}`}
        points={[x, worldTop, x, worldBottom]}
        stroke="#ececec"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    );
  }
  for (let y = thinStartY; y <= thinEndY; y += thinStep) {
    thinGridLines.push(
      <Line
        key={`gh-thin-${y}`}
        points={[worldLeft, y, worldRight, y]}
        stroke="#ececec"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    );
  }

  const thickStep = 200;
  const thickGridLines: JSX.Element[] = [];
  const thickStartX = Math.floor(worldLeft / thickStep) * thickStep;
  const thickEndX = Math.ceil(worldRight / thickStep) * thickStep;
  const thickStartY = Math.floor(worldTop / thickStep) * thickStep;
  const thickEndY = Math.ceil(worldBottom / thickStep) * thickStep;

  for (let x = thickStartX; x <= thickEndX; x += thickStep) {
    thickGridLines.push(
      <Line
        key={`gv-thick-${x}`}
        points={[x, worldTop, x, worldBottom]}
        stroke="#d0d0d0"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    );
  }
  for (let y = thickStartY; y <= thickEndY; y += thickStep) {
    thickGridLines.push(
      <Line
        key={`gh-thick-${y}`}
        points={[worldLeft, y, worldRight, y]}
        stroke="#d0d0d0"
        strokeWidth={1}
        strokeScaleEnabled={false}
        listening={false}
      />
    );
  }
  // =====================

  // Ukuran handle endpoint (dalam px dunia)
  const HANDLE_SIZE = 10;
  const HANDLE_HALF = HANDLE_SIZE / 2;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: '8px 10px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid #ddd',
          flexWrap: 'wrap',
          flexShrink: 0,
          minHeight: TOOLBAR_HEIGHT,
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={() => setMode('select')}
          style={{
            padding: '6px 12px',
            background: mode === 'select' ? '#3498db' : '#eee',
            color: mode === 'select' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          🖱️ Select
        </button>
        <button
          onClick={() => setMode('draw')}
          style={{
            padding: '6px 12px',
            background: mode === 'draw' ? '#27ae60' : '#eee',
            color: mode === 'draw' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          ✏️ Dinding
        </button>
        <button
          onClick={() => setMode('room')}
          style={{
            padding: '6px 12px',
            background: mode === 'room' ? '#9b59b6' : '#eee',
            color: mode === 'room' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          🏠 Ruangan
        </button>
        <button
          onClick={() => setMode('door')}
          style={{
            padding: '6px 12px',
            background: mode === 'door' ? '#e67e22' : '#eee',
            color: mode === 'door' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          🚪 Pintu
        </button>
        <button
          onClick={() => setMode('window')}
          style={{
            padding: '6px 12px',
            background: mode === 'window' ? '#3498db' : '#eee',
            color: mode === 'window' ? '#fff' : '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          🪟 Jendela
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedElement}
          style={{ padding: '6px 12px' }}
        >
          🗑️ Hapus
        </button>
        <button
          onClick={() => {
            setStageScale(1);
            setStagePos({ x: 0, y: 0 });
          }}
          style={{ padding: '6px 12px' }}
        >
          🔍 Reset View
        </button>
        <span style={{ fontSize: 12, color: '#888' }}>
          Zoom: {Math.round(stageScale * 100)}%
        </span>

        {mode === 'draw' && (
          <span style={{ fontSize: 13, color: '#555' }}>
            Klik & drag untuk menggambar dinding.
          </span>
        )}
        {mode === 'room' && (
          <span style={{ fontSize: 13, color: '#555' }}>
            Klik & drag untuk membuat ruangan.
          </span>
        )}
        {mode === 'door' && (
          <span style={{ fontSize: 13, color: '#555' }}>
            Klik pada dinding untuk menempatkan pintu.
          </span>
        )}
        {mode === 'window' && (
          <span style={{ fontSize: 13, color: '#555' }}>
            Klik pada dinding untuk menempatkan jendela.
          </span>
        )}
        {mode === 'select' && (
          <span style={{ fontSize: 13, color: '#555' }}>
            Drag kotak ujung dinding untuk mengubah panjang.
          </span>
        )}
        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>
          Scroll = zoom | Space/klik-tengah + drag = pan
        </span>
      </div>

      {/* Kanvas */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: '#fafafa',
        }}
      >
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          ref={stageRef}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={false}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          style={{ cursor: cursorStyle, display: 'block' }}
        >
          <Layer>
            {thinGridLines}
            {thickGridLines}

            {/* Ruangan */}
            {allRooms.map((room) => {
              const x = meterToPixel(room.x, OFFSET_X);
              const y = meterToPixel(room.y, OFFSET_Y);
              const w = room.panjang * SCALE;
              const h = room.lebar * SCALE;
              return (
                <Group key={`room-${room.id}`} listening={false}>
                  <Rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="rgba(155, 89, 182, 0.15)"
                    stroke="#9b59b6"
                    strokeWidth={1}
                    dash={[6, 4]}
                  />
                  <Text
                    x={x}
                    y={y + h / 2 - 8}
                    width={w}
                    text={room.nama}
                    fontSize={14}
                    fill="#6c3483"
                    align="center"
                  />
                  <Text
                    x={x}
                    y={y + h / 2 + 10}
                    width={w}
                    text={`${room.panjang} × ${room.lebar} m`}
                    fontSize={11}
                    fill="#8e44ad"
                    align="center"
                  />
                </Group>
              );
            })}

            {/* Dinding */}
            {allWalls.map((wall) => {
              const isSelected =
                selectedElement?.type === 'wall' && selectedElement.id === wall.id;
              const x1 = meterToPixel(wall.start_x, OFFSET_X);
              const y1 = meterToPixel(wall.start_y, OFFSET_Y);
              const x2 = meterToPixel(wall.end_x, OFFSET_X);
              const y2 = meterToPixel(wall.end_y, OFFSET_Y);
              return (
                <React.Fragment key={wall.id}>
                  <Line
                    points={[x1, y1, x2, y2]}
                    stroke={isSelected ? '#000' : '#2c3e50'}
                    strokeWidth={isSelected ? 12 : 8}
                    lineCap="butt"
                    lineJoin="miter"
                    draggable={mode === 'select' && !spacePressed}
                    onDragStart={() => {
                      setSelectedWallId(wall.id);
                      dragStartRef.current = {
                        wallStartX: wall.start_x,
                        wallStartY: wall.start_y,
                        wallEndX: wall.end_x,
                        wallEndY: wall.end_y,
                      };
                    }}
                    onDragMove={(e) => {
                      if (!dragStartRef.current) return;
                      const dx = e.target.x() / SCALE;
                      const dy = e.target.y() / SCALE;
                      updateWallLocal({
                        ...wall,
                        start_x: snapGrid(dragStartRef.current.wallStartX + dx),
                        start_y: snapGrid(dragStartRef.current.wallStartY + dy),
                        end_x: snapGrid(dragStartRef.current.wallEndX + dx),
                        end_y: snapGrid(dragStartRef.current.wallEndY + dy),
                      });
                    }}
                    onDragEnd={async (e) => {
                      if (!dragStartRef.current) return;
                      const dx = e.target.x() / SCALE;
                      const dy = e.target.y() / SCALE;
                      const newWall = {
                        ...wall,
                        start_x: snapGrid(dragStartRef.current.wallStartX + dx),
                        start_y: snapGrid(dragStartRef.current.wallStartY + dy),
                        end_x: snapGrid(dragStartRef.current.wallEndX + dx),
                        end_y: snapGrid(dragStartRef.current.wallEndY + dy),
                      };
                      e.target.position({ x: 0, y: 0 });
                      updateWallLocal(newWall);
                      dragStartRef.current = null;
                      try {
                        await updateWall(wall.id, {
                          start_x: newWall.start_x,
                          start_y: newWall.start_y,
                          end_x: newWall.end_x,
                          end_y: newWall.end_y,
                        });
                      } catch (err) {
                        console.error('Gagal menyimpan posisi dinding:', err);
                      }
                    }}
                    onClick={(e) => handleWallClick(wall, e)}
                  />

                  {/* Label panjang dinding di tengah */}
                  {(() => {
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    const lengthM = wallLengthMeters(wall);
                    const labelText = `${lengthM.toFixed(2)}m`;

                    // Hitung sudut dinding untuk rotasi label
                    const angle =
                      (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
                    let displayAngle = angle;
                    if (displayAngle > 90) displayAngle -= 180;
                    if (displayAngle < -90) displayAngle += 180;

                    const labelWidth = 60;
                    const labelHeight = 20;
                    return (
                      <Group
                        x={midX}
                        y={midY}
                        rotation={displayAngle}
                        listening={false}
                      >
                        <Rect
                          x={-labelWidth / 2}
                          y={-labelHeight / 2}
                          width={labelWidth}
                          height={labelHeight}
                          fill="rgba(255,255,255,0.85)"
                          stroke="#ddd"
                          strokeWidth={0.5}
                          cornerRadius={3}
                          strokeScaleEnabled={false}
                        />
                        <Text
                          x={-labelWidth / 2}
                          y={-7}
                          width={labelWidth}
                          text={labelText}
                          fontSize={12}
                          fill="#000"
                          align="center"
                          fontStyle="bold"
                        />
                      </Group>
                    );
                  })()}
                </React.Fragment>
              );
            })}

            {/* Endpoint handles untuk SEMUA dinding */}
            {allWalls.map((wall) => {
              const isSelected =
                selectedElement?.type === 'wall' && selectedElement.id === wall.id;
              const startX = meterToPixel(wall.start_x, OFFSET_X);
              const startY = meterToPixel(wall.start_y, OFFSET_Y);
              const endX = meterToPixel(wall.end_x, OFFSET_X);
              const endY = meterToPixel(wall.end_y, OFFSET_Y);

              // Warna handle: hitam kalau terpilih, abu gelap kalau tidak
              const handleColor = isSelected ? '#e74c3c' : '#444';

              return (
                <React.Fragment key={`handles-${wall.id}`}>
                  <Rect
                    x={startX - HANDLE_HALF}
                    y={startY - HANDLE_HALF}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={handleColor}
                    stroke="#fff"
                    strokeWidth={1}
                    draggable={!spacePressed && mode === 'select'}
                    onDragStart={() => {
                      setSelectedWallId(wall.id);
                      setDraggingEndpoint({ wallId: wall.id, which: 'start' });
                    }}
                    onDragMove={(e) => handleEndpointDragMove(wall, 'start', e)}
                    onDragEnd={(e) => handleEndpointDragEnd(wall, 'start', e)}
                  />
                  <Rect
                    x={endX - HANDLE_HALF}
                    y={endY - HANDLE_HALF}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill={handleColor}
                    stroke="#fff"
                    strokeWidth={1}
                    draggable={!spacePressed && mode === 'select'}
                    onDragStart={() => {
                      setSelectedWallId(wall.id);
                      setDraggingEndpoint({ wallId: wall.id, which: 'end' });
                    }}
                    onDragMove={(e) => handleEndpointDragMove(wall, 'end', e)}
                    onDragEnd={(e) => handleEndpointDragEnd(wall, 'end', e)}
                  />
                </React.Fragment>
              );
            })}

            {/* Pintu */}
            {doors.map((door) => {
              const wall = allWalls.find((w) => w.id === door.wall);
              if (!wall) return null;
              const dx = wall.end_x - wall.start_x;
              const dy = wall.end_y - wall.start_y;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              const ux = dx / len;
              const uy = dy / len;
              const lebar = parseFloat(door.lebar);
              const x1 = wall.start_x + ux * door.offset;
              const y1 = wall.start_y + uy * door.offset;
              const x2 = wall.start_x + ux * (door.offset + lebar);
              const y2 = wall.start_y + uy * (door.offset + lebar);
              const isSelected =
                selectedElement?.type === 'door' && selectedElement.id === door.id;
              return (
                <Line
                  key={`door-${door.id}`}
                  points={[
                    meterToPixel(x1, OFFSET_X),
                    meterToPixel(y1, OFFSET_Y),
                    meterToPixel(x2, OFFSET_X),
                    meterToPixel(y2, OFFSET_Y),
                  ]}
                  stroke={isSelected ? '#c0392b' : '#e67e22'}
                  strokeWidth={isSelected ? 14 : 10}
                  lineCap="butt"
                  hitStrokeWidth={20}
                  onClick={() => {
                    if (mode === 'select' && !spacePressed) {
                      setSelectedElement({ type: 'door', id: door.id });
                    }
                  }}
                />
              );
            })}

            {/* Jendela */}
            {windows.map((win) => {
              const wall = allWalls.find((w) => w.id === win.wall);
              if (!wall) return null;
              const dx = wall.end_x - wall.start_x;
              const dy = wall.end_y - wall.start_y;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              const ux = dx / len;
              const uy = dy / len;
              const lebar = parseFloat(win.lebar);
              const x1 = wall.start_x + ux * win.offset;
              const y1 = wall.start_y + uy * win.offset;
              const x2 = wall.start_x + ux * (win.offset + lebar);
              const y2 = wall.start_y + uy * (win.offset + lebar);
              const isSelected =
                selectedElement?.type === 'window' && selectedElement.id === win.id;
              return (
                <Line
                  key={`win-${win.id}`}
                  points={[
                    meterToPixel(x1, OFFSET_X),
                    meterToPixel(y1, OFFSET_Y),
                    meterToPixel(x2, OFFSET_X),
                    meterToPixel(y2, OFFSET_Y),
                  ]}
                  stroke={isSelected ? '#1f618d' : '#3498db'}
                  strokeWidth={isSelected ? 14 : 10}
                  lineCap="butt"
                  hitStrokeWidth={20}
                  onClick={() => {
                    if (mode === 'select' && !spacePressed) {
                      setSelectedElement({ type: 'window', id: win.id });
                    }
                  }}
                />
              );
            })}

            {/* Preview */}
            {drawStart && drawEnd && (
              <>
                {mode === 'draw' ? (
                  <Line
                    points={[
                      meterToPixel(drawStart.x, OFFSET_X),
                      meterToPixel(drawStart.y, OFFSET_Y),
                      meterToPixel(drawEnd.x, OFFSET_X),
                      meterToPixel(drawEnd.y, OFFSET_Y),
                    ]}
                    stroke="#27ae60"
                    strokeWidth={6}
                    dash={[10, 6]}
                    listening={false}
                  />
                ) : (
                  <Rect
                    x={meterToPixel(Math.min(drawStart.x, drawEnd.x), OFFSET_X)}
                    y={meterToPixel(Math.min(drawStart.y, drawEnd.y), OFFSET_Y)}
                    width={Math.abs(drawEnd.x - drawStart.x) * SCALE}
                    height={Math.abs(drawEnd.y - drawStart.y) * SCALE}
                    fill="rgba(155, 89, 182, 0.2)"
                    stroke="#9b59b6"
                    strokeWidth={2}
                    dash={[6, 4]}
                    listening={false}
                  />
                )}
                <Circle
                  x={meterToPixel(drawStart.x, OFFSET_X)}
                  y={meterToPixel(drawStart.y, OFFSET_Y)}
                  radius={5}
                  fill="#27ae60"
                  listening={false}
                />
                <Circle
                  x={meterToPixel(drawEnd.x, OFFSET_X)}
                  y={meterToPixel(drawEnd.y, OFFSET_Y)}
                  radius={5}
                  fill="#27ae60"
                  listening={false}
                />
              </>
            )}

            {/* Snap indicator */}
            {snapIndicator && (
              <Circle
                x={meterToPixel(snapIndicator.x, OFFSET_X)}
                y={meterToPixel(snapIndicator.y, OFFSET_Y)}
                radius={12}
                stroke="#f39c12"
                strokeWidth={3}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default FloorPlanCanvas;