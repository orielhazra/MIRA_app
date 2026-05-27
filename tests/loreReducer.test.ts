import { describe, expect, it } from "vitest";
import { loreInitialState, loreReducer } from "../src/reducers/loreReducer";

describe("loreReducer", () => {
  it("toggles pending update ids using an array contract", () => {
    const selected = loreReducer(loreInitialState, {
      type: "TOGGLE_PENDING_UPDATE",
      payload: "update-1",
    });

    expect(selected.selectedPendingUpdateIds).toEqual(["update-1"]);

    const deselected = loreReducer(selected, {
      type: "TOGGLE_PENDING_UPDATE",
      payload: "update-1",
    });

    expect(deselected.selectedPendingUpdateIds).toEqual([]);
  });

  it("resets pending updates state", () => {
    const populated = {
      ...loreInitialState,
      pendingUpdates: [{ id: "u1", category: "scene", title: "Update", to: "New" }],
      selectedPendingUpdateIds: ["u1"],
      pendingUpdateStatus: "ready",
    };

    const next = loreReducer(populated, { type: "RESET_PENDING_UPDATES" });

    expect(next.pendingUpdates).toEqual([]);
    expect(next.selectedPendingUpdateIds).toEqual([]);
    expect(next.pendingUpdateStatus).toBe("");
  });
});
