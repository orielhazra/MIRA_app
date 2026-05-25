import { useApp } from "./AppContext.jsx";

// GenerationContext provides generation state and controls.

export function useGenerationContext() {
  const app = useApp();
  return {
    isGenerating: app.isGenerating,
    promptTokens: app.promptTokens,
    generationStatus: app.generationStatus,
    progressPercent: app.progressPercent,
    cancelGeneration: app.cancelGeneration,
    retryLastGeneration: app.retryLastGeneration,
  };
}
