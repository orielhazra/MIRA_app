import { useEffect, useRef } from "react";

export default function ChatView({
  messages,
  editingMessageIndex,
  isGenerating,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteFromHere,
  onRegenerateFromHere,
  onSelectAssistantOption
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, editingMessageIndex]);

  return (
    <section id="messages" className="messages" ref={scrollRef}>
      {messages.map((message, index) => (
        <ChatMessage
          key={`${index}-${message.role}-${message.content?.slice(0, 20)}`}
          message={message}
          index={index}
          isEditing={editingMessageIndex === index}
          isGenerating={isGenerating}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onDeleteFromHere={onDeleteFromHere}
          onRegenerateFromHere={onRegenerateFromHere}
          onSelectAssistantOption={onSelectAssistantOption}
        />
      ))}
    </section>
  );
}

function ChatMessage({
  message,
  index,
  isEditing,
  isGenerating,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteFromHere,
  onRegenerateFromHere,
  onSelectAssistantOption
}) {
  const displayText = getMessageDisplayText(message);

  return (
    <div className={`message ${message.role === "user" ? "user" : "bot"}`} data-message-index={index}>
      {isEditing ? (
        <MessageEditForm
          initialValue={displayText}
          message={message}
          index={index}
          onCancel={onCancelEdit}
          onSave={onSaveEdit}
        />
      ) : (
        <>
          <div className="message-body">
            {isAssistantMessageWithOptions(message) ? (
              <AssistantOptions
                message={message}
                index={index}
                onSelectAssistantOption={onSelectAssistantOption}
              />
            ) : (
              <div className={String(displayText).startsWith("Error:") ? "message-error" : ""}>{displayText}</div>
            )}
          </div>
          <div className="message-controls">
            <button className="message-action-button" disabled={isGenerating} onClick={() => onStartEdit(index)}>Edit</button>
            {index > 0 && (
              <button className="message-action-button" disabled={isGenerating} onClick={() => onDeleteFromHere(index)}>Delete from here</button>
            )}
            {message.role === "user" && (
              <button className="message-action-button" disabled={isGenerating} onClick={() => onRegenerateFromHere(index)}>Regenerate after this</button>
            )}
            {message.role === "assistant" && index > 0 && (
              <button className="message-action-button" disabled={isGenerating} onClick={() => onRegenerateFromHere(index)}>Regenerate from here</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MessageEditForm({ initialValue, message, index, onCancel, onSave }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
  }, []);

  function submit(regenerateAfterSave) {
    onSave(index, textareaRef.current?.value || "", regenerateAfterSave);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submit(false);
    }
  }

  return (
    <div className="message-edit-form">
      <textarea
        ref={textareaRef}
        className="message-edit-textarea"
        defaultValue={initialValue}
        onKeyDown={handleKeyDown}
      />
      <div className="message-edit-actions">
        <button className="message-action-button" onClick={() => submit(false)}>Save</button>
        {message.role === "user" && (
          <button className="message-action-button" onClick={() => submit(true)}>Save & Regenerate</button>
        )}
        <button className="message-action-button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function AssistantOptions({ message, index, onSelectAssistantOption }) {
  const selectedText = getMessageDisplayText(message);

  return (
    <>
      <div>{selectedText}</div>
      {Array.isArray(message.alternatives) && message.alternatives.length > 1 && (
        <div className="reply-options">
          {message.alternatives.map((_, optionIndex) => (
            <button
              key={optionIndex}
              className={optionIndex === message.selectedIndex ? "reply-option active" : "reply-option"}
              onClick={() => onSelectAssistantOption(index, optionIndex)}
            >
              Option {optionIndex + 1}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function getMessageDisplayText(message) {
  if (!message) return "";
  if (isAssistantMessageWithOptions(message)) {
    return message.alternatives[message.selectedIndex] || message.content || "";
  }
  return message.content || "";
}

export function isAssistantMessageWithOptions(message) {
  return message && message.role === "assistant" && Array.isArray(message.alternatives);
}
