// World CRUD hook — creation, editing, deletion.

import { normalizeWorld } from "../services/normalizers.js";
import { createId } from "../utils/helpers.js";

export default function useWorldActions() {

  function createBlankWorld(deps) {
    const { isGenerating, worlds, saveWorldList, setSelectedWorldSheetId, setActiveView, setStoryDraft } = deps;
    if (isGenerating) return;
    const newWorld = normalizeWorld({ id: createId("world"), name: "New World", shortDescription: "Blank world template", description: "", rules: "", worldLorebook: [] });
    saveWorldList([...worlds, newWorld]);
    setSelectedWorldSheetId(newWorld.id); setActiveView("world"); setStoryDraft(null);
  }

  function saveWorldSheetEdits({ worldDraft, worlds, saveWorldList }) {
    const normalized = normalizeWorld(worldDraft);
    saveWorldList(worlds.map((w) => w.id === normalized.id ? normalized : w));
  }

  function deleteSelectedWorld(deps) {
    const { worlds, stories, worldId, getWorld, saveWorldList, setSelectedWorldSheetId, setActiveView } = deps;
    const world = getWorld(worldId);
    if (!world) return;
    const storiesUsingWorld = stories.filter((s) => s.worldId === world.id);
    if (storiesUsingWorld.length > 0) {
      const storyNames = storiesUsingWorld.map((s) => `"${s.title}"`).join(", ");
      alert(`Cannot delete ${world.name}. This world is used in ${storiesUsingWorld.length} story(s): ${storyNames}.\n\nDelete these stories first.`);
      return;
    }
    if (!confirm(`Delete ${world.name}?`)) return;
    saveWorldList(worlds.filter((item) => item.id !== world.id));
    setSelectedWorldSheetId(worlds.find((item) => item.id !== world.id)?.id || "");
    setActiveView("landing");
  }

  return { createBlankWorld, saveWorldSheetEdits, deleteSelectedWorld };
}
