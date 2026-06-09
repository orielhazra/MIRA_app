import { Character, ChatMessage, LoreEntry, Persona, Story, StoryMeta, World } from "../../types";

export interface PersistenceStatus {
  lastError: string | null;
  lastOperation: string | null;
  lastSavedAt: number | null;
  pendingWrites: number;
}

export interface StoryStorage {
  listMeta(fallback?: StoryMeta[]): StoryMeta[];
  loadFull(storyId: string): Story | null | Promise<Story | null>;
  saveStory(story: Story): boolean;
  deleteStory(storyId: string): boolean;
  clear(): void;

  // Temporary bridges while app hooks are refactored away from full-list workflows.
  list?(fallback?: Story[]): Story[];
  saveAll?(stories: Story[]): boolean;
}

export interface RepositoryStorage {
  initialize(): Promise<void>;
  persistence?: {
    getStatus(): PersistenceStatus;
    subscribe(listener: (status: PersistenceStatus) => void): () => void;
    clearError(): void;
    flush(): Promise<void>;
  };
  worlds: {
    list(fallback?: World[]): World[];
    saveAll(worlds: World[]): boolean;
    clear(): void;
  };
  characters: {
    list(fallback?: Character[]): Character[];
    saveAll(characters: Character[]): boolean;
    clear(): void;
    removeLegacyChat?(characterId: string): void;
  };
  personas: {
    list(fallback?: Persona[]): Persona[];
    saveAll(personas: Persona[]): boolean;
    clear(): void;
  };
  stories: StoryStorage;
  chats: {
    load(storyId: string, fallback?: ChatMessage[] | null): ChatMessage[] | null;
    save(storyId: string, messages: ChatMessage[]): boolean;
    remove(storyId: string): void;
  };
  loreMemory: {
    load(storyId: string, fallback?: LoreEntry[]): LoreEntry[];
    save(storyId: string, loreMemory: LoreEntry[]): boolean;
    remove(storyId: string): void;
  };
  activeStory: {
    get(): string | null;
    set(storyId: string): void;
    clear(): void;
  };
  settings: {
    getKoboldBaseUrl(fallback: string): string;
    setKoboldBaseUrl(value: string): void;
  };
  maintenance: {
    clearKnownData(existingStories?: Story[], existingCharacters?: Character[]): void;
    removeStoryRuntimeData(storyId: string): void;
  };
}
