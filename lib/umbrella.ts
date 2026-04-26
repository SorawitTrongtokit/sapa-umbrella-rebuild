import type { Location, Umbrella } from "@/lib/types";

export const statusLabel = {
  available: "พร้อมใช้งาน",
  borrowed: "ถูกยืมแล้ว",
  disabled: "ปิดใช้งาน"
} as const;

export const statusTone = {
  available: "success",
  borrowed: "warning",
  disabled: "danger"
} as const;

export function groupUmbrellas(umbrellas: Umbrella[], locations: Location[]) {
  const locationOrder = new Map(locations.map((location) => [location.id, location]));
  return [...locations]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((location) => ({
      location,
      umbrellas: umbrellas
        .filter((umbrella) => umbrella.location_id === location.id)
        .sort((a, b) => a.id - b.id)
    }))
    .filter((group) => locationOrder.has(group.location.id));
}
