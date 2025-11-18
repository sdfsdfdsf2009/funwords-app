import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Project,
  Scene,
  GeneratedVideo,
  RemotionTimeline,
  RemotionSettings,
  RemotionVideoSegment,
  RemotionEditorStore,
  RemotionEditingToolType,
  HistoryEntry
} from '../types';

// 创建唯一ID
const createId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 默认Remotion设置
const defaultRemotionSettings: RemotionSettings = {
  fps: 30,
  width: 1920,
  height: 1080,
  backgroundColor: '#000000',
  quality: 85,
};

// Remotion编辑器API客户端类
class RemotionEditorAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/remotion-editor';
  }

  // 加载Remotion编辑器项目
  async loadProject(projectId: string): Promise<{ project: Project; timeline: RemotionTimeline } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to load Remotion project: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading Remotion project:', error);
      throw error;
    }
  }

  // 保存Remotion编辑器项目
  async saveProject(projectId: string, data: {
    project: Project;
    timeline: RemotionTimeline;
    settings: RemotionSettings;
    history: HistoryEntry[];
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to save Remotion project: ${response.statusText}`);
    }
  }

  // 获取渲染任务状态
  async getRenderStatus(renderId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    resultUrl?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/renders/${renderId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get render status: ${response.statusText}`);
    }
    return await response.json();
  }

  // 开始渲染
  async startRender(projectId: string, timeline: RemotionTimeline, settings: RemotionSettings): Promise<string> {
    const response = await fetch(`${this.baseUrl}/renders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        timeline,
        settings,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start render: ${response.statusText}`);
    }

    const result = await response.json();
    return result.renderId;
  }

  // 取消渲染
  async cancelRender(renderId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/renders/${renderId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel render: ${response.statusText}`);
    }
  }

  // 保存历史记录
  async saveHistory(projectId: string, history: HistoryEntry[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/history`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save history: ${response.statusText}`);
    }
  }
}

// 创建API实例
const remotionEditorAPI = new RemotionEditorAPI();

// 将项目数据转换为Remotion时间轴格式
const convertProjectToTimeline = (project: Project): RemotionTimeline => {
  const segments: RemotionVideoSegment[] = [];
  let currentTime = 0;

  // 按场景顺序创建时间轴片段
  project.scenes.forEach((scene, sceneIndex) => {
    scene.generatedVideos.forEach((video, videoIndex) => {
      const segment: RemotionVideoSegment = {
        id: `segment-${scene.id}-${video.id}`,
        videoSrc: video.url,
        thumbnailSrc: video.thumbnailUrl,
        startTime: currentTime,
        duration: video.metadata.duration,
        trimStart: 0,
        trimEnd: video.metadata.duration,
        position: { x: 0, y: 0, width: 1920, height: 1080 },
        opacity: 1,
        scale: 1,
        rotation: 0,
        effects: [],
      };
      segments.push(segment);
      currentTime += video.metadata.duration;
    });
  });

  return {
    id: `timeline-${project.id}`,
    name: `${project.name} Timeline`,
    duration: currentTime,
    fps: defaultRemotionSettings.fps,
    width: defaultRemotionSettings.width,
    height: defaultRemotionSettings.height,
    backgroundColor: defaultRemotionSettings.backgroundColor,
    segments,
    transitions: [],
    audioTracks: [],
    textOverlays: [],
    effects: [],
    metadata: {
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      version: '1.0.0',
      description: project.description,
    },
  };
};

// 数据库存储键
const STORAGE_KEYS = {
  REMOTION_PROJECT: (projectId: string) => `remotion-project-${projectId}`,
  REMOTION_SETTINGS: (projectId: string) => `remotion-settings-${projectId}`,
  REMOTION_HISTORY: (projectId: string) => `remotion-history-${projectId}`,
  REMOTION_TIMELINE: (projectId: string) => `remotion-timeline-${projectId}`,
} as const;

// 数据库版本的Remotion编辑器store接口
interface DatabaseRemotionEditorStore extends RemotionEditorStore {
  // 数据库操作
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;

  // 时间轴操作
  updateTimeline: (updates: Partial<RemotionTimeline>) => void;
  addVideoSegment: (segment: Omit<RemotionVideoSegment, 'id'>) => void;
  removeSegment: (segmentId: string) => void;
  updateSegment: (segmentId: string, updates: Partial<RemotionVideoSegment>) => void;

  // 编辑操作
  selectSegment: (segmentId: string | null) => void;
  setPlaybackTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;

  // 历史操作
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // 渲染操作
  startRender: (settings?: Partial<RemotionSettings>) => Promise<void>;
  cancelRender: () => void;

  // 工具操作
  splitSegment: (segmentId: string, time: number) => void;
  trimSegment: (segmentId: string, startTime: number, endTime: number) => void;
  duplicateSegment: (segmentId: string) => void;

  // 内部状态
  _initialized: boolean;
  _history: HistoryEntry[];
  _historyIndex: number;
  _currentRenderId: string | null;
  _saveTimer: number | null;

  // 内部操作
  _initialize: (project: Project) => void;
  _saveToHistory: (action: string, description: string) => void;
  _updateTimelineSafely: (updates: Partial<RemotionTimeline>) => void;
  _autoSave: () => void;
  _saveToStorage: () => void;
  _loadFromStorage: (projectId: string) => {
    project?: Project;
    timeline?: RemotionTimeline;
    settings?: RemotionSettings;
    history?: HistoryEntry[];
  } | null;
}

// 创建数据库优先的Remotion编辑器store
export const useDatabaseRemotionEditorStore = create<DatabaseRemotionEditorStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      currentProject: null,
      timeline: null,
      currentSettings: defaultRemotionSettings,
      selectedSegment: null,
      selectedTool: 'select',
      currentTime: 0,
      isPlaying: false,
      zoom: 1,
      previewMode: 'medium',
      isRendering: false,
      renderProgress: 0,
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,

      // 内部状态
      _initialized: false,
      _history: [],
      _historyIndex: -1,
      _currentRenderId: null,
      _saveTimer: null,

      // 项目操作 - 数据库优先
      loadProject: async (projectId: string) => {
        console.log('🎬 Remotion Editor: Loading project from database', projectId);

        try {
          // 尝试从数据库加载
          const data = await remotionEditorAPI.loadProject(projectId);

          if (data) {
            set((state) => {
              state.currentProject = data.project;
              state.timeline = data.timeline;
              state._initialized = true;
              state.currentTime = 0;
              state.selectedSegment = null;
              state._history = [];
              state._historyIndex = -1;
              state.canUndo = false;
              state.canRedo = false;
            });

            console.log('✅ Remotion Editor: Project loaded from database successfully');
            return;
          }
        } catch (error) {
          console.warn('⚠️ Failed to load from database, trying localStorage:', error);

          // 数据库加载失败，尝试localStorage
          const storageData = get()._loadFromStorage(projectId);
          if (storageData?.project) {
            set((state) => {
              state.currentProject = storageData.project;
              state.timeline = storageData.timeline || convertProjectToTimeline(storageData.project);
              state.currentSettings = storageData.settings || defaultRemotionSettings;
              state._history = storageData.history || [];
              state._historyIndex = storageData.history?.length - 1 || -1;
              state._initialized = true;
              state.currentTime = 0;
              state.selectedSegment = null;
              state.canUndo = state._historyIndex > 0;
              state.canRedo = state._historyIndex >= -1 && state._historyIndex < state._history.length - 1;
            });

            console.log('✅ Remotion Editor: Project loaded from localStorage successfully');
            return;
          }
        }

        // 如果都没有数据，创建默认项目
        console.log('📝 Creating default Remotion project');
        const defaultProject: Project = {
          id: projectId,
          name: 'New Remotion Project',
          description: 'Created with Remotion Editor',
          createdAt: new Date(),
          updatedAt: new Date(),
          scenes: [
            {
              id: 'scene-1',
              sceneNumber: 1,
              imagePrompt: 'A beautiful landscape',
              videoPrompt: 'Camera movement across landscape',
              generatedVideos: [],
              images: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          ],
          settings: {
            defaultImageSettings: {
              width: 1920,
              height: 1080,
              quality: 'high',
              numberOfImages: 1,
            },
            defaultVideoSettings: {
              duration: 5,
              fps: 30,
              quality: 'high',
              motionIntensity: 'medium',
              motionStrength: 'medium',
              style: 'realistic',
              aspectRatio: '16:9',
              promptEnhancement: true,
            },
            exportSettings: {
              format: 'mp4',
              resolution: { width: 1920, height: 1080 },
              quality: 'high',
              audioBitrate: 128000,
              videoBitrate: 5000000,
            },
          },
        };

        const timeline = convertProjectToTimeline(defaultProject);

        set((state) => {
          state.currentProject = defaultProject;
          state.timeline = timeline;
          state._initialized = true;
          state.currentTime = 0;
          state.selectedSegment = null;
          state._history = [];
          state._historyIndex = -1;
          state.canUndo = false;
          state.canRedo = false;
        });

        console.log('✅ Remotion Editor: Default project created successfully');
      },

      saveProject: async () => {
        const { currentProject, timeline, currentSettings, history } = get();
        if (!currentProject || !timeline) return;

        console.log('💾 Remotion Editor: Saving project to database...');

        try {
          // 尝试保存到数据库
          await remotionEditorAPI.saveProject(currentProject.id, {
            project: currentProject,
            timeline,
            settings: currentSettings,
            history,
          });

          // 同时保存到localStorage作为备份
          get()._saveToStorage();

          set((state) => {
            if (state.timeline) {
              state.timeline.metadata.updatedAt = new Date();
            }
          });

          console.log('✅ Remotion Editor: Project saved to database successfully');
        } catch (error) {
          console.warn('⚠️ Failed to save to database, saving to localStorage only:', error);

          // 数据库保存失败，只保存到localStorage
          get()._saveToStorage();

          set((state) => {
            if (state.timeline) {
              state.timeline.metadata.updatedAt = new Date();
            }
          });

          console.log('✅ Remotion Editor: Project saved to localStorage successfully');
        }
      },

      // 时间轴操作
      updateTimeline: (updates: Partial<RemotionTimeline>) => {
        get()._updateTimelineSafely(updates);
        get()._autoSave();
      },

      addVideoSegment: (segment: Omit<RemotionVideoSegment, 'id'>) => {
        const newSegment: RemotionVideoSegment = {
          ...segment,
          id: createId(),
        };

        set((state) => {
          if (!state.timeline) return;
          state.timeline.segments.push(newSegment);

          // 更新时间轴持续时间
          const lastSegmentEndTime = Math.max(
            ...state.timeline.segments.map(s => s.startTime + s.duration)
          );
          state.timeline.duration = Math.max(state.timeline.duration, lastSegmentEndTime);
        });

        get()._saveToHistory('addSegment', 'Added video segment');
        get()._autoSave();
      },

      removeSegment: (segmentId: string) => {
        set((state) => {
          if (!state.timeline) return;
          state.timeline.segments = state.timeline.segments.filter(s => s.id !== segmentId);

          // 重新计算时间轴持续时间
          if (state.timeline.segments.length > 0) {
            const lastSegmentEndTime = Math.max(
              ...state.timeline.segments.map(s => s.startTime + s.duration)
            );
            state.timeline.duration = lastSegmentEndTime;
          } else {
            state.timeline.duration = 0;
          }
        });

        get()._saveToHistory('removeSegment', 'Removed video segment');
        get()._autoSave();
      },

      updateSegment: (segmentId: string, updates: Partial<RemotionVideoSegment>) => {
        set((state) => {
          if (!state.timeline) return;
          const segment = state.timeline.segments.find(s => s.id === segmentId);
          if (segment) {
            Object.assign(segment, updates);
          }
        });

        get()._saveToHistory('updateSegment', 'Updated video segment');
        get()._autoSave();
      },

      // 编辑操作
      selectSegment: (segmentId: string | null) => {
        set((state) => {
          state.selectedSegment = segmentId;
        });
      },

      setPlaybackTime: (time: number) => {
        set((state) => {
          state.currentTime = Math.max(0, Math.min(time, state.timeline?.duration || 0));
        });
      },

      setPlaying: (playing: boolean) => {
        set((state) => {
          state.isPlaying = playing;
        });
      },

      // 历史操作
      undo: () => {
        const { _historyIndex, _history } = get();
        if (_historyIndex > 0) {
          const newIndex = _historyIndex - 1;
          const historyEntry = _history[newIndex];

          set((state) => {
            state._historyIndex = newIndex;
            if (state.timeline && historyEntry.data) {
              Object.assign(state.timeline, historyEntry.data);
            }
            state.canUndo = newIndex > 0;
            state.canRedo = newIndex < _history.length - 1;
          });

          get()._autoSave();
        }
      },

      redo: () => {
        const { _historyIndex, _history } = get();
        if (_historyIndex < _history.length - 1) {
          const newIndex = _historyIndex + 1;
          const historyEntry = _history[newIndex];

          set((state) => {
            state._historyIndex = newIndex;
            if (state.timeline && historyEntry.data) {
              Object.assign(state.timeline, historyEntry.data);
            }
            state.canUndo = newIndex > 0;
            state.canRedo = newIndex < _history.length - 1;
          });

          get()._autoSave();
        }
      },

      saveToHistory: () => {
        get()._saveToHistory('manual', 'Manual save');
        get()._autoSave();
      },

      // 渲染操作
      startRender: async (settings?: Partial<RemotionSettings>) => {
        const { currentProject, timeline, currentSettings } = get();
        if (!currentProject || !timeline) return;

        console.log('🎬 Remotion Editor: Starting render', settings);

        try {
          set((state) => {
            state.isRendering = true;
            state.renderProgress = 0;
          });

          const renderSettings = { ...currentSettings, ...settings };
          const renderId = await remotionEditorAPI.startRender(currentProject.id, timeline, renderSettings);

          set((state) => {
            state._currentRenderId = renderId;
          });

          // 监控渲染进度
          const monitorRender = async () => {
            if (!get()._currentRenderId) return;

            try {
              const status = await remotionEditorAPI.getRenderStatus(get()._currentRenderId!);

              set((state) => {
                state.renderProgress = status.progress;
              });

              if (status.status === 'completed') {
                set((state) => {
                  state.isRendering = false;
                  state.renderProgress = 100;
                  state._currentRenderId = null;
                });

                console.log('✅ Remotion Editor: Render completed');
              } else if (status.status === 'failed') {
                console.error('❌ Remotion Editor: Render failed', status.error);

                set((state) => {
                  state.isRendering = false;
                  state.renderProgress = 0;
                  state._currentRenderId = null;
                });
              } else if (status.status === 'processing') {
                setTimeout(monitorRender, 1000); // 继续监控
              }
            } catch (error) {
              console.error('Error monitoring render:', error);

              set((state) => {
                state.isRendering = false;
                state.renderProgress = 0;
                state._currentRenderId = null;
              });
            }
          };

          monitorRender();
        } catch (error) {
          console.error('❌ Remotion Editor: Failed to start render', error);

          set((state) => {
            state.isRendering = false;
            state.renderProgress = 0;
          });
        }
      },

      cancelRender: async () => {
        const { _currentRenderId } = get();
        if (!_currentRenderId) return;

        console.log('🚫 Remotion Editor: Canceling render');

        try {
          await remotionEditorAPI.cancelRender(_currentRenderId);

          set((state) => {
            state.isRendering = false;
            state.renderProgress = 0;
            state._currentRenderId = null;
          });

          console.log('✅ Remotion Editor: Render cancelled');
        } catch (error) {
          console.error('❌ Remotion Editor: Failed to cancel render', error);
        }
      },

      // 工具操作
      splitSegment: (segmentId: string, time: number) => {
        const { timeline } = get();
        if (!timeline) return;

        const segment = timeline.segments.find(s => s.id === segmentId);
        if (!segment) return;

        const splitTime = time - segment.startTime;
        if (splitTime <= 0 || splitTime >= segment.duration) return;

        const firstSegment: RemotionVideoSegment = {
          ...segment,
          id: createId(),
          duration: splitTime,
          trimEnd: segment.trimStart + splitTime,
        };

        const secondSegment: RemotionVideoSegment = {
          ...segment,
          id: createId(),
          startTime: segment.startTime + splitTime,
          duration: segment.duration - splitTime,
          trimStart: segment.trimStart + splitTime,
        };

        set((state) => {
          if (!state.timeline) return;
          const index = state.timeline.segments.findIndex(s => s.id === segmentId);
          state.timeline.segments.splice(index, 1, firstSegment, secondSegment);
        });

        get()._saveToHistory('splitSegment', 'Split video segment');
        get()._autoSave();
      },

      trimSegment: (segmentId: string, startTime: number, endTime: number) => {
        const { timeline } = get();
        if (!timeline) return;

        const segment = timeline.segments.find(s => s.id === segmentId);
        if (!segment) return;

        const newDuration = endTime - startTime;
        if (newDuration <= 0) return;

        set((state) => {
          if (!state.timeline) return;
          const targetSegment = state.timeline.segments.find(s => s.id === segmentId);
          if (targetSegment) {
            targetSegment.startTime = startTime;
            targetSegment.duration = newDuration;
            targetSegment.trimStart = segment.trimStart + (startTime - segment.startTime);
            targetSegment.trimEnd = segment.trimStart + (endTime - segment.startTime);
          }
        });

        get()._saveToHistory('trimSegment', 'Trimmed video segment');
        get()._autoSave();
      },

      duplicateSegment: (segmentId: string) => {
        const { timeline } = get();
        if (!timeline) return;

        const segment = timeline.segments.find(s => s.id === segmentId);
        if (!segment) return;

        const duplicatedSegment: RemotionVideoSegment = {
          ...segment,
          id: createId(),
          startTime: segment.startTime + segment.duration + 1, // 添加1秒间隔
        };

        set((state) => {
          if (!state.timeline) return;
          state.timeline.segments.push(duplicatedSegment);

          // 更新时间轴持续时间
          const lastSegmentEndTime = Math.max(
            ...state.timeline.segments.map(s => s.startTime + s.duration)
          );
          state.timeline.duration = Math.max(state.timeline.duration, lastSegmentEndTime);
        });

        get()._saveToHistory('duplicateSegment', 'Duplicated video segment');
        get()._autoSave();
      },

      // 内部操作
      _initialize: (project: Project) => {
        const timeline = convertProjectToTimeline(project);

        set((state) => {
          state.currentProject = project;
          state.timeline = timeline;
          state._initialized = true;
        });
      },

      _saveToHistory: (action: string, description: string) => {
        const { timeline, _history, _historyIndex } = get();
        if (!timeline) return;

        // 创建历史条目
        const historyEntry: HistoryEntry = {
          id: createId(),
          timestamp: new Date(),
          action,
          description,
          data: JSON.parse(JSON.stringify(timeline)), // 深拷贝
        };

        // 截断当前历史之后的所有条目（ redo 支持）
        const newHistory = _history.slice(0, _historyIndex + 1);
        newHistory.push(historyEntry);

        set((state) => {
          state._history = newHistory;
          state._historyIndex = newHistory.length - 1;
          state.history = newHistory.slice(-50); // 保留最近50条历史
          state.historyIndex = state.history.length - 1;
          state.canUndo = true;
          state.canRedo = false;
        });
      },

      _updateTimelineSafely: (updates: Partial<RemotionTimeline>) => {
        set((state) => {
          if (!state.timeline) return;
          Object.assign(state.timeline, updates);
        });
        get()._saveToHistory('updateTimeline', 'Updated timeline properties');
      },

      _autoSave: () => {
        // 清除之前的定时器
        const { _saveTimer } = get();
        if (_saveTimer) {
          clearTimeout(_saveTimer);
        }

        // 设置新的自动保存定时器（2秒后保存）
        const timer = window.setTimeout(() => {
          get().saveProject();
        }, 2000);

        set((state) => {
          state._saveTimer = timer;
        });
      },

      _saveToStorage: () => {
        const { currentProject, timeline, currentSettings, _history } = get();
        if (!currentProject) return;

        try {
          // 保存到localStorage作为备份
          const projectData = {
            ...currentProject,
            updatedAt: new Date(),
          };

          localStorage.setItem(STORAGE_KEYS.REMOTION_PROJECT(currentProject.id), JSON.stringify(projectData));
          localStorage.setItem(STORAGE_KEYS.REMOTION_TIMELINE(currentProject.id), JSON.stringify(timeline));
          localStorage.setItem(STORAGE_KEYS.REMOTION_SETTINGS(currentProject.id), JSON.stringify(currentSettings));
          localStorage.setItem(STORAGE_KEYS.REMOTION_HISTORY(currentProject.id), JSON.stringify(_history));
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      },

      _loadFromStorage: (projectId: string) => {
        try {
          const projectData = localStorage.getItem(STORAGE_KEYS.REMOTION_PROJECT(projectId));
          const timelineData = localStorage.getItem(STORAGE_KEYS.REMOTION_TIMELINE(projectId));
          const settingsData = localStorage.getItem(STORAGE_KEYS.REMOTION_SETTINGS(projectId));
          const historyData = localStorage.getItem(STORAGE_KEYS.REMOTION_HISTORY(projectId));

          if (projectData) {
            return {
              project: JSON.parse(projectData),
              timeline: timelineData ? JSON.parse(timelineData) : undefined,
              settings: settingsData ? JSON.parse(settingsData) : undefined,
              history: historyData ? JSON.parse(historyData) : undefined,
            };
          }
        } catch (error) {
          console.error('Error loading from localStorage:', error);
        }
        return null;
      },
    }))
  )
);

// 订阅状态变化，调试用
if (typeof window !== 'undefined') {
  useDatabaseRemotionEditorStore.subscribe(
    (state) => ({
      selectedSegment: state.selectedSegment,
      currentTime: state.currentTime,
      isPlaying: state.isPlaying,
    }),
    (state) => {
      console.log('🎬 Database Remotion Editor State Changed:', state);
    }
  );
}

export default useDatabaseRemotionEditorStore;