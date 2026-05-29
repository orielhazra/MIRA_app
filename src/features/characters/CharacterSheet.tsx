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

  const castMember = activeStory?.castMembers.find(m => familyVersionIds.has(m.templateCharacterId));
  const isInActiveStory = Boolean(activeStory?.id && castMember);
  const isExactPinnedVersion = castMember?.templateCharacterId === character?.id;
  
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

  const patch = castMember?.overlay?.identityPatch || {};

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>{character.name}</h2>
        <p className="muted">
          Global Template Family: {character.templateKey || character.id} • Version {character.templateVersion || 1}
        </p>
        <p className="sheet-subtitle">
          {isInActiveStory 
            ? (isExactPinnedVersion 
                ? "This is the exact character template version currently used in your active story."
                : "A different version of this character template family is used in your active story.")
            : "This is a reusable global template. Editing it creates a new version for use in future or existing stories."
          }
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
        
        {isInActiveStory && (
          <p className="info-box">
            <span className="overridden-dot"></span>
            This character has story-specific customizations in your active story. Use the <strong>Story & Cast</strong> panel to edit the effective story version.
          </p>
        )}
        
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <TextInput label="Name" value={draft.name} onChange={(value) => update("name", value)} isOverridden={patch.name !== undefined} />
          {storyUsage.length > 0 && (
            <p className="muted">
              Linked to {storyUsage.length} stor{storyUsage.length === 1 ? "y" : "ies"}: {storyUsage.map((story) => story.title).join(", ")}
            </p>
          )}
          <TextInput label="Short Description" value={draft.shortDescription} onChange={(value) => update("shortDescription", value)} isOverridden={patch.shortDescription !== undefined} />
          <TextInput label="Race / Type" value={draft.race || ""} onChange={(value) => update("race", value)} isOverridden={patch.race !== undefined} />
          <TextInput label="Story Role" value={draft.role || ""} onChange={(value) => update("role", value)} isOverridden={patch.role !== undefined} />
          <TextInput label="Aliases" value={(draft.aliases || []).join(", ")} onChange={(value) => update("aliases", parseKeywords(value))} isOverridden={patch.aliases !== undefined} />
          <TextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", parseKeywords(value))} isOverridden={patch.promptKeywords !== undefined} />
          <TextArea label="Smart Prompt Summary" value={draft.profileSummary || ""} onChange={(value) => update("profileSummary", value)} isOverridden={patch.profileSummary !== undefined} />
          <TextArea label="Default Outfit" value={draft.defaultOutfit || ""} onChange={(value) => update("defaultOutfit", value)} isOverridden={patch.defaultOutfit !== undefined} />
          <label className="lore-checkbox">
            {patch.promptPinned !== undefined && <span className="overridden-dot" title="Overridden in active story"></span>}
            <input type="checkbox" checked={draft.promptPinned === true} onChange={(event) => update("promptPinned", event.target.checked)} />
            Always include full details in smart prompt
          </label>
          <TextArea label="Description" value={draft.description} onChange={(value) => update("description", value)} isOverridden={patch.description !== undefined} />
          <TextArea label="Personality" value={draft.personality} onChange={(value) => update("personality", value)} isOverridden={patch.personality !== undefined} />
          <TextArea label="Appearance" value={draft.appearance} onChange={(value) => update("appearance", value)} isOverridden={patch.appearance !== undefined} />
          <TextArea label="Backstory" value={draft.backstory} onChange={(value) => update("backstory", value)} isOverridden={patch.backstory !== undefined} />
          <TextArea label="Speaking Style" value={draft.speakingStyle} onChange={(value) => update("speakingStyle", value)} isOverridden={patch.speakingStyle !== undefined} />
          <TextArea label="Relationship to User" value={draft.relationshipToUser} onChange={(value) => update("relationshipToUser", value)} isOverridden={patch.relationshipToUser !== undefined} />
          <TextArea label="Goals / Motivation" value={draft.goals} onChange={(value) => update("goals", value)} isOverridden={patch.goals !== undefined} />
          <TextArea label="Character Rules" value={draft.characterRules} onChange={(value) => update("characterRules", value)} isOverridden={patch.characterRules !== undefined} />
          <label>Character Lorebook</label>
          <LoreEditor lorebook={draft.lorebook || []} onChange={(lore) => update("lorebook", lore)} />
        </div>
      </div>
    </section>
  );
}
