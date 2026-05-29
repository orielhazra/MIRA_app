// Character sheet — reusable character template editor.

import { useEffect, useMemo, useState } from "react";
import LoreEditor from "../../components/LoreEditor";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import { parseKeywords } from "../../utils/helpers";

export default function CharacterSheet({
  character,
  characters = [],
  storyMetas = [],
  activeStory,
  onSave,
  onAddToStory,
  onRemoveFromStory,
  onSetActive,
  onSetInactive,
  onDelete,
  onExport,
  onImport,
  onBackHome,
  onBackToStory
}) {
  const [draft, setDraft] = useState(character);
  const [status, setStatus] = useState("");
  
  const templateKey = String(character?.templateKey || character?.id || "");
  const familyVersionIds = useMemo(
    () => new Set((characters || []).filter((item) => String(item.templateKey || item.id) === templateKey).map((item) => item.id)),
    [characters, templateKey]
  );

  const isInActiveStory = Boolean(activeStory?.id && character?.id && (activeStory.castMembers || []).some(m => familyVersionIds.has(m.templateCharacterId)));
  const castMember = activeStory?.castMembers.find(m => familyVersionIds.has(m.templateCharacterId));
  const contextRow = (activeStory?.castState?.activeCharacters || []).find((row) => row.castMemberId === castMember?.id);
  
  const isActiveInScene = isInActiveStory && contextRow?.present !== false;
  const canAddToStory = activeStory?.id && !isInActiveStory;
  const canRemoveFromStory = activeStory?.id && isInActiveStory && (activeStory.castMembers || []).length > 1;
  
  const storyUsage = useMemo(
    () => storyMetas.filter((meta) => (meta as any).castMembers?.some((m: any) => familyVersionIds.has(m.templateCharacterId)) || (meta as any).characterIds?.some((id: any) => familyVersionIds.has(id))),
    [storyMetas, familyVersionIds]
  );
  const canDelete = storyUsage.length === 0;

  const backLabel = isInActiveStory ? "Back To Story" : "Back To Home";

  useEffect(() => setDraft(character), [character]);
  if (!character || !draft) return null;

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function goBack() {
    if (isInActiveStory) {
      onBackToStory?.();
      return;
    }
    onBackHome?.();
  }

  function save() {
    onSave(draft);
    setStatus("Character template saved as new version.");
    setTimeout(() => setStatus(""), 1500);
  }

  function deleteCharacter() {
    if (!canDelete) {
      setStatus(`Cannot delete: linked to ${storyUsage.length} stor${storyUsage.length === 1 ? "y" : "ies"}.`);
      return;
    }
    onDelete(character.id);
  }

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>{character.name}</h2>
        <p className="muted">Template family: {character.templateKey || character.id} • Version {character.templateVersion || 1}</p>
        <p className="sheet-subtitle">
          Reusable character template. Characters are linked to stories through story cast metadata, not directly to worlds.
        </p>

        <div className="sheet-actions">
          <button onClick={save}>Save As New Template Version</button>
          <button onClick={goBack}>{backLabel}</button>
          {canAddToStory && <button onClick={() => onAddToStory(character.id)}>Add To Active Story</button>}
          {isInActiveStory && isActiveInScene && <button onClick={() => onSetInactive(castMember?.id || character.id)}>Mark Inactive</button>}
          {isInActiveStory && !isActiveInScene && <button onClick={() => onSetActive(castMember?.id || character.id)}>Mark Active</button>}
          {canRemoveFromStory && <button onClick={() => onRemoveFromStory(castMember?.id || character.id)}>Remove From Active Story</button>}
          {isInActiveStory && <button disabled>{isActiveInScene ? "Active in scene" : "Inactive / off-scene"}</button>}
          <button onClick={() => onExport(character)}>Export Template</button>
          <button onClick={onImport}>Import Template</button>
          <button className="danger" disabled={!canDelete} onClick={deleteCharacter}>Delete Template</button>
        </div>
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <TextInput label="Name" value={draft.name} onChange={(value) => update("name", value)} />
          {storyUsage.length > 0 && (
            <p className="muted">
              Linked to {storyUsage.length} stor{storyUsage.length === 1 ? "y" : "ies"}: {storyUsage.map((story) => story.title).join(", ")}
            </p>
          )}
          <TextInput label="Short Description" value={draft.shortDescription} onChange={(value) => update("shortDescription", value)} />
          <TextInput label="Race / Type" value={draft.race || ""} onChange={(value) => update("race", value)} />
          <TextInput label="Story Role" value={draft.role || ""} onChange={(value) => update("role", value)} />
          <TextInput label="Aliases" value={(draft.aliases || []).join(", ")} onChange={(value) => update("aliases", parseKeywords(value))} />
          <TextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", parseKeywords(value))} />
          <TextArea label="Smart Prompt Summary" value={draft.profileSummary || ""} onChange={(value) => update("profileSummary", value)} />
          <TextArea label="Default Outfit" value={draft.defaultOutfit || ""} onChange={(value) => update("defaultOutfit", value)} />
          <label className="lore-checkbox">
            <input type="checkbox" checked={draft.promptPinned === true} onChange={(event) => update("promptPinned", event.target.checked)} />
            Always include full details in smart prompt
          </label>
          <TextArea label="Description" value={draft.description} onChange={(value) => update("description", value)} />
          <TextArea label="Personality" value={draft.personality} onChange={(value) => update("personality", value)} />
          <TextArea label="Appearance" value={draft.appearance} onChange={(value) => update("appearance", value)} />
          <TextArea label="Backstory" value={draft.backstory} onChange={(value) => update("backstory", value)} />
          <TextArea label="Speaking Style" value={draft.speakingStyle} onChange={(value) => update("speakingStyle", value)} />
          <TextArea label="Relationship to User" value={draft.relationshipToUser} onChange={(value) => update("relationshipToUser", value)} />
          <TextArea label="Goals / Motivation" value={draft.goals} onChange={(value) => update("goals", value)} />
          <TextArea label="Character Rules" value={draft.characterRules} onChange={(value) => update("characterRules", value)} />
          <label>Character Lorebook</label>
          <LoreEditor lorebook={draft.lorebook || []} onChange={(lore) => update("lorebook", lore)} />
        </div>
      </div>
    </section>
  );
}
