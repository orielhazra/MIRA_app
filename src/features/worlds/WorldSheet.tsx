// World sheet — world editor with locations and lorebook.

import { useEffect, useState } from "react";
import LoreEditor from "../../components/LoreEditor";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import { parseKeywords } from "../../utils/helpers";

export default function WorldSheet({ world, activeStory, onSave, onUse, onDelete, onExport, onImport }) {
  const [draft, setDraft] = useState(world);
  const [status, setStatus] = useState("");
  const canAssign = activeStory?.id && world?.id !== activeStory.worldId;

  useEffect(() => setDraft(world), [world]);
  if (!world) return null;

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateLocation(index, field, value) {
    setDraft((current) => ({
      ...current,
      locations: (current.locations || []).map((location, locationIndex) => (
        locationIndex === index ? { ...location, [field]: value } : location
      ))
    }));
  }

  function addLocation() {
    setDraft((current) => ({
      ...current,
      locations: [
        ...(current.locations || []),
        {
          id: `location_${Date.now()}`,
          name: "New Location",
          summary: "",
          description: "",
          mood: "",
          visibleExits: "",
          hazards: "",
          connectedTo: "",
          keywords: []
        }
      ]
    }));
  }

  function removeLocation(index) {
    setDraft((current) => ({
      ...current,
      locations: (current.locations || []).filter((_, locationIndex) => locationIndex !== index)
    }));
  }

  function save() {
    onSave(draft);
    setStatus("World saved.");
    setTimeout(() => setStatus(""), 1500);
  }

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>{world.name}</h2>
        <p className="sheet-subtitle">{world.shortDescription}</p>

        <div className="sheet-actions">
          <button onClick={save}>Save World</button>
          {canAssign && <button onClick={() => onUse(world.id)}>Use In Active Story</button>}
          <button onClick={() => onExport(world)}>Export World</button>
          <button onClick={onImport}>Import World</button>
          <button className="danger" onClick={() => onDelete(world.id)}>Delete World</button>
        </div>
        <p className="sheet-status">{status}</p>

        <div className="sheet-form">
          <TextInput label="World Name" value={draft.name} onChange={(value) => update("name", value)} />
          <TextInput label="Short Description" value={draft.shortDescription} onChange={(value) => update("shortDescription", value)} />
          <TextArea label="Smart Prompt Overview" value={draft.overview || ""} onChange={(value) => update("overview", value)} />
          <TextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", parseKeywords(value))} />
          <TextArea label="World Description" value={draft.description} onChange={(value) => update("description", value)} />
          <TextArea label="World Rules" value={draft.rules} onChange={(value) => update("rules", value)} />

          <div className="sheet-section">
            <h3>Available Locations</h3>
            <p className="muted">Smart Prompting uses the current location in detail and sends this list as compact available/nearby options.</p>
            <div className="sheet-actions compact-actions">
              <button type="button" onClick={addLocation}>Add Location</button>
            </div>
            <div className="context-card-list">
              {(draft.locations || []).map((location, index) => (
                <details key={location.id || index} className="context-card">
                  <summary>
                    <strong>{location.name || "Unnamed Location"}</strong>
                    <span>{location.summary || "location"}</span>
                  </summary>
                  <TextInput label="Location Name" value={location.name || ""} onChange={(value) => updateLocation(index, "name", value)} />
                  <TextInput label="Summary" value={location.summary || ""} onChange={(value) => updateLocation(index, "summary", value)} />
                  <TextArea label="Description" value={location.description || ""} onChange={(value) => updateLocation(index, "description", value)} />
                  <TextInput label="Mood / Atmosphere" value={location.mood || ""} onChange={(value) => updateLocation(index, "mood", value)} />
                  <TextInput label="Visible Exits" value={location.visibleExits || ""} onChange={(value) => updateLocation(index, "visibleExits", value)} />
                  <TextInput label="Connected To" value={location.connectedTo || ""} onChange={(value) => updateLocation(index, "connectedTo", value)} />
                  <TextInput label="Keywords" value={(location.keywords || []).join(", ")} onChange={(value) => updateLocation(index, "keywords", parseKeywords(value))} />
                  <TextArea label="Hazards" value={location.hazards || ""} onChange={(value) => updateLocation(index, "hazards", value)} />
                  <button type="button" className="danger small" onClick={() => removeLocation(index)}>Remove Location</button>
                </details>
              ))}
              {!(draft.locations || []).length && <p className="muted">No locations saved yet.</p>}
            </div>
          </div>

          <label>World Lorebook</label>
          <LoreEditor lorebook={draft.worldLorebook || []} onChange={(lore) => update("worldLorebook", lore)} />
        </div>
      </div>
    </section>
  );
}
