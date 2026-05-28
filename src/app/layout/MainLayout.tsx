import { useApp } from "../../context/AppContext";
import Sidebar from "../../components/Sidebar";
import ChatHeader from "../../components/ChatHeader";
import ChatView from "../../features/chat/ChatView";
import Composer from "../../features/chat/Composer";
import EditorPanel from "../../components/EditorPanel";
import DebugModal from "../../features/debugging/DebugModal";
import PendingUpdatesPanel from "../../components/PendingUpdatesPanel";
import Landing from "../../features/stories/Landing";
import StoryCreationSheet from "../../features/stories/StoryCreationSheet";
import CharacterSheet from "../../features/characters/CharacterSheet";
import WorldSheet from "../../features/worlds/WorldSheet";

export default function MainLayout() {
  const app = useApp();

  const shouldShowEditor = app.activeView === "story" && app.activeStory?.id;

  function renderMainContent() {
    if (app.activeView === "story-create") {
      return (
        <StoryCreationSheet
          worlds={app.worlds}
          characters={app.characters}
          initialDraft={app.storyDraft}
          onStart={app.startStoryFromCreationSheet}
          onCancel={app.cancelStoryCreation}
          onImportStory={() => app.storyImportRef.current?.click()}
        />
      );
    }

    if (app.activeView === "character") {
      return (
        <CharacterSheet
          character={app.selectedCharacter}
          activeStory={app.activeStory}
          onSave={app.saveCharacterSheetEdits}
          onAddToStory={app.addCharacterToActiveStory}
          onRemoveFromStory={app.removeCharacterFromActiveStory}
          onSetActive={(id) => app.setCharacterPresenceInActiveStory(id, "active")}
          onSetInactive={(id) => app.setCharacterPresenceInActiveStory(id, "inactive")}
          onDelete={app.deleteSelectedCharacter}
          onExport={app.exportCharacter}
          onImport={() => app.characterImportRef.current?.click()}
        />
      );
    }

    if (app.activeView === "world") {
      return (
        <WorldSheet
          world={app.selectedWorld}
          activeStory={app.activeStory}
          onSave={app.saveWorldSheetEdits}
          onUse={app.assignWorldToStory}
          onDelete={app.deleteSelectedWorld}
          onExport={app.exportWorld}
          onImport={() => app.worldImportRef.current?.click()}
        />
      );
    }

    if (!app.activeStory || app.activeView === "landing") {
      return (
        <Landing
          onNewStory={app.openStoryCreationSheet}
          onImportStory={() => app.storyImportRef.current?.click()}
        />
      );
    }

    return (
      <>
        <ChatView
          messages={app.chatHistory}
          editingMessageIndex={app.editingMessageIndex}
          isGenerating={app.isGenerating}
          onStartEdit={app.startEditingMessage}
          onCancelEdit={app.cancelMessageEdit}
          onSaveEdit={app.saveMessageEdit}
          onDeleteFromHere={app.deleteMessagesFromIndex}
          onRegenerateFromHere={app.regenerateFromMessage}
          onSelectAssistantOption={app.selectAssistantOption}
        />
        <PendingUpdatesPanel
          updates={app.pendingUpdates}
          selectedIds={app.selectedPendingUpdateIds}
          status={app.pendingUpdateStatus}
          onToggle={app.togglePendingUpdate}
          onApplySelected={app.applySelectedPendingUpdates}
          onRejectAll={app.rejectPendingUpdates}
        />
        <Composer
          disabled={app.isGenerating || app.isExtractingUpdates}
          isGenerating={app.isGenerating}
          hasStory={Boolean(app.activeStory)}
          onSend={app.sendMessage}
          onContinue={app.continueLastReply}
          onElaborate={app.elaborateLastReply}
          onReroll={app.rerollLastReply}
          onRollback={app.rollbackLastExchange}
          onReset={app.resetChat}
          onExtractUpdates={app.extractStateUpdates}
          onCancelGeneration={app.cancelGeneration}
          onRetryGeneration={app.retryLastGeneration}
          canRetry={Boolean(app.abortControllerRef?.current) || !app.isGenerating}
        />
      </>
    );
  }

  return (
    <>
      <div className={`app ${shouldShowEditor ? "with-editor" : "without-editor"}`}>
        <Sidebar
          stories={app.stories}
          worlds={app.worlds}
          characters={app.characters}
          activeView={app.activeView}
          activeStoryId={app.activeStoryId}
          selectedWorldSheetId={app.selectedWorldSheetId}
          selectedCharacterSheetId={app.selectedCharacterSheetId}
          getWorld={app.getWorld}
          getCharacter={app.getCharacter}
          isGenerating={app.isGenerating}
          onNewStory={app.openStoryCreationSheet}
          onSelectStory={app.switchStory}
          onNewCharacter={app.createBlankCharacter}
          onSelectCharacter={(id) => { app.setSelectedCharacterSheetId(id); app.setActiveView("character"); app.setStoryDraft(null); }}
          onNewWorld={app.createBlankWorld}
          onSelectWorld={(id) => { app.setSelectedWorldSheetId(id); app.setActiveView("world"); app.setStoryDraft(null); }}
          onFactoryReset={app.factoryReset}
        />

        <main className="chat">
          <ChatHeader
            activeView={app.activeView}
            activeStory={app.activeStory}
            activeWorld={app.activeWorld}
            activeCharacter={app.activeCharacter}
            activeCharacters={app.activeStoryCharacters}
            selectedWorld={app.selectedWorld}
            selectedCharacter={app.selectedCharacter}
            promptTokens={app.promptTokens}
            persistenceInfo={app.persistenceInfo}
            koboldBaseUrl={app.koboldBaseUrl}
            storageModeLabel={app.storageModeLabel}
            storageTargetLabel={app.storageTargetLabel}
            generationStatus={app.generationStatus}
            loreStatusText={app.loreStatusText}
            progressPercent={app.progressPercent}
            onHome={() => { app.setActiveView("landing"); app.setStoryDraft(null); }}
            onDebug={() => app.setDebugOpen(true)}
            onSaveKoboldBaseUrl={app.saveKoboldBaseUrl}
            onClearPersistenceError={app.clearPersistenceError}
            onFlushPersistence={app.flushPersistence}
          />
          {renderMainContent()}
        </main>

        {shouldShowEditor && (
          <EditorPanel
            key={app.activeStory.id}
            activeStory={app.activeStory}
            activeWorld={app.activeWorld}
            activeCharacter={app.activeCharacter}
            activeCharacters={app.activeStoryCharacters}
            activeLoreMemory={app.activeLoreMemory}
            loreStatusText={app.loreStatusText}
            onSaveDirectorNotes={app.saveDirectorNotes}
            onClearDirectorNotes={app.clearDirectorNotes}
            onSaveSceneControl={app.saveSceneControl}
            onExportStory={app.exportActiveStory}
            onDeleteStory={app.deleteActiveStory}
            onSaveCharacterIdentity={app.saveStoryCastIdentity}
            onExportCharacterTemplate={app.exportCharacter}
            onImportCharacterTemplate={() => app.characterImportRef.current?.click()}
            onUpdateStoryLore={app.updateStoryLore}
            onUpdateWorldLore={app.updateWorldLore}
            onUpdateCharacterLore={app.updateCharacterLore}
            onSaveTemporaryLore={app.saveTemporaryLore}
            onClearTemporaryLore={app.clearTemporaryLore}
            onRefreshActiveLore={app.refreshActiveLore}
            currentContext={app.activeStory.currentContext}
            storyMemory={app.activeStory.storyMemory}
            castState={app.activeStory.castState}
            onSaveCurrentContext={app.saveCurrentContext}
            onSaveStoryMemory={app.saveStoryMemory}
            onSaveCastState={app.saveCastState}
            onExtractUpdates={app.extractStateUpdates}
            isExtractingUpdates={app.isExtractingUpdates}
          />
        )}
      </div>

      <input ref={app.storyImportRef} type="file" accept=".json,application/json" hidden onChange={app.handleImportStoryFile} />
      <input ref={app.characterImportRef} type="file" accept=".json,application/json" hidden onChange={app.handleImportCharacterFile} />
      <input ref={app.worldImportRef} type="file" accept=".json,application/json" hidden onChange={app.handleImportWorldFile} />

      <DebugModal
        open={app.debugOpen}
        onClose={() => app.setDebugOpen(false)}
        story={app.activeStory}
        world={app.activeWorld}
        character={app.activeCharacter}
        characters={app.activeStoryCharacters}
        history={app.chatHistory}
        activeLoreMemory={app.activeLoreMemory}
      />
    </>
  );
}
