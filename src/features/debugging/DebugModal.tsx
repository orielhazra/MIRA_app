import { useMemo, useState } from "react";
import { messagesToPromptText } from "../../services/koboldApi";
import { buildSystemPrompt } from "../../services/prompt";
import { inspectLoreInjection, formatLoreForPrompt } from "../../services/lore";

export default function DebugModal({ open, onClose, story, world, character, characters = [], history, activeLoreMemory }) {
  const [tab, setTab] = useState("lore");
  const [copyStatus, setCopyStatus] = useState("");

  const snapshot = useMemo(() => {
    const loreInspection = inspectLoreInjection({ story, world, character, characters, history, activeLoreMemory });
    const injectedLoreText = formatLoreForPrompt(loreInspection.selectedEntries);
    const systemPrompt = buildSystemPrompt({
      story,
      world,
      character,
      characters,
      history,
      injectedLoreText
    });
    const requestMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20)
    ];
    const promptText = messagesToPromptText(requestMessages);
    const messagesJson = JSON.stringify(requestMessages, null, 2);
    const chatText = (history || []).slice(-20).map((message) => message?.content || "").join("\n\n");
    const sectionStats = [
      makeSectionStat("System prompt", systemPrompt),
      makeSectionStat("Injected lore", injectedLoreText),
      makeSectionStat("Recent chat window", chatText),
      makeSectionStat("Full request text", promptText),
      makeSectionStat("Messages JSON", messagesJson)
    ];

    return {
      loreInspection,
      systemPrompt,
      requestMessages,
      messagesJson,
      sectionStats,
      promptText
    };
  }, [story, world, character, characters, history, activeLoreMemory]);

  if (!open) return null;

  async function copyText(label, text) {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`Could not copy ${label.toLowerCase()}.`);
    }
    setTimeout(() => setCopyStatus(""), 1500);
  }

  return (
    <div id="debugModal" className="debug-modal">
      <div className="debug-modal-backdrop" onClick={onClose} />
      <section className="debug-modal-panel" role="dialog" aria-modal="true" aria-labelledby="debugModalTitle">
        <header className="debug-modal-header">
          <div>
            <h2 id="debugModalTitle">Story Debug</h2>
            <p>Lore injection, section estimates, and prompt previews for the active story.</p>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </header>

        <nav className="debug-tabs">
          <button type="button" className={`debug-tab ${tab === "lore" ? "active" : ""}`} onClick={() => setTab("lore")}>Lore Debug</button>
          <button type="button" className={`debug-tab ${tab === "prompt" ? "active" : ""}`} onClick={() => setTab("prompt")}>Prompt Preview</button>
        </nav>

        <div className="debug-toolbar">
          <button type="button" onClick={() => copyText("System prompt", snapshot.systemPrompt)}>Copy System</button>
          <button type="button" onClick={() => copyText("Full prompt", snapshot.promptText)}>Copy Full Prompt</button>
          <button type="button" onClick={() => copyText("Messages JSON", snapshot.messagesJson)}>Copy Messages JSON</button>
          <span className="debug-status">{copyStatus}</span>
        </div>

        {tab === "lore" ? <LoreDebugPanel inspection={snapshot.loreInspection} /> : <PromptDebugPanel snapshot={snapshot} />}
      </section>
    </div>
  );
}

function LoreDebugPanel({ inspection }) {
  const entries = inspection.inspectedEntries || [];

  return (
    <div className="debug-panel active">
      <div className="debug-section">
        <h3>Lore Summary</h3>
        <div className="debug-summary-grid">
          <div><strong>Total lore</strong><span>{entries.length}</span></div>
          <div><strong>Matched now</strong><span>{inspection.matchingEntries.length}</span></div>
          <div><strong>Injected</strong><span>{inspection.selectedEntries.length}</span></div>
          <div><strong>Budget</strong><span>{inspection.usedChars}/{inspection.maxChars} chars</span></div>
        </div>
      </div>

      <div className="debug-section">
        <h3>Scanned Trigger Text</h3>
        <pre className="debug-pre">{inspection.triggerText || "No recent trigger text."}</pre>
      </div>

      <div className="debug-section">
        <h3>Lore Match Results</h3>
        <div className="debug-table-wrap">
          <table className="debug-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={5}>No lore entries.</td></tr>
              ) : entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.source}</td>
                  <td>{entry.name || "Unnamed"}</td>
                  <td><span className={`debug-pill ${entry.debug?.matched ? "good" : "muted"}`}>{entry.debug?.status}</span></td>
                  <td>{entry.priority || 0}</td>
                  <td>{entry.debug?.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="debug-section">
        <h3>Final Injected Lore</h3>
        <pre className="debug-pre">{inspection.injectedText || "No lore currently injected."}</pre>
      </div>
    </div>
  );
}

function PromptDebugPanel({ snapshot }) {
  return (
    <div className="debug-panel active">
      <div className="debug-section">
        <h3>Prompt Summary</h3>
        <div className="debug-summary-grid">
          <div><strong>Messages sent</strong><span>{snapshot.requestMessages.length}</span></div>
          <div><strong>System chars</strong><span>{snapshot.systemPrompt.length}</span></div>
          <div><strong>Total chars</strong><span>{snapshot.promptText.length}</span></div>
          <div><strong>Estimated tokens</strong><span>{estimateTokens(snapshot.promptText)}</span></div>
        </div>
      </div>

      <div className="debug-section">
        <h3>Section Estimates</h3>
        <div className="debug-table-wrap">
          <table className="debug-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Chars</th>
                <th>Est. Tokens</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.sectionStats.map((section) => (
                <tr key={section.name}>
                  <td>{section.name}</td>
                  <td>{section.chars}</td>
                  <td>{section.tokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="debug-section">
        <h3>System Prompt</h3>
        <pre className="debug-pre large">{snapshot.systemPrompt}</pre>
      </div>

      <div className="debug-section">
        <h3>Messages JSON</h3>
        <pre className="debug-pre large">{snapshot.messagesJson}</pre>
      </div>

      <div className="debug-section">
        <h3>Full Request Prompt Text</h3>
        <pre className="debug-pre large">{snapshot.promptText}</pre>
      </div>
    </div>
  );
}

function makeSectionStat(name, text) {
  const chars = String(text || "").length;
  return { name, chars, tokens: estimateTokens(text) };
}

function estimateTokens(text) {
  return Math.max(0, Math.ceil(String(text || "").length / 4));
}
