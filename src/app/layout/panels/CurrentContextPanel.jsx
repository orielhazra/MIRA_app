import React, { useState, useEffect } from "react";

export default function CurrentContextPanel({ context, directorNotes, status, onSave, onClearDirectorNotes, onExtractUpdates, isExtractingUpdates }) {
  const [draft, setDraft] = useState(() => buildCurrentContextDraft(context));
  const [directorDraft, setDirectorDraft] = useState(() => buildDirectorGuidanceDraft(directorNotes));
  const [dirty, setDirty] = useState(false);
  const contextResetKey = `${JSON.stringify(context || {})}::${JSON.stringify(directorNotes || {})}`;

  useEffect(() => {
    setDraft(buildCurrentContextDraft(context));
    setDirectorDraft(buildDirectorGuidanceDraft(directorNotes));
    setDirty(false);
  }, [contextResetKey]);

  function updateDraft(updater) {
    setDirty(true);
    setDraft(updater);
  }

  function setDirectorField(field, value) {
    setDirty(true);
    setDirectorDraft((current) => ({ ...current, [field]: value }));
  }

  function clearDirectorGuidance() {
    setDirty(true);
    setDirectorDraft(buildDirectorGuidanceDraft({}));
  }

  function setSceneField(field, value) {
    updateDraft((current) => ({
      ...current,
      scene: { ...current.scene, [field]: value }
    }));
  }

  function setLocationField(field, value) {
    updateDraft((current) => ({
      ...current,
      location: { ...current.location, [field]: value }
    }));
  }

  function setRecentFactField(field, value) {
    updateDraft((current) => ({
      ...current,
      recentFacts: { ...current.recentFacts, [field]: value }
    }));
  }

  function updateObject(index, field, value) {
    updateDraft((current) => ({
      ...current,
      objects: current.objects.map((row, rowIndex) => (
        rowIndex === index ? { ...row, [field]: value } : row
      ))
    }));
  }

  function addObject() {
    updateDraft((current) => ({
      ...current,
      objects: [
        ...current.objects,
        {
          id: `object_${Date.now()}`,
          name: "New Object",
          locationOrHolder: current.location.name || "Current scene",
          visibleState: "",
          hiddenDetail: "",
          status: "active"
        }
      ]
    }));
  }

  function removeObject(index) {
    updateDraft((current) => ({
      ...current,
      objects: current.objects.filter((_, rowIndex) => rowIndex !== index)
    }));
  }

  function save() {
    onSave(draft, directorDraft);
    setDirty(false);
  }

  return (
    <div className="info-panel active current-context-panel scene-control-panel">
      <h3>Scene Control</h3>
      <p className="muted">Scene facts plus director guidance. Character mood, goals, knowledge, and relationships stay in Cast State.</p>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={save}>Save Scene Control</button>
        <button type="button" onClick={onExtractUpdates} disabled={isExtractingUpdates}>
          {isExtractingUpdates ? "Extracting..." : "Extract Updates"}
        </button>
      </div>
      <p className="sheet-status">{dirty ? "Unsaved scene control changes" : status || "Scene control saved"}</p>

      <h3>Scene Facts</h3>
      <div className="context-grid">
        <ContextInput label="Time of Day" value={draft.scene.timeOfDay} onChange={(value) => setSceneField("timeOfDay", value)} />
        <ContextInput label="Atmosphere" value={draft.scene.atmosphere} onChange={(value) => setSceneField("atmosphere", value)} />
        <ContextTextarea label="Current Conflict" value={draft.scene.currentConflict} onChange={(value) => setSceneField("currentConflict", value)} />
        <ContextTextarea label="Current Objective" value={draft.scene.currentObjective} onChange={(value) => setSceneField("currentObjective", value)} />
      </div>

      <h3>Location</h3>
      <div className="context-grid">
        <ContextInput label="Current Location" value={draft.location.name} onChange={(value) => setLocationField("name", value)} />
        <ContextTextarea label="Location Description" value={draft.location.description} onChange={(value) => setLocationField("description", value)} />
        <ContextTextarea label="Visible Exits" value={draft.location.visibleExits} onChange={(value) => setLocationField("visibleExits", value)} />
        <ContextTextarea label="Available / Nearby Locations" value={draft.location.availableLocations} onChange={(value) => setLocationField("availableLocations", value)} />
        <ContextTextarea label="Hazards" value={draft.location.hazards} onChange={(value) => setLocationField("hazards", value)} />
      </div>

      <h3>Objects</h3>
      <div className="sheet-actions compact-actions">
        <button type="button" onClick={addObject}>Add Object</button>
      </div>
      <div className="context-card-list">
        {draft.objects.map((object, index) => (
          <details key={object.id || index} className="context-card">
            <summary>
              <strong>{object.name || "Unnamed Object"}</strong>
              <span>{object.status || "object"}</span>
            </summary>
            <ContextInput label="Name" value={object.name} onChange={(value) => updateObject(index, "name", value)} />
            <ContextInput label="Location / Holder" value={object.locationOrHolder} onChange={(value) => updateObject(index, "locationOrHolder", value)} />
            <ContextTextarea label="Visible State" value={object.visibleState} onChange={(value) => updateObject(index, "visibleState", value)} />
            <ContextTextarea label="Hidden Detail" value={object.hiddenDetail} onChange={(value) => updateObject(index, "hiddenDetail", value)} />
            <ContextInput label="Status" value={object.status} onChange={(value) => updateObject(index, "status", value)} />
            <button type="button" className="danger file-delete small" onClick={() => removeObject(index)}>Remove Object</button>
          </details>
        ))}
        {draft.objects.length === 0 && <p className="muted">No objects saved yet.</p>}
      </div>

      <h3>Recent Facts</h3>
      <div className="context-grid">
        <ContextTextarea label="Important Discoveries" value={draft.recentFacts.importantDiscoveries} onChange={(value) => setRecentFactField("importantDiscoveries", value)} />
        <ContextTextarea label="Secrets Revealed" value={draft.recentFacts.secretsRevealed} onChange={(value) => setRecentFactField("secretsRevealed", value)} />
        <ContextTextarea label="Open Questions" value={draft.recentFacts.openQuestions} onChange={(value) => setRecentFactField("openQuestions", value)} />
      </div>

      <h3>Director Guidance</h3>
      <p className="muted">Temporary/private steering for upcoming replies. Keep factual state above; use this only for how the next response should behave.</p>
      <div className="context-grid">
        <ContextTextarea label="Character Motivation" value={directorDraft.characterMotivation} onChange={(value) => setDirectorField("characterMotivation", value)} />
        <ContextTextarea label="User's Plan" value={directorDraft.userPlan} onChange={(value) => setDirectorField("userPlan", value)} />
        <ContextTextarea label="Next Story Beat" value={directorDraft.nextStoryBeat} onChange={(value) => setDirectorField("nextStoryBeat", value)} />
        <ContextTextarea label="Avoid / Do Not Reveal Yet" value={directorDraft.avoid} onChange={(value) => setDirectorField("avoid", value)} />
        <ContextTextarea label="Custom Director Note" value={directorDraft.customNotes} onChange={(value) => setDirectorField("customNotes", value)} />
      </div>
      <div className="sheet-actions compact-actions">
        <button type="button" onClick={clearDirectorGuidance}>Clear Director Guidance Draft</button>
        <button type="button" onClick={onClearDirectorNotes}>Clear Saved Director Guidance</button>
      </div>
    </div>
  );
}

function buildDirectorGuidanceDraft(notes) {
  const source = notes && typeof notes === "object" ? notes : {};
  return {
    timeOfDay: "",
    currentLocation: "",
    sceneMood: "",
    currentConflict: "",
    characterMotivation: source.characterMotivation || "",
    userPlan: source.userPlan || "",
    nextStoryBeat: source.nextStoryBeat || "",
    avoid: source.avoid || "",
    customNotes: source.customNotes || ""
  };
}

function buildCurrentContextDraft(context) {
  const source = context && typeof context === "object" ? context : {};
  return {
    scene: {
      timeOfDay: source.scene?.timeOfDay || "",
      atmosphere: source.scene?.atmosphere || "",
      currentConflict: source.scene?.currentConflict || "",
      currentObjective: source.scene?.currentObjective || ""
    },
    location: {
      name: source.location?.name || "",
      description: source.location?.description || "",
      visibleExits: source.location?.visibleExits || "",
      availableLocations: source.location?.availableLocations || "",
      hazards: source.location?.hazards || ""
    },
    objects: Array.isArray(source.objects) ? source.objects.map((object) => ({ ...object })) : [],
    recentFacts: {
      importantDiscoveries: source.recentFacts?.importantDiscoveries || "",
      secretsRevealed: source.recentFacts?.secretsRevealed || "",
      openQuestions: source.recentFacts?.openQuestions || ""
    }
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

function ContextTextarea({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
