import { describe, expect, it } from "vitest";
import { defaultCharacters, defaultStories, defaultWorlds } from "../src/constants/defaultData";

describe("default data integrity", () => {
  it("every default story references an existing default world and cast", () => {
    const worldIds = new Set(defaultWorlds.map((world: any) => world.id));
    const characterIds = new Set(defaultCharacters.map((character: any) => character.id));

    for (const story of defaultStories as any[]) {
      expect(worldIds.has(story.worldId), `${story.title} has missing world ${story.worldId}`).toBe(true);
      expect(Array.isArray(story.characterIds), `${story.title} should have characterIds`).toBe(true);
      expect(story.characterIds.length, `${story.title} should have a non-empty cast`).toBeGreaterThan(0);

      for (const characterId of story.characterIds) {
        expect(characterIds.has(characterId), `${story.title} has missing character ${characterId}`).toBe(true);
      }
    }
  });
});
