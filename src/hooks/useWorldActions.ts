// World CRUD hook — creation, editing, deletion.

import { World, StoryMeta } from "../types/index";
import { normalizeWorld } from "../services/normalizers";
import { createId } from "../utils/helpers";

interface WorldActionDeps {
  isGenerating?: boolean;
  worlds?: World[];
  saveWorldList?: (worlds: World[]) => void;
  setSelectedWorldSheetId?: (id: string) => void;
  setActiveView?: (view: string) => void;
  setStoryDraft?: (draft: any) => void;
  worldDraft?: World;
  storyMetas?: StoryMeta[];
  worldId?: string;
  getWorld?: (id: string) => World | undefined;
}

export default function useWorldActions() {
  function createBlankWorld(deps: WorldActionDeps) {
    const { isGenerating, worlds, saveWorldList, setSelectedWorldSheetId, setActiveView, setStoryDraft } = deps;
    if (isGenerating || !worlds || !saveWorldList) return;

    const newWorld = normalizeWorld({
      id: createId("world"),
      name: "New World",
      shortDescription: "Blank world template",
      description: "",
      rules: "",
      worldLorebook: [],
    });

    saveWorldList([...worlds, newWorld]);
    setSelectedWorldSheetId?.(newWorld.id);
    setActiveView?.("world");
    setStoryDraft?.(null);
  }

  function saveWorldSheetEdits({ worldDraft, worlds, saveWorldList }: WorldActionDeps) {
    if (!worldDraft || !worlds || !saveWorldList) return;
    const normalized = normalizeWorld(worldDraft);
    saveWorldList(worlds.map((w) => (w.id === normalized.id ? normalized : w)));
  }

  function deleteSelectedWorld(deps: WorldActionDeps) {
    const { worlds, storyMetas = [], worldId, getWorld, saveWorldList, setSelectedWorldSheetId, setActiveView } = deps;
    if (!worlds || !getWorld || !saveWorldList) return;

    const world = getWorld(worldId!);
    if (!world) return;

    const storiesUsingWorld = storyMetas.filter((s) => s.worldId === world.id);
    if (storiesUsingWorld.length > 0) {
      const storyNames = storiesUsingWorld.map((s) => `"${s.title}"`).join(", ");
      alert(`Cannot delete ${world.name}. This world is used in ${storiesUsingWorld.length} story(s): ${storyNames}.\n\nDelete these stories first.`);
      return;
    }

    if (!confirm(`Delete ${world.name}?`)) return;

    saveWorldList(worlds.filter((item) => item.id !== world.id));
    setSelectedWorldSheetId?.(worlds.find((item) => item.id !== world.id)?.id || "");
    setActiveView?.("landing");
  }

  return { createBlankWorld, saveWorldSheetEdits, deleteSelectedWorld };
}
