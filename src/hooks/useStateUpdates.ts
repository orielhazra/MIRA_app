// State update extraction hook — AI-suggested scene/cast/memory updates.

import { normalizeCurrentContext, normalizeCastState, normalizeStoryMemory } from "../services/normalizers";
import { streamChatCompletion } from "../services/koboldApi";
import { getMessageDisplayText } from "../utils/chatMessageUtils";
import {
  parseSuggestedUpdates,
  applyUpdatesToCurrentContext,
  applyUpdatesToCastState,
  applyUpdatesToStoryMemory,
  syncDirectorNotesFromContext,
} from "../utils/appHelpers";
import { Story, World, Character, ChatMessage } from "../types";

interface ExtractDeps {
  activeStory: Story | null;
  activeWorld: World | null;
  activeStoryCharacters: Character[];
  isGenerating: boolean;
  isExtractingUpdates: boolean;
  chatHistory: ChatMessage[];
  setIsExtractingUpdates: (val: boolean) => void;
  setPendingUpdateStatus: (status: string) => void;
  setPendingUpdates: (updates: any[]) => void;
  setSelectedPendingUpdateIds: (ids: string[]) => void;
}

interface ApplyDeps {
  activeStory: Story | null;
  activeWorld: World | null;
  activeStoryCharacters: Character[];
  pendingUpdates: any[];
  selectedPendingUpdateIds: string[];
  saveActiveStory: (story: Story) => void;
  setPendingUpdates: (updates: any[]) => void;
  setSelectedPendingUpdateIds: (ids: string[]) => void;
  setPendingUpdateStatus: (status: string) => void;
}

export default function useStateUpdates() {
  async function extractStateUpdates(deps: ExtractDeps) {
    const {
      activeStory,
      activeWorld,
      activeStoryCharacters,
      isGenerating,
      isExtractingUpdates,
      chatHistory,
      setIsExtractingUpdates,
      setPendingUpdateStatus,
      setPendingUpdates,
      setSelectedPendingUpdateIds,
    } = deps;

    if (!activeStory || !activeWorld || activeStoryCharacters.length === 0) return;
    if (isGenerating || isExtractingUpdates) return;
    if (chatHistory.length === 0) {
      setPendingUpdateStatus("There is no chat history to analyze yet.");
      return;
    }

    setIsExtractingUpdates(true);
    setPendingUpdateStatus("Extracting possible state updates...");
    setPendingUpdates([]);
    setSelectedPendingUpdateIds([]);

    const recentHistory = chatHistory
      .slice(-12)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${getMessageDisplayText(m)}`)
      .join("\n\n");

    const updatePrompt = `You extract persistent roleplay state updates from the latest chat. Return JSON only. Do not write prose, markdown, or code fences.\n\nSuggest only changes that are clearly supported by the chat. Do not invent new facts. Include a confidence from 0 to 1.\n\nAllowed categories: scene, location, character, outfit, object, inventory, relationship, memory, other.\n\nReturn this shape exactly:\n{"updates":[{"category":"location","title":"Short human-readable update","target":"Who or what changes","from":"Previous value","to":"New value","details":"One sentence","confidence":0.8}]}\n\nIf there are no meaningful updates, return {"updates":[]}.\n\nCurrent story: ${activeStory.title}\nScenario: ${activeStory.scenario || "None"}\nWorld: ${activeWorld.name}\nActive cast: ${activeStoryCharacters.map((c) => c.name).join(", ") || "None"}\nRecent chat:\n${recentHistory}`;

    try {
      const reply = await streamChatCompletion([
        { role: "system", content: "You are a strict JSON extraction tool for a local roleplay app." },
        { role: "user", content: updatePrompt },
      ]);
      const updates = parseSuggestedUpdates(reply);
      setPendingUpdates(updates);
      setSelectedPendingUpdateIds(updates.map((u: any) => u.id));
      setPendingUpdateStatus(
        updates.length
          ? `${updates.length} suggested update${updates.length === 1 ? "" : "s"} ready for review.`
          : "No clear state updates found."
      );
    } catch (error) {
      setPendingUpdateStatus(
        `Could not extract updates: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsExtractingUpdates(false);
    }
  }

  function togglePendingUpdate({
    updateId,
    selectedPendingUpdateIds,
    setSelectedPendingUpdateIds,
  }: {
    updateId: string;
    selectedPendingUpdateIds: string[];
    setSelectedPendingUpdateIds: (ids: string[]) => void;
  }) {
    const nextIds = selectedPendingUpdateIds.includes(updateId)
      ? selectedPendingUpdateIds.filter((id) => id !== updateId)
      : [...selectedPendingUpdateIds, updateId];

    setSelectedPendingUpdateIds(nextIds);
  }

  function rejectPendingUpdates({
    setPendingUpdates,
    setSelectedPendingUpdateIds,
    setPendingUpdateStatus,
  }: any) {
    setPendingUpdates([]);
    setSelectedPendingUpdateIds([]);
    setPendingUpdateStatus("");
  }

  function applySelectedPendingUpdates(deps: ApplyDeps) {
    const {
      activeStory,
      activeWorld,
      activeStoryCharacters,
      pendingUpdates,
      selectedPendingUpdateIds,
      saveActiveStory,
      setPendingUpdates,
      setSelectedPendingUpdateIds,
      setPendingUpdateStatus,
    } = deps;

    if (!activeStory) return;

    const selectedIdSet = new Set(selectedPendingUpdateIds);
    const selected = pendingUpdates.filter((u) => selectedIdSet.has(u.id));
    if (selected.length === 0) {
      setPendingUpdateStatus("Select at least one update to apply.");
      return;
    }

    const nextContext = applyUpdatesToCurrentContext(activeStory.currentContext, selected, activeWorld);
    const nextCastState = applyUpdatesToCastState(activeStory.castState, selected, activeStory.castMembers, activeStoryCharacters);
    const nextStoryMemory = applyUpdatesToStoryMemory(activeStory.storyMemory, selected, activeStory, activeStoryCharacters);

    const normalizedContext = normalizeCurrentContext(nextContext);
    const normalizedCastState = normalizeCastState(nextCastState, activeStory.castMembers, activeStoryCharacters);
    const normalizedStoryMemory = normalizeStoryMemory(nextStoryMemory);

    saveActiveStory({
      ...activeStory,
      currentContext: normalizedContext,
      castState: normalizedCastState,
      storyMemory: normalizedStoryMemory,
      directorNotes: syncDirectorNotesFromContext(activeStory.directorNotes, normalizedContext),
    });

    setPendingUpdates(pendingUpdates.filter((u) => !selectedIdSet.has(u.id)));
    setSelectedPendingUpdateIds([]);
    setPendingUpdateStatus(
      `${selected.length} update${selected.length === 1 ? "" : "s"} applied to Scene Control / Cast State / Story Memory.`
    );
  }

  return { extractStateUpdates, togglePendingUpdate, rejectPendingUpdates, applySelectedPendingUpdates };
}
