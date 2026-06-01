import React from "react";

export default function ControlPanelHome({
  activeStory,
  activeWorld,
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
          title="Scene State"
          description="Fundamental facts: time, atmosphere, location, and conflict."
          onClick={() => onOpenPanel("context")}
        />
        <ControlButton
          title="Cast Quick State"
          description="Quickly manage presence and mood for the entire cast."
          onClick={() => onOpenPanel("cast")}
        />
        <ControlButton
          title="Director Guidance"
          description="Private steering for AI behavior and next story beats."
          onClick={() => onOpenPanel("guidance")}
        />
        <ControlButton
          title="Story Journal"
          description="Global plot summary and general task tracking."
          onClick={() => onOpenPanel("memory")}
        />
      </div>

      <div className="control-summary-card">
        <h3>Ensemble Navigation</h3>
        <p className="editor-small">
          Use the <strong>Left Sidebar</strong> to access detailed dossiers for each character and the world. Dossiers contain identity overrides, individual lore, and character-specific memories.
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
