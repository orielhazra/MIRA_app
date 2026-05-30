export default function Sidebar({
  activeStory,
  activeWorld,
  activeStoryCharacters = [],
  selectedWorldSheetId,
  selectedCharacterSheetId,
  getWorld,
  getCharacter,
  isGenerating = false,
  isCollapsed = false,
  onToggleCollapse,
  onSelectCharacter,
  onNewCharacter,
  onSelectWorld,
  onEditStory
}) {
  if (isCollapsed) {
    return (
      <aside className="sidebar collapsed-sidebar" aria-label="Collapsed sidebar">
        <button
          type="button"
          className="panel-collapse-button"
          aria-label="Expand sidebar"
          title="Expand sidebar"
          onClick={onToggleCollapse}
        >
          »
        </button>
        <span className="collapsed-panel-label">Library</span>
      </aside>
    );
  }

  const currentWorld = activeWorld || (activeStory ? getWorld(activeStory.templateWorldId) : null);

  return (
    <aside className="sidebar">
      <div className="side-panel-header">
        <strong className="side-panel-title">Library</strong>
        <button
          type="button"
          className="panel-collapse-button"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          onClick={onToggleCollapse}
        >
          «
        </button>
      </div>

      {/* Current Story */}
      {activeStory && (
        <>
          <h2>Current Story</h2>
          <button
            type="button"
            className="character active"
            disabled={isGenerating}
            onClick={() => onEditStory?.(activeStory.id)}
          >
            <strong>{activeStory.title}</strong>
            <span>Edit story details</span>
          </button>
          <hr />
        </>
      )}

      {/* Cast (Story Characters only) */}
      <h2>Cast</h2>
      <div id="characterList">
        {activeStoryCharacters.length > 0 ? (
          activeStoryCharacters.map((character) => {
            const isSelected = selectedCharacterSheetId === character.id;
            return (
              <button
                type="button"
                key={character.id}
                className={`character ${isSelected ? "active" : ""}`}
                disabled={isGenerating}
                onClick={() => onSelectCharacter(character.id)}
              >
                <strong>{character.name}</strong>
                <span>{character.shortDescription}</span>
              </button>
            );
          })
        ) : (
          <div style={{ color: "#888", padding: "8px 0" }}>No characters in this story</div>
        )}
      </div>
      <button 
        type="button" 
        id="newCharacterButton" 
        disabled={isGenerating} 
        onClick={onNewCharacter}
      >
        + Add Character
      </button>

      <hr />

      {/* Current World (No locations list per request) */}
      <h2>World</h2>
      {currentWorld ? (
        <>
          <button
            type="button"
            className={`character ${selectedWorldSheetId === currentWorld.id ? "active" : ""}`}
            disabled={isGenerating}
            onClick={() => onSelectWorld(currentWorld.id)}
          >
            <strong>{currentWorld.name}</strong>
            <span>{currentWorld.shortDescription}</span>
          </button>
        </>
      ) : (
        <div style={{ color: "#888", padding: "8px 0" }}>No world assigned</div>
      )}
    </aside>
  );
}
