import React, { useState, useEffect } from "react";
import ControlPanelHome from "../app/layout/panels/ControlPanelHome";
import CurrentContextPanel from "../app/layout/panels/CurrentContextPanel";
import StoryJournalPanel from "../app/layout/panels/StoryJournalPanel";
import StoryWorldPanel from "../app/layout/panels/StoryWorldPanel";
import CastStatePanel from "../app/layout/panels/CastStatePanel";
import LoreRulesPanel from "../app/layout/panels/LoreRulesPanel";

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
  isCollapsed = false,
  onToggleCollapse,
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
  onSaveStoryMemory,
  onSaveCastState,
  onExtractUpdates,
  isExtractingUpdates = false
}) {
  const [activePanel, setActivePanel] = useState(null);
  const [temporaryLoreDraft, setTemporaryLoreDraft] = useState(activeStory?.temporaryLorebook || []);
  const [temporaryLoreStatus, setTemporaryLoreStatus] = useState("");
  const [contextStatus, setContextStatus] = useState("");
  const [memoryStatus, setMemoryStatus] = useState("");
  const [castStatus, setCastStatus] = useState("");

  const storyCharacters = (activeCharacters.length ? activeCharacters : [activeCharacter]).filter(Boolean);

  useEffect(() => {
    setTemporaryLoreDraft(activeStory?.temporaryLorebook || []);
  }, [activeStory?.id, activeStory?.temporaryLorebook]);

  if (!activeStory || !activeWorld || storyCharacters.length === 0) return null;

  if (isCollapsed) {
    return (
      <aside className="editor collapsed-editor" aria-label="Collapsed editor panel">
        <button
          type="button"
          className="panel-collapse-button"
          aria-label="Expand control panel"
          title="Expand control panel"
          onClick={onToggleCollapse}
        >
          «
        </button>
        <span className="collapsed-panel-label">Control Panel</span>
      </aside>
    );
  }

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

  function clearDirectorNotes() {
    if (!confirm("Clear all director notes for this story?")) return;
    onClearDirectorNotes();
  }

  function saveSceneControl(contextDraft, directorDraft) {
    onSaveSceneControl(contextDraft, directorDraft);
    setContextStatus("Scene control saved.");
    setTimeout(() => setContextStatus(""), 1500);
  }

  function saveStoryMemory(memoryDraft) {
    onSaveStoryMemory?.(memoryDraft);
    setMemoryStatus("Story memory saved.");
    setTimeout(() => setMemoryStatus(""), 1500);
  }

  function saveCastState(castDraft) {
    onSaveCastState?.(castDraft);
    setCastStatus("Cast state saved.");
    setTimeout(() => setCastStatus(""), 1500);
  }

  return (
    <aside className="editor">
      <div className="side-panel-header editor-panel-header">
        <strong className="side-panel-title">Control Panel</strong>
        <button
          type="button"
          className="panel-collapse-button"
          aria-label="Collapse control panel"
          title="Collapse control panel"
          onClick={onToggleCollapse}
        >
          »
        </button>
      </div>

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
