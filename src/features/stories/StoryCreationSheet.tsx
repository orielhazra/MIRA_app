// Story creation sheet — world/cast/scenario/greeting/lorebook form.

import { useEffect, useMemo, useState } from "react";
import LoreEditor from "../../components/LoreEditor";
import { uniqueCompact } from "../../utils/appHelpers";
import { getLatestTemplateWorlds } from "../../services/storyWorld";

export default function StoryCreationSheet({ worlds = [], characters = [], initialDraft, onStart, onCancel, onImportStory }) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState("");
  const latestWorlds = useMemo(() => getLatestTemplateWorlds(worlds), [worlds]);

  useEffect(() => setDraft(initialDraft), [initialDraft]);

  if (!draft) {
    return (
      <section id="messages" className="messages sheet-view">
        <div className="sheet">
          <h2>Create New Story</h2>
          <p className="sheet-subtitle">No story draft is currently available.</p>
          <div className="sheet-actions"><button onClick={onCancel}>Back</button></div>
        </div>
      </section>
    );
  }

  function update(field, value) {
    setDraft((current) => {
      if (field === "templateWorldId") {
        const selectedWorld = latestWorlds.find((world: any) => world.id === value) || worlds.find((world: any) => world.id === value);
        return {
          ...current,
          templateWorldId: value,
          templateWorldKey: selectedWorld?.templateKey || value || "",
          templateWorldVersion: Number(selectedWorld?.templateVersion || 1),
        };
      }
      return { ...current, [field]: value };
    });
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
        <p className="sheet-subtitle">This creates one full story record that links a selected world with selected cast members.</p>

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
            Story World
            <select value={draft.templateWorldId || ""} onChange={(event) => update("templateWorldId", event.target.value)}>
              {latestWorlds.map((world: any) => <option key={world.id} value={world.id}>{world.name} (v{world.templateVersion || 1})</option>)}
            </select>
          </label>

          <div className="cast-picker">
            <span className="cast-picker-label">Story Cast</span>
            <p className="muted">Characters are reusable templates. Selecting them here links them to this story; they are not tied directly to a world.</p>
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
