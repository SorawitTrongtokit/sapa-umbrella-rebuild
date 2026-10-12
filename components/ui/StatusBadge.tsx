import { statusLabel } from "@/lib/umbrella";
import type { UmbrellaStatus } from "@/lib/types";

const badgeTone: Record<UmbrellaStatus, string> = {
  available: "badge-ok",
  borrowed: "badge-warn",
  disabled: ""
};

export function StatusBadge({ status }: { status: UmbrellaStatus }) {
  return <span className={`badge ${badgeTone[status]}`}>{statusLabel[status]}</span>;
}
