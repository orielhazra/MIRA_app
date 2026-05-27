import { ChatMessage } from "../types";

export function isAssistantMessageWithOptions(message: ChatMessage | null | undefined): boolean {
  return Boolean(message && message.role === "assistant" && Array.isArray(message.alternatives));
}

export function getMessageDisplayText(message: ChatMessage | null | undefined): string {
  if (!message) return "";
  if (isAssistantMessageWithOptions(message)) {
    const selectedIndex = typeof message.selectedIndex === "number" ? message.selectedIndex : 0;
    return message.alternatives?.[selectedIndex] || message.content || "";
  }
  return message.content || "";
}
