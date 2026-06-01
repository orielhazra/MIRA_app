import React, { useState, useEffect } from "react";

export default function DirectorGuidancePanel({ 
  directorNotes, 
  status, 
  onSave, 
  onClear 
}) {
  const [draft, setDraft] = useState(() => buildDraft(directorNotes));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(buildDraft(directorNotes));
    setDirty(false);
  }, [JSON.stringify(directorNotes || {})]);

  function setField(field, value) {
    setDirty(true);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    onSave(draft);
    setDirty(false);
  }

  return (
    <div className="info-panel active">
      <h3>Director Guidance</h3>
      <p className="muted">Private instructions to guide the AI's behavior and the story's direction.</p>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={handleSave}>Save Guidance</button>
        <button type="button" className="danger" onClick={onClear}>Clear All</button>
      </div>
      <p className="sheet-status">{dirty ? "Unsaved changes" : status || "Guidance synced"}</p>

      <div className="context-grid">
        <ContextTextarea 
          label="Next Story Beat / Objective" 
          value={draft.nextStoryBeat} 
          onChange={(v) => setField("nextStoryBeat", v)} 
          placeholder="What should happen next?"
        />
        <ContextTextarea 
          label="Character Goals / Motivation" 
          value={draft.characterMotivation} 
          onChange={(v) => setField("characterMotivation", v)} 
          placeholder="What is driving the cast right now?"
        />
        <ContextTextarea 
          label="Avoid / Do Not Mention" 
          value={draft.avoid} 
          onChange={(v) => setField("avoid", v)} 
          placeholder="Topics or events to keep secret or avoid."
        />
        <ContextTextarea 
          label="Custom Private Note" 
          value={draft.customNotes} 
          onChange={(v) => setField("customNotes", v)} 
          placeholder="Any other specific steering instructions..."
        />
      </div>
    </div>
  );
}

function buildDraft(notes) {
  const source = notes || {};
  return {
    nextStoryBeat: source.nextStoryBeat || "",
    characterMotivation: source.characterMotivation || "",
    avoid: source.avoid || "",
    customNotes: source.customNotes || "",
    userPlan: source.userPlan || "",
    timeOfDay: source.timeOfDay || "",
    currentLocation: source.currentLocation || "",
    sceneMood: source.sceneMood || "",
    currentConflict: source.currentConflict || ""
  };
}

function ContextTextarea({ label, value = "", onChange, placeholder }) {
  return (
    <label>
      {label}
      <textarea 
        value={value} 
        onChange={(event) => onChange(event.target.value)} 
        placeholder={placeholder}
      />
    </label>
  );
}
