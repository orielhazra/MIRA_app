// Shared UI primitive — a labeled textarea.
// Used by: CharacterSheet, WorldSheet, and EditorPanel panels.

export default function TextArea({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
