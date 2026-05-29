import { describe, expect, it } from "vitest";
import {
  applyWorldOverlay,
  createEmptyWorldOverlay,
  getLatestTemplateByKey,
  getTemplateWorldById,
  resolveEffectiveWorld,
} from "../src/services/storyWorld";
import { normalizeStory, normalizeWorld } from "../src/services/normalizers";

function createWorldFixtures() {
  const worldV1 = normalizeWorld({
    id: "world_aldmyr_v1",
    templateKey: "aldmyr",
    templateVersion: 1,
    name: "Aldmyr",
    rules: "Base rules.",
    locations: [
      { id: "loc_square", name: "Market Square", description: "Crowded and bright." },
      { id: "loc_keep", name: "Old Keep", description: "Cold stone walls." },
    ],
    worldLorebook: [
      { id: "lore_bells", name: "Bell Towers", keywords: ["bells"], content: "Bells ring at dusk.", enabled: true, alwaysOn: false },
      { id: "lore_masks", name: "Masks", keywords: ["masks"], content: "Masks hide noble identities.", enabled: true, alwaysOn: false },
    ],
  });

  const worldV2 = normalizeWorld({
    id: "world_aldmyr_v2",
    templateKey: "aldmyr",
    templateVersion: 2,
    name: "Aldmyr",
    rules: "Updated rules.",
    locations: [
      { id: "loc_square", name: "Market Square", description: "Renovated and brighter." },
      { id: "loc_docks", name: "Canal Docks", description: "Black water and lanterns." },
    ],
  });

  return { worldV1, worldV2 };
}

describe("storyWorld service", () => {
  it("creates an empty normalized overlay", () => {
    expect(createEmptyWorldOverlay()).toEqual({
      worldPatch: {},
      modifiedLocations: {},
      addedLocations: [],
      removedLocationIds: [],
      modifiedLoreEntries: {},
      addedLoreEntries: [],
      removedLoreEntryIds: [],
    });
  });

  it("returns a template by id and selects the latest template by key", () => {
    const { worldV1, worldV2 } = createWorldFixtures();

    expect(getTemplateWorldById("world_aldmyr_v1", [worldV1, worldV2])).toMatchObject({
      id: "world_aldmyr_v1",
      templateKey: "aldmyr",
      templateVersion: 1,
    });

    expect(getLatestTemplateByKey("aldmyr", [worldV1, worldV2])).toMatchObject({
      id: "world_aldmyr_v2",
      templateVersion: 2,
    });
  });

  it("applies world, location, and lore overlay changes to a base template", () => {
    const { worldV1 } = createWorldFixtures();

    const effectiveWorld = applyWorldOverlay(worldV1, {
      worldPatch: {
        name: "Aldmyr After Midnight",
        rules: "Curfew is enforced.",
      },
      modifiedLocations: {
        loc_square: {
          name: "Ashen Market Square",
          hazards: "Lingering embers",
        },
      },
      addedLocations: [
        { id: "loc_tunnel", name: "Smuggler Tunnel", description: "A narrow hidden route." },
      ],
      removedLocationIds: ["loc_keep"],
      modifiedLoreEntries: {
        lore_bells: {
          content: "The bells ring only for the guilty.",
        },
      },
      addedLoreEntries: [
        { id: "lore_tunnel", name: "Tunnel Routes", keywords: ["tunnel"], content: "The tunnels connect the canals to the market.", enabled: true, alwaysOn: false },
      ],
      removedLoreEntryIds: ["lore_masks"],
    });

    expect(effectiveWorld).toMatchObject({
      id: "world_aldmyr_v1",
      templateKey: "aldmyr",
      templateVersion: 1,
      name: "Aldmyr After Midnight",
      rules: "Curfew is enforced.",
    });

    expect(effectiveWorld?.locations?.map((location) => location.id)).toEqual(["loc_square", "loc_tunnel"]);
    expect(effectiveWorld?.locations?.[0]).toMatchObject({
      id: "loc_square",
      name: "Ashen Market Square",
      hazards: "Lingering embers",
    });
    expect(effectiveWorld?.worldLorebook?.map((entry) => entry.id)).toEqual(["lore_bells", "lore_tunnel"]);
    expect(effectiveWorld?.worldLorebook?.[0]).toMatchObject({
      id: "lore_bells",
      content: "The bells ring only for the guilty.",
    });
  });

  it("resolves the effective story world from template reference plus overlay", () => {
    const { worldV1, worldV2 } = createWorldFixtures();
    const story = normalizeStory({
      id: "story-1",
      title: "Overlay Story",
      templateWorldId: "world_aldmyr_v1",
      templateWorldKey: "aldmyr",
      templateWorldVersion: 1,
      worldOverlay: {
        worldPatch: { shortDescription: "A city on the edge of panic." },
        modifiedLocations: { loc_square: { mood: "Tense" } },
        addedLocations: [],
        removedLocationIds: [],
        modifiedLoreEntries: {},
        addedLoreEntries: [],
        removedLoreEntryIds: [],
      },
      characterIds: ["char-1"],
    }, [worldV1, worldV2], []);

    const effectiveWorld = resolveEffectiveWorld(story, [worldV1, worldV2]);

    expect(effectiveWorld).toMatchObject({
      id: "world_aldmyr_v1",
      templateKey: "aldmyr",
      templateVersion: 1,
      shortDescription: "A city on the edge of panic.",
    });
    expect(effectiveWorld?.locations?.find((location) => location.id === "loc_square")).toMatchObject({
      mood: "Tense",
    });
  });
});
