export default function ChatHeader({
  activeView,
  activeStory,
  activeWorld,
  activeCharacter,
  activeCharacters = [],
  selectedWorld,
  selectedCharacter,
  promptTokens,
  generationStatus,
  loreStatusText,
  progressPercent,
  onHome,
  onDebug
}) {
  const isLanding = activeView === "landing" || !activeStory?.id;
  let title = "M.I.R.A.";
  let subtitle = "Welcome back";
  let showStats = !isLanding && activeView === "story";
  let showHome = !isLanding;

  if (activeView === "story-create") {
    title = "Create New Story";
    subtitle = "Choose a world, cast, scenario, and opening.";
    showStats = false;
  } else if (activeView === "character") {
    title = selectedCharacter?.name || "Reusable Character Template";
    subtitle = "Reusable Character Template";
    showStats = false;
  } else if (activeView === "world") {
    title = selectedWorld?.name || "World Details";
    subtitle = "World Details";
    showStats = false;
  } else if (!isLanding) {
    title = activeStory?.title || "Untitled Story";
    const castNames = activeCharacters.length
      ? activeCharacters.map((character) => character.name).join(", ")
      : activeCharacter?.name || "No character";
    subtitle = `${castNames} • ${activeWorld?.name || "No world"}`;
  }

  return (
    <header className="chat-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>

      <div className="stats" style={{ display: showStats ? "flex" : "none" }}>
        <span id="promptTokens">Prompt: {promptTokens}</span>
        <span id="generationStatus">{generationStatus}</span>
        <span id="headerLoreStatus">{loreStatusText}</span>
      </div>

      <div className="progress">
        <div id="progressFill" style={{ width: `${progressPercent}%` }} />
      </div>

      {showStats && (
        <button id="debugButton" type="button" onClick={onDebug}>Debug</button>
      )}
      {showHome && (
        <button id="homeButton" className="home-button" title="Go to Home" onClick={onHome}>Home</button>
      )}
    </header>
  );
}
