export type RegionOption = {
  id: number;
  nama: string;
  provinsi: string;
};

export const REGIONS: RegionOption[] = [
  { id: 1, nama: "Jakarta", provinsi: "DKI Jakarta" },
  { id: 2, nama: "Bandung", provinsi: "Jawa Barat" },
  { id: 3, nama: "Surabaya", provinsi: "Jawa Timur" },
];
