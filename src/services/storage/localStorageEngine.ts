import { STORAGE_KEYS } from "../../constants/defaultData";
import { cloneJson } from "../../utils/helpers";
import { World, Character, Story, ChatMessage, LoreEntry } from "../../types";

interface PersistenceStatus {
  lastError: string | null;
  lastOperation: string | null;
  lastSavedAt: number | null;
  pendingWrites: number;
}

const persistenceStatus: PersistenceStatus = {
  lastError: null,
  lastOperation: null,
  lastSavedAt: null,
  pendingWrites: 0,
};

const persistenceListeners = new Set<(status: PersistenceStatus) => void>();

function emitPersistenceStatus() {
  const snapshot = { ...persistenceStatus };
  for (const listener of persistenceListeners) {
    listener(snapshot);
  }
}

function updatePersistenceStatus(patch: Partial<PersistenceStatus>) {
  Object.assign(persistenceStatus, patch);
  emitPersistenceStatus();
}

function withTrackedWrite<T>(operationLabel: string, writer: () => T): T {
  updatePersistenceStatus({ pendingWrites: persistenceStatus.pendingWrites + 1, lastOperation: operationLabel });

  try {
    const result = writer();
    updatePersistenceStatus({
      pendingWrites: Math.max(0, persistenceStatus.pendingWrites - 1),
      lastError: null,
      lastOperation: operationLabel,
      lastSavedAt: Date.now(),
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updatePersistenceStatus({
      pendingWrites: Math.max(0, persistenceStatus.pendingWrites - 1),
      lastError: `${operationLabel}: ${message}`,
      lastOperation: operationLabel,
    });
    throw error;
  }
}

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

export const localStorageEngine = {
  async initialize(): Promise<void> {
    return Promise.resolve(); // No-op for LocalStorage
  },

  persistence: {
    getStatus(): PersistenceStatus {
      return { ...persistenceStatus };
    },
    subscribe(listener: (status: PersistenceStatus) => void): () => void {
      persistenceListeners.add(listener);
      listener({ ...persistenceStatus });
      return () => persistenceListeners.delete(listener);
    },
    clearError(): void {
      updatePersistenceStatus({ lastError: null });
    },
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

  stories: {
    list(fallback: Story[] = []): Story[] {
      return readLocalStorageJson<Story[]>(STORAGE_KEYS.stories, fallback);
    },
    saveAll(stories: Story[]): boolean {
      return withTrackedWrite("Save stories", () => writeLocalStorageJson<Story[]>(STORAGE_KEYS.stories, stories));
    },
    clear(): void {
      withTrackedWrite("Clear stories", () => {
        localStorage.removeItem(STORAGE_KEYS.stories);
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
      withTrackedWrite("Remove lore memory", () => {
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
        for (const story of existingStories) {
          localStorage.removeItem(`roleplay_story_chat_${story.id}`);
          localStorage.removeItem(`roleplay_story_lore_memory_${story.id}`);
        }
        for (const character of existingCharacters) {
          localStorage.removeItem(`roleplay_chat_${character.id}`);
        }
        localStorage.removeItem(STORAGE_KEYS.worlds);
        localStorage.removeItem(STORAGE_KEYS.characters);
        localStorage.removeItem(STORAGE_KEYS.stories);
        localStorage.removeItem(STORAGE_KEYS.activeStory);
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
