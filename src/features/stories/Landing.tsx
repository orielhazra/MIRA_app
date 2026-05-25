// Landing screen — M.I.R.A. home page with Create / Import actions.

export default function Landing({ onNewStory, onImportStory }) {
  return (
    <section id="messages" className="messages landing-view">
      <div className="mira-landing">
        <h1 className="mira-title">M.I.R.A.</h1>
        <p className="mira-subtitle">Multi-Intelligence Roleplay Assistant</p>
        <div className="mira-actions">
          <button onClick={onNewStory}>Create New Story</button>
          <button onClick={onImportStory}>Import Story</button>
        </div>
      </div>
    </section>
  );
}
