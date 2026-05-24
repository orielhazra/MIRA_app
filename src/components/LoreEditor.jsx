import { createBlankLoreEntry } from "../services/normalizers.js";
import { parseKeywords } from "../utils/helpers.js";

export default function LoreEditor({ lorebook = [], onChange }) {
  const entries = Array.isArray(lorebook) ? lorebook : [];

  function updateEntry(index, patch) {
    onChange(entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
  }

  function addEntry() {
    onChange([...entries, createBlankLoreEntry()]);
  }

  function removeEntry(index) {
    onChange(entries.filter((_, entryIndex) => entryIndex !== index));
  }

  return (
    <div className="lore-editor">
      <div className="lore-editor-toolbar">
        <button type="button" onClick={addEntry}>Add Lore Entry</button>
      </div>

      <div className="lore-editor-list">
        {entries.length === 0 && <p className="lore-editor-empty">No lore entries yet.</p>}
        {entries.map((entry, index) => (
          <details className="lore-editor-entry" key={`${entry.id || "entry"}-${index}`} open={index === entries.length - 1}>
            <summary>
              <strong>{entry.name || `Lore ${index + 1}`}</strong>
              <span className="lore-editor-entry-actions">
                <button type="button" className="danger small" onClick={(event) => { event.preventDefault(); removeEntry(index); }}>
                  Remove
                </button>
              </span>
            </summary>

            <div className="lore-editor-grid">
              <label>
                Name
                <input value={entry.name || ""} onChange={(event) => updateEntry(index, { name: event.target.value })} />
              </label>

              <label>
                Keywords
                <input
                  value={(entry.keywords || []).join(", ")}
                  placeholder="station, train, vanished city"
                  onChange={(event) => updateEntry(index, { keywords: parseKeywords(event.target.value) })}
                />
              </label>

              <label>
                Priority
                <input
                  type="number"
                  value={entry.priority || 0}
                  onChange={(event) => updateEntry(index, { priority: Number(event.target.value || 0) })}
                />
              </label>

              <label className="lore-checkbox">
                <input
                  type="checkbox"
                  checked={entry.enabled !== false}
                  onChange={(event) => updateEntry(index, {
                    enabled: event.target.checked,
                    alwaysOn: event.target.checked ? entry.alwaysOn === true : false
                  })}
                />
                Enabled
              </label>

              <label className={`lore-checkbox ${entry.enabled === false ? "disabled" : ""}`}>
                <input
                  type="checkbox"
                  disabled={entry.enabled === false}
                  checked={entry.enabled !== false && entry.alwaysOn === true}
                  onChange={(event) => updateEntry(index, { alwaysOn: event.target.checked })}
                />
                Always on
              </label>

              <label className="lore-content-field">
                Content
                <textarea
                  placeholder="Lore content used by the model."
                  value={entry.content || ""}
                  onChange={(event) => updateEntry(index, { content: event.target.value })}
                />
              </label>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export function LoreInfoList({ lorebook = [], emptyText = "No lore entries.", showSource = false, controls = false, onToggleEntry }) {
  const entries = Array.isArray(lorebook) ? lorebook : [];
  if (entries.length === 0) return <p className="muted">{emptyText}</p>;

  const enabledCount = entries.filter((entry) => entry.enabled !== false).length;
  const alwaysOnCount = entries.filter((entry) => entry.alwaysOn === true).length;

  return (
    <>
      <div className="lore-summary">
        <span>{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        <span>{enabledCount} enabled</span>
        <span>{alwaysOnCount} always on</span>
      </div>
      <div className="lore-card-list">
        {entries.map((entry, index) => (
          <details className="lore-card" key={`${entry.id || entry.name}-${index}`}>
            <summary>
              <strong>{entry.name || "Unnamed Lore"}</strong>
              <span className="lore-badges">
                {showSource && entry.source && <span className="lore-badge">{entry.source}</span>}
                {entry.enabled !== false
                  ? <span className="lore-badge good">Enabled</span>
                  : <span className="lore-badge muted-badge">Disabled</span>}
                {entry.alwaysOn === true && <span className="lore-badge warn">Always on</span>}
                {Number(entry.priority || 0) !== 0 && <span className="lore-badge">Priority {entry.priority}</span>}
              </span>
            </summary>

            <div className="lore-card-body">
              {controls && (
                <div className="lore-status-controls">
                  <label className="lore-status-toggle">
                    <input
                      type="checkbox"
                      checked={entry.enabled !== false}
                      onChange={(event) => onToggleEntry?.(index, {
                        enabled: event.target.checked,
                        alwaysOn: event.target.checked ? entry.alwaysOn === true : false
                      })}
                    />
                    Enabled
                  </label>
                  <label className="lore-status-toggle">
                    <input
                      type="checkbox"
                      disabled={entry.enabled === false}
                      checked={entry.enabled !== false && entry.alwaysOn === true}
                      onChange={(event) => onToggleEntry?.(index, { alwaysOn: event.target.checked })}
                    />
                    Always on
                  </label>
                </div>
              )}
              <div className="lore-keywords"><strong>Keywords:</strong> {(entry.keywords || []).join(", ") || "None"}</div>
              <p>{entry.content || "No content."}</p>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
