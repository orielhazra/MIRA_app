import React, { useState, useEffect } from "react";
import TextInput from "../../../components/ui/TextInput";

export default function CastQuickStatePanel({ 
  activeStory,
  activeStoryCharacters, 
  activeWorld,
  status, 
  onSave,
  onUpdateUserProfile // New prop
}) {
  const castState = activeStory?.castState || { activeCharacters: [] };
  const userProfile = activeStory?.userProfile;

  const [draft, setDraft] = useState(() => buildDraft(castState, activeStoryCharacters));
  const [userDraft, setUserDraft] = useState(userProfile);
  const [dirty, setDirty] = useState(false);

  const worldLocations = activeWorld?.locations || [];

  useEffect(() => {
    setDraft(buildDraft(castState, activeStoryCharacters));
    setUserDraft(userProfile);
    setDirty(false);
  }, [JSON.stringify(castState || {}), JSON.stringify(userProfile || {}), activeStoryCharacters.length]);

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

  function handleSave() {
    onSave(draft);
    if (userDraft) onUpdateUserProfile(userDraft);
    setDirty(false);
  }

  return (
    <div className="info-panel active">
      <h3>Cast Quick Access</h3>
      <p className="muted">Quickly manage presence, location, and mood.</p>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={handleSave}>Save Changes</button>
      </div>
      <p className="sheet-status">{dirty ? "Unsaved changes" : status || "All synced"}</p>

      <div className="context-card-list">
        {/* User Card */}
        {userDraft && (
          <details className="context-card compact user-card">
            <summary>
              <strong>You ({userDraft.name || "User"})</strong>
              <span className="badge active">Active</span>
            </summary>
            <div className="context-grid mini-grid" style={{ marginTop: '10px' }}>
               <label>
                  Location
                  <select value={userDraft.locationId || "with_user"} onChange={(e) => { setDirty(true); setUserDraft({...userDraft, locationId: e.target.value}); }}>
                    <option value="with_user">Scene Focus</option>
                    <option value="unknown">Unknown</option>
                    {worldLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </label>
                <TextInput label="Mood" value={userDraft.mood} onChange={(v) => { setDirty(true); setUserDraft({...userDraft, mood: v}); }} />
            </div>
          </details>
        )}

        {/* NPC Cards */}
        {draft.activeCharacters.map((row, index) => {
          const character = activeStoryCharacters.find(c => c.id === row.castMemberId);
          const isInactive = row.presence === "inactive";
          
          return (
            <details key={row.castMemberId} className="context-card compact">
              <summary>
                 <strong>{character?.name || "Unknown"}</strong>
                 <span className={`badge ${row.presence}`}>{row.presence}</span>
              </summary>
              
              <div className="context-grid mini-grid" style={{ marginTop: '10px' }}>
                <label>
                  Presence
                  <select value={row.presence} onChange={(e) => updateCharacterState(index, "presence", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="nearby">Nearby</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>

                <label>
                  Location
                  <select value={row.locationId || "with_user"} onChange={(e) => updateCharacterState(index, "locationId", e.target.value)}>
                    <option value="with_user">With User</option>
                    <option value="unknown">Unknown</option>
                    {worldLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </label>

                {!isInactive && (
                  <TextInput label="Mood" value={row.mood} onChange={(v) => updateCharacterState(index, "mood", v)} />
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function buildDraft(castState, characters = []) {
  const source = castState || {};
  const activeCharacters = characters.map((char) => {
    const existing = (source.activeCharacters || []).find((row) => row.castMemberId === char.id) || {};
    return {
      castMemberId: char.id,
      presence: existing.presence || "active",
      present: existing.present !== false,
      locationId: existing.locationId || existing.location || "with_user",
      outfit: existing.outfit || "",
      mood: existing.mood || "",
      condition: existing.condition || "",
      currentGoal: existing.currentGoal || "",
      knowledge: existing.knowledge || "",
      temporarySecret: existing.temporarySecret || "",
      sceneInstruction: existing.sceneInstruction || ""
    };
  });

  return {
    activeCharacters,
    relationships: source.relationships || []
  };
}
