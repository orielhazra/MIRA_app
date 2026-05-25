import { STORAGE_KEYS } from "../constants/defaultData";
import { cloneJson } from "../utils/helpers";
import { World, Character, Story, ChatMessage, LoreEntry } from "../types/index";

function readJson<T>(key: string, fallback: T): T {
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

interface WriteOptions {
  quiet?: boolean;
  errorMessage?: string;
}

function writeJson<T>(key: string, value: T, options: WriteOptions = {}): boolean {
  const { quiet = false, errorMessage = "Save failed. Browser storage may be full." } = options;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    if (!quiet) alert(errorMessage);
    return false;
  }
}

function removeKey(key: string): void {
  localStorage.removeItem(key);
}

function getChatKey(storyId: string): string {
  return `roleplay_story_chat_${storyId}`;
}

function getLoreMemoryKey(storyId: string): string {
  return `roleplay_story_lore_memory_${storyId}`;
}

function getLegacyCharacterChatKey(characterId: string): string {
  return `roleplay_chat_${characterId}`;
}

export const repository = {
  worlds: {
    list(fallback: World[] = []): World[] {
      return readJson<World[]>(STORAGE_KEYS.worlds, fallback);
    },
    saveAll(worlds: World[], options: WriteOptions = {}): boolean {
      return writeJson<World[]>(STORAGE_KEYS.worlds, worlds, {
        errorMessage: "World save failed. Browser storage may be full.",
        ...options
      });
    },
    clear(): void {
      removeKey(STORAGE_KEYS.worlds);
    }
  },

  characters: {
    list(fallback: Character[] = []): Character[] {
      return readJson<Character[]>(STORAGE_KEYS.characters, fallback);
    },
    saveAll(characters: Character[], options: WriteOptions = {}): boolean {
      return writeJson<Character[]>(STORAGE_KEYS.characters, characters, {
        errorMessage: "Character save failed. Browser storage may be full.",
        ...options
      });
    },
    clear(): void {
      removeKey(STORAGE_KEYS.characters);
    },
    removeLegacyChat(characterId: string): void {
      removeKey(getLegacyCharacterChatKey(characterId));
    }
  },

  stories: {
    list(fallback: Story[] = []): Story[] {
      return readJson<Story[]>(STORAGE_KEYS.stories, fallback);
    },
    saveAll(stories: Story[], options: WriteOptions = {}): boolean {
      return writeJson<Story[]>(STORAGE_KEYS.stories, stories, {
        errorMessage: "Story save failed. Browser storage may be full.",
        ...options
      });
    },
    clear(): void {
      removeKey(STORAGE_KEYS.stories);
    }
  },

  chats: {
    load(storyId: string, fallback: ChatMessage[] | null = null): ChatMessage[] | null {
      if (!storyId) return cloneJson(fallback);
      return readJson<ChatMessage[] | null>(getChatKey(storyId), fallback);
    },
    save(storyId: string, messages: ChatMessage[], options: WriteOptions = {}): boolean {
      if (!storyId) return false;
      return writeJson<ChatMessage[]>(getChatKey(storyId), messages, {
        errorMessage: "Chat save failed. Browser storage may be full.",
        ...options
      });
    },
    remove(storyId: string): void {
      if (storyId) removeKey(getChatKey(storyId));
    }
  },

  loreMemory: {
    load(storyId: string, fallback: LoreEntry[] = []): LoreEntry[] {
      if (!storyId) return cloneJson(fallback);
      return readJson<LoreEntry[]>(getLoreMemoryKey(storyId), fallback);
    },
    save(storyId: string, loreMemory: LoreEntry[], options: WriteOptions = {}): boolean {
      if (!storyId) return false;
      return writeJson<LoreEntry[]>(getLoreMemoryKey(storyId), loreMemory, {
        quiet: true,
        errorMessage: "Lore memory save failed.",
        ...options
      });
    },
    remove(storyId: string): void {
      if (storyId) removeKey(getLoreMemoryKey(storyId));
    }
  },

  activeStory: {
    get(): string | null {
      return localStorage.getItem(STORAGE_KEYS.activeStory);
    },
    set(storyId: string): void {
      if (storyId) localStorage.setItem(STORAGE_KEYS.activeStory, storyId);
    },
    clear(): void {
      removeKey(STORAGE_KEYS.activeStory);
    }
  },

  settings: {
    getKoboldBaseUrl(fallback: string): string {
      return localStorage.getItem("kobold_base_url") || fallback;
    },
    setKoboldBaseUrl(value: string): void {
      localStorage.setItem("kobold_base_url", value);
    }
  },

  maintenance: {
    clearKnownData(existingStories: Story[] = [], existingCharacters: Character[] = []): void {
      for (const story of existingStories) {
        this.removeStoryRuntimeData(story.id);
      }
      for (const character of existingCharacters) {
        removeKey(getLegacyCharacterChatKey(character.id));
      }
      removeKey(STORAGE_KEYS.worlds);
      removeKey(STORAGE_KEYS.characters);
      removeKey(STORAGE_KEYS.stories);
      removeKey(STORAGE_KEYS.activeStory);
    },
    removeStoryRuntimeData(storyId: string): void {
      removeKey(getChatKey(storyId));
      removeKey(getLoreMemoryKey(storyId));
    }
  }
};
