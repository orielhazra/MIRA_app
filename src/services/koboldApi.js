import { DEFAULT_KOBOLD_BASE_URL, GENERATION_SETTINGS } from "../constants/defaultData.js";
import { repository } from "./repository.js";

export function getKoboldBaseUrl() {
  return repository.settings.getKoboldBaseUrl(DEFAULT_KOBOLD_BASE_URL);
}

export function getKoboldChatUrl() {
  return `${getKoboldBaseUrl()}/v1/chat/completions`;
}

export function getKoboldTokenCountUrl() {
  return `${getKoboldBaseUrl()}/api/extra/tokencount`;
}

export function buildGenerationBody(messages) {
  return {
    model: GENERATION_SETTINGS.model,
    messages,
    temperature: GENERATION_SETTINGS.temperature,
    top_p: GENERATION_SETTINGS.topP,
    min_p: GENERATION_SETTINGS.minP,
    repetition_penalty: GENERATION_SETTINGS.repetitionPenalty,
    max_tokens: GENERATION_SETTINGS.maxTokens,
    stream: GENERATION_SETTINGS.stream,
    stop: GENERATION_SETTINGS.stop
  };
}

export async function countPromptTokens(messages, options = {}) {
  const promptText = messagesToPromptText(messages);
  const response = await fetch(getKoboldTokenCountUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: promptText }),
    signal: options.signal
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return data.value ?? data.tokens ?? data.count ?? 0;
}

export async function streamChatCompletion(messages, onChunk, options = {}) {
  const response = await fetch(getKoboldChatUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGenerationBody(messages)),
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`KoboldCpp returned HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Streaming is not available in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullReply = "";

  while (true) {
    if (options.signal?.aborted) throw new DOMException("Generation canceled", "AbortError");
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const chunk = parseStreamingChunk(line);
      if (chunk === null) continue;
      if (chunk === "[DONE]") return fullReply;
      fullReply += chunk;
      onChunk?.(fullReply, chunk);
    }
  }

  const finalChunk = parseStreamingChunk(buffer);
  if (finalChunk && finalChunk !== "[DONE]") {
    fullReply += finalChunk;
    onChunk?.(fullReply, finalChunk);
  }

  return fullReply;
}

function parseStreamingChunk(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  const dataText = trimmed.startsWith("data:")
    ? trimmed.replace(/^data:\s*/, "")
    : trimmed;

  if (!dataText || dataText === "[DONE]") return dataText === "[DONE]" ? "[DONE]" : null;

  try {
    const data = JSON.parse(dataText);
    return (
      data.choices?.[0]?.delta?.content ??
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      ""
    );
  } catch {
    return null;
  }
}

export function cleanGeneratedReply(text) {
  let cleaned = String(text || "").trim();
  let cutIndex = -1;

  for (const stop of GENERATION_SETTINGS.stop) {
    const rawStop = String(stop || "");
    const trimmedStop = rawStop.trim();

    if (!rawStop && !trimmedStop) continue;

    if (rawStop) {
      const exactIndex = cleaned.indexOf(rawStop);
      if (exactIndex > -1) {
        cutIndex = cutIndex === -1 ? exactIndex : Math.min(cutIndex, exactIndex);
      }
    }

    if (trimmedStop) {
      const pattern = new RegExp(`(^|\\n)${escapeRegExp(trimmedStop)}`, "i");
      const match = cleaned.match(pattern);
      if (match && typeof match.index === "number") {
        cutIndex = cutIndex === -1 ? match.index : Math.min(cutIndex, match.index);
      }
    }
  }

  if (cutIndex > -1) cleaned = cleaned.slice(0, cutIndex).trim();
  return cleaned;
}

export function messagesToPromptText(messages) {
  return messages
    .map((message) => `<|im_start|>${message.role}\n${message.content}\n<|im_end|>`)
    .join("\n");
}

export function estimateGeneratedTokens(text) {
  return Math.max(1, Math.round(String(text || "").length / 4));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
