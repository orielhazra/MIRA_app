import { describe, expect, it } from "vitest";
import { buildMessagesForRequest, buildOpeningMessage, buildSystemPrompt } from "../src/services/prompt";
import { createAppFixtures } from "./testFixtures";

describe("prompt service", () => {
  it("buildOpeningMessage replaces placeholders with character, cast, and world values", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const story = {
      ...stories[0],
      greeting: "{{character}} waits in {{world}} with {{castNames}}.",
      characterIds: ["char-1", "char-2"],
    } as any;

    const opening = buildOpeningMessage(story, characters[0] as any, worlds[0] as any, characters as any);

    expect(opening).toContain("Mira waits in World One");
    expect(opening).toContain("Mira, Ari");
  });

  it("buildMessagesForRequest creates a system prompt plus recent history window", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const messages = buildMessagesForRequest({
      story: stories[0] as any,
      world: worlds[0] as any,
      character: characters[0] as any,
      characters: characters as any,
      history: [
        { role: "user", content: "Hello there" },
        { role: "assistant", content: "Mira nods." },
      ] as any,
      privateInstruction: "Stay tense.",
      activeLoreMemory: [
        { id: "lore-1", source: "Story", name: "Lore", content: "Hidden lore", enabled: true, alwaysOn: false },
      ] as any,
    });

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("[Private Response Instruction]");
    expect(messages[0].content).toContain("Stay tense.");
    expect(messages[0].content).toContain("[Relevant Lore]");
    expect(messages[0].content).toContain("Hidden lore");
    expect(messages.slice(1)).toEqual([
      { role: "user", content: "Hello there" },
      { role: "assistant", content: "Mira nods." },
    ]);
  });

  it("buildSystemPrompt includes story, context, and rule sections", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const story = {
      ...stories[0],
      currentContext: {
        scene: { currentObjective: "Find the archive", atmosphere: "Cold", currentConflict: "Time is short", timeOfDay: "Night" },
        location: { name: "Station Hall", description: "A dim hall", visibleExits: "North", hazards: "None", availableLocations: "Platform 9" },
        objects: [{ id: "obj-1", name: "Lantern", locationOrHolder: "Station Hall", visibleState: "Lit", status: "active" }],
        recentFacts: { importantDiscoveries: "A map was found.", secretsRevealed: "", openQuestions: "Who hid it?" },
      },
    } as any;

    const prompt = buildSystemPrompt({
      story,
      world: worlds[0] as any,
      character: characters[0] as any,
      characters: characters as any,
      history: [{ role: "user", content: "Where is the archive?" }] as any,
      injectedLoreText: "[Story] Lore\nHidden lore",
      privateInstruction: "Keep it mysterious.",
    });

    expect(prompt).toContain("[Story Core]");
    expect(prompt).toContain("[Smart Current Context]");
    expect(prompt).toContain("Current Location: Station Hall");
    expect(prompt).toContain("Lantern");
    expect(prompt).toContain("[Relevant Lore]");
    expect(prompt).toContain("Keep it mysterious.");
    expect(prompt).toContain("[General Rules]");
  });
});
