import { STORAGE_KEYS } from "../../constants/defaultData";
import { cloneJson } from "../../utils/helpers";
import { storyToMeta, upsertStoryMeta } from "../storyMeta";
import { World, Character, Story, StoryMeta, ChatMessage, LoreEntry, Persona } from "../../types";
import { createPersistenceTracker } from "./persistenceTracker";

const tracker = createPersistenceTracker();
const { withTrackedWrite } = tracker;

function readLocalStorageJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return cloneJson(fallback);
  try {
    return JSON.parse(saved) as T;
  } catch (error) {
    console.warn(`Invalid saved JSON for ${key}. Resetting key.`, error);
    localStorage.removeItem(key);
    return cloneJson(fallback);
  }
}

function writeLocalStorageJson<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    return false;
  }
}

function storyStorageKey(storyId: string): string {
  return `roleplay_story_full_${storyId}`;
}

export const localStorageEngine = {
  async initialize(): Promise<void> {
    return Promise.resolve();
  },

  persistence: {
    getStatus: tracker.getStatus,
    subscribe: tracker.subscribe,
    clearError: tracker.clearError,
    async flush(): Promise<void> {
      return Promise.resolve();
    }
  },

  worlds: {
    list(fallback: World[] = []): World[] {
      return readLocalStorageJson<World[]>(STORAGE_KEYS.worlds, fallback);
    },
    saveAll(worlds: World[]): boolean {
      return withTrackedWrite("Save worlds", () => writeLocalStorageJson<World[]>(STORAGE_KEYS.worlds, worlds));
    },
    clear(): void {
      withTrackedWrite("Clear worlds", () => {
        localStorage.removeItem(STORAGE_KEYS.worlds);
      });
    }
  },

  characters: {
    list(fallback: Character[] = []): Character[] {
      return readLocalStorageJson<Character[]>(STORAGE_KEYS.characters, fallback);
    },
    saveAll(characters: Character[]): boolean {
      return withTrackedWrite("Save characters", () => writeLocalStorageJson<Character[]>(STORAGE_KEYS.characters, characters));
    },
    clear(): void {
      withTrackedWrite("Clear characters", () => {
        localStorage.removeItem(STORAGE_KEYS.characters);
      });
    },
    removeLegacyChat(characterId: string): void {
      withTrackedWrite("Remove legacy character chat", () => {
        localStorage.removeItem(`roleplay_chat_${characterId}`);
      });
    }
  },

  personas: {
    list(fallback: Persona[] = []): Persona[] {
      return readLocalStorageJson<Persona[]>(STORAGE_KEYS.personas, fallback);
    },
    saveAll(personas: Persona[]): boolean {
      return withTrackedWrite("Save personas", () => writeLocalStorageJson<Persona[]>(STORAGE_KEYS.personas, personas));
    },
    clear(): void {
      withTrackedWrite("Clear personas", () => {
        localStorage.removeItem(STORAGE_KEYS.personas);
      });
    }
  },

  stories: {
    listMeta(fallback: StoryMeta[] = []): StoryMeta[] {
      return readLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, fallback);
    },

    loadFull(storyId: string): Story | null {
      if (!storyId) return null;
      return readLocalStorageJson<Story | null>(storyStorageKey(storyId), null);
    },

    // Compatibility bridge for old call sites during the state refactor.
    // Blank-slate storage does not persist a full story list.
    list(fallback: Story[] = []): Story[] {
      return cloneJson(fallback);
    },

    // Compatibility bridge: save each provided story individually and persist only metas as the list.
    saveAll(stories: Story[]): boolean {
      return withTrackedWrite("Save story metadata", () => {
        const metas = stories.map(storyToMeta);
        writeLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, metas);
        for (const story of stories) {
          writeLocalStorageJson<Story>(storyStorageKey(story.id), story);
        }
        return true;
      });
    },

    saveStory(story: Story): boolean {
      return withTrackedWrite("Save story", () => {
        const metas = readLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, []);
        writeLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, upsertStoryMeta(metas, storyToMeta(story)));
        return writeLocalStorageJson<Story>(storyStorageKey(story.id), story);
      });
    },

    deleteStory(storyId: string): boolean {
      if (!storyId) return false;
      return withTrackedWrite("Delete story", () => {
        const metas = readLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, []);
        writeLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, metas.filter((meta) => meta.id !== storyId));
        localStorage.removeItem(storyStorageKey(storyId));
        localStorage.removeItem(`roleplay_story_chat_${storyId}`);
        localStorage.removeItem(`roleplay_story_lore_memory_${storyId}`);
        return true;
      });
    },

    clear(): void {
      withTrackedWrite("Clear stories", () => {
        const metas = readLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, []);
        for (const meta of metas) {
          localStorage.removeItem(storyStorageKey(meta.id));
        }
        localStorage.removeItem(STORAGE_KEYS.storyMetas);
      });
    }
  },

  chats: {
    load(storyId: string, fallback: ChatMessage[] | null = null): ChatMessage[] | null {
      if (!storyId) return cloneJson(fallback);
      return readLocalStorageJson<ChatMessage[] | null>(`roleplay_story_chat_${storyId}`, fallback);
    },
    save(storyId: string, messages: ChatMessage[]): boolean {
      if (!storyId) return false;
      return withTrackedWrite("Save chat", () => writeLocalStorageJson<ChatMessage[]>(`roleplay_story_chat_${storyId}`, messages));
    },
    remove(storyId: string): void {
      if (!storyId) return;
      withTrackedWrite("Remove chat", () => {
        localStorage.removeItem(`roleplay_story_chat_${storyId}`);
      });
    }
  },

  loreMemory: {
    load(storyId: string, fallback: LoreEntry[] = []): LoreEntry[] {
      if (!storyId) return cloneJson(fallback);
      return readLocalStorageJson<LoreEntry[]>(`roleplay_story_lore_memory_${storyId}`, fallback);
    },
    save(storyId: string, loreMemory: LoreEntry[]): boolean {
      if (!storyId) return false;
      return withTrackedWrite("Save lore memory", () => writeLocalStorageJson<LoreEntry[]>(`roleplay_story_lore_memory_${storyId}`, loreMemory));
    },
    remove(storyId: string): void {
      if (!storyId) return;
      withTrackedWrite("Remove chat memory", () => {
        localStorage.removeItem(`roleplay_story_lore_memory_${storyId}`);
      });
    }
  },

  activeStory: {
    get(): string | null {
      return localStorage.getItem(STORAGE_KEYS.activeStory);
    },
    set(storyId: string): void {
      if (!storyId) return;
      withTrackedWrite("Set active story", () => {
        localStorage.setItem(STORAGE_KEYS.activeStory, storyId);
      });
    },
    clear(): void {
      withTrackedWrite("Clear active story", () => {
        localStorage.removeItem(STORAGE_KEYS.activeStory);
      });
    }
  },

  settings: {
    getKoboldBaseUrl(fallback: string): string {
      return localStorage.getItem("kobold_base_url") || fallback;
    },
    setKoboldBaseUrl(value: string): void {
      withTrackedWrite("Set Kobold URL", () => {
        localStorage.setItem("kobold_base_url", value);
      });
    }
  },

  maintenance: {
    clearKnownData(existingStories: Story[] = [], existingCharacters: Character[] = []): void {
      withTrackedWrite("Factory reset storage", () => {
        const knownMetas = readLocalStorageJson<StoryMeta[]>(STORAGE_KEYS.storyMetas, []);
        const knownStoryIds = new Set([
          ...knownMetas.map((meta) => meta.id),
          ...existingStories.map((story) => story.id),
        ].filter(Boolean));
        for (const storyId of knownStoryIds) {
          localStorage.removeItem(storyStorageKey(storyId));
          localStorage.removeItem(`roleplay_story_chat_${storyId}`);
          localStorage.removeItem(`roleplay_story_lore_memory_${storyId}`);
        }
        for (const character of existingCharacters) {
          localStorage.removeItem(`roleplay_chat_${character.id}`);
        }
        localStorage.removeItem(STORAGE_KEYS.worlds);
        localStorage.removeItem(STORAGE_KEYS.characters);
        localStorage.removeItem(STORAGE_KEYS.storyMetas);
        localStorage.removeItem(STORAGE_KEYS.activeStory);
        localStorage.removeItem(STORAGE_KEYS.personas);
      });
    },
    removeStoryRuntimeData(storyId: string): void {
      withTrackedWrite("Remove story runtime data", () => {
        localStorage.removeItem(`roleplay_story_chat_${storyId}`);
        localStorage.removeItem(`roleplay_story_lore_memory_${storyId}`);
      });
    }
  }
};
