import test from "node:test";
import assert from "node:assert/strict";
import { groupUmbrellas } from "../lib/umbrella";
import type { Location, Umbrella } from "../lib/types";

test("groups umbrellas by fixed location order", () => {
  const locations: Location[] = [
    { id: "sports_center", name_th: "ศูนย์กีฬา", sort_order: 2 },
    { id: "dome", name_th: "ใต้โดม", sort_order: 1 }
  ];
  const umbrellas = [
    { id: 8, location_id: "sports_center", label: "ร่ม 8", status: "available" },
    { id: 1, location_id: "dome", label: "ร่ม 1", status: "available" },
    { id: 2, location_id: "dome", label: "ร่ม 2", status: "borrowed" }
  ].map(
    (umbrella) =>
      ({
        ...umbrella,
        borrowed_by: null,
        borrowed_transaction_id: null,
        disabled_reason: null,
        version: 0,
        updated_at: new Date().toISOString()
      }) as Umbrella
  );

  const groups = groupUmbrellas(umbrellas, locations);

  assert.equal(groups[0].location.id, "dome");
  assert.deepEqual(
    groups[0].umbrellas.map((umbrella) => umbrella.id),
    [1, 2]
  );
  assert.equal(groups[1].location.id, "sports_center");
});
