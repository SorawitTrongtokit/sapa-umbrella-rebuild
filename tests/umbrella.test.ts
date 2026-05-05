import test from "node:test";
import assert from "node:assert/strict";
import { findActiveUmbrella, groupUmbrellas, isBorrowedByUser, statusLabel, statusTone } from "../lib/umbrella";
import type { Location, Umbrella } from "../lib/types";

function makeUmbrella(id: number, locationId: string, status: Umbrella["status"] = "available"): Umbrella {
  return {
    id,
    location_id: locationId,
    label: `Umbrella ${id}`,
    status,
    borrowed_by: null,
    borrowed_transaction_id: null,
    disabled_reason: null,
    version: 0,
    updated_at: new Date(0).toISOString()
  };
}

test("groups umbrellas by fixed location order", () => {
  const locations: Location[] = [
    { id: "sports_center", name_th: "sports", sort_order: 2 },
    { id: "dome", name_th: "dome", sort_order: 1 }
  ];
  const umbrellas = [makeUmbrella(8, "sports_center"), makeUmbrella(1, "dome"), makeUmbrella(2, "dome", "borrowed")];

  const groups = groupUmbrellas(umbrellas, locations);

  assert.equal(groups[0].location.id, "dome");
  assert.deepEqual(
    groups[0].umbrellas.map((umbrella) => umbrella.id),
    [1, 2]
  );
  assert.equal(groups[1].location.id, "sports_center");
});

test("ignores umbrellas for unknown locations", () => {
  const groups = groupUmbrellas([makeUmbrella(99, "unknown")], [{ id: "dome", name_th: "dome", sort_order: 1 }]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].umbrellas, []);
});

test("defines Thai labels and stable tones for all umbrella states", () => {
  assert.deepEqual(Object.keys(statusLabel).sort(), ["available", "borrowed", "disabled"]);
  assert.deepEqual(statusTone, {
    available: "success",
    borrowed: "warning",
    disabled: "danger"
  });
});

test("only treats currently borrowed umbrellas as active for a user", () => {
  const userId = "user-1";
  const borrowed = {
    ...makeUmbrella(1, "dome", "borrowed"),
    borrowed_by: userId,
    borrowed_transaction_id: "tx-1"
  };
  const returned = makeUmbrella(2, "dome", "available");
  const staleBorrowIds = new Set([2]);

  assert.equal(isBorrowedByUser(borrowed, userId, staleBorrowIds), true);
  assert.equal(isBorrowedByUser(returned, userId, staleBorrowIds), false);
  assert.equal(findActiveUmbrella([returned], userId, staleBorrowIds), null);
});
