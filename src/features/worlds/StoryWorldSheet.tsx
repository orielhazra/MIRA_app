import React, { useState, useEffect, useMemo } from "react";
import LoreEditor from "../../components/LoreEditor";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import { parseKeywords } from "../../utils/helpers";
import { getLatestTemplateByKey } from "../../services/storyWorld";

export default function StoryWorldSheet({
  activeStory,
  activeWorld, // This is the effective world (template + overlays)
  worlds = [], // Global library for upgrade checks
  onUpdateWorldPatch,
  onAddLocation,
  onUpdateLocation,
  onRemoveLocation,
  onAddLore,
  onUpdateLore,
  onRemoveLore,
  onResetOverlay,
  onUpgradeTemplate,
  onBackToStory,
  onExportTemplate
}) {
  const [activeTab, setActiveTab] = useState("identity");
  const [status, setStatus] = useState("");

  // Local drafts for identity fields
  const [identityDraft, setIdentityDraft] = useState({
    name: activeWorld.name,
    shortDescription: activeWorld.shortDescription,
    overview: activeWorld.overview,
    description: activeWorld.description,
    rules: activeWorld.rules,
  });

  useEffect(() => {
    setIdentityDraft({
      name: activeWorld.name,
      shortDescription: activeWorld.shortDescription,
      overview: activeWorld.overview,
      description: activeWorld.description,
      rules: activeWorld.rules,
    });
  }, [activeWorld]);

  function showStatus(msg) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 1500);
  }

  function saveIdentity() {
    onUpdateWorldPatch(identityDraft);
    showStatus("World details saved.");
  }

  function upgradeTemplate() {
    onUpgradeTemplate();
    showStatus("World template upgraded.");
  }

  const worldPatch = activeStory?.worldOverlay?.worldPatch || {};
  const latestWorldTemplate = getLatestTemplateByKey(activeStory.templateWorldKey || activeStory.templateWorldId, worlds);
  const isUpgradeAvailable = latestWorldTemplate && latestWorldTemplate.id !== activeStory.templateWorldId;

  const addedLocationIds = new Set((activeStory?.worldOverlay?.addedLocations || []).map(l => l.id));
  const modifiedLocationIds = new Set(Object.keys(activeStory?.worldOverlay?.modifiedLocations || {}));
  
  const addedLoreIds = new Set((activeStory?.worldOverlay?.addedLoreEntries || []).map(e => e.id));
  const modifiedLoreIds = new Set(Object.keys(activeStory?.worldOverlay?.modifiedLoreEntries || {}));

  return (
    <section className="messages sheet-view">
      <div className="sheet dossier-sheet">
        <header className="dossier-header">
          <div>
            <h2>{activeWorld.name}</h2>
            <p className="muted">World Dossier • Foundation: {activeStory.templateWorldKey} (v{activeStory.templateWorldVersion})</p>
          </div>
          <div className="sheet-actions">
            <button onClick={onBackToStory}>Back To Story</button>
          </div>
        </header>

        {isUpgradeAvailable && (
          <div className="info-box upgrade-box">
            <p>A newer global template version (v{latestWorldTemplate.templateVersion}) is available.</p>
            <button type="button" onClick={upgradeTemplate}>Upgrade Foundation to v{latestWorldTemplate.templateVersion}</button>
          </div>
        )}

        <p className="sheet-status">{status}</p>

        <nav className="dossier-tabs">
          <button className={activeTab === "identity" ? "active" : ""} onClick={() => setActiveTab("identity")}>World & Rules</button>
          <button className={activeTab === "locations" ? "active" : ""} onClick={() => setActiveTab("locations")}>Locations ({activeWorld.locations?.length || 0})</button>
          <button className={activeTab === "lore" ? "active" : ""} onClick={() => setActiveTab("lore")}>World Lore</button>
        </nav>

        <div className="dossier-content">
          {activeTab === "identity" && (
            <div className="sheet-form">
              <div className="section-header-actions">
                <h3>Foundation Overrides</h3>
                <button onClick={saveIdentity}>Save Changes</button>
              </div>
              <p className="muted">Story-specific world details. Edits here affect ONLY this story.</p>
              
              <div className="context-grid">
                <TextInput label="World Name" value={identityDraft.name} onChange={(v) => setIdentityDraft({...identityDraft, name: v})} isOverridden={worldPatch.name !== undefined} />
                <TextInput label="Short Description" value={identityDraft.shortDescription} onChange={(v) => setIdentityDraft({...identityDraft, shortDescription: v})} isOverridden={worldPatch.shortDescription !== undefined} />
                <TextArea label="Story Overview" value={identityDraft.overview} onChange={(v) => setIdentityDraft({...identityDraft, overview: v})} isOverridden={worldPatch.overview !== undefined} />
                <TextArea label="World Description" value={identityDraft.description} onChange={(v) => setIdentityDraft({...identityDraft, description: v})} isOverridden={worldPatch.description !== undefined} />
                <TextArea label="World Rules" value={identityDraft.rules} onChange={(v) => setIdentityDraft({...identityDraft, rules: v})} isOverridden={worldPatch.rules !== undefined} />
              </div>

              <div className="sheet-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="danger" onClick={() => { if(confirm("Reset all world overrides?")) onResetOverlay(); }}>Reset All World Overrides</button>
                <button type="button" onClick={() => onExportTemplate(activeWorld)}>Export As Template</button>
              </div>
            </div>
          )}

          {activeTab === "locations" && (
            <div className="sheet-form">
              <div className="section-header-actions">
                <h3>Story Locations</h3>
                <button type="button" onClick={() => onAddLocation({ name: "New Story Location" })}>+ Add Location</button>
              </div>
              <p className="muted">Effective locations for this story (Template + Overlays).</p>
              
              <div className="context-card-list">
                {(activeWorld.locations || []).map((loc) => {
                  const isAdded = addedLocationIds.has(loc.id);
                  const isModified = modifiedLocationIds.has(loc.id);
                  const badge = isAdded ? "Story-only" : isModified ? "Override" : "Template";
                  
                  return (
                    <details key={loc.id} className="context-card">
                      <summary>
                        <strong>{loc.name}</strong>
                        <span className={`badge ${badge.toLowerCase()}`}>{badge}</span>
                      </summary>
                      <div className="sheet-form compact-form">
                        <TextInput label="Location Name" value={loc.name} onChange={(v) => onUpdateLocation(loc.id, { name: v })} />
                        <TextInput label="Summary" value={loc.summary} onChange={(v) => onUpdateLocation(loc.id, { summary: v })} />
                        <TextArea label="Description" value={loc.description} onChange={(v) => onUpdateLocation(loc.id, { description: v })} />
                        <TextInput label="Mood" value={loc.mood} onChange={(v) => onUpdateLocation(loc.id, { mood: v })} />
                        <TextInput label="Visible Exits" value={loc.visibleExits} onChange={(v) => onUpdateLocation(loc.id, { visibleExits: v })} />
                        <TextInput label="Connected To" value={loc.connectedTo} onChange={(v) => onUpdateLocation(loc.id, { connectedTo: v })} />
                        <TextInput label="Keywords" value={(loc.keywords || []).join(", ")} onChange={(v) => onUpdateLocation(loc.id, { keywords: parseKeywords(v) })} />
                        <TextArea label="Hazards" value={loc.hazards} onChange={(v) => onUpdateLocation(loc.id, { hazards: v })} />
                        <div className="sheet-actions compact-actions">
                          <button type="button" className="danger small" onClick={() => onRemoveLocation(loc.id)}>Remove Location</button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "lore" && (
            <div className="sheet-form">
              <div className="section-header-actions">
                <h3>World Lorebook</h3>
                <button type="button" onClick={() => onAddLore({ name: "New Story Lore" })}>+ Add World Lore</button>
              </div>
              <p className="muted">Effective world-building facts for this instance.</p>
              
              <div className="context-card-list">
                {(activeWorld.worldLorebook || []).map((entry) => {
                  const isAdded = addedLoreIds.has(entry.id);
                  const isModified = modifiedLoreIds.has(entry.id);
                  const badge = isAdded ? "Story-only" : isModified ? "Override" : "Template";
                  
                  return (
                    <details key={entry.id} className="context-card">
                      <summary>
                        <strong>{entry.name}</strong>
                        <span className={`badge ${badge.toLowerCase()}`}>{badge}</span>
                      </summary>
                      <div className="sheet-form compact-form">
                        <TextInput label="Lore Name" value={entry.name} onChange={(v) => onUpdateLore(entry.id, { name: v })} />
                        <TextInput label="Keywords" value={(entry.keywords || []).join(", ")} onChange={(v) => onUpdateLore(entry.id, { keywords: parseKeywords(v) })} />
                        <TextArea label="Content" value={entry.content} onChange={(v) => onUpdateLore(entry.id, { content: v })} />
                        <div className="sheet-actions compact-actions">
                          <button type="button" className="danger small" onClick={() => onRemoveLore(entry.id)}>Remove Lore</button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
