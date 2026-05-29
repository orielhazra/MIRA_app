// World sheet — world editor with locations and lorebook.

import { useEffect, useMemo, useState } from "react";
import LoreEditor from "../../components/LoreEditor";
import TextInput from "../../components/ui/TextInput";
import TextArea from "../../components/ui/TextArea";
import { parseKeywords } from "../../utils/helpers";

export default function WorldSheet({ world, worlds = [], storyMetas = [], activeStory, onSave, onUse, onDelete, onExport, onImport, onBackHome, onBackToStory }) {
  const [draft, setDraft] = useState(world);
  const [status, setStatus] = useState("");
  const canAssign = activeStory?.id && world?.id !== activeStory.templateWorldId;
  const templateKey = String(world?.templateKey || world?.id || "");
  const familyVersionIds = useMemo(
    () => new Set((worlds || []).filter((item) => String(item.templateKey || item.id) === templateKey).map((item) => item.id)),
    [worlds, templateKey]
  );
  const storyUsage = useMemo(
    () => storyMetas.filter((meta) => familyVersionIds.has(meta.templateWorldId)),
    [storyMetas, familyVersionIds]
  );
  const canDelete = storyUsage.length === 0;
  const isActiveStoryTemplate = !!(activeStory?.id && familyVersionIds.has(activeStory.templateWorldId));
  const isExactPinnedVersion = activeStory?.templateWorldId === world?.id;
  
  const backLabel = isActiveStoryTemplate ? "Back To Story" : "Back To Home";

  useEffect(() => setDraft(world), [world]);
  if (!world || !draft) return null;

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


  function goBack() {
    if (isActiveStoryTemplate) {
      onBackToStory?.();
      return;
    }
    onBackHome?.();
  }

  function save() {
    const savedWorld = onSave(draft);
    setStatus(savedWorld?.templateVersion ? `Saved as template version ${savedWorld.templateVersion}.` : "World saved.");
    setTimeout(() => setStatus(""), 1500);
  }

  function deleteWorld() {
    if (!canDelete) {
      setStatus(`Cannot delete: used by ${storyUsage.length} stor${storyUsage.length === 1 ? "y" : "ies"}.`);
      return;
    }
    onDelete(world.id);
  }

  const patch = (isExactPinnedVersion && activeStory?.worldOverlay?.worldPatch) || {};

  return (
    <section id="messages" className="messages sheet-view">
      <div className="sheet">
        <h2>{world.name}</h2>
        <p className="muted">Global Template Family: {world.templateKey || world.id} • Version {world.templateVersion || 1}</p>
        <p className="sheet-subtitle">
          {isActiveStoryTemplate 
            ? (isExactPinnedVersion 
                ? "This is the exact world template version currently used in your active story."
                : "A different version of this world template family is used in your active story.")
            : "This is a reusable global template. Editing it creates a new version for use in future or existing stories."
          }
        </p>

        <div className="sheet-actions">
          <button onClick={save}>Save As New Template Version</button>
          <button onClick={goBack}>{backLabel}</button>
          {canAssign && <button onClick={() => onUse(world.id)}>Use In Active Story</button>}
          <button onClick={() => onExport(world)}>Export World</button>
          <button onClick={onImport}>Import World</button>
          <button className="danger" disabled={!canDelete} onClick={deleteWorld}>Delete World</button>
        </div>
        
        {isExactPinnedVersion && (
          <p className="info-box">
            <span className="overridden-dot"></span>
            This world has story-specific customizations in your active story. Use the <strong>Story & Cast</strong> panel to edit the effective story version.
          </p>
        )}
        
        <p className="sheet-status">{status}</p>
        {storyUsage.length > 0 && (
          <p className="muted">
            Template family used by {storyUsage.length} stor{storyUsage.length === 1 ? "y" : "ies"}: {storyUsage.map((story) => story.title).join(", ")}
          </p>
        )}

        <div className="sheet-form">
          <TextInput label="World Name" value={draft.name} onChange={(value) => update("name", value)} isOverridden={patch.name !== undefined} />
          <TextInput label="Short Description" value={draft.shortDescription} onChange={(value) => update("shortDescription", value)} isOverridden={patch.shortDescription !== undefined} />
          <TextArea label="Smart Prompt Overview" value={draft.overview || ""} onChange={(value) => update("overview", value)} isOverridden={patch.overview !== undefined} />
          <TextInput label="Prompt Keywords" value={(draft.promptKeywords || []).join(", ")} onChange={(value) => update("promptKeywords", parseKeywords(value))} isOverridden={patch.promptKeywords !== undefined} />
          <TextArea label="World Description" value={draft.description} onChange={(value) => update("description", value)} isOverridden={patch.description !== undefined} />
          <TextArea label="World Rules" value={draft.rules} onChange={(value) => update("rules", value)} isOverridden={patch.rules !== undefined} />

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
