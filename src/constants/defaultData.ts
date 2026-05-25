import { World, Character, Story, StoryJournal, DirectorNotes } from "../types/index";

export const STORAGE_KEYS = {
  stories: "roleplay_stories",
  activeStory: "active_story_id",
  characters: "roleplay_characters",
  worlds: "roleplay_worlds"
};

export const DEFAULT_KOBOLD_BASE_URL = "http://localhost:5001";

interface GenSettings {
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  minP: number;
  repetitionPenalty: number;
  stream: boolean;
  stop: string[];
}

export const GENERATION_SETTINGS: GenSettings = {
  model: "koboldcpp",
  maxTokens: 350,
  temperature: 0.85,
  topP: 0.92,
  minP: 0.05,
  repetitionPenalty: 1.12,
  stream: true,
  stop: [
    "\nUser:",
    "\nuser:",
    "\nYou:",
    "\nHuman:",
    "\nAssistant:",
    "\nUser Prompt:",
    "User Prompt:",
    "[Your action or response]",
    "<|im_end|>",
    "</s>",
    "\n[Director Note:",
    "[Director Note:",
    "\nDirector Note:",
    "Director Note:",
    "\nToken count:",
    "Token count:",
    "\nEnd of character response",
    "End of character response",
    "\nAwaiting user's action",
    "Awaiting user's action",
    "\nPlease provide your next move",
    "Please provide your next move",
    "[Scene ends]",
    "\n[Scene ends]"
  ]
};

export const CHAT_CONTEXT_MESSAGES = 20;
export const MAX_ACTIVE_LORE = 5;
export const LORE_SCAN_MESSAGES = 8;
export const MAX_LORE_PROMPT_CHARS = 2048;

export const defaultWorlds: any[] = [
  {
    id: "liminal-station",
    name: "The Liminal Station",
    shortDescription: "A forgotten train station between impossible places.",
    description:
      "The Liminal Station is an old train station where lost travelers arrive from impossible destinations.",
    rules: "Memory is unreliable here. Places, names, and records may change over time.",
    worldLorebook: [
      {
        name: "Elaren",
        keywords: ["elaren", "vanished city", "lost city"],
        content:
          "Elaren was a city that vanished from maps, records, and memory after a failed ritual."
      },
      {
        name: "The Station",
        keywords: ["station", "platform", "train"],
        content:
          "The old train station connects to impossible destinations and forgotten places."
      }
    ]
  }
];

export const defaultCharacters: any[] = [
  {
    id: "mira",
    worldId: "liminal-station",
    name: "Mira",
    shortDescription: "Calm, mysterious traveler",
    description: "A calm but mysterious traveler.",
    personality: "Soft-spoken, curious, emotionally perceptive.",
    appearance: "Dark travel cloak, tired eyes, ink-stained fingers.",
    backstory: "Mira was once an archivist for a city that vanished from memory.",
    speakingStyle: "Quiet, poetic, restrained, slightly cryptic.",
    relationshipToUser: "She has just met the user.",
    goals: "Recover lost memories and decide whether the user can be trusted.",
    characterRules: "Mira should be subtle, observant, and emotionally guarded.",
    characterLorebook: [
      {
        name: "Mira's Notebook",
        keywords: ["notebook", "journal"],
        content: "Mira's notebook contains memory fragments that do not belong to her."
      }
    ]
  }
];

export const defaultStories: any[] = [
  {
    id: "story_mira_station",
    title: "Mira at the Liminal Station",
    worldId: "liminal-station",
    characterIds: ["mira"],
    mainCharacterId: "mira",
    scenario: "The user meets Mira at an old train station at night.",
    greeting: 'Mira looks up from her notebook. "You came after all."',
    createdAt: Date.now(),
    storyLorebook: [
      {
        name: "The User's Arrival",
        keywords: ["arrival", "came after all", "why am i here"],
        content:
          "The user's arrival at the station was expected, though Mira does not fully understand why yet."
      }
    ]
  }
];

export const DEFAULT_STORY_MEMORY: StoryJournal = {
  summary: "",
  generalJournal: [],
  characterJournals: {},
  tasks: []
};

export const DEFAULT_DIRECTOR_NOTES: DirectorNotes = {
  timeOfDay: "",
  currentLocation: "",
  sceneMood: "",
  characterMotivation: "",
  userPlan: "",
  currentConflict: "",
  nextStoryBeat: "",
  avoid: "",
  customNotes: ""
};
