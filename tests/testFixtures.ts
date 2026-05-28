import { normalizeCharacter, normalizeStory, normalizeWorld } from "../src/services/normalizers";

export function createAppFixtures() {
  const worlds = [
    normalizeWorld({ id: "world-1", name: "World One", shortDescription: "First world" }),
    normalizeWorld({ id: "world-2", name: "World Two", shortDescription: "Second world" }),
  ];

  const characters = [
    normalizeCharacter(
      {
        id: "char-1",
        name: "Mira",
        shortDescription: "Lead one",
        relationshipToUser: "Curious about the user",
        goals: "Find answers",
      },
      worlds
    ),
    normalizeCharacter(
      {
        id: "char-2",
        name: "Ari",
        shortDescription: "Lead two",
        relationshipToUser: "Wary of the user",
        goals: "Protect the station",
      },
      worlds
    ),
  ];

  const stories = [
    normalizeStory(
      {
        id: "story-1",
        title: "Story One",
        worldId: "world-1",
        characterIds: ["char-1"],
        greeting: "Opening one",
      },
      worlds,
      characters
    ),
    normalizeStory(
      {
        id: "story-2",
        title: "Story Two",
        worldId: "world-2",
        characterIds: ["char-2"],
        greeting: "Opening two",
      },
      worlds,
      characters
    ),
  ];

  return { worlds, characters, stories };
}

export function createRepositoryState() {
  const { worlds, characters, stories } = createAppFixtures();
  return {
    worlds,
    characters,
    stories,
    chats: {
      "story-1": [{ role: "assistant", content: "Saved chat one" }],
      "story-2": [{ role: "assistant", content: "Saved chat two" }],
    },
    loreMemory: {
      "story-1": [{ id: "lore-1", name: "Lore One", keywords: [], content: "A", enabled: true, alwaysOn: false }],
      "story-2": [{ id: "lore-2", name: "Lore Two", keywords: [], content: "B", enabled: true, alwaysOn: false }],
    },
    storedActiveStory: null as string | null,
    koboldBaseUrl: "http://localhost:5001",
  };
}
