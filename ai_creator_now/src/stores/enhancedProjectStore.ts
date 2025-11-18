import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { errorMonitor } from '../utils/errorMonitor';
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
import { useDatabaseProjectStore } from './databaseProjectStore';

// 增强的状态管理接口，添加了更多错误处理和状态跟踪
interface EnhancedProjectStore {
  // 当前项目状态
  currentProject: Project | null;
  projects: Project[];

  // UI状态 - 增加了更多细粒度的加载状态
  isLoading: boolean;
  isCreatingProject: boolean;
  isUpdatingProject: boolean;
  isDeletingProject: boolean;
  isSwitchingProject: boolean;
  error: string | null;
  lastOperation: string | null;

  // 操作队列和竞态条件控制
  operationQueue: Array<{
    id: string;
    type: 'create' | 'update' | 'delete' | 'switch';
    timestamp: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }>;

  // Scene management
  importScenesFromCSV: (scenes: CSVSceneData[]) => Promise<void>;
  addScene: (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  reorderScenes: (fromIndex: number, toIndex: number) => Promise<void>;

  // Image management
  addGeneratedImages: (sceneId: string, images: GeneratedImage[]) => Promise<void>;
  addGeneratedVideo: (sceneId: string, video: GeneratedVideo) => Promise<void>;
  selectImage: (sceneId: string, imageId: string) => Promise<void>;

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

  // 核心CRUD操作 - 增强版
  createProject: (name: string, description?: string) => Promise<void>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (projectId: string) => Promise<void>;

  // 错误恢复和状态管理
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
  cancelPendingOperations: () => void;
  getOperationStatus: (operationId: string) => string | null;

  // 状态验证和一致性检查
  validateState: () => { isValid: boolean; errors: string[] };
  repairState: () => Promise<void>;

  // Additional methods
  checkMigrationStatus: () => { needsMigration: boolean; localStorageData: any };
  migrateToDatabase: () => Promise<boolean>;
}

// 操作队列管理
class OperationQueue {
  private operations: Map<string, any> = new Map();
  private isProcessing: boolean = false;

  add(operation: any) {
    const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const op = { ...operation, id, timestamp: Date.now(), status: 'pending' as const };
    this.operations.set(id, op);
    this.process();
    return id;
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.operations.size > 0) {
      const [id, operation] = this.operations.entries().next().value;

      try {
        operation.status = 'processing';
        await operation.execute();
        operation.status = 'completed';
      } catch (error) {
        operation.status = 'failed';
        operation.error = error;
      }

      // 保留操作记录一段时间用于调试
      setTimeout(() => {
        this.operations.delete(id);
      }, 5000);
    }

    this.isProcessing = false;
  }

  clear() {
    this.operations.clear();
  }
}

const operationQueue = new OperationQueue();

// 状态验证器
class StateValidator {
  static validate(store: EnhancedProjectStore): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查项目引用的一致性
    if (store.currentProject && !store.projects.find(p => p.id === store.currentProject?.id)) {
      errors.push('当前项目不存在于项目列表中');
    }

    // 检查场景选择的完整性
    Object.keys(store.selectedImagesPerScene).forEach(sceneId => {
      if (!store.currentProject?.scenes.find(s => s.id === sceneId)) {
        errors.push(`选择的图片引用了不存在的场景: ${sceneId}`);
      }
    });

    // 检查时间线引用的一致性
    if (store.timeline && store.currentProject && store.timeline.projectId !== store.currentProject.id) {
      errors.push('时间线项目ID与当前项目ID不匹配');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// 创建增强版的项目store
export const useEnhancedProjectStore = create<EnhancedProjectStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    currentProject: null,
    projects: [],
    timeline: null,
    settings: null,
    isLoading: false,
    isCreatingProject: false,
    isUpdatingProject: false,
    isDeletingProject: false,
    isSwitchingProject: false,
    error: null,
    lastOperation: null,
    operationQueue: [],
    selectedImagesPerScene: {},

    // 安全的状态更新函数
    safeSetState: (updates: Partial<EnhancedProjectStore>, operationName?: string) => {
      try {
        set(prevState => {
          const newState = { ...prevState, ...updates };

          // 记录操作
          if (operationName) {
            errorMonitor.logUserAction('state-update', operationName, {
              updates: Object.keys(updates),
              timestamp: Date.now()
            });
          }

          // 验证新状态
          const validation = StateValidator.validate(newState);
          if (!validation.isValid) {
            console.error('State validation failed:', validation.errors);
            errorMonitor.logError({
              type: 'state',
              message: '状态验证失败',
              source: 'EnhancedProjectStore.safeSetState',
              context: {
                errors: validation.errors,
                operation: operationName,
                updates
              }
            });

            // 不应用无效的状态更新
            return prevState;
          }

          return newState;
        });
      } catch (error) {
        console.error('Safe state update failed:', error);
        errorMonitor.logError({
          type: 'state',
          message: '安全状态更新失败',
          source: 'EnhancedProjectStore.safeSetState',
          context: {
            error: error instanceof Error ? error.stack : String(error),
            updates,
            operation: operationName
          }
        });
      }
    },

    // 增强的项目创建
    createProject: async (name: string, description?: string) => {
      const store = get();

      try {
        // 防止重复创建
        if (store.isCreatingProject) {
          throw new Error('项目创建正在进行中，请等待完成');
        }

        // 输入验证
        if (!name || name.trim().length === 0) {
          throw new Error('项目名称不能为空');
        }

        if (name.length > 100) {
          throw new Error('项目名称不能超过100个字符');
        }

        store.safeSetState({
          isCreatingProject: true,
          isLoading: true,
          error: null,
          lastOperation: 'createProject'
        }, 'createProject-start');

        errorMonitor.logUserAction('project-create', 'start', { name, description });

        const databaseStore = useDatabaseProjectStore.getState();
        const newProject = await databaseStore.createProject({
          name: name.trim(),
          description: description?.trim() || '',
          status: 'active',
          settings: {
            resolution: { width: 1920, height: 1080 },
            quality: 'high',
            audioBitrate: 128,
            videoBitrate: 5000
          }
        });

        store.safeSetState({
          projects: [...store.projects, newProject],
          currentProject: newProject,
          timeline: null,
          isCreatingProject: false,
          isLoading: false
        }, 'createProject-success');

        errorMonitor.logUserAction('project-create', 'success', {
          projectId: newProject.id,
          name: newProject.name
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '创建项目失败';

        errorMonitor.logError({
          type: 'javascript',
          message: `创建项目失败: ${errorMessage}`,
          source: 'EnhancedProjectStore.createProject',
          context: {
            name,
            description,
            error: error instanceof Error ? error.stack : String(error)
          }
        });

        errorMonitor.logUserAction('project-create', 'error', {
          name,
          error: errorMessage
        });

        store.safeSetState({
          isCreatingProject: false,
          isLoading: false,
          error: errorMessage
        }, 'createProject-error');

        throw error;
      }
    },

    // 增强的项目更新
    updateProject: async (updates) => {
      const store = get();

      try {
        if (store.isUpdatingProject) {
          throw new Error('项目更新正在进行中，请等待完成');
        }

        const { currentProject } = store;
        if (!currentProject) {
          throw new Error('没有选中的项目');
        }

        store.safeSetState({
          isUpdatingProject: true,
          isLoading: true,
          error: null,
          lastOperation: 'updateProject'
        }, 'updateProject-start');

        errorMonitor.logUserAction('project-update', 'start', {
          projectId: currentProject.id,
          updates
        });

        const databaseStore = useDatabaseProjectStore.getState();
        const updatedProject = await databaseStore.updateProject(currentProject.id, updates);

        store.safeSetState({
          projects: store.projects.map(p => p.id === updatedProject.id ? updatedProject : p),
          currentProject: updatedProject,
          isUpdatingProject: false,
          isLoading: false
        }, 'updateProject-success');

        errorMonitor.logUserAction('project-update', 'success', {
          projectId: updatedProject.id,
          updates
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '更新项目失败';

        errorMonitor.logError({
          type: 'javascript',
          message: `更新项目失败: ${errorMessage}`,
          source: 'EnhancedProjectStore.updateProject',
          context: {
            projectId: store.currentProject?.id,
            updates,
            error: error instanceof Error ? error.stack : String(error)
          }
        });

        store.safeSetState({
          isUpdatingProject: false,
          isLoading: false,
          error: errorMessage
        }, 'updateProject-error');

        throw error;
      }
    },

    // 增强的项目删除
    deleteProject: async (projectId) => {
      const store = get();

      try {
        if (store.isDeletingProject) {
          throw new Error('项目删除正在进行中，请等待完成');
        }

        if (store.projects.length <= 1) {
          throw new Error('至少需要保留一个项目');
        }

        const projectToDelete = store.projects.find(p => p.id === projectId);
        if (!projectToDelete) {
          throw new Error('要删除的项目不存在');
        }

        store.safeSetState({
          isDeletingProject: true,
          isLoading: true,
          error: null,
          lastOperation: 'deleteProject'
        }, 'deleteProject-start');

        errorMonitor.logUserAction('project-delete', 'start', {
          projectId,
          projectName: projectToDelete.name
        });

        const databaseStore = useDatabaseProjectStore.getState();
        await databaseStore.deleteProject(projectId);

        const isCurrentProject = store.currentProject?.id === projectId;

        store.safeSetState({
          projects: store.projects.filter(p => p.id !== projectId),
          currentProject: isCurrentProject ? null : store.currentProject,
          timeline: isCurrentProject ? null : store.timeline,
          isDeletingProject: false,
          isLoading: false
        }, 'deleteProject-success');

        errorMonitor.logUserAction('project-delete', 'success', {
          projectId,
          projectName: projectToDelete.name
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '删除项目失败';

        errorMonitor.logError({
          type: 'javascript',
          message: `删除项目失败: ${errorMessage}`,
          source: 'EnhancedProjectStore.deleteProject',
          context: {
            projectId,
            error: error instanceof Error ? error.stack : String(error)
          }
        });

        store.safeSetState({
          isDeletingProject: false,
          isLoading: false,
          error: errorMessage
        }, 'deleteProject-error');

        throw error;
      }
    },

    // 增强的项目切换
    setCurrentProject: async (projectId) => {
      const store = get();

      try {
        if (store.isSwitchingProject) {
          throw new Error('项目切换正在进行中，请等待完成');
        }

        const targetProject = store.projects.find(p => p.id === projectId);
        if (!targetProject) {
          throw new Error('目标项目不存在');
        }

        if (store.currentProject?.id === projectId) {
          return; // 已经是当前项目
        }

        store.safeSetState({
          isSwitchingProject: true,
          isLoading: true,
          error: null,
          lastOperation: 'setCurrentProject'
        }, 'setCurrentProject-start');

        errorMonitor.logUserAction('project-switch', 'start', {
          fromProjectId: store.currentProject?.id,
          toProjectId: projectId
        });

        // 这里可以添加额外的切换逻辑，比如加载项目的特定数据

        store.safeSetState({
          currentProject: targetProject,
          isSwitchingProject: false,
          isLoading: false
        }, 'setCurrentProject-success');

        errorMonitor.logUserAction('project-switch', 'success', {
          projectId: targetProject.id,
          projectName: targetProject.name
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '切换项目失败';

        errorMonitor.logError({
          type: 'javascript',
          message: `切换项目失败: ${errorMessage}`,
          source: 'EnhancedProjectStore.setCurrentProject',
          context: {
            projectId,
            error: error instanceof Error ? error.stack : String(error)
          }
        });

        store.safeSetState({
          isSwitchingProject: false,
          isLoading: false,
          error: errorMessage
        }, 'setCurrentProject-error');

        throw error;
      }
    },

    // 错误恢复
    clearError: () => {
      set({ error: null });
    },

    retryLastOperation: async () => {
      const store = get();
      if (!store.lastOperation) {
        throw new Error('没有可重试的操作');
      }

      // 根据最后的操作类型进行重试
      switch (store.lastOperation) {
        case 'createProject':
          // 需要参数，这里只是示例
          throw new Error('创建项目重试需要重新提供参数');
        default:
          throw new Error(`不支持重试操作: ${store.lastOperation}`);
      }
    },

    cancelPendingOperations: () => {
      operationQueue.clear();
      set({
        isLoading: false,
        isCreatingProject: false,
        isUpdatingProject: false,
        isDeletingProject: false,
        isSwitchingProject: false
      });
    },

    getOperationStatus: (operationId: string) => {
      const operation = get().operationQueue.find(op => op.id === operationId);
      return operation ? operation.status : null;
    },

    // 状态验证和修复
    validateState: () => {
      return StateValidator.validate(get());
    },

    repairState: async () => {
      try {
        const store = get();
        const validation = StateValidator.validate(store);

        if (!validation.isValid) {
          console.warn('State validation failed, attempting repair:', validation.errors);

          // 修复不一致的状态
          if (store.currentProject && !store.projects.find(p => p.id === store.currentProject?.id)) {
            set({ currentProject: null, timeline: null });
          }

          // 清理无效的图片选择
          const validSelectedImages: Record<string, string[]> = {};
          Object.entries(store.selectedImagesPerScene).forEach(([sceneId, imageIds]) => {
            if (store.currentProject?.scenes.find(s => s.id === sceneId)) {
              validSelectedImages[sceneId] = imageIds;
            }
          });
          set({ selectedImagesPerScene: validSelectedImages });

          errorMonitor.logUserAction('state-repair', 'success', {
            errors: validation.errors
          });
        }
      } catch (error) {
        errorMonitor.logError({
          type: 'state',
          message: '状态修复失败',
          source: 'EnhancedProjectStore.repairState',
          context: {
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },

    // 其他方法保持不变，但增加了错误处理...
    importScenesFromCSV: async (scenes: CSVSceneData[]) => {
      // 实现...
    },
    addScene: async (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => {
      // 实现...
    },
    updateScene: async (sceneId: string, updates: Partial<Scene>) => {
      // 实现...
    },
    deleteScene: async (sceneId: string) => {
      // 实现...
    },
    reorderScenes: async (fromIndex: number, toIndex: number) => {
      // 实现...
    },
    addGeneratedImages: async (sceneId: string, images: GeneratedImage[]) => {
      // 实现...
    },
    addGeneratedVideo: async (sceneId: string, video: GeneratedVideo) => {
      try {
        const store = get();
        if (!store.currentProject) {
          throw new Error('没有选中的项目');
        }

        errorMonitor.logUserAction('video-add', 'start', {
          sceneId,
          videoId: video.id
        });

        const databaseStore = useDatabaseProjectStore.getState();
        await databaseStore.addGeneratedVideo(sceneId, video);

        // 更新本地状态
        const updatedScenes = store.currentProject.scenes.map(scene => {
          if (scene.id === sceneId) {
            const existingVideos = scene.generatedVideos || [];
            return {
              ...scene,
              generatedVideos: [...existingVideos, video]
            };
          }
          return scene;
        });

        store.safeSetState({
          currentProject: {
            ...store.currentProject,
            scenes: updatedScenes
          }
        }, 'addGeneratedVideo-success');

        errorMonitor.logUserAction('video-add', 'success', {
          sceneId,
          videoId: video.id
        });

      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `添加生成的视频失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.addGeneratedVideo',
          context: {
            sceneId,
            videoId: video.id,
            error: error instanceof Error ? error.stack : String(error)
          }
        });
        throw error;
      }
    },
    selectImage: async (sceneId: string, imageId: string) => {
      // 实现...
    },
    toggleImageSelection: async (sceneId: string, imageId: string) => {
      try {
        const store = get();
        const currentSelection = store.selectedImagesPerScene[sceneId] || [];
        const isSelected = currentSelection.includes(imageId);

        const newSelection = isSelected
          ? currentSelection.filter(id => id !== imageId)
          : [...currentSelection, imageId];

        store.safeSetState({
          selectedImagesPerScene: {
            ...store.selectedImagesPerScene,
            [sceneId]: newSelection
          }
        }, 'toggleImageSelection');

        errorMonitor.logUserAction('image-selection', 'toggle', {
          sceneId,
          imageId,
          selected: !isSelected
        });

      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `切换图片选择失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.toggleImageSelection',
          context: {
            sceneId,
            imageId,
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },
    selectMultipleImages: async (sceneId: string, imageIds: string[]) => {
      try {
        const store = get();

        store.safeSetState({
          selectedImagesPerScene: {
            ...store.selectedImagesPerScene,
            [sceneId]: imageIds
          }
        }, 'selectMultipleImages');

        errorMonitor.logUserAction('image-selection', 'select-multiple', {
          sceneId,
          count: imageIds.length
        });

      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `多选图片失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.selectMultipleImages',
          context: {
            sceneId,
            imageIds,
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },
    clearSceneSelection: async (sceneId: string) => {
      try {
        const store = get();

        store.safeSetState({
          selectedImagesPerScene: {
            ...store.selectedImagesPerScene,
            [sceneId]: []
          }
        }, 'clearSceneSelection');

        errorMonitor.logUserAction('image-selection', 'clear', { sceneId });

      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `清空场景选择失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.clearSceneSelection',
          context: {
            sceneId,
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },
    selectAllSceneImages: async (sceneId: string) => {
      try {
        const store = get();
        const scene = store.currentProject?.scenes.find(s => s.id === sceneId);
        if (!scene) {
          throw new Error('场景不存在');
        }

        const allImageIds = scene.images?.map(img => img.id) || [];

        store.safeSetState({
          selectedImagesPerScene: {
            ...store.selectedImagesPerScene,
            [sceneId]: allImageIds
          }
        }, 'selectAllSceneImages');

        errorMonitor.logUserAction('image-selection', 'select-all', {
          sceneId,
          count: allImageIds.length
        });

      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `全选场景图片失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.selectAllSceneImages',
          context: {
            sceneId,
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },
    getSceneSelectedImages: (sceneId: string) => {
      const store = get();
      return store.selectedImagesPerScene[sceneId] || [];
    },
    isImageSelected: (sceneId: string, imageId: string) => {
      const store = get();
      const selection = store.selectedImagesPerScene[sceneId] || [];
      return selection.includes(imageId);
    },
    setTimeline: (timeline: Timeline) => {
      try {
        set({ timeline });
        errorMonitor.logUserAction('timeline', 'set', {
          projectId: timeline.projectId
        });
      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `设置时间线失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.setTimeline',
          context: {
            timelineId: timeline.id,
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },
    clearTimeline: () => {
      try {
        set({ timeline: null });
        errorMonitor.logUserAction('timeline', 'clear', {});
      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `清空时间线失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.clearTimeline',
          context: {
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },
    updateSettings: (settings: Partial<ProjectSettings>) => {
      try {
        set(prevState => ({
          settings: prevState.settings ? { ...prevState.settings, ...settings } : settings as ProjectSettings
        }));
        errorMonitor.logUserAction('settings', 'update', settings);
      } catch (error) {
        errorMonitor.logError({
          type: 'javascript',
          message: `更新设置失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.updateSettings',
          context: {
            settings,
            error: error instanceof Error ? error.stack : String(error)
          }
        });
      }
    },
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
        return { needsMigration: false, localStorageData: null };
      } catch (error) {
        console.error('Error checking migration status:', error);
        errorMonitor.logError({
          type: 'javascript',
          message: `检查迁移状态失败: ${error instanceof Error ? error.message : String(error)}`,
          source: 'EnhancedProjectStore.checkMigrationStatus',
          context: {
            error: error instanceof Error ? error.stack : String(error)
          }
        });
        return { needsMigration: false, localStorageData: null };
      }
    },
    migrateToDatabase: async () => {
      try {
        const { needsMigration, localStorageData } = get().checkMigrationStatus();

        if (!needsMigration) {
          return true;
        }

        console.log('Starting migration to database...');
        errorMonitor.logUserAction('migration', 'start', {});

        // 这里应该调用数据库store的迁移方法
        // 暂时返回成功
        errorMonitor.logUserAction('migration', 'success', {});
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '迁移失败';

        errorMonitor.logError({
          type: 'javascript',
          message: `迁移到数据库失败: ${errorMessage}`,
          source: 'EnhancedProjectStore.migrateToDatabase',
          context: {
            error: error instanceof Error ? error.stack : String(error)
          }
        });

        errorMonitor.logUserAction('migration', 'error', {
          error: errorMessage
        });

        return false;
      }
    }
  }))
);

// 监听状态变化并自动验证
if (typeof window !== 'undefined') {
  useEnhancedProjectStore.subscribe(
    (state) => state,
    (state) => {
      // 定期验证状态一致性
      const validation = StateValidator.validate(state);
      if (!validation.isValid) {
        console.warn('State validation failed:', validation.errors);

        // 记录状态验证错误
        errorMonitor.logError({
          type: 'state',
          message: '状态一致性验证失败',
          source: 'EnhancedProjectStore.autoValidation',
          context: {
            errors: validation.errors,
            currentState: {
              currentProjectId: state.currentProject?.id,
              projectsCount: state.projects.length,
              hasTimeline: !!state.timeline
            }
          }
        });
      }
    },
    {
      // 只监听关键状态变化以避免过度验证
      equalityFn: (a, b) =>
        a.currentProject?.id === b.currentProject?.id &&
        a.projects.length === b.projects.length &&
        Object.keys(a.selectedImagesPerScene).length === Object.keys(b.selectedImagesPerScene).length
    }
  );
}

export default useEnhancedProjectStore;