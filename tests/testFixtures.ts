import React from "react";
import { normalizeCharacter, normalizeStory, normalizeWorld, normalizePersona } from "../src/services/normalizers";
import { createEmptyCharacterOverlay } from "../src/constants/defaultData";
import { ToastProvider } from "../src/context/ToastContext";
import { UIProvider } from "../src/context/UIContext";
import { ChatStateProvider } from "../src/context/ChatStateContext";
import { LoreStateProvider } from "../src/context/LoreStateContext";
import { StoryStateProvider } from "../src/context/StoryStateContext";
import { loadInitialState } from "../src/utils/appHelpers";
import { defaultPersonas } from "../src/constants/defaultData";

/** Default initial state for tests when repository is mocked or unavailable. */
function getTestInitialState() {
  try {
    const state = loadInitialState();
    return {
      ...state,
      personas: (state as any).personas?.length ? (state as any).personas : defaultPersonas.map(normalizePersona),
    };
  } catch {
    // Repository may be mocked — use minimal defaults
    const fixtures = createAppFixtures();
    return {
      worlds: fixtures.worlds,
      characters: fixtures.characters,
      personas: fixtures.personas,
      storyMetas: [],
      activeStory: null,
      activeView: "landing",
      selectedCharacterSheetId: "",
      selectedWorldSheetId: "",
      chatHistory: [],
      activeLoreMemory: [],
    };
  }
}

/** Wrapper for renderHook that provides required context providers. */
export function TestProviders({ children }: { children: React.ReactNode }) {
  const initial = getTestInitialState();

  return React.createElement(ToastProvider, null,
    React.createElement(UIProvider, null,
      React.createElement(StoryStateProvider, { initialState: initial as any },
        React.createElement(ChatStateProvider, null,
          React.createElement(LoreStateProvider, null, children)
        )
      )
    )
  );
}

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

  const personas = [
    normalizePersona({ id: "persona-1", name: "Explorer" })
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
        userProfile: { name: "You", description: "Default profile" }
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
        userProfile: { name: "You", description: "Default profile" }
      },
      worlds,
      characters
    ),
  ];

  return { worlds, characters, stories, personas };
}

export function createRepositoryState() {
  const { worlds, characters, stories, personas } = createAppFixtures();
  return {
    worlds,
    characters,
    stories,
    personas,
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
