import { useEffect, useState } from "react";
import LoreEditor from "./LoreEditor.jsx";

export function Landing({ onNewStory, onImportStory }) {
  return (
    <section id="messages" className="messages landing-view">
      <div className="mira-landing">
        <h1 className="mira-title">M.I.R.A.</h1>
        <p className="mira-subtitle">Multi-Intelligence Roleplay Assistant</p>
        <div className="mira-actions">
          <button onClick={onNewStory}>Create New Story</button>
          <button onClick={onImportStory}>Import Story</button>
        </div>
      </div>
    </section>
  );
}

export function StoryCreationSheet({ worlds, characters, initialDraft, onStart, onCancel, onImportStory }) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState("");

  useEffect(() => setDraft(initialDraft), [initialDraft]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleStoryCharacter(characterId) {
    setDraft((current) => {
      const currentIds = Array.isArray(current.characterIds) ? current.characterIds : [];
      const nextIds = currentIds.includes(characterId)
        ? currentIds.filter((id) => id !== characterId)
        : [...currentIds, characterId];
      return { ...current, characterIds: uniqueCompact(nextIds) };
    });
  }

  function start() {
    const result = onStart(draft);
    if (result?.error) setStatus(result.error);
  }

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>Create New Story</h2>
        <p className="sheet-subtitle">This will create a new chat using the selected world and story cast.</p>

        <div className="sheet-actions">
          <button onClick={start}>Start Story</button>
          <button onClick={onImportStory}>Import Story</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <label>
            Story Title
            <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            World
            <select value={draft.worldId || ""} onChange={(event) => update("worldId", event.target.value)}>
              {worlds.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
            </select>
          </label>

          <div className="cast-picker">
            <span className="cast-picker-label">Story Cast</span>
            <p className="muted">The AI may speak and act for selected cast members. Presence and live state are controlled in Cast State after the story starts.</p>
            <div className="cast-picker-list">
              {characters.map((character) => {
                const selected = (draft.characterIds || []).includes(character.id);
                return (
                  <label key={character.id} className="cast-checkbox">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleStoryCharacter(character.id)}
                    />
                    <span>
                      <strong>{character.name}</strong>
                      <small>{character.shortDescription || "Story cast member"}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <label>
            Scenario
            <textarea value={draft.scenario || ""} onChange={(event) => update("scenario", event.target.value)} />
          </label>

          <label>
            Opening Greeting
            <textarea value={draft.greeting || ""} onChange={(event) => update("greeting", event.target.value)} />
          </label>

          <label>Story Lorebook</label>
          <LoreEditor lorebook={draft.storyLorebook || []} onChange={(lore) => update("storyLorebook", lore)} />
        </div>
      </div>
    </section>
  );
}

export function CharacterSheet({ character, activeStory, onSave, onAddToStory, onRemoveFromStory, onSetActive, onSetInactive, onDelete, onExport, onImport }) {
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
          <TextInput label="Aliases" value={(draft.aliases || []).join(", ")} onChange={(value) => update("aliases", value)} />
          <TextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", value)} />
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

export function WorldSheet({ world, activeStory, onSave, onUse, onDelete, onExport, onImport }) {
  const [draft, setDraft] = useState(world);
  const [status, setStatus] = useState("");
  const canAssign = activeStory?.id && world?.id !== activeStory.worldId;

  useEffect(() => setDraft(world), [world]);
  if (!world) return null;

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateLocation(index, field, value) {
    setDraft((current) => ({
      ...current,
      locations: (current.locations || []).map((location, locationIndex) => (
        locationIndex === index ? { ...location, [field]: value } : location
      ))
    }));
  }

  function addLocation() {
    setDraft((current) => ({
      ...current,
      locations: [
        ...(current.locations || []),
        {
          id: `location_${Date.now()}`,
          name: "New Location",
          summary: "",
          description: "",
          mood: "",
          visibleExits: "",
          hazards: "",
          connectedTo: "",
          keywords: []
        }
      ]
    }));
  }

  function removeLocation(index) {
    setDraft((current) => ({
      ...current,
      locations: (current.locations || []).filter((_, locationIndex) => locationIndex !== index)
    }));
  }

  function save() {
    onSave(draft);
    setStatus("World saved.");
    setTimeout(() => setStatus(""), 1500);
  }

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>{world.name}</h2>
        <p className="sheet-subtitle">{world.shortDescription}</p>

        <div className="sheet-actions">
          <button onClick={save}>Save World</button>
          {canAssign && <button onClick={() => onUse(world.id)}>Use In Active Story</button>}
          <button onClick={() => onExport(world)}>Export World</button>
          <button onClick={onImport}>Import World</button>
          <button className="danger" onClick={() => onDelete(world.id)}>Delete World</button>
        </div>
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <TextInput label="World Name" value={draft.name} onChange={(value) => update("name", value)} />
          <TextInput label="Short Description" value={draft.shortDescription} onChange={(value) => update("shortDescription", value)} />
          <TextArea label="Smart Prompt Overview" value={draft.overview || ""} onChange={(value) => update("overview", value)} />
          <TextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", value)} />
          <TextArea label="World Description" value={draft.description} onChange={(value) => update("description", value)} />
          <TextArea label="World Rules" value={draft.rules} onChange={(value) => update("rules", value)} />

          <div className="sheet-section">
            <h3>Available Locations</h3>
            <p className="muted">Smart Prompting uses the current location in detail and sends this list as compact available/nearby options.</p>
            <div className="sheet-actions compact-actions">
              <button type="button" onClick={addLocation}>Add Location</button>
            </div>
            <div className="context-card-list">
              {(draft.locations || []).map((location, index) => (
                <details key={location.id || index} className="context-card">
                  <summary>
                    <strong>{location.name || "Unnamed Location"}</strong>
                    <span>{location.summary || "location"}</span>
                  </summary>
                  <TextInput label="Location Name" value={location.name || ""} onChange={(value) => updateLocation(index, "name", value)} />
                  <TextInput label="Summary" value={location.summary || ""} onChange={(value) => updateLocation(index, "summary", value)} />
                  <TextArea label="Description" value={location.description || ""} onChange={(value) => updateLocation(index, "description", value)} />
                  <TextInput label="Mood / Atmosphere" value={location.mood || ""} onChange={(value) => updateLocation(index, "mood", value)} />
                  <TextInput label="Visible Exits" value={location.visibleExits || ""} onChange={(value) => updateLocation(index, "visibleExits", value)} />
                  <TextInput label="Connected To" value={location.connectedTo || ""} onChange={(value) => updateLocation(index, "connectedTo", value)} />
                  <TextInput label="Keywords" value={(location.keywords || []).join(", ")} onChange={(value) => updateLocation(index, "keywords", value)} />
                  <TextArea label="Hazards" value={location.hazards || ""} onChange={(value) => updateLocation(index, "hazards", value)} />
                  <button type="button" className="danger small" onClick={() => removeLocation(index)}>Remove Location</button>
                </details>
              ))}
              {!(draft.locations || []).length && <p className="muted">No locations saved yet.</p>}
            </div>
          </div>

          <label>World Lorebook</label>
          <LoreEditor lorebook={draft.worldLorebook || []} onChange={(lore) => update("worldLorebook", lore)} />
        </div>
      </div>
    </section>
  );
}

function TextInput({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function uniqueCompact(values) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}
