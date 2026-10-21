import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ============= BUILDING =============
export const getBuilding = async (id: number) => {
  const res = await api.get(`/buildings/${id}/`);
  return res.data;
};

// ============= WALL =============
export const createWall = async (wallData: any) => {
  const res = await api.post('/walls/', wallData);
  return res.data;
};

export const updateWall = async (id: number, wallData: any) => {
  const res = await api.patch(`/walls/${id}/`, wallData);
  return res.data;
};

export const deleteWall = async (id: number) => {
  await api.delete(`/walls/${id}/`);
};

// ============= ROOM =============
export const createRoom = async (roomData: any) => {
  const res = await api.post('/rooms/', roomData);
  return res.data;
};

export const deleteRoom = async (id: number) => {
  await api.delete(`/rooms/${id}/`);
};

// ============= DOOR =============
export const createDoor = async (doorData: any) => {
  const res = await api.post('/doors/', doorData);
  return res.data;
};

export const getDoorsByWall = async (wallId: number) => {
  const res = await api.get(`/doors/?wall=${wallId}`);
  return res.data;
};

export const deleteDoor = async (id: number) => {
  await api.delete(`/doors/${id}/`);
};

// ============= WINDOW =============
export const createWindow = async (winData: any) => {
  const res = await api.post('/windows/', winData);
  return res.data;
};

export const getWindowsByWall = async (wallId: number) => {
  const res = await api.get(`/windows/?wall=${wallId}`);
  return res.data;
};

export const deleteWindow = async (id: number) => {
  await api.delete(`/windows/${id}/`);
};