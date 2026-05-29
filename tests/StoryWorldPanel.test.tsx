import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StoryWorldPanel from "../src/app/layout/panels/StoryWorldPanel";
import { createAppFixtures } from "./testFixtures";

describe("StoryWorldPanel", () => {
  it("saves story-world details and triggers add/reset actions", async () => {
    const user = userEvent.setup();
    const { worlds, characters, stories } = createAppFixtures();
    const activeWorld = {
      ...worlds[0],
      locations: [{ id: "loc_square", name: "Market Square", summary: "Plaza", description: "Crowded and bright." }],
      worldLorebook: [{ id: "lore_bells", name: "Bell Towers", keywords: ["bells"], content: "Bells ring at dusk.", enabled: true, alwaysOn: false }],
    } as any;

    const onSaveStoryWorldPatch = vi.fn();
    const onAddStoryWorldLocation = vi.fn();
    const onAddStoryWorldLoreEntry = vi.fn();
    const onResetStoryWorldOverlay = vi.fn();

    render(
      <StoryWorldPanel
        activeStory={stories[0] as any}
        activeWorld={activeWorld}
        storyCharacters={[characters[0]] as any}
        characters={characters}
        onExportStory={vi.fn()}
        onDeleteStory={vi.fn()}
        onSaveCharacterIdentity={vi.fn()}
        onExportCharacterTemplate={vi.fn()}
        onImportCharacterTemplate={vi.fn()}
        onSaveStoryWorldPatch={onSaveStoryWorldPatch}
        onAddStoryWorldLocation={onAddStoryWorldLocation}
        onUpdateStoryWorldLocation={vi.fn()}
        onRemoveStoryWorldLocation={vi.fn()}
        onAddStoryWorldLoreEntry={onAddStoryWorldLoreEntry}
        onUpdateStoryWorldLoreEntry={vi.fn()}
        onRemoveStoryWorldLoreEntry={vi.fn()}
        onResetStoryWorldOverlay={onResetStoryWorldOverlay}
      />
    );

    await user.clear(screen.getByLabelText(/Story World Name/i));
    await user.type(screen.getByLabelText(/Story World Name/i), "Ashen Station");
    await user.click(screen.getByRole("button", { name: /Save Story World Details/i }));

    expect(onSaveStoryWorldPatch).toHaveBeenCalledWith(expect.objectContaining({
      name: "Ashen Station",
    }));

    await user.click(screen.getByRole("button", { name: /Add Story Location/i }));
    expect(onAddStoryWorldLocation).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Add Story World Lore/i }));
    expect(onAddStoryWorldLoreEntry).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Reset Story World Overlay/i }));
    expect(onResetStoryWorldOverlay).toHaveBeenCalled();
  });

  it("saves and removes story-world locations and lore entries", async () => {
    const user = userEvent.setup();
    const { worlds, characters, stories } = createAppFixtures();
    const activeStory = {
      ...stories[0],
      worldOverlay: {
        ...stories[0].worldOverlay,
        addedLocations: [{ id: "loc_tunnel", name: "Hidden Tunnel", summary: "Tunnel", description: "Narrow and damp." }],
        addedLoreEntries: [{ id: "lore_secret", name: "Secret Routes", keywords: ["route"], content: "Only smugglers know them.", enabled: true, alwaysOn: false }],
      },
    } as any;
    const activeWorld = {
      ...worlds[0],
      locations: [{ id: "loc_tunnel", name: "Hidden Tunnel", summary: "Tunnel", description: "Narrow and damp." }],
      worldLorebook: [{ id: "lore_secret", name: "Secret Routes", keywords: ["route"], content: "Only smugglers know them.", enabled: true, alwaysOn: false }],
    } as any;

    const onUpdateStoryWorldLocation = vi.fn();
    const onRemoveStoryWorldLocation = vi.fn();
    const onUpdateStoryWorldLoreEntry = vi.fn();
    const onRemoveStoryWorldLoreEntry = vi.fn();

    render(
      <StoryWorldPanel
        activeStory={activeStory}
        activeWorld={activeWorld}
        storyCharacters={[characters[0]] as any}
        characters={characters}
        onExportStory={vi.fn()}
        onDeleteStory={vi.fn()}
        onSaveCharacterIdentity={vi.fn()}
        onExportCharacterTemplate={vi.fn()}
        onImportCharacterTemplate={vi.fn()}
        onSaveStoryWorldPatch={vi.fn()}
        onAddStoryWorldLocation={vi.fn()}
        onUpdateStoryWorldLocation={onUpdateStoryWorldLocation}
        onRemoveStoryWorldLocation={onRemoveStoryWorldLocation}
        onAddStoryWorldLoreEntry={vi.fn()}
        onUpdateStoryWorldLoreEntry={onUpdateStoryWorldLoreEntry}
        onRemoveStoryWorldLoreEntry={onRemoveStoryWorldLoreEntry}
        onResetStoryWorldOverlay={vi.fn()}
      />
    );

    const locationCard = screen.getByText(/Hidden Tunnel/i).closest("details")!;
    locationCard.open = true;
    await user.clear(within(locationCard).getByLabelText(/Location Name/i));
    await user.type(within(locationCard).getByLabelText(/Location Name/i), "Flooded Tunnel");
    await user.click(within(locationCard).getByRole("button", { name: /Save Location/i }));
    expect(onUpdateStoryWorldLocation).toHaveBeenCalledWith("loc_tunnel", expect.objectContaining({ name: "Flooded Tunnel" }));

    await user.click(within(locationCard).getByRole("button", { name: /Remove Location/i }));
    expect(onRemoveStoryWorldLocation).toHaveBeenCalledWith("loc_tunnel");

    const loreCard = screen.getByText(/Secret Routes/i).closest("details")!;
    loreCard.open = true;
    await user.clear(within(loreCard).getByLabelText(/Lore Name/i));
    await user.type(within(loreCard).getByLabelText(/Lore Name/i), "Whisper Routes");
    await user.click(within(loreCard).getByRole("button", { name: /Save Lore Entry/i }));
    expect(onUpdateStoryWorldLoreEntry).toHaveBeenCalledWith("lore_secret", expect.objectContaining({ name: "Whisper Routes" }));

    await user.click(within(loreCard).getByRole("button", { name: /Remove Lore Entry/i }));
    expect(onRemoveStoryWorldLoreEntry).toHaveBeenCalledWith("lore_secret");
  });
});
