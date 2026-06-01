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
        status=""
        onSave={onSave}
        onExtractUpdates={vi.fn()}
        isExtractingUpdates={false}
      />
    );

    await user.selectOptions(screen.getByLabelText(/World Location/i), "loc_archive");
    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          locationId: "loc_archive",
          name: "Hidden Archive",
          description: "Dusty shelves and lantern light.",
          visibleExits: "Stone stair",
          hazards: "Falling dust",
        }),
      })
    );
  });

  it("can toggle advanced facts and edit discoveries", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CurrentContextPanel
        context={{
          scene: {},
          location: { locationId: "loc_square", name: "Market Square", description: "Crowded and bright.", visibleExits: "North Gate", availableLocations: "", hazards: "Pickpockets" },
          objects: [],
          recentFacts: { importantDiscoveries: "Initial fact" },
        }}
        activeWorld={activeWorld as any}
        status=""
        onSave={onSave}
        onExtractUpdates={vi.fn()}
        isExtractingUpdates={false}
      />
    );

    const advancedFacts = screen.getByText(/Advanced Scene Facts/i);
    expect(advancedFacts).toBeInTheDocument();
    
    await user.type(screen.getByLabelText(/Discoveries & Facts/i), " and new info");
    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        recentFacts: expect.objectContaining({
          importantDiscoveries: "Initial fact and new info",
        }),
      })
    );
  });
});
