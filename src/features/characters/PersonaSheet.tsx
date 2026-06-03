import React, { useEffect, useState } from "react";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";

export default function PersonaSheet({
  persona,
  onSave,
  onDelete,
  onBack,
}) {
  const [draft, setDraft] = useState(persona);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDraft(persona);
  }, [persona]);

  if (!persona || !draft) return null;

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    onSave(draft);
    setStatus("Persona saved to gallery.");
    setTimeout(() => setStatus(""), 1500);
  }

  return (
    <section className="messages sheet-view">
      <div className="sheet">
        <h2>{persona.name || "New Persona"}</h2>
        <p className="sheet-subtitle">
          Global Persona Template. Personas can be applied to your user profile in any story.
        </p>

        <div className="sheet-actions">
          <button onClick={handleSave}>Save Persona</button>
          <button onClick={onBack}>Back to Gallery</button>
          <button className="danger" onClick={() => onDelete(persona.id)}>Delete Persona</button>
        </div>
        
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <TextInput label="Persona Name" value={draft.name} onChange={(v) => update("name", v)} />
          <TextArea label="Description / Appearance" value={draft.description || draft.appearance} onChange={(v) => update("description", v)} />
          <TextArea label="Backstory" value={draft.backstory} onChange={(v) => update("backstory", v)} />
        </div>
      </div>
    </section>
  );
}
