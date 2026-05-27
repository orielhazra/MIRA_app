import { describe, expect, it } from "vitest";
import {
  buildGenerationBody,
  cleanGeneratedReply,
  estimateGeneratedTokens,
  messagesToPromptText,
} from "../src/services/koboldApi";
import { GENERATION_SETTINGS } from "../src/constants/defaultData";

describe("koboldApi helpers", () => {
  it("buildGenerationBody maps generation settings into API payload", () => {
    const messages = [
      { role: "system", content: "System prompt" },
      { role: "user", content: "Hello" },
    ] as any;

    const body = buildGenerationBody(messages);

    expect(body).toEqual({
      model: GENERATION_SETTINGS.model,
      messages,
      temperature: GENERATION_SETTINGS.temperature,
      top_p: GENERATION_SETTINGS.topP,
      min_p: GENERATION_SETTINGS.minP,
      repetition_penalty: GENERATION_SETTINGS.repetitionPenalty,
      max_tokens: GENERATION_SETTINGS.maxTokens,
      stream: GENERATION_SETTINGS.stream,
      stop: GENERATION_SETTINGS.stop,
    });
  });

  it("messagesToPromptText formats chat messages into prompt blocks", () => {
    const promptText = messagesToPromptText([
      { role: "system", content: "System prompt" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ] as any);

    expect(promptText).toContain("<|im_start|>system\nSystem prompt\n<|im_end|>");
    expect(promptText).toContain("<|im_start|>user\nHello\n<|im_end|>");
    expect(promptText).toContain("<|im_start|>assistant\nHi there\n<|im_end|>");
  });

  it("cleanGeneratedReply trims stop markers and control text", () => {
    const cleaned = cleanGeneratedReply(
      "Mira answers softly.\n\nUser: Should we continue?\nEnd of character response"
    );

    expect(cleaned).toBe("Mira answers softly.");
  });

  it("estimateGeneratedTokens provides a simple character-based estimate", () => {
    expect(estimateGeneratedTokens("1234")).toBe(1);
    expect(estimateGeneratedTokens("12345678")).toBe(2);
    expect(estimateGeneratedTokens("")).toBe(1);
  });
});
