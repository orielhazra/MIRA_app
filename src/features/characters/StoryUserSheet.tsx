import React, { useState, useEffect } from "react";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";

export default function StoryUserSheet({
  userProfile,
  activeWorld,
  personas = [], // Global personas gallery
  onUpdateProfile,
  onBackToStory
}) {
  const [draft, setDraft] = useState(userProfile);
  const [status, setStatus] = useState("");
  const worldLocations = activeWorld?.locations || [];

  useEffect(() => {
    setDraft(userProfile);
  }, [userProfile]);

  function showStatus(msg) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 1500);
  }

  function save() {
    onUpdateProfile(draft);
    showStatus("Your dossier saved.");
  }

  function applyPersona(personaId) {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;
    
    setDraft({
      ...draft,
      name: persona.name,
      description: persona.description || persona.appearance,
      backstory: persona.backstory
    });
    showStatus(`Applied persona: ${persona.name}`);
  }

  return (
    <section className="messages sheet-view">
      <div className="sheet dossier-sheet">
        <header className="dossier-header">
          <div>
            <h2>{userProfile.name || "You"}</h2>
            <p className="muted">User Dossier • Your identity in this story</p>
          </div>
          <div className="sheet-actions">
            <button onClick={save}>Save Dossier</button>
            <button onClick={onBackToStory}>Back To Story</button>
          </div>
        </header>

        <p className="sheet-status">{status}</p>

        <div className="dossier-content">
          <div className="sheet-form">
            <div className="section-header-actions">
               <h3>Identity</h3>
               {personas.length > 0 && (
                 <select onChange={(e) => applyPersona(e.target.value)} defaultValue="" className="persona-selector" style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}>
                    <option value="" disabled>Apply Persona from Gallery...</option>
                    {personas.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                 </select>
               )}
            </div>
            
            <div className="context-grid">
              <TextInput label="Your Name" value={draft.name} onChange={(v) => setDraft({...draft, name: v})} />
              <TextArea label="Description / Appearance" value={draft.description} onChange={(v) => setDraft({...draft, description: v})} />
              <TextArea label="Your Backstory" value={draft.backstory} onChange={(v) => setDraft({...draft, backstory: v})} />
            </div>

            <h3>Live Status</h3>
            <div className="context-grid">
               <label>
                  Current Location
                  <select value={draft.locationId || "with_user"} onChange={(e) => setDraft({...draft, locationId: e.target.value})}>
                    <option value="with_user">Scene Focus (Normal)</option>
                    <option value="unknown">Unknown / Hidden</option>
                    {worldLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </label>
                <TextInput label="Current Mood" value={draft.mood} onChange={(v) => setDraft({...draft, mood: v})} />
                <TextInput label="Physical Condition" value={draft.condition} onChange={(v) => setDraft({...draft, condition: v})} />
                <TextInput label="Current Outfit" value={draft.outfit} onChange={(v) => setDraft({...draft, outfit: v})} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
