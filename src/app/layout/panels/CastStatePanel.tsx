import React, { useState, useEffect } from "react";

export default function CastStatePanel({ castState, characters, status, onSave }) {
  const characterById = new Map<string, any>((characters || []).map((character) => [character.id, character]));
  const [draft, setDraft] = useState(() => buildCastStateDraft(castState, characters));
  const [dirty, setDirty] = useState(false);
  const contextResetKey = `${(characters || []).map((character) => character.id).join("|")}::${JSON.stringify(castState || {})}`;

  useEffect(() => {
    setDraft(buildCastStateDraft(castState, characters));
    setDirty(false);
  }, [contextResetKey]);

  function updateDraft(updater) {
    setDirty(true);
    setDraft(updater);
  }

  function updateCharacterState(index, field, value) {
    updateDraft((current) => ({
      ...current,
      activeCharacters: current.activeCharacters.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextRow = { ...row, [field]: String(value) };
        if (field === "presence") nextRow.present = value !== "inactive";
        return nextRow;
      })
    }));
  }

  function updateRelationship(index, field, value) {
    updateDraft((current) => ({
      ...current,
      relationships: current.relationships.map((row, rowIndex) => (
        rowIndex === index ? { ...row, [field]: String(value) } : row
      ))
    }));
  }

  return (
    <div className="info-panel active current-context-panel cast-state-panel">
      <h3>Cast State</h3>
      <p className="muted">Live scene-specific state. Use this for presence, mood, goals, knowledge, secrets, and relationships right now.</p>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={() => { onSave(draft); setDirty(false); }}>Save Cast State</button>
      </div>
      <p className="sheet-status">{dirty ? "Unsaved cast state changes" : status || "Cast state saved"}</p>

      <div className="context-card-list">
        {draft.activeCharacters.map((row, index) => {
          const character = characterById.get(row.characterId);
          const relationship: any = draft.relationships.find((item) => item.characterId === row.characterId) || {};
          const relationshipIndex = draft.relationships.findIndex((item) => item.characterId === row.characterId);
          const presence = getRowPresence(row);
          return (
            <details key={`${row.characterId}-${index}`} className="context-card">
              <summary>
                <strong>{character?.name || row.characterId || "Character"}</strong>
                <span>{formatPresenceLabel(presence)}</span>
              </summary>

              <ContextSelect
                label="Presence"
                value={presence}
                onChange={(value) => updateCharacterState(index, "presence", value)}
                options={[
                  ["active", "Active - can speak, act, and drive the scene"],
                  ["nearby", "Nearby - present/background, compact prompt"],
                  ["inactive", "Inactive - off-scene unless referenced"]
                ]}
              />
              <ContextTextarea label="Current Outfit" value={row.outfit} onChange={(value) => updateCharacterState(index, "outfit", value)} />
              <ContextInput label="Mood / Attitude" value={row.mood} onChange={(value) => updateCharacterState(index, "mood", value)} />
              <ContextInput label="Physical Condition" value={row.condition} onChange={(value) => updateCharacterState(index, "condition", value)} />
              <ContextTextarea label="Current Goal" value={row.currentGoal} onChange={(value) => updateCharacterState(index, "currentGoal", value)} />
              <ContextTextarea label="Knows / Remembers" value={row.knowledge} onChange={(value) => updateCharacterState(index, "knowledge", value)} />
              <ContextTextarea label="Temporary Secret" value={row.temporarySecret} onChange={(value) => updateCharacterState(index, "temporarySecret", value)} />
              <ContextTextarea label="Scene Instruction" value={row.sceneInstruction} onChange={(value) => updateCharacterState(index, "sceneInstruction", value)} />

              {relationshipIndex >= 0 && (
                <>
                  <ContextTextarea label="Relationship to User Right Now" value={relationship.relationshipToUser || ""} onChange={(value) => updateRelationship(relationshipIndex, "relationshipToUser", value)} />
                  <ContextTextarea label="Trust / Tension Notes" value={relationship.trustTensionNotes || ""} onChange={(value) => updateRelationship(relationshipIndex, "trustTensionNotes", value)} />
                  <ContextTextarea label="Promises / Conflicts" value={relationship.promisesConflicts || ""} onChange={(value) => updateRelationship(relationshipIndex, "promisesConflicts", value)} />
                </>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
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

function buildCastStateDraft(castState, characters = []) {
  const source = castState && typeof castState === "object" ? castState : {};
  const activeCharacters = (characters || []).map((character) => {
    const existing = (source.activeCharacters || []).find((row) => row.characterId === character.id) || {};
    const presence = getRowPresence(existing);
    return {
      characterId: character.id,
      presence,
      present: presence !== "inactive",
      outfit: existing.outfit || character.defaultOutfit || "",
      mood: existing.mood || "",
      condition: existing.condition || "",
      currentGoal: existing.currentGoal || character.goals || "",
      knowledge: existing.knowledge || "",
      temporarySecret: existing.temporarySecret || "",
      sceneInstruction: existing.sceneInstruction || ""
    };
  });

  const relationships = (characters || []).map((character) => {
    const existing = (source.relationships || []).find((row) => row.characterId === character.id) || {};
    return {
      characterId: character.id,
      relationshipToUser: existing.relationshipToUser || character.relationshipToUser || "",
      trustTensionNotes: existing.trustTensionNotes || "",
      promisesConflicts: existing.promisesConflicts || ""
    };
  });

  return {
    activeCharacters,
    relationships
  };
}

function ContextInput({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ContextSelect({ label, value = "", options = [], onChange }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
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
