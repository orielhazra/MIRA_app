import React, { useState, useEffect } from "react";

export default function StoryJournalPanel({ journal, characters = [], status, onSave }) {
  const [draft, setDraft] = useState(() => buildStoryJournalDraft(journal));
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const resetKey = JSON.stringify(journal || {});

  useEffect(() => {
    setDraft(buildStoryJournalDraft(journal));
    setDirty(false);
  }, [resetKey]);

  function update(field, value) {
    setDirty(true);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addGeneralEntry() {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      generalJournal: [
        ...current.generalJournal,
        { id: `general-${Date.now()}`, content: "", active: true, createdAt: Date.now() }
      ]
    }));
  }

  function updateGeneralEntry(index, field, value) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      generalJournal: current.generalJournal.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  }

  function removeGeneralEntry(index) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      generalJournal: current.generalJournal.filter((_, i) => i !== index)
    }));
  }

  function addCharacterEntry(characterId) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      characterJournals: {
        ...current.characterJournals,
        [characterId]: [
          ...(current.characterJournals[characterId] || []),
          { id: `${characterId}-${Date.now()}`, content: "", active: true, createdAt: Date.now() }
        ]
      }
    }));
  }

  function updateCharacterEntry(characterId, index, field, value) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      characterJournals: {
        ...current.characterJournals,
        [characterId]: current.characterJournals[characterId].map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        )
      }
    }));
  }

  function removeCharacterEntry(characterId, index) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      characterJournals: {
        ...current.characterJournals,
        [characterId]: current.characterJournals[characterId].filter((_, i) => i !== index)
      }
    }));
  }

  function addTask() {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        { id: `task-${Date.now()}`, content: "", active: true, completed: false, createdAt: Date.now() }
      ]
    }));
  }

  function updateTask(index, field, value) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tasks: current.tasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      )
    }));
  }

  function removeTask(index) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tasks: current.tasks.filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="info-panel active current-context-panel story-journal-panel">
      <h3>Story Journal</h3>
      <p className="muted">Long-term story continuity with character-wise journals, general entries, summary, and tasks. Toggle individual entries to control what appears in the prompt.</p>

      <div className="sheet-actions compact-actions">
        <button type="button" onClick={() => { onSave(draft); setDirty(false); }}>Save Story Journal</button>
      </div>
      <p className="sheet-status">{dirty ? "Unsaved journal changes" : status || "Story journal saved"}</p>

      <div className="journal-tabs">
        <button
          className={activeTab === "summary" ? "active" : ""}
          onClick={() => setActiveTab("summary")}
        >
          Summary
        </button>
        <button
          className={activeTab === "general" ? "active" : ""}
          onClick={() => setActiveTab("general")}
        >
          General Journal
        </button>
        <button
          className={activeTab === "characters" ? "active" : ""}
          onClick={() => setActiveTab("characters")}
        >
          Character Journals
        </button>
        <button
          className={activeTab === "tasks" ? "active" : ""}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks
        </button>
      </div>

      {activeTab === "summary" && (
        <div className="journal-tab-content">
          <label className="journal-section">
            <span className="journal-section-header">
              <strong>Story Summary</strong>
              <small>Overall story overview and key events</small>
            </span>
            <textarea
              value={draft.summary}
              onChange={(e) => update("summary", e.target.value)}
              placeholder="Write a summary of the story so far..."
            />
          </label>
        </div>
      )}

      {activeTab === "general" && (
        <div className="journal-tab-content">
          <div className="journal-entries">
            {draft.generalJournal.map((entry, index) => (
              <JournalEntry
                key={entry.id}
                entry={entry}
                onUpdate={(field, value) => updateGeneralEntry(index, field, value)}
                onRemove={() => removeGeneralEntry(index)}
              />
            ))}
          </div>
          <button type="button" className="add-entry-btn" onClick={addGeneralEntry}>
            + Add General Entry
          </button>
        </div>
      )}

      {activeTab === "characters" && (
        <div className="journal-tab-content">
          {characters.length === 0 ? (
            <p className="muted">No characters in this story.</p>
          ) : (
            characters.map((character) => (
              <div key={character.id} className="character-journal-section">
                <h4>{character.name}</h4>
                <div className="journal-entries">
                  {(draft.characterJournals[character.id] || []).map((entry, index) => (
                    <JournalEntry
                      key={entry.id}
                      entry={entry}
                      onUpdate={(field, value) => updateCharacterEntry(character.id, index, field, value)}
                      onRemove={() => removeCharacterEntry(character.id, index)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="add-entry-btn"
                  onClick={() => addCharacterEntry(character.id)}
                >
                  + Add Entry for {character.name}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="journal-tab-content">
          <div className="journal-entries">
            {draft.tasks.map((task, index) => (
              <TaskEntry
                key={task.id}
                task={task}
                onUpdate={(field, value) => updateTask(index, field, value)}
                onRemove={() => removeTask(index)}
              />
            ))}
          </div>
          <button type="button" className="add-entry-btn" onClick={addTask}>
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
}

function JournalEntry({ entry, onUpdate, onRemove }) {
  return (
    <div className="journal-entry">
      <div className="journal-entry-header">
        <label className="journal-toggle">
          <input
            type="checkbox"
            checked={entry.active}
            onChange={(e) => onUpdate("active", e.target.checked)}
          />
          <span>Include in prompt</span>
        </label>
        <button type="button" className="remove-entry-btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <textarea
        value={entry.content}
        onChange={(e) => onUpdate("content", e.target.value)}
        placeholder="Write a journal entry..."
      />
    </div>
  );
}

function TaskEntry({ task, onUpdate, onRemove }) {
  return (
    <div className="journal-entry task-entry">
      <div className="journal-entry-header">
        <label className="journal-toggle">
          <input
            type="checkbox"
            checked={task.active}
            onChange={(e) => onUpdate("active", e.target.checked)}
          />
          <span>Include in prompt</span>
        </label>
        <label className="task-completed-toggle">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(e) => onUpdate("completed", e.target.checked)}
          />
          <span>Completed</span>
        </label>
        <button type="button" className="remove-entry-btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <textarea
        value={task.content}
        onChange={(e) => onUpdate("content", e.target.value)}
        placeholder="Write a task..."
      />
    </div>
  );
}

function buildStoryJournalDraft(journal) {
  const source = journal && typeof journal === "object" ? journal : {};
  return {
    summary: source.summary || "",
    generalJournal: Array.isArray(source.generalJournal) ? [...source.generalJournal] : [],
    characterJournals: source.characterJournals ? { ...source.characterJournals } : {},
    tasks: Array.isArray(source.tasks) ? [...source.tasks] : []
  };
}
