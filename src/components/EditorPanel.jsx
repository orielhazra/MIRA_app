import { useEffect, useState } from "react";
import LoreEditor, { LoreInfoList } from "./LoreEditor.jsx";
import { parseKeywords } from "../utils/helpers.js";

const PANEL_LABELS = {
  context: "Scene Control",
  memory: "Story Journal",
  story: "Story & Cast",
  character: "Cast State",
  lore: "Lore & Rules"
};

export default function EditorPanel({
  activeStory,
  activeWorld,
  activeCharacter,
  activeCharacters = [],
  activeLoreMemory,
  loreStatusText,
  onSaveDirectorNotes,
  onClearDirectorNotes,
  onSaveSceneControl,
  onExportStory,
  onDeleteStory,
  onSaveCharacterIdentity,
  onExportCharacterTemplate,
  onImportCharacterTemplate,
  onUpdateStoryLore,
  onUpdateWorldLore,
  onUpdateCharacterLore,
  onSaveTemporaryLore,
  onClearTemporaryLore,
  onRefreshActiveLore,
  currentContext,
  storyMemory,
  castState,
  onSaveCurrentContext,
  onSaveStoryMemory,
  onSaveCastState,
  onExtractUpdates,
  isExtractingUpdates = false
}) {
  const [activePanel, setActivePanel] = useState(null);
  const [temporaryLoreDraft, setTemporaryLoreDraft] = useState(activeStory?.temporaryLorebook || []);
  const [temporaryLoreStatus, setTemporaryLoreStatus] = useState("");
  const [directorStatus, setDirectorStatus] = useState("");
  const [contextStatus, setContextStatus] = useState("");
  const [memoryStatus, setMemoryStatus] = useState("");
  const [castStatus, setCastStatus] = useState("");

  const storyCharacters = (activeCharacters.length ? activeCharacters : [activeCharacter]).filter(Boolean);

  useEffect(() => {
    setTemporaryLoreDraft(activeStory?.temporaryLorebook || []);
  }, [activeStory?.id, activeStory?.temporaryLorebook]);

  if (!activeStory || !activeWorld || storyCharacters.length === 0) return null;

  function openPanel(panelName) {
    setActivePanel(panelName);
  }

  function goBackToControls() {
    setActivePanel(null);
  }

  function saveTemporaryLore() {
    onSaveTemporaryLore(temporaryLoreDraft);
    setTemporaryLoreStatus("Temporary lore saved.");
    setTimeout(() => setTemporaryLoreStatus(""), 1500);
  }

  function clearTemporaryLore() {
    if (!confirm("Clear all temporary lore for this story?")) return;
    setTemporaryLoreDraft([]);
    onClearTemporaryLore();
    setTemporaryLoreStatus("Temporary lore cleared.");
    setTimeout(() => setTemporaryLoreStatus(""), 1500);
  }

  function saveDirectorNotes(notes) {
    onSaveDirectorNotes(notes);
    setDirectorStatus("Director notes saved.");
    setTimeout(() => setDirectorStatus(""), 1500);
  }

  function clearDirectorNotes() {
    if (!confirm("Clear all director notes for this story?")) return;
    onClearDirectorNotes();
    setDirectorStatus("Director notes cleared.");
    setTimeout(() => setDirectorStatus(""), 1500);
  }

  function saveSceneControl(contextDraft, directorDraft) {
    if (onSaveSceneControl) onSaveSceneControl(contextDraft, directorDraft);
    else {
      onSaveCurrentContext?.(contextDraft);
      onSaveDirectorNotes?.(directorDraft);
    }
    setContextStatus("Scene control saved.");
    setTimeout(() => setContextStatus(""), 1500);
  }

  function saveStoryMemory(memoryDraft) {
    onSaveStoryMemory?.(memoryDraft);
    setMemoryStatus("Story memory saved.");
    setTimeout(() => setMemoryStatus(""), 1500);
  }

  function saveCurrentContext(contextDraft) {
    onSaveCurrentContext?.(contextDraft);
    setContextStatus("Current context saved.");
    setTimeout(() => setContextStatus(""), 1500);
  }

  function saveCastState(castDraft) {
    onSaveCastState?.(castDraft);
    setCastStatus("Cast state saved.");
    setTimeout(() => setCastStatus(""), 1500);
  }

  return (
    <aside className="editor">
      <div className="info-viewer control-viewer">
        {!activePanel ? (
          <ControlPanelHome
            activeStory={activeStory}
            activeWorld={activeWorld}
            storyCharacters={storyCharacters}
            loreStatusText={loreStatusText}
            onOpenPanel={openPanel}
          />
        ) : (
          <div className="panel-screen">
            <div className="panel-screen-header">
              <button type="button" className="back-button" onClick={goBackToControls}>
                ← Back
              </button>
              <div>
                <span className="panel-kicker">Control Panel</span>
                <h2>{PANEL_LABELS[activePanel]}</h2>
              </div>
            </div>

            <div className="info-content panel-screen-content">
              {activePanel === "context" && (
                <CurrentContextPanel
                  context={currentContext}
                  directorNotes={activeStory.directorNotes}
                  status={contextStatus}
                  onSave={saveSceneControl}
                  onClearDirectorNotes={clearDirectorNotes}
                  onExtractUpdates={onExtractUpdates}
                  isExtractingUpdates={isExtractingUpdates}
                />
              )}

              {activePanel === "memory" && (
                <StoryJournalPanel
                  journal={storyMemory || activeStory.storyMemory}
                  characters={storyCharacters}
                  status={memoryStatus}
                  onSave={saveStoryMemory}
                />
              )}

              {activePanel === "story" && (
                <StoryWorldPanel
                  activeStory={activeStory}
                  activeWorld={activeWorld}
                  storyCharacters={storyCharacters}
                  onExportStory={onExportStory}
                  onDeleteStory={onDeleteStory}
                  onSaveCharacterIdentity={onSaveCharacterIdentity}
                  onExportCharacterTemplate={onExportCharacterTemplate}
                  onImportCharacterTemplate={onImportCharacterTemplate}
                />
              )}

              {activePanel === "character" && (
                <CastStatePanel
                  castState={castState}
                  characters={storyCharacters}
                  status={castStatus}
                  onSave={saveCastState}
                />
              )}

              {activePanel === "lore" && (
                <LoreRulesPanel
                  activeStory={activeStory}
                  activeWorld={activeWorld}
                  activeCharacter={activeCharacter}
                  storyCharacters={storyCharacters}
                  activeLoreMemory={activeLoreMemory}
                  temporaryLoreDraft={temporaryLoreDraft}
                  temporaryLoreStatus={temporaryLoreStatus}
                  onTemporaryLoreChange={setTemporaryLoreDraft}
                  onSaveTemporaryLore={saveTemporaryLore}
                  onClearTemporaryLore={clearTemporaryLore}
                  onRefreshActiveLore={onRefreshActiveLore}
                  onUpdateStoryLore={onUpdateStoryLore}
                  onUpdateWorldLore={onUpdateWorldLore}
                  onUpdateCharacterLore={onUpdateCharacterLore}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function ControlPanelHome({
  activeStory,
  activeWorld,
  storyCharacters,
  loreStatusText,
  onOpenPanel
}) {
  return (
    <div className="control-panel-home">
      <div className="control-panel-hero">
        <span className="panel-kicker">Active Story</span>
        <h2>{activeStory.title}</h2>
        <p>{storyCharacters.map((character) => character.name).join(", ")} • {activeWorld.name}</p>
      </div>

      <div className="control-button-grid" aria-label="Editor sections">
        <ControlButton
          title="Scene Control"
          description="Current scene facts plus director guidance for the next reply."
          onClick={() => onOpenPanel("context")}
        />
        <ControlButton
          title="Story Journal"
          description="Story summary, character-wise journals, general notes, and task tracking for long-term continuity."
          onClick={() => onOpenPanel("memory")}
        />
        <ControlButton
          title="Story & Cast"
          description="Scenario, greeting, permanent cast identity, world summary, export tools."
          onClick={() => onOpenPanel("story")}
        />
        <ControlButton
          title="Cast State"
          description="Active, nearby, and inactive cast presence plus live scene-specific character state."
          onClick={() => onOpenPanel("character")}
        />
        <ControlButton
          title="Lore & Rules"
          description="World rules, character rules, lorebooks, temporary lore, active lore."
          onClick={() => onOpenPanel("lore")}
        />
      </div>

      <div className="control-summary-card">
        <h3>Active Setup</h3>
        <p className="editor-small" id="activeStorySummary">
          {activeStory.title} • {storyCharacters.map((character) => character.name).join(", ")} • {activeWorld.name}
        </p>
        <p className="editor-small" id="loreStatus">{loreStatusText}</p>
        <p className="editor-small">Permanent identity lives in Story & Cast. Live state is controlled in Cast State. Long-term continuity lives in Story Memory.</p>
      </div>
    </div>
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

function ControlButton({ title, description, onClick }) {
  return (
    <button type="button" className="control-button" onClick={onClick}>
      <strong>{title}</strong>
      <span>{description}</span>
    </button>
  );
}

function StoryWorldPanel({
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

function CastStatePanel({ castState, characters, status, onSave }) {
  const characterById = new Map((characters || []).map((character) => [character.id, character]));
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
          const relationship = draft.relationships.find((item) => item.characterId === row.characterId) || {};
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

function LoreRulesPanel({
  activeStory,
  activeWorld,
  activeCharacter,
  storyCharacters = [],
  activeLoreMemory,
  temporaryLoreDraft,
  temporaryLoreStatus,
  onTemporaryLoreChange,
  onSaveTemporaryLore,
  onClearTemporaryLore,
  onRefreshActiveLore,
  onUpdateStoryLore,
  onUpdateWorldLore,
  onUpdateCharacterLore
}) {
  return (
    <div className="info-panel active">
      <h3>World Rules</h3>
      <div className="info-text-block">{activeWorld.rules || ""}</div>

      <h3>Character Rules</h3>
      {(storyCharacters.length ? storyCharacters : [activeCharacter]).filter(Boolean).map((character) => (
        <details key={`${character.id}-rules`} className="context-card">
          <summary>
            <strong>{character.name}</strong>
            <span>rules</span>
          </summary>
          <div className="info-text-block">{character.characterRules || ""}</div>
        </details>
      ))}

      <h3>Story Lorebook</h3>
      <div className="info-lore-list">
        <LoreInfoList
          lorebook={activeStory.storyLorebook || []}
          emptyText="This story has no story-specific lore."
          controls
          onToggleEntry={(index, patch) => onUpdateStoryLore(index, patch)}
        />
      </div>

      <h3>World Lorebook</h3>
      <div className="info-lore-list">
        <LoreInfoList
          lorebook={activeWorld.worldLorebook || []}
          emptyText="This world has no lore entries."
          controls
          onToggleEntry={(index, patch) => onUpdateWorldLore(index, patch)}
        />
      </div>

      <h3>Character Lorebooks</h3>
      {(storyCharacters.length ? storyCharacters : [activeCharacter]).filter(Boolean).map((character) => (
        <details key={`${character.id}-lorebook`} className="context-card">
          <summary>
            <strong>{character.name}</strong>
            <span>{(character.lorebook || []).length} entries</span>
          </summary>
          <div className="info-lore-list">
            <LoreInfoList
              lorebook={character.lorebook || []}
              emptyText="This character has no lore entries."
              controls
              onToggleEntry={(index, patch) => onUpdateCharacterLore(character.id, index, patch)}
            />
          </div>
        </details>
      ))}

      <h3>Temporary Lorebook</h3>
      <div id="infoTemporaryLorebook">
        <LoreEditor lorebook={temporaryLoreDraft} onChange={onTemporaryLoreChange} />
      </div>

      <div className="sheet-actions temporary-lore-actions">
        <button type="button" onClick={onSaveTemporaryLore}>Save Temporary Lore</button>
        <button type="button" className="danger" onClick={onClearTemporaryLore}>Clear Temporary Lore</button>
      </div>
      <p className="sheet-status">{temporaryLoreStatus}</p>

      <h3>Active Lore</h3>
      <div className="info-lore-list">
        <LoreInfoList
          lorebook={activeLoreMemory || []}
          emptyText="No active lore has been triggered yet."
          showSource
        />
      </div>
      <button type="button" onClick={onRefreshActiveLore}>Refresh Active Lore</button>
    </div>
  );
}


function StoryJournalPanel({ journal, characters = [], status, onSave }) {
  const [draft, setDraft] = useState(() => buildStoryJournalDraft(journal));
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const resetKey = JSON.stringify(journal || {});

  useEffect(() => {
    setDraft(buildStoryJournalDraft(journal));
    setDirty(false);
  }, [resetKey]);

  function update(field, value) {
    setDirty(true);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addGeneralEntry() {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      generalJournal: [
        ...current.generalJournal,
        { id: `general-${Date.now()}`, content: "", active: true, createdAt: Date.now() }
      ]
    }));
  }

  function updateGeneralEntry(index, field, value) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      generalJournal: current.generalJournal.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  }

  function removeGeneralEntry(index) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      generalJournal: current.generalJournal.filter((_, i) => i !== index)
    }));
  }

  function addCharacterEntry(characterId) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      characterJournals: {
        ...current.characterJournals,
        [characterId]: [
          ...(current.characterJournals[characterId] || []),
          { id: `${characterId}-${Date.now()}`, content: "", active: true, createdAt: Date.now() }
        ]
      }
    }));
  }

  function updateCharacterEntry(characterId, index, field, value) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      characterJournals: {
        ...current.characterJournals,
        [characterId]: current.characterJournals[characterId].map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        )
      }
    }));
  }

  function removeCharacterEntry(characterId, index) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      characterJournals: {
        ...current.characterJournals,
        [characterId]: current.characterJournals[characterId].filter((_, i) => i !== index)
      }
    }));
  }

  function addTask() {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        { id: `task-${Date.now()}`, content: "", active: true, completed: false, createdAt: Date.now() }
      ]
    }));
  }

  function updateTask(index, field, value) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tasks: current.tasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    }));
  }

  function removeTask(index) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tasks: current.tasks.filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="info-panel active current-context-panel story-journal-panel">
      <h3>Story Journal</h3>
      <p className="muted">Long-term story continuity with character-wise journals, general entries, summary, and tasks. Toggle individual entries to control what appears in the prompt.</p>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={() => { onSave(draft); setDirty(false); }}>Save Story Journal</button>
      </div>
      <p className="sheet-status">{dirty ? "Unsaved journal changes" : status || "Story journal saved"}</p>

      <div className="journal-tabs">
        <button
          className={activeTab === "summary" ? "active" : ""}
          onClick={() => setActiveTab("summary")}
        >
          Summary
        </button>
        <button
          className={activeTab === "general" ? "active" : ""}
          onClick={() => setActiveTab("general")}
        >
          General Journal
        </button>
        <button
          className={activeTab === "characters" ? "active" : ""}
          onClick={() => setActiveTab("characters")}
        >
          Character Journals
        </button>
        <button
          className={activeTab === "tasks" ? "active" : ""}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks
        </button>
      </div>

      {activeTab === "summary" && (
        <div className="journal-tab-content">
          <label className="journal-section">
            <span className="journal-section-header">
              <strong>Story Summary</strong>
              <small>Overall story overview and key events</small>
            </span>
            <textarea
              value={draft.summary}
              onChange={(e) => update("summary", e.target.value)}
              placeholder="Write a summary of the story so far..."
            />
          </label>
        </div>
      )}

      {activeTab === "general" && (
        <div className="journal-tab-content">
          <div className="journal-entries">
            {draft.generalJournal.map((entry, index) => (
              <JournalEntry
                key={entry.id}
                entry={entry}
                onUpdate={(field, value) => updateGeneralEntry(index, field, value)}
                onRemove={() => removeGeneralEntry(index)}
              />
            ))}
          </div>
          <button type="button" className="add-entry-btn" onClick={addGeneralEntry}>
            + Add General Entry
          </button>
        </div>
      )}

      {activeTab === "characters" && (
        <div className="journal-tab-content">
          {characters.length === 0 ? (
            <p className="muted">No characters in this story.</p>
          ) : (
            characters.map((character) => (
              <div key={character.id} className="character-journal-section">
                <h4>{character.name}</h4>
                <div className="journal-entries">
                  {(draft.characterJournals[character.id] || []).map((entry, index) => (
                    <JournalEntry
                      key={entry.id}
                      entry={entry}
                      onUpdate={(field, value) => updateCharacterEntry(character.id, index, field, value)}
                      onRemove={() => removeCharacterEntry(character.id, index)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="add-entry-btn"
                  onClick={() => addCharacterEntry(character.id)}
                >
                  + Add Entry for {character.name}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="journal-tab-content">
          <div className="journal-entries">
            {draft.tasks.map((task, index) => (
              <TaskEntry
                key={task.id}
                task={task}
                onUpdate={(field, value) => updateTask(index, field, value)}
                onRemove={() => removeTask(index)}
              />
            ))}
          </div>
          <button type="button" className="add-entry-btn" onClick={addTask}>
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
}

function JournalEntry({ entry, onUpdate, onRemove }) {
  return (
    <div className="journal-entry">
      <div className="journal-entry-header">
        <label className="journal-toggle">
          <input
            type="checkbox"
            checked={entry.active}
            onChange={(e) => onUpdate("active", e.target.checked)}
          />
          <span>Include in prompt</span>
        </label>
        <button type="button" className="remove-entry-btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <textarea
        value={entry.content}
        onChange={(e) => onUpdate("content", e.target.value)}
        placeholder="Write a journal entry..."
      />
    </div>
  );
}

function TaskEntry({ task, onUpdate, onRemove }) {
  return (
    <div className="journal-entry task-entry">
      <div className="journal-entry-header">
        <label className="journal-toggle">
          <input
            type="checkbox"
            checked={task.active}
            onChange={(e) => onUpdate("active", e.target.checked)}
          />
          <span>Include in prompt</span>
        </label>
        <label className="task-completed-toggle">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(e) => onUpdate("completed", e.target.checked)}
          />
          <span>Completed</span>
        </label>
        <button type="button" className="remove-entry-btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <textarea
        value={task.content}
        onChange={(e) => onUpdate("content", e.target.value)}
        placeholder="Write a task..."
      />
    </div>
  );
}

function buildStoryJournalDraft(journal) {
  const source = journal && typeof journal === "object" ? journal : {};
  return {
    summary: source.summary || "",
    generalJournal: Array.isArray(source.generalJournal) ? [...source.generalJournal] : [],
    characterJournals: source.characterJournals ? { ...source.characterJournals } : {},
    tasks: Array.isArray(source.tasks) ? [...source.tasks] : []
  };
}

function CurrentContextPanel({ context, directorNotes, status, onSave, onClearDirectorNotes, onExtractUpdates, isExtractingUpdates }) {
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
            <button type="button" className="danger small" onClick={() => removeObject(index)}>Remove Object</button>
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

function buildStoryMemoryDraft(memory) {
  const source = memory && typeof memory === "object" ? memory : {};
  const toggles = source.promptToggles && typeof source.promptToggles === "object" ? source.promptToggles : {};
  return {
    coreSummary: source.coreSummary || source.summary || "",
    recentEvents: source.recentEvents || "",
    openThreads: source.openThreads || source.unresolvedThreads || "",
    characterMemory: source.characterMemory || "",
    archived: source.archived || source.resolved || "",
    promptToggles: {
      coreSummary: toggles.coreSummary !== false,
      recentEvents: toggles.recentEvents !== false,
      openThreads: toggles.openThreads !== false,
      characterMemory: toggles.characterMemory !== false,
      archived: toggles.archived === true
    }
  };
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

function InfoField({ label, value }) {
  return (
    <div className="info-field">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function DirectorNotesPanel({ notes, status, onSave, onClear }) {
  const [draft, setDraft] = useState(notes || {});

  useEffect(() => {
    setDraft(notes || {});
  }, [notes]);

  function setField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleClear() {
    onClear();
  }

  return (
    <div className="info-panel active">
      <h3>Director Notes</h3>
      <div className="director-form">
        <DirectorInput label="Time of Day" field="timeOfDay" value={draft.timeOfDay} placeholder="Late evening, dawn, midnight..." setField={setField} />
        <DirectorInput label="Current Location" field="currentLocation" value={draft.currentLocation} placeholder="The station platform, Mira's room, forest road..." setField={setField} />
        <DirectorInput label="Scene Mood" field="sceneMood" value={draft.sceneMood} placeholder="Tense, quiet, romantic, ominous, playful..." setField={setField} />
        <DirectorTextarea label="Character Motivation" field="characterMotivation" value={draft.characterMotivation} placeholder="What does the active cast want right now?" setField={setField} />
        <DirectorTextarea label="User's Plan" field="userPlan" value={draft.userPlan} placeholder="What does the user seem to be trying to do?" setField={setField} />
        <DirectorTextarea label="Current Conflict" field="currentConflict" value={draft.currentConflict} placeholder="What pressure, danger, mystery, or tension is active?" setField={setField} />
        <DirectorTextarea label="Next Story Beat" field="nextStoryBeat" value={draft.nextStoryBeat} placeholder="What should happen soon?" setField={setField} />
        <DirectorTextarea label="Avoid / Do Not Reveal Yet" field="avoid" value={draft.avoid} placeholder="Secrets, twists, topics, or outcomes to avoid for now." setField={setField} />
        <DirectorTextarea label="Custom Notes" field="customNotes" value={draft.customNotes} placeholder="Any extra steering notes." setField={setField} />

        <div className="sheet-actions">
          <button type="button" onClick={() => onSave(draft)}>Save Director Notes</button>
          <button type="button" onClick={handleClear}>Clear</button>
        </div>
        <p className="sheet-status">{status}</p>
      </div>
    </div>
  );
}

function DirectorInput({ label, field, value = "", placeholder, setField }) {
  return (
    <label>
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => setField(field, event.target.value)} />
    </label>
  );
}

function DirectorTextarea({ label, field, value = "", placeholder, setField }) {
  return (
    <label>
      {label}
      <textarea value={value} placeholder={placeholder} onChange={(event) => setField(field, event.target.value)} />
    </label>
  );
}
