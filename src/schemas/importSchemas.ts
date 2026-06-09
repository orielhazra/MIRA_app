/**
 * Zod schemas for import validation.
 * Validates structure before the permissive normalizers run.
 * These are intentionally loose on optional fields — the normalizers handle defaults.
 */

import { z } from "zod";

/** Maximum import file size in bytes (10MB). */
export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

// --- Shared sub-schemas ---

const LoreEntrySchema = z.object({
  name: z.string().optional(),
  keywords: z.union([z.array(z.string()), z.string()]).optional(),
  content: z.string().optional(),
  enabled: z.boolean().optional(),
  alwaysOn: z.boolean().optional(),
  priority: z.number().optional(),
}).passthrough();

const LocationSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
}).passthrough();

// --- Character import ---

export const CharacterImportSchema = z.object({
  name: z.string().min(1, "Character name is required."),
  shortDescription: z.string().optional(),
  race: z.string().optional(),
  role: z.string().optional(),
  description: z.string().optional(),
  personality: z.string().optional(),
  appearance: z.string().optional(),
  backstory: z.string().optional(),
  speakingStyle: z.string().optional(),
  goals: z.string().optional(),
  lorebook: z.array(LoreEntrySchema).optional(),
  characterLorebook: z.array(LoreEntrySchema).optional(),
}).passthrough();

/** Accepts `{ character: {...} }` wrapper or bare character object. */
export const CharacterBundleSchema = z.union([
  z.object({ character: CharacterImportSchema }).passthrough(),
  CharacterImportSchema,
]);

// --- World import ---

export const WorldImportSchema = z.object({
  name: z.string().min(1, "World name is required."),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
  locations: z.array(LocationSchema).optional(),
  worldLorebook: z.array(LoreEntrySchema).optional(),
  lorebook: z.array(LoreEntrySchema).optional(),
}).passthrough();

/** Accepts `{ world: {...} }` wrapper or bare world object. */
export const WorldBundleSchema = z.union([
  z.object({ world: WorldImportSchema }).passthrough(),
  WorldImportSchema,
]);

// --- Story bundle import ---

const StoryDataSchema = z.object({
  title: z.string().optional(),
  templateWorldId: z.string().optional(),
  greeting: z.string().optional(),
}).passthrough();

const StoryCharacterSchema = z.object({
  name: z.string().min(1, "Character needs a name."),
}).passthrough();

export const StoryBundleImportSchema = z.object({
  story: StoryDataSchema,
  world: WorldImportSchema,
  characters: z.array(StoryCharacterSchema).min(1, "At least one character is required."),
  chatHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
  }).passthrough()).optional(),
}).passthrough();

// --- Story export validation ---

export const StoryExportBundleSchema = z.object({
  story: z.object({
    templateWorldId: z.string().min(1, "Story templateWorldId is missing."),
    templateWorldKey: z.string().min(1, "Story templateWorldKey is missing."),
    storyLorebook: z.array(z.any()),
    worldOverlay: z.object({}).passthrough(),
  }).passthrough(),
  world: z.object({
    templateKey: z.string().min(1, "World templateKey is missing."),
    worldLorebook: z.array(z.any()),
  }).passthrough(),
  characters: z.array(z.object({
    lorebook: z.array(z.any()),
  }).passthrough()).min(1, "At least one character is required."),
}).passthrough();

// --- Helpers ---

/**
 * Formats Zod validation errors into a user-friendly string.
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("\n");
}
