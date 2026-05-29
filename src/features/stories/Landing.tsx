// Landing screen — M.I.R.A. home page with tabbed library for stories, characters, and worlds.

import { useState } from "react";

type LibraryTab = "stories" | "characters" | "worlds";

interface StoryMeta {
  id: string;
  title: string;
  worldId: string;
  characterIds: string[];
  characterCount?: number;
  createdAt?: number;
  lastPlayedAt?: number;
}

interface Character {
  id: string;
  name: string;
  shortDescription?: string;
  race?: string;
  role?: string;
}

interface World {
  id: string;
  name: string;
  shortDescription?: string;
  description?: string;
  rules?: string;
  locations?: any[];
}

interface LandingProps {
  storyMetas: StoryMeta[];
  worlds: World[];
  characters: Character[];
  onNewStory: () => void;
  onImportStory: () => void;
  onSelectStory: (storyId: string) => void;
  onDeleteStory?: (storyId: string) => void;
  onNewCharacter: () => void;
  onSelectCharacter: (characterId: string) => void;
  onDeleteCharacter: (characterId: string) => void;
  onNewWorld: () => void;
  onSelectWorld: (worldId: string) => void;
  onDeleteWorld: (worldId: string) => void;
  onFactoryReset?: () => void;
  isGenerating?: boolean;
}

function formatDate(value?: number) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

const TABS: { key: LibraryTab; label: string }[] = [
  { key: "stories", label: "Stories" },
  { key: "characters", label: "Characters" },
  { key: "worlds", label: "Worlds" },
];

export default function Landing({
  storyMetas = [],
  worlds = [],
  characters = [],
  onNewStory,
  onImportStory,
  onSelectStory,
  onDeleteStory,
  onNewCharacter,
  onSelectCharacter,
  onDeleteCharacter,
  onNewWorld,
  onSelectWorld,
  onDeleteWorld,
  onFactoryReset,
  isGenerating = false,
}: LandingProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>("stories");

  function renderTabContent() {
    if (activeTab === "stories") {
      if (storyMetas.length === 0) {
        return (
          <div className="empty-library-note">
            <p>No stories yet.</p>
            <p>Create your first story to get started.</p>
          </div>
        );
      }
      return storyMetas.map((meta) => {
        const world = worlds.find((w) => w.id === meta.worldId);
        const created = formatDate(meta.createdAt);
        const lastPlayed = formatDate(meta.lastPlayedAt);
        const castCount = meta.characterCount ?? meta.characterIds?.length ?? 0;
        return (
          <article key={meta.id} className="story-library-card">
            <button
              className="story-library-open-button"
              onClick={() => onSelectStory(meta.id)}
              disabled={isGenerating}
              type="button"
              aria-label={`Play ${meta.title}`}
            >
              <span className="story-library-title">{meta.title}</span>
              <span className="story-library-meta">
                {world?.name || "Unknown World"} • {castCount} character{castCount === 1 ? "" : "s"}
              </span>
              <span className="story-library-dates">
                {created && <span>Created {created}</span>}
                {lastPlayed && <span>Last played {lastPlayed}</span>}
              </span>
            </button>

            <div className="story-library-actions" aria-label={`Actions for ${meta.title}`}>
              <button
                type="button"
                className="story-library-action play"
                onClick={() => onSelectStory(meta.id)}
                disabled={isGenerating}
              >
                Play
              </button>
              {onDeleteStory && (
                <button
                  type="button"
                  className="story-library-action delete"
                  onClick={() => onDeleteStory(meta.id)}
                  disabled={isGenerating}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        );
      });
    }

    if (activeTab === "characters") {
      if (characters.length === 0) {
        return (
          <div className="empty-library-note">
            <p>No character templates yet.</p>
            <p>Create a reusable character to use across stories.</p>
          </div>
        );
      }
      return characters.map((character) => (
        <article key={character.id} className="character-library-card">
          <button
            className="character-library-open-button"
            onClick={() => onSelectCharacter(character.id)}
            disabled={isGenerating}
            type="button"
            aria-label={`Edit ${character.name}`}
          >
            <span className="character-library-name">{character.name}</span>
            <span className="character-library-meta">
              {character.race ? `${character.race} • ` : ""}
              {character.shortDescription || "No description"}
            </span>
          </button>

          <div className="character-library-actions" aria-label={`Actions for ${character.name}`}>
            <button
              type="button"
              className="story-library-action play"
              onClick={() => onSelectCharacter(character.id)}
              disabled={isGenerating}
            >
              Edit
            </button>
            <button
              type="button"
              className="story-library-action delete"
              onClick={() => onDeleteCharacter(character.id)}
              disabled={isGenerating}
            >
              Delete
            </button>
          </div>
        </article>
      ));
    }

    // worlds
    if (worlds.length === 0) {
      return (
        <div className="empty-library-note">
          <p>No world templates yet.</p>
          <p>Create a world to use as a setting for your stories.</p>
        </div>
      );
    }
    return worlds.map((world) => {
      const storyCount = storyMetas.filter((s) => s.worldId === world.id).length;
      const locationCount = world.locations?.length || 0;
      return (
        <article key={world.id} className="world-library-card">
          <button
            className="world-library-open-button"
            onClick={() => onSelectWorld(world.id)}
            disabled={isGenerating}
            type="button"
            aria-label={`Edit ${world.name}`}
          >
            <span className="world-library-name">{world.name}</span>
            <span className="world-library-meta">
              {world.shortDescription || "No description"}
            </span>
            <span className="world-library-dates">
              {storyCount > 0 && <span>{storyCount} stor{storyCount === 1 ? "y" : "ies"}</span>}
              {locationCount > 0 && <span>{locationCount} location{locationCount === 1 ? "" : "s"}</span>}
            </span>
          </button>

          <div className="world-library-actions" aria-label={`Actions for ${world.name}`}>
            <button
              type="button"
              className="story-library-action play"
              onClick={() => onSelectWorld(world.id)}
              disabled={isGenerating}
            >
              Edit
            </button>
            <button
              type="button"
              className="story-library-action delete"
              onClick={() => onDeleteWorld(world.id)}
              disabled={isGenerating}
            >
              Delete
            </button>
          </div>
        </article>
      );
    });
  }

  function renderTabActions() {
    if (activeTab === "stories") {
      return (
        <div className="landing-library-actions">
          <button onClick={onNewStory} disabled={isGenerating} type="button" className="primary-library-button">
            + New Story
          </button>
          <button onClick={onImportStory} disabled={isGenerating} type="button" className="secondary-library-button">
            Import Story
          </button>
        </div>
      );
    }

    if (activeTab === "characters") {
      return (
        <div className="landing-library-actions">
          <button onClick={onNewCharacter} disabled={isGenerating} type="button" className="primary-library-button">
            + New Character
          </button>
        </div>
      );
    }

    return (
      <div className="landing-library-actions">
        <button onClick={onNewWorld} disabled={isGenerating} type="button" className="primary-library-button">
          + New World
        </button>
      </div>
    );
  }

  return (
    <div className="landing-with-sidepanel">
      <aside className="landing-side-panel">
        {/* Tab Bar */}
        <div className="landing-library-header">
          <strong>Library</strong>
        </div>

        <div className="library-tabs" role="tablist">
          {TABS.map((tab) => {
            const count = tab.key === "stories" ? storyMetas.length
              : tab.key === "characters" ? characters.length
              : worlds.length;

            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`library-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
                disabled={isGenerating}
                type="button"
              >
                {tab.label}
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable list content */}
        <div className="library-tab-content">
          {renderTabContent()}
        </div>

        {/* Fixed action buttons at bottom */}
        {renderTabActions()}
      </aside>

      <section className="landing-welcome-panel">
        <div className="mira-landing">
          <h1 className="mira-title">M.I.R.A.</h1>
          <p className="mira-subtitle">Multi-Intelligence Roleplay Assistant</p>
          <p className="mira-landing-copy">Select a story, character, or world from the library.</p>
        </div>
      </section>

      {onFactoryReset && (
        <button
          onClick={onFactoryReset}
          disabled={isGenerating}
          type="button"
          className="factory-reset-corner-button"
        >
          Factory Reset
        </button>
      )}
    </div>
  );
}
