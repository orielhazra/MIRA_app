// Chat history and message editing state reducer.
import { ChatMessage } from "../types/index";

export interface ChatState {
  chatHistory: ChatMessage[];
  editingMessageIndex: number | null;
}

export const chatInitialState: ChatState = {
  chatHistory: [],
  editingMessageIndex: null,
};

export type ChatAction =
  | { type: "SET_HISTORY"; payload: ChatMessage[] }
  | { type: "START_EDITING"; payload: number }
  | { type: "CANCEL_EDITING" }
  | { type: "FINISH_EDITING"; payload: ChatMessage[] };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_HISTORY":
      return { ...state, chatHistory: action.payload };

    case "START_EDITING":
      return { ...state, editingMessageIndex: action.payload };

    case "CANCEL_EDITING":
      return { ...state, editingMessageIndex: null };

    case "FINISH_EDITING":
      return { ...state, editingMessageIndex: null, chatHistory: action.payload };

    default:
      return state;
  }
}
