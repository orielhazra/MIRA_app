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
  onNewStory,
  onSelectStory,
  onNewCharacter,
  onSelectCharacter,
  onNewWorld,
  onSelectWorld,
  onFactoryReset
}) {
  return (
    <aside className="sidebar">
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
      <button id="newStoryButton" disabled={isGenerating} onClick={onNewStory}>+ New Story</button>

      <hr />

      <h2>Reusable Templates</h2>
      <div id="characterList">
        {characters.map((character) => (
          <button
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
      <button id="newCharacterButton" disabled={isGenerating} onClick={onNewCharacter}>+ New Template</button>

      <hr />

      <h2>Worlds</h2>
      <div id="worldList">
        {worlds.map((world) => (
          <button
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
      <button id="newWorldButton" disabled={isGenerating} onClick={onNewWorld}>+ New World</button>

      <hr />

      <button id="factoryResetButton" disabled={isGenerating} onClick={onFactoryReset}>Factory Reset</button>
    </aside>
  );
}
