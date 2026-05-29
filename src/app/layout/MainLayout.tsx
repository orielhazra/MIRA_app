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
import StoryEditSheet from "../../features/stories/StoryEditSheet";
import CharacterSheet from "../../features/characters/CharacterSheet";
import WorldSheet from "../../features/worlds/WorldSheet";

export default function MainLayout() {
  const app = useApp();

  const isLanding = !app.activeStory || app.activeView === "landing";
  const shouldShowEditor = app.activeView === "story" && app.activeStory?.id;
  const shouldShowGlobalSidebar = !isLanding;
  const appClassName = [
    "app",
    shouldShowEditor ? "with-editor" : "without-editor",
    shouldShowGlobalSidebar ? "with-sidebar" : "no-sidebar",
    app.sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded",
    shouldShowEditor ? (app.editorCollapsed ? "editor-collapsed" : "editor-expanded") : "editor-hidden",
  ].join(" ");

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

    if (app.activeView === "story-edit") {
      return (
        <StoryEditSheet
          worlds={app.worlds}
          characters={app.characters}
          initialDraft={app.storyDraft}
          onSave={app.saveStoryEdits}
          onCancel={app.cancelStoryEdit}
          onOpenStory={app.switchStory}
          activeStory={app.activeStory}
          onBackToStory={() => {
            app.setActiveView("story");
            app.setStoryDraft(null);
          }}
        />
      );
    }

    if (app.activeView === "character") {
      return (
        <CharacterSheet
          character={app.selectedCharacter}
          storyMetas={app.storyMetas}
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
          storyMetas={app.storyMetas}
          activeStory={app.activeStory}
          onSave={app.saveWorldSheetEdits}
          onUse={app.assignWorldToStory}
          onDelete={app.deleteSelectedWorld}
          onExport={app.exportWorld}
          onImport={() => app.worldImportRef.current?.click()}
        />
      );
    }

    if (isLanding) {
      return (
        <Landing
          storyMetas={app.storyMetas}
          worlds={app.worlds}
          characters={app.characters}
          onNewStory={app.openStoryCreationSheet}
          onImportStory={() => app.storyImportRef.current?.click()}
          onSelectStory={app.switchStory}
          onDeleteStory={app.deleteStoryById}
          onNewCharacter={app.createBlankCharacter}
          onSelectCharacter={(id) => { app.setSelectedCharacterSheetId(id); app.setActiveView("character"); app.setStoryDraft(null); }}
          onDeleteCharacter={app.deleteSelectedCharacter}
          onNewWorld={app.createBlankWorld}
          onSelectWorld={(id) => { app.setSelectedWorldSheetId(id); app.setActiveView("world"); app.setStoryDraft(null); }}
          onDeleteWorld={app.deleteSelectedWorld}
          onFactoryReset={app.factoryReset}
          isGenerating={app.isGenerating}
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
      <div className={appClassName}>
        {/* Only show global sidebar when an active story/sheet needs library navigation */}
        {shouldShowGlobalSidebar && (
          <Sidebar
            activeStory={app.activeStory}
            activeWorld={app.activeWorld}
            activeStoryCharacters={app.activeStoryCharacters}
            selectedWorldSheetId={app.selectedWorldSheetId}
            selectedCharacterSheetId={app.selectedCharacterSheetId}
            getWorld={app.getWorld}
            getCharacter={app.getCharacter}
            isGenerating={app.isGenerating}
            isCollapsed={app.sidebarCollapsed}
            onToggleCollapse={app.toggleSidebarCollapsed}
            onNewCharacter={app.createBlankCharacter}
            onSelectCharacter={(id) => { app.setSelectedCharacterSheetId(id); app.setActiveView("character"); app.setStoryDraft(null); }}
            onSelectWorld={(id) => { app.setSelectedWorldSheetId(id); app.setActiveView("world"); app.setStoryDraft(null); }}
            onEditStory={app.openStoryEditSheet}
          />
        )}

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
            isCollapsed={app.topbarCollapsed}
            onToggleCollapse={app.toggleTopbarCollapsed}
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
            isCollapsed={app.editorCollapsed}
            onToggleCollapse={app.toggleEditorCollapsed}
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
