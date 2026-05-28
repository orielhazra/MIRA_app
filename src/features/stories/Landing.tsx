// Landing screen — M.I.R.A. home page with story metadata library.

interface StoryMeta {
  id: string;
  title: string;
  worldId: string;
  characterIds: string[];
  characterCount?: number;
  createdAt?: number;
  lastPlayedAt?: number;
}

interface LandingProps {
  storyMetas: StoryMeta[];
  worlds: any[];
  onNewStory: () => void;
  onImportStory: () => void;
  onSelectStory: (storyId: string) => void;
  onEditStory?: (storyId: string) => void;
  onDeleteStory?: (storyId: string) => void;
  onFactoryReset?: () => void;
  isGenerating?: boolean;
}

function formatDate(value?: number) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export default function Landing({
  storyMetas = [],
  worlds = [],
  onNewStory,
  onImportStory,
  onSelectStory,
  onEditStory,
  onDeleteStory,
  onFactoryReset,
  isGenerating = false,
}: LandingProps) {
  return (
    <div className="landing-with-sidepanel">
      <aside className="landing-side-panel">
        <div className="landing-library-header">
          <strong>Your Stories</strong>
          <span>{storyMetas.length} saved</span>
        </div>

        <div className="story-list">
          {storyMetas.length === 0 ? (
            <div className="empty-library-note">
              <p>No stories yet.</p>
              <p>Create your first story to get started.</p>
            </div>
          ) : (
            storyMetas.map((meta) => {
              const world = worlds.find((w) => w.id === meta.worldId);
              const created = formatDate(meta.createdAt);
              const lastPlayed = formatDate(meta.lastPlayedAt);
              const castCount = meta.characterCount ?? meta.characterIds?.length ?? 0;
              return (
                <article key={meta.id} className="story-library-card">
                  <button
                    className="story-library-open-button"
                    onClick={() => (onEditStory ? onEditStory(meta.id) : onSelectStory(meta.id))}
                    disabled={isGenerating}
                    type="button"
                    aria-label={`Edit ${meta.title}`}
                  >
                    <span className="story-library-title">{meta.title}</span>
                    <span className="story-library-meta">
                      {world?.name || "Unknown World"} • {castCount} character{castCount === 1 ? "" : "s"}
                    </span>
                    <span className="story-library-dates">
                      {created && <span>Created {created}</span>}
                      {lastPlayed && <span>Last played {lastPlayed}</span>}
                    </span>
                  </button>

                  <div className="story-library-actions" aria-label={`Actions for ${meta.title}`}>
                    <button
                      type="button"
                      className="story-library-action play"
                      onClick={() => onSelectStory(meta.id)}
                      disabled={isGenerating}
                    >
                      Play
                    </button>
                    {onEditStory && (
                      <button
                        type="button"
                        className="story-library-action edit"
                        onClick={() => onEditStory(meta.id)}
                        disabled={isGenerating}
                      >
                        Edit
                      </button>
                    )}
                    {onDeleteStory && (
                      <button
                        type="button"
                        className="story-library-action delete"
                        onClick={() => onDeleteStory(meta.id)}
                        disabled={isGenerating}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="landing-library-actions">
          <button onClick={onNewStory} disabled={isGenerating} type="button" className="primary-library-button">
            + New Story
          </button>
          <button onClick={onImportStory} disabled={isGenerating} type="button" className="secondary-library-button">
            Import Story
          </button>
        </div>
      </aside>

      <section className="landing-welcome-panel">
        <div className="mira-landing">
          <h1 className="mira-title">M.I.R.A.</h1>
          <p className="mira-subtitle">Multi-Intelligence Roleplay Assistant</p>
          <p className="mira-landing-copy">Select a story from the library, edit its metadata, or create a new one.</p>
        </div>
      </section>

      {onFactoryReset && (
        <button
          onClick={onFactoryReset}
          disabled={isGenerating}
          type="button"
          className="factory-reset-corner-button"
        >
          Factory Reset
        </button>
      )}
    </div>
  );
}
