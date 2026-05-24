import { useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import ChatHeader from "./components/ChatHeader.jsx";
import ChatView, { getMessageDisplayText, isAssistantMessageWithOptions } from "./components/ChatView.jsx";
import Composer from "./components/Composer.jsx";
import EditorPanel from "./components/EditorPanel.jsx";
import DebugModal from "./components/DebugModal.jsx";
import PendingUpdatesPanel from "./components/PendingUpdatesPanel.jsx";
import { Landing, StoryCreationSheet, CharacterSheet, WorldSheet } from "./components/Sheets.jsx";
import { defaultCharacters, defaultStories, defaultWorlds, DEFAULT_DIRECTOR_NOTES, GENERATION_SETTINGS } from "./constants/defaultData.js";
import { repository } from "./services/repository.js";
import { normalizeCastState, normalizeCharacter, normalizeChatMessage, normalizeCurrentContext, normalizeDirectorNotes, normalizeStory, normalizeStoryMemory, normalizeStoredLorebook, normalizeWorld } from "./services/normalizers.js";
import { buildMessagesForRequest, buildOpeningMessage } from "./services/prompt.js";
import { cleanGeneratedReply, countPromptTokens, estimateGeneratedTokens, streamChatCompletion } from "./services/koboldApi.js";
import { getCombinedRuntimeLorebook, inspectLoreInjection, pruneActiveLoreMemory } from "./services/lore.js";
import { cloneJson, createId, downloadJson, playCompletionSound, readJsonFile, safeFileName } from "./utils/helpers.js";

export default function App() {
  const initial = useMemo(loadInitialState, []);

  const [worlds, setWorlds] = useState(initial.worlds);
  const [characters, setCharacters] = useState(initial.characters);
  const [stories, setStories] = useState(initial.stories);
  const [activeStoryId, setActiveStoryId] = useState(initial.activeStoryId);
  const [activeView, setActiveView] = useState(initial.activeView);
  const [selectedCharacterSheetId, setSelectedCharacterSheetId] = useState(initial.selectedCharacterSheetId);
  const [selectedWorldSheetId, setSelectedWorldSheetId] = useState(initial.selectedWorldSheetId);
  const [chatHistory, setChatHistory] = useState(initial.chatHistory);
  const [activeLoreMemory, setActiveLoreMemory] = useState(initial.activeLoreMemory);
  const [storyDraft, setStoryDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [promptTokens, setPromptTokens] = useState("-- tokens");
  const [generationStatus, setGenerationStatus] = useState("Idle");
  const [progressPercent, setProgressPercent] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [isExtractingUpdates, setIsExtractingUpdates] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [selectedPendingUpdateIds, setSelectedPendingUpdateIds] = useState(new Set());
  const [pendingUpdateStatus, setPendingUpdateStatus] = useState("");

  const storyImportRef = useRef(null);
  const characterImportRef = useRef(null);
  const worldImportRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastGenerationRequestRef = useRef(null);

  const activeStory = useMemo(
    () => stories.find((story) => story.id === activeStoryId) || null,
    [stories, activeStoryId]
  );
  const activeWorld = activeStory ? getWorld(activeStory.worldId) : worlds[0] || null;
  const activeStoryCharacters = useMemo(
    () => activeStory ? getStoryCharacters(activeStory) : (characters[0] ? [characters[0]] : []),
    [activeStory, characters]
  );
  const activeCharacter = useMemo(
    () => chooseActiveCastLead(activeStory, activeStoryCharacters) || characters[0] || null,
    [activeStory, activeStoryCharacters, characters]
  );
  const selectedCharacter = getCharacter(selectedCharacterSheetId);
  const selectedWorld = getWorld(selectedWorldSheetId);
  const loreStatusText = activeLoreMemory.length
    ? `Lore: ${activeLoreMemory.map((entry) => `${entry.source}: ${entry.name}`).join(", ")}`
    : "Lore: none";

  function getWorld(id) {
    return worlds.find((world) => world.id === id) || worlds[0] || null;
  }

  function getCharacter(id) {
    return characters.find((character) => character.id === id) || characters[0] || null;
  }

  function saveWorldList(nextWorlds) {
    setWorlds(nextWorlds);
    repository.worlds.saveAll(nextWorlds);
  }

  function saveCharacterList(nextCharacters) {
    setCharacters(nextCharacters);
    repository.characters.saveAll(nextCharacters);
  }

  function saveStoryList(nextStories) {
    setStories(nextStories);
    repository.stories.saveAll(nextStories);
  }

  function saveChatForActiveStory(nextChatHistory) {
    if (!activeStoryId) return;
    repository.chats.save(activeStoryId, nextChatHistory);
  }

  function saveLoreForActiveStory(nextLoreMemory) {
    if (!activeStoryId) return;
    repository.loreMemory.save(activeStoryId, nextLoreMemory, { quiet: true });
  }

  function saveCurrentContext(nextContext) {
    if (!activeStory) return;
    const normalizedContext = normalizeCurrentContext(nextContext);
    const syncedDirectorNotes = syncDirectorNotesFromContext(activeStory.directorNotes, normalizedContext);
    const nextStories = stories.map((story) => story.id === activeStory.id
      ? { ...story, currentContext: normalizedContext, directorNotes: syncedDirectorNotes }
      : story
    );
    saveStoryList(nextStories);
  }

  function saveSceneControl(nextContext, nextDirectorNotes) {
    if (!activeStory) return;
    const normalizedContext = normalizeCurrentContext(nextContext);
    const normalizedDirectorNotes = normalizeDirectorNotes(nextDirectorNotes);
    const nextStories = stories.map((story) => story.id === activeStory.id
      ? { ...story, currentContext: normalizedContext, directorNotes: normalizedDirectorNotes }
      : story
    );
    saveStoryList(nextStories);
  }

  function saveStoryMemory(nextMemory) {
    if (!activeStory) return;
    const normalizedMemory = normalizeStoryMemory(nextMemory);
    const nextStories = stories.map((story) => story.id === activeStory.id
      ? { ...story, storyMemory: normalizedMemory }
      : story
    );
    saveStoryList(nextStories);
  }

  function saveCastState(nextCastState) {
    if (!activeStory) return;
    const normalizedCastState = normalizeCastState(nextCastState, activeStoryCharacters);
    const nextStories = stories.map((story) => story.id === activeStory.id
      ? { ...story, castState: normalizedCastState }
      : story
    );
    saveStoryList(nextStories);
  }

  function openStoryCreationSheet() {
    if (isGenerating) return;
    if (worlds.length === 0 || characters.length === 0) {
      alert("You need at least one world and one character to create a story.");
      return;
    }
    const draft = {
      title: "Untitled Story",
      worldId: activeWorld?.id || worlds[0]?.id || "",
      characterIds: uniqueCompact([activeCharacter?.id || characters[0]?.id || ""]),
      scenario: "",
      greeting: "",
      storyLorebook: []
    };
    setStoryDraft(draft);
    setActiveView("story-create");
  }

  function switchStory(storyId) {
    if (isGenerating) {
      alert("Please wait for the current reply to finish before switching stories.");
      return;
    }
    const story = stories.find((item) => item.id === storyId);
    if (!story) {
      alert("Story not found.");
      return;
    }
    setActiveStoryId(story.id);
    repository.activeStory.set(story.id);
    setChatHistory(loadChatForStory(story, worlds, characters));
    setActiveLoreMemory(repository.loreMemory.load(story.id, []));
    setSelectedCharacterSheetId(chooseActiveCastLead(story, getStoryCharacters(story))?.id || characters[0]?.id || "");
    setSelectedWorldSheetId(story.worldId || worlds[0]?.id || "");
    setStoryDraft(null);
    setActiveView("story");
  }

  function startStoryFromCreationSheet(draft) {
    const world = worlds.find((item) => item.id === draft.worldId);
    const selectedCharacterIds = uniqueCompact(Array.isArray(draft.characterIds) ? draft.characterIds : []);
    const selectedCharacters = selectedCharacterIds
      .map((id) => characters.find((item) => item.id === id))
      .filter(Boolean);
    const leadCharacter = selectedCharacters[0] || null;

    if (!world) return { error: "Please choose a valid world." };
    if (selectedCharacters.length === 0) return { error: "Please choose at least one story character." };

    const newStory = normalizeStory({
      id: createId("story"),
      title: draft.title?.trim() || "Untitled Story",
      worldId: world.id,
      characterIds: selectedCharacters.map((item) => item.id),
      mainCharacterId: leadCharacter?.id || "",
      scenario: draft.scenario?.trim() || "",
      greeting: draft.greeting?.trim() || "The scene begins.",
      storyLorebook: normalizeStoredLorebook(draft.storyLorebook || []),
      storyMemory: normalizeStoryMemory({}),
      currentContext: createInitialCurrentContext(world),
      castState: createInitialCastState(selectedCharacters),
      createdAt: Date.now()
    }, worlds, characters);

    const nextStories = [...stories, newStory];
    saveStoryList(nextStories);
    setActiveStoryId(newStory.id);
    repository.activeStory.set(newStory.id);

    const opening = [{ role: "assistant", content: buildOpeningMessage(newStory, leadCharacter, world, selectedCharacters) }];
    setChatHistory(opening);
    repository.chats.save(newStory.id, opening);
    setActiveLoreMemory([]);
    repository.loreMemory.save(newStory.id, [], { quiet: true });
    setSelectedCharacterSheetId(leadCharacter?.id || "");
    setSelectedWorldSheetId(world.id);
    setStoryDraft(null);
    setActiveView("story");
    return { ok: true };
  }

  function cancelStoryCreation() {
    setStoryDraft(null);
    setActiveView(activeStory?.id ? "story" : "landing");
  }

  function deleteActiveStory() {
    if (!activeStory) {
      alert("No active story to delete.");
      return;
    }
    if (!confirm(`Delete story "${activeStory.title}"? This will delete its chat and lore memory.`)) return;
    repository.maintenance.removeStoryRuntimeData(activeStory.id);
    const nextStories = stories.filter((story) => story.id !== activeStory.id);
    saveStoryList(nextStories);
    clearActiveStorySelection();
  }

  function clearActiveStorySelection() {
    setActiveStoryId(null);
    setChatHistory([]);
    setActiveLoreMemory([]);
    setStoryDraft(null);
    setActiveView("landing");
    repository.activeStory.clear();
  }

  function createBlankCharacter() {
    if (isGenerating) return;
    const newCharacter = normalizeCharacter({
      id: createId("character"),
      worldId: selectedWorldSheetId || activeWorld?.id || worlds[0]?.id || "",
      name: "New Character",
      shortDescription: "Blank character template",
      lorebook: []
    }, worlds);
    saveCharacterList([...characters, newCharacter]);
    setSelectedCharacterSheetId(newCharacter.id);
    setActiveView("character");
    setStoryDraft(null);
  }

  function saveCharacterSheetEdits(characterDraft) {
    const normalized = normalizeCharacter(characterDraft, worlds);
    saveCharacterList(characters.map((character) => character.id === normalized.id ? normalized : character));
  }

  function saveStoryCastIdentity(characterDraft) {
    const normalized = normalizeCharacter(characterDraft, worlds);
    saveCharacterList(characters.map((character) => character.id === normalized.id ? normalized : character));
    setSelectedCharacterSheetId(normalized.id);
  }

  function deleteSelectedCharacter(characterId) {
    const character = getCharacter(characterId);
    if (!character) return;
    const storiesUsingCharacter = stories.filter((story) => (story.characterIds || []).includes(character.id));
    if (storiesUsingCharacter.length > 0) {
      const storyNames = storiesUsingCharacter.map((story) => `"${story.title}"`).join(", ");
      alert(`Cannot delete ${character.name}. This character is used in ${storiesUsingCharacter.length} story(s): ${storyNames}.\n\nDelete these stories first.`);
      return;
    }
    if (!confirm(`Delete ${character.name}?`)) return;
    saveCharacterList(characters.filter((item) => item.id !== character.id));
    repository.characters.removeLegacyChat(character.id);
    setSelectedCharacterSheetId(characters.find((item) => item.id !== character.id)?.id || "");
    setActiveView("landing");
  }

  function setCharacterPresenceInActiveStory(characterId, presence) {
    if (!activeStory) return;
    const character = getCharacter(characterId);
    if (!character) return alert("Character not found.");
    const normalizedPresence = normalizeCastPresence(presence);
    const storyCharacters = getStoryCharacters(activeStory);
    const nextCastState = normalizeCastState(activeStory.castState, storyCharacters, activeStory.currentContext);
    const row = nextCastState.activeCharacters.find((item) => item.characterId === character.id);
    if (row) {
      row.presence = normalizedPresence;
      row.present = normalizedPresence !== "inactive";
    }
    const nextStories = stories.map((story) => story.id === activeStory.id
      ? { ...story, castState: nextCastState }
      : story
    );
    saveStoryList(nextStories);
    setSelectedCharacterSheetId(character.id);
    setActiveView("story");
  }

  function addCharacterToActiveStory(characterId) {
    if (!activeStory) return;
    const character = getCharacter(characterId);
    if (!character) return alert("Character not found.");
    const nextStories = stories.map((story) => {
      if (story.id !== activeStory.id) return story;
      const nextCharacterIds = uniqueCompact([...(story.characterIds || []), character.id]);
      const storyCharacters = nextCharacterIds.map(getCharacter).filter(Boolean);
      const nextCastState = normalizeCastState(story.castState, storyCharacters, story.currentContext);
      return {
        ...story,
        characterIds: nextCharacterIds,
        mainCharacterId: story.mainCharacterId || nextCharacterIds[0] || "",
        currentContext: normalizeCurrentContext(story.currentContext),
        castState: nextCastState
      };
    });
    saveStoryList(nextStories);
    setSelectedCharacterSheetId(character.id);
  }

  function removeCharacterFromActiveStory(characterId) {
    if (!activeStory) return;
    const remainingIds = (activeStory.characterIds || []).filter((id) => id !== characterId);
    if (remainingIds.length === 0) {
      alert("A story needs at least one cast member.");
      return;
    }
    const nextStories = stories.map((story) => {
      if (story.id !== activeStory.id) return story;
      const storyCharacters = remainingIds.map(getCharacter).filter(Boolean);
      const nextCastState = normalizeCastState(story.castState, storyCharacters, story.currentContext);
      return {
        ...story,
        characterIds: remainingIds,
        mainCharacterId: remainingIds.includes(story.mainCharacterId) ? story.mainCharacterId : remainingIds[0],
        currentContext: normalizeCurrentContext(story.currentContext),
        castState: nextCastState
      };
    });
    saveStoryList(nextStories);
    setSelectedCharacterSheetId(remainingIds[0] || "");
  }

  function createBlankWorld() {
    if (isGenerating) return;
    const newWorld = normalizeWorld({
      id: createId("world"),
      name: "New World",
      shortDescription: "Blank world template",
      description: "",
      rules: "",
      worldLorebook: []
    });
    saveWorldList([...worlds, newWorld]);
    setSelectedWorldSheetId(newWorld.id);
    setActiveView("world");
    setStoryDraft(null);
  }

  function saveWorldSheetEdits(worldDraft) {
    const normalized = normalizeWorld(worldDraft);
    saveWorldList(worlds.map((world) => world.id === normalized.id ? normalized : world));
  }

  function deleteSelectedWorld(worldId) {
    const world = getWorld(worldId);
    if (!world) return;
    const storiesUsingWorld = stories.filter((story) => story.worldId === world.id);
    if (storiesUsingWorld.length > 0) {
      const storyNames = storiesUsingWorld.map((story) => `"${story.title}"`).join(", ");
      alert(`Cannot delete ${world.name}. This world is used in ${storiesUsingWorld.length} story(s): ${storyNames}.\n\nDelete these stories first.`);
      return;
    }
    if (!confirm(`Delete ${world.name}?`)) return;
    saveWorldList(worlds.filter((item) => item.id !== world.id));
    setSelectedWorldSheetId(worlds.find((item) => item.id !== world.id)?.id || "");
    setActiveView("landing");
  }

  function assignWorldToStory(worldId) {
    if (!activeStory || worldId === activeStory.worldId) return;
    const world = getWorld(worldId);
    if (!world) return alert("World not found.");
    if (!confirm("Use this world in the active story? This will reset the story chat and rebuild Current Context for the new world.")) return;
    const storyCharacters = getStoryCharacters(activeStory);
    const rebuiltContext = createInitialCurrentContext(world, storyCharacters);
    const updatedStory = {
      ...activeStory,
      worldId: world.id,
      currentContext: rebuiltContext,
      directorNotes: syncDirectorNotesFromContext(activeStory.directorNotes, rebuiltContext)
    };
    const nextStories = stories.map((story) => story.id === activeStory.id ? updatedStory : story);
    saveStoryList(nextStories);
    resetCurrentStoryState(activeStory.id, updatedStory, world, storyCharacters);
    setSelectedWorldSheetId(world.id);
    setActiveView("story");
  }

  function resetCurrentStoryState(storyId = activeStory?.id, story = activeStory, world = activeWorld, storyCharacters = activeStoryCharacters) {
    if (!storyId || !story || !world) return;
    const cast = (storyCharacters?.length ? storyCharacters : getStoryCharacters(story)).filter(Boolean);
    const lead = chooseActiveCastLead(story, cast);
    const opening = [{ role: "assistant", content: buildOpeningMessage(story, lead, world, cast) }];
    setActiveLoreMemory([]);
    repository.loreMemory.save(storyId, [], { quiet: true });
    setChatHistory(opening);
    repository.chats.save(storyId, opening);
  }

  async function sendMessage(text) {
    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0 || isGenerating) return;
    const committed = commitLastAssistantChoice(chatHistory);
    const baseHistory = [...committed, { role: "user", content: text }];
    saveChatForActiveStory(baseHistory);
    await generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
      promptHistory: baseHistory,
      finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)]
    });
  }

  async function continueLastReply() {
    if (isGenerating) return;
    const lastAssistantIndex = findLastAssistantIndex(chatHistory);
    if (lastAssistantIndex === -1) return alert("Nothing to continue.");
    if (lastAssistantIndex !== chatHistory.length - 1) {
      return alert("Continue works best after an assistant reply. Generate or reroll the next reply first.");
    }
    const committed = commitLastAssistantChoice(chatHistory);
    await generateAssistantReply({
      visibleHistory: [...committed, { role: "assistant", content: "Thinking..." }],
      promptHistory: committed,
      privateInstruction: "Continue directly from your previous assistant reply. Add the next natural part of the same reply or scene beat. Do not restart the scene. Do not summarize. Do not speak for the user. Do not ask for the user's next move.",
      finalBuilder: (reply) => appendGeneratedReplyToLastAssistant(committed, reply)
    });
  }

  async function elaborateLastReply() {
    if (isGenerating) return;
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return alert("The last message is not an assistant reply.");
    const originalReply = getMessageDisplayText(lastMessage);
    const historyWithoutLastAssistant = chatHistory.slice(0, -1);
    await generateAssistantReply({
      visibleHistory: [...historyWithoutLastAssistant, { role: "assistant", content: "Thinking..." }],
      promptHistory: historyWithoutLastAssistant,
      privateInstruction: `Rewrite the previous assistant reply as a richer version with more sensory detail, emotion, atmosphere, and in-character nuance. Preserve the same basic intent and scene direction. Do not make the reply wildly longer than needed. Do not speak for the user. Return only the revised in-world reply.\n\nPrevious assistant reply:\n"""${originalReply}"""`,
      finalBuilder: (reply) => addAlternativeToLastAssistant(chatHistory, reply)
    });
  }

  async function rerollLastReply() {
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to reroll.");
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return alert("The last message is not an assistant reply.");
    const historyWithoutLastAssistant = chatHistory.slice(0, -1);
    await generateAssistantReply({
      visibleHistory: [...historyWithoutLastAssistant, { role: "assistant", content: "Thinking..." }],
      promptHistory: historyWithoutLastAssistant,
      privateInstruction: "Generate a different in-character assistant reply for this point in the scene. Keep the same story context, but vary the wording, emotional beat, and immediate action. Do not mention rerolling.",
      finalBuilder: (reply) => addAlternativeToLastAssistant(chatHistory, reply)
    });
  }

  async function regenerateFromMessage(index) {
    if (isGenerating) return;
    const targetMessage = chatHistory[index];
    if (!targetMessage) return;
    if (index <= 0 && targetMessage.role === "assistant") {
      alert("The opening message cannot be regenerated from here.");
      return;
    }

    let keepCount = index + 1;
    let instruction = "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.";

    if (targetMessage.role === "assistant") {
      keepCount = index;
      instruction = "Regenerate the assistant reply at this point in the scene. Write a fresh in-character continuation based only on the story context and the chat before this message. Do not mention regeneration.";
    }

    const baseHistory = commitLastAssistantChoice(chatHistory).slice(0, keepCount);
    repository.chats.save(activeStoryId, baseHistory);
    await generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
      promptHistory: baseHistory,
      privateInstruction: instruction,
      finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)]
    });
  }

  async function generateAssistantReply({ visibleHistory, promptHistory, privateInstruction = "", finalBuilder }) {
    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastGenerationRequestRef.current = { visibleHistory, promptHistory, privateInstruction, finalBuilder };

    setIsGenerating(true);
    setEditingMessageIndex(null);
    setChatHistory(visibleHistory);
    setGenerationStatus("Generating...");
    setProgressPercent(1);

    const inspection = inspectLoreInjection({
      story: activeStory,
      world: activeWorld,
      character: activeCharacter,
      characters: activeStoryCharacters,
      history: promptHistory,
      activeLoreMemory
    });

    setActiveLoreMemory(inspection.nextMemory);
    saveLoreForActiveStory(inspection.nextMemory);

    const requestMessages = buildMessagesForRequest({
      story: activeStory,
      world: activeWorld,
      character: activeCharacter,
      characters: activeStoryCharacters,
      history: promptHistory,
      activeLoreMemory: inspection.selectedEntries,
      privateInstruction
    });

    try {
      try {
        const tokenCount = await countPromptTokens(requestMessages, { signal: controller.signal });
        setPromptTokens(`${tokenCount} tokens`);
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        setPromptTokens("token count unavailable");
      }

      const streamedReply = await streamChatCompletion(requestMessages, (fullReply) => {
        setChatHistory([...visibleHistory.slice(0, -1), { role: "assistant", content: fullReply || "Thinking..." }]);
        const estimatedTokens = estimateGeneratedTokens(fullReply);
        const percent = Math.min(100, Math.round((estimatedTokens / GENERATION_SETTINGS.maxTokens) * 100));
        setProgressPercent(percent);
        setGenerationStatus(`Generating: ~${estimatedTokens}/${GENERATION_SETTINGS.maxTokens} tokens`);
      }, { signal: controller.signal });

      const fullReply = cleanGeneratedReply(streamedReply) || "No response received.";
      const finalHistory = finalBuilder(fullReply);
      setChatHistory(finalHistory);
      saveChatForActiveStory(finalHistory);
      setProgressPercent(100);
      setGenerationStatus("Complete");
      playCompletionSound();
    } catch (error) {
      if (error?.name === "AbortError") {
        setChatHistory(promptHistory);
        saveChatForActiveStory(promptHistory);
        setGenerationStatus("Canceled");
      } else {
        const message = error instanceof Error ? error.message : String(error);
        const errorHistory = [...visibleHistory.slice(0, -1), { role: "assistant", content: `Error: ${message}` }];
        setChatHistory(errorHistory);
        saveChatForActiveStory(errorHistory);
        setGenerationStatus("Error - use Retry to try again");
      }
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setIsGenerating(false);
      setTimeout(() => {
        setProgressPercent(0);
        setGenerationStatus("Idle");
      }, 1200);
    }
  }

  function cancelGeneration() {
    abortControllerRef.current?.abort();
  }

  async function retryLastGeneration() {
    if (isGenerating) return;
    const request = lastGenerationRequestRef.current;
    if (!request) return alert("There is no previous generation to retry yet.");
    await generateAssistantReply(request);
  }

  async function extractStateUpdates() {
    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0) return;
    if (isGenerating || isExtractingUpdates) return;
    if (chatHistory.length === 0) {
      setPendingUpdateStatus("There is no chat history to analyze yet.");
      return;
    }

    setIsExtractingUpdates(true);
    setPendingUpdateStatus("Extracting possible state updates...");
    setPendingUpdates([]);
    setSelectedPendingUpdateIds(new Set());

    const recentHistory = chatHistory.slice(-12).map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";
      return `${role}: ${getMessageDisplayText(message)}`;
    }).join("\n\n");

    const updatePrompt = `You extract persistent roleplay state updates from the latest chat. Return JSON only. Do not write prose, markdown, or code fences.

Suggest only changes that are clearly supported by the chat. Do not invent new facts. Include a confidence from 0 to 1.

Allowed categories: scene, location, character, outfit, object, inventory, relationship, memory, other. Scene/location/object updates go to Scene Control; character and relationship updates go to Cast State; long-term plot memory updates go to Story Memory.

Return this shape exactly:
{
  "updates": [
    {
      "category": "location",
      "title": "Short human-readable update",
      "target": "Who or what changes",
      "from": "Previous value if known",
      "to": "New value if known",
      "details": "One sentence explaining why this should be saved",
      "confidence": 0.8
    }
  ]
}

If there are no meaningful updates, return {"updates":[]}.

Current story: ${activeStory.title}
Scenario: ${activeStory.scenario || "None"}
World: ${activeWorld.name}
World description: ${activeWorld.description || "None"}
Active story cast: ${activeStoryCharacters.map((character) => character.name).join(", ") || "None"}
Cast details:
${activeStoryCharacters.map((character) => `- ${character.name}: ${character.shortDescription || character.description || "No description"}; appearance: ${character.appearance || "None"}; relationship: ${character.relationshipToUser || "None"}`).join("\n")}
Current Context JSON: ${JSON.stringify(activeStory.currentContext || {}, null, 2)}
Cast State JSON: ${JSON.stringify(activeStory.castState || {}, null, 2)}

Recent chat:
${recentHistory}`;

    try {
      const reply = await streamChatCompletion([
        { role: "system", content: "You are a strict JSON extraction tool for a local roleplay app." },
        { role: "user", content: updatePrompt }
      ]);

      const updates = parseSuggestedUpdates(reply);
      setPendingUpdates(updates);
      setSelectedPendingUpdateIds(new Set(updates.map((update) => update.id)));
      setPendingUpdateStatus(
        updates.length
          ? `${updates.length} suggested update${updates.length === 1 ? "" : "s"} ready for review.`
          : "No clear state updates found."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPendingUpdateStatus(`Could not extract updates: ${message}`);
    } finally {
      setIsExtractingUpdates(false);
    }
  }

  function togglePendingUpdate(updateId) {
    setSelectedPendingUpdateIds((current) => {
      const next = new Set(current);
      if (next.has(updateId)) next.delete(updateId);
      else next.add(updateId);
      return next;
    });
  }

  function rejectPendingUpdates() {
    setPendingUpdates([]);
    setSelectedPendingUpdateIds(new Set());
    setPendingUpdateStatus("");
  }

  function applySelectedPendingUpdates() {
    if (!activeStory) return;

    const selected = pendingUpdates.filter((update) => selectedPendingUpdateIds.has(update.id));
    if (selected.length === 0) {
      setPendingUpdateStatus("Select at least one update to apply.");
      return;
    }

    const nextContext = applyUpdatesToCurrentContext(
      activeStory.currentContext,
      selected,
      activeWorld
    );
    const nextCastState = applyUpdatesToCastState(
      activeStory.castState,
      selected,
      activeStoryCharacters
    );
    const nextStoryMemory = applyUpdatesToStoryMemory(
      activeStory.storyMemory,
      selected
    );

    const normalizedContext = normalizeCurrentContext(nextContext);
    const normalizedCastState = normalizeCastState(nextCastState, activeStoryCharacters);
    const normalizedStoryMemory = normalizeStoryMemory(nextStoryMemory);
    const nextStories = stories.map((story) => story.id === activeStory.id
      ? {
          ...story,
          currentContext: normalizedContext,
          castState: normalizedCastState,
          storyMemory: normalizedStoryMemory,
          directorNotes: syncDirectorNotesFromContext(story.directorNotes, normalizedContext)
        }
      : story
    );

    saveStoryList(nextStories);
    setPendingUpdates(pendingUpdates.filter((update) => !selectedPendingUpdateIds.has(update.id)));
    setSelectedPendingUpdateIds(new Set());
    setPendingUpdateStatus(`${selected.length} update${selected.length === 1 ? "" : "s"} applied to Scene Control / Cast State / Story Memory.`);
  }

  function rollbackLastExchange() {
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to rollback.");
    const nextHistory = [...chatHistory];
    const last = nextHistory[nextHistory.length - 1];
    const previous = nextHistory[nextHistory.length - 2];
    if (last?.role === "assistant" && previous?.role === "user") {
      nextHistory.splice(nextHistory.length - 2, 2);
    } else {
      nextHistory.pop();
    }
    setChatHistory(nextHistory);
    saveChatForActiveStory(nextHistory);
  }

  function resetChat() {
    if (isGenerating) return;
    if (!confirm("Reset this story's chat back to its opening message?")) return;
    resetCurrentStoryState();
  }

  function startEditingMessage(index) {
    if (isGenerating) return;
    setEditingMessageIndex(index);
  }

  function cancelMessageEdit() {
    setEditingMessageIndex(null);
  }

  async function saveMessageEdit(index, newText, regenerateAfterSave = false) {
    if (isGenerating) return;
    const trimmed = newText.trim();
    if (!trimmed) return alert("Message cannot be empty.");

    const nextHistory = chatHistory.map((message, messageIndex) => {
      if (messageIndex !== index) return message;
      if (isAssistantMessageWithOptions(message)) {
        const alternatives = [...message.alternatives];
        alternatives[message.selectedIndex] = trimmed;
        return { ...message, alternatives, content: trimmed };
      }
      return { ...message, content: trimmed };
    });

    setEditingMessageIndex(null);
    setChatHistory(nextHistory);
    repository.chats.save(activeStoryId, nextHistory);

    if (regenerateAfterSave && nextHistory[index]?.role === "user") {
      await regenerateFromMessageWithHistory(index, nextHistory);
    }
  }

  async function regenerateFromMessageWithHistory(index, sourceHistory) {
    const targetMessage = sourceHistory[index];
    if (!targetMessage) return;
    const baseHistory = sourceHistory.slice(0, index + 1);
    await generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
      promptHistory: baseHistory,
      privateInstruction: "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.",
      finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)]
    });
  }

  function deleteMessagesFromIndex(index) {
    if (isGenerating) return;
    if (index <= 0) return alert("The opening message cannot be deleted from here.");
    if (!confirm("Delete this message and everything after it?")) return;
    const nextHistory = chatHistory.slice(0, index);
    setEditingMessageIndex(null);
    setChatHistory(nextHistory);
    saveChatForActiveStory(nextHistory);
  }

  function selectAssistantOption(messageIndex, optionIndex) {
    const nextHistory = chatHistory.map((message, index) => {
      if (index !== messageIndex || !isAssistantMessageWithOptions(message)) return message;
      const selectedText = message.alternatives[optionIndex] || message.content || "";
      return { ...message, selectedIndex: optionIndex, content: selectedText };
    });
    setChatHistory(nextHistory);
    saveChatForActiveStory(nextHistory);
  }

  function updateStoryLore(index, patch) {
    if (!activeStory) return;
    const nextLore = (activeStory.storyLorebook || []).map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry);
    const nextStories = stories.map((story) => story.id === activeStory.id ? { ...story, storyLorebook: nextLore } : story);
    saveStoryList(nextStories);
    pruneAndSaveLore(nextStories.find((story) => story.id === activeStory.id), activeWorld, activeCharacter);
  }

  function updateWorldLore(index, patch) {
    if (!activeWorld) return;
    const nextLore = (activeWorld.worldLorebook || []).map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry);
    const nextWorlds = worlds.map((world) => world.id === activeWorld.id ? { ...world, worldLorebook: nextLore } : world);
    saveWorldList(nextWorlds);
    const nextWorld = nextWorlds.find((world) => world.id === activeWorld.id);
    pruneAndSaveLore(activeStory, nextWorld, activeCharacter);
  }

  function updateCharacterLore(characterId, index, patch) {
    const targetCharacter = characters.find((character) => character.id === characterId) || activeCharacter;
    if (!targetCharacter) return;
    const nextLore = (targetCharacter.lorebook || []).map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry);
    const nextCharacters = characters.map((character) => character.id === targetCharacter.id ? { ...character, lorebook: nextLore } : character);
    saveCharacterList(nextCharacters);
    const nextCharacter = nextCharacters.find((character) => character.id === targetCharacter.id);
    pruneAndSaveLore(activeStory, activeWorld, nextCharacter, nextCharacters);
  }

  function saveTemporaryLore(lorebook) {
    if (!activeStory) return;
    const nextStories = stories.map((story) => story.id === activeStory.id ? { ...story, temporaryLorebook: normalizeStoredLorebook(lorebook) } : story);
    saveStoryList(nextStories);
    const nextStory = nextStories.find((story) => story.id === activeStory.id);
    pruneAndSaveLore(nextStory, activeWorld, activeCharacter);
  }

  function clearTemporaryLore() {
    saveTemporaryLore([]);
  }

  function pruneAndSaveLore(story, world, character, characterSource = characters) {
    const combinedLorebook = getCombinedRuntimeLorebook({ story, world, character, characters: getStoryCharactersFromLists(story, characterSource) });
    const nextLoreMemory = pruneActiveLoreMemory(activeLoreMemory, combinedLorebook);
    setActiveLoreMemory(nextLoreMemory);
    saveLoreForActiveStory(nextLoreMemory);
  }

  function refreshActiveLore() {
    if (!activeStory) return;
    const inspection = inspectLoreInjection({
      story: activeStory,
      world: activeWorld,
      character: activeCharacter,
      characters: activeStoryCharacters,
      history: chatHistory,
      activeLoreMemory
    });
    setActiveLoreMemory(inspection.nextMemory);
    saveLoreForActiveStory(inspection.nextMemory);
  }

  function saveDirectorNotes(notes) {
    if (!activeStory) return;
    const normalizedNotes = normalizeDirectorNotes(notes);
    const syncedContext = syncCurrentContextFromDirectorNotes(activeStory.currentContext, normalizedNotes);
    const nextStories = stories.map((story) => story.id === activeStory.id
      ? { ...story, directorNotes: normalizedNotes, currentContext: syncedContext }
      : story
    );
    saveStoryList(nextStories);
  }

  function clearDirectorNotes() {
    saveDirectorNotes(DEFAULT_DIRECTOR_NOTES);
  }

  function factoryReset() {
    if (isGenerating) return;
    if (!confirm("This will delete saved stories, characters, worlds, chats, and lore memory. Continue?")) return;
    repository.maintenance.clearKnownData(stories, characters);
    const nextWorlds = defaultWorlds.map(normalizeWorld);
    const nextCharacters = defaultCharacters.map((character) => normalizeCharacter(character, nextWorlds));
    const nextStories = defaultStories.map((story) => normalizeStory(story, nextWorlds, nextCharacters));
    saveWorldList(nextWorlds);
    saveCharacterList(nextCharacters);
    saveStoryList(nextStories);
    setSelectedWorldSheetId(nextWorlds[0]?.id || "");
    setSelectedCharacterSheetId(nextCharacters[0]?.id || "");
    clearActiveStorySelection();
  }

  function exportCharacter(character) {
    downloadJson(`${safeFileName(character.name, "character")}.character.json`, {
      type: "roleplay-character",
      version: 1,
      exportedAt: new Date().toISOString(),
      character: cloneJson(character)
    });
  }

  function exportWorld(world) {
    downloadJson(`${safeFileName(world.name, "world")}.world.json`, {
      type: "roleplay-world",
      version: 1,
      exportedAt: new Date().toISOString(),
      world: cloneJson(world)
    });
  }

  function exportActiveStory() {
    if (!activeStory) return alert("No active story to export.");
    const bundle = buildStoryExportBundle(activeStory);
    const validation = validateStoryExportBundle(bundle);
    if (!validation.ok) {
      alert("Story export is incomplete:\n\n" + validation.issues.join("\n"));
      return;
    }
    downloadJson(`${safeFileName(activeStory.title, "story")}.story.json`, bundle);
  }

  async function handleImportStoryFile(event) {
    await handleJsonImport(event, importStoryBundle);
  }

  async function handleImportCharacterFile(event) {
    await handleJsonImport(event, importCharacterBundle);
  }

  async function handleImportWorldFile(event) {
    await handleJsonImport(event, importWorldBundle);
  }

  async function handleJsonImport(event, handler) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = await readJsonFile(file);
      handler(parsed);
    } catch (error) {
      alert(error.message);
    }
  }

  function importCharacterBundle(parsed) {
    const imported = parsed.character || parsed;
    const validation = validateIncomingCharacterBundle(imported);
    if (!validation.ok) return alert(`Invalid character file:\n\n${validation.issues.join("\n")}`);
    const newCharacter = normalizeCharacter({
      ...imported,
      id: createId("character"),
      name: imported.name || "Imported Character",
      shortDescription: imported.shortDescription || "Imported character",
      lorebook: Array.isArray(imported.lorebook) ? imported.lorebook : imported.characterLorebook || []
    }, worlds);
    saveCharacterList([...characters, newCharacter]);
    setSelectedCharacterSheetId(newCharacter.id);
    setActiveView("character");
  }

  function importWorldBundle(parsed) {
    const imported = parsed.world || parsed;
    const validation = validateIncomingWorldBundle(imported);
    if (!validation.ok) return alert(`Invalid world file:\n\n${validation.issues.join("\n")}`);
    const newWorld = normalizeWorld({
      ...imported,
      id: createId("world"),
      name: imported.name || "Imported World",
      shortDescription: imported.shortDescription || "Imported world",
      worldLorebook: Array.isArray(imported.worldLorebook) ? imported.worldLorebook : imported.lorebook || []
    });
    saveWorldList([...worlds, newWorld]);
    setSelectedWorldSheetId(newWorld.id);
    setActiveView("world");
  }

  function importStoryBundle(parsed) {
    const bundle = parsed.type === "roleplay-story-bundle" ? parsed : parsed.bundle || parsed;
    const validationMessage = validateIncomingStoryBundle(bundle);
    if (validationMessage) return alert(validationMessage);

    const importedStorySource = cloneJson(bundle.story);
    const importedWorldSource = cloneJson(bundle.world);
    const importedCharacterSources = cloneJson(bundle.characters);
    hydrateBundleLore(bundle, importedStorySource, importedWorldSource, importedCharacterSources);

    const oldToNewCharacterIds = {};
    const newWorld = normalizeWorld({
      ...importedWorldSource,
      id: createId("world"),
      worldLorebook: Array.isArray(importedWorldSource.worldLorebook)
        ? importedWorldSource.worldLorebook
        : importedWorldSource.lorebook || []
    });

    const newCharacters = importedCharacterSources.map((characterSource) => {
      const newCharacterId = createId("character");
      oldToNewCharacterIds[characterSource.id] = newCharacterId;
      return normalizeCharacter({
        ...characterSource,
        id: newCharacterId,
        worldId: newWorld.id,
        lorebook: Array.isArray(characterSource.lorebook) ? characterSource.lorebook : characterSource.characterLorebook || []
      }, [newWorld]);
    });

    const mappedCharacterIds = Array.isArray(importedStorySource.characterIds)
      ? importedStorySource.characterIds.map((oldId) => oldToNewCharacterIds[oldId]).filter(Boolean)
      : [];

    const mappedMainCharacterId = oldToNewCharacterIds[importedStorySource.mainCharacterId] || mappedCharacterIds[0] || newCharacters[0]?.id || "";
    if (!mappedMainCharacterId) return alert("Could not import story because no valid character was found.");

    const remappedCurrentContext = remapImportedContextCastIds(importedStorySource.currentContext, oldToNewCharacterIds);
    const remappedCastState = remapImportedCastStateIds(importedStorySource.castState, oldToNewCharacterIds);

    const newStory = normalizeStory({
      ...importedStorySource,
      id: createId("story"),
      title: importedStorySource.title || "Imported Story",
      worldId: newWorld.id,
      characterIds: mappedCharacterIds.length ? mappedCharacterIds : [mappedMainCharacterId],
      mainCharacterId: mappedMainCharacterId,
      currentContext: remappedCurrentContext,
      castState: remappedCastState,
      storyLorebook: Array.isArray(importedStorySource.storyLorebook) ? importedStorySource.storyLorebook : [],
      createdAt: Date.now()
    }, [newWorld], newCharacters);

    saveWorldList([...worlds, newWorld]);
    saveCharacterList([...characters, ...newCharacters]);
    saveStoryList([...stories, newStory]);

    setActiveStoryId(newStory.id);
    repository.activeStory.set(newStory.id);
    const importedChat = Array.isArray(bundle.chatHistory)
      ? bundle.chatHistory.map(normalizeChatMessage)
      : [{ role: "assistant", content: buildOpeningMessage(newStory, newCharacters.find((item) => item.id === mappedMainCharacterId) || newCharacters[0], newWorld, newCharacters) }];
    setChatHistory(importedChat);
    repository.chats.save(newStory.id, importedChat);
    setActiveLoreMemory([]);
    repository.loreMemory.save(newStory.id, [], { quiet: true });
    setSelectedCharacterSheetId(mappedMainCharacterId);
    setSelectedWorldSheetId(newWorld.id);
    setStoryDraft(null);
    setActiveView("story");
  }

  function remapImportedContextCastIds(context, idMap) {
    if (!context || typeof context !== "object") return context;
    return {
      ...context,
      activeCharacters: remapCastRows(context.activeCharacters, idMap),
      relationships: remapCastRows(context.relationships, idMap)
    };
  }

  function remapImportedCastStateIds(castState, idMap) {
    if (!castState || typeof castState !== "object") return castState;
    return {
      ...castState,
      activeCharacters: remapCastRows(castState.activeCharacters, idMap),
      relationships: remapCastRows(castState.relationships, idMap)
    };
  }

  function remapCastRows(rows, idMap) {
    if (!Array.isArray(rows)) return rows;
    return rows.map((row) => {
      if (!row || typeof row !== "object") return row;
      const oldId = row.characterId || row.id;
      return {
        ...row,
        characterId: idMap[oldId] || oldId
      };
    });
  }


  function buildStoryExportBundle(story) {
    const world = getWorld(story.worldId);
    const storyCharacters = getStoryCharacters(story);
    return {
      type: "roleplay-story-bundle",
      version: 1,
      exportedAt: new Date().toISOString(),
      story: cloneJson(story),
      world: cloneJson(world),
      characters: cloneJson(storyCharacters),
      completeLore: {
        storyLorebook: cloneJson(story.storyLorebook || []),
        worldLorebook: cloneJson(world?.worldLorebook || []),
        characterLorebooks: storyCharacters.map((character) => ({
          characterId: character.id,
          characterName: character.name,
          lorebook: cloneJson(character.lorebook || [])
        }))
      },
      chatHistory: story.id === activeStory?.id ? cloneJson(chatHistory) : cloneJson(loadChatForStory(story, worlds, characters))
    };
  }

  function getStoryCharacters(story) {
    const ids = Array.isArray(story?.characterIds) ? [...story.characterIds] : [];
    return uniqueCompact(ids.length ? ids : [story?.mainCharacterId]).map(getCharacter).filter(Boolean);
  }

  function renderMainContent() {
    if (activeView === "story-create") {
      return (
        <StoryCreationSheet
          worlds={worlds}
          characters={characters}
          initialDraft={storyDraft}
          onStart={startStoryFromCreationSheet}
          onCancel={cancelStoryCreation}
          onImportStory={() => storyImportRef.current?.click()}
        />
      );
    }

    if (activeView === "character") {
      return (
        <CharacterSheet
          character={selectedCharacter}
          activeStory={activeStory}
          onSave={saveCharacterSheetEdits}
          onAddToStory={addCharacterToActiveStory}
          onRemoveFromStory={removeCharacterFromActiveStory}
          onSetActive={(id) => setCharacterPresenceInActiveStory(id, "active")}
          onSetInactive={(id) => setCharacterPresenceInActiveStory(id, "inactive")}
          onDelete={deleteSelectedCharacter}
          onExport={exportCharacter}
          onImport={() => characterImportRef.current?.click()}
        />
      );
    }

    if (activeView === "world") {
      return (
        <WorldSheet
          world={selectedWorld}
          activeStory={activeStory}
          onSave={saveWorldSheetEdits}
          onUse={assignWorldToStory}
          onDelete={deleteSelectedWorld}
          onExport={exportWorld}
          onImport={() => worldImportRef.current?.click()}
        />
      );
    }

    if (!activeStory || activeView === "landing") {
      return <Landing onNewStory={openStoryCreationSheet} onImportStory={() => storyImportRef.current?.click()} />;
    }

    return (
      <>
        <ChatView
          messages={chatHistory}
          editingMessageIndex={editingMessageIndex}
          isGenerating={isGenerating}
          onStartEdit={startEditingMessage}
          onCancelEdit={cancelMessageEdit}
          onSaveEdit={saveMessageEdit}
          onDeleteFromHere={deleteMessagesFromIndex}
          onRegenerateFromHere={regenerateFromMessage}
          onSelectAssistantOption={selectAssistantOption}
        />
        <PendingUpdatesPanel
          updates={pendingUpdates}
          selectedIds={selectedPendingUpdateIds}
          status={pendingUpdateStatus}
          onToggle={togglePendingUpdate}
          onApplySelected={applySelectedPendingUpdates}
          onRejectAll={rejectPendingUpdates}
        />
        <Composer
          disabled={isGenerating || isExtractingUpdates}
          isGenerating={isGenerating}
          hasStory={Boolean(activeStory)}
          onSend={sendMessage}
          onContinue={continueLastReply}
          onElaborate={elaborateLastReply}
          onReroll={rerollLastReply}
          onRollback={rollbackLastExchange}
          onReset={resetChat}
          onExtractUpdates={extractStateUpdates}
          onCancelGeneration={cancelGeneration}
          onRetryGeneration={retryLastGeneration}
          canRetry={Boolean(lastGenerationRequestRef.current)}
        />
      </>
    );
  }

  const shouldShowEditor = activeView === "story" && activeStory?.id;

  return (
    <>
      <div className={`app ${shouldShowEditor ? "with-editor" : "without-editor"}`}>
        <Sidebar
          stories={stories}
          worlds={worlds}
          characters={characters}
          activeView={activeView}
          activeStoryId={activeStoryId}
          selectedWorldSheetId={selectedWorldSheetId}
          selectedCharacterSheetId={selectedCharacterSheetId}
          getWorld={getWorld}
          getCharacter={getCharacter}
          isGenerating={isGenerating}
          onNewStory={openStoryCreationSheet}
          onSelectStory={switchStory}
          onNewCharacter={createBlankCharacter}
          onSelectCharacter={(id) => { setSelectedCharacterSheetId(id); setActiveView("character"); setStoryDraft(null); }}
          onNewWorld={createBlankWorld}
          onSelectWorld={(id) => { setSelectedWorldSheetId(id); setActiveView("world"); setStoryDraft(null); }}
          onFactoryReset={factoryReset}
        />

        <main className="chat">
          <ChatHeader
            activeView={activeView}
            activeStory={activeStory}
            activeWorld={activeWorld}
            activeCharacter={activeCharacter}
            activeCharacters={activeStoryCharacters}
            selectedWorld={selectedWorld}
            selectedCharacter={selectedCharacter}
            promptTokens={promptTokens}
            generationStatus={generationStatus}
            loreStatusText={loreStatusText}
            progressPercent={progressPercent}
            onHome={() => { setActiveView("landing"); setStoryDraft(null); }}
            onDebug={() => setDebugOpen(true)}
          />
          {renderMainContent()}
        </main>

        {shouldShowEditor && (
          <EditorPanel
            key={activeStory.id}
            activeStory={activeStory}
            activeWorld={activeWorld}
            activeCharacter={activeCharacter}
            activeCharacters={activeStoryCharacters}
            activeLoreMemory={activeLoreMemory}
            loreStatusText={loreStatusText}
            onSaveDirectorNotes={saveDirectorNotes}
            onClearDirectorNotes={clearDirectorNotes}
            onSaveSceneControl={saveSceneControl}
            onExportStory={exportActiveStory}
            onDeleteStory={deleteActiveStory}
            onSaveCharacterIdentity={saveStoryCastIdentity}
            onExportCharacterTemplate={exportCharacter}
            onImportCharacterTemplate={() => characterImportRef.current?.click()}
            onUpdateStoryLore={updateStoryLore}
            onUpdateWorldLore={updateWorldLore}
            onUpdateCharacterLore={updateCharacterLore}
            onSaveTemporaryLore={saveTemporaryLore}
            onClearTemporaryLore={clearTemporaryLore}
            onRefreshActiveLore={refreshActiveLore}
            currentContext={activeStory.currentContext}
            storyMemory={activeStory.storyMemory}
            castState={activeStory.castState}
            onSaveCurrentContext={saveCurrentContext}
            onSaveStoryMemory={saveStoryMemory}
            onSaveCastState={saveCastState}
            onExtractUpdates={extractStateUpdates}
            isExtractingUpdates={isExtractingUpdates}
          />
        )}
      </div>

      <input ref={storyImportRef} type="file" accept=".json,application/json" hidden onChange={handleImportStoryFile} />
      <input ref={characterImportRef} type="file" accept=".json,application/json" hidden onChange={handleImportCharacterFile} />
      <input ref={worldImportRef} type="file" accept=".json,application/json" hidden onChange={handleImportWorldFile} />

      <DebugModal
        open={debugOpen}
        onClose={() => setDebugOpen(false)}
        story={activeStory}
        world={activeWorld}
        character={activeCharacter}
        characters={activeStoryCharacters}
        history={chatHistory}
        activeLoreMemory={activeLoreMemory}
      />
    </>
  );
}

function normalizeCastPresence(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["active", "nearby", "inactive"].includes(raw)) return raw;
  if (raw === "true") return "active";
  if (raw === "false") return "inactive";
  return value === false ? "inactive" : "active";
}

function syncDirectorNotesFromContext(notes, context) {
  return normalizeDirectorNotes(notes);
}

function syncCurrentContextFromDirectorNotes(context, notes) {
  const normalizedContext = normalizeCurrentContext(context);
  const normalizedNotes = normalizeDirectorNotes(notes);
  return normalizeCurrentContext({
    ...normalizedContext,
    scene: {
      ...normalizedContext.scene,
      timeOfDay: normalizedNotes.timeOfDay || normalizedContext.scene.timeOfDay,
      atmosphere: normalizedNotes.sceneMood || normalizedContext.scene.atmosphere,
      currentConflict: normalizedNotes.currentConflict || normalizedContext.scene.currentConflict,
      currentObjective: normalizedContext.scene.currentObjective || normalizedNotes.nextStoryBeat
    },
    location: {
      ...normalizedContext.location,
      name: normalizedNotes.currentLocation || normalizedContext.location.name
    }
  });
}

function createInitialCurrentContext(world) {
  return normalizeCurrentContext({
    scene: {
      timeOfDay: "",
      atmosphere: "",
      currentConflict: "",
      currentObjective: ""
    },
    location: {
      name: world?.locations?.[0]?.name || world?.name || "",
      description: world?.locations?.[0]?.description || world?.startingScenario || world?.description || "",
      visibleExits: world?.locations?.[0]?.visibleExits || "",
      hazards: world?.locations?.[0]?.hazards || "",
      availableLocations: (world?.locations || []).slice(1).map((location) => `${location.name}: ${location.summary || location.description || ""}`.trim()).join("\n")
    },
    objects: [],
    recentFacts: {
      importantDiscoveries: "",
      secretsRevealed: "",
      openQuestions: ""
    }
  });
}

function createInitialCastState(characters = []) {
  return normalizeCastState({
    activeCharacters: (characters || []).map((character) => ({
      characterId: character.id,
      presence: "active",
      present: true,
      outfit: character.defaultOutfit || "",
      mood: "",
      condition: "",
      currentGoal: character.goals || "",
      knowledge: "",
      temporarySecret: "",
      sceneInstruction: ""
    })),
    relationships: (characters || []).map((character) => ({
      characterId: character.id,
      relationshipToUser: character.relationshipToUser || "",
      trustTensionNotes: "",
      promisesConflicts: ""
    }))
  }, characters);
}

function applyUpdatesToCurrentContext(context, updates, world = null) {
  const next = normalizeCurrentContext(context);

  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const target = String(update.target || "").trim();
    const to = String(update.to || "").trim();
    const title = String(update.title || "Suggested update").trim();
    const details = String(update.details || "").trim();
    const summary = formatUpdateSummary(update);

    if (category === "location") {
      if (to || target) next.location.name = to || target || next.location.name;
      if (details) next.location.description = appendLine(next.location.description, details);
      appendRecentFact(next, summary);
      continue;
    }

    if (category === "scene") {
      if (to) next.scene.currentObjective = to;
      if (details) next.scene.currentConflict = appendLine(next.scene.currentConflict, details);
      appendRecentFact(next, summary);
      continue;
    }

    if (category === "character" || category === "outfit" || category === "relationship") {
      continue;
    }

    if (category === "object" || category === "inventory") {
      next.objects.push({
        id: createId("object"),
        name: target || title,
        locationOrHolder: category === "inventory" ? (target || "Inventory") : (next.location.name || world?.name || "Current scene"),
        visibleState: to || details || "Noted",
        hiddenDetail: "",
        status: category === "inventory" ? "inventory" : "active"
      });
      appendRecentFact(next, summary);
      continue;
    }

    if (category === "memory") {
      appendRecentFact(next, summary);
      continue;
    }

    appendRecentFact(next, summary);
  }

  return normalizeCurrentContext(next);
}

function applyUpdatesToStoryMemory(storyMemory, updates = []) {
  const next = normalizeStoryMemory(storyMemory);
  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const summary = formatUpdateSummary(update);
    
    // Add to general journal for memory updates
    if (category === "memory") {
      next.generalJournal = [
        ...next.generalJournal,
        {
          id: `general-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: summary,
          active: true,
          createdAt: Date.now()
        }
      ];
    }
    
    // Add to character journals for relationship/character updates
    if (category === "relationship" || category === "character") {
      const target = String(update.target || "").trim();
      const titleText = `${update.title || ""} ${update.details || ""}`.toLowerCase();
      
      // Try to find character ID from target name (simplified approach)
      // In a real implementation, you'd want to match by character ID
      if (target) {
        const charId = target.toLowerCase().replace(/\s+/g, "-");
        if (!next.characterJournals[charId]) {
          next.characterJournals[charId] = [];
        }
        
        if (titleText.includes("learn") || titleText.includes("know") || titleText.includes("remember") || titleText.includes("trust") || titleText.includes("suspect")) {
          next.characterJournals[charId].push({
            id: `${charId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: summary,
            active: true,
            createdAt: Date.now()
          });
        }
      }
    }
  }
  return normalizeStoryMemory(next);
}

function applyUpdatesToCastState(castState, updates, characters = []) {
  const next = normalizeCastState(castState, characters);
  const characterByName = new Map((characters || []).map((character) => [character.name.toLowerCase(), character]));

  for (const update of updates || []) {
    const category = String(update.category || "other").toLowerCase();
    const target = String(update.target || "").trim();
    const to = String(update.to || "").trim();
    const title = String(update.title || "Suggested update").trim();
    const details = String(update.details || "").trim();

    if (category === "character" || category === "outfit") {
      const character = findCharacterFromText(target || title, characterByName, characters);
      const row = ensureCharacterState(next, character?.id || target || "unknown_character");
      if (category === "outfit") {
        row.outfit = to || details || row.outfit;
      } else {
        const lowerTitle = `${title} ${details}`.toLowerCase();
        if (lowerTitle.includes("mood") || lowerTitle.includes("attitude")) row.mood = to || details || row.mood;
        else if (lowerTitle.includes("condition") || lowerTitle.includes("injur") || lowerTitle.includes("status") || lowerTitle.includes("wound")) row.condition = to || details || row.condition;
        else if (lowerTitle.includes("know") || lowerTitle.includes("remember") || lowerTitle.includes("learn")) row.knowledge = appendLine(row.knowledge, to || details || title);
        else if (lowerTitle.includes("secret") || lowerTitle.includes("hiding")) row.temporarySecret = appendLine(row.temporarySecret, to || details || title);
        else if (lowerTitle.includes("instruction") || lowerTitle.includes("should")) row.sceneInstruction = appendLine(row.sceneInstruction, to || details || title);
        else row.currentGoal = to || details || row.currentGoal;
      }
      continue;
    }

    if (category === "relationship") {
      const character = findCharacterFromText(target || title, characterByName, characters);
      const row = ensureRelationshipState(next, character?.id || target || "unknown_character");
      row.trustTensionNotes = appendLine(row.trustTensionNotes, to || details || title);
    }
  }

  return normalizeCastState(next, characters);
}


function appendRecentFact(context, line) {
  context.recentFacts.importantDiscoveries = appendLine(context.recentFacts.importantDiscoveries, line);
}

function appendLine(existing, nextLine) {
  const clean = String(nextLine || "").trim();
  if (!clean) return String(existing || "");
  const current = String(existing || "").trim();
  if (!current) return clean;
  if (current.includes(clean)) return current;
  return `${current}\n${clean}`;
}

function formatUpdateSummary(update) {
  const parts = [
    update.title || "Suggested update",
    update.target ? `Target: ${update.target}` : "",
    update.from || update.to ? `${update.from || "?"} → ${update.to || "?"}` : "",
    update.details || ""
  ].filter(Boolean);
  return parts.join(" — ");
}

function findCharacterFromText(text, characterByName, characters = []) {
  const lower = String(text || "").toLowerCase();
  if (!lower) return null;
  for (const [name, character] of characterByName) {
    if (lower.includes(name)) return character;
  }
  return characters.find((character) => lower.includes(String(character.id).toLowerCase())) || null;
}

function ensureCharacterState(castState, characterId) {
  let row = castState.activeCharacters.find((item) => item.characterId === characterId);
  if (!row) {
    row = { characterId, presence: "active", present: true, outfit: "", mood: "", condition: "", currentGoal: "", knowledge: "", temporarySecret: "", sceneInstruction: "" };
    castState.activeCharacters.push(row);
  }
  return row;
}

function ensureRelationshipState(castState, characterId) {
  let row = castState.relationships.find((item) => item.characterId === characterId);
  if (!row) {
    row = { characterId, relationshipToUser: "", trustTensionNotes: "", promisesConflicts: "" };
    castState.relationships.push(row);
  }
  return row;
}

function chooseActiveCastLead(story, storyCharacters = []) {
  if (!story || !storyCharacters.length) return storyCharacters[0] || null;
  const contextRows = Array.isArray(story.castState?.activeCharacters) ? story.castState.activeCharacters : [];
  const activeIds = contextRows
    .filter((row) => normalizeCastPresence(row.presence || (row.present === false ? "inactive" : "active")) === "active")
    .map((row) => row.characterId)
    .filter(Boolean);
  return activeIds.map((id) => storyCharacters.find((character) => character.id === id)).find(Boolean)
    || storyCharacters[0]
    || null;
}

function loadInitialState() {
  const worlds = repository.worlds.list(defaultWorlds).map(normalizeWorld);
  const characters = repository.characters.list(defaultCharacters).map((character) => normalizeCharacter(character, worlds));
  const stories = repository.stories.list(defaultStories).map((story) => normalizeStory(story, worlds, characters));
  const storedStoryId = repository.activeStory.get();
  const activeStory = stories.find((story) => story.id === storedStoryId) || null;
  const activeStoryId = activeStory?.id || null;

  if (activeStoryId) repository.activeStory.set(activeStoryId);
  else repository.activeStory.clear();

  return {
    worlds,
    characters,
    stories,
    activeStoryId,
    activeView: activeStory ? "story" : "landing",
    selectedCharacterSheetId: chooseActiveCastLead(activeStory, getStoryCharactersFromLists(activeStory, characters))?.id || characters[0]?.id || "",
    selectedWorldSheetId: activeStory?.worldId || worlds[0]?.id || "",
    chatHistory: activeStory ? loadChatForStory(activeStory, worlds, characters) : [],
    activeLoreMemory: activeStory ? repository.loreMemory.load(activeStory.id, []) : []
  };
}

function loadChatForStory(story, worlds, characters) {
  const saved = repository.chats.load(story?.id, null);
  if (Array.isArray(saved)) return saved.map(normalizeChatMessage);

  const world = worlds.find((item) => item.id === story.worldId) || worlds[0];
  const storyCharacters = getStoryCharactersFromLists(story, characters);
  const lead = chooseActiveCastLead(story, storyCharacters) || characters[0];
  if (!story || !world || !lead) return [];

  return [{ role: "assistant", content: buildOpeningMessage(story, lead, world, storyCharacters) }];
}

function getStoryCharactersFromLists(story, characters) {
  const ids = Array.isArray(story?.characterIds) ? [...story.characterIds] : [];
  return uniqueCompact(ids.length ? ids : [story?.mainCharacterId])
    .map((id) => characters.find((character) => character.id === id))
    .filter(Boolean);
}

function uniqueCompact(values) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}

function createAssistantReply(content) {
  return {
    role: "assistant",
    content,
    alternatives: [content],
    selectedIndex: 0
  };
}

function commitLastAssistantChoice(history) {
  const nextHistory = history.map((message) => ({ ...message }));
  const lastMessage = nextHistory[nextHistory.length - 1];
  if (!isAssistantMessageWithOptions(lastMessage)) return nextHistory;

  const selectedText = lastMessage.alternatives[lastMessage.selectedIndex] || lastMessage.content;
  lastMessage.content = selectedText;
  delete lastMessage.alternatives;
  delete lastMessage.selectedIndex;
  return nextHistory;
}

function findLastAssistantIndex(history) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.role === "assistant") return index;
  }
  return -1;
}

function appendGeneratedReplyToLastAssistant(history, continuation) {
  const nextHistory = history.map((message) => ({ ...message }));
  const lastAssistantIndex = findLastAssistantIndex(nextHistory);

  if (lastAssistantIndex === -1) return [...nextHistory, createAssistantReply(continuation)];

  const lastAssistant = nextHistory[lastAssistantIndex];
  const currentText = getMessageDisplayText(lastAssistant).trim();
  const continuationText = String(continuation || "").trim();
  lastAssistant.content = currentText ? `${currentText}\n\n${continuationText}` : continuationText;
  delete lastAssistant.alternatives;
  delete lastAssistant.selectedIndex;
  return nextHistory;
}

function addAlternativeToLastAssistant(history, reply) {
  const nextHistory = history.map((message) => ({
    ...message,
    alternatives: Array.isArray(message.alternatives) ? [...message.alternatives] : message.alternatives
  }));
  const lastMessage = nextHistory[nextHistory.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") {
    return [...nextHistory, createAssistantReply(reply)];
  }
  if (!Array.isArray(lastMessage.alternatives)) {
    lastMessage.alternatives = [lastMessage.content || ""];
    lastMessage.selectedIndex = 0;
  }
  lastMessage.alternatives.push(reply);
  lastMessage.selectedIndex = lastMessage.alternatives.length - 1;
  lastMessage.content = reply;
  return nextHistory;
}

function parseSuggestedUpdates(rawText) {
  const text = String(rawText || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return [];
  }

  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const updates = Array.isArray(parsed.updates) ? parsed.updates : [];

    return updates
      .map((update, index) => normalizeSuggestedUpdate(update, index))
      .filter((update) => update.title || update.details || update.to);
  } catch (error) {
    console.warn("Could not parse suggested updates JSON:", error, rawText);
    return [];
  }
}

function normalizeSuggestedUpdate(update, index) {
  const source = update && typeof update === "object" ? update : {};
  const category = String(source.category || "other").trim().toLowerCase();
  const confidence = Number(source.confidence);

  return {
    id: `suggested_update_${Date.now()}_${index}`,
    category: category || "other",
    title: String(source.title || source.label || "Suggested update").trim(),
    target: String(source.target || source.character || source.object || source.location || "").trim(),
    from: String(source.from || "").trim(),
    to: String(source.to || source.value || "").trim(),
    details: String(source.details || source.reason || source.description || "").trim(),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null
  };
}

function formatAcceptedUpdateAsLore(update) {
  const lines = [
    `Category: ${update.category || "other"}`,
    update.target ? `Target: ${update.target}` : "",
    update.from ? `From: ${update.from}` : "",
    update.to ? `To: ${update.to}` : "",
    update.details ? `Details: ${update.details}` : ""
  ].filter(Boolean);

  return lines.join("\n");
}

function validateIncomingCharacterBundle(character) {
  const issues = [];
  if (!character || typeof character !== "object") issues.push("Missing character object.");
  if (character && !String(character.name || "").trim()) issues.push("Character name is required.");
  const lorebook = character?.lorebook || character?.characterLorebook || [];
  if (lorebook && !Array.isArray(lorebook)) issues.push("Character lorebook must be an array when provided.");
  return { ok: issues.length === 0, issues };
}

function validateIncomingWorldBundle(world) {
  const issues = [];
  if (!world || typeof world !== "object") issues.push("Missing world object.");
  if (world && !String(world.name || "").trim()) issues.push("World name is required.");
  const lorebook = world?.worldLorebook || world?.lorebook || [];
  if (lorebook && !Array.isArray(lorebook)) issues.push("World lorebook must be an array when provided.");
  if (world?.locations && !Array.isArray(world.locations)) issues.push("Locations must be an array when provided.");
  return { ok: issues.length === 0, issues };
}

function validateStoryExportBundle(bundle) {
  const issues = [];
  if (!bundle.story) issues.push("Missing story data.");
  if (!bundle.world) issues.push("Missing world data.");
  if (!Array.isArray(bundle.characters) || bundle.characters.length === 0) issues.push("Missing character data.");
  if (bundle.story && !Array.isArray(bundle.story.storyLorebook)) issues.push("Story lorebook is missing or invalid.");
  if (bundle.world && !Array.isArray(bundle.world.worldLorebook)) issues.push("World lorebook is missing or invalid.");
  if (Array.isArray(bundle.characters)) {
    for (const character of bundle.characters) {
      if (!Array.isArray(character.lorebook)) {
        issues.push(`Character lorebook is missing or invalid for ${character.name || character.id}.`);
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

function validateIncomingStoryBundle(bundle) {
  if (!bundle || typeof bundle !== "object") return "Invalid story file. Could not find story bundle data.";
  if (!bundle.story || !bundle.world || !Array.isArray(bundle.characters)) return "Invalid story file. It must include story, world, and characters.";
  if (bundle.characters.length === 0) return "Invalid story file. It must include at least one character.";
  if (!bundle.world.name) return "Invalid story file. The world needs a name.";
  if (!bundle.characters.some((character) => character && character.name)) return "Invalid story file. At least one character needs a name.";
  return "";
}

function hydrateBundleLore(bundle, storySource, worldSource, characterSources) {
  if (!bundle.completeLore) return;
  if (!Array.isArray(storySource.storyLorebook) && Array.isArray(bundle.completeLore.storyLorebook)) {
    storySource.storyLorebook = bundle.completeLore.storyLorebook;
  }
  if (!Array.isArray(worldSource.worldLorebook) && Array.isArray(bundle.completeLore.worldLorebook)) {
    worldSource.worldLorebook = bundle.completeLore.worldLorebook;
  }
  if (!Array.isArray(bundle.completeLore.characterLorebooks)) return;

  for (const character of characterSources) {
    const loreMatch = bundle.completeLore.characterLorebooks.find((entry) => entry.characterId === character.id);
    if (!Array.isArray(character.lorebook) && loreMatch) {
      character.lorebook = loreMatch.lorebook || [];
    }
  }
}
