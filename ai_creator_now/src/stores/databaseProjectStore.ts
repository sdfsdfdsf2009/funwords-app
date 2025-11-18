import { create } from 'zustand';
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

// 数据库API服务
const API_BASE = '/api';

// 类型定义：数据库返回的项目数据
interface DBProject {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  status: string;
  settings: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  scenes: DBScene[];
}

interface DBScene {
  id: string;
  sceneNumber: number;
  title: string;
  description: string | null;
  videoPrompt: string | null;
  model: string | null;
  status: string;
  duration: number;
  projectId: string;
  transition: Record<string, any> | null;
  focusPeriods: Record<string, any> | null;
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  generatedVideos: GeneratedVideo[];
  generatedVideo?: GeneratedVideo;
  selectedImageId?: string;
  selectedVideoId?: string;
  selectedImageIds?: string[];
  imageSelectionState?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  mediaAssets: any[];
}

// 数据库映射函数
const mapDBProjectToProject = (dbProject: DBProject): Project => {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description || '',
    createdAt: new Date(dbProject.createdAt),
    updatedAt: new Date(dbProject.updatedAt),
    scenes: dbProject.scenes.map(mapDBSceneToScene),
    settings: dbProject.settings as ProjectSettings
  };
};

const mapDBSceneToScene = (dbScene: DBScene): Scene => {
  // Enhanced scene number validation with fallback
  const sceneNumber = dbScene.sceneNumber || parseInt(dbScene.id?.replace(/\D/g, '') || '1');

  // Find selected image from images array if selectedImageId exists
  const selectedImage = dbScene.selectedImageId
    ? dbScene.images.find(img => img.id === dbScene.selectedImageId)
    : undefined;

  // Enhanced imagePrompt mapping - 修复数据覆盖问题
  let imagePrompt = '';
  let promptSource = '';

  // First priority: description field (contains original image prompt from CSV)
  if (dbScene.description && dbScene.description.trim()) {
    imagePrompt = dbScene.description.trim();
    promptSource = 'description';
    console.debug(`[mapDBSceneToScene] Using description as imagePrompt: ${imagePrompt.substring(0, 50)}...`);
  }

  // Second priority: title field (may contain meaningful content from CSV)
  if (!imagePrompt && dbScene.title && dbScene.title.trim()) {
    // 检查是否是默认的"场景 X"格式，如果是则不使用
    if (!dbScene.title.match(/^场景\s+\d+$/) && !dbScene.title.match(/^Scene\s+\d+$/)) {
      imagePrompt = dbScene.title.trim();
      promptSource = 'title';
      console.debug(`[mapDBSceneToScene] Using title as imagePrompt: ${imagePrompt.substring(0, 50)}...`);
    }
  }

  // Last resort: create a meaningful default prompt
  if (!imagePrompt) {
    imagePrompt = `请为场景${sceneNumber}生成一张图片`;
    promptSource = 'default-meaningful';
    console.warn(`[mapDBSceneToScene] No valid imagePrompt found for scene ${sceneNumber}, using meaningful default`);
  }

  // Enhanced validation logging for debugging
  console.log(`[mapDBSceneToScene] Scene ${sceneNumber} (ID: ${dbScene.id}) imagePrompt mapping:`, {
    originalSceneNumber: dbScene.sceneNumber,
    validatedSceneNumber: sceneNumber,
    promptSource,
    imagePrompt: imagePrompt.substring(0, 100) + (imagePrompt.length > 100 ? '...' : ''),
    originalDescription: dbScene.description,
    originalTitle: dbScene.title,
    videoPrompt: dbScene.videoPrompt
  });

  return {
    id: dbScene.id,
    sceneNumber: sceneNumber,
    title: dbScene.title || `Scene ${sceneNumber}`,
    description: dbScene.description || '',
    imagePrompt: imagePrompt,
    videoPrompt: dbScene.videoPrompt || '',
    images: dbScene.images || [],
    createdAt: new Date(dbScene.createdAt),
    updatedAt: new Date(dbScene.updatedAt),
    generatedVideos: dbScene.generatedVideos || [],
    generatedVideo: dbScene.generatedVideo,
    selectedImage: selectedImage
  };
};

// API调用函数
const apiClient = {
  // 项目相关API
  async getProjects(userId: string, options?: { page?: number; limit?: number; search?: string; status?: string }) {
    const params = new URLSearchParams();
    params.append('userId', userId);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.status) params.append('status', options.status);

    const response = await fetch(`${API_BASE}/projects?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    const data = await response.json();
    return data.data.map(mapDBProjectToProject);
  },

  async createProject(projectData: { name: string; description?: string; userId?: string; settings?: ProjectSettings }) {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      },
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description || '',
        userId: projectData.userId || '00000000-0000-0000-0000-000000000001',
        status: 'draft',
        settings: projectData.settings || {},
        metadata: {}
      })
    });
    if (!response.ok) throw new Error('Failed to create project');
    const data = await response.json();
    return mapDBProjectToProject(data.data);
  },

  async updateProject(projectId: string, updates: Partial<Project>) {
    const response = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update project');
    const data = await response.json();
    return mapDBProjectToProject(data.data);
  },

  async deleteProject(projectId: string) {
    const response = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      }
    });
    if (!response.ok) throw new Error('Failed to delete project');
    return true;
  },

  // 场景相关API
  async getScenes(projectId: string) {
    const response = await fetch(`${API_BASE}/scenes?projectId=${projectId}`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch scenes');
    const data = await response.json();
    return data.data.map(mapDBSceneToScene);
  },

  async createScene(sceneData: {
    projectId: string;
    sceneNumber?: number;
    title: string;
    description?: string;
    videoPrompt?: string;
    duration?: number;
  }) {
    // Log scene creation for debugging
    console.log('[createScene] Creating scene with data:', {
      projectId: sceneData.projectId,
      sceneNumber: sceneData.sceneNumber,
      title: sceneData.title,
      hasSceneNumber: sceneData.sceneNumber !== undefined
    });

    const response = await fetch(`${API_BASE}/scenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      },
      body: JSON.stringify({
        title: sceneData.title,
        description: sceneData.description || '',
        videoPrompt: sceneData.videoPrompt || '',
        duration: sceneData.duration || 8,
        projectId: sceneData.projectId,
        ...(sceneData.sceneNumber !== undefined && { sceneNumber: sceneData.sceneNumber })
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle specific error scenarios with better user feedback
      if (response.status === 409) {
        // Scene number conflict
        throw new Error(errorData.message || 'Scene number conflict. Please try again.');
      }

      if (response.status === 503 && errorData.retryPossible) {
        // Scene allocation failed but can retry
        throw new Error(errorData.message || 'Temporary scene allocation issue. Please try again in a moment.');
      }

      if (response.status === 400) {
        // Bad request - likely invalid data
        throw new Error(errorData.error || 'Invalid scene data. Please check your input and try again.');
      }

      // General error handling
      const errorMessage = errorData.message || errorData.error || 'Failed to create scene';
      throw new Error(`${errorMessage} (${response.status})`);
    }

    const data = await response.json();

    console.log('[createScene] Scene created successfully:', {
      sceneId: data.data.id,
      sceneNumber: data.data.sceneNumber,
      title: data.data.title
    });

    return mapDBSceneToScene(data.data);
  },

  async updateScene(sceneId: string, updates: Partial<Scene>) {
    const response = await fetch(`${API_BASE}/scenes/${sceneId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update scene');
    const data = await response.json();
    return mapDBSceneToScene(data.data);
  },

  async deleteScene(sceneId: string) {
    const response = await fetch(`${API_BASE}/scenes/${sceneId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent || 'AI-Creator-App/1.0'
      }
    });
    if (!response.ok) throw new Error('Failed to delete scene');
    return true;
  }
};

interface DatabaseProjectStore {
  // Current project state
  currentProject: Project | null;
  projects: Project[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // User ID (固定为默认用户)
  userId: string;

  // Actions - 数据库版本
  loadProjects: (options?: { page?: number; limit?: number; search?: string; status?: string }) => Promise<void>;
  createProject: (projectData: { name: string; description?: string; status?: string; settings?: ProjectSettings }) => Promise<void>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (projectId: string) => void;
  refreshCurrentProject: () => Promise<void>;

  // Scene management - 数据库版本
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

  // Image management (保持原有逻辑，但在场景更新时同步到数据库)
  addGeneratedImages: (sceneId: string, images: GeneratedImage[]) => void;
  selectImage: (sceneId: string, imageId: string) => void;

  // Enhanced image selection (保持原有逻辑)
  selectedImagesPerScene: Record<string, string[]>;
  toggleImageSelection: (sceneId: string, imageId: string) => void;
  selectMultipleImages: (sceneId: string, imageIds: string[]) => void;
  clearSceneSelection: (sceneId: string) => void;
  selectAllSceneImages: (sceneId: string) => void;
  getSceneSelectedImages: (sceneId: string) => string[];
  isImageSelected: (sceneId: string, imageId: string) => boolean;
  clearAllImageSelections: () => void;

  // Video management (保持原有逻辑，但在场景更新时同步到数据库)
  addGeneratedVideo: (sceneId: string, video: GeneratedVideo) => void;
  removeGeneratedVideo: (sceneId: string, videoId: string) => void;
  clearSceneVideos: (sceneId: string) => void;

  // Timeline management (保持原有逻辑)
  timeline: Timeline | null;
  updateTimeline: (updates: Partial<Timeline>) => void;
  addAudioTrack: (audioTrack: AudioTrack) => void;
  updateAudioTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  removeAudioTrack: (trackId: string) => void;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Clear all data
  clearAllData: () => Promise<void>;
}

export const useDatabaseProjectStore = create<DatabaseProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  projects: [],
  timeline: null,
  isLoading: false,
  error: null,
  selectedImagesPerScene: {},
  userId: '00000000-0000-0000-0000-000000000001', // 默认用户ID

  // Database actions
  loadProjects: async (options) => {
    try {
      set({ isLoading: true, error: null });
      const projects = await apiClient.getProjects(get().userId, options);
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load projects',
        isLoading: false
      });
    }
  },

  createProject: async (projectData: { name: string; description?: string; status?: string; settings?: ProjectSettings }) => {
    try {
      set({ isLoading: true, error: null });
      const newProject = await apiClient.createProject({
        name: projectData.name,
        description: projectData.description,
        userId: get().userId,
        settings: projectData.settings
      });

      set(state => ({
        projects: [...state.projects, newProject],
        currentProject: newProject,
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

  updateProject: async (updates) => {
    try {
      set({ isLoading: true, error: null });

      if (!get().currentProject) {
        throw new Error('No current project selected');
      }

      const updatedProject = await apiClient.updateProject(get().currentProject!.id, updates);

      if (updatedProject) {
        set(state => ({
          currentProject: updatedProject,
          projects: state.projects.map(p =>
            p.id === updatedProject.id ? updatedProject : p
          ),
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update project',
        isLoading: false
      });
    }
  },

  deleteProject: async (projectId) => {
    try {
      set({ isLoading: true, error: null });
      await apiClient.deleteProject(projectId);

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

  setCurrentProject: (projectId) => {
    console.log(`[setCurrentProject] Setting project with ID: ${projectId}`);
    console.log(`[setCurrentProject] Available projects:`, get().projects.map(p => ({ id: p.id, name: p.name })));

    const project = get().projects.find(p => p.id === projectId);
    if (project) {
      console.log(`[setCurrentProject] Found project: ${project.name}`);

      // Load image selection state from database scenes
      const selectedImagesPerScene: Record<string, string[]> = {};
      project.scenes.forEach(scene => {
        if (scene.selectedImageIds && Array.isArray(scene.selectedImageIds)) {
          selectedImagesPerScene[scene.id] = scene.selectedImageIds;
        }
      });

      set({
        currentProject: project,
        timeline: null,
        selectedImagesPerScene
      });

      console.log(`[setCurrentProject] Successfully set current project to: ${project.name}`);
    } else {
      console.warn(`[setCurrentProject] Project with ID ${projectId} not found`);
      set({
        currentProject: null,
        timeline: null
      });
    }
  },

  refreshCurrentProject: async (retryCount = 0, expectedProjectId?: string) => {
    const currentProject = get().currentProject;
    if (!currentProject) return;

    // 使用传入的项目ID或当前项目ID
    const projectId = expectedProjectId || currentProject.id;
    const maxRetries = 3;
    const delays = [500, 1000, 2000]; // 递增延迟

    console.log(`[refreshCurrentProject] Starting refresh for project ${projectId} (attempt ${retryCount + 1})`);
    console.log(`[refreshCurrentProject] Current project ID: ${currentProject.id}, Expected project ID: ${expectedProjectId}`);

    try {
      // 添加短暂延迟，确保数据库事务完成
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, delays[retryCount - 1]));
      } else {
        // 第一次刷新稍等片刻，确保数据库写入完成
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 如果传入的项目ID与当前项目不匹配，先切换项目
      if (expectedProjectId && expectedProjectId !== currentProject.id) {
        console.warn(`[refreshCurrentProject] Project ID mismatch, switching to expected project: ${expectedProjectId}`);
        get().setCurrentProject(expectedProjectId);
        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 重新加载项目的场景数据
      await get().loadProjectScenes(projectId);

      // 验证刷新结果
      const refreshedProject = get().currentProject;
      const sceneCount = refreshedProject?.scenes?.length || 0;

      console.log(`[refreshCurrentProject] Successfully refreshed project ${projectId} with ${sceneCount} scenes (attempt ${retryCount + 1})`);
      console.log(`[refreshCurrentProject] Refreshed project ID: ${refreshedProject?.id}, expected: ${projectId}`);

      // 如果场景数量为0且不是最后一次尝试，可能存在时序问题
      if (sceneCount === 0 && retryCount < maxRetries) {
        console.warn(`[refreshCurrentProject] 场景数量为0，可能是时序问题，准备重试`);
        throw new Error('场景数据为空，准备重试');
      }

    } catch (error) {
      console.error(`Failed to refresh current project (attempt ${retryCount + 1}):`, error);

      // 重试机制
      if (retryCount < maxRetries) {
        console.log(`[refreshCurrentProject] Retrying in ${delays[retryCount]}ms...`);
        setTimeout(() => {
          get().refreshCurrentProject(retryCount + 1, expectedProjectId);
        }, delays[retryCount]);
      } else {
        // 最终失败处理
        console.error('[refreshCurrentProject] All retry attempts failed');
        set({
          error: '数据刷新失败，请手动刷新页面或重新导入数据'
        });
      }
    }
  },

  // Scene management - Database version
  loadProjectScenes: async (projectId) => {
    try {
      set({ isLoading: true, error: null });
      console.log(`[loadProjectScenes] Starting to load scenes for project ${projectId}`);

      const scenes = await apiClient.getScenes(projectId);
      console.log(`[loadProjectScenes] API returned ${scenes.length} scenes for project ${projectId}`, scenes.map(s => ({
        id: s.id,
        sceneNumber: s.sceneNumber,
        hasImagePrompt: !!s.imagePrompt,
        imagePromptLength: s.imagePrompt?.length || 0,
        hasVideoPrompt: !!s.videoPrompt,
        videoPromptLength: s.videoPrompt?.length || 0
      })));

      // Validate scene data integrity
      const scenesWithEmptyImagePrompt = scenes.filter(s => !s.imagePrompt || s.imagePrompt.trim() === '');
      if (scenesWithEmptyImagePrompt.length > 0) {
        console.warn(`[loadProjectScenes] Found ${scenesWithEmptyImagePrompt.length} scenes with empty imagePrompt`,
          scenesWithEmptyImagePrompt.map(s => ({ id: s.id, sceneNumber: s.sceneNumber, title: s.title })));
      }

      // 更新项目的场景数据
      set(state => {
        if (!state.currentProject || state.currentProject.id !== projectId) {
          console.log(`[loadProjectScenes] Project ID mismatch or no current project. Current: ${state.currentProject?.id}, Requested: ${projectId}`);
          return state;
        }

        const updatedProject = {
          ...state.currentProject,
          scenes,
          updatedAt: new Date()
        };

        console.log(`[loadProjectScenes] Updated project ${projectId} with ${scenes.length} scenes`);

        return {
          currentProject: updatedProject,
          projects: state.projects.map(p =>
            p.id === projectId ? updatedProject : p
          ),
          isLoading: false
        };
      });

      console.log(`[loadProjectScenes] Successfully loaded and set ${scenes.length} scenes for project ${projectId}`);
    } catch (error) {
      console.error('Failed to load scenes:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load scenes',
        isLoading: false
      });
    }
  },

  addScene: async (sceneData) => {
    try {
      set({ isLoading: true, error: null });

      if (!get().currentProject) {
        throw new Error('No current project selected');
      }

      const newScene = await apiClient.createScene({
        ...sceneData,
        projectId: get().currentProject!.id
      });

      set(state => {
        if (!state.currentProject) return state;

        const updatedProject = {
          ...state.currentProject,
          scenes: [...state.currentProject.scenes, newScene],
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
    } catch (error) {
      console.error('Failed to add scene:', error);

      // Enhanced error handling with user-friendly messages
      let errorMessage = 'Failed to add scene';

      if (error instanceof Error) {
        // Check for specific error patterns
        if (error.message.includes('scene number conflict')) {
          errorMessage = 'Scene number conflict detected. Please try again.';
        } else if (error.message.includes('Temporary scene allocation issue')) {
          errorMessage = 'Scene allocation is temporarily unavailable. Please wait a moment and try again.';
        } else if (error.message.includes('Invalid scene data')) {
          errorMessage = 'Invalid scene data. Please check your input and try again.';
        } else if (error.message.includes('(409)')) {
          errorMessage = 'Scene number conflict. The system will automatically retry with a different number.';
        } else if (error.message.includes('(503)')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else {
          errorMessage = error.message;
        }
      }

      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  updateScene: async (sceneId, updates) => {
    try {
      set({ isLoading: true, error: null });

      const updatedScene = await apiClient.updateScene(sceneId, updates);

      if (updatedScene) {
        set(state => {
          if (!state.currentProject) return state;

          const updatedScenes = state.currentProject.scenes.map(scene =>
            scene.id === sceneId ? updatedScene : scene
          );

          const updatedProject = {
            ...state.currentProject,
            scenes: updatedScenes,
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
      }
    } catch (error) {
      console.error('Failed to update scene:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update scene',
        isLoading: false
      });
    }
  },

  deleteScene: async (sceneId) => {
    try {
      set({ isLoading: true, error: null });
      await apiClient.deleteScene(sceneId);

      set(state => {
        if (!state.currentProject) return state;

        const updatedScenes = state.currentProject.scenes.filter(scene => scene.id !== sceneId);
        const updatedProject = {
          ...state.currentProject,
          scenes: updatedScenes,
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
    } catch (error) {
      console.error('Failed to delete scene:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete scene',
        isLoading: false
      });
    }
  },

  // 保持原有的本地状态管理方法
  addGeneratedImages: (sceneId, images) => {
    set(async (state) => {
      if (!state.currentProject) return state;

      // 更新本地状态
      const updatedScenes = state.currentProject.scenes.map(scene =>
        scene.id === sceneId
          ? { ...scene, images: [...scene.images, ...images], updatedAt: new Date() }
          : scene
      );

      const updatedProject = {
        ...state.currentProject,
        scenes: updatedScenes,
        updatedAt: new Date()
      };

      // 同步到数据库
      try {
        // 调用场景更新API
        const response = await fetch(`/api/scenes/${sceneId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            images: updatedScenes.find(s => s.id === sceneId)?.images || []
          })
        });

        if (!response.ok) {
          console.error('Failed to update scene in database:', await response.text());
        } else {
          console.log('✅ Scene updated in database with new images');
        }
      } catch (error) {
        console.error('Error updating scene in database:', error);
      }

      return {
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        )
      };
    });
  },

  selectImage: (sceneId, imageId) => {
    set(state => {
      if (!state.currentProject) return state;

      const updatedScenes = state.currentProject.scenes.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              selectedImage: scene.images.find(img => img.id === imageId),
              updatedAt: new Date()
            }
          : scene
      );

      const updatedProject = {
        ...state.currentProject,
        scenes: updatedScenes,
        updatedAt: new Date()
      };

      return {
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        )
      };
    });
  },

  // Enhanced image selection with database persistence
  toggleImageSelection: async (sceneId, imageId) => {
    const state = get();
    const currentSelection = state.selectedImagesPerScene[sceneId] || [];
    const isSelected = currentSelection.includes(imageId);

    const updatedSelection = isSelected
      ? currentSelection.filter(id => id !== imageId)
      : [...currentSelection, imageId];

    // Update local state first for responsive UI
    set(state => ({
      ...state,
      selectedImagesPerScene: {
        ...state.selectedImagesPerScene,
        [sceneId]: updatedSelection
      }
    }));

    // Then persist to database
    try {
      const response = await fetch(`${API_BASE}/scenes/${sceneId}/image-selection`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedImageIds: updatedSelection,
          imageSelectionState: {
            lastUpdated: new Date().toISOString(),
            totalSelected: updatedSelection.length
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update image selection in database');
      }

      // Refresh current project to sync with database
      await get().refreshCurrentProject();
    } catch (error) {
      console.error('Failed to persist image selection to database:', error);
      // Revert local state on error
      set(state => ({
        ...state,
        selectedImagesPerScene: {
          ...state.selectedImagesPerScene,
          [sceneId]: currentSelection
        }
      }));
    }
  },

  selectMultipleImages: async (sceneId, imageIds) => {
    // Update local state first for responsive UI
    set(state => ({
      ...state,
      selectedImagesPerScene: {
        ...state.selectedImagesPerScene,
        [sceneId]: imageIds
      }
    }));

    // Then persist to database
    try {
      const response = await fetch(`${API_BASE}/scenes/${sceneId}/image-selection`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedImageIds: imageIds,
          imageSelectionState: {
            lastUpdated: new Date().toISOString(),
            totalSelected: imageIds.length,
            batchSelection: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update multiple image selection in database');
      }

      // Refresh current project to sync with database
      await get().refreshCurrentProject();
    } catch (error) {
      console.error('Failed to persist multiple image selection to database:', error);
    }
  },

  clearSceneSelection: async (sceneId) => {
    // Update local state first for responsive UI
    set(state => ({
      ...state,
      selectedImagesPerScene: {
        ...state.selectedImagesPerScene,
        [sceneId]: []
      }
    }));

    // Then persist to database
    try {
      const response = await fetch(`${API_BASE}/scenes/${sceneId}/image-selection`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedImageIds: [],
          imageSelectionState: {
            lastUpdated: new Date().toISOString(),
            totalSelected: 0,
            cleared: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear scene selection in database');
      }

      // Refresh current project to sync with database
      await get().refreshCurrentProject();
    } catch (error) {
      console.error('Failed to clear scene selection in database:', error);
    }
  },

  selectAllSceneImages: (sceneId) => {
    set(state => {
      if (!state.currentProject) return state;

      const scene = state.currentProject.scenes.find(s => s.id === sceneId);
      if (!scene) return state;

      return {
        ...state,
        selectedImagesPerScene: {
          ...state.selectedImagesPerScene,
          [sceneId]: scene.images.map(img => img.id)
        }
      };
    });
  },

  getSceneSelectedImages: (sceneId) => {
    return get().selectedImagesPerScene[sceneId] || [];
  },

  isImageSelected: (sceneId, imageId) => {
    const selection = get().selectedImagesPerScene[sceneId] || [];
    return selection.includes(imageId);
  },

  clearAllImageSelections: () => {
    set(state => ({
      ...state,
      selectedImagesPerScene: {}
    }));
  },

  // Video management
  addGeneratedVideo: (sceneId, video) => {
    console.log(`🎬 [addGeneratedVideo] Adding video to scene:`, {
      sceneId,
      videoId: video.id,
      sourceImageId: video.sourceImageId,
      provider: video.provider
    });

    set(state => {
      if (!state.currentProject) {
        console.error(`❌ [addGeneratedVideo] No current project available`);
        return state;
      }

      const updatedScenes = state.currentProject.scenes.map(scene => {
        if (scene.id === sceneId) {
          let existingVideos = scene.generatedVideos || [];

          if (scene.generatedVideo && existingVideos.length === 0) {
            existingVideos = [scene.generatedVideo];
          }

          if (existingVideos.some(v => v.id === video.id)) {
            return scene;
          }

          const updatedVideos = [...existingVideos, video];

          return {
            ...scene,
            generatedVideos: updatedVideos,
            generatedVideo: video,
            updatedAt: new Date()
          };
        }
        return scene;
      });

      const updatedProject = {
        ...state.currentProject,
        scenes: updatedScenes,
        updatedAt: new Date()
      };

      return {
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        )
      };
    });
  },

  removeGeneratedVideo: (sceneId, videoId) => {
    set(state => {
      if (!state.currentProject) return state;

      const updatedScenes = state.currentProject.scenes.map(scene => {
        if (scene.id === sceneId) {
          const updatedVideos = (scene.generatedVideos || []).filter(v => v.id !== videoId);
          const newGeneratedVideo = updatedVideos.length > 0 ? updatedVideos[updatedVideos.length - 1] : undefined;

          return {
            ...scene,
            generatedVideos: updatedVideos,
            generatedVideo: newGeneratedVideo,
            updatedAt: new Date()
          };
        }
        return scene;
      });

      const updatedProject = {
        ...state.currentProject,
        scenes: updatedScenes,
        updatedAt: new Date()
      };

      return {
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        )
      };
    });
  },

  clearSceneVideos: (sceneId) => {
    set(state => {
      if (!state.currentProject) return state;

      const updatedScenes = state.currentProject.scenes.map(scene => {
        if (scene.id === sceneId) {
          return {
            ...scene,
            generatedVideos: [],
            generatedVideo: undefined,
            updatedAt: new Date()
          };
        }
        return scene;
      });

      const updatedProject = {
        ...state.currentProject,
        scenes: updatedScenes,
        updatedAt: new Date()
      };

      return {
        currentProject: updatedProject,
        projects: state.projects.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        )
      };
    });
  },

  // Timeline management
  updateTimeline: (updates) => {
    set(state => {
      const currentTimeline = state.timeline || {
        id: `timeline_${Date.now()}`,
        projectId: state.currentProject?.id || '',
        videoSegments: [],
        audioTracks: [],
        transitions: [],
        duration: 0
      };

      return {
        timeline: { ...currentTimeline, ...updates }
      };
    });
  },

  addAudioTrack: (audioTrack) => {
    set(state => {
      if (!state.timeline) return state;

      return {
        timeline: {
          ...state.timeline,
          audioTracks: [...state.timeline.audioTracks, audioTrack]
        }
      };
    });
  },

  updateAudioTrack: (trackId, updates) => {
    set(state => {
      if (!state.timeline) return state;

      const updatedTracks = state.timeline.audioTracks.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      );

      return {
        timeline: {
          ...state.timeline,
          audioTracks: updatedTracks
        }
      };
    });
  },

  removeAudioTrack: (trackId) => {
    set(state => {
      if (!state.timeline) return state;

      return {
        timeline: {
          ...state.timeline,
          audioTracks: state.timeline.audioTracks.filter(track => track.id !== trackId)
        }
      };
    });
  },

  // Import scenes from CSV data
  importScenes: async (projectId: string, scenes: CSVSceneData[]) => {
    try {
      set({ isLoading: true, error: null });

      const createdScenes: Scene[] = [];
      const failedScenes: { sceneNumber: number; error: string }[] = [];

      console.log(`[importScenes] Starting import of ${scenes.length} scenes for project ${projectId}`);

      // Create scenes one by one using the existing createScene API
      for (const csvScene of scenes) {
        try {
          const newScene = await apiClient.createScene({
            projectId,
            sceneNumber: csvScene.sceneNumber, // Use CSV scene number
            title: `Scene ${csvScene.sceneNumber}`,
            description: csvScene.imagePrompt || '', // Use imagePrompt as description
            videoPrompt: csvScene.videoPrompt || '',
            duration: 8 // Default duration
          });

          createdScenes.push(newScene);
          console.log(`[importScenes] Successfully created scene ${csvScene.sceneNumber}`);
        } catch (sceneError: any) {
          console.error(`[importScenes] Failed to create scene ${csvScene.sceneNumber}:`, sceneError);

          // Record the failed scene for later reporting
          failedScenes.push({
            sceneNumber: csvScene.sceneNumber,
            error: sceneError.message || 'Unknown error'
          });

          // For scene number conflicts in CSV import, we should continue with other scenes
          // rather than failing the entire import
          if (sceneError.message?.includes('scene number conflict') ||
              sceneError.message?.includes('(409)')) {
            console.warn(`[importScenes] Scene number conflict for ${csvScene.sceneNumber}, skipping this scene`);
            continue;
          }

          // For other types of errors, we might want to continue but log them
          console.warn(`[importScenes] Scene creation error for ${csvScene.sceneNumber}: ${sceneError.message}`);
        }
      }

      // Update the current project with the new scenes
      set(state => {
        if (!state.currentProject || state.currentProject.id !== projectId) return state;

        const updatedProject = {
          ...state.currentProject,
          scenes: [...state.currentProject.scenes, ...createdScenes],
          updatedAt: new Date()
        };

        return {
          currentProject: updatedProject,
          projects: state.projects.map(p =>
            p.id === projectId ? updatedProject : p
          ),
          isLoading: false
        };
      });

      // Log import summary
      console.log(`[importScenes] Import completed: ${createdScenes.length} successful, ${failedScenes.length} failed`);

      // If there were failed scenes, provide detailed error information
      if (failedScenes.length > 0) {
        const errorDetails = failedScenes.map(f => `Scene ${f.sceneNumber}: ${f.error}`).join('; ');
        console.error(`[importScenes] Failed scenes: ${errorDetails}`);

        // Set a warning error message (not blocking)
        set({
          error: `Import completed with ${failedScenes.length} errors: ${errorDetails}`,
          isLoading: false
        });
      }

      return createdScenes;
    } catch (error) {
      console.error('Failed to import scenes:', error);

      // Enhanced error handling for CSV import
      let errorMessage = 'Failed to import scenes';
      if (error instanceof Error) {
        if (error.message.includes('No current project selected')) {
          errorMessage = 'Please select a project before importing scenes';
        } else {
          errorMessage = `Import failed: ${error.message}`;
        }
      }

      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  // Utility
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Clear all data
  clearAllData: async () => {
    try {
      set({ isLoading: true, error: null });

      const currentProjects = get().projects;

      // Delete all projects one by one
      for (const project of currentProjects) {
        await apiClient.deleteProject(project.id);
      }

      // Reset state
      set({
        projects: [],
        currentProject: null,
        timeline: null,
        selectedImagesPerScene: {},
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to clear all data:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to clear all data',
        isLoading: false
      });
      throw error;
    }
  }
}));