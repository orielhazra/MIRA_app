import { describe, expect, it } from "vitest";
import { defaultCharacters, defaultStories, defaultWorlds } from "../src/constants/defaultData";
import { normalizeCharacter, normalizeStoredLorebook, normalizeWorld, normalizeWorldLocations } from "../src/services/normalizers";

describe("default data integrity", () => {
  it("every default world declares template metadata", () => {
    for (const world of defaultWorlds as any[]) {
      expect(String(world.templateKey || "").trim(), `${world.name} should declare templateKey`).not.toBe("");
      expect(Number(world.templateVersion), `${world.name} should declare templateVersion`).toBeGreaterThanOrEqual(1);
    }
  });

  it("every default story references an existing default world and cast", () => {
    const worldById = new Map(defaultWorlds.map((world: any) => [world.id, world]));
    const characterIds = new Set(defaultCharacters.map((character: any) => character.id));

    for (const story of defaultStories as any[]) {
      const world = worldById.get(story.templateWorldId);
      expect(Boolean(world), `${story.title} has missing world ${story.templateWorldId}`).toBe(true);
      expect(Array.isArray(story.characterIds), `${story.title} should have characterIds`).toBe(true);
      expect(story.characterIds.length, `${story.title} should have a non-empty cast`).toBeGreaterThan(0);
      expect(story.templateWorldKey, `${story.title} should declare templateWorldKey`).toBe(world?.templateKey);
      expect(story.templateWorldVersion, `${story.title} should declare templateWorldVersion`).toBe(world?.templateVersion);
      expect(story.worldOverlay, `${story.title} should declare worldOverlay`).toBeTruthy();
      expect(story.worldOverlay).toMatchObject({
        worldPatch: {},
        modifiedLocations: {},
        addedLocations: [],
        removedLocationIds: [],
        modifiedLoreEntries: {},
        addedLoreEntries: [],
        removedLoreEntryIds: [],
      });

      for (const characterId of story.characterIds) {
        expect(characterIds.has(characterId), `${story.title} has missing character ${characterId}`).toBe(true);
      }
    }
  });

  it("normalization assigns stable ids to default world and character lore", () => {
    const normalizedWorlds = defaultWorlds.map((world: any) => normalizeWorld(world));
    const normalizedCharacters = defaultCharacters.map((character: any) => normalizeCharacter(character, normalizedWorlds));

    for (const world of normalizedWorlds) {
      for (const entry of world.worldLorebook || []) {
        expect(String(entry.id || "").trim(), `${world.name} lore should have a stable id`).not.toBe("");
      }
    }

    for (const character of normalizedCharacters) {
      for (const entry of character.lorebook || []) {
        expect(String(entry.id || "").trim(), `${character.name} lore should have a stable id`).not.toBe("");
      }
    }
  });

  it("generates deterministic ids for locations and lore entries without ids", () => {
    const locations = [
      { name: "Market Square", description: "Crowded plaza" },
      { name: "Market Square", description: "Duplicate name" },
      { title: "Old Dock", description: "Foggy pier" },
    ];
    const lore = [
      { name: "Ancient Bell", keywords: ["bell"], content: "It tolls at dusk." },
      { name: "Ancient Bell", keywords: ["bell"], content: "A second note." },
      { keywords: ["harbor"], content: "Ships avoid the harbor at dawn." },
    ];

    const firstLocations = normalizeWorldLocations(locations);
    const secondLocations = normalizeWorldLocations(locations);
    const firstLore = normalizeStoredLorebook(lore);
    const secondLore = normalizeStoredLorebook(lore);

    expect(firstLocations.map((entry) => entry.id)).toEqual(secondLocations.map((entry) => entry.id));
    expect(firstLore.map((entry) => entry.id)).toEqual(secondLore.map((entry) => entry.id));
    expect(new Set(firstLocations.map((entry) => entry.id)).size).toBe(firstLocations.length);
    expect(new Set(firstLore.map((entry) => entry.id)).size).toBe(firstLore.length);
  });
});
