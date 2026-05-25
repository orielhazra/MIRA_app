// Story creation sheet — world/cast/scenario/greeting/lorebook form.

import { useEffect, useState } from "react";
import LoreEditor from "../../components/LoreEditor.jsx";
import { uniqueCompact } from "../../utils/appHelpers.js";

export default function StoryCreationSheet({ worlds, characters, initialDraft, onStart, onCancel, onImportStory }) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState("");

  useEffect(() => setDraft(initialDraft), [initialDraft]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleStoryCharacter(characterId) {
    setDraft((current) => {
      const currentIds = Array.isArray(current.characterIds) ? current.characterIds : [];
      const nextIds = currentIds.includes(characterId)
        ? currentIds.filter((id) => id !== characterId)
        : [...currentIds, characterId];
      return { ...current, characterIds: uniqueCompact(nextIds) };
    });
  }

  function start() {
    const result = onStart(draft);
    if (result?.error) setStatus(result.error);
  }

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>Create New Story</h2>
        <p className="sheet-subtitle">This will create a new chat using the selected world and story cast.</p>

        <div className="sheet-actions">
          <button onClick={start}>Start Story</button>
          <button onClick={onImportStory}>Import Story</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <label>
            Story Title
            <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            World
            <select value={draft.worldId || ""} onChange={(event) => update("worldId", event.target.value)}>
              {worlds.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
            </select>
          </label>

          <div className="cast-picker">
            <span className="cast-picker-label">Story Cast</span>
            <p className="muted">The AI may speak and act for selected cast members. Presence and live state are controlled in Cast State after the story starts.</p>
            <div className="cast-picker-list">
              {characters.map((character) => {
                const selected = (draft.characterIds || []).includes(character.id);
                return (
                  <label key={character.id} className="cast-checkbox">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleStoryCharacter(character.id)}
                    />
                    <span>
                      <strong>{character.name}</strong>
                      <small>{character.shortDescription || "Story cast member"}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <label>
            Scenario
            <textarea value={draft.scenario || ""} onChange={(event) => update("scenario", event.target.value)} />
          </label>

          <label>
            Opening Greeting
            <textarea value={draft.greeting || ""} onChange={(event) => update("greeting", event.target.value)} />
          </label>

          <label>Story Lorebook</label>
          <LoreEditor lorebook={draft.storyLorebook || []} onChange={(lore) => update("storyLorebook", lore)} />
        </div>
      </div>
    </section>
  );
}
