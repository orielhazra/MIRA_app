import { describe, expect, it } from "vitest";
import {
  buildNextActiveLoreMemory,
  getRecentLoreTriggerText,
  inspectLoreInjection,
  loreKeywordMatches,
  selectLoreForPrompt,
} from "../src/services/lore";
import { createAppFixtures } from "./testFixtures";

describe("lore service", () => {
  it("matches single-word and phrase keywords against trigger text", () => {
    expect(loreKeywordMatches("station", "we returned to the station at night")).toBe(true);
    expect(loreKeywordMatches("old train", "the old train arrived late")).toBe(true);
    expect(loreKeywordMatches("stat", "we returned to the station at night")).toBe(false);
  });

  it("builds and sorts next active lore memory from matching entries", () => {
    const nextMemory = buildNextActiveLoreMemory(
      [],
      [
        {
          id: "lore-1",
          source: "Story",
          sourceKey: "story",
          sourceId: "story-1",
          originalIndex: 0,
          name: "Priority lore",
          keywords: ["station"],
          content: "Important content",
          enabled: true,
          alwaysOn: false,
          priority: 5,
        },
        {
          id: "lore-2",
          source: "World",
          sourceKey: "world",
          sourceId: "world-1",
          originalIndex: 1,
          name: "Always on lore",
          keywords: [],
          content: "Always there",
          enabled: true,
          alwaysOn: true,
          priority: 0,
        },
      ] as any,
      [
        { id: "lore-1", enabled: true },
        { id: "lore-2", enabled: true },
      ] as any
    );

    expect(nextMemory).toHaveLength(2);
    expect(nextMemory[0].id).toBe("lore-2");
    expect(nextMemory[1].id).toBe("lore-1");
  });

  it("inspects lore injection and selects triggered lore entries", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const story = {
      ...stories[0],
      storyLorebook: [
        {
          id: "story-lore-1",
          name: "Station note",
          keywords: ["station"],
          content: "The station changes at midnight.",
          enabled: true,
          alwaysOn: false,
          priority: 2,
        },
      ],
    } as any;

    const result = inspectLoreInjection({
      story,
      world: worlds[0] as any,
      character: characters[0] as any,
      characters: [characters[0]] as any,
      history: [{ role: "user", content: "We head back to the station." }] as any,
      activeLoreMemory: [],
    });

    expect(result.matchingEntries).toHaveLength(1);
    expect(result.selectedEntries).toHaveLength(1);
    expect(result.selectedEntries[0]).toMatchObject({
      name: "Station note",
      source: "Story",
    });
    expect(result.injectedText).toContain("The station changes at midnight.");
  });

  it("formats recent lore trigger text from chat plus director notes", () => {
    const triggerText = getRecentLoreTriggerText(
      [
        { role: "user", content: "The platform is quiet." },
        { role: "assistant", content: "Mira listens for trains." },
      ] as any,
      {
        currentLocation: "Platform 9",
        sceneMood: "Tense",
      } as any
    );

    expect(triggerText).toContain("the platform is quiet.");
    expect(triggerText).toContain("current location:");
    expect(triggerText).toContain("platform 9");
    expect(triggerText).toContain("scene mood:");
  });

  it("selectLoreForPrompt respects prompt-size budgeting", () => {
    const entries = [
      {
        id: "l1",
        source: "Story",
        name: "Short",
        content: "short content",
        enabled: true,
        alwaysOn: true,
        priority: 1,
      },
      {
        id: "l2",
        source: "Story",
        name: "Large",
        content: "x".repeat(10000),
        enabled: true,
        alwaysOn: false,
        priority: 0,
      },
    ] as any;

    const selected = selectLoreForPrompt(entries);

    expect(selected.some((entry: any) => entry.id === "l1")).toBe(true);
    expect(selected.some((entry: any) => entry.id === "l2")).toBe(false);
  });
});
