/**
 * ChatStateContext — manages chat history, message editing, and generation state.
 *
 * Extracted from useAppManager as part of the context split (Task 5.1).
 * Owns the chatReducer and generationReducer.
 *
 * Does NOT own saveChatForActiveStory (which needs activeStory.id from story state).
 * That remains in useAppManager as a thin wrapper over these primitives + repository.
 */

import { createContext, useContext, useReducer } from "react";
import type { ChatMessage } from "../types";
import { chatReducer, chatInitialState } from "../reducers/chatReducer";
import { generationReducer, generationInitialState } from "../reducers/generationReducer";

interface ChatStateContextValue {
  // Chat state
  chatHistory: ChatMessage[];
  editingMessageIndex: number | null;
  setChatHistory: (history: ChatMessage[]) => void;
  setEditingMessageIndex: (index: number | null) => void;

  // Generation state
  isGenerating: boolean;
  promptTokens: string | number;
  generationStatus: string;
  progressPercent: number;
  isExtractingUpdates: boolean;
  setIsGenerating: (value: boolean) => void;
  setPromptTokens: (value: string | number) => void;
  setGenerationStatus: (status: string) => void;
  setProgressPercent: (percent: number) => void;
  setIsExtractingUpdates: (value: boolean) => void;
}

const ChatStateContext = createContext<ChatStateContextValue | null>(null);

interface ChatStateProviderProps {
  initialChatHistory?: ChatMessage[];
  children: React.ReactNode;
}

export function ChatStateProvider({ initialChatHistory = [], children }: ChatStateProviderProps) {
  const [chatState, dispatchChat] = useReducer(chatReducer, {
    ...chatInitialState,
    chatHistory: initialChatHistory,
    editingMessageIndex: null,
  });

  const [generationState, dispatchGeneration] = useReducer(generationReducer, {
    ...generationInitialState,
    isGenerating: false,
    promptTokens: "-- tokens",
    generationStatus: "Idle",
    progressPercent: 0,
    isExtractingUpdates: false,
  });

  const { chatHistory, editingMessageIndex } = chatState;
  const { isGenerating, promptTokens, generationStatus, progressPercent, isExtractingUpdates } = generationState;

  const setChatHistory = (history: ChatMessage[]) => dispatchChat({ type: "SET_HISTORY", payload: history });
  const setEditingMessageIndex = (index: number | null) => {
    if (index === null) dispatchChat({ type: "CANCEL_EDITING" });
    else dispatchChat({ type: "START_EDITING", payload: index });
  };

  const setIsGenerating = (value: boolean) => {
    if (value) dispatchGeneration({ type: "START_GENERATION" });
    else dispatchGeneration({ type: "SET_IS_GENERATING", payload: false });
  };
  const setPromptTokens = (value: string | number) => dispatchGeneration({ type: "SET_PROMPT_TOKENS", payload: value });
  const setGenerationStatus = (status: string) => dispatchGeneration({ type: "SET_STATUS", payload: status });
  const setProgressPercent = (percent: number) => dispatchGeneration({ type: "UPDATE_PROGRESS", payload: percent });
  const setIsExtractingUpdates = (value: boolean) => dispatchGeneration({ type: "SET_IS_EXTRACTING_UPDATES", payload: value });

  return (
    <ChatStateContext.Provider value={{
      chatHistory, editingMessageIndex, setChatHistory, setEditingMessageIndex,
      isGenerating, promptTokens, generationStatus, progressPercent, isExtractingUpdates,
      setIsGenerating, setPromptTokens, setGenerationStatus, setProgressPercent, setIsExtractingUpdates,
    }}>
      {children}
    </ChatStateContext.Provider>
  );
}

export function useChatState(): ChatStateContextValue {
  const context = useContext(ChatStateContext);
  if (!context) throw new Error("useChatState must be used within a ChatStateProvider");
  return context;
}
