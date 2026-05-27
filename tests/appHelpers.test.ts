import { describe, expect, it } from "vitest";
import {
  chooseActiveCastLead,
  createInitialCurrentContext,
  getStoryCharactersFromLists,
  parseSuggestedUpdates,
  syncDirectorNotesFromContext,
} from "../src/utils/appHelpers";
import { createAppFixtures } from "./testFixtures";

describe("appHelpers", () => {
  it("returns story characters from character ids", () => {
    const { characters, stories } = createAppFixtures();

    const storyCharacters = getStoryCharactersFromLists(stories[1], characters);

    expect(storyCharacters.map((character) => character.id)).toEqual(["char-2"]);
  });

  it("chooses the active cast lead from cast state", () => {
    const { characters, stories } = createAppFixtures();

    const story = {
      ...stories[0],
      castState: {
        activeCharacters: [{ characterId: "char-2", presence: "active", present: true }],
        relationships: [],
      },
      characterIds: ["char-1", "char-2"],
    };

    const lead = chooseActiveCastLead(story as any, characters);

    expect(lead?.id).toBe("char-2");
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

  it("uses story characters to seed the initial current objective", () => {
    const { worlds, characters } = createAppFixtures();

    const context = createInitialCurrentContext(worlds[0] as any, [characters[1]] as any);

    expect(context.location.name).toBe(worlds[0].name);
    expect(context.scene.currentObjective).toBe(characters[1].goals);
  });
});
