// Landing screen — M.I.R.A. home page with story list in a side panel.

interface StoryMeta {
  id: string;
  title: string;
  worldId: string;
  characterIds: string[];
  createdAt?: number;
}

interface LandingProps {
  storyMetas: StoryMeta[];
  worlds: any[];
  onNewStory: () => void;
  onImportStory: () => void;
  onSelectStory: (storyId: string) => void;
  onFactoryReset?: () => void;
  isGenerating?: boolean;
}

export default function Landing({
  storyMetas = [],
  worlds = [],
  onNewStory,
  onImportStory,
  onSelectStory,
  onFactoryReset,
  isGenerating = false,
}: LandingProps) {
  return (
    <div 
      className="landing-with-sidepanel" 
      style={{ 
        display: 'flex', 
        height: '100%', 
        position: 'relative' 
      }}
    >
      {/* Side Panel - Story List */}
      <aside 
        className="landing-side-panel" 
        style={{
          width: '320px',
          backgroundColor: '#1f1f23',
          borderRight: '1px solid #3a3a3e',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          color: '#e0e0e5'
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ fontSize: '18px', color: '#f0f0f5' }}>Your Stories</strong>
        </div>

        <div className="story-list" style={{ flex: 1, overflowY: 'auto' }}>
          {storyMetas.length === 0 ? (
            <div style={{ color: '#888', padding: '12px 0' }}>
              <p>No stories yet.</p>
              <p>Create your first story to get started.</p>
            </div>
          ) : (
            storyMetas.map((meta) => {
              const world = worlds.find((w) => w.id === meta.worldId);
              return (
                <button
                  key={meta.id}
                  className="story-item"
                  onClick={() => onSelectStory(meta.id)}
                  disabled={isGenerating}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    backgroundColor: '#2a2a2f',
                    border: '1px solid #3a3a3e',
                    borderRadius: '8px',
                    color: '#e0e0e5',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isGenerating) e.currentTarget.style.backgroundColor = '#34343a';
                  }}
                  onMouseLeave={(e) => {
                    if (!isGenerating) e.currentTarget.style.backgroundColor = '#2a2a2f';
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                    {meta.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888' }}>
                    {world?.name || 'Unknown World'} • {meta.characterIds?.length || 0} characters
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={onNewStory} 
            disabled={isGenerating}
            style={{
              padding: '12px',
              backgroundColor: '#3a7ca5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            + New Story
          </button>
          <button 
            onClick={onImportStory} 
            disabled={isGenerating}
            style={{
              padding: '12px',
              backgroundColor: '#3a3a3e',
              color: '#ddd',
              border: '1px solid #555',
              borderRadius: '6px',
              cursor: isGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            Import Story
          </button>
        </div>
      </aside>

      {/* Main Welcome Area */}
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121214' }}>
        <div className="mira-landing" style={{ textAlign: 'center' }}>
          <h1 className="mira-title" style={{ fontSize: '48px', color: '#f0f0f5', marginBottom: '8px' }}>M.I.R.A.</h1>
          <p className="mira-subtitle" style={{ fontSize: '20px', color: '#aaa', marginBottom: '24px' }}>
            Multi-Intelligence Roleplay Assistant
          </p>
          <p style={{ color: '#777', maxWidth: '420px', margin: '0 auto' }}>
            Select a story from the panel on the left, or create a new one.
          </p>
        </div>
      </section>

      {/* Factory Reset - Lower Right Corner */}
      {onFactoryReset && (
        <button
          onClick={onFactoryReset}
          disabled={isGenerating}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '10px 16px',
            backgroundColor: '#3a2a2a',
            color: '#ff9999',
            border: '1px solid #553333',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            zIndex: 10
          }}
        >
          Factory Reset
        </button>
      )}
    </div>
  );
}