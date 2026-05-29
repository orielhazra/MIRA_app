// Import/Export hook — JSON file handling for stories, characters, and worlds.

import { Character, World, Story, ChatMessage, StoryCastMember } from "../types/index";
import { normalizeCharacter, normalizeChatMessage, normalizeStory, normalizeWorld } from "../services/normalizers";
import { createEmptyWorldOverlay, getTemplateWorldByKeyAndVersion, resolveEffectiveWorld } from "../services/storyWorld";
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
import { createEmptyCharacterOverlay } from "../constants/defaultData";

interface ExportDeps {
  character?: Character;
  world?: World;
  activeStory?: Story;
  getWorld?: (id: string) => World | undefined | null;
  getStoryCharacters?: (story: Story) => Character[];
  chatHistory?: ChatMessage[];
}

interface CharacterImportDeps {
  parsed: any;
  worlds: World[];
  characters: Character[];
  saveCharacterList: (characters: Character[]) => void;
  setSelectedCharacterSheetId: (id: string) => void;
  setActiveView: (view: string) => void;
}

interface WorldImportDeps {
  parsed: any;
  worlds: World[];
  saveWorldList: (worlds: World[]) => void;
  setSelectedWorldSheetId: (id: string) => void;
  setActiveView: (view: string) => void;
}

interface StoryImportDeps {
  parsed: any;
  worlds: World[];
  characters: Character[];
  saveWorldList: (worlds: World[]) => void;
  saveCharacterList: (characters: Character[]) => void;
  saveActiveStory: (story: Story) => void;
  setActiveStory: (story: Story) => void;
  repository: any;
  setChatHistory: (history: ChatMessage[]) => void;
  setActiveLoreMemory: (memory: any[]) => void;
  setSelectedCharacterSheetId: (id: string) => void;
  setSelectedWorldSheetId: (id: string) => void;
  setStoryDraft: (draft: any) => void;
  setActiveView: (view: string) => void;
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
    const { activeStory, getWorld, getStoryCharacters, chatHistory } = deps;
    if (!activeStory) return alert("No active story to export.");

    const bundle = buildStoryExportBundle(activeStory, getWorld!, getStoryCharacters!, chatHistory!);
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

  function importCharacterBundle({
    parsed,
    characters,
    saveCharacterList,
    setSelectedCharacterSheetId,
    setActiveView,
  }: CharacterImportDeps) {
    const imported = parsed.character || parsed;
    const validation = validateIncomingCharacterBundle(imported);
    if (!validation.ok) {
      alert(`Invalid character file:\n\n${validation.issues.join("\n")}`);
      return;
    }

    const newCharacter = normalizeCharacter(
      {
        ...imported,
        id: createId("character"),
        name: imported.name || "Imported Character",
        shortDescription: imported.shortDescription || "Imported character",
        lorebook: Array.isArray(imported.lorebook) ? imported.lorebook : imported.characterLorebook || [],
      }
    );

    saveCharacterList([...characters, newCharacter]);
    setSelectedCharacterSheetId(newCharacter.id);
    setActiveView("character");
  }

  function importWorldBundle({
    parsed,
    worlds,
    saveWorldList,
    setSelectedWorldSheetId,
    setActiveView,
  }: WorldImportDeps) {
    const imported = parsed.world || parsed;
    const validation = validateIncomingWorldBundle(imported);
    if (!validation.ok) {
      alert(`Invalid world file:\n\n${validation.issues.join("\n")}`);
      return;
    }

    const importedTemplateKey = imported.templateKey || imported.id || createId("world_template");
    const importedTemplateVersion = Number(imported.templateVersion || 1);
    const existingWorld = getTemplateWorldByKeyAndVersion(importedTemplateKey, importedTemplateVersion, worlds);
    const newWorld = existingWorld || normalizeWorld({
      ...imported,
      id: createId("world"),
      templateKey: importedTemplateKey,
      templateVersion: importedTemplateVersion,
      name: imported.name || "Imported World",
      shortDescription: imported.shortDescription || "Imported world",
      worldLorebook: Array.isArray(imported.worldLorebook) ? imported.worldLorebook : imported.lorebook || [],
    });

    if (!existingWorld) {
      saveWorldList([...worlds, newWorld]);
    }
    setSelectedWorldSheetId(newWorld.id);
    setActiveView("world");
  }

  function importStoryBundle({
    parsed,
    worlds,
    characters,
    saveWorldList,
    saveCharacterList,
    saveActiveStory,
    setActiveStory,
    repository,
    setChatHistory,
    setActiveLoreMemory,
    setSelectedCharacterSheetId,
    setSelectedWorldSheetId,
    setStoryDraft,
    setActiveView,
  }: StoryImportDeps) {
    const bundle = parsed.type === "roleplay-story-bundle" ? parsed : parsed.bundle || parsed;
    const validationMessage = validateIncomingStoryBundle(bundle);
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    const importedStorySource = cloneJson(bundle.story);
    const importedWorldSource = cloneJson(bundle.world);
    const importedCharacterSources = cloneJson(bundle.characters);
    hydrateBundleLore(bundle, importedStorySource, importedWorldSource, importedCharacterSources);

    const oldToNewCharacterIds: Record<string, string> = {};
    const oldToNewCastMemberIds: Record<string, string> = {};

    const importedTemplateKey = importedStorySource.templateWorldKey || importedWorldSource.templateKey || importedWorldSource.id || createId("world_template");
    const importedTemplateVersion = Number(importedStorySource.templateWorldVersion || importedWorldSource.templateVersion || 1);
    const reusedWorld = getTemplateWorldByKeyAndVersion(importedTemplateKey, importedTemplateVersion, worlds);
    const newWorld = reusedWorld || normalizeWorld({
      ...importedWorldSource,
      id: createId("world"),
      templateKey: importedTemplateKey,
      templateVersion: importedTemplateVersion,
      worldLorebook: Array.isArray(importedWorldSource.worldLorebook)
        ? importedWorldSource.worldLorebook
        : importedWorldSource.lorebook || [],
    });

    const newCharacters = importedCharacterSources.map((characterSource: any) => {
      const newCharacterId = createId("character");
      oldToNewCharacterIds[characterSource.id] = newCharacterId;
      return normalizeCharacter(
        {
          ...characterSource,
          id: newCharacterId,
          lorebook: Array.isArray(characterSource.lorebook)
            ? characterSource.lorebook
            : characterSource.characterLorebook || [],
        }
      );
    });

    // Handle cast member remapping
    let castMembers: StoryCastMember[] = [];
    if (Array.isArray(importedStorySource.castMembers)) {
      castMembers = importedStorySource.castMembers.map((m: any) => {
        const newCastMemberId = createId("cast");
        oldToNewCastMemberIds[m.id] = newCastMemberId;
        return {
          ...m,
          id: newCastMemberId,
          templateCharacterId: oldToNewCharacterIds[m.templateCharacterId] || m.templateCharacterId
        };
      });
    } else if (Array.isArray(importedStorySource.characterIds)) {
      castMembers = importedStorySource.characterIds.map((oldId: string) => {
        const newCastMemberId = createId("cast");
        oldToNewCastMemberIds[oldId] = newCastMemberId;
        return {
          id: newCastMemberId,
          templateCharacterId: oldToNewCharacterIds[oldId] || oldId,
          templateCharacterKey: "",
          templateCharacterVersion: 1,
          overlay: createEmptyCharacterOverlay()
        };
      });
    }

    const remappedCurrentContext = remapImportedContextCastIds(importedStorySource.currentContext, oldToNewCastMemberIds);
    const remappedCastState = remapImportedCastStateIds(importedStorySource.castState, oldToNewCastMemberIds);

    const newStory = normalizeStory(
      {
        ...importedStorySource,
        id: createId("story"),
        title: importedStorySource.title || "Imported Story",
        templateWorldId: newWorld.id,
        templateWorldKey: importedStorySource.templateWorldKey || newWorld.templateKey,
        templateWorldVersion: Number(importedStorySource.templateWorldVersion || newWorld.templateVersion || 1),
        worldOverlay: importedStorySource.worldOverlay || createEmptyWorldOverlay(),
        castMembers,
        currentContext: remappedCurrentContext,
        castState: remappedCastState,
        storyLorebook: Array.isArray(importedStorySource.storyLorebook) ? importedStorySource.storyLorebook : [],
        createdAt: Date.now(),
      },
      [newWorld],
      newCharacters
    );

    if (!reusedWorld) {
      saveWorldList([...worlds, newWorld]);
    }

    if (newCharacters.length > 0) {
      saveCharacterList([...characters, ...newCharacters]);
    }

    setActiveStory(newStory);
    saveActiveStory(newStory);

    repository?.activeStory.set(newStory.id);

    const effectiveWorld = resolveEffectiveWorld(newStory, [newWorld]) || newWorld;
    const fallbackCharacter = newCharacters[0];
    const importedChat = Array.isArray(bundle.chatHistory)
      ? bundle.chatHistory.map(normalizeChatMessage)
      : [
          {
            role: "assistant",
            content: buildOpeningMessage(
              newStory,
              fallbackCharacter,
              effectiveWorld,
              newCharacters
            ),
          },
        ];

    setChatHistory(importedChat);
    repository?.chats.save(newStory.id, importedChat);
    setActiveLoreMemory([]);
    repository?.loreMemory.save(newStory.id, []);
    setSelectedCharacterSheetId(fallbackCharacter?.id || "");
    setSelectedWorldSheetId(newWorld.id);
    setStoryDraft(null);
    setActiveView("story");
  }

  return {
    exportCharacter,
    exportWorld,
    exportActiveStory,
    handleImportFile,
    importCharacterBundle,
    importWorldBundle,
    importStoryBundle,
  };
}
