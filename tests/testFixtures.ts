import { normalizeCharacter, normalizeStory, normalizeWorld } from "../src/services/normalizers";
import { createEmptyCharacterOverlay } from "../src/constants/defaultData";

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
      }
    ),
    normalizeCharacter(
      {
        id: "char-2",
        name: "Ari",
        shortDescription: "Lead two",
        relationshipToUser: "Wary of the user",
        goals: "Protect the station",
      }
    ),
  ];

  const stories = [
    normalizeStory(
      {
        id: "story-1",
        title: "Story One",
        templateWorldId: "world-1",
        castMembers: [
          {
            id: "cast-1",
            templateCharacterId: "char-1",
            templateCharacterKey: "char-1",
            templateCharacterVersion: 1,
            overlay: createEmptyCharacterOverlay()
          }
        ],
        greeting: "Opening one",
      },
      worlds,
      characters
    ),
    normalizeStory(
      {
        id: "story-2",
        title: "Story Two",
        templateWorldId: "world-2",
        castMembers: [
          {
            id: "cast-2",
            templateCharacterId: "char-2",
            templateCharacterKey: "char-2",
            templateCharacterVersion: 1,
            overlay: createEmptyCharacterOverlay()
          }
        ],
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
