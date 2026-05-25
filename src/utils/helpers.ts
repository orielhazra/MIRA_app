export function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function safeFileName(name: string | undefined, fallback: string = "export"): string {
  return (
    String(name || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

export function downloadJson(filename: string, data: any): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function readJsonFile(file: File | null): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch (error: any) {
        reject(new Error(`Could not read JSON file: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}

export function parseKeywords(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((keyword) => String(keyword).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  }
  return [];
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

// Reuse singleton AudioContext to prevent leaked instance errors (Quality Issue #9 Resolved)
let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!_audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    _audioCtx = new AudioContextClass();
  }
  return _audioCtx;
}

export function playCompletionSound(): void {
  try {
    const audioContext = getAudioContext();
    
    // Resume if suspended by browser autoplay policy
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn("Completion sound failed:", error);
  }
}
