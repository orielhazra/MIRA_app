import { useEffect, useRef, useState } from "react";

export default function Composer({
  disabled,
  isGenerating = false,
  hasStory,
  onSend,
  onContinue,
  onElaborate,
  onReroll,
  onRollback,
  onReset,
  onExtractUpdates,
  onCancelGeneration,
  onRetryGeneration,
  canRetry = false
}) {
  const [text, setText] = useState("");
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsRef = useRef(null);

  const actionsDisabled = disabled || !hasStory;
  const cancelDisabled = !isGenerating || !hasStory;
  const retryDisabled = disabled || !hasStory || !canRetry;

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || actionsDisabled) return;
    setText("");
    onSend(trimmed);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function runOption(action) {
    setIsOptionsOpen(false);
    action?.();
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!optionsRef.current?.contains(event.target)) {
        setIsOptionsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOptionsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <footer className="composer minimal-composer">
      <textarea
        id="userInput"
        placeholder="Type your message..."
        value={text}
        disabled={actionsDisabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        id="sendButton"
        disabled={actionsDisabled || !text.trim()}
        onClick={submit}
      >
        Send
      </button>

      {isGenerating ? (
        <button
          id="cancelGenerationButton"
          type="button"
          disabled={cancelDisabled}
          onClick={onCancelGeneration}
        >
          Stop
        </button>
      ) : (
        <button
          id="retryGenerationButton"
          type="button"
          disabled={retryDisabled}
          onClick={onRetryGeneration}
        >
          Retry
        </button>
      )}

      <button
        id="extractUpdatesButton"
        disabled={actionsDisabled}
        onClick={onExtractUpdates}
      >
        Extract
      </button>

      <div className="composer-options" ref={optionsRef}>
        <button
          id="optionsButton"
          type="button"
          disabled={actionsDisabled}
          aria-haspopup="menu"
          aria-expanded={isOptionsOpen}
          onClick={() => setIsOptionsOpen((value) => !value)}
        >
          Options
        </button>

        {isOptionsOpen && (
          <div className="composer-options-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => runOption(onContinue)}>
              Continue
            </button>
            <button type="button" role="menuitem" onClick={() => runOption(onElaborate)}>
              Elaborate
            </button>
            <button type="button" role="menuitem" onClick={() => runOption(onReroll)}>
              Reroll
            </button>
            <button type="button" role="menuitem" onClick={() => runOption(onRollback)}>
              Rollback
            </button>
            <button type="button" role="menuitem" className="danger-menu-item" onClick={() => runOption(onReset)}>
              Reset Chat
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
