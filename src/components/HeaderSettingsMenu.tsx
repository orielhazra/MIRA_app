import { useEffect, useMemo, useRef, useState } from "react";
import { CUSTOM_DB_PATH, DEFAULT_KOBOLD_BASE_URL, GENERATION_SETTINGS } from "../constants/defaultData";

type SettingsSectionKey = "connection" | "generation" | "storage";

interface PersistenceInfo {
  lastError?: string | null;
  lastOperation?: string | null;
  lastSavedAt?: number | null;
  pendingWrites?: number;
}

interface HeaderSettingsMenuProps {
  koboldBaseUrl: string;
  onSaveKoboldBaseUrl: (value: string) => void | Promise<void>;
  onClearPersistenceError?: () => void;
  onFlushPersistence?: () => void | Promise<void>;
  persistenceInfo?: PersistenceInfo;
  storageModeLabel: string;
  storageTargetLabel: string;
}

export default function HeaderSettingsMenu({
  koboldBaseUrl,
  onSaveKoboldBaseUrl,
  onClearPersistenceError,
  onFlushPersistence,
  persistenceInfo,
  storageModeLabel,
  storageTargetLabel,
}: HeaderSettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSectionKey | null>(null);
  const [draftKoboldBaseUrl, setDraftKoboldBaseUrl] = useState(koboldBaseUrl || DEFAULT_KOBOLD_BASE_URL);
  const [status, setStatus] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setDraftKoboldBaseUrl(koboldBaseUrl || DEFAULT_KOBOLD_BASE_URL);
      setStatus("");
      setOpenSection(null);
    }
  }, [koboldBaseUrl, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const saveSummary = useMemo(() => {
    if (persistenceInfo?.pendingWrites && persistenceInfo.pendingWrites > 0) {
      return `${persistenceInfo.pendingWrites} pending write${persistenceInfo.pendingWrites === 1 ? "" : "s"}`;
    }
    if (persistenceInfo?.lastSavedAt) {
      return `Last saved: ${new Date(persistenceInfo.lastSavedAt).toLocaleTimeString()}`;
    }
    return "No save recorded yet";
  }, [persistenceInfo]);

  async function handleSave() {
    const normalized = draftKoboldBaseUrl.trim() || DEFAULT_KOBOLD_BASE_URL;
    await onSaveKoboldBaseUrl(normalized);
    setDraftKoboldBaseUrl(normalized);
    setStatus("Settings saved.");
  }

  async function handleResetDefault() {
    await onSaveKoboldBaseUrl(DEFAULT_KOBOLD_BASE_URL);
    setDraftKoboldBaseUrl(DEFAULT_KOBOLD_BASE_URL);
    setStatus("Reset to default URL.");
  }

  async function handleFlush() {
    await onFlushPersistence?.();
    setStatus("Pending saves flushed.");
  }

  function toggleSection(section: SettingsSectionKey) {
    setOpenSection((current) => (current === section ? null : section));
  }

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        id="settingsButton"
        type="button"
        className="header-action-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Settings
      </button>

      {open && (
        <div className="settings-popover" role="dialog" aria-label="Application settings">
          <div className="settings-popover-header">
            <div>
              <strong>Settings</strong>
              <p>Connection, storage, and runtime defaults.</p>
            </div>
            <button type="button" className="settings-close-button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <details className="settings-section" open={openSection === "connection"}>
            <summary onClick={(event) => { event.preventDefault(); toggleSection("connection"); }}>
              <span>Connection</span>
              <small>{draftKoboldBaseUrl || DEFAULT_KOBOLD_BASE_URL}</small>
            </summary>
            <div className="settings-section-body">
              <label className="settings-field">
                <span>KoboldCPP Base URL</span>
                <input
                  type="url"
                  value={draftKoboldBaseUrl}
                  onChange={(event) => setDraftKoboldBaseUrl(event.target.value)}
                  placeholder={DEFAULT_KOBOLD_BASE_URL}
                />
              </label>
              <div className="settings-inline-actions">
                <button type="button" onClick={handleSave}>Save</button>
                <button type="button" onClick={handleResetDefault}>Reset Default</button>
              </div>
            </div>
          </details>

          <details className="settings-section" open={openSection === "generation"}>
            <summary onClick={(event) => { event.preventDefault(); toggleSection("generation"); }}>
              <span>Generation Defaults</span>
              <small>{GENERATION_SETTINGS.model} • {GENERATION_SETTINGS.maxTokens} tokens</small>
            </summary>
            <div className="settings-section-body">
              <div className="settings-grid compact-grid">
                <span>Model</span><strong>{GENERATION_SETTINGS.model}</strong>
                <span>Max Tokens</span><strong>{GENERATION_SETTINGS.maxTokens}</strong>
                <span>Temperature</span><strong>{GENERATION_SETTINGS.temperature}</strong>
                <span>Top P</span><strong>{GENERATION_SETTINGS.topP}</strong>
                <span>Min P</span><strong>{GENERATION_SETTINGS.minP}</strong>
                <span>Repetition Penalty</span><strong>{GENERATION_SETTINGS.repetitionPenalty}</strong>
              </div>
              <p className="settings-help">These defaults are currently code-defined and shown here for reference.</p>
            </div>
          </details>

          <details className="settings-section" open={openSection === "storage"}>
            <summary onClick={(event) => { event.preventDefault(); toggleSection("storage"); }}>
              <span>Storage & Save Status</span>
              <small>{saveSummary}</small>
            </summary>
            <div className="settings-section-body">
              <div className="settings-grid compact-grid">
                <span>Backend</span><strong>{storageModeLabel}</strong>
                <span>Preferred Target</span><strong>{storageTargetLabel}</strong>
                <span>Custom Path</span><strong>{CUSTOM_DB_PATH || "Not set"}</strong>
                <span>Save Status</span><strong>{saveSummary}</strong>
              </div>
              {typeof persistenceInfo?.lastError === "string" && persistenceInfo.lastError.trim() && (
                <div className="settings-warning-box">
                  <p>{persistenceInfo.lastError}</p>
                  <div className="settings-inline-actions">
                    <button type="button" onClick={() => onClearPersistenceError?.()}>Dismiss Warning</button>
                    <button type="button" onClick={handleFlush}>Flush Pending Writes</button>
                  </div>
                </div>
              )}
            </div>
          </details>

          {status && <p className="settings-status">{status}</p>}
        </div>
      )}
    </div>
  );
}
