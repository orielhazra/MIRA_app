// Shared UI primitive — a labeled text input.
// Used by: CharacterSheet, WorldSheet, and EditorPanel panels.

export default function TextInput({ label, value = "", onChange }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
