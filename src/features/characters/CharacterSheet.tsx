// Character sheet — reusable character template editor.

import { useEffect, useState } from "react";
import LoreEditor from "../../components/LoreEditor";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import { parseKeywords } from "../../utils/helpers";

export default function CharacterSheet({ character, activeStory, onSave, onAddToStory, onRemoveFromStory, onSetActive, onSetInactive, onDelete, onExport, onImport }) {
  const [draft, setDraft] = useState(character);
  const [status, setStatus] = useState("");
  const isInActiveStory = Boolean(activeStory?.id && character?.id && (activeStory.characterIds || []).includes(character.id));
  const contextRow = (activeStory?.castState?.activeCharacters || []).find((row) => row.characterId === character?.id);
  const isActiveInScene = isInActiveStory && contextRow?.present !== false;
  const canAddToStory = activeStory?.id && !isInActiveStory;
  const canRemoveFromStory = activeStory?.id && isInActiveStory && (activeStory.characterIds || []).length > 1;

  useEffect(() => setDraft(character), [character]);
  if (!character) return null;

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function save() {
    onSave(draft);
    setStatus("Character saved.");
    setTimeout(() => setStatus(""), 1500);
  }

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>{character.name}</h2>
        <p className="sheet-subtitle">Reusable character template. Permanent story identity is edited from Story & Cast; live state is edited from Cast State.</p>

        <div className="sheet-actions">
          <button onClick={save}>Save Template</button>
          {canAddToStory && <button onClick={() => onAddToStory(character.id)}>Add To Active Story</button>}
          {isInActiveStory && isActiveInScene && <button onClick={() => onSetInactive(character.id)}>Mark Inactive</button>}
          {isInActiveStory && !isActiveInScene && <button onClick={() => onSetActive(character.id)}>Mark Active</button>}
          {canRemoveFromStory && <button onClick={() => onRemoveFromStory(character.id)}>Remove From Active Story</button>}
          {isInActiveStory && <button disabled>{isActiveInScene ? "Active in scene" : "Inactive / off-scene"}</button>}
          <button onClick={() => onExport(character)}>Export Template</button>
          <button onClick={onImport}>Import Template</button>
          <button className="danger" onClick={() => onDelete(character.id)}>Delete Template</button>
        </div>
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <TextInput label="Name" value={draft.name} onChange={(value) => update("name", value)} />
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
