export default function Sidebar({
  stories,
  worlds,
  characters,
  activeView,
  activeStoryId,
  selectedWorldSheetId,
  selectedCharacterSheetId,
  getWorld,
  getCharacter,
  isGenerating,
  isCollapsed = false,
  onToggleCollapse,
  onNewStory,
  onSelectStory,
  onNewCharacter,
  onSelectCharacter,
  onNewWorld,
  onSelectWorld,
  onFactoryReset
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

      <h2>Stories</h2>
      <div id="storyList">
        {stories.map((story) => {
          const world = getWorld(story.worldId);
          const cast = (Array.isArray(story.characterIds) ? story.characterIds : [])
            .map(getCharacter)
            .filter(Boolean);
          const castCount = cast.length;
          const castNames = cast.slice(0, 2).map((character) => character.name).join(", ");
          return (
            <button
              type="button"
              key={story.id}
              className={`character ${activeView === "story" && story.id === activeStoryId ? "active" : ""}`}
              disabled={isGenerating}
              onClick={() => onSelectStory(story.id)}
            >
              <strong>{story.title}</strong>
              <span>{castNames || "No cast"}{castCount > 2 ? ` +${castCount - 2}` : ""} • {world?.name || "No world"}</span>
            </button>
          );
        })}
      </div>
      <button type="button" id="newStoryButton" disabled={isGenerating} onClick={onNewStory}>+ New Story</button>

      <hr />

      <h2>Reusable Templates</h2>
      <div id="characterList">
        {characters.map((character) => (
          <button
            type="button"
            key={character.id}
            className={`character ${activeView === "character" && character.id === selectedCharacterSheetId ? "active" : ""}`}
            disabled={isGenerating}
            onClick={() => onSelectCharacter(character.id)}
          >
            <strong>{character.name}</strong>
            <span>{character.shortDescription}</span>
          </button>
        ))}
      </div>
      <button type="button" id="newCharacterButton" disabled={isGenerating} onClick={onNewCharacter}>+ New Template</button>

      <hr />

      <h2>Worlds</h2>
      <div id="worldList">
        {worlds.map((world) => (
          <button
            type="button"
            key={world.id}
            className={`character ${activeView === "world" && world.id === selectedWorldSheetId ? "active" : ""}`}
            disabled={isGenerating}
            onClick={() => onSelectWorld(world.id)}
          >
            <strong>{world.name}</strong>
            <span>{world.shortDescription}</span>
          </button>
        ))}
      </div>
      <button type="button" id="newWorldButton" disabled={isGenerating} onClick={onNewWorld}>+ New World</button>

      <hr />

      <button type="button" id="factoryResetButton" disabled={isGenerating} onClick={onFactoryReset}>Factory Reset</button>
    </aside>
  );
}
