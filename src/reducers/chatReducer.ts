// Chat history and message editing state reducer.
import { ChatMessage } from "../types/index.js";

export interface ChatState {
  chatHistory: ChatMessage[];
  editingMessageIndex: number | null;
}

export const chatInitialState: ChatState = {
  chatHistory: [],
  editingMessageIndex: null,
};

export function chatReducer(state: ChatState, action: { type: string; payload?: any }): ChatState {
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
