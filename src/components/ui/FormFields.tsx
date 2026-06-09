/**
 * Shared form field components used across editor panels.
 * Single source of truth — do not duplicate in panel files.
 */

interface ContextInputProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  isOverridden?: boolean;
  placeholder?: string;
}

export function ContextInput({ label, value = "", onChange, isOverridden = false }: ContextInputProps) {
  return (
    <label>
      {isOverridden && <span className="overridden-dot" title="Overridden for this story"></span>}
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface ContextTextareaProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  isOverridden?: boolean;
  placeholder?: string;
}

export function ContextTextarea({ label, value = "", onChange, isOverridden = false, placeholder }: ContextTextareaProps) {
  return (
    <label>
      {isOverridden && <span className="overridden-dot" title="Overridden for this story"></span>}
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
