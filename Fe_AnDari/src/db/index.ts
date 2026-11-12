// src/db/index.ts
import * as SQLite from "expo-sqlite";

// Membuka atau membuat database lokal
export const db = SQLite.openDatabaseSync("andari_projects.db");

// 1. Fungsi Inisialisasi Tabel (Dipanggil sekali saat aplikasi pertama dibuka)
export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_proyek TEXT NOT NULL,
      dimensi TEXT,
      tipe TEXT,
      data_desain TEXT,
      tanggal_dibuat TEXT
    );
  `);
};

// 2. Fungsi Simpan Proyek Baru
export const simpanProyekBaru = (
  nama: string,
  dimensi: string,
  tipe: string,
  dataDesain: any, // Objek desain dari canvas/Skia
): number => {
  // ✅ Tambahkan tipe return number
  const tanggal = new Date().toISOString();
  const jsonDesain = JSON.stringify(dataDesain);

  // ✅ Simpan hasil eksekusi ke dalam variabel 'result'
  const result = db.runSync(
    "INSERT INTO projects (nama_proyek, dimensi, tipe, data_desain, tanggal_dibuat) VALUES (?, ?, ?, ?, ?)",
    [nama, dimensi, tipe, jsonDesain, tanggal],
  );

  // ✅ KEMBALIKAN ID DARI BARIS YANG BARU SAJA DIBUAT
  return result.lastInsertRowId;
};

// 3. Fungsi Ambil Semua Proyek (Untuk halaman "Proyek Saya")
export const ambilSemuaProyek = () => {
  return db.getAllSync("SELECT * FROM projects ORDER BY tanggal_dibuat DESC");
};

// 4. Fungsi Ambil Detail Proyek (Untuk membuka kembali proyek)
export const ambilDetailProyek = (id: number) => {
  const result: any = db.getFirstSync("SELECT * FROM projects WHERE id = ?", [
    id,
  ]);
  if (result && result.data_desain) {
    result.data_desain = JSON.parse(result.data_desain);
  }
  return result;
};

// 5. Fungsi Hapus Proyek
export const hapusProyek = (id: number) => {
  db.runSync("DELETE FROM projects WHERE id = ?", [id]);
};

// 6. Fungsi Update Proyek (Jika user mengedit proyek lama)
export const updateProyek = (id: number, dataDesain: any, dimensi: string) => {
  const tanggal = new Date().toISOString();
  db.runSync(
    "UPDATE projects SET data_desain = ?, dimensi = ?, tanggal_dibuat = ? WHERE id = ?",
    [JSON.stringify(dataDesain), dimensi, tanggal, id],
  );
};