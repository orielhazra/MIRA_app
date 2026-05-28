// Story edit sheet — edits a full story record loaded from the metadata library.

import { useEffect, useState } from "react";
import LoreEditor from "../../components/LoreEditor";
import { uniqueCompact } from "../../utils/appHelpers";

interface StoryEditSheetProps {
  worlds?: any[];
  characters?: any[];
  initialDraft: any;
  onSave: (draft: any) => { ok?: boolean; error?: string } | void;
  onCancel: () => void;
  onOpenStory?: (storyId: string) => void;
  activeStory?: any | null;
  onBackToStory?: () => void;
}

export default function StoryEditSheet({
  worlds = [],
  characters = [],
  initialDraft,
  onSave,
  onCancel,
  onOpenStory,
  activeStory,
  onBackToStory,
}: StoryEditSheetProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState("");

  const isEditingActiveStory = !!(activeStory && draft && activeStory.id === draft.id);

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

  function update(field: string, value: any) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleStoryCharacter(characterId: string) {
    setDraft((current) => {
      const currentIds = Array.isArray(current.characterIds) ? current.characterIds : [];
      const nextIds = currentIds.includes(characterId)
        ? currentIds.filter((id: string) => id !== characterId)
        : [...currentIds, characterId];
      return { ...current, characterIds: uniqueCompact(nextIds) };
    });
  }

  function save() {
    const result = onSave(draft);
    if (result && "error" in result) {
      setStatus(result.error!);
      return;
    }
    setStatus("Story saved.");
    setTimeout(() => setStatus(""), 1500);
  }

  function handleBack() {
    if (isEditingActiveStory && onBackToStory) {
      onBackToStory();
    } else {
      onCancel();
    }
  }

  const backLabel = isEditingActiveStory ? "Back To Story" : "Back To Library";

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>Edit Story</h2>
        <p className="sheet-subtitle">
          {isEditingActiveStory
            ? "Editing the active story. Cast is locked — edit character membership from the sidebar instead."
            : "Edit the full story record loaded from the library. The library keeps only its lightweight metadata until the story is opened or edited."}
        </p>

        <div className="sheet-actions">
          <button onClick={save}>Save Story</button>
          {onOpenStory && !isEditingActiveStory && (
            <button onClick={() => onOpenStory(draft.id)}>Open Story</button>
          )}
          <button onClick={handleBack}>{backLabel}</button>
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
              {worlds.map((world: any) => <option key={world.id} value={world.id}>{world.name}</option>)}
            </select>
          </label>

          {!isEditingActiveStory && (
            <div className="cast-picker">
              <span className="cast-picker-label">Story Cast</span>
              <p className="muted">Characters are reusable templates. Checking a character links that character to this story only.</p>
              <div className="cast-picker-list">
                {characters.map((character: any) => {
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
          )}

          <label>
            Scenario
            <textarea value={draft.scenario || ""} onChange={(event) => update("scenario", event.target.value)} />
          </label>

          <label>
            Opening Greeting
            <textarea value={draft.greeting || ""} onChange={(event) => update("greeting", event.target.value)} />
          </label>

          <label>Story Lorebook</label>
          <LoreEditor lorebook={draft.storyLorebook || []} onChange={(lore: any) => update("storyLorebook", lore)} />
        </div>
      </div>
    </section>
  );
}
