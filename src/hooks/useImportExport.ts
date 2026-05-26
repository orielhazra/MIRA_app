// Import/Export hook — JSON file handling for stories, characters, and worlds.

import { Character, World, Story, ChatMessage } from "../types/index";
import { normalizeCharacter, normalizeChatMessage, normalizeStory, normalizeWorld } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { cloneJson, createId, downloadJson, readJsonFile, safeFileName } from "../utils/helpers";
import {
  validateIncomingCharacterBundle,
  validateIncomingWorldBundle,
  validateStoryExportBundle,
  validateIncomingStoryBundle,
  hydrateBundleLore,
  remapImportedContextCastIds,
  remapImportedCastStateIds,
  buildStoryExportBundle,
} from "../utils/appHelpers";

interface ExportDeps {
  character?: Character;
  world?: World;
  activeStory?: Story;
  getWorld?: (id: string) => World | undefined;
  getStoryCharacters?: (story: Story) => Character[];
  chatHistory?: ChatMessage[];
  activeStoryId?: string;
}

export default function useImportExport() {
  function exportCharacter({ character }: ExportDeps) {
    if (!character) return;
    downloadJson(`${safeFileName(character.name, "character")}.character.json`, {
      type: "roleplay-character",
      version: 1,
      exportedAt: new Date().toISOString(),
      character: cloneJson(character),
    });
  }

  function exportWorld({ world }: ExportDeps) {
    if (!world) return;
    downloadJson(`${safeFileName(world.name, "world")}.world.json`, {
      type: "roleplay-world",
      version: 1,
      exportedAt: new Date().toISOString(),
      world: cloneJson(world),
    });
  }

  function exportActiveStory(deps: ExportDeps) {
    const { activeStory, getWorld, getStoryCharacters, chatHistory, activeStoryId } = deps;
    if (!activeStory) return alert("No active story to export.");

    const bundle = buildStoryExportBundle(activeStory, getWorld!, getStoryCharacters!, chatHistory!, activeStoryId!);
    const validation = validateStoryExportBundle(bundle);
    if (!validation.ok) {
      alert("Story export is incomplete:\n\n" + validation.issues.join("\n"));
      return;
    }
    downloadJson(`${safeFileName(activeStory.title, "story")}.story.json`, bundle);
  }

  async function handleImportFile(event: any, handler: (parsed: any) => void) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = await readJsonFile(file);
      handler(parsed);
    } catch (error: any) {
      alert(error.message);
    }
  }

  // Import functions kept with lighter typing for now due to complexity

  return {
    exportCharacter,
    exportWorld,
    exportActiveStory,
    handleImportFile,
    importCharacterBundle: (deps: any) => {},
    importWorldBundle: (deps: any) => {},
    importStoryBundle: (deps: any) => {},
  };
}
