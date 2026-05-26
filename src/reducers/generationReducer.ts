// Generation state reducer.

export interface GenerationState {
  isGenerating: boolean;
  promptTokens: string | number;
  generationStatus: string;
  progressPercent: number;
  isExtractingUpdates: boolean;
}

export const generationInitialState: GenerationState = {
  isGenerating: false,
  promptTokens: 0,
  generationStatus: "idle",
  progressPercent: 0,
  isExtractingUpdates: false,
};

export type GenerationAction =
  | { type: "START_GENERATION" }
  | { type: "UPDATE_PROGRESS"; payload: number }
  | { type: "COMPLETE_GENERATION" }
  | { type: "CANCEL_GENERATION" }
  | { type: "ERROR_GENERATION" }
  | { type: "SET_PROMPT_TOKENS"; payload: string | number }
  | { type: "SET_STATUS"; payload: string }
  | { type: "START_EXTRACTING_UPDATES" }
  | { type: "COMPLETE_EXTRACTING_UPDATES" }
  | { type: "RESET_GENERATION" };

export function generationReducer(
  state: GenerationState,
  action: GenerationAction
): GenerationState {
  switch (action.type) {
    case "START_GENERATION":
      return {
        ...state,
        isGenerating: true,
        generationStatus: "generating",
        progressPercent: 0,
      };

    case "UPDATE_PROGRESS":
      return {
        ...state,
        progressPercent: action.payload,
      };

    case "COMPLETE_GENERATION":
      return {
        ...state,
        isGenerating: false,
        generationStatus: "complete",
        progressPercent: 100,
      };

    case "CANCEL_GENERATION":
      return {
        ...state,
        isGenerating: false,
        generationStatus: "cancelled",
      };

    case "ERROR_GENERATION":
      return {
        ...state,
        isGenerating: false,
        generationStatus: "error",
      };

    case "SET_PROMPT_TOKENS":
      return { ...state, promptTokens: action.payload };

    case "SET_STATUS":
      return { ...state, generationStatus: action.payload };

    case "START_EXTRACTING_UPDATES":
      return { ...state, isExtractingUpdates: true };

    case "COMPLETE_EXTRACTING_UPDATES":
      return { ...state, isExtractingUpdates: false };

    case "RESET_GENERATION":
      return {
        ...state,
        isGenerating: false,
        generationStatus: "idle",
        progressPercent: 0,
        isExtractingUpdates: false,
      };

    default:
      return state;
  }
}
