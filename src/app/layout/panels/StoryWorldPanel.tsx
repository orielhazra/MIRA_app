import React, { useMemo, useState, useEffect } from "react";
import LoreEditor from "../../../components/LoreEditor";
import { parseKeywords } from "../../../utils/helpers";
import { resolveEffectiveStoryCharacter } from "../../../services/storyCharacters";
import { getLatestTemplateByKey } from "../../../services/storyWorld";
import { getLatestTemplateCharacterByKey } from "../../../services/storyCharacters";

export default function StoryWorldPanel({
  activeStory,
  activeWorld,
  storyCharacters,
  characters,
  worlds,
  onExportStory,
  onDeleteStory,
  onUpdateStoryCharacterPatch,
  onAddStoryCharacterLoreEntry,
  onUpdateStoryCharacterLoreEntry,
  onRemoveStoryCharacterLoreEntry,
  onResetStoryCharacterOverlay,
  onUpgradeStoryCastMemberTemplate,
  onExportCharacterTemplate,
  onImportCharacterTemplate,
  onSaveStoryWorldPatch,
  onAddStoryWorldLocation,
  onUpdateStoryWorldLocation,
  onRemoveStoryWorldLocation,
  onAddStoryWorldLoreEntry,
  onUpdateStoryWorldLoreEntry,
  onRemoveStoryWorldLoreEntry,
  onResetStoryWorldOverlay,
  onUpgradeStoryWorldTemplate,
}: any) {
  const [worldDraft, setWorldDraft] = useState(() => buildWorldDraft(activeWorld));
  const [locationDrafts, setLocationDrafts] = useState(() => buildLocationDrafts(activeWorld?.locations || []));
  const [loreDrafts, setLoreDrafts] = useState(() => buildLoreDrafts(activeWorld?.worldLorebook || []));
  const [status, setStatus] = useState("");

  const addedLocationIds = useMemo(
    () => new Set((activeStory?.worldOverlay?.addedLocations || []).map((location: any) => location.id)),
    [activeStory?.worldOverlay?.addedLocations]
  );
  const modifiedLocationIds = useMemo(
    () => new Set(Object.keys(activeStory?.worldOverlay?.modifiedLocations || {})),
    [activeStory?.worldOverlay?.modifiedLocations]
  );
  const addedLoreIds = useMemo(
    () => new Set((activeStory?.worldOverlay?.addedLoreEntries || []).map((entry: any) => entry.id)),
    [activeStory?.worldOverlay?.addedLoreEntries]
  );
  const modifiedLoreIds = useMemo(
    () => new Set(Object.keys(activeStory?.worldOverlay?.modifiedLoreEntries || {})),
    [activeStory?.worldOverlay?.modifiedLoreEntries]
  );

  useEffect(() => {
    setWorldDraft(buildWorldDraft(activeWorld));
    setLocationDrafts(buildLocationDrafts(activeWorld?.locations || []));
    setLoreDrafts(buildLoreDrafts(activeWorld?.worldLorebook || []));
    setStatus("");
  }, [activeStory?.id, activeWorld]);

  function showStatus(nextStatus: string) {
    setStatus(nextStatus);
    setTimeout(() => setStatus(""), 1500);
  }

  function updateWorldField(field: string, value: string) {
    setWorldDraft((current: any) => ({ ...current, [field]: value }));
  }

  function saveWorldPatch() {
    onSaveStoryWorldPatch?.({
      name: worldDraft.name,
      overview: worldDraft.overview,
      shortDescription: worldDraft.shortDescription,
      description: worldDraft.description,
      rules: worldDraft.rules,
    });
    showStatus("Story world details saved.");
  }

  function addLocation() {
    onAddStoryWorldLocation?.({
      name: "New Story Location",
      summary: "",
      description: "",
      mood: "",
      visibleExits: "",
      hazards: "",
      connectedTo: "",
      keywords: [],
    });
    showStatus("Story location added.");
  }

  function updateLocationDraft(locationId: string, field: string, value: any) {
    setLocationDrafts((current: any) => ({
      ...current,
      [locationId]: {
        ...(current[locationId] || {}),
        [field]: value,
      },
    }));
  }

  function saveLocation(locationId: string) {
    const draft = locationDrafts[locationId];
    onUpdateStoryWorldLocation?.(locationId, {
      name: draft.name,
      summary: draft.summary,
      description: draft.description,
      mood: draft.mood,
      visibleExits: draft.visibleExits,
      hazards: draft.hazards,
      connectedTo: draft.connectedTo,
      keywords: draft.keywords,
    });
    showStatus(`Saved location ${draft.name || locationId}.`);
  }

  function removeLocation(locationId: string, locationName?: string) {
    onRemoveStoryWorldLocation?.(locationId);
    showStatus(`Removed ${locationName || "location"}.`);
  }

  function addLoreEntry() {
    onAddStoryWorldLoreEntry?.({
      name: "New Story World Lore",
      keywords: [],
      content: "",
      enabled: true,
      alwaysOn: false,
      priority: 0,
    });
    showStatus("Story world lore entry added.");
  }

  function updateLoreDraft(entryId: string, field: string, value: any) {
    setLoreDrafts((current: any) => ({
      ...current,
      [entryId]: {
        ...(current[entryId] || {}),
        [field]: value,
      },
    }));
  }

  function saveLoreEntry(entryId: string) {
    const draft = loreDrafts[entryId];
    onUpdateStoryWorldLoreEntry?.(entryId, {
      name: draft.name,
      keywords: draft.keywords,
      content: draft.content,
      enabled: draft.enabled,
      alwaysOn: draft.alwaysOn,
      priority: draft.priority,
    });
    showStatus(`Saved lore entry ${draft.name || entryId}.`);
  }

  function removeLoreEntry(entryId: string, entryName?: string) {
    onRemoveStoryWorldLoreEntry?.(entryId);
    showStatus(`Removed ${entryName || "lore entry"}.`);
  }

  function resetOverlay() {
    if (!confirm("Reset all story-world customizations back to the base template?")) return;
    onResetStoryWorldOverlay?.();
    showStatus("Story world overlay reset.");
  }

  function upgradeWorld() {
    onUpgradeStoryWorldTemplate?.();
    showStatus("Story world upgraded to latest template version.");
  }

  const worldPatch = activeStory.worldOverlay?.worldPatch || {};
  const latestWorldTemplate = getLatestTemplateByKey(activeStory.templateWorldKey || activeStory.templateWorldId, worlds);
  const isWorldUpgradeAvailable = latestWorldTemplate && latestWorldTemplate.id !== activeStory.templateWorldId;

  return (
    <div className="info-panel active">
      <h3>Story</h3>
      <InfoField label="Title" value={activeStory.title} />
      <InfoField label="Scenario" value={activeStory.scenario || "—"} />
      <InfoField label="Greeting" value={activeStory.greeting || "—"} />

      <h3>Story Cast Identity</h3>
      <p className="muted">Story-specific permanent identity overrides. Edits here affect ONLY this story.</p>
      <div className="cast-summary-list">
        {(activeStory.castMembers || []).map((castMember: any) => {
          const effectiveCharacter = resolveEffectiveStoryCharacter(castMember, characters);
          if (!effectiveCharacter) return null;
          return (
            <StoryCastIdentityCard
              key={castMember.id}
              castMember={castMember}
              effectiveCharacter={effectiveCharacter}
              characters={characters}
              presenceLabel={getPresenceLabel(activeStory, castMember.id)}
              onUpdatePatch={onUpdateStoryCharacterPatch}
              onAddLore={onAddStoryCharacterLoreEntry}
              onUpdateLore={onUpdateStoryCharacterLoreEntry}
              onRemoveLore={onRemoveStoryCharacterLoreEntry}
              onResetOverlay={onResetStoryCharacterOverlay}
              onUpgradeTemplate={onUpgradeStoryCastMemberTemplate}
              onExportTemplate={onExportCharacterTemplate}
            />
          );
        })}
      </div>
      <div className="sheet-actions compact-actions">
        <button type="button" onClick={onImportCharacterTemplate}>Import Reusable Character Template</button>
      </div>
      <p className="muted">Imported templates are secondary: after import, add them to a story cast and edit the story version as needed.</p>

      <h3>Story World</h3>
      <InfoField
        label="Base Template"
        value={`${activeStory.templateWorldKey || activeStory.templateWorldId || "Unknown"} • v${activeStory.templateWorldVersion || 1}`}
      />
      {isWorldUpgradeAvailable && (
        <div className="info-box upgrade-box">
          <p>A newer version (v{latestWorldTemplate.templateVersion}) of this world template is available.</p>
          <button type="button" onClick={upgradeWorld}>Upgrade World to v{latestWorldTemplate.templateVersion}</button>
        </div>
      )}
      <p className="muted">Story-specific world overrides. Edits here affect ONLY this story.</p>
      <p className="sheet-status">{status}</p>

      <div className="context-grid">
        <ContextInput label="Story World Name" value={worldDraft.name} onChange={(value) => updateWorldField("name", value)} isOverridden={worldPatch.name !== undefined} />
        <ContextInput label="Story World Short Description" value={worldDraft.shortDescription} onChange={(value) => updateWorldField("shortDescription", value)} isOverridden={worldPatch.shortDescription !== undefined} />
        <ContextTextarea label="Story World Overview" value={worldDraft.overview} onChange={(value) => updateWorldField("overview", value)} isOverridden={worldPatch.overview !== undefined} />
        <ContextTextarea label="Story World Description" value={worldDraft.description} onChange={(value) => updateWorldField("description", value)} isOverridden={worldPatch.description !== undefined} />
        <ContextTextarea label="Story World Rules" value={worldDraft.rules} onChange={(value) => updateWorldField("rules", value)} isOverridden={worldPatch.rules !== undefined} />
      </div>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={saveWorldPatch}>Save Story World Details</button>
        <button type="button" className="danger" onClick={resetOverlay}>Reset Story World Overlay</button>
      </div>

      <h3>Story World Locations</h3>
      <p className="muted">Effective locations for this story (Template + Overlays).</p>
      <div className="sheet-actions compact-actions">
        <button type="button" onClick={addLocation}>Add Story Location</button>
      </div>
      {(activeWorld.locations || []).length ? (
        <div className="context-card-list">
          {(activeWorld.locations || []).map((location: any) => {
            const draft = locationDrafts[location.id] || location;
            return (
              <details key={location.id || location.name} className="context-card">
                <summary>
                  <strong>{draft.name || location.name}</strong>
                  <span>{getLocationBadge(location.id, addedLocationIds, modifiedLocationIds)}</span>
                </summary>
                <ContextInput label="Location Name" value={draft.name || ""} onChange={(value) => updateLocationDraft(location.id, "name", value)} />
                <ContextInput label="Summary" value={draft.summary || ""} onChange={(value) => updateLocationDraft(location.id, "summary", value)} />
                <ContextTextarea label="Description" value={draft.description || ""} onChange={(value) => updateLocationDraft(location.id, "description", value)} />
                <ContextInput label="Mood" value={draft.mood || ""} onChange={(value) => updateLocationDraft(location.id, "mood", value)} />
                <ContextInput label="Visible Exits" value={draft.visibleExits || ""} onChange={(value) => updateLocationDraft(location.id, "visibleExits", value)} />
                <ContextInput label="Connected To" value={draft.connectedTo || ""} onChange={(value) => updateLocationDraft(location.id, "connectedTo", value)} />
                <ContextInput label="Keywords" value={(draft.keywords || []).join(", ")} onChange={(value) => updateLocationDraft(location.id, "keywords", parseKeywords(value))} />
                <ContextTextarea label="Hazards" value={draft.hazards || ""} onChange={(value) => updateLocationDraft(location.id, "hazards", value)} />
                <div className="sheet-actions compact-actions">
                  <button type="button" onClick={() => saveLocation(location.id)}>Save Location</button>
                  <button type="button" className="danger small" onClick={() => removeLocation(location.id, draft.name || location.name)}>Remove Location</button>
                </div>
              </details>
            );
          })}
        </div>
      ) : <p className="muted">No world locations saved yet.</p>}

      <h3>Story World Lore</h3>
      <p className="muted">Effective lore for this story (Template + Overlays).</p>
      <div className="sheet-actions compact-actions">
        <button type="button" onClick={addLoreEntry}>Add Story World Lore</button>
      </div>
      {(activeWorld.worldLorebook || []).length ? (
        <div className="context-card-list">
          {(activeWorld.worldLorebook || []).map((entry: any) => {
            const draft = loreDrafts[entry.id] || entry;
            return (
              <details key={entry.id || entry.name} className="context-card">
                <summary>
                  <strong>{draft.name || entry.name}</strong>
                  <span>{getLoreBadge(entry.id, addedLoreIds, modifiedLoreIds)}</span>
                </summary>
                <ContextInput label="Lore Name" value={draft.name || ""} onChange={(value) => updateLoreDraft(entry.id, "name", value)} />
                <ContextInput label="Keywords" value={(draft.keywords || []).join(", ")} onChange={(value) => updateLoreDraft(entry.id, "keywords", parseKeywords(value))} />
                <ContextTextarea label="Content" value={draft.content || ""} onChange={(value) => updateLoreDraft(entry.id, "content", value)} />
                <label className="lore-checkbox context-present-toggle">
                  <input type="checkbox" checked={draft.enabled !== false} onChange={(event) => updateLoreDraft(entry.id, "enabled", event.target.checked)} />
                  Enabled
                </label>
                <label className="lore-checkbox context-present-toggle">
                  <input type="checkbox" checked={draft.alwaysOn === true} onChange={(event) => updateLoreDraft(entry.id, "alwaysOn", event.target.checked)} />
                  Always On
                </label>
                <ContextInput label="Priority" value={String(draft.priority ?? 0)} onChange={(value) => updateLoreDraft(entry.id, "priority", Number(value || 0))} />
                <div className="sheet-actions compact-actions">
                  <button type="button" onClick={() => saveLoreEntry(entry.id)}>Save Lore Entry</button>
                  <button type="button" className="danger small" onClick={() => removeLoreEntry(entry.id, draft.name || entry.name)}>Remove Lore Entry</button>
                </div>
              </details>
            );
          })}
        </div>
      ) : <p className="muted">No world lore saved yet.</p>}

      <div className="info-actions">
        <button onClick={onExportStory}>Export Story</button>
        <button className="danger" onClick={onDeleteStory}>Delete Story</button>
      </div>
    </div>
  );
}

function StoryCastIdentityCard({ castMember, effectiveCharacter, characters, presenceLabel, onUpdatePatch, onAddLore, onUpdateLore, onRemoveLore, onResetOverlay, onUpgradeTemplate, onExportTemplate }: any) {
  const [draft, setDraft] = useState(effectiveCharacter);
  const [status, setStatus] = useState("");

  const addedLoreIds = useMemo(
    () => new Set((castMember.overlay.addedLoreEntries || []).map((entry: any) => entry.id)),
    [castMember.overlay.addedLoreEntries]
  );
  const modifiedLoreIds = useMemo(
    () => new Set(Object.keys(castMember.overlay.modifiedLoreEntries || {})),
    [castMember.overlay.modifiedLoreEntries]
  );

  useEffect(() => {
    setDraft(effectiveCharacter);
    setStatus("");
  }, [effectiveCharacter]);

  function update(field: string, value: any) {
    setDraft((current: any) => ({ ...current, [field]: value }));
  }

  function save() {
    onUpdatePatch?.(castMember.id, {
      name: draft.name,
      shortDescription: draft.shortDescription,
      race: draft.race,
      role: draft.role,
      aliases: draft.aliases,
      promptKeywords: draft.promptKeywords,
      profileSummary: draft.profileSummary,
      defaultOutfit: draft.defaultOutfit,
      description: draft.description,
      personality: draft.personality,
      appearance: draft.appearance,
      backstory: draft.backstory,
      speakingStyle: draft.speakingStyle,
      relationshipToUser: draft.relationshipToUser,
      goals: draft.goals,
      characterRules: draft.characterRules,
      promptPinned: draft.promptPinned,
    });
    setStatus("Identity saved.");
    setTimeout(() => setStatus(""), 1400);
  }

  function resetOverlay() {
    if (!confirm(`Reset ${effectiveCharacter.name}'s story customization back to the base template?`)) return;
    onResetOverlay?.(castMember.id);
    setStatus("Identity reset.");
    setTimeout(() => setStatus(""), 1400);
  }

  function upgradeTemplate() {
    onUpgradeTemplate?.(castMember.id);
    setStatus("Template upgraded.");
    setTimeout(() => setStatus(""), 1400);
  }

  const patch = castMember.overlay?.identityPatch || {};
  const latestCharacterTemplate = getLatestTemplateCharacterByKey(castMember.templateCharacterKey || castMember.templateCharacterId, characters);
  const isUpgradeAvailable = latestCharacterTemplate && latestCharacterTemplate.id !== castMember.templateCharacterId;

  return (
    <details className="character-profile-card identity-card">
      <summary>
        <strong>{effectiveCharacter.name}</strong>
        <span>{presenceLabel}</span>
      </summary>
      
      <div style={{ padding: '0 10px' }}>
        <p className="muted">
          Story instance of <strong>{castMember.templateCharacterKey || castMember.templateCharacterId} (v{castMember.templateCharacterVersion || 1})</strong>.
        </p>
        
        {isUpgradeAvailable && (
          <div className="info-box upgrade-box">
            <p>A newer template version (v{latestCharacterTemplate.templateVersion}) is available.</p>
            <button type="button" onClick={upgradeTemplate}>Upgrade to v{latestCharacterTemplate.templateVersion}</button>
          </div>
        )}
      </div>

      <div className="context-grid identity-grid">
        <ContextInput label="Name" value={draft.name || ""} onChange={(value) => update("name", value)} isOverridden={patch.name !== undefined} />
        <ContextInput label="Short Description" value={draft.shortDescription || ""} onChange={(value) => update("shortDescription", value)} isOverridden={patch.shortDescription !== undefined} />
        <ContextInput label="Race / Type" value={draft.race || ""} onChange={(value) => update("race", value)} isOverridden={patch.race !== undefined} />
        <ContextInput label="Story Role" value={draft.role || ""} onChange={(value) => update("role", value)} isOverridden={patch.role !== undefined} />
        <ContextInput label="Aliases" value={(draft.aliases || []).join(", ")} onChange={(value) => update("aliases", parseKeywords(value))} isOverridden={patch.aliases !== undefined} />
        <ContextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", parseKeywords(value))} isOverridden={patch.promptKeywords !== undefined} />
        <ContextTextarea label="Smart Prompt Summary" value={draft.profileSummary || ""} onChange={(value) => update("profileSummary", value)} isOverridden={patch.profileSummary !== undefined} />
        <ContextTextarea label="Default Outfit" value={draft.defaultOutfit || ""} onChange={(value) => update("defaultOutfit", value)} isOverridden={patch.defaultOutfit !== undefined} />
        <ContextTextarea label="Description" value={draft.description || ""} onChange={(value) => update("description", value)} isOverridden={patch.description !== undefined} />
        <ContextTextarea label="Personality" value={draft.personality || ""} onChange={(value) => update("personality", value)} isOverridden={patch.personality !== undefined} />
        <ContextTextarea label="Appearance" value={draft.appearance || ""} onChange={(value) => update("appearance", value)} isOverridden={patch.appearance !== undefined} />
        <ContextTextarea label="Backstory" value={draft.backstory || ""} onChange={(value) => update("backstory", value)} isOverridden={patch.backstory !== undefined} />
        <ContextTextarea label="Speaking Style" value={draft.speakingStyle || ""} onChange={(value) => update("speakingStyle", value)} isOverridden={patch.speakingStyle !== undefined} />
        <ContextTextarea label="Base Relationship to User" value={draft.relationshipToUser || ""} onChange={(value) => update("relationshipToUser", value)} isOverridden={patch.relationshipToUser !== undefined} />
        <ContextTextarea label="Permanent Goals / Motivation" value={draft.goals || ""} onChange={(value) => update("goals", value)} isOverridden={patch.goals !== undefined} />
        <ContextTextarea label="Character Rules" value={draft.characterRules || ""} onChange={(value) => update("characterRules", value)} isOverridden={patch.characterRules !== undefined} />
        <label className="lore-checkbox context-present-toggle">
          {patch.promptPinned !== undefined && <span className="overridden-dot" title="Overridden for this story"></span>}
          <input type="checkbox" checked={draft.promptPinned === true} onChange={(event) => update("promptPinned", event.target.checked)} />
          Always include full details in smart prompt
        </label>
      </div>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={save}>Save Identity</button>
        <button type="button" className="danger" onClick={resetOverlay}>Reset Overlay</button>
      </div>

      <label>Story Character Lorebook</label>
      <div className="sheet-actions compact-actions">
        <button type="button" onClick={() => onAddLore?.(castMember.id, { name: "New Story Lore", keywords: [], content: "", enabled: true, alwaysOn: false })}>Add Story Lore</button>
      </div>
      {(effectiveCharacter.lorebook || []).length > 0 && (
        <div className="context-card-list">
          {effectiveCharacter.lorebook.map((entry: any) => (
             <details key={entry.id} className="context-card">
               <summary>
                 <strong>{entry.name}</strong>
                 <span>{getLoreBadge(entry.id, addedLoreIds, modifiedLoreIds)}</span>
               </summary>
               <ContextInput label="Lore Name" value={entry.name || ""} onChange={(value) => onUpdateLore?.(castMember.id, entry.id, { name: value })} />
               <ContextInput label="Keywords" value={(entry.keywords || []).join(", ")} onChange={(value) => onUpdateLore?.(castMember.id, entry.id, { keywords: parseKeywords(value) })} />
               <ContextTextarea label="Content" value={entry.content || ""} onChange={(value) => onUpdateLore?.(castMember.id, entry.id, { content: value })} />
               <div className="sheet-actions compact-actions">
                 <button type="button" className="danger small" onClick={() => onRemoveLore?.(castMember.id, entry.id)}>Remove Lore</button>
               </div>
             </details>
          ))}
        </div>
      )}

      <div className="sheet-actions compact-actions" style={{ marginTop: '1rem' }}>
        <button type="button" onClick={() => onExportTemplate?.(draft)}>Export As Reusable Template</button>
      </div>
      <p className="sheet-status">{status}</p>
    </details>
  );
}

function buildWorldDraft(activeWorld: any) {
  return {
    name: activeWorld?.name || "",
    overview: activeWorld?.overview || "",
    shortDescription: activeWorld?.shortDescription || "",
    description: activeWorld?.description || "",
    rules: activeWorld?.rules || "",
  };
}

function buildLocationDrafts(locations: any[]) {
  return Object.fromEntries((locations || []).map((location: any) => [location.id, { ...location, keywords: [...(location.keywords || [])] }]));
}

function buildLoreDrafts(entries: any[]) {
  return Object.fromEntries((entries || []).map((entry: any) => [entry.id, { ...entry, keywords: [...(entry.keywords || [])] }]));
}

function getLocationBadge(locationId: string, addedLocationIds: Set<string>, modifiedLocationIds: Set<string>) {
  if (addedLocationIds.has(locationId)) return "Story-only location";
  if (modifiedLocationIds.has(locationId)) return "Template override";
  return "Template location";
}

function getLoreBadge(entryId: string, addedLoreIds: Set<string>, modifiedLoreIds: Set<string>) {
  if (addedLoreIds.has(entryId)) return "Story-only lore";
  if (modifiedLoreIds.has(entryId)) return "Template override";
  return "Template lore";
}

function getPresenceLabel(story: any, castMemberId: string) {
  const row = (story?.castState?.activeCharacters || []).find((item: any) => item.castMemberId === castMemberId);
  return formatPresenceLabel(getRowPresence(row));
}

function getRowPresence(row: any) {
  const raw = String(row?.presence || "").trim().toLowerCase();
  if (["active", "nearby", "inactive"].includes(raw)) return raw;
  return row?.present === false ? "inactive" : "active";
}

function formatPresenceLabel(presence: string) {
  if (presence === "nearby") return "Nearby / background";
  if (presence === "inactive") return "Inactive / off-scene";
  return "Active";
}

function ContextInput({ label, value = "", onChange, isOverridden = false }: any) {
  return (
    <label>
      {isOverridden && <span className="overridden-dot" title="Overridden for this story"></span>}
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ContextTextarea({ label, value = "", onChange, isOverridden = false }: any) {
  return (
    <label>
      {isOverridden && <span className="overridden-dot" title="Overridden for this story"></span>}
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function InfoField({ label, value }: any) {
  return (
    <div className="info-field">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
