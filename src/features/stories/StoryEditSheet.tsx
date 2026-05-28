// Story edit sheet — edits a full story record loaded from the metadata library.

import { useEffect, useState } from "react";
import LoreEditor from "../../components/LoreEditor";
import { uniqueCompact } from "../../utils/appHelpers";

export default function StoryEditSheet({
  worlds = [],
  characters = [],
  initialDraft,
  onSave,
  onCancel,
  onOpenStory,
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState("");

  useEffect(() => setDraft(initialDraft), [initialDraft]);

  if (!draft) {
    return (
      <section id="messages" className="messages sheet-view">
        <div className="sheet">
          <h2>Edit Story</h2>
          <p className="sheet-subtitle">No story is loaded for editing.</p>
          <div className="sheet-actions"><button onClick={onCancel}>Back To Library</button></div>
        </div>
      </section>
    );
  }

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

  function save() {
    const result = onSave(draft);
    if (result?.error) {
      setStatus(result.error);
      return;
    }
    setStatus("Story saved.");
    setTimeout(() => setStatus(""), 1500);
  }

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>Edit Story</h2>
        <p className="sheet-subtitle">
          Edit the full story record loaded from the library. The library keeps only its lightweight metadata until the story is opened or edited.
        </p>

        <div className="sheet-actions">
          <button onClick={save}>Save Story</button>
          <button onClick={() => onOpenStory?.(draft.id)}>Open Story</button>
          <button onClick={onCancel}>Back To Library</button>
        </div>
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <label>
            Story Title
            <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            Story World
            <select value={draft.worldId || ""} onChange={(event) => update("worldId", event.target.value)}>
              {worlds.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
            </select>
          </label>

          <div className="cast-picker">
            <span className="cast-picker-label">Story Cast</span>
            <p className="muted">Characters are reusable templates. Checking a character links that character to this story only.</p>
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
                      <small>{character.shortDescription || "Reusable cast member"}</small>
                    </span>
                  </label>
                );
              })}
              {!characters.length && <p className="muted">No character templates are available yet.</p>}
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
