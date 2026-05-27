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
  | { type: "SET_IS_GENERATING"; payload: boolean }
  | { type: "UPDATE_PROGRESS"; payload: number }
  | { type: "SET_PROMPT_TOKENS"; payload: string | number }
  | { type: "SET_STATUS"; payload: string }
  | { type: "SET_IS_EXTRACTING_UPDATES"; payload: boolean }
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

    case "SET_IS_GENERATING":
      return {
        ...state,
        isGenerating: action.payload,
      };

    case "UPDATE_PROGRESS":
      return {
        ...state,
        progressPercent: action.payload,
      };

    case "SET_PROMPT_TOKENS":
      return { ...state, promptTokens: action.payload };

    case "SET_STATUS":
      return { ...state, generationStatus: action.payload };

    case "SET_IS_EXTRACTING_UPDATES":
      return { ...state, isExtractingUpdates: action.payload };

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
