import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Project,
  Scene,
  GeneratedImage,
  GeneratedVideo,
  AudioTrack,
  Timeline,
  ProjectSettings,
  CSVSceneData
} from '../types';

// 导入数据库store
import { useDatabaseProjectStore } from './databaseProjectStore';

interface ProjectStore {
  // Current project state
  currentProject: Project | null;
  projects: Project[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  createProject: (name: string, description?: string) => Promise<void>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (projectId: string) => Promise<void>;

  // Scene management
  importScenesFromCSV: (scenes: CSVSceneData[]) => Promise<void>;
  addScene: (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  reorderScenes: (fromIndex: number, toIndex: number) => Promise<void>;

  // Image management
  addGeneratedImages: (sceneId: string, images: GeneratedImage[]) => Promise<void>;
  selectImage: (sceneId: string, imageId: string) => Promise<void>;

  // Video management
  addGeneratedVideo: (sceneId: string, video: GeneratedVideo) => Promise<void>;

  // Enhanced image selection for scene-based workflow
  selectedImagesPerScene: Record<string, string[]>; // sceneId -> imageIds
  toggleImageSelection: (sceneId: string, imageId: string) => Promise<void>;
  selectMultipleImages: (sceneId: string, imageIds: string[]) => Promise<void>;
  clearSceneSelection: (sceneId: string) => Promise<void>;
  selectAllSceneImages: (sceneId: string) => Promise<void>;
  getSceneSelectedImages: (sceneId: string) => string[];
  isImageSelected: (sceneId: string, imageId: string) => boolean;

  // Timeline management
  timeline: Timeline | null;
  setTimeline: (timeline: Timeline) => void;
  clearTimeline: () => void;

  // Project settings
  settings: ProjectSettings | null;
  updateSettings: (settings: Partial<ProjectSettings>) => void;

  // Clear error
  clearError: () => void;

  // Additional methods
  checkMigrationStatus: () => { needsMigration: boolean; localStorageData: any };
  migrateToDatabase: () => Promise<boolean>;
}

// 创建适配器来桥接localStorage和数据库
const createProjectStoreAdapter = () => {
  return create<ProjectStore>()(
    persist(
      (set, get) => ({
        // 初始状态
        currentProject: null,
        projects: [],
        timeline: null,
        settings: null,
        isLoading: false,
        error: null,
        selectedImagesPerScene: {},

        // 检查是否需要迁移
        checkMigrationStatus: () => {
          try {
            const stored = localStorage.getItem('video-workstation-storage');
            if (stored) {
              const data = JSON.parse(stored, (key, value) => {
                if (value && typeof value === 'object' && value.__type === 'Date') {
                  return new Date(value.value);
                }
                return value;
              });
              return {
                needsMigration: !!data.projects && data.projects.length > 0,
                localStorageData: data
              };
            }
          } catch (error) {
            console.error('Error checking migration status:', error);
          }
          return { needsMigration: false, localStorageData: null };
        },

        // 迁移到数据库
        migrateToDatabase: async () => {
          try {
            const { needsMigration, localStorageData } = get().checkMigrationStatus();

            if (!needsMigration) {
              return true;
            }

            console.log('Starting migration to database...');

            // 这里应该调用数据库store的迁移方法
            // 暂时返回成功
            return true;
          } catch (error) {
            console.error('Migration failed:', error);
            return false;
          }
        },

        // 创建项目
        createProject: async (name: string, description?: string) => {
          try {
            set({ isLoading: true, error: null });

            // 直接使用API创建项目
            const response = await fetch(`${window.location.origin}/api/projects`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                description: description || '',
                userId: '00000000-0000-0000-0000-000000000001',
                status: 'active',
                settings: {
                  resolution: { width: 1920, height: 1080 },
                  quality: 'high',
                  audioBitrate: 128,
                  videoBitrate: 5000
                },
                metadata: {}
              })
            });

            if (!response.ok) {
              throw new Error(`Failed to create project: ${response.statusText}`);
            }

            const data = await response.json();
            const newProject = {
              id: data.data.id,
              name: data.data.name,
              description: data.data.description || '',
              createdAt: new Date(data.data.createdAt),
              updatedAt: new Date(data.data.updatedAt),
              scenes: [],
              settings: data.data.settings
            };

            set(state => ({
              projects: [...state.projects, newProject],
              currentProject: newProject,
              timeline: null,
              isLoading: false
            }));
          } catch (error) {
            console.error('Failed to create project:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to create project',
              isLoading: false
            });
          }
        },

        // 更新项目
        updateProject: async (updates) => {
          try {
            set({ isLoading: true, error: null });

            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const databaseStore = useDatabaseProjectStore.getState();
            const updatedProject = await databaseStore.updateProject(currentProject.id, updates);

            set(state => ({
              projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p),
              currentProject: updatedProject,
              isLoading: false
            }));
          } catch (error) {
            console.error('Failed to update project:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to update project',
              isLoading: false
            });
          }
        },

        // 删除项目
        deleteProject: async (projectId) => {
          try {
            set({ isLoading: true, error: null });

            const databaseStore = useDatabaseProjectStore.getState();
            await databaseStore.deleteProject(projectId);

            set(state => ({
              projects: state.projects.filter(p => p.id !== projectId),
              currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
              timeline: state.currentProject?.id === projectId ? null : state.timeline,
              isLoading: false
            }));
          } catch (error) {
            console.error('Failed to delete project:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to delete project',
              isLoading: false
            });
          }
        },

        // 设置当前项目
        setCurrentProject: async (projectId) => {
          try {
            const { projects } = get();
            const project = projects.find(p => p.id === projectId);

            if (project) {
              set({ currentProject: project });
            } else {
              // 从数据库加载项目
              const databaseStore = useDatabaseProjectStore.getState();
              await databaseStore.loadProjects();
              const allProjects = databaseStore.projects;
              const dbProject = allProjects.find(p => p.id === projectId);

              if (dbProject) {
                set(state => ({
                  currentProject: dbProject,
                  projects: state.projects.some(p => p.id === projectId)
                    ? state.projects.map(p => p.id === projectId ? dbProject : p)
                    : [...state.projects, dbProject]
                }));
              } else {
                throw new Error('Project not found');
              }
            }
          } catch (error) {
            console.error('Failed to set current project:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to set current project'
            });
          }
        },

        // 从CSV导入场景
        importScenesFromCSV: async (scenes: CSVSceneData[]) => {
          try {
            set({ isLoading: true, error: null });

            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const databaseStore = useDatabaseProjectStore.getState();
            const importedScenes = await databaseStore.importScenes(currentProject.id, scenes);

            // Wait a bit to ensure all database operations are complete
            await new Promise(resolve => setTimeout(resolve, 200));

            // 重新加载完整的场景数据而不是只使用导入的场景
            await databaseStore.loadProjectScenes(currentProject.id);

            // Wait for database operations to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // 获取最新的完整项目数据
            const refreshedDatabaseStore = useDatabaseProjectStore.getState();
            const refreshedProject = refreshedDatabaseStore.currentProject;

            if (refreshedProject && refreshedProject.id === currentProject.id) {
              set(state => ({
                projects: state.projects.map(p => p.id === currentProject.id ? refreshedProject : p),
                currentProject: refreshedProject,
                isLoading: false
              }));

              console.log(`✅ Successfully imported ${scenes.length} scenes, total scenes now: ${refreshedProject.scenes?.length || 0}`);
            } else {
              // 如果刷新失败，至少使用导入的场景数据
              const updatedProject = {
                ...currentProject,
                scenes: importedScenes,
                updatedAt: new Date()
              };

              set(state => ({
                projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
                currentProject: updatedProject,
                isLoading: false
              }));

              console.warn(`⚠️ Project refresh failed, using imported scenes only. Imported: ${importedScenes.length}`);
            }
          } catch (error) {
            console.error('Failed to import scenes:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to import scenes',
              isLoading: false
            });
            throw error; // Re-throw to allow the CSV component to handle it
          }
        },

        // 添加场景
        addScene: async (sceneData) => {
          try {
            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const databaseStore = useDatabaseProjectStore.getState();
            const newScene = await databaseStore.createScene(currentProject.id, sceneData);

            const updatedProject = {
              ...currentProject,
              scenes: [...currentProject.scenes, newScene],
              updatedAt: new Date()
            };

            set(state => ({
              projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
              currentProject: updatedProject
            }));
          } catch (error) {
            console.error('Failed to add scene:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to add scene'
            });
          }
        },

        // 更新场景
        updateScene: async (sceneId, updates) => {
          try {
            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const databaseStore = useDatabaseProjectStore.getState();
            const updatedScene = await databaseStore.updateScene(sceneId, updates);

            const updatedProject = {
              ...currentProject,
              scenes: currentProject.scenes.map(s => s.id === sceneId ? updatedScene : s),
              updatedAt: new Date()
            };

            set(state => ({
              projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
              currentProject: updatedProject
            }));
          } catch (error) {
            console.error('Failed to update scene:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to update scene'
            });
          }
        },

        // 删除场景
        deleteScene: async (sceneId) => {
          try {
            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const databaseStore = useDatabaseProjectStore.getState();
            await databaseStore.deleteScene(sceneId);

            const updatedProject = {
              ...currentProject,
              scenes: currentProject.scenes.filter(s => s.id !== sceneId),
              updatedAt: new Date()
            };

            set(state => ({
              projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
              currentProject: updatedProject
            }));
          } catch (error) {
            console.error('Failed to delete scene:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to delete scene'
            });
          }
        },

        // 重新排序场景
        reorderScenes: async (fromIndex: number, toIndex: number) => {
          try {
            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const newScenes = [...currentProject.scenes];
            const [movedScene] = newScenes.splice(fromIndex, 1);
            newScenes.splice(toIndex, 0, movedScene);

            // 更新场景顺序
            const databaseStore = useDatabaseProjectStore.getState();
            await Promise.all(
              newScenes.map((scene, index) =>
                databaseStore.updateScene(scene.id, { sceneNumber: index + 1 })
              )
            );

            const updatedProject = {
              ...currentProject,
              scenes: newScenes,
              updatedAt: new Date()
            };

            set(state => ({
              projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
              currentProject: updatedProject
            }));
          } catch (error) {
            console.error('Failed to reorder scenes:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to reorder scenes'
            });
          }
        },

        // 添加生成的图片
        addGeneratedImages: async (sceneId, images) => {
          try {
            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const databaseStore = useDatabaseProjectStore.getState();
            await databaseStore.addGeneratedImages(sceneId, images);

            // 更新场景中的图片
            const scene = currentProject.scenes.find(s => s.id === sceneId);
            if (scene) {
              const updatedScene = {
                ...scene,
                images: [...scene.images, ...images],
                updatedAt: new Date()
              };

              const updatedProject = {
                ...currentProject,
                scenes: currentProject.scenes.map(s => s.id === sceneId ? updatedScene : s),
                updatedAt: new Date()
              };

              set(state => ({
                projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
                currentProject: updatedProject
              }));
            }
          } catch (error) {
            console.error('Failed to add generated images:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to add generated images'
            });
          }
        },

        // 添加生成的视频
        addGeneratedVideo: async (sceneId, video) => {
          try {
            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            // 更新场景中的视频
            const scene = currentProject.scenes.find(s => s.id === sceneId);
            if (scene) {
              // Check if video already exists to prevent duplicates
              const existingVideo = scene.generatedVideos.find(v => v.id === video.id || v.url === video.url);

              if (existingVideo) {
                console.log(`📹 [addGeneratedVideo] Video already exists, skipping addition: ${video.id}`);
                return; // Skip adding if video already exists
              }

              const updatedScene = {
                ...scene,
                generatedVideos: [...scene.generatedVideos, video],
                updatedAt: new Date()
              };

              const updatedProject = {
                ...currentProject,
                scenes: currentProject.scenes.map(s => s.id === sceneId ? updatedScene : s),
                updatedAt: new Date()
              };

              set(state => ({
                projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
                currentProject: updatedProject
              }));

              console.log(`📹 [addGeneratedVideo] Added new video to scene: ${video.id}`);
            }
          } catch (error) {
            console.error('Failed to add generated video:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to add generated video'
            });
          }
        },

        // 选择图片
        selectImage: async (sceneId, imageId) => {
          try {
            const { currentProject } = get();
            if (!currentProject) {
              throw new Error('No current project selected');
            }

            const databaseStore = useDatabaseProjectStore.getState();
            await databaseStore.selectImage(sceneId, imageId);

            // 更新场景的选中图片
            const scene = currentProject.scenes.find(s => s.id === sceneId);
            if (scene) {
              const updatedScene = {
                ...scene,
                selectedImageId: imageId,
                updatedAt: new Date()
              };

              const updatedProject = {
                ...currentProject,
                scenes: currentProject.scenes.map(s => s.id === sceneId ? updatedScene : s),
                updatedAt: new Date()
              };

              set(state => ({
                projects: state.projects.map(p => p.id === currentProject.id ? updatedProject : p),
                currentProject: updatedProject
              }));
            }
          } catch (error) {
            console.error('Failed to select image:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to select image'
            });
          }
        },

        // 切换图片选择
        toggleImageSelection: async (sceneId, imageId) => {
          const { selectedImagesPerScene } = get();
          const currentSelection = selectedImagesPerScene[sceneId] || [];

          let newSelection: string[];
          if (currentSelection.includes(imageId)) {
            newSelection = currentSelection.filter(id => id !== imageId);
          } else {
            newSelection = [...currentSelection, imageId];
          }

          set(state => ({
            selectedImagesPerScene: {
              ...state.selectedImagesPerScene,
              [sceneId]: newSelection
            }
          }));
        },

        // 选择多个图片
        selectMultipleImages: async (sceneId, imageIds) => {
          set(state => ({
            selectedImagesPerScene: {
              ...state.selectedImagesPerScene,
              [sceneId]: imageIds
            }
          }));
        },

        // 清除场景选择
        clearSceneSelection: async (sceneId) => {
          set(state => {
            const newSelection = { ...state.selectedImagesPerScene };
            delete newSelection[sceneId];
            return { selectedImagesPerScene: newSelection };
          });
        },

        // 选择场景所有图片
        selectAllSceneImages: async (sceneId) => {
          const { currentProject } = get();
          if (!currentProject) return;

          const scene = currentProject.scenes.find(s => s.id === sceneId);
          if (scene) {
            const imageIds = scene.images.map(img => img.id);
            set(state => ({
              selectedImagesPerScene: {
                ...state.selectedImagesPerScene,
                [sceneId]: imageIds
              }
            }));
          }
        },

        // 获取场景选中的图片
        getSceneSelectedImages: (sceneId) => {
          const { selectedImagesPerScene } = get();
          return selectedImagesPerScene[sceneId] || [];
        },

        // 检查图片是否被选中
        isImageSelected: (sceneId, imageId) => {
          const { selectedImagesPerScene } = get();
          return (selectedImagesPerScene[sceneId] || []).includes(imageId);
        },

        // 设置时间轴
        setTimeline: (timeline) => {
          set({ timeline });
        },

        // 清除时间轴
        clearTimeline: () => {
          set({ timeline: null });
        },

        // 更新设置
        updateSettings: (newSettings) => {
          set(state => ({
            settings: state.settings ? { ...state.settings, ...newSettings } : newSettings as ProjectSettings
          }));
        },

        // 清除错误
        clearError: () => {
          set({ error: null });
        }
      }),
      {
        name: 'video-workstation-storage',
        storage: createJSONStorage(() => localStorage, {
          replacer: (key, value) => {
            if (value instanceof Date) {
              return { __type: 'Date', value: value.toISOString() };
            }
            return value;
          },
          reviver: (key, value) => {
            if (value && typeof value === 'object' && value.__type === 'Date') {
              return new Date(value.value);
            }
            return value;
          }
        }),
        partialize: (state) => ({
          currentProject: state.currentProject,
          selectedImagesPerScene: state.selectedImagesPerScene,
          settings: state.settings
        })
      }
    )
  );
};

export const useProjectStore = createProjectStoreAdapter();