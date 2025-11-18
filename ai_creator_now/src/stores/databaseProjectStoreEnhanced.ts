import { create } from 'zustand';
import {
  Project,
  Scene,
  GeneratedImage,
  GeneratedVideo,
  AudioTrack,
  Timeline,
  ProjectSettings,
  CSVSceneData,
  ConflictStrategy,
  ConflictOptions
} from '../types';

// Import the existing database store
import { useDatabaseProjectStore } from './databaseProjectStore';

// Enhanced API client for conflict resolution
const enhancedAPIClient = {
  // Batch update scenes for conflict resolution
  async batchUpdateScenes(updates: Array<{ sceneId: string; updates: Partial<Scene> }>) {
    const promises = updates.map(async ({ sceneId, updates }) => {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update scene ${sceneId}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    });

    return Promise.all(promises);
  },

  // Get existing scenes for conflict detection
  async getProjectScenes(projectId: string): Promise<Scene[]> {
    const response = await fetch(`/api/scenes?projectId=${projectId}`);
    if (!response.ok) throw new Error('Failed to fetch project scenes');
    const data = await response.json();
    return data.data;
  },

  // Create scenes with automatic conflict resolution
  async createScenesWithResolution(
    projectId: string,
    scenes: CSVSceneData[],
    strategy: ConflictStrategy,
    options: ConflictOptions = {}
  ): Promise<{ created: Scene[]; updated: Scene[]; skipped: CSVSceneData[] }> {
    const response = await fetch('/api/scenes/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        scenes,
        strategy,
        options
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create scenes with resolution');
    }

    return response.json();
  }
};

interface EnhancedDatabaseProjectStore {
  // All existing methods from DatabaseProjectStore
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  userId: string;

  // Enhanced import with conflict resolution
  importScenesWithConflictResolution: (
    projectId: string,
    scenes: CSVSceneData[],
    strategy: ConflictStrategy,
    options?: ConflictOptions
  ) => Promise<{
    created: Scene[];
    updated: Scene[];
    skipped: CSVSceneData[];
  }>;

  // Batch scene operations
  batchUpdateScenes: (updates: Array<{ sceneId: string; updates: Partial<Scene> }>) => Promise<void>;

  // Get enhanced project statistics
  getProjectStatistics: (projectId: string) => Promise<{
    totalScenes: number;
    completedScenes: number;
    scenesWithImages: number;
    scenesWithVideos: number;
  }>;

  // Validate scene numbers before import
  validateSceneNumbers: (
    projectId: string,
    sceneNumbers: number[]
  ) => Promise<{
    valid: number[];
    conflicts: number[];
    nextAvailable: number;
  }>;

  // Existing methods (inherited from original store)
  loadProjects: (options?: { page?: number; limit?: number; search?: string; status?: string }) => Promise<void>;
  createProject: (projectData: { name: string; description?: string; status?: string; settings?: ProjectSettings }) => Promise<void>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (projectId: string) => void;
  refreshCurrentProject: () => Promise<void>;
  loadProjectScenes: (projectId: string) => Promise<void>;
  addScene: (sceneData: {
    title: string;
    description?: string;
    videoPrompt?: string;
    duration?: number;
  }) => Promise<void>;
  updateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  importScenes: (projectId: string, scenes: CSVSceneData[]) => Promise<Scene[]>;
  addGeneratedImages: (sceneId: string, images: GeneratedImage[]) => void;
  selectImage: (sceneId: string, imageId: string) => void;
  selectedImagesPerScene: Record<string, string[]>;
  toggleImageSelection: (sceneId: string, imageId: string) => void;
  selectMultipleImages: (sceneId: string, imageIds: string[]) => void;
  clearSceneSelection: (sceneId: string) => void;
  selectAllSceneImages: (sceneId: string) => void;
  getSceneSelectedImages: (sceneId: string) => string[];
  isImageSelected: (sceneId: string, imageId: string) => boolean;
  clearAllImageSelections: () => void;
  addGeneratedVideo: (sceneId: string, video: GeneratedVideo) => void;
  removeGeneratedVideo: (sceneId: string, videoId: string) => void;
  clearSceneVideos: (sceneId: string) => void;
  timeline: Timeline | null;
  updateTimeline: (updates: Partial<Timeline>) => void;
  addAudioTrack: (audioTrack: AudioTrack) => void;
  updateAudioTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  removeAudioTrack: (trackId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearAllData: () => Promise<void>;
}

export const useDatabaseProjectStoreEnhanced = create<EnhancedDatabaseProjectStore>((set, get) => {
  // Get the original store
  const originalStore = useDatabaseProjectStore.getState();

  return {
    // Initialize with original store state
    ...originalStore,

    // Enhanced import with conflict resolution
    importScenesWithConflictResolution: async (
      projectId: string,
      scenes: CSVSceneData[],
      strategy: ConflictStrategy,
      options: ConflictOptions = {}
    ) => {
      try {
        set({ isLoading: true, error: null });

        console.log(`[Enhanced Import] Starting import with strategy: ${strategy}`, {
          projectId,
          sceneCount: scenes.length,
          options
        });

        const result = await enhancedAPIClient.createScenesWithResolution(
          projectId,
          scenes,
          strategy,
          options
        );

        console.log(`[Enhanced Import] Import completed`, {
          created: result.created.length,
          updated: result.updated.length,
          skipped: result.skipped.length
        });

        // Refresh the project to get the latest scene data
        await get().refreshCurrentProject();

        set({ isLoading: false });
        return result;

      } catch (error) {
        console.error('Enhanced import failed:', error);
        set({
          error: error instanceof Error ? error.message : 'Enhanced import failed',
          isLoading: false
        });
        throw error;
      }
    },

    // Batch update scenes
    batchUpdateScenes: async (updates) => {
      try {
        set({ isLoading: true, error: null });

        console.log(`[Batch Update] Updating ${updates.length} scenes`);

        const updatedScenes = await enhancedAPIClient.batchUpdateScenes(updates);

        // Update local state
        set(state => {
          if (!state.currentProject) return state;

          const updatedSceneMap = new Map(updatedScenes.map(scene => [scene.id, scene]));

          const updatedScenesList = state.currentProject.scenes.map(scene =>
            updatedSceneMap.has(scene.id) ? updatedSceneMap.get(scene.id)! : scene
          );

          const updatedProject = {
            ...state.currentProject,
            scenes: updatedScenesList,
            updatedAt: new Date()
          };

          return {
            currentProject: updatedProject,
            projects: state.projects.map(p =>
              p.id === updatedProject.id ? updatedProject : p
            ),
            isLoading: false
          };
        });

        console.log(`[Batch Update] Successfully updated ${updatedScenes.length} scenes`);

      } catch (error) {
        console.error('Batch update failed:', error);
        set({
          error: error instanceof Error ? error.message : 'Batch update failed',
          isLoading: false
        });
        throw error;
      }
    },

    // Get project statistics
    getProjectStatistics: async (projectId: string) => {
      try {
        const scenes = await enhancedAPIClient.getProjectScenes(projectId);

        const stats = {
          totalScenes: scenes.length,
          completedScenes: scenes.filter(s => s.generatedVideos.length > 0).length,
          scenesWithImages: scenes.filter(s => s.images.length > 0).length,
          scenesWithVideos: scenes.filter(s => s.generatedVideos.length > 0).length
        };

        console.log(`[Statistics] Project ${projectId} stats:`, stats);
        return stats;

      } catch (error) {
        console.error('Failed to get project statistics:', error);
        throw error;
      }
    },

    // Validate scene numbers
    validateSceneNumbers: async (projectId: string, sceneNumbers: number[]) => {
      try {
        const existingScenes = await enhancedAPIClient.getProjectScenes(projectId);
        const existingNumbers = new Set(existingScenes.map(s => s.sceneNumber));

        const valid = sceneNumbers.filter(n => !existingNumbers.has(n));
        const conflicts = sceneNumbers.filter(n => existingNumbers.has(n));
        const nextAvailable = Math.max(...Array.from(existingNumbers), ...sceneNumbers) + 1;

        return {
          valid,
          conflicts,
          nextAvailable
        };

      } catch (error) {
        console.error('Failed to validate scene numbers:', error);
        throw error;
      }
    },

    // Delegate all other methods to the original store
    loadProjects: originalStore.loadProjects,
    createProject: originalStore.createProject,
    updateProject: originalStore.updateProject,
    deleteProject: originalStore.deleteProject,
    setCurrentProject: originalStore.setCurrentProject,
    refreshCurrentProject: originalStore.refreshCurrentProject,
    loadProjectScenes: originalStore.loadProjectScenes,
    addScene: originalStore.addScene,
    updateScene: originalStore.updateScene,
    deleteScene: originalStore.deleteScene,
    importScenes: originalStore.importScenes,
    addGeneratedImages: originalStore.addGeneratedImages,
    selectImage: originalStore.selectImage,
    selectedImagesPerScene: originalStore.selectedImagesPerScene,
    toggleImageSelection: originalStore.toggleImageSelection,
    selectMultipleImages: originalStore.selectMultipleImages,
    clearSceneSelection: originalStore.clearSceneSelection,
    selectAllSceneImages: originalStore.selectAllSceneImages,
    getSceneSelectedImages: originalStore.getSceneSelectedImages,
    isImageSelected: originalStore.isImageSelected,
    clearAllImageSelections: originalStore.clearAllImageSelections,
    addGeneratedVideo: originalStore.addGeneratedVideo,
    removeGeneratedVideo: originalStore.removeGeneratedVideo,
    clearSceneVideos: originalStore.clearSceneVideos,
    timeline: originalStore.timeline,
    updateTimeline: originalStore.updateTimeline,
    addAudioTrack: originalStore.addAudioTrack,
    updateAudioTrack: originalStore.updateAudioTrack,
    removeAudioTrack: originalStore.removeAudioTrack,
    setLoading: originalStore.setLoading,
    setError: originalStore.setError,
    clearError: originalStore.clearError,
    clearAllData: originalStore.clearAllData
  };
});