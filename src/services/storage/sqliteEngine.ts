import { cloneJson } from "../../utils/helpers";
import { CUSTOM_DB_PATH } from "../../constants/defaultData";
import { World, Character, Story, ChatMessage, LoreEntry } from "../../types";



interface SqliteCache {
  worlds: World[];
  characters: Character[];
  stories: Story[];
  chats: Record<string, ChatMessage[]>;
  loreMemory: Record<string, LoreEntry[]>;
  settings: Record<string, string>;
}

const cache: SqliteCache = {
  worlds: [],
  characters: [],
  stories: [],
  chats: {},
  loreMemory: {},
  settings: {}
};

let dbPromise: Promise<any> | null = null;
const isTauri = typeof window !== "undefined" && ((window as any).__TAURI_INTERNALS__ !== undefined || (window as any).__TAURI_IPC__ !== undefined);
const DEFAULT_TAURI_DB_URL = "sqlite:mira.db";

function shouldUseCustomDbPath(customDbPath: string): boolean {
  if (!customDbPath) return false;

  const isWindowsStyleAbsolutePath = /^[A-Za-z]:\\/.test(customDbPath);
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

async function ensureWorldLorebookColumn(db: any): Promise<void> {
  const worldColumns = (await db.select("PRAGMA table_info(worlds)")) as any[];
  const hasWorldLorebook = worldColumns.some((column: any) => column.name === "worldLorebook");

  if (!hasWorldLorebook) {
    await db.execute("ALTER TABLE worlds ADD COLUMN worldLorebook TEXT");
  }
}

if (isTauri) {
  dbPromise = loadTauriDatabase();
}

export const sqliteEngine = {
  async initialize(): Promise<void> {
    if (!isTauri) return;
    const db = await dbPromise;


    try {
      // PHASE 5: LocalStorage Legacy Data Migration
      const hasLegacyMigration = localStorage.getItem("mira_legacy_migrated");
      const legacyWorlds = localStorage.getItem("roleplay_worlds");
      
      if (!hasLegacyMigration && legacyWorlds) {
        console.log("Found legacy LocalStorage data. Migrating to SQLite...");
        
        try {
          const lWorlds = JSON.parse(legacyWorlds) || [];
          const lChars = JSON.parse(localStorage.getItem("roleplay_characters") || "[]");
          const lStories = JSON.parse(localStorage.getItem("roleplay_stories") || "[]");
          
          // Using the sqliteEngine methods handles caching and inserts gracefully
          if (lWorlds.length > 0) sqliteEngine.worlds.saveAll(lWorlds);
          if (lChars.length > 0) sqliteEngine.characters.saveAll(lChars);
          if (lStories.length > 0) sqliteEngine.stories.saveAll(lStories);
          
          for (const s of lStories) {
            const chatStr = localStorage.getItem(`roleplay_story_chat_${s.id}`);
            if (chatStr) sqliteEngine.chats.save(s.id, JSON.parse(chatStr));
            
            const loreStr = localStorage.getItem(`roleplay_story_lore_memory_${s.id}`);
            if (loreStr) sqliteEngine.loreMemory.save(s.id, JSON.parse(loreStr));
          }
          
          const actStory = localStorage.getItem("active_story_id");
          if (actStory) sqliteEngine.activeStory.set(actStory);
          
          const kbUrl = localStorage.getItem("kobold_base_url");
          if (kbUrl) sqliteEngine.settings.setKoboldBaseUrl(kbUrl);

          localStorage.setItem("mira_legacy_migrated", "true");
          // Phase 5.3 Deprecate LocalStorage keys
          localStorage.clear();
          console.log("Legacy data successfully migrated. LocalStorage cleared.");
        } catch (err) {
          console.error("Local Storage Migration failed:", err);
        }
      }

      // AWAIT TABLE CREATION (Edge case if frontend boots faster than backend migration on custom path)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS worlds (id TEXT PRIMARY KEY, name TEXT NOT NULL, overview TEXT, description TEXT, rules TEXT, locations TEXT, worldLorebook TEXT, createdAt INTEGER);
      `);
      await ensureWorldLorebookColumn(db);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, name TEXT NOT NULL, shortDescription TEXT, race TEXT, role TEXT, aliases TEXT, promptKeywords TEXT, profileSummary TEXT, defaultOutfit TEXT, description TEXT, personality TEXT, appearance TEXT, backstory TEXT, speakingStyle TEXT, relationshipToUser TEXT, goals TEXT, characterRules TEXT, promptPinned INTEGER DEFAULT 0, lorebook TEXT, createdAt INTEGER);
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY, title TEXT NOT NULL, worldId TEXT, characterIds TEXT, mainCharacterId TEXT, scenario TEXT, greeting TEXT, storyLorebook TEXT, temporaryLorebook TEXT, storyMemory TEXT, currentContext TEXT, castState TEXT, directorNotes TEXT, createdAt INTEGER, FOREIGN KEY(worldId) REFERENCES worlds(id));
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS chats (storyId TEXT PRIMARY KEY, messages TEXT NOT NULL, FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE);
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS lore_memory (storyId TEXT PRIMARY KEY, activeLore TEXT NOT NULL, FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE);
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      `);

      // 1. Load Worlds
      const rawWorlds = (await db.select("SELECT * FROM worlds")) as any[];
      cache.worlds = rawWorlds.map((row: any) => ({
        id: row.id,
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

      // 3. Load Stories
      const rawStories = (await db.select("SELECT * FROM stories")) as any[];
      cache.stories = rawStories.map((row: any) => ({
        id: row.id,
        title: row.title,
        worldId: row.worldId,
        characterIds: row.characterIds ? JSON.parse(row.characterIds) : [],
        mainCharacterId: row.mainCharacterId || "",
        scenario: row.scenario || "",
        greeting: row.greeting || "",
        storyLorebook: row.storyLorebook ? JSON.parse(row.storyLorebook) : [],
        temporaryLorebook: row.temporaryLorebook ? JSON.parse(row.temporaryLorebook) : [],
        storyMemory: row.storyMemory ? JSON.parse(row.storyMemory) : { summary: "", generalJournal: [], characterJournals: {}, tasks: [] },
        currentContext: row.currentContext ? JSON.parse(row.currentContext) : { scene: {}, location: {}, objects: [], recentFacts: {} },
        castState: row.castState ? JSON.parse(row.castState) : { activeCharacters: [], relationships: [] },
        directorNotes: row.directorNotes ? JSON.parse(row.directorNotes) : {},
        createdAt: row.createdAt
      }));

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
      cache.worlds = cloneJson(worlds); // Sync cache immediately
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute("DELETE FROM worlds"); // Clear old records
          for (const world of worlds) {
            await db.execute(
              `INSERT INTO worlds (id, name, overview, description, rules, locations, worldLorebook, createdAt)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                world.id,
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
        } catch (e) {
          console.error("Background SQLite Save Worlds failed:", e);
        }
      });
      return true;
    },
    clear(): void {
      cache.worlds = [];
      dbPromise?.then((db) => db.execute("DELETE FROM worlds"));
    }
  },

  characters: {
    list(fallback: Character[] = []): Character[] {
      return cache.characters.length ? cache.characters : fallback;
    },
    saveAll(characters: Character[]): boolean {
      cache.characters = cloneJson(characters); // Sync cache immediately
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute("DELETE FROM characters");
          for (const char of characters) {
            await db.execute(
              `INSERT INTO characters (
                id, name, shortDescription, race, role, aliases, promptKeywords,
                profileSummary, defaultOutfit, description, personality, appearance,
                backstory, speakingStyle, relationshipToUser, goals, characterRules,
                promptPinned, lorebook, createdAt
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
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
        } catch (e) {
          console.error("Background SQLite Save Characters failed:", e);
        }
      });
      return true;
    },
    clear(): void {
      cache.characters = [];
      dbPromise?.then((db) => db.execute("DELETE FROM characters"));
    },
    removeLegacyChat(_characterId: string): void {
      // Legacy operation, no-op in SQLite
    }
  },

  stories: {
    list(fallback: Story[] = []): Story[] {
      return cache.stories.length ? cache.stories : fallback;
    },
    saveAll(stories: Story[]): boolean {
      cache.stories = cloneJson(stories); // Sync cache immediately
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute("DELETE FROM stories");
          for (const story of stories) {
            await db.execute(
              `INSERT INTO stories (
                id, title, worldId, characterIds, mainCharacterId, scenario, greeting,
                storyLorebook, temporaryLorebook, storyMemory, currentContext, castState, directorNotes, createdAt
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                story.id, story.title, story.worldId, JSON.stringify(story.characterIds || []),
                story.mainCharacterId, story.scenario || "", story.greeting || "",
                JSON.stringify(story.storyLorebook || []), JSON.stringify(story.temporaryLorebook || []),
                JSON.stringify(story.storyMemory), JSON.stringify(story.currentContext),
                JSON.stringify(story.castState), JSON.stringify(story.directorNotes || {}),
                story.createdAt || Date.now()
              ]
            );
          }
        } catch (e) {
          console.error("Background SQLite Save Stories failed:", e);
        }
      });
      return true;
    },
    clear(): void {
      cache.stories = [];
      dbPromise?.then((db) => db.execute("DELETE FROM stories"));
    }
  },

  chats: {
    load(storyId: string, fallback: ChatMessage[] | null = null): ChatMessage[] | null {
      if (!storyId) return cloneJson(fallback);
      return cache.chats[storyId] !== undefined ? cache.chats[storyId] : cloneJson(fallback);
    },
    save(storyId: string, messages: ChatMessage[]): boolean {
      if (!storyId) return false;
      cache.chats[storyId] = cloneJson(messages); // Sync cache immediately
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute(
            `INSERT INTO chats (storyId, messages)
             VALUES ($1, $2)
             ON CONFLICT(storyId) DO UPDATE SET messages = EXCLUDED.messages`,
            [storyId, JSON.stringify(messages)]
          );
        } catch (e) {
          console.error("Background SQLite Save Chat failed:", e);
        }
      });
      return true;
    },
    remove(storyId: string): void {
      if (!storyId) return;
      delete cache.chats[storyId];
      dbPromise?.then((db) => db.execute("DELETE FROM chats WHERE storyId = $1", [storyId]));
    }
  },

  loreMemory: {
    load(storyId: string, fallback: LoreEntry[] = []): LoreEntry[] {
      if (!storyId) return cloneJson(fallback);
      return cache.loreMemory[storyId] !== undefined ? cache.loreMemory[storyId] : cloneJson(fallback);
    },
    save(storyId: string, loreMemory: LoreEntry[]): boolean {
      if (!storyId) return false;
      cache.loreMemory[storyId] = cloneJson(loreMemory); // Sync cache immediately
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute(
            `INSERT INTO lore_memory (storyId, activeLore)
             VALUES ($1, $2)
             ON CONFLICT(storyId) DO UPDATE SET activeLore = EXCLUDED.activeLore`,
            [storyId, JSON.stringify(loreMemory)]
          );
        } catch (e) {
          console.error("Background SQLite Save Lore Memory failed:", e);
        }
      });
      return true;
    },
    remove(storyId: string): void {
      if (!storyId) return;
      delete cache.loreMemory[storyId];
      dbPromise?.then((db) => db.execute("DELETE FROM lore_memory WHERE storyId = $1", [storyId]));
    }
  },

  activeStory: {
    get(): string | null {
      return cache.settings["active_story_id"] || null;
    },
    set(storyId: string): void {
      if (!storyId) return;
      cache.settings["active_story_id"] = storyId;
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute(
            `INSERT INTO settings (key, value)
             VALUES ('active_story_id', $1)
             ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
            [storyId]
          );
        } catch (e) {
          console.error("Background SQLite Set Active Story failed:", e);
        }
      });
    },
    clear(): void {
      delete cache.settings["active_story_id"];
      dbPromise?.then((db) => db.execute("DELETE FROM settings WHERE key = 'active_story_id'"));
    }
  },

  settings: {
    getKoboldBaseUrl(fallback: string): string {
      return cache.settings["kobold_base_url"] || fallback;
    },
    setKoboldBaseUrl(value: string): void {
      cache.settings["kobold_base_url"] = value;
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute(
            `INSERT INTO settings (key, value)
             VALUES ('kobold_base_url', $1)
             ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
            [value]
          );
        } catch (e) {
          console.error("Background SQLite Set Kobold URL failed:", e);
        }
      });
    }
  },

  maintenance: {
    clearKnownData(existingStories: Story[] = [], existingCharacters: Character[] = []): void {
      cache.worlds = [];
      cache.characters = [];
      cache.stories = [];
      cache.chats = {};
      cache.loreMemory = {};
      cache.settings = {};
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute("DELETE FROM worlds");
          await db.execute("DELETE FROM characters");
          await db.execute("DELETE FROM stories");
          await db.execute("DELETE FROM chats");
          await db.execute("DELETE FROM lore_memory");
          await db.execute("DELETE FROM settings");
        } catch (e) {
          console.error("Background SQLite Maintenance clear failed:", e);
        }
      });
    },
    removeStoryRuntimeData(storyId: string): void {
      delete cache.chats[storyId];
      delete cache.loreMemory[storyId];
      
      dbPromise?.then(async (db) => {
        try {
          await db.execute("DELETE FROM chats WHERE storyId = $1", [storyId]);
          await db.execute("DELETE FROM lore_memory WHERE storyId = $1", [storyId]);
        } catch (e) {
          console.error("Background SQLite Story Runtime clear failed:", e);
        }
      });
    }
  }
};
export { isTauri };
