// Chat history and message editing state reducer.
// Replaces 2 useState blocks: chatHistory, editingMessageIndex.

export const chatInitialState = {
  chatHistory: [],
  editingMessageIndex: null,
};

export function chatReducer(state, action) {
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
