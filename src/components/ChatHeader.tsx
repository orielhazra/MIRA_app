import HeaderSettingsMenu from "./HeaderSettingsMenu";

export default function ChatHeader({
  activeView,
  activeStory,
  activeWorld,
  activeCharacter,
  activeCharacters = [],
  selectedWorld,
  selectedCharacter,
  promptTokens,
  persistenceInfo,
  koboldBaseUrl,
  storageModeLabel,
  storageTargetLabel,
  generationStatus,
  loreStatusText,
  progressPercent,
  isCollapsed = false,
  onToggleCollapse,
  onHome,
  onDebug,
  onSaveKoboldBaseUrl,
  onClearPersistenceError,
  onFlushPersistence,
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
    <header className={`chat-header ${isCollapsed ? "collapsed-chat-header" : "expanded-chat-header"}`}>
      <h1>{title}</h1>

      {!isCollapsed && <p>{subtitle}</p>}

      {!isCollapsed && (
        <div className="stats" style={{ display: showStats ? "flex" : "none" }}>
          <span id="promptTokens">Prompt: {promptTokens}</span>
          <span id="generationStatus">{generationStatus}</span>
          <span id="headerLoreStatus">{loreStatusText}</span>
        </div>
      )}

      {!isCollapsed && persistenceInfo?.lastError && (
        <p
          id="persistenceStatus"
          style={{
            margin: "6px 0 0",
            color: "#ff9f0a",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          Save warning: {persistenceInfo.lastError}
        </p>
      )}

      {!isCollapsed && (
        <div className="progress">
          <div id="progressFill" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      <div className="header-actions">
        <button
          id="topbarCollapseButton"
          type="button"
          className="header-action-button"
          aria-label={isCollapsed ? "Expand top bar" : "Collapse top bar"}
          title={isCollapsed ? "Expand top bar" : "Collapse top bar"}
          onClick={onToggleCollapse}
        >
          {isCollapsed ? "▾" : "▴"}
        </button>
        {showStats && (
          <button id="debugButton" type="button" className="header-action-button" onClick={onDebug}>Debug</button>
        )}
        <HeaderSettingsMenu
          koboldBaseUrl={koboldBaseUrl}
          persistenceInfo={persistenceInfo}
          storageModeLabel={storageModeLabel}
          storageTargetLabel={storageTargetLabel}
          onSaveKoboldBaseUrl={onSaveKoboldBaseUrl}
          onClearPersistenceError={onClearPersistenceError}
          onFlushPersistence={onFlushPersistence}
        />
        {showHome && (
          <button id="homeButton" className="header-action-button home-button" title="Go to Home" onClick={onHome}>Home</button>
        )}
      </div>
    </header>
  );
}
