export const SQLITE_EXPECTED_COLUMNS = {
  worlds: [
    "id",
    "templateKey",
    "templateVersion",
    "name",
    "overview",
    "description",
    "rules",
    "locations",
    "worldLorebook",
    "createdAt",
  ],
  characters: [
    "id",
    "templateKey",
    "templateVersion",
    "name",
    "shortDescription",
    "race",
    "role",
    "aliases",
    "promptKeywords",
    "profileSummary",
    "defaultOutfit",
    "description",
    "personality",
    "appearance",
    "backstory",
    "speakingStyle",
    "relationshipToUser",
    "goals",
    "characterRules",
    "promptPinned",
    "lorebook",
    "createdAt",
  ],
  stories: [
    "id",
    "title",
    "templateWorldId",
    "templateWorldKey",
    "templateWorldVersion",
    "worldOverlay",
    "castMembers",
    "userProfile",
    "scenario",
    "greeting",
    "storyLorebook",
    "temporaryLorebook",
    "storyMemory",
    "currentContext",
    "castState",
    "directorNotes",
    "createdAt",
    "lastPlayedAt",
  ],
  personas: ["id", "name", "description", "appearance", "backstory", "createdAt"],
  chats: ["storyId", "messages"],
  lore_memory: ["storyId", "activeLore"],
  settings: ["key", "value"],
} as const;

export const SQLITE_CREATE_TABLE_STATEMENTS = {
  worlds:
    "CREATE TABLE IF NOT EXISTS worlds (id TEXT PRIMARY KEY, templateKey TEXT, templateVersion INTEGER DEFAULT 1, name TEXT NOT NULL, overview TEXT, description TEXT, rules TEXT, locations TEXT, worldLorebook TEXT, createdAt INTEGER);",
  characters:
    "CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, templateKey TEXT, templateVersion INTEGER DEFAULT 1, name TEXT NOT NULL, shortDescription TEXT, race TEXT, role TEXT, aliases TEXT, promptKeywords TEXT, profileSummary TEXT, defaultOutfit TEXT, description TEXT, personality TEXT, appearance TEXT, backstory TEXT, speakingStyle TEXT, relationshipToUser TEXT, goals TEXT, characterRules TEXT, promptPinned INTEGER DEFAULT 0, lorebook TEXT, createdAt INTEGER);",
  stories:
    "CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY, title TEXT NOT NULL, templateWorldId TEXT, templateWorldKey TEXT, templateWorldVersion INTEGER DEFAULT 1, worldOverlay TEXT, castMembers TEXT, userProfile TEXT, scenario TEXT, greeting TEXT, storyLorebook TEXT, temporaryLorebook TEXT, storyMemory TEXT, currentContext TEXT, castState TEXT, directorNotes TEXT, createdAt INTEGER, lastPlayedAt INTEGER, FOREIGN KEY(templateWorldId) REFERENCES worlds(id));",
  personas:
    "CREATE TABLE IF NOT EXISTS personas (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, appearance TEXT, backstory TEXT, createdAt INTEGER);",
  chats:
    "CREATE TABLE IF NOT EXISTS chats (storyId TEXT PRIMARY KEY, messages TEXT NOT NULL, FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE);",
  lore_memory:
    "CREATE TABLE IF NOT EXISTS lore_memory (storyId TEXT PRIMARY KEY, activeLore TEXT NOT NULL, FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE);",
  settings:
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
} as const;

export const SQLITE_SCHEMA_PATCHES = [
  {
    table: "characters",
    column: "templateKey",
    sql: "ALTER TABLE characters ADD COLUMN templateKey TEXT",
  },
  {
    table: "characters",
    column: "templateVersion",
    sql: "ALTER TABLE characters ADD COLUMN templateVersion INTEGER DEFAULT 1",
  },
  {
    table: "stories",
    column: "castMembers",
    sql: "ALTER TABLE stories ADD COLUMN castMembers TEXT",
  },
  {
    table: "stories",
    column: "userProfile",
    sql: "ALTER TABLE stories ADD COLUMN userProfile TEXT",
  },
] as const;

export const SQLITE_WORLD_INSERT_SQL = `INSERT INTO worlds (id, templateKey, templateVersion, name, overview, description, rules, locations, worldLorebook, createdAt)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

export const SQLITE_CHARACTER_INSERT_SQL = `INSERT INTO characters (
  id, templateKey, templateVersion, name, shortDescription, race, role, aliases, promptKeywords,
  profileSummary, defaultOutfit, description, personality, appearance,
  backstory, speakingStyle, relationshipToUser, goals, characterRules,
  promptPinned, lorebook, createdAt
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;

export const SQLITE_STORY_INSERT_SQL = `INSERT INTO stories (
  id, title, templateWorldId, templateWorldKey, templateWorldVersion, worldOverlay, castMembers, userProfile, scenario, greeting,
  storyLorebook, temporaryLorebook, storyMemory, currentContext, castState, directorNotes, createdAt, lastPlayedAt
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`;

export const SQLITE_PERSONA_INSERT_SQL = `INSERT INTO personas (id, name, description, appearance, backstory, createdAt)
 VALUES ($1, $2, $3, $4, $5, $6)`;

export function getMissingColumns(actualColumns: string[], expectedColumns: readonly string[]): string[] {
  const actual = new Set(actualColumns);
  return expectedColumns.filter((column) => !actual.has(column));
}

export async function ensureSqliteSchema(db: any): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");

  for (const statement of Object.values(SQLITE_CREATE_TABLE_STATEMENTS)) {
    await db.execute(statement);
  }

  for (const patch of SQLITE_SCHEMA_PATCHES) {
    const columns = (await db.select(`PRAGMA table_info(${patch.table})`)) as any[];
    const actualColumns = columns.map((column) => String(column.name || ""));
    if (!actualColumns.includes(patch.column)) {
      await db.execute(patch.sql);
    }
  }
}
