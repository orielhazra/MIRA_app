import React, { useState, useEffect } from "react";
import ControlPanelHome from "../app/layout/panels/ControlPanelHome";
import CurrentContextPanel from "../app/layout/panels/CurrentContextPanel";
import StoryJournalPanel from "../app/layout/panels/StoryJournalPanel";

const PANEL_LABELS = {
  context: "Scene Control",
  memory: "Story Journal",
};

export default function EditorPanel({
  activeStory,
  activeWorld,
  activeCharacters = [],
  onToggleCollapse,
  onClearDirectorNotes,
  onSaveSceneControl,
  onSaveStoryMemory,
  onExtractUpdates,
  isExtractingUpdates = false,
  isCollapsed = false,
  currentContext,
  storyMemory,
}) {
  const [activePanel, setActivePanel] = useState(null);
  const [contextStatus, setContextStatus] = useState("");
  const [memoryStatus, setMemoryStatus] = useState("");

  const storyCharacters = activeCharacters.filter(Boolean);

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
                  activeWorld={activeWorld}
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
                  status={memoryStatus}
                  onSave={saveStoryMemory}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
