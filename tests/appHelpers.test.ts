import { describe, expect, it } from "vitest";
import {
  chooseActiveCastLead,
  getStoryCharactersFromLists,
  parseSuggestedUpdates,
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
});
