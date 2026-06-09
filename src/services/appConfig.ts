/**
 * App configuration — reads/writes mira.config.json from the OS app config directory.
 *
 * Used by:
 * - sqliteEngine.ts (reads databasePath at startup)
 * - UIContext.tsx (reads/writes databasePath from Settings UI)
 *
 * Config file location (managed by Tauri):
 *   Windows: %APPDATA%/com.mira.app/mira.config.json
 *   macOS:   ~/Library/Application Support/com.mira.app/mira.config.json
 *   Linux:   ~/.config/com.mira.app/mira.config.json
 */

const CONFIG_FILENAME = "mira.config.json";

export interface MiraConfig {
  databasePath?: string;
}

const DEFAULT_CONFIG: MiraConfig = {};

/**
 * Reads the config file. Returns defaults if the file doesn't exist or can't be parsed.
 * Only works in Tauri (uses plugin-fs). Returns defaults in browser mode.
 */
export async function readAppConfig(): Promise<MiraConfig> {
  try {
    const fsApi = await import("@tauri-apps/plugin-fs");
    const fileExists = await fsApi.exists(CONFIG_FILENAME, { baseDir: fsApi.BaseDirectory.AppConfig });
    if (!fileExists) return { ...DEFAULT_CONFIG };

    const content = await fsApi.readTextFile(CONFIG_FILENAME, { baseDir: fsApi.BaseDirectory.AppConfig });
    const parsed = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (error) {
    console.warn("Could not read app config, using defaults:", error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Writes the config file. Creates the directory if needed.
 * Only works in Tauri (uses plugin-fs). No-op in browser mode.
 */
export async function writeAppConfig(config: MiraConfig): Promise<void> {
  try {
    const fsApi = await import("@tauri-apps/plugin-fs");
    await fsApi.writeTextFile(CONFIG_FILENAME, JSON.stringify(config, null, 2), {
      baseDir: fsApi.BaseDirectory.AppConfig,
      createNew: false,
    });
  } catch (error) {
    console.error("Could not write app config:", error);
    throw error;
  }
}

/**
 * Reads just the database path from config. Returns empty string if not set.
 * Synchronous-safe: caches the last read value for sync access after initial async load.
 */
let _cachedDbPath: string | null = null;

export async function loadDatabasePath(): Promise<string> {
  const config = await readAppConfig();
  _cachedDbPath = config.databasePath?.trim() || "";
  return _cachedDbPath;
}

export function getCachedDatabasePath(): string {
  return _cachedDbPath || "";
}
