import React, { useState, useEffect } from "react";
import LoreEditor from "../../components/LoreEditor";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import { parseKeywords } from "../../utils/helpers";

export default function StoryCharacterSheet({
  castMember,
  effectiveCharacter,
  castStateRow,
  relationshipRow,
  journalEntries = [],
  onUpdatePatch,
  onUpdateState,
  onUpdateRelationship,
  onAddLore,
  onUpdateLore,
  onRemoveLore,
  onResetOverlay,
  onBackToStory,
  onExportTemplate
}) {
  const [activeTab, setActiveTab] = useState("identity");
  const [status, setStatus] = useState("");

  // Patch/Identity State
  const [identityDraft, setIdentityDraft] = useState(effectiveCharacter);
  
  // Cast State (Live)
  const [stateDraft, setStateDraft] = useState(castStateRow || {});
  
  // Relationship State
  const [relDraft, setRelDraft] = useState(relationshipRow || {});

  useEffect(() => {
    setIdentityDraft(effectiveCharacter);
    setStateDraft(castStateRow || {});
    setRelDraft(relationshipRow || {});
  }, [effectiveCharacter, castStateRow, relationshipRow]);

  function showStatus(msg) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 1500);
  }

  function saveAll() {
    // 1. Save Identity Patch
    onUpdatePatch(castMember.id, {
      name: identityDraft.name,
      shortDescription: identityDraft.shortDescription,
      race: identityDraft.race,
      role: identityDraft.role,
      aliases: identityDraft.aliases,
      promptKeywords: identityDraft.promptKeywords,
      profileSummary: identityDraft.profileSummary,
      defaultOutfit: identityDraft.defaultOutfit,
      description: identityDraft.description,
      personality: identityDraft.personality,
      appearance: identityDraft.appearance,
      backstory: identityDraft.backstory,
      speakingStyle: identityDraft.speakingStyle,
      relationshipToUser: identityDraft.relationshipToUser,
      goals: identityDraft.goals,
      characterRules: identityDraft.characterRules,
      promptPinned: identityDraft.promptPinned,
    });

    // 2. Save Live State
    onUpdateState(castMember.id, stateDraft);

    // 3. Save Relationship
    onUpdateRelationship(castMember.id, relDraft);

    showStatus("Character dossier saved.");
  }

  const patch = castMember?.overlay?.identityPatch || {};

  return (
    <section className="messages sheet-view">
      <div className="sheet dossier-sheet">
        <header className="dossier-header">
          <div>
            <h2>{effectiveCharacter.name}</h2>
            <p className="muted">Story Dossier • Instance of {castMember.templateCharacterKey} (v{castMember.templateCharacterVersion})</p>
          </div>
          <div className="sheet-actions">
            <button onClick={saveAll}>Save Dossier</button>
            <button onClick={onBackToStory}>Back To Story</button>
          </div>
        </header>

        <p className="sheet-status">{status}</p>

        <nav className="dossier-tabs">
          <button className={activeTab === "identity" ? "active" : ""} onClick={() => setActiveTab("identity")}>Identity & Lore</button>
          <button className={activeTab === "state" ? "active" : ""} onClick={() => setActiveTab("state")}>Live Status</button>
          <button className={activeTab === "memory" ? "active" : ""} onClick={() => setActiveTab("memory")}>Memory ({journalEntries.length})</button>
        </nav>

        <div className="dossier-content">
          {activeTab === "identity" && (
            <div className="sheet-form">
              <h3>Story Identity Overrides</h3>
              <p className="muted">Changes here apply only to this story. Blue dots indicate an override is active.</p>
              
              <div className="context-grid identity-grid">
                <TextInput label="Story Name" value={identityDraft.name} onChange={(v) => setIdentityDraft({...identityDraft, name: v})} isOverridden={patch.name !== undefined} />
                <TextInput label="Short Description" value={identityDraft.shortDescription} onChange={(v) => setIdentityDraft({...identityDraft, shortDescription: v})} isOverridden={patch.shortDescription !== undefined} />
                <TextInput label="Race / Type" value={identityDraft.race} onChange={(v) => setIdentityDraft({...identityDraft, race: v})} isOverridden={patch.race !== undefined} />
                <TextInput label="Story Role" value={identityDraft.role} onChange={(v) => setIdentityDraft({...identityDraft, role: v})} isOverridden={patch.role !== undefined} />
                <TextInput label="Aliases" value={(identityDraft.aliases || []).join(", ")} onChange={(v) => setIdentityDraft({...identityDraft, aliases: parseKeywords(v)})} isOverridden={patch.aliases !== undefined} />
                <TextInput label="Prompt Keywords" value={(identityDraft.promptKeywords || []).join(", ")} onChange={(v) => setIdentityDraft({...identityDraft, promptKeywords: parseKeywords(v)})} isOverridden={patch.promptKeywords !== undefined} />
                <TextArea label="Smart Prompt Summary" value={identityDraft.profileSummary} onChange={(v) => setIdentityDraft({...identityDraft, profileSummary: v})} isOverridden={patch.profileSummary !== undefined} />
                <TextInput label="Default Outfit" value={identityDraft.defaultOutfit} onChange={(v) => setIdentityDraft({...identityDraft, defaultOutfit: v})} isOverridden={patch.defaultOutfit !== undefined} />
                <TextArea label="Core Description" value={identityDraft.description} onChange={(v) => setIdentityDraft({...identityDraft, description: v})} isOverridden={patch.description !== undefined} />
                <TextArea label="Personality" value={identityDraft.personality} onChange={(v) => setIdentityDraft({...identityDraft, personality: v})} isOverridden={patch.personality !== undefined} />
                <TextArea label="Appearance" value={identityDraft.appearance} onChange={(v) => setIdentityDraft({...identityDraft, appearance: v})} isOverridden={patch.appearance !== undefined} />
                <TextArea label="Backstory" value={identityDraft.backstory} onChange={(v) => setIdentityDraft({...identityDraft, backstory: v})} isOverridden={patch.backstory !== undefined} />
                <TextInput label="Speaking Style" value={identityDraft.speakingStyle} onChange={(v) => setIdentityDraft({...identityDraft, speakingStyle: v})} isOverridden={patch.speakingStyle !== undefined} />
                <TextArea label="Base Relationship" value={identityDraft.relationshipToUser} onChange={(v) => setIdentityDraft({...identityDraft, relationshipToUser: v})} isOverridden={patch.relationshipToUser !== undefined} />
                <TextArea label="Permanent Goals" value={identityDraft.goals} onChange={(v) => setIdentityDraft({...identityDraft, goals: v})} isOverridden={patch.goals !== undefined} />
                <TextArea label="Character Rules" value={identityDraft.characterRules} onChange={(v) => setIdentityDraft({...identityDraft, characterRules: v})} isOverridden={patch.characterRules !== undefined} />
                <label className="lore-checkbox">
                  {patch.promptPinned !== undefined && <span className="overridden-dot"></span>}
                  <input type="checkbox" checked={identityDraft.promptPinned === true} onChange={(e) => setIdentityDraft({...identityDraft, promptPinned: e.target.checked})} />
                  Always include full details in smart prompt
                </label>
              </div>

              <h3>Instance Lorebook</h3>
              <p className="muted small">Effective lore for this instance (Template + Overlays).</p>
              <LoreInfoViewer 
                lorebook={effectiveCharacter.lorebook || []} 
                castMemberId={castMember.id}
                overlay={castMember.overlay}
                onAddLore={onAddLore}
                onUpdateLore={onUpdateLore}
                onRemoveLore={onRemoveLore}
              />
              
              <div className="sheet-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="danger" onClick={() => { if(confirm("Reset all overrides?")) onResetOverlay(castMember.id); }}>Reset All Story Overrides</button>
                <button type="button" onClick={() => onExportTemplate(identityDraft)}>Export As Template</button>
              </div>
            </div>
          )}

          {activeTab === "state" && (
            <div className="sheet-form">
              <h3>Current Scene Status</h3>
              <div className="context-grid">
                <label>
                  Presence
                  <select value={stateDraft.presence} onChange={(e) => setStateDraft({...stateDraft, presence: e.target.value, present: e.target.value !== "inactive"})}>
                    <option value="active">Active (Speaking)</option>
                    <option value="nearby">Nearby (Background)</option>
                    <option value="inactive">Inactive (Off-scene)</option>
                  </select>
                </label>
                <TextInput label="Current Mood" value={stateDraft.mood} onChange={(v) => setStateDraft({...stateDraft, mood: v})} />
                <TextInput label="Physical Condition" value={stateDraft.condition} onChange={(v) => setStateDraft({...stateDraft, condition: v})} />
                <TextInput label="Current Outfit" value={stateDraft.outfit} onChange={(v) => setStateDraft({...stateDraft, outfit: v})} />
                <TextArea label="Immediate Goal" value={stateDraft.currentGoal} onChange={(v) => setStateDraft({...stateDraft, currentGoal: v})} />
                <TextArea label="Temporary Secret" value={stateDraft.temporarySecret} onChange={(v) => setStateDraft({...stateDraft, temporarySecret: v})} />
                <TextArea label="Scene Instruction" value={stateDraft.sceneInstruction} onChange={(v) => setStateDraft({...stateDraft, sceneInstruction: v})} />
              </div>

              <h3>Current Relationship to User</h3>
              <div className="context-grid">
                 <TextArea label="Bond / Trust Notes" value={relDraft.trustTensionNotes} onChange={(v) => setRelDraft({...relDraft, trustTensionNotes: v})} />
                 <TextArea label="Promises / Conflicts" value={relDraft.promisesConflicts} onChange={(v) => setRelDraft({...relDraft, promisesConflicts: v})} />
              </div>
            </div>
          )}

          {activeTab === "memory" && (
            <div className="character-memory-list">
              <h3>Story Memory</h3>
              <p className="muted">Events and facts specifically remembered by {effectiveCharacter.name}.</p>
              {journalEntries.length === 0 ? (
                <p className="empty-note">No character-specific memories have been recorded yet.</p>
              ) : (
                <div className="journal-list">
                  {journalEntries.map((entry) => (
                    <div key={entry.id} className="memory-entry card">
                      <div className="memory-meta">
                        <span className="memory-date">{new Date(entry.createdAt).toLocaleDateString()}</span>
                        {!entry.active && <span className="pill muted">Inactive</span>}
                      </div>
                      <p>{entry.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LoreInfoViewer({ lorebook, castMemberId, overlay, onAddLore, onUpdateLore, onRemoveLore }) {
  const addedIds = new Set((overlay.addedLoreEntries || []).map(e => e.id));
  const modifiedIds = new Set(Object.keys(overlay.modifiedLoreEntries || {}));
  
  return (
    <div className="dossier-lore-viewer">
       <div className="sheet-actions compact-actions">
          <button type="button" onClick={() => onAddLore(castMemberId, { name: "New Story Lore", keywords: [], content: "", enabled: true, alwaysOn: false })}>+ Add Story Lore</button>
       </div>
       <div className="context-card-list">
          {lorebook.map((entry) => {
            const isAdded = addedIds.has(entry.id);
            const isModified = modifiedIds.has(entry.id);
            const badge = isAdded ? "Story-only" : isModified ? "Override" : "Template";
            
            return (
              <details key={entry.id} className="context-card">
                <summary>
                   <strong>{entry.name}</strong>
                   <span className={`badge ${badge.toLowerCase()}`}>{badge}</span>
                </summary>
                <div className="sheet-form compact-form">
                   <TextInput label="Lore Name" value={entry.name} onChange={(v) => onUpdateLore(castMemberId, entry.id, { name: v })} />
                   <TextInput label="Keywords" value={(entry.keywords || []).join(", ")} onChange={(v) => onUpdateLore(castMemberId, entry.id, { keywords: parseKeywords(v) })} />
                   <TextArea label="Content" value={entry.content} onChange={(v) => onUpdateLore(castMemberId, entry.id, { content: v })} />
                   <div className="sheet-actions compact-actions">
                      <button type="button" className="danger small" onClick={() => onRemoveLore(castMemberId, entry.id)}>Remove Lore</button>
                   </div>
                </div>
              </details>
            );
          })}
       </div>
    </div>
  );
}
