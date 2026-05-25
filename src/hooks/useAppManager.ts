import { useMemo, useRef, useReducer } from "react";
import { defaultCharacters, defaultStories, defaultWorlds } from "../constants/defaultData";
import { normalizeCastState, normalizeCharacter, normalizeStory, normalizeWorld } from "../services/normalizers";
import { buildOpeningMessage } from "../services/prompt";
import { repository } from "../services/repository";
import { cloneJson } from "../utils/helpers";
import { isAssistantMessageWithOptions } from "../features/chat/ChatView";
import { chooseActiveCastLead, loadInitialState, getStoryCharactersFromLists, uniqueCompact, loadChatForStory } from "../utils/appHelpers";

import { storyReducer, storyInitialState } from "../reducers/storyReducer";
import { chatReducer, chatInitialState } from "../reducers/chatReducer";
import { loreReducer, loreInitialState } from "../reducers/loreReducer";
import { generationReducer, generationInitialState } from "../reducers/generationReducer";

import useGeneration from "./useGeneration";
import useChatActions from "./useChatActions";
import useStoryActions from "./useStoryActions";
import useCharacterActions from "./useCharacterActions";
import useWorldActions from "./useWorldActions";
import useLoreActions from "./useLoreActions";
import useStateUpdates from "./useStateUpdates";
import useImportExport from "./useImportExport";

export default function useAppManager() {
  // ─── Initial state ───
  const initial = useMemo(loadInitialState, []);

  // ─── Core state with reducers ───
  const [storyState, dispatchStory] = useReducer(storyReducer, {
    ...storyInitialState,
    worlds: initial.worlds,
    characters: initial.characters,
    stories: initial.stories,
    activeStoryId: initial.activeStoryId,
    activeView: initial.activeView,
    selectedCharacterSheetId: initial.selectedCharacterSheetId,
    selectedWorldSheetId: initial.selectedWorldSheetId,
    storyDraft: null,
    debugOpen: false,
  });

  const [chatState, dispatchChat] = useReducer(chatReducer, {
    ...chatInitialState,
    chatHistory: initial.chatHistory,
    editingMessageIndex: null,
  });

  const [loreState, dispatchLore] = useReducer(loreReducer, {
    ...loreInitialState,
    activeLoreMemory: initial.activeLoreMemory,
    pendingUpdates: [],
    selectedPendingUpdateIds: [],
    pendingUpdateStatus: "",
  });

  const [generationState, dispatchGeneration] = useReducer(generationReducer, {
    ...generationInitialState,
    isGenerating: false,
    promptTokens: "-- tokens",
    generationStatus: "Idle",
    progressPercent: 0,
    isExtractingUpdates: false,
  });

  // ─── Destructure state for easier access ───
  const {
    worlds,
    characters,
    stories,
    activeStoryId,
    activeView,
    selectedCharacterSheetId,
    selectedWorldSheetId,
    storyDraft,
    debugOpen,
  } = storyState;

  const {
    chatHistory,
    editingMessageIndex,
  } = chatState;

  const {
    activeLoreMemory,
    pendingUpdates,
    selectedPendingUpdateIds,
    pendingUpdateStatus,
  } = loreState;

  const {
    isGenerating,
    promptTokens,
    generationStatus,
    progressPercent,
    isExtractingUpdates,
  } = generationState;

  // ─── Refs ───
  const storyImportRef = useRef(null);
  const characterImportRef = useRef(null);
  const worldImportRef = useRef(null);

  // ─── Derived state ───
  const activeStory = useMemo(() => stories.find((s) => s.id === activeStoryId) || null, [stories, activeStoryId]);
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

  // ─── Lookup helpers ───
  function getWorld(id) { return worlds.find((w) => w.id === id) || worlds[0] || null; }
  function getCharacter(id) { return characters.find((c) => c.id === id) || characters[0] || null; }
  function getStoryCharacters(story) { return getStoryCharactersFromLists(story, characters); }

  // ─── Persistence helpers ───
  function saveWorldList(next) { dispatchStory({ type: "SAVE_WORLDS", payload: next }); repository.worlds.saveAll(next); }
  function saveCharacterList(next) { dispatchStory({ type: "SAVE_CHARACTERS", payload: next }); repository.characters.saveAll(next); }
  function saveStoryList(next) { dispatchStory({ type: "SAVE_STORIES", payload: next }); repository.stories.saveAll(next); }
  function saveChatForActiveStory(next) { if (!activeStoryId) return; repository.chats.save(activeStoryId, next); }
  function saveLoreForActiveStory(next) { if (!activeStoryId) return; repository.loreMemory.save(activeStoryId, next, { quiet: true }); }

  // ─── Clear active story ───
  function clearActiveStorySelection() {
    dispatchStory({ type: "CLEAR_ACTIVE_STORY" });
    dispatchChat({ type: "SET_HISTORY", payload: [] });
    dispatchLore({ type: "SET_ACTIVE_LORE", payload: [] });
    repository.activeStory.clear();
  }

  function resetCurrentStoryState(storyId = activeStory?.id, story = activeStory, world = activeWorld, storyChars = activeStoryCharacters) {
    if (!storyId || !story || !world) return;
    const cast = (storyChars?.length ? storyChars : getStoryCharacters(story)).filter(Boolean);
    const lead = chooseActiveCastLead(story, cast);
    const opening = [{ role: "assistant", content: buildOpeningMessage(story, lead, world, cast) }];
    dispatchLore({ type: "SET_ACTIVE_LORE", payload: [] }); repository.loreMemory.save(storyId, [], { quiet: true });
    dispatchChat({ type: "SET_HISTORY", payload: opening }); repository.chats.save(storyId, opening);
  }

  // ─── Compose sub-hooks ───
  const generation = useGeneration();
  const chatActions = useChatActions({ generateAssistantReply: generation.generateAssistantReply });
  const storyActions = useStoryActions();
  const characterActions = useCharacterActions();
  const worldActions = useWorldActions();
  const loreActions = useLoreActions();
  const stateUpdates = useStateUpdates();
  const importExport = useImportExport();

  // ─── Factory reset ───
  function factoryReset() {
    if (isGenerating) return;
    if (!confirm("This will delete saved stories, characters, worlds, chats, and lore memory. Continue?")) return;
    repository.maintenance.clearKnownData(stories, characters);
    const nextWorlds = defaultWorlds.map(normalizeWorld);
    const nextCharacters = defaultCharacters.map((c) => normalizeCharacter(c, nextWorlds));
    const nextStories = defaultStories.map((s) => normalizeStory(s, nextWorlds, nextCharacters));
    saveWorldList(nextWorlds); saveCharacterList(nextCharacters); saveStoryList(nextStories);
    dispatchStory({
      type: "FACTORY_RESET",
      payload: {
        worlds: nextWorlds,
        characters: nextCharacters,
        stories: nextStories,
      },
    });
    clearActiveStorySelection();
  }

  // ─── Wire generation into chat actions (bound wrappers) ───
  async function sendMessage(text) {
    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0 || isGenerating) return;
    const { commitLastAssistantChoice, createAssistantReply } = await import("../utils/appHelpers");
    const committed = commitLastAssistantChoice(chatHistory);
    const baseHistory = [...committed, { role: "user", content: text }];
    saveChatForActiveStory(baseHistory);
    await generation.generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
      promptHistory: baseHistory,
      finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)],
      activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory,
      setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }),
      saveChatForActiveStory,
      setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }),
      saveLoreForActiveStory,
      setIsGenerating: () => dispatchGeneration({ type: "START_GENERATION" }),
      setEditingMessageIndex: (idx) => dispatchChat({ type: "START_EDITING", payload: idx }),
      setPromptTokens: (tokens) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: tokens }),
      setGenerationStatus: (status) => dispatchGeneration({ type: "SET_STATUS", payload: status }),
      setProgressPercent: (percent) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent }),
    });
  }

  async function continueLastReply() {
    const { commitLastAssistantChoice, appendGeneratedReplyToLastAssistant, findLastAssistantIndex } = await import("../utils/appHelpers");
    if (isGenerating) return;
    const lastAssistantIndex = findLastAssistantIndex(chatHistory);
    if (lastAssistantIndex === -1) return alert("Nothing to continue.");
    if (lastAssistantIndex !== chatHistory.length - 1) return alert("Continue works best after an assistant reply. Generate or reroll the next reply first.");
    const committed = commitLastAssistantChoice(chatHistory);
    await generation.generateAssistantReply({
      visibleHistory: [...committed, { role: "assistant", content: "Thinking..." }],
      promptHistory: committed,
      privateInstruction: "Continue directly from your previous assistant reply. Add the next natural part of the same reply or scene beat. Do not restart the scene. Do not summarize. Do not speak for the user. Do not ask for the user's next move.",
      finalBuilder: (reply) => appendGeneratedReplyToLastAssistant(committed, reply),
      activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory,
      setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }),
      saveChatForActiveStory,
      setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }),
      saveLoreForActiveStory,
      setIsGenerating: () => dispatchGeneration({ type: "START_GENERATION" }),
      setEditingMessageIndex: (idx) => dispatchChat({ type: "START_EDITING", payload: idx }),
      setPromptTokens: (tokens) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: tokens }),
      setGenerationStatus: (status) => dispatchGeneration({ type: "SET_STATUS", payload: status }),
      setProgressPercent: (percent) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent }),
    });
  }

  async function elaborateLastReply() {
    const { addAlternativeToLastAssistant } = await import("../utils/appHelpers");
    const { getMessageDisplayText } = await import("../features/chat/ChatView");
    if (isGenerating) return;
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return alert("The last message is not an assistant reply.");
    const originalReply = getMessageDisplayText(lastMessage);
    const historyWithoutLast = chatHistory.slice(0, -1);
    await generation.generateAssistantReply({
      visibleHistory: [...historyWithoutLast, { role: "assistant", content: "Thinking..." }],
      promptHistory: historyWithoutLast,
      privateInstruction: `Rewrite the previous assistant reply as a richer version with more sensory detail, emotion, atmosphere, and in-character nuance. Preserve the same basic intent and scene direction. Do not make the reply wildly longer than needed. Do not speak for the user. Return only the revised in-world reply.\n\nPrevious assistant reply:\n"""${originalReply}"""`,
      finalBuilder: (reply) => addAlternativeToLastAssistant(chatHistory, reply),
      activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory,
      setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }),
      saveChatForActiveStory,
      setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }),
      saveLoreForActiveStory,
      setIsGenerating: () => dispatchGeneration({ type: "START_GENERATION" }),
      setEditingMessageIndex: (idx) => dispatchChat({ type: "START_EDITING", payload: idx }),
      setPromptTokens: (tokens) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: tokens }),
      setGenerationStatus: (status) => dispatchGeneration({ type: "SET_STATUS", payload: status }),
      setProgressPercent: (percent) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent }),
    });
  }

  async function rerollLastReply() {
    const { addAlternativeToLastAssistant } = await import("../utils/appHelpers");
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to reroll.");
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return alert("The last message is not an assistant reply.");
    const historyWithoutLast = chatHistory.slice(0, -1);
    await generation.generateAssistantReply({
      visibleHistory: [...historyWithoutLast, { role: "assistant", content: "Thinking..." }],
      promptHistory: historyWithoutLast,
      privateInstruction: "Generate a different in-character assistant reply for this point in the scene. Keep the same story context, but vary the wording, emotional beat, and immediate action. Do not mention rerolling.",
      finalBuilder: (reply) => addAlternativeToLastAssistant(chatHistory, reply),
      activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory,
      setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }),
      saveChatForActiveStory,
      setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }),
      saveLoreForActiveStory,
      setIsGenerating: () => dispatchGeneration({ type: "START_GENERATION" }),
      setEditingMessageIndex: (idx) => dispatchChat({ type: "START_EDITING", payload: idx }),
      setPromptTokens: (tokens) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: tokens }),
      setGenerationStatus: (status) => dispatchGeneration({ type: "SET_STATUS", payload: status }),
      setProgressPercent: (percent) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent }),
    });
  }

  async function regenerateFromMessage(index) {
    const { commitLastAssistantChoice, createAssistantReply } = await import("../utils/appHelpers");
    if (isGenerating) return;
    const targetMessage = chatHistory[index];
    if (!targetMessage) return;
    if (index <= 0 && targetMessage.role === "assistant") { alert("The opening message cannot be regenerated from here."); return; }
    let keepCount = index + 1;
    let instruction = "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.";
    if (targetMessage.role === "assistant") { keepCount = index; instruction = "Regenerate the assistant reply at this point in the scene. Write a fresh in-character continuation based only on the story context and the chat before this message. Do not mention regeneration."; }
    const baseHistory = commitLastAssistantChoice(chatHistory).slice(0, keepCount);
    repository.chats.save(activeStoryId, baseHistory);
    await generation.generateAssistantReply({
      visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
      promptHistory: baseHistory, privateInstruction: instruction,
      finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)],
      activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory,
      setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }),
      saveChatForActiveStory,
      setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }),
      saveLoreForActiveStory,
      setIsGenerating: () => dispatchGeneration({ type: "START_GENERATION" }),
      setEditingMessageIndex: (idx) => dispatchChat({ type: "START_EDITING", payload: idx }),
      setPromptTokens: (tokens) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: tokens }),
      setGenerationStatus: (status) => dispatchGeneration({ type: "SET_STATUS", payload: status }),
      setProgressPercent: (percent) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent }),
    });
  }

  function rollbackLastExchange() {
    if (isGenerating) return;
    if (chatHistory.length <= 1) return alert("Nothing to rollback.");
    const nextHistory = [...chatHistory];
    const last = nextHistory[nextHistory.length - 1];
    const previous = nextHistory[nextHistory.length - 2];
    if (last?.role === "assistant" && previous?.role === "user") nextHistory.splice(nextHistory.length - 2, 2);
    else nextHistory.pop();
    dispatchChat({ type: "SET_HISTORY", payload: nextHistory }); saveChatForActiveStory(nextHistory);
  }

  function resetChat() {
    if (isGenerating) return;
    if (!confirm("Reset this story's chat back to its opening message?")) return;
    resetCurrentStoryState();
  }

  function startEditingMessage(index) { if (isGenerating) return; dispatchChat({ type: "START_EDITING", payload: index }); }
  function cancelMessageEdit() { dispatchChat({ type: "CANCEL_EDITING" }); }

  async function saveMessageEdit(index, newText, regenerateAfterSave = false) {
    if (isGenerating) return;
    const trimmed = newText.trim();
    if (!trimmed) return alert("Message cannot be empty.");
    const nextHistory = chatHistory.map((message, i) => {
      if (i !== index) return message;
      if (isAssistantMessageWithOptions(message)) {
        const alternatives = [...message.alternatives]; alternatives[message.selectedIndex] = trimmed;
        return { ...message, alternatives, content: trimmed };
      }
      return { ...message, content: trimmed };
    });
    dispatchChat({ type: "FINISH_EDITING", payload: nextHistory }); repository.chats.save(activeStoryId, nextHistory);
    if (regenerateAfterSave && nextHistory[index]?.role === "user") {
      const { createAssistantReply, commitLastAssistantChoice } = await import("../utils/appHelpers");
      const baseHistory = nextHistory.slice(0, index + 1);
      await generation.generateAssistantReply({
        visibleHistory: [...baseHistory, { role: "assistant", content: "Thinking..." }],
        promptHistory: baseHistory,
        privateInstruction: "Generate the assistant's next in-character reply after the selected user message. Continue naturally from this point. Do not mention regeneration.",
        finalBuilder: (reply) => [...baseHistory, createAssistantReply(reply)],
        activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory,
        setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }),
        saveChatForActiveStory,
        setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }),
        saveLoreForActiveStory,
        setIsGenerating: () => dispatchGeneration({ type: "START_GENERATION" }),
        setEditingMessageIndex: (idx) => dispatchChat({ type: "START_EDITING", payload: idx }),
        setPromptTokens: (tokens) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: tokens }),
        setGenerationStatus: (status) => dispatchGeneration({ type: "SET_STATUS", payload: status }),
        setProgressPercent: (percent) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent }),
      });
    }
  }

  function deleteMessagesFromIndex(index) {
    if (isGenerating) return;
    if (index <= 0) return alert("The opening message cannot be deleted from here.");
    if (!confirm("Delete this message and everything after it?")) return;
    const nextHistory = chatHistory.slice(0, index);
    dispatchChat({ type: "CANCEL_EDITING" }); dispatchChat({ type: "SET_HISTORY", payload: nextHistory }); saveChatForActiveStory(nextHistory);
  }

  function selectAssistantOption(messageIndex, optionIndex) {
    const nextHistory = chatHistory.map((message, index) => {
      if (index !== messageIndex || !isAssistantMessageWithOptions(message)) return message;
      const selectedText = message.alternatives[optionIndex] || message.content || "";
      return { ...message, selectedIndex: optionIndex, content: selectedText };
    });
    dispatchChat({ type: "SET_HISTORY", payload: nextHistory }); saveChatForActiveStory(nextHistory);
  }

  // ─── Lore wrappers ───
  function updateStoryLore(index, patch) {
    loreActions.updateStoryLore({ activeStory, stories, activeWorld, activeCharacter, characters, saveStoryList, activeLoreMemory, setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), saveLoreForActiveStory, index, patch });
  }
  function updateWorldLore(index, patch) {
    loreActions.updateWorldLore({ activeWorld, worlds, activeStory, activeCharacter, characters, saveWorldList, saveStoryList, stories, activeLoreMemory, setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), saveLoreForActiveStory, index, patch });
  }
  function updateCharacterLore(characterId, index, patch) {
    loreActions.updateCharacterLore({ characterId, index, patch, activeCharacter, characters, activeStory, activeWorld, saveCharacterList, activeLoreMemory, setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), saveLoreForActiveStory });
  }
  function saveTemporaryLore(lorebook) { loreActions.saveTemporaryLore({ activeStory, stories, activeWorld, activeCharacter, characters, saveStoryList, activeLoreMemory, setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), saveLoreForActiveStory, lorebook }); }
  function clearTemporaryLore() { saveTemporaryLore([]); }
  function refreshActiveLore() { loreActions.refreshActiveLore({ activeStory, activeWorld, activeCharacter, activeStoryCharacters, chatHistory, activeLoreMemory, setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), saveLoreForActiveStory }); }

  // ─── State update wrappers ───
  function extractStateUpdates() {
    stateUpdates.extractStateUpdates({ activeStory, activeWorld, activeStoryCharacters, isGenerating, isExtractingUpdates, chatHistory, setIsExtractingUpdates: (val) => dispatchGeneration({ type: val ? "START_EXTRACTING_UPDATES" : "COMPLETE_EXTRACTING_UPDATES" }), setPendingUpdateStatus: (status) => dispatchLore({ type: "SET_PENDING_UPDATE_STATUS", payload: status }), setPendingUpdates: (updates) => dispatchLore({ type: "SET_PENDING_UPDATES", payload: updates }), setSelectedPendingUpdateIds: (ids) => dispatchLore({ type: "SELECT_ALL_PENDING_UPDATES", payload: ids }) });
  }
  function togglePendingUpdate(updateId) { stateUpdates.togglePendingUpdate({ updateId, selectedPendingUpdateIds, setSelectedPendingUpdateIds: (ids) => dispatchLore({ type: "SELECT_ALL_PENDING_UPDATES", payload: ids }) }); }
  function rejectPendingUpdates() { stateUpdates.rejectPendingUpdates({ setPendingUpdates: (updates) => dispatchLore({ type: "SET_PENDING_UPDATES", payload: updates }), setSelectedPendingUpdateIds: (ids) => dispatchLore({ type: "SELECT_ALL_PENDING_UPDATES", payload: ids }), setPendingUpdateStatus: (status) => dispatchLore({ type: "SET_PENDING_UPDATE_STATUS", payload: status }) }); }
  function applySelectedPendingUpdates() {
    stateUpdates.applySelectedPendingUpdates({ activeStory, stories, activeWorld, activeStoryCharacters, pendingUpdates, selectedPendingUpdateIds, saveStoryList, setPendingUpdates: (updates) => dispatchLore({ type: "SET_PENDING_UPDATES", payload: updates }), setSelectedPendingUpdateIds: (ids) => dispatchLore({ type: "SELECT_ALL_PENDING_UPDATES", payload: ids }), setPendingUpdateStatus: (status) => dispatchLore({ type: "SET_PENDING_UPDATE_STATUS", payload: status }) });
  }

  // ─── Import/Export wrappers ───
  function exportCharacter(character) { importExport.exportCharacter({ character }); }
  function exportWorld(world) { importExport.exportWorld({ world }); }
  function exportActiveStory() { importExport.exportActiveStory({ activeStory, getWorld, getStoryCharacters, chatHistory, activeStoryId }); }
  async function handleImportStoryFile(event) { await importExport.handleImportFile(event, (parsed) => importExport.importStoryBundle({ parsed, worlds, characters, stories, repository, saveWorldList, saveCharacterList, saveStoryList, setActiveStoryId: (id) => dispatchStory({ type: "SWITCH_STORY", payload: { storyId: id } }), setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }), setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }), setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }), setStoryDraft: (draft) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) })); }
  async function handleImportCharacterFile(event) { await importExport.handleImportFile(event, (parsed) => importExport.importCharacterBundle({ parsed, worlds, characters, saveCharacterList, setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) })); }
  async function handleImportWorldFile(event) { await importExport.handleImportFile(event, (parsed) => importExport.importWorldBundle({ parsed, worlds, saveWorldList, setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) })); }

  // ─── Return everything the UI needs ───
  return {
    stories, worlds, characters, activeStoryId, activeView, selectedCharacterSheetId, selectedWorldSheetId,
    storyDraft, chatHistory, editingMessageIndex, activeLoreMemory, isGenerating,
    promptTokens, generationStatus, progressPercent, debugOpen, isExtractingUpdates,
    pendingUpdates, selectedPendingUpdateIds, pendingUpdateStatus,
    activeStory, activeWorld, activeStoryCharacters, activeCharacter, selectedCharacter, selectedWorld, loreStatusText,
    storyImportRef, characterImportRef, worldImportRef, abortControllerRef: generation.abortControllerRef,
    getWorld, getCharacter,
    openStoryCreationSheet: (deps) => storyActions.openStoryCreationSheet({ isGenerating, worlds, characters, activeWorld, activeCharacter, setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }), setStoryDraft: (draft) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft }), ...deps }),
    switchStory: (storyId) => storyActions.switchStory({ storyId, isGenerating, stories, worlds, characters, repository, getStoryCharacters, setActiveStoryId: (id) => dispatchStory({ type: "SWITCH_STORY", payload: { storyId: id } }), setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }), setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }), setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }), setStoryDraft: (draft) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) }),
    startStoryFromCreationSheet: (draft) => storyActions.startStoryFromCreationSheet({
      worlds, characters, stories, draft,
      saveWorldList, saveCharacterList, saveStoryList,
      repository, getStoryCharacters,
      setActiveStoryId: (id) => dispatchStory({ type: "SWITCH_STORY", payload: { storyId: id } }),
      setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }),
      setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }),
      setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }),
      setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }),
      setStoryDraft: (draft) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft }),
      setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view })
    }),
    cancelStoryCreation: () => storyActions.cancelStoryCreation({ activeStory, setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }), setStoryDraft: (draft) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft }) }),
    deleteActiveStory: () => storyActions.deleteActiveStory({ activeStory, stories, repository, saveStoryList, clearActiveStorySelection }),
    createBlankCharacter: () => characterActions.createBlankCharacter({ isGenerating, worlds, characters, selectedWorldSheetId, activeWorld, saveCharacterList, setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }), setStoryDraft: (draft) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft }) }),
    saveCharacterSheetEdits: (draft) => characterActions.saveCharacterSheetEdits({ characterDraft: draft, characters, worlds, saveCharacterList }),
    saveStoryCastIdentity: (draft) => characterActions.saveStoryCastIdentity({ characterDraft: draft, characters, worlds, saveCharacterList, setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }) }),
    deleteSelectedCharacter: (id) => characterActions.deleteSelectedCharacter({ characterId: id, characters, stories, getCharacter, saveCharacterList, repository, setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) }),
    setCharacterPresenceInActiveStory: (id, presence) => characterActions.setCharacterPresenceInActiveStory({ characterId: id, presence, activeStory, getCharacter, getStoryCharacters, stories, saveStoryList, setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) }),
    addCharacterToActiveStory: (id) => characterActions.addCharacterToActiveStory({ characterId: id, activeStory, getCharacter, characters, stories, saveStoryList, setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }) }),
    removeCharacterFromActiveStory: (id) => characterActions.removeCharacterFromActiveStory({ characterId: id, activeStory, getCharacter, characters, stories, saveStoryList, setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }) }),
    createBlankWorld: () => worldActions.createBlankWorld({ isGenerating, worlds, saveWorldList, setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }), setStoryDraft: (draft) => dispatchStory({ type: "SET_STORY_DRAFT", payload: draft }) }),
    saveWorldSheetEdits: (draft) => worldActions.saveWorldSheetEdits({ worldDraft: draft, worlds, saveWorldList }),
    deleteSelectedWorld: (id) => worldActions.deleteSelectedWorld({ worldId: id, worlds, stories, getWorld, saveWorldList, setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) }),
    assignWorldToStory: (id) => storyActions.assignWorldToStory({ worldId: id, activeStory, worlds, getStoryCharacters, getWorld, saveStoryList, resetCurrentStoryState, stories, setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }), setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }) }),
    factoryReset,
    sendMessage, continueLastReply, elaborateLastReply, rerollLastReply, rollbackLastExchange, resetChat,
    startEditingMessage, cancelMessageEdit, saveMessageEdit, deleteMessagesFromIndex, regenerateFromMessage, selectAssistantOption,
    cancelGeneration: generation.cancelGeneration,
    retryLastGeneration: () => generation.retryLastGeneration({ isGenerating, activeStory, activeWorld, activeCharacter, activeStoryCharacters, activeLoreMemory, setChatHistory: (next) => dispatchChat({ type: "SET_HISTORY", payload: next }), saveChatForActiveStory, setActiveLoreMemory: (next) => dispatchLore({ type: "SET_ACTIVE_LORE", payload: next }), saveLoreForActiveStory, setIsGenerating: () => dispatchGeneration({ type: "START_GENERATION" }), setEditingMessageIndex: (idx) => dispatchChat({ type: "START_EDITING", payload: idx }), setPromptTokens: (tokens) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: tokens }), setGenerationStatus: (status) => dispatchGeneration({ type: "SET_STATUS", payload: status }), setProgressPercent: (percent) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent }) }),
    updateStoryLore, updateWorldLore, updateCharacterLore, saveTemporaryLore, clearTemporaryLore, refreshActiveLore,
    extractStateUpdates, togglePendingUpdate, rejectPendingUpdates, applySelectedPendingUpdates,
    saveDirectorNotes: (notes) => storyActions.saveDirectorNotes({ activeStory, stories, saveStoryList, notes }),
    clearDirectorNotes: () => storyActions.clearDirectorNotes({ activeStory, stories, saveStoryList }),
    saveCurrentContext: () => storyActions.saveCurrentContext({ activeStory, stories, saveStoryList }),
    saveSceneControl: (ctx, notes) => storyActions.saveSceneControl({ activeStory, stories, saveStoryList, nextContext: ctx, nextDirectorNotes: notes }),
    saveStoryMemory: (mem) => storyActions.saveStoryMemory({ activeStory, stories, saveStoryList, nextMemory: mem }),
    saveCastState: (cs) => storyActions.saveCastState({ activeStory, stories, saveStoryList, activeStoryCharacters, nextCastState: cs }),
    handleImportStoryFile, handleImportCharacterFile, handleImportWorldFile,
    exportCharacter, exportWorld, exportActiveStory,
    setDebugOpen: (open) => dispatchStory({ type: "SET_DEBUG_OPEN", payload: open }),
    setActiveView: (view) => dispatchStory({ type: "SET_ACTIVE_VIEW", payload: view }),
    setSelectedCharacterSheetId: (id) => dispatchStory({ type: "SELECT_CHARACTER_SHEET", payload: id }),
    setSelectedWorldSheetId: (id) => dispatchStory({ type: "SELECT_WORLD_SHEET", payload: id }),
  };
}
