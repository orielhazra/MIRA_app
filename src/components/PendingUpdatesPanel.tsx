export default function PendingUpdatesPanel({
  updates,
  selectedIds,
  status,
  onToggle,
  onApplySelected,
  onRejectAll
}) {
  if ((!updates || updates.length === 0) && !status) {
    return null;
  }

  return (
    <section className="pending-updates-panel" aria-live="polite">
      <div className="pending-updates-header">
        <div>
          <h3>Suggested State Updates</h3>
          <p>{status || `${updates.length} suggestion${updates.length === 1 ? "" : "s"} ready for review.`}</p>
        </div>

        {updates?.length > 0 && (
          <div className="pending-updates-actions">
            <button type="button" onClick={onApplySelected} disabled={selectedIds.size === 0}>
              Apply selected
            </button>
            <button type="button" className="danger" onClick={onRejectAll}>
              Reject all
            </button>
          </div>
        )}
      </div>

      {updates?.length > 0 && (
        <div className="pending-updates-list">
          {updates.map((update) => {
            const checked = selectedIds.has(update.id);

            return (
              <label key={update.id} className={`pending-update-card ${checked ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(update.id)}
                />

                <div className="pending-update-content">
                  <div className="pending-update-title-row">
                    <span className="pending-update-category">{update.category}</span>
                    {typeof update.confidence === "number" && (
                      <span className="pending-update-confidence">
                        {Math.round(update.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>

                  <strong>{update.title}</strong>

                  {update.target && <p className="pending-update-target">Target: {update.target}</p>}
                  {update.details && <p>{update.details}</p>}

                  {(update.from || update.to) && (
                    <p className="pending-update-change">
                      {update.from ? `From: ${update.from}` : ""}
                      {update.from && update.to ? " → " : ""}
                      {update.to ? `To: ${update.to}` : ""}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
