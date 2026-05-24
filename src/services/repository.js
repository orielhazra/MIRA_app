import { STORAGE_KEYS } from "../constants/defaultData.js";
import { cloneJson } from "../utils/helpers.js";

function readJson(key, fallback) {
  const saved = localStorage.getItem(key);
  if (!saved) return cloneJson(fallback);
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.warn(`Invalid saved JSON for ${key}. Resetting key.`, error);
    localStorage.removeItem(key);
    return cloneJson(fallback);
  }
}

function writeJson(key, value, options = {}) {
  const { quiet = false, errorMessage = "Save failed. Browser storage may be full." } = options;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    if (!quiet) alert(errorMessage);
    return false;
  }
}

function removeKey(key) {
  localStorage.removeItem(key);
}

function getChatKey(storyId) {
  return `roleplay_story_chat_${storyId}`;
}

function getLoreMemoryKey(storyId) {
  return `roleplay_story_lore_memory_${storyId}`;
}

function getLegacyCharacterChatKey(characterId) {
  return `roleplay_chat_${characterId}`;
}

export const repository = {
  worlds: {
    list(fallback = []) {
      return readJson(STORAGE_KEYS.worlds, fallback);
    },
    saveAll(worlds, options = {}) {
      return writeJson(STORAGE_KEYS.worlds, worlds, {
        errorMessage: "World save failed. Browser storage may be full.",
        ...options
      });
    },
    clear() {
      removeKey(STORAGE_KEYS.worlds);
    }
  },

  characters: {
    list(fallback = []) {
      return readJson(STORAGE_KEYS.characters, fallback);
    },
    saveAll(characters, options = {}) {
      return writeJson(STORAGE_KEYS.characters, characters, {
        errorMessage: "Character save failed. Browser storage may be full.",
        ...options
      });
    },
    clear() {
      removeKey(STORAGE_KEYS.characters);
    },
    removeLegacyChat(characterId) {
      removeKey(getLegacyCharacterChatKey(characterId));
    }
  },

  stories: {
    list(fallback = []) {
      return readJson(STORAGE_KEYS.stories, fallback);
    },
    saveAll(stories, options = {}) {
      return writeJson(STORAGE_KEYS.stories, stories, {
        errorMessage: "Story save failed. Browser storage may be full.",
        ...options
      });
    },
    clear() {
      removeKey(STORAGE_KEYS.stories);
    }
  },

  chats: {
    load(storyId, fallback = null) {
      if (!storyId) return cloneJson(fallback);
      return readJson(getChatKey(storyId), fallback);
    },
    save(storyId, messages, options = {}) {
      if (!storyId) return false;
      return writeJson(getChatKey(storyId), messages, {
        errorMessage: "Chat save failed. Browser storage may be full.",
        ...options
      });
    },
    remove(storyId) {
      if (storyId) removeKey(getChatKey(storyId));
    }
  },

  loreMemory: {
    load(storyId, fallback = []) {
      if (!storyId) return cloneJson(fallback);
      return readJson(getLoreMemoryKey(storyId), fallback);
    },
    save(storyId, loreMemory, options = {}) {
      if (!storyId) return false;
      return writeJson(getLoreMemoryKey(storyId), loreMemory, {
        quiet: true,
        errorMessage: "Lore memory save failed.",
        ...options
      });
    },
    remove(storyId) {
      if (storyId) removeKey(getLoreMemoryKey(storyId));
    }
  },

  activeStory: {
    get() {
      return localStorage.getItem(STORAGE_KEYS.activeStory);
    },
    set(storyId) {
      if (storyId) localStorage.setItem(STORAGE_KEYS.activeStory, storyId);
    },
    clear() {
      removeKey(STORAGE_KEYS.activeStory);
    }
  },

  settings: {
    getKoboldBaseUrl(fallback) {
      return localStorage.getItem("kobold_base_url") || fallback;
    },
    setKoboldBaseUrl(value) {
      localStorage.setItem("kobold_base_url", value);
    }
  },

  maintenance: {
    clearKnownData(existingStories = [], existingCharacters = []) {
      for (const story of existingStories) {
        this.removeStoryRuntimeData(story.id);
      }
      for (const character of existingCharacters) {
        removeKey(getLegacyCharacterChatKey(character.id));
      }
      removeKey(STORAGE_KEYS.worlds);
      removeKey(STORAGE_KEYS.characters);
      removeKey(STORAGE_KEYS.stories);
      removeKey(STORAGE_KEYS.activeStory);
    },
    removeStoryRuntimeData(storyId) {
      removeKey(getChatKey(storyId));
      removeKey(getLoreMemoryKey(storyId));
    }
  }
};
