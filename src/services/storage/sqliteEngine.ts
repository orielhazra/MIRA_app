import { cloneJson } from "../../utils/helpers";
import { World, Character, Story, ChatMessage, LoreEntry } from "../../types";

// =========================================================================
// ⚙️ CUSTOM DATABASE LOCATION CONFIGURATION
// =========================================================================
// To use a custom location, enter the absolute path to your desired SQLite database file here:
// Examples:
// - Windows: "D:\\MyCustomFolder\\mira.db" (use double backslashes in Windows paths!)
// - macOS: "/Users/shared/mira_db/mira.db"
// - Linux: "/home/username/custom_mira/mira.db"
//
// ⚠️ If left empty (""), M.I.R.A. will fallback to the standard Documents folder: .../Documents/MIRA_Data/mira.db
const CUSTOM_DB_PATH = "G:\\Chatbot Assets\\Memory\\mira.db"; 
// =========================================================================

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
const isTauri = typeof window !== "undefined" && (window as any).__TAURI_IPC__ !== undefined;

if (isTauri) {
  // Dynamically load Tauri Path & SQL APIs only inside desktop wrapper
  dbPromise = (async () => {
    try {
      const SQL = await import("@tauri-apps/plugin-sql");
      
      // 1. Check if a custom hardcoded database path is specified
      if (CUSTOM_DB_PATH.trim() !== "") {
        console.log(`Loading SQLite from custom location: ${CUSTOM_DB_PATH}`);
        return await SQL.default.load(`sqlite:${CUSTOM_DB_PATH.trim()}`);
      }
      
      // 2. Fallback to Dynamic Documents folder: .../Documents/MIRA_Data/mira.db
      const pathApi = await import("@tauri-apps/api/path");
      const docsDir = await pathApi.documentDir();
      const absoluteDbPath = await pathApi.join(docsDir, "MIRA_Data", "mira.db");
      
      console.log(`Loading SQLite from default Documents fallback: ${absoluteDbPath}`);
      return await SQL.default.load(`sqlite:${absoluteDbPath}`);
    } catch (e) {
      console.error("Failed to dynamically load SQLite database:", e);
      throw e;
    }
  })();
}

export const sqliteEngine = {
  async initialize(): Promise<void> {
    if (!isTauri) return;
    const db = await dbPromise;

    try {
      // 1. Load Worlds
      const rawWorlds = await db.select<any[]>("SELECT * FROM worlds");
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
      const rawCharacters = await db.select<any[]>("SELECT * FROM characters");
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
      const rawStories = await db.select<any[]>("SELECT * FROM stories");
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
      const rawChats = await db.select<any[]>("SELECT * FROM chats");
      for (const row of rawChats as any[]) {
        if (row.storyId) {
          cache.chats[row.storyId] = JSON.parse(row.messages);
        }
      }

      // 5. Load Lore Memory
      const rawLoreMemory = await db.select<any[]>("SELECT * FROM lore_memory");
      for (const row of rawLoreMemory as any[]) {
        if (row.storyId) {
          cache.loreMemory[row.storyId] = JSON.parse(row.activeLore);
        }
      }

      // 6. Load Settings
      const rawSettings = await db.select<any[]>("SELECT * FROM settings");
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
              `INSERT INTO worlds (id, name, overview, description, rules, locations, createdAt)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                world.id,
                world.name,
                world.overview || "",
                world.description || "",
                world.rules || "",
                JSON.stringify(world.locations || []),
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
