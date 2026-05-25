import React from "react";

export default function ControlPanelHome({
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

function ControlButton({ title, description, onClick }) {
  return (
    <button type="button" className="control-button" onClick={onClick}>
      <strong>{title}</strong>
      <span>{description}</span>
    </button>
  );
}
