import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CurrentContextPanel from "../src/app/layout/panels/CurrentContextPanel";

const activeWorld = {
  id: "world-1",
  name: "World One",
  locations: [
    {
      id: "loc_square",
      name: "Market Square",
      description: "Crowded and bright.",
      visibleExits: "North Gate",
      hazards: "Pickpockets",
      summary: "Central plaza",
    },
    {
      id: "loc_archive",
      name: "Hidden Archive",
      description: "Dusty shelves and lantern light.",
      visibleExits: "Stone stair",
      hazards: "Falling dust",
      summary: "Secret records room",
    },
  ],
};

describe("CurrentContextPanel", () => {
  it("selecting a story-world location syncs locationId and location fields on save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CurrentContextPanel
        context={{
          scene: {},
          location: { name: "", description: "", visibleExits: "", availableLocations: "", hazards: "" },
          objects: [],
          recentFacts: {},
        }}
        activeWorld={activeWorld as any}
        directorNotes={{}}
        status=""
        onSave={onSave}
        onClearDirectorNotes={vi.fn()}
        onExtractUpdates={vi.fn()}
        isExtractingUpdates={false}
      />
    );

    await user.selectOptions(screen.getByLabelText(/Story World Location/i), "loc_archive");
    await user.click(screen.getByRole("button", { name: /Save Scene Control/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          locationId: "loc_archive",
          name: "Hidden Archive",
          description: "Dusty shelves and lantern light.",
          visibleExits: "Stone stair",
          hazards: "Falling dust",
        }),
      }),
      expect.any(Object)
    );
  });

  it("manual unmatched location names clear the linked locationId", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CurrentContextPanel
        context={{
          scene: {},
          location: { locationId: "loc_square", name: "Market Square", description: "Crowded and bright.", visibleExits: "North Gate", availableLocations: "", hazards: "Pickpockets" },
          objects: [],
          recentFacts: {},
        }}
        activeWorld={activeWorld as any}
        directorNotes={{}}
        status=""
        onSave={onSave}
        onClearDirectorNotes={vi.fn()}
        onExtractUpdates={vi.fn()}
        isExtractingUpdates={false}
      />
    );

    await user.clear(screen.getByLabelText(/Current Location/i));
    await user.type(screen.getByLabelText(/Current Location/i), "Improvised Alley");
    await user.click(screen.getByRole("button", { name: /Save Scene Control/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          locationId: "",
          name: "Improvised Alley",
        }),
      }),
      expect.any(Object)
    );
  });
});
