import React from "react";

export default function ControlPanelHome({
  activeStory,
  activeWorld,
  storyCharacters,
  onOpenPanel
}) {
  return (
    <div className="control-panel-home">
      <div className="control-panel-hero">
        <span className="panel-kicker">Active Story</span>
        <h2>{activeStory.title}</h2>
        <p>{activeWorld.name}</p>
      </div>

      <div className="control-button-grid" aria-label="Editor sections">
        <ControlButton
          title="Scene Control"
          description="Manage current scene facts, time of day, and director guidance for AI responses."
          onClick={() => onOpenPanel("context")}
        />
        <ControlButton
          title="Story Journal"
          description="View long-term continuity: general plot summary and task tracking."
          onClick={() => onOpenPanel("memory")}
        />
      </div>

      <div className="control-summary-card">
        <h3>Ensemble Navigation</h3>
        <p className="editor-small">
          Use the <strong>Left Sidebar</strong> to access detailed dossiers for each character and the world. Dossiers contain identity overrides, live state, and individual memories.
        </p>
      </div>
    </div>
  );
}

function ControlButton({ title, description, onClick }) {
  return (
    <button type="button" className="control-button" onClick={onClick}>
      <strong>{title}</strong>
      <span>{description}</span>
    </button>
  );
}
