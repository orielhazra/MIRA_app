// Import/Export hook — JSON file handling for stories, characters, and worlds.

import { normalizeCharacter, normalizeChatMessage, normalizeStory, normalizeWorld } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { cloneJson, createId, downloadJson, readJsonFile, safeFileName } from "../utils/helpers";
import {
  validateIncomingCharacterBundle, validateIncomingWorldBundle,
  validateStoryExportBundle, validateIncomingStoryBundle,
  hydrateBundleLore, remapImportedContextCastIds, remapImportedCastStateIds,
  buildStoryExportBundle
} from "../utils/appHelpers";

export default function useImportExport() {

  function exportCharacter({ character }) {
    downloadJson(`${safeFileName(character.name, "character")}.character.json`, { type: "roleplay-character", version: 1, exportedAt: new Date().toISOString(), character: cloneJson(character) });
  }

  function exportWorld({ world }) {
    downloadJson(`${safeFileName(world.name, "world")}.world.json`, { type: "roleplay-world", version: 1, exportedAt: new Date().toISOString(), world: cloneJson(world) });
  }

  function exportActiveStory(deps) {
    const { activeStory, getWorld, getStoryCharacters, chatHistory, activeStoryId } = deps;
    if (!activeStory) return alert("No active story to export.");
    const bundle = buildStoryExportBundle(activeStory, getWorld, getStoryCharacters, chatHistory, activeStoryId);
    const validation = validateStoryExportBundle(bundle);
    if (!validation.ok) { alert("Story export is incomplete:\n\n" + validation.issues.join("\n")); return; }
    downloadJson(`${safeFileName(activeStory.title, "story")}.story.json`, bundle);
  }

  async function handleImportFile(event, handler) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try { const parsed = await readJsonFile(file); handler(parsed); }
    catch (error) { alert(error.message); }
  }

  function importCharacterBundle(deps) {
    const { parsed, worlds, characters, saveCharacterList, setSelectedCharacterSheetId, setActiveView } = deps;
    const imported = parsed.character || parsed;
    const validation = validateIncomingCharacterBundle(imported);
    if (!validation.ok) return alert(`Invalid character file:\n\n${validation.issues.join("\n")}`);
    const newCharacter = normalizeCharacter({ ...imported, id: createId("character"), name: imported.name || "Imported Character", shortDescription: imported.shortDescription || "Imported character", lorebook: Array.isArray(imported.lorebook) ? imported.lorebook : imported.characterLorebook || [] }, worlds);
    saveCharacterList([...characters, newCharacter]);
    setSelectedCharacterSheetId(newCharacter.id); setActiveView("character");
  }

  function importWorldBundle(deps) {
    const { parsed, worlds, saveWorldList, setSelectedWorldSheetId, setActiveView } = deps;
    const imported = parsed.world || parsed;
    const validation = validateIncomingWorldBundle(imported);
    if (!validation.ok) return alert(`Invalid world file:\n\n${validation.issues.join("\n")}`);
    const newWorld = normalizeWorld({ ...imported, id: createId("world"), name: imported.name || "Imported World", shortDescription: imported.shortDescription || "Imported world", worldLorebook: Array.isArray(imported.worldLorebook) ? imported.worldLorebook : imported.lorebook || [] });
    saveWorldList([...worlds, newWorld]);
    setSelectedWorldSheetId(newWorld.id); setActiveView("world");
  }

  function importStoryBundle(deps) {
    const { parsed, worlds, characters, stories, repository, saveWorldList, saveCharacterList, saveStoryList, ...rest } = deps;
    const bundle = parsed.type === "roleplay-story-bundle" ? parsed : parsed.bundle || parsed;
    const validationMessage = validateIncomingStoryBundle(bundle);
    if (validationMessage) return alert(validationMessage);
    const importedStorySource = cloneJson(bundle.story);
    const importedWorldSource = cloneJson(bundle.world);
    const importedCharacterSources = cloneJson(bundle.characters);
    hydrateBundleLore(bundle, importedStorySource, importedWorldSource, importedCharacterSources);
    const oldToNewCharacterIds = {};
    const newWorld = normalizeWorld({ ...importedWorldSource, id: createId("world"), worldLorebook: Array.isArray(importedWorldSource.worldLorebook) ? importedWorldSource.worldLorebook : importedWorldSource.lorebook || [] });
    const newCharacters = importedCharacterSources.map((c) => {
      const newCharacterId = createId("character"); oldToNewCharacterIds[c.id] = newCharacterId;
      return normalizeCharacter({ ...c, id: newCharacterId, worldId: newWorld.id, lorebook: Array.isArray(c.lorebook) ? c.lorebook : c.characterLorebook || [] }, [newWorld]);
    });
    const mappedCharacterIds = Array.isArray(importedStorySource.characterIds) ? importedStorySource.characterIds.map((oldId) => oldToNewCharacterIds[oldId]).filter(Boolean) : [];
    const mappedMainCharacterId = oldToNewCharacterIds[importedStorySource.mainCharacterId] || mappedCharacterIds[0] || newCharacters[0]?.id || "";
    if (!mappedMainCharacterId) return alert("Could not import story because no valid character was found.");
    const remappedCurrentContext = remapImportedContextCastIds(importedStorySource.currentContext, oldToNewCharacterIds);
    const remappedCastState = remapImportedCastStateIds(importedStorySource.castState, oldToNewCharacterIds);
    const newStory = normalizeStory({
      ...importedStorySource, id: createId("story"), title: importedStorySource.title || "Imported Story",
      worldId: newWorld.id, characterIds: mappedCharacterIds.length ? mappedCharacterIds : [mappedMainCharacterId],
      mainCharacterId: mappedMainCharacterId, currentContext: remappedCurrentContext, castState: remappedCastState,
      storyLorebook: Array.isArray(importedStorySource.storyLorebook) ? importedStorySource.storyLorebook : [], createdAt: Date.now()
    }, [newWorld], newCharacters);
    saveWorldList([...worlds, newWorld]); saveCharacterList([...characters, ...newCharacters]); saveStoryList([...stories, newStory]);
    rest.setActiveStoryId(newStory.id); repository.activeStory.set(newStory.id);
    const importedChat = Array.isArray(bundle.chatHistory) ? bundle.chatHistory.map(normalizeChatMessage) : [{ role: "assistant", content: buildOpeningMessage(newStory, newCharacters.find((c) => c.id === mappedMainCharacterId) || newCharacters[0], newWorld, newCharacters) }];
    rest.setChatHistory(importedChat); repository.chats.save(newStory.id, importedChat);
    rest.setActiveLoreMemory([]); repository.loreMemory.save(newStory.id, [], { quiet: true });
    rest.setSelectedCharacterSheetId(mappedMainCharacterId); rest.setSelectedWorldSheetId(newWorld.id);
    rest.setStoryDraft(null); rest.setActiveView("story");
  }

  return {
    exportCharacter, exportWorld, exportActiveStory,
    handleImportFile, importCharacterBundle, importWorldBundle, importStoryBundle,
  };
}
