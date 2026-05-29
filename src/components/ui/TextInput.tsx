// Shared UI primitive — a labeled text input.
// Used by: CharacterSheet, WorldSheet, and EditorPanel panels.

export default function TextInput({ label, value = "", onChange, isOverridden = false }) {
  return (
    <label>
      {isOverridden && <span className="overridden-dot" title="Overridden in active story"></span>}
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
