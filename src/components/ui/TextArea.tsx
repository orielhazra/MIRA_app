// Shared UI primitive — a labeled textarea.
// Used by: CharacterSheet, WorldSheet, and EditorPanel panels.

export default function TextArea({ label, value = "", onChange, isOverridden = false }) {
  return (
    <label>
      {isOverridden && <span className="overridden-dot" title="Overridden in active story"></span>}
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
