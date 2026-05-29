import { cloneJson } from "../../utils/helpers";
import { CUSTOM_DB_PATH } from "../../constants/defaultData";
import { storyToMeta } from "../storyMeta";
import { World, Character, Story, StoryMeta, ChatMessage, LoreEntry } from "../../types";
import { ensureSqliteSchema, SQLITE_WORLD_INSERT_SQL, SQLITE_CHARACTER_INSERT_SQL, SQLITE_STORY_INSERT_SQL } from "./sqliteSchema";



interface SqliteCache {
  worlds: World[];
  characters: Character[];
  stories: Story[];
  storyMetas: StoryMeta[];
  chats: Record<string, ChatMessage[]>;
  loreMemory: Record<string, LoreEntry[]>;
  settings: Record<string, string>;
}

interface PersistenceStatus {
  lastError: string | null;
  lastOperation: string | null;
  lastSavedAt: number | null;
  pendingWrites: number;
}

const cache: SqliteCache = {
  worlds: [],
  characters: [],
  stories: [],
  storyMetas: [],
  chats: {},
  loreMemory: {},
  settings: {}
};

const persistenceStatus: PersistenceStatus = {
  lastError: null,
  lastOperation: null,
  lastSavedAt: null,
  pendingWrites: 0,
};

const persistenceListeners = new Set<(status: PersistenceStatus) => void>();
let writeQueue: Promise<void> = Promise.resolve();
const WRITE_DEBOUNCE_MS = 350;
const scheduledWriteTasks = new Map<string, { operationLabel: string; writer: (db: any) => Promise<void> }>();
const scheduledWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

function markPersistenceSuccess(operationLabel: string) {
  updatePersistenceStatus({
    lastError: null,
    lastOperation: operationLabel,
    lastSavedAt: Date.now(),
  });
}

function markPersistenceFailure(operationLabel: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${operationLabel} failed:`, error);
  updatePersistenceStatus({
    lastError: `${operationLabel}: ${message}`,
    lastOperation: operationLabel,
  });
}

async function runInTransaction(db: any, operation: () => Promise<void>): Promise<void> {
  await db.execute("BEGIN TRANSACTION");
  try {
    await operation();
    await db.execute("COMMIT");
  } catch (error) {
    try {
      await db.execute("ROLLBACK");
    } catch (rollbackError) {
      console.error("SQLite rollback failed:", rollbackError);
    }
    throw error;
  }
}

function enqueueDbWrite(
  operationLabel: string,
  writer: (db: any) => Promise<void>,
  options: { alreadyTracked?: boolean } = {}
): void {
  if (!dbPromise) return;

  if (!options.alreadyTracked) {
    updatePersistenceStatus({
      pendingWrites: persistenceStatus.pendingWrites + 1,
      lastOperation: operationLabel,
    });
  }

  const run = async () => {
    try {
      const db = await dbPromise;
      await writer(db);
      markPersistenceSuccess(operationLabel);
    } catch (error) {
      markPersistenceFailure(operationLabel, error);
    } finally {
      updatePersistenceStatus({
        pendingWrites: Math.max(0, persistenceStatus.pendingWrites - 1),
      });
    }
  };

  writeQueue = writeQueue.then(run, run);
}

function cancelScheduledWrite(writeKey: string): void {
  const timer = scheduledWriteTimers.get(writeKey);
  if (timer) {
    clearTimeout(timer);
    scheduledWriteTimers.delete(writeKey);
  }

  if (scheduledWriteTasks.delete(writeKey)) {
    updatePersistenceStatus({
      pendingWrites: Math.max(0, persistenceStatus.pendingWrites - 1),
    });
  }
}

function scheduleDbWrite(
  writeKey: string,
  operationLabel: string,
  writer: (db: any) => Promise<void>,
  delay = WRITE_DEBOUNCE_MS
): void {
  if (!dbPromise) return;

  const hadPendingTask = scheduledWriteTasks.has(writeKey);
  scheduledWriteTasks.set(writeKey, { operationLabel, writer });

  const existingTimer = scheduledWriteTimers.get(writeKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  if (!hadPendingTask) {
    updatePersistenceStatus({
      pendingWrites: persistenceStatus.pendingWrites + 1,
      lastOperation: operationLabel,
    });
  } else {
    updatePersistenceStatus({ lastOperation: operationLabel });
  }

  const timer = setTimeout(() => {
    void flushScheduledWrite(writeKey);
  }, delay);
  scheduledWriteTimers.set(writeKey, timer);
}

async function flushScheduledWrite(writeKey: string): Promise<void> {
  const task = scheduledWriteTasks.get(writeKey);
  if (!task) return;

  const timer = scheduledWriteTimers.get(writeKey);
  if (timer) {
    clearTimeout(timer);
    scheduledWriteTimers.delete(writeKey);
  }

  scheduledWriteTasks.delete(writeKey);
  enqueueDbWrite(task.operationLabel, task.writer, { alreadyTracked: true });
}

async function flushPendingWrites(): Promise<void> {
  const keys = Array.from(scheduledWriteTasks.keys());
  for (const key of keys) {
    await flushScheduledWrite(key);
  }
  await writeQueue;
}

let dbPromise: Promise<any> | null = null;
const isTauri = typeof window !== "undefined" && ((window as any).__TAURI_INTERNALS__ !== undefined || (window as any).__TAURI_IPC__ !== undefined);
const DEFAULT_TAURI_DB_URL = "sqlite:mira.db";

function shouldUseCustomDbPath(customDbPath: string): boolean {
  if (!customDbPath) return false;

  const isWindowsStyleAbsolutePath = /^[A-Za-z]:[\/\\]/.test(customDbPath);
  const isWindowsRuntime = typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);

  if (isWindowsStyleAbsolutePath && !isWindowsRuntime) {
    console.warn(`Skipping Windows-specific custom SQLite path on non-Windows runtime: ${customDbPath}`);
    return false;
  }

  return true;
}

async function loadTauriDatabase(): Promise<any> {
  try {
    const SQL = await import("@tauri-apps/plugin-sql");
    const customDbPath = CUSTOM_DB_PATH.trim();

    if (shouldUseCustomDbPath(customDbPath)) {
      try {
        const fsApi = await import("@tauri-apps/plugin-fs");
        const pathApi = await import("@tauri-apps/api/path");
        const dbDir = await pathApi.dirname(customDbPath);
        const dirExists = await fsApi.exists(dbDir);

        if (!dirExists) {
          console.warn(`Custom SQLite directory ${dbDir} does not exist. Creating it now.`);
          await fsApi.mkdir(dbDir, { recursive: true });
        }

        console.log(`Loading SQLite from custom location: ${customDbPath}`);
        return await SQL.default.load(`sqlite:${customDbPath}`);
      } catch (pathError) {
        console.warn("Failed to initialize custom SQLite path. Falling back to default app database.", pathError);
      }
    }

    console.log(`Loading SQLite from default app database: ${DEFAULT_TAURI_DB_URL}`);
    return await SQL.default.load(DEFAULT_TAURI_DB_URL);
  } catch (e) {
    console.error("Failed to dynamically load SQLite database:", e);
    throw e;
  }
}

if (isTauri) {
  dbPromise = loadTauriDatabase();
}

export const sqliteEngine = {
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
      await flushPendingWrites();
    }
  },

  async initialize(): Promise<void> {
    if (!isTauri) return;
    const db = await dbPromise;


    try {
      await flushPendingWrites();

      await ensureSqliteSchema(db);

      // 1. Load Worlds
      const rawWorlds = (await db.select("SELECT * FROM worlds")) as any[];
      cache.worlds = rawWorlds.map((row: any) => ({
        id: row.id,
        templateKey: row.templateKey || row.id,
        templateVersion: Number(row.templateVersion || 1),
        name: row.name,
        overview: row.overview || "",
        shortDescription: row.overview || "",
        description: row.description || "",
        rules: row.rules || "",
        locations: row.locations ? JSON.parse(row.locations) : [],
        worldLorebook: row.worldLorebook ? JSON.parse(row.worldLorebook) : [],
        createdAt: row.createdAt
      }));

      // 2. Load Characters
      const rawCharacters = (await db.select("SELECT * FROM characters")) as any[];
      cache.characters = rawCharacters.map((row: any) => ({
        id: row.id,
        name: row.name,
        shortDescription: row.shortDescription || "",
        race: row.race || "",
        role: row.role || "",
        aliases: row.aliases ? JSON.parse(row.aliases) : [],
        promptKeywords: row.promptKeywords ? JSON.parse(row.promptKeywords) : [],
        profileSummary: row.profileSummary || "",
        defaultOutfit: row.defaultOutfit || "",
        promptPinned: row.promptPinned === 1,
        description: row.description || "",
        personality: row.personality || "",
        appearance: row.appearance || "",
        backstory: row.backstory || "",
        speakingStyle: row.speakingStyle || "",
        relationshipToUser: row.relationshipToUser || "",
        goals: row.goals || "",
        characterRules: row.characterRules || "",
        lorebook: row.lorebook ? JSON.parse(row.lorebook) : [],
        createdAt: row.createdAt
      }));

      // 3. Load Story Metadata only.
      const rawStoryMetas = (await db.select("SELECT * FROM stories")) as any[];
      cache.storyMetas = rawStoryMetas.map((row: any) => {
        const characterIds = row.characterIds ? JSON.parse(row.characterIds) : [];
        return {
          id: row.id,
          title: row.title,
          templateWorldId: row.templateWorldId || row.worldId,
          characterIds,
          characterCount: characterIds.length,
          createdAt: row.createdAt,
          lastPlayedAt: row.lastPlayedAt || undefined,
        };
      });

      // Note: Full stories are no longer loaded into cache.stories at startup
      cache.stories = [];

      // 4. Load Chats
      const rawChats = (await db.select("SELECT * FROM chats")) as any[];
      for (const row of rawChats as any[]) {
        if (row.storyId) {
          cache.chats[row.storyId] = JSON.parse(row.messages);
        }
      }

      // 5. Load Lore Memory
      const rawLoreMemory = (await db.select("SELECT * FROM lore_memory")) as any[];
      for (const row of rawLoreMemory as any[]) {
        if (row.storyId) {
          cache.loreMemory[row.storyId] = JSON.parse(row.activeLore);
        }
      }

      // 6. Load Settings
      const rawSettings = (await db.select("SELECT * FROM settings")) as any[];
      for (const row of rawSettings as any[]) {
        if (row.key) {
          cache.settings[row.key] = row.value;
        }
      }

      console.log(" M.I.R.A. SQLite DB initialized successfully in write-through cache!");
    } catch (error) {
      console.error("Failed to load SQLite tables into cache:", error);
    }
  },

  worlds: {
    list(fallback: World[] = []): World[] {
      return cache.worlds.length ? cache.worlds : fallback;
    },
    saveAll(worlds: World[]): boolean {
      cache.worlds = cloneJson(worlds);
      
      scheduleDbWrite("worlds", "Save worlds", async (db) => {
        await runInTransaction(db, async () => {
          await db.execute("DELETE FROM worlds");
          for (const world of worlds) {
            await db.execute(
              SQLITE_WORLD_INSERT_SQL,
              [
                world.id,
                world.templateKey || world.id,
                Number(world.templateVersion || 1),
                world.name,
                world.overview || world.shortDescription || "",
                world.description || "",
                world.rules || "",
                JSON.stringify(world.locations || []),
                JSON.stringify(world.worldLorebook || []),
                world.createdAt || Date.now()
              ]
            );
          }
        });
      });
      return true;
    },
    clear(): void {
      cache.worlds = [];
      cancelScheduledWrite("worlds");
      enqueueDbWrite("Clear worlds", async (db) => {
        await db.execute("DELETE FROM worlds");
      });
    }
  },

  characters: {
    list(fallback: Character[] = []): Character[] {
      return cache.characters.length ? cache.characters : fallback;
    },
    saveAll(characters: Character[]): boolean {
      cache.characters = cloneJson(characters);
      
      scheduleDbWrite("characters", "Save characters", async (db) => {
        await runInTransaction(db, async () => {
          await db.execute("DELETE FROM characters");
          for (const char of characters) {
            await db.execute(
              SQLITE_CHARACTER_INSERT_SQL,
              [
                char.id, char.name, char.shortDescription || "", char.race || "", char.role || "",
                JSON.stringify(char.aliases || []), JSON.stringify(char.promptKeywords || []),
                char.profileSummary || "", char.defaultOutfit || "", char.description || "",
                char.personality || "", char.appearance || "", char.backstory || "", char.speakingStyle || "",
                char.relationshipToUser || "", char.goals || "", char.characterRules || "",
                char.promptPinned ? 1 : 0, JSON.stringify(char.lorebook || []), char.createdAt || Date.now()
              ]
            );
          }
        });
      });
      return true;
    },
    clear(): void {
      cache.characters = [];
      cancelScheduledWrite("characters");
      enqueueDbWrite("Clear characters", async (db) => {
        await db.execute("DELETE FROM characters");
      });
    },
    removeLegacyChat(_characterId: string): void {
      // Legacy operation, no-op in SQLite
    }
  },

  stories: {
    // Returns lightweight metadata only (Phase 1)
    listMeta(fallback: StoryMeta[] = []): StoryMeta[] {
      return cache.storyMetas.length ? cache.storyMetas : fallback;
    },

    // Loads full story data on demand.
    async loadFull(storyId: string): Promise<Story | null> {
      if (!storyId || !dbPromise) return null;
      
      try {
        const db = await dbPromise;
        const rows = await db.select("SELECT * FROM stories WHERE id = $1", [storyId]) as any[];
        
        if (rows.length === 0) return null;
        
        const row = rows[0];
        return {
          id: row.id,
          title: row.title,
          templateWorldId: row.templateWorldId || row.worldId,
          templateWorldKey: row.templateWorldKey || row.templateWorldId || row.worldId,
          templateWorldVersion: Number(row.templateWorldVersion || 1),
          worldOverlay: row.worldOverlay ? JSON.parse(row.worldOverlay) : { worldPatch: {}, modifiedLocations: {}, addedLocations: [], removedLocationIds: [], modifiedLoreEntries: {}, addedLoreEntries: [], removedLoreEntryIds: [] },
          characterIds: row.characterIds ? JSON.parse(row.characterIds) : [],
          scenario: row.scenario || "",
          greeting: row.greeting || "",
          storyLorebook: row.storyLorebook ? JSON.parse(row.storyLorebook) : [],
          temporaryLorebook: row.temporaryLorebook ? JSON.parse(row.temporaryLorebook) : [],
          storyMemory: row.storyMemory ? JSON.parse(row.storyMemory) : { summary: "", generalJournal: [], characterJournals: {}, tasks: [] },
          currentContext: row.currentContext ? JSON.parse(row.currentContext) : { scene: {}, location: {}, objects: [], recentFacts: {} },
          castState: row.castState ? JSON.parse(row.castState) : { activeCharacters: [], relationships: [] },
          directorNotes: row.directorNotes ? JSON.parse(row.directorNotes) : {},
          createdAt: row.createdAt,
          lastPlayedAt: row.lastPlayedAt || undefined
        };
      } catch (error) {
        console.error("Failed to load full story:", error);
        return null;
      }
    },

    // Legacy method - still supported but will be phased out
    list(fallback: Story[] = []): Story[] {
      return cache.stories.length ? cache.stories : fallback;
    },

    saveAll(stories: Story[]): boolean {
      cache.stories = cloneJson(stories);
      
      scheduleDbWrite("stories", "Save stories", async (db) => {
        await runInTransaction(db, async () => {
          await db.execute("DELETE FROM stories");
          for (const story of stories) {
            await db.execute(
              SQLITE_STORY_INSERT_SQL,
              [
                story.id,
                story.title,
                story.templateWorldId,
                story.templateWorldKey || story.templateWorldId,
                Number(story.templateWorldVersion || 1),
                JSON.stringify(story.worldOverlay || {}),
                JSON.stringify(story.characterIds || []),
                story.scenario || "",
                story.greeting || "",
                JSON.stringify(story.storyLorebook || []),
                JSON.stringify(story.temporaryLorebook || []),
                JSON.stringify(story.storyMemory),
                JSON.stringify(story.currentContext),
                JSON.stringify(story.castState),
                JSON.stringify(story.directorNotes || {}),
                story.createdAt || Date.now(),
                story.lastPlayedAt || null
              ]
            );
          }
        });
      });
      return true;
    },

    // New method for saving a single story.
    saveStory(story: Story): boolean {
      // Update meta cache
      const metaIndex = cache.storyMetas.findIndex(m => m.id === story.id);
      const meta: StoryMeta = storyToMeta(story);
      
      if (metaIndex >= 0) {
        cache.storyMetas[metaIndex] = meta;
      } else {
        cache.storyMetas.push(meta);
      }

      scheduleDbWrite(`story:${story.id}`, "Save story", async (db) => {
        await db.execute(
          `INSERT INTO stories (
            id, title, templateWorldId, templateWorldKey, templateWorldVersion, worldOverlay, characterIds, scenario, greeting,
            storyLorebook, temporaryLorebook, storyMemory, currentContext, castState, directorNotes, createdAt, lastPlayedAt
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT(id) DO UPDATE SET
            title = EXCLUDED.title,
            templateWorldId = EXCLUDED.templateWorldId,
            templateWorldKey = EXCLUDED.templateWorldKey,
            templateWorldVersion = EXCLUDED.templateWorldVersion,
            worldOverlay = EXCLUDED.worldOverlay,
            characterIds = EXCLUDED.characterIds,
            scenario = EXCLUDED.scenario,
            greeting = EXCLUDED.greeting,
            storyLorebook = EXCLUDED.storyLorebook,
            temporaryLorebook = EXCLUDED.temporaryLorebook,
            storyMemory = EXCLUDED.storyMemory,
            currentContext = EXCLUDED.currentContext,
            castState = EXCLUDED.castState,
            directorNotes = EXCLUDED.directorNotes,
            createdAt = EXCLUDED.createdAt,
            lastPlayedAt = EXCLUDED.lastPlayedAt`,
          [
            story.id,
            story.title,
            story.templateWorldId,
            story.templateWorldKey || story.templateWorldId,
            Number(story.templateWorldVersion || 1),
            JSON.stringify(story.worldOverlay || {}),
            JSON.stringify(story.characterIds || []),
            story.scenario || "",
            story.greeting || "",
            JSON.stringify(story.storyLorebook || []),
            JSON.stringify(story.temporaryLorebook || []),
            JSON.stringify(story.storyMemory),
            JSON.stringify(story.currentContext),
            JSON.stringify(story.castState),
            JSON.stringify(story.directorNotes || {}),
            story.createdAt || Date.now(),
            story.lastPlayedAt || null
          ]
        );
      });
      return true;
    },

    deleteStory(storyId: string): boolean {
      if (!storyId) return false;
      cache.stories = cache.stories.filter((story) => story.id !== storyId);
      cache.storyMetas = cache.storyMetas.filter((meta) => meta.id !== storyId);
      delete cache.chats[storyId];
      delete cache.loreMemory[storyId];
      cancelScheduledWrite(`story:${storyId}`);
      cancelScheduledWrite(`chat:${storyId}`);
      cancelScheduledWrite(`lore:${storyId}`);

      enqueueDbWrite("Delete story", async (db) => {
        await runInTransaction(db, async () => {
          await db.execute("DELETE FROM chats WHERE storyId = $1", [storyId]);
          await db.execute("DELETE FROM lore_memory WHERE storyId = $1", [storyId]);
          await db.execute("DELETE FROM stories WHERE id = $1", [storyId]);
        });
      });
      return true;
    },

    clear(): void {
      cache.stories = [];
      cache.storyMetas = [];
      cancelScheduledWrite("stories");
      enqueueDbWrite("Clear stories", async (db) => {
        await db.execute("DELETE FROM stories");
      });
    }
  },

  chats: {
    load(storyId: string, fallback: ChatMessage[] | null = null): ChatMessage[] | null {
      if (!storyId) return cloneJson(fallback);
      return cache.chats[storyId] !== undefined ? cache.chats[storyId] : cloneJson(fallback);
    },
    save(storyId: string, messages: ChatMessage[]): boolean {
      if (!storyId) return false;
      cache.chats[storyId] = cloneJson(messages);
      
      scheduleDbWrite(`chat:${storyId}`, "Save chat", async (db) => {
        await db.execute(
          `INSERT INTO chats (storyId, messages)
           VALUES ($1, $2)
           ON CONFLICT(storyId) DO UPDATE SET messages = EXCLUDED.messages`,
          [storyId, JSON.stringify(messages)]
        );
      });
      return true;
    },
    remove(storyId: string): void {
      if (!storyId) return;
      delete cache.chats[storyId];
      cancelScheduledWrite(`chat:${storyId}`);
      enqueueDbWrite("Remove chat", async (db) => {
        await db.execute("DELETE FROM chats WHERE storyId = $1", [storyId]);
      });
    }
  },

  loreMemory: {
    load(storyId: string, fallback: LoreEntry[] = []): LoreEntry[] {
      if (!storyId) return cloneJson(fallback);
      return cache.loreMemory[storyId] !== undefined ? cache.loreMemory[storyId] : cloneJson(fallback);
    },
    save(storyId: string, loreMemory: LoreEntry[]): boolean {
      if (!storyId) return false;
      cache.loreMemory[storyId] = cloneJson(loreMemory);
      
      scheduleDbWrite(`lore:${storyId}`, "Save lore memory", async (db) => {
        await db.execute(
          `INSERT INTO lore_memory (storyId, activeLore)
           VALUES ($1, $2)
           ON CONFLICT(storyId) DO UPDATE SET activeLore = EXCLUDED.activeLore`,
          [storyId, JSON.stringify(loreMemory)]
        );
      });
      return true;
    },
    remove(storyId: string): void {
      if (!storyId) return;
      delete cache.loreMemory[storyId];
      cancelScheduledWrite(`lore:${storyId}`);
      enqueueDbWrite("Remove lore memory", async (db) => {
        await db.execute("DELETE FROM lore_memory WHERE storyId = $1", [storyId]);
      });
    }
  },

  activeStory: {
    get(): string | null {
      return cache.settings["active_story_id"] || null;
    },
    set(storyId: string): void {
      if (!storyId) return;
      cache.settings["active_story_id"] = storyId;
      
      enqueueDbWrite("Set active story", async (db) => {
        await db.execute(
          `INSERT INTO settings (key, value)
           VALUES ('active_story_id', $1)
           ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
          [storyId]
        );
      });
    },
    clear(): void {
      delete cache.settings["active_story_id"];
      enqueueDbWrite("Clear active story", async (db) => {
        await db.execute("DELETE FROM settings WHERE key = 'active_story_id'");
      });
    }
  },

  settings: {
    getKoboldBaseUrl(fallback: string): string {
      return cache.settings["kobold_base_url"] || fallback;
    },
    setKoboldBaseUrl(value: string): void {
      cache.settings["kobold_base_url"] = value;
      
      enqueueDbWrite("Set Kobold URL", async (db) => {
        await db.execute(
          `INSERT INTO settings (key, value)
           VALUES ('kobold_base_url', $1)
           ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
          [value]
        );
      });
    }
  },

  maintenance: {
    clearKnownData(existingStories: Story[] = [], existingCharacters: Character[] = []): void {
      cache.worlds = [];
      cache.characters = [];
      cache.stories = [];
      cache.storyMetas = [];
      cache.chats = {};
      cache.loreMemory = {};
      cache.settings = {};
      
      for (const key of Array.from(scheduledWriteTasks.keys())) cancelScheduledWrite(key);

      enqueueDbWrite("Factory reset storage", async (db) => {
        await runInTransaction(db, async () => {
          await db.execute("DELETE FROM worlds");
          await db.execute("DELETE FROM characters");
          await db.execute("DELETE FROM stories");
          await db.execute("DELETE FROM chats");
          await db.execute("DELETE FROM lore_memory");
          await db.execute("DELETE FROM settings");
        });
      });
    },
    removeStoryRuntimeData(storyId: string): void {
      delete cache.chats[storyId];
      delete cache.loreMemory[storyId];
      cancelScheduledWrite(`chat:${storyId}`);
      cancelScheduledWrite(`lore:${storyId}`);
      
      enqueueDbWrite("Remove story runtime data", async (db) => {
        await runInTransaction(db, async () => {
          await db.execute("DELETE FROM chats WHERE storyId = $1", [storyId]);
          await db.execute("DELETE FROM lore_memory WHERE storyId = $1", [storyId]);
        });
      });
    }
  }
};
export { isTauri };