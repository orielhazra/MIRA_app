// World CRUD hook — creation, editing, deletion.

import { World, StoryMeta } from "../types/index";
import { normalizeWorld } from "../services/normalizers";
import { createId } from "../utils/helpers";
import { useToast } from "../context/ToastContext";

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
  const { showToast } = useToast();
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
      createdAt: Date.now(),
    });

    saveWorldList([...worlds, newWorld]);
    setSelectedWorldSheetId?.(newWorld.id);
    setActiveView?.("world");
    setStoryDraft?.(null);
  }

  function saveWorldSheetEdits({ worldDraft, worlds, saveWorldList, setSelectedWorldSheetId, setActiveView }: WorldActionDeps) {
    if (!worldDraft || !worlds || !saveWorldList) return;
    const draft = normalizeWorld(worldDraft);
    const templateKey = draft.templateKey || draft.id;
    const existingVersions = worlds.filter((world) => String(world.templateKey || world.id) === templateKey);
    const currentStoredVersion = worlds.find((world) => world.id === draft.id) || null;

    if (currentStoredVersion && existingVersions.length === 1 && isBlankStarterWorld(currentStoredVersion)) {
      const firstSavedWorld = normalizeWorld({
        ...draft,
        id: currentStoredVersion.id,
        templateKey: currentStoredVersion.templateKey || currentStoredVersion.id,
        templateVersion: Number(currentStoredVersion.templateVersion || 1),
        createdAt: currentStoredVersion.createdAt || Date.now(),
      });
      saveWorldList(worlds.map((world) => (world.id === currentStoredVersion.id ? firstSavedWorld : world)));
      setSelectedWorldSheetId?.(firstSavedWorld.id);
      setActiveView?.("world");
      return firstSavedWorld;
    }

    const nextVersion = Math.max(0, ...existingVersions.map((world) => Number(world.templateVersion || 1))) + 1;
    const versionedWorld = normalizeWorld({
      ...draft,
      id: createId("world"),
      templateKey,
      templateVersion: nextVersion,
      createdAt: Date.now(),
    });
    saveWorldList([...worlds, versionedWorld]);
    setSelectedWorldSheetId?.(versionedWorld.id);
    setActiveView?.("world");
    return versionedWorld;
  }

  function deleteSelectedWorld(deps: WorldActionDeps) {
    const { worlds, storyMetas = [], worldId, getWorld, saveWorldList, setSelectedWorldSheetId, setActiveView } = deps;
    if (!worlds || !getWorld || !saveWorldList) return;

    const world = getWorld(worldId!);
    if (!world) return;

    const templateKey = String(world.templateKey || world.id);
    const familyVersions = worlds.filter((item) => String(item.templateKey || item.id) === templateKey);
    const familyVersionIds = new Set(familyVersions.map((item) => item.id));
    const storiesUsingTemplateFamily = storyMetas.filter((storyMeta) => familyVersionIds.has(storyMeta.templateWorldId));

    if (storiesUsingTemplateFamily.length > 0) {
      const storyNames = storiesUsingTemplateFamily.map((storyMeta) => `"${storyMeta.title}"`).join(", ");
      showToast(`Cannot delete template ${world.name}. This template family is used in ${storiesUsingTemplateFamily.length} story(s): ${storyNames}.\n\nDelete or reassign these stories first.`);
      return;
    }


    const nextWorlds = worlds.filter((item) => !familyVersionIds.has(item.id));
    saveWorldList(nextWorlds);
    setSelectedWorldSheetId?.(nextWorlds[0]?.id || "");
    setActiveView?.("landing");
  }

  return { createBlankWorld, saveWorldSheetEdits, deleteSelectedWorld };
}


function isBlankStarterWorld(world: World): boolean {
  return (
    Number(world.templateVersion || 1) === 1
    && world.name === "New World"
    && world.shortDescription === "Blank world template"
    && !String(world.description || "").trim()
    && !String(world.rules || "").trim()
    && !(world.locations || []).length
    && !(world.worldLorebook || []).length
  );
}
