-- v1_create_tables.sql
-- Bootstraps the core MIRA relational database schema

CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  overview TEXT,
  description TEXT,
  rules TEXT,
  locations TEXT,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shortDescription TEXT,
  race TEXT,
  role TEXT,
  aliases TEXT,
  promptKeywords TEXT,
  profileSummary TEXT,
  defaultOutfit TEXT,
  description TEXT,
  personality TEXT,
  appearance TEXT,
  backstory TEXT,
  speakingStyle TEXT,
  relationshipToUser TEXT,
  goals TEXT,
  characterRules TEXT,
  promptPinned INTEGER DEFAULT 0,
  lorebook TEXT,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  worldId TEXT,
  characterIds TEXT,
  mainCharacterId TEXT,
  scenario TEXT,
  greeting TEXT,
  storyLorebook TEXT,
  temporaryLorebook TEXT,
  storyMemory TEXT,
  currentContext TEXT,
  castState TEXT,
  directorNotes TEXT,
  createdAt INTEGER,
  FOREIGN KEY(worldId) REFERENCES worlds(id)
);

CREATE TABLE IF NOT EXISTS chats (
  storyId TEXT PRIMARY KEY,
  messages TEXT NOT NULL,
  FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lore_memory (
  storyId TEXT PRIMARY KEY,
  activeLore TEXT NOT NULL,
  FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);