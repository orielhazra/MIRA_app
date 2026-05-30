import React, { useState, useEffect, useMemo } from "react";

export default function CurrentContextPanel({ 
  context, 
  activeWorld, 
  directorNotes, 
  status, 
  onSave, 
  onClearDirectorNotes, 
  onExtractUpdates, 
  isExtractingUpdates 
}) {
  const [draft, setDraft] = useState(() => buildCurrentContextDraft(context));
  const [directorDraft, setDirectorDraft] = useState(() => buildDirectorGuidanceDraft(directorNotes));
  const [dirty, setDirty] = useState(false);
  
  const contextResetKey = `${JSON.stringify(context || {})}::${JSON.stringify(directorNotes || {})}`;
  const worldLocations = useMemo(() => Array.isArray(activeWorld?.locations) ? activeWorld.locations : [], [activeWorld?.locations]);

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

  function setSceneField(field, value) {
    updateDraft((current) => ({
      ...current,
      scene: { ...current.scene, [field]: value }
    }));
  }

  function selectLocation(locationId) {
    updateDraft((current) => {
      const selectedLocation = worldLocations.find((location) => location.id === locationId);
      if (!selectedLocation) return { ...current, location: { ...current.location, locationId: "" } };

      return {
        ...current,
        location: {
          ...current.location,
          locationId: selectedLocation.id,
          name: selectedLocation.name,
          description: selectedLocation.description || "",
          visibleExits: selectedLocation.visibleExits || "",
          hazards: selectedLocation.hazards || ""
        }
      };
    });
  }

  function save() {
    onSave(draft, directorDraft);
    setDirty(false);
  }

  return (
    <div className="info-panel active current-context-panel scene-control-panel">
      <h3>Scene State</h3>
      <p className="muted">Fundamental facts about the current moment.</p>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={save}>Save Changes</button>
        <button type="button" onClick={onExtractUpdates} disabled={isExtractingUpdates}>
          {isExtractingUpdates ? "Extracting..." : "Auto-Update from Chat"}
        </button>
      </div>
      <p className="sheet-status">{dirty ? "Unsaved changes" : status || "All synced"}</p>

      <div className="context-grid">
        <ContextInput label="Time of Day" value={draft.scene.timeOfDay} onChange={(v) => setSceneField("timeOfDay", v)} />
        <ContextInput label="Atmosphere" value={draft.scene.atmosphere} onChange={(v) => setSceneField("atmosphere", v)} />
        
        <label>
          World Location
          <select value={draft.location.locationId || ""} onChange={(e) => selectLocation(e.target.value)}>
            <option value="">Custom / Manual</option>
            {worldLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </label>
        
        <ContextTextarea label="Current Conflict" value={draft.scene.currentConflict} onChange={(v) => setSceneField("currentConflict", v)} />
      </div>

      <details className="dossier-section-details">
        <summary>Advanced Scene Facts (Objects & Secrets)</summary>
        <div className="context-grid" style={{ marginTop: '10px' }}>
           <ContextTextarea label="Discoveries & Facts" value={draft.recentFacts.importantDiscoveries} onChange={(v) => updateDraft(c => ({...c, recentFacts: {...c.recentFacts, importantDiscoveries: v}}))} />
        </div>
        <ObjectsEditor draft={draft} updateDraft={updateDraft} />
      </details>

      <h3 style={{ marginTop: '20px' }}>Director Guidance</h3>
      <p className="muted">Private steering for the AI's next response.</p>
      <div className="context-grid">
        <ContextTextarea label="Next Story Beat / Objective" value={directorDraft.nextStoryBeat} onChange={(v) => setDirectorField("nextStoryBeat", v)} />
        <ContextTextarea label="Character Goals / Motivation" value={directorDraft.characterMotivation} onChange={(v) => setDirectorField("characterMotivation", v)} />
        <ContextTextarea label="Avoid / Do Not Mention" value={directorDraft.avoid} onChange={(v) => setDirectorField("avoid", v)} />
        <ContextTextarea label="Custom Note" value={directorDraft.customNotes} onChange={(v) => setDirectorField("customNotes", v)} />
      </div>
      
      <div className="sheet-actions compact-actions">
        <button type="button" className="danger" onClick={onClearDirectorNotes}>Clear Guidance</button>
      </div>
    </div>
  );
}

function ObjectsEditor({ draft, updateDraft }) {
  const addObject = () => updateDraft(c => ({
    ...c,
    objects: [...c.objects, { id: `obj_${Date.now()}`, name: "New Object", locationOrHolder: "", status: "active" }]
  }));

  const removeObject = (idx) => updateDraft(c => ({
    ...c, 
    objects: c.objects.filter((_, i) => i !== idx)
  }));

  const updateObject = (idx, field, val) => updateDraft(c => {
    return {
      ...c,
      objects: c.objects.map((o, i) => i === idx ? { ...o, [field]: val } : o)
    };
  });

  return (
    <div className="objects-editor">
      <div className="section-header-actions">
        <strong>Relevant Objects</strong>
        <button type="button" className="small" onClick={addObject}>+ Add</button>
      </div>
      <div className="context-card-list">
        {draft.objects.map((obj, i) => (
          <div key={obj.id} className="context-card compact">
             <div className="card-row">
                <input placeholder="Object name" value={obj.name} style={{ flex: 1, padding: '4px 8px', borderRadius: '6px' }} onChange={(e) => updateObject(i, "name", e.target.value)} />
                <button type="button" className="danger small" onClick={() => removeObject(i)}>×</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildDirectorGuidanceDraft(notes) {
  const source = notes || {};
  return {
    nextStoryBeat: source.nextStoryBeat || "",
    characterMotivation: source.characterMotivation || "",
    avoid: source.avoid || "",
    customNotes: source.customNotes || "",
    userPlan: source.userPlan || ""
  };
}

function buildCurrentContextDraft(context) {
  const source = context || {};
  return {
    scene: {
      timeOfDay: source.scene?.timeOfDay || "",
      atmosphere: source.scene?.atmosphere || "",
      currentConflict: source.scene?.currentConflict || "",
      currentObjective: source.scene?.currentObjective || ""
    },
    location: {
      locationId: source.location?.locationId || "",
      name: source.location?.name || "",
      description: source.location?.description || "",
      visibleExits: source.location?.visibleExits || "",
      hazards: source.location?.hazards || ""
    },
    objects: Array.isArray(source.objects) ? source.objects.map(o => ({ ...o })) : [],
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
