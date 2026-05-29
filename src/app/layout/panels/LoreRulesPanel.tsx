import React from "react";
import LoreEditor, { LoreInfoList } from "../../../components/LoreEditor";

export default function LoreRulesPanel({
  activeStory,
  activeWorld,
  storyCharacters = [],
  activeLoreMemory,
  temporaryLoreDraft,
  temporaryLoreStatus,
  onTemporaryLoreChange,
  onSaveTemporaryLore,
  onClearTemporaryLore,
  onRefreshActiveLore,
  onUpdateStoryLore,
  onUpdateWorldLore,
  onUpdateCharacterLore
}) {
  return (
    <div className="info-panel active">
      <h3>World Rules</h3>
      <div className="info-text-block">{activeWorld.rules || ""}</div>

      <h3>Character Rules</h3>
      {storyCharacters.filter(Boolean).map((character) => (
        <details key={`${character.id}-rules`} className="context-card">
          <summary>
            <strong>{character.name}</strong>
            <span>rules</span>
          </summary>
          <div className="info-text-block">{character.characterRules || ""}</div>
        </details>
      ))}

      <h3>Story Lorebook</h3>
      <div className="info-lore-list">
        <LoreInfoList
          lorebook={activeStory.storyLorebook || []}
          emptyText="This story has no story-specific lore."
          controls
          onToggleEntry={(index, patch) => onUpdateStoryLore(index, patch)}
        />
      </div>

      <h3>World Lorebook</h3>
      <div className="info-lore-list">
        <LoreInfoList
          lorebook={activeWorld.worldLorebook || []}
          emptyText="This world has no lore entries."
          controls
          onToggleEntry={(index, patch) => onUpdateWorldLore(index, patch)}
        />
      </div>

      <h3>Character Lorebooks</h3>
      {storyCharacters.filter(Boolean).map((character) => (
        <details key={`${character.id}-lorebook`} className="context-card">
          <summary>
            <strong>{character.name}</strong>
            <span>{(character.lorebook || []).length} entries</span>
          </summary>
          <div className="info-lore-list">
            <LoreInfoList
              lorebook={character.lorebook || []}
              emptyText="This character has no lore entries."
              controls
              onToggleEntry={(index, patch) => onUpdateCharacterLore(character.id, index, patch)}
            />
          </div>
        </details>
      ))}

      <h3>Temporary Lorebook</h3>
      <div id="infoTemporaryLorebook">
        <LoreEditor lorebook={temporaryLoreDraft} onChange={onTemporaryLoreChange} />
      </div>

      <div className="sheet-actions temporary-lore-actions">
        <button type="button" onClick={onSaveTemporaryLore}>Save Temporary Lore</button>
        <button type="button" className="danger" onClick={onClearTemporaryLore}>Clear Temporary Lore</button>
      </div>
      <p className="sheet-status">{temporaryLoreStatus}</p>

      <h3>Active Lore</h3>
      <div className="info-lore-list">
        <LoreInfoList
          lorebook={activeLoreMemory || []}
          emptyText="No active lore has been triggered yet."
          showSource
          onToggleEntry={() => {}}
        />
      </div>
      <button type="button" onClick={onRefreshActiveLore}>Refresh Active Lore</button>
    </div>
  );
}
