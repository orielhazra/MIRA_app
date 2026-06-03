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
import StoryCharacterSheet from "../../features/characters/StoryCharacterSheet";
import StoryUserSheet from "../../features/characters/StoryUserSheet";
import PersonaSheet from "../../features/characters/PersonaSheet";
import WorldSheet from "../../features/worlds/WorldSheet";
import StoryWorldSheet from "../../features/worlds/StoryWorldSheet";

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
          key={app.selectedCharacterSheetId}
          character={app.selectedCharacter}
          characters={app.characters}
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
          onBackHome={() => { app.setActiveView("landing"); app.setStoryDraft(null); }}
          onBackToStory={() => { app.setActiveView("story"); app.setStoryDraft(null); }}
        />
      );
    }

    if (app.activeView === "story-character") {
      const castMember = app.activeStory?.castMembers.find(m => m.id === app.selectedCharacterSheetId);
      const effectiveCharacter = app.activeStoryCharacters.find(c => c.id === app.selectedCharacterSheetId);
      const castStateRow = app.activeStory?.castState.activeCharacters.find(r => r.castMemberId === app.selectedCharacterSheetId);
      const relationshipRow = app.activeStory?.castState.relationships.find(r => r.castMemberId === app.selectedCharacterSheetId);
      const journalEntries = app.activeStory?.storyMemory.characterJournals[app.selectedCharacterSheetId] || [];

      if (!castMember || !effectiveCharacter) {
         app.setActiveView("story");
         return null;
      }

      return (
        <StoryCharacterSheet
          key={app.selectedCharacterSheetId}
          castMember={castMember}
          effectiveCharacter={effectiveCharacter}
          characters={app.characters}
          activeWorld={app.activeWorld}
          castStateRow={castStateRow}
          relationshipRow={relationshipRow}
          journalEntries={journalEntries}
          onUpdatePatch={app.updateStoryCharacterPatch}
          onUpdateState={(id, patch) => app.saveCastState({ 
            ...app.activeStory.castState, 
            activeCharacters: app.activeStory.castState.activeCharacters.map(r => r.castMemberId === id ? { ...r, ...patch } : r)
          })}
          onUpdateRelationship={(id, patch) => app.saveCastState({
            ...app.activeStory.castState,
            relationships: app.activeStory.castState.relationships.map(r => r.castMemberId === id ? { ...r, ...patch } : r)
          })}
          onAddLore={app.addStoryCharacterLoreEntry}
          onUpdateLore={app.updateStoryCharacterLoreEntry}
          onRemoveLore={app.removeStoryCharacterLoreEntry}
          onResetOverlay={app.resetStoryCharacterOverlay}
          onUpgradeTemplate={app.upgradeStoryCastMemberTemplate}
          onUpdateJournal={(nextEntries) => app.saveStoryMemory({
            ...app.activeStory.storyMemory,
            characterJournals: {
              ...app.activeStory.storyMemory.characterJournals,
              [app.selectedCharacterSheetId]: nextEntries
            }
          })}
          onBackToStory={() => app.setActiveView("story")}
          onExportTemplate={app.exportCharacter}
        />
      );
    }

    if (app.activeView === "persona") {
      return (
        <PersonaSheet
          persona={app.selectedPersona}
          onSave={app.savePersonaEdits}
          onDelete={app.deletePersona}
          onBack={() => { app.setActiveView("landing"); app.setSelectedCharacterSheetId(""); }}
        />
      );
    }

    if (app.activeView === "story-user") {
      if (!app.activeStory) {
        app.setActiveView("landing");
        return null;
      }

      return (
        <StoryUserSheet
          userProfile={app.activeStory.userProfile}
          activeWorld={app.activeWorld}
          personas={app.personas}
          onUpdateProfile={(profile) => app.saveActiveStory({ ...app.activeStory, userProfile: profile })}
          onBackToStory={() => app.setActiveView("story")}
        />
      );
    }

    if (app.activeView === "story-world") {
      if (!app.activeStory || !app.activeWorld) {
         app.setActiveView("story");
         return null;
      }

      return (
        <StoryWorldSheet
          key={app.activeStory.id}
          activeStory={app.activeStory}
          activeWorld={app.activeWorld}
          worlds={app.worlds}
          onUpdateWorldPatch={app.updateStoryWorldPatch}
          onAddLocation={app.addStoryWorldLocation}
          onUpdateLocation={app.updateStoryWorldLocation}
          onRemoveLocation={app.removeStoryWorldLocation}
          onAddLore={app.addStoryWorldLoreEntry}
          onUpdateLore={app.updateStoryWorldLoreEntry}
          onRemoveLore={app.removeStoryWorldLoreEntry}
          onResetOverlay={app.resetStoryWorldOverlay}
          onUpgradeTemplate={app.upgradeStoryWorldTemplate}
          onBackToStory={() => app.setActiveView("story")}
          onExportTemplate={app.exportWorld}
        />
      );
    }

    if (app.activeView === "world") {
      return (
        <WorldSheet
          key={app.selectedWorldSheetId}
          world={app.selectedWorld}
          worlds={app.worlds}
          storyMetas={app.storyMetas}
          activeStory={app.activeStory}
          onSave={app.saveWorldSheetEdits}
          onUse={app.assignWorldToStory}
          onDelete={app.deleteSelectedWorld}
          onExport={app.exportWorld}
          onImport={() => app.worldImportRef.current?.click()}
          onBackHome={() => { app.setActiveView("landing"); app.setStoryDraft(null); }}
          onBackToStory={() => { app.setActiveView("story"); app.setStoryDraft(null); }}
        />
      );
    }

    if (isLanding) {
      return (
        <Landing
          storyMetas={app.storyMetas}
          worlds={app.worlds}
          characters={app.characters}
          personas={app.personas}
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
          onNewPersona={app.createBlankPersona}
          onSelectPersona={(id) => { app.setSelectedCharacterSheetId(id); app.setActiveView("persona"); app.setStoryDraft(null); }}
          onDeletePersona={app.deletePersona}
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
          onToggleSelection={app.selectAssistantOption}
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
            onSelectCharacter={(id) => { 
              app.setSelectedCharacterSheetId(id); 
              app.setActiveView(app.activeStory ? "story-character" : "character"); 
              app.setStoryDraft(null); 
            }}
            onSelectUser={() => {
              app.setSelectedCharacterSheetId("user");
              app.setActiveView("story-user");
              app.setStoryDraft(null);
            }}
            onSelectWorld={(id) => { 
              app.setSelectedWorldSheetId(id); 
              app.setActiveView(app.activeStory ? "story-world" : "world"); 
              app.setStoryDraft(null); 
            }}
            onEditStory={app.openStoryEditSheet}
          />
        )}

        <main className="chat">
          <ChatHeader
            activeView={app.activeView}
            activeStory={app.activeStory}
            activeWorld={app.activeWorld}
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
            activeCharacters={app.activeStoryCharacters}
            characters={app.characters}
            worlds={app.worlds}
            activeLoreMemory={app.activeLoreMemory}
            loreStatusText={app.loreStatusText}
            isCollapsed={app.editorCollapsed}
            onToggleCollapse={app.toggleEditorCollapsed}
            onClearDirectorNotes={app.clearDirectorNotes}
            onSaveSceneControl={app.saveSceneControl}
            onExportStory={app.exportActiveStory}
            onDeleteStory={app.deleteActiveStory}
            onUpdateStoryCharacterPatch={app.updateStoryCharacterPatch}
            onAddStoryCharacterLoreEntry={app.addStoryCharacterLoreEntry}
            onUpdateStoryCharacterLoreEntry={app.updateStoryCharacterLoreEntry}
            onRemoveStoryCharacterLoreEntry={app.removeStoryCharacterLoreEntry}
            onResetStoryCharacterOverlay={app.resetStoryCharacterOverlay}
            onUpgradeStoryCastMemberTemplate={app.upgradeStoryCastMemberTemplate}
            onExportCharacterTemplate={app.exportCharacter}
            onImportCharacterTemplate={() => app.characterImportRef.current?.click()}
            onUpdateStoryLore={app.updateStoryLore}
            onUpdateWorldLore={app.updateWorldLore}
            onUpdateCharacterLore={app.updateCharacterLore}
            onSaveTemporaryLore={app.saveTemporaryLore}
            onClearTemporaryLore={app.clearTemporaryLore}
            onRefreshActiveLore={app.refreshActiveLore}
            onSaveStoryWorldPatch={app.updateStoryWorldPatch}
            onAddStoryWorldLocation={app.addStoryWorldLocation}
            onUpdateStoryWorldLocation={app.updateStoryWorldLocation}
            onRemoveStoryWorldLocation={app.removeStoryWorldLocation}
            onAddStoryWorldLoreEntry={app.addStoryWorldLoreEntry}
            onUpdateStoryWorldLoreEntry={app.updateStoryWorldLoreEntry}
            onRemoveStoryWorldLoreEntry={app.removeStoryWorldLoreEntry}
            onResetStoryWorldOverlay={app.resetStoryWorldOverlay}
            onUpgradeStoryWorldTemplate={app.upgradeStoryWorldTemplate}
            onUpdateUserProfile={(profile) => app.saveActiveStory({ ...app.activeStory, userProfile: profile })}
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
        characters={app.activeStoryCharacters}
        history={app.chatHistory}
        activeLoreMemory={app.activeLoreMemory}
      />
    </>
  );
}
