import { describe, expect, it } from "vitest";
import {
  chooseActiveCastLead,
  createInitialCurrentContext,
  getStoryCharactersFromLists,
  parseSuggestedUpdates,
  syncDirectorNotesFromContext,
} from "../src/utils/appHelpers";
import { createAppFixtures } from "./testFixtures";
import { createEmptyCharacterOverlay } from "../src/constants/defaultData";

describe("appHelpers", () => {
  it("returns story characters from character ids", () => {
    const { characters, stories } = createAppFixtures();

    const storyCharacters = getStoryCharactersFromLists(stories[1], characters);

    // Effective character IDs are now cast member IDs
    expect(storyCharacters.map((character) => character.id)).toEqual(["cast-2"]);
  });

  it("chooses the active cast lead from cast state", () => {
    const { characters, stories } = createAppFixtures();

    const story = {
      ...stories[0],
      castState: {
        activeCharacters: [{ castMemberId: "cast-2", presence: "active", present: true }],
        relationships: [],
      },
      castMembers: [
        { id: "cast-1", templateCharacterId: "char-1", overlay: createEmptyCharacterOverlay() },
        { id: "cast-2", templateCharacterId: "char-2", overlay: createEmptyCharacterOverlay() }
      ]
    } as any;

    const storyCharacters = getStoryCharactersFromLists(story, characters);
    const lead = chooseActiveCastLead(story, storyCharacters);

    // lead character from resolveEffectiveStoryCharacters should have the name/details of char-2 but id of cast-2
    expect(lead?.name).toBe("Ari");
    expect(lead?.id).toBe("cast-2");
  });

  it("parses suggested updates from fenced JSON", () => {
    const raw = "```json\n{\"updates\":[{\"category\":\"location\",\"title\":\"Move scene\",\"target\":\"Scene\",\"to\":\"Platform 9\",\"details\":\"The cast moved.\",\"confidence\":0.9}]}\n```";

    const updates = parseSuggestedUpdates(raw);

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      category: "location",
      title: "Move scene",
      target: "Scene",
      to: "Platform 9",
      details: "The cast moved.",
      confidence: 0.9,
    });
  });

  it("syncs director notes from current context fields", () => {
    const notes = syncDirectorNotesFromContext(
      {
        avoid: "Do not reveal the twist",
        customNotes: "Keep it subtle",
      } as any,
      {
        scene: {
          timeOfDay: "Night",
          atmosphere: "Tense",
          currentConflict: "The signal is fading",
          currentObjective: "Reach the archive",
        },
        location: {
          name: "Platform 9",
          description: "A cold platform",
          visibleExits: "North",
          hazards: "None",
          availableLocations: "Station Hall",
        },
        objects: [],
        recentFacts: {
          importantDiscoveries: "",
          secretsRevealed: "",
          openQuestions: "",
        },
      } as any
    );

    expect(notes).toMatchObject({
      timeOfDay: "Night",
      currentLocation: "Platform 9",
      sceneMood: "Tense",
      currentConflict: "The signal is fading",
      nextStoryBeat: "Reach the archive",
      avoid: "Do not reveal the twist",
      customNotes: "Keep it subtle",
    });
  });

  it("seeds the initial current context from world", () => {
    const { worlds, characters } = createAppFixtures();

    const context = createInitialCurrentContext(worlds[0] as any, [characters[1]] as any);

    expect(context.location.name).toBe(worlds[0].name);
    // Objective is now empty by default, not seeded from first character
    expect(context.scene.currentObjective).toBe("");
  });
});
