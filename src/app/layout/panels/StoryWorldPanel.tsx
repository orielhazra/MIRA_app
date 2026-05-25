import React, { useState, useEffect } from "react";
import LoreEditor from "../../../components/LoreEditor.jsx";
import { parseKeywords } from "../utils/helpers";

export default function StoryWorldPanel({
  activeStory,
  activeWorld,
  storyCharacters,
  onExportStory,
  onDeleteStory,
  onSaveCharacterIdentity,
  onExportCharacterTemplate,
  onImportCharacterTemplate
}) {
  return (
    <div className="info-panel active">
      <h3>Story</h3>
      <InfoField label="Title" value={activeStory.title} />
      <InfoField label="Scenario" value={activeStory.scenario || "—"} />
      <InfoField label="Greeting" value={activeStory.greeting || "—"} />

      <h3>Story Cast Identity</h3>
      <p className="muted">Permanent identity for this story lives here. Cast State controls how each person is doing right now.</p>
      <div className="cast-summary-list">
        {storyCharacters.map((character) => (
          <StoryCastIdentityCard
            key={character.id}
            character={character}
            presenceLabel={getPresenceLabel(activeStory, character.id)}
            onSave={onSaveCharacterIdentity}
            onExportTemplate={onExportCharacterTemplate}
          />
        ))}
      </div>
      <div className="sheet-actions compact-actions">
        <button type="button" onClick={onImportCharacterTemplate}>Import Reusable Character Template</button>
      </div>
      <p className="muted">Imported templates are secondary: after import, add them to a story cast and edit the story version as needed.</p>

      <h3>World</h3>
      <InfoField label="Name" value={activeWorld.name} />
      <InfoField label="Smart Prompt Overview" value={activeWorld.overview || activeWorld.shortDescription || "—"} />
      <InfoField label="Description" value={activeWorld.description || "—"} />

      <h3>Available Locations</h3>
      {(activeWorld.locations || []).length ? (
        <div className="context-card-list">
          {(activeWorld.locations || []).map((location) => (
            <details key={location.id || location.name} className="context-card">
              <summary>
                <strong>{location.name}</strong>
                <span>{location.summary || "location"}</span>
              </summary>
              <InfoField label="Summary" value={location.summary || "—"} />
              <InfoField label="Description" value={location.description || "—"} />
              <InfoField label="Mood" value={location.mood || "—"} />
              <InfoField label="Exits" value={location.visibleExits || "—"} />
              <InfoField label="Hazards" value={location.hazards || "—"} />
            </details>
          ))}
        </div>
      ) : <p className="muted">No world locations saved yet.</p>}

      <div className="info-actions">
        <button onClick={onExportStory}>Export Story</button>
        <button className="danger" onClick={onDeleteStory}>Delete Story</button>
      </div>
    </div>
  );
}

function StoryCastIdentityCard({ character, presenceLabel, onSave, onExportTemplate }) {
  const [draft, setDraft] = useState(character);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDraft(character);
    setStatus("");
  }, [character]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function save() {
    onSave?.(draft);
    setStatus("Identity saved.");
    setTimeout(() => setStatus(""), 1400);
  }

  return (
    <details className="character-profile-card identity-card">
      <summary>
        <strong>{character.name}</strong>
        <span>{presenceLabel}</span>
      </summary>

      <div className="context-grid identity-grid">
        <ContextInput label="Name" value={draft.name || ""} onChange={(value) => update("name", value)} />
        <ContextInput label="Short Description" value={draft.shortDescription || ""} onChange={(value) => update("shortDescription", value)} />
        <ContextInput label="Race / Type" value={draft.race || ""} onChange={(value) => update("race", value)} />
        <ContextInput label="Story Role" value={draft.role || ""} onChange={(value) => update("role", value)} />
        <ContextInput label="Aliases" value={(draft.aliases || []).join(", ")} onChange={(value) => update("aliases", parseKeywords(value))} />
        <ContextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", parseKeywords(value))} />
        <ContextTextarea label="Smart Prompt Summary" value={draft.profileSummary || ""} onChange={(value) => update("profileSummary", value)} />
        <ContextTextarea label="Default Outfit" value={draft.defaultOutfit || ""} onChange={(value) => update("defaultOutfit", value)} />
        <ContextTextarea label="Description" value={draft.description || ""} onChange={(value) => update("description", value)} />
        <ContextTextarea label="Personality" value={draft.personality || ""} onChange={(value) => update("personality", value)} />
        <ContextTextarea label="Appearance" value={draft.appearance || ""} onChange={(value) => update("appearance", value)} />
        <ContextTextarea label="Backstory" value={draft.backstory || ""} onChange={(value) => update("backstory", value)} />
        <ContextTextarea label="Speaking Style" value={draft.speakingStyle || ""} onChange={(value) => update("speakingStyle", value)} />
        <ContextTextarea label="Base Relationship to User" value={draft.relationshipToUser || ""} onChange={(value) => update("relationshipToUser", value)} />
        <ContextTextarea label="Permanent Goals / Motivation" value={draft.goals || ""} onChange={(value) => update("goals", value)} />
        <ContextTextarea label="Character Rules" value={draft.characterRules || ""} onChange={(value) => update("characterRules", value)} />
        <label className="lore-checkbox context-present-toggle">
          <input type="checkbox" checked={draft.promptPinned === true} onChange={(event) => update("promptPinned", event.target.checked)} />
          Always include full details in smart prompt
        </label>
      </div>

      <label>Story Character Lorebook</label>
      <LoreEditor lorebook={draft.lorebook || []} onChange={(lore) => update("lorebook", lore)} />

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={save}>Save Identity</button>
        <button type="button" onClick={() => onExportTemplate?.(draft)}>Export As Reusable Template</button>
      </div>
      <p className="sheet-status">{status}</p>
    </details>
  );
}

function getPresenceLabel(story, characterId) {
  const row = (story?.castState?.activeCharacters || story?.currentContext?.activeCharacters || []).find((item) => item.characterId === characterId);
  return formatPresenceLabel(getRowPresence(row));
}

function getRowPresence(row) {
  const raw = String(row?.presence || "").trim().toLowerCase();
  if (["active", "nearby", "inactive"].includes(raw)) return raw;
  return row?.present === false ? "inactive" : "active";
}

function formatPresenceLabel(presence) {
  if (presence === "nearby") return "Nearby / background";
  if (presence === "inactive") return "Inactive / off-scene";
  return "Active";
}

function ContextInput({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ContextTextarea({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="info-field">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
