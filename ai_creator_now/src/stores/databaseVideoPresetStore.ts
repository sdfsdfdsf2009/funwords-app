import { create } from 'zustand';
import { VideoGenerationPreset, VideoGenerationSettings } from '../types';

// Export interface for external components
export interface VideoPresetStore {
  // State
  presets: VideoGenerationPreset[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeDefaultPresets: () => Promise<void>;
  savePreset: (name: string, description: string, settings: VideoGenerationSettings) => Promise<void>;
  loadPresets: () => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
  applyPreset: (presetId: string) => VideoGenerationSettings | null;
  updatePreset: (presetId: string, updates: Partial<VideoGenerationPreset>) => Promise<void>;
  setDefaultPreset: (presetId: string) => Promise<void>;
  getDefaultPreset: () => VideoGenerationPreset | null;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// 默认用户ID
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

// API客户端类
class VideoPresetAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/video-presets';
  }

  // 获取用户预设
  async getPresets(userId: string = DEFAULT_USER_ID): Promise<VideoGenerationPreset[]> {
    try {
      const response = await fetch(`${this.baseUrl}?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to load presets: ${response.statusText}`);
      }
      const data = await response.json();
      return data.presets || [];
    } catch (error) {
      console.error('Error loading presets:', error);
      throw error;
    }
  }

  // 保存预设
  async savePreset(preset: Omit<VideoGenerationPreset, 'id' | 'createdAt'>): Promise<VideoGenerationPreset> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...preset,
        userId: DEFAULT_USER_ID,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save preset: ${response.statusText}`);
    }

    return await response.json();
  }

  // 更新预设
  async updatePreset(presetId: string, updates: Partial<VideoGenerationPreset>): Promise<VideoGenerationPreset> {
    const response = await fetch(`${this.baseUrl}/${presetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update preset: ${response.statusText}`);
    }

    return await response.json();
  }

  // 删除预设
  async deletePreset(presetId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${presetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete preset: ${response.statusText}`);
    }
  }

  // 设置默认预设
  async setDefaultPreset(presetId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${presetId}/set-default`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to set default preset: ${response.statusText}`);
    }
  }
}

// 创建API实例
const videoPresetAPI = new VideoPresetAPI();

// 默认预设配置
const DEFAULT_PRESETS: Omit<VideoGenerationPreset, 'id' | 'createdAt'>[] = [
  {
    name: '标准短视频',
    description: '适用于社交媒体的5秒短视频',
    settings: {
      duration: 5,
      fps: 30,
      quality: 'standard',
      motionIntensity: 'medium',
      motionStrength: 'medium',
      style: 'realistic',
      aspectRatio: '16:9',
      promptEnhancement: true
    },
    isDefault: true,
    isBuiltIn: true
  },
  {
    name: '高质量动画',
    description: '15秒高质量动画，适合专业展示',
    settings: {
      duration: 15,
      fps: 60,
      quality: 'high',
      motionIntensity: 'high',
      motionStrength: 'strong',
      style: 'animated',
      aspectRatio: '16:9',
      promptEnhancement: true
    },
    isDefault: false,
    isBuiltIn: true
  },
  {
    name: 'GIF风格',
    description: '3秒循环动画，适合GIF制作',
    settings: {
      duration: 3,
      fps: 24,
      quality: 'standard',
      motionIntensity: 'low',
      motionStrength: 'subtle',
      style: 'artistic',
      aspectRatio: '1:1',
      promptEnhancement: false
    },
    isDefault: false,
    isBuiltIn: true
  },
  {
    name: '电影级效果',
    description: '30秒高帧率电影级视频',
    settings: {
      duration: 30,
      fps: 60,
      quality: 'high',
      motionIntensity: 'medium',
      motionStrength: 'medium',
      style: 'cinematic',
      aspectRatio: '16:9',
      promptEnhancement: true
    },
    isDefault: false,
    isBuiltIn: true
  },
  {
    name: '竖屏短视频',
    description: '适用于抖音/Instagram的竖屏视频',
    settings: {
      duration: 8,
      fps: 30,
      quality: 'standard',
      motionIntensity: 'medium',
      motionStrength: 'medium',
      style: 'realistic',
      aspectRatio: '9:16',
      promptEnhancement: true
    },
    isDefault: false,
    isBuiltIn: true
  }
];

interface DatabaseVideoPresetStore {
  // State
  presets: VideoGenerationPreset[];
  isLoading: boolean;
  error: string | null;
  _initialized: boolean;
  _saveTimer: number | null;

  // Actions
  initializeDefaultPresets: () => Promise<void>;
  loadPresets: () => Promise<void>;
  savePreset: (name: string, description: string, settings: VideoGenerationSettings) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
  applyPreset: (presetId: string) => VideoGenerationSettings | null;
  updatePreset: (presetId: string, updates: Partial<VideoGenerationPreset>) => Promise<void>;
  setDefaultPreset: (presetId: string) => Promise<void>;
  getDefaultPreset: () => VideoGenerationPreset | null;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Internal methods
  _autoSave: () => void;
  _saveToStorage: () => void;
  _loadFromStorage: () => VideoGenerationPreset[] | null;
}

export const useDatabaseVideoPresetStore = create<DatabaseVideoPresetStore>((set, get) => ({
  // Initial state
  presets: [],
  isLoading: false,
  error: null,
  _initialized: false,
  _saveTimer: null,

  // Initialize default presets on first load
  initializeDefaultPresets: async () => {
    const { presets, _initialized } = get();

    if (_initialized) return;

    set({ isLoading: true, error: null });

    try {
      // Try to load from database first
      await get().loadPresets();

      const { presets: loadedPresets } = get();

      // If no presets exist, create default ones
      if (loadedPresets.length === 0) {
        const defaultPresets = DEFAULT_PRESETS.map(preset => ({
          ...preset,
          id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
        }));

        // Save default presets to database
        for (const preset of defaultPresets) {
          try {
            await videoPresetAPI.savePreset(preset);
          } catch (error) {
            console.warn('Failed to save default preset to database:', error);
          }
        }

        set({ presets: defaultPresets });
      }

      set({ _initialized: true });
    } catch (error) {
      console.error('Error initializing presets:', error);
      set({ error: '初始化预设失败' });

      // Fallback to localStorage
      const localStoragePresets = get()._loadFromStorage();
      if (localStoragePresets && localStoragePresets.length > 0) {
        set({ presets: localStoragePresets, _initialized: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // Load presets from database
  loadPresets: async () => {
    try {
      const presets = await videoPresetAPI.getPresets();
      set({ presets });

      // Backup to localStorage
      get()._saveToStorage();
    } catch (error) {
      console.warn('Failed to load presets from database, trying localStorage:', error);

      // Fallback to localStorage
      const localStoragePresets = get()._loadFromStorage();
      if (localStoragePresets) {
        set({ presets: localStoragePresets });
      }
    }
  },

  // Save new preset
  savePreset: async (name, description, settings) => {
    set({ isLoading: true, error: null });

    try {
      const newPreset: VideoGenerationPreset = {
        id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description.trim(),
        settings: { ...settings },
        createdAt: new Date(),
        isDefault: false,
        isBuiltIn: false
      };

      const savedPreset = await videoPresetAPI.savePreset(newPreset);

      set(state => ({
        presets: [...state.presets, savedPreset],
        error: null
      }));

      // Backup to localStorage
      get()._saveToStorage();
    } catch (error) {
      console.error('Error saving preset:', error);
      set({ error: '保存预设失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Delete preset
  deletePreset: async (presetId) => {
    const preset = get().presets.find(p => p.id === presetId);

    // Don't allow deleting built-in presets
    if (preset?.isBuiltIn) {
      set({ error: '不能删除内置预设' });
      return;
    }

    try {
      await videoPresetAPI.deletePreset(presetId);

      set(state => ({
        presets: state.presets.filter(p => p.id !== presetId)
      }));

      // Backup to localStorage
      get()._saveToStorage();
    } catch (error) {
      console.error('Error deleting preset:', error);
      set({ error: '删除预设失败' });
    }
  },

  // Apply preset
  applyPreset: (presetId) => {
    const preset = get().presets.find(p => p.id === presetId);
    if (!preset) {
      set({ error: `预设 ${presetId} 不存在` });
      return null;
    }
    return preset.settings;
  },

  // Update preset
  updatePreset: async (presetId, updates) => {
    const preset = get().presets.find(p => p.id === presetId);

    // Don't allow updating built-in presets
    if (preset?.isBuiltIn) {
      set({ error: '不能修改内置预设' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const updatedPreset = await videoPresetAPI.updatePreset(presetId, {
        ...updates,
        updatedAt: new Date()
      });

      set(state => ({
        presets: state.presets.map(p =>
          p.id === presetId ? updatedPreset : p
        ),
        error: null
      }));

      // Backup to localStorage
      get()._saveToStorage();
    } catch (error) {
      console.error('Error updating preset:', error);
      set({ error: '更新预设失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Set default preset
  setDefaultPreset: async (presetId) => {
    try {
      await videoPresetAPI.setDefaultPreset(presetId);

      set(state => ({
        presets: state.presets.map(p => ({
          ...p,
          isDefault: p.id === presetId
        }))
      }));

      // Backup to localStorage
      get()._saveToStorage();
    } catch (error) {
      console.error('Error setting default preset:', error);
      set({ error: '设置默认预设失败' });
    }
  },

  // Get default preset
  getDefaultPreset: () => {
    return get().presets.find(p => p.isDefault) || null;
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Auto-save to localStorage as backup
  _autoSave: () => {
    // Clear previous timer
    const { _saveTimer } = get();
    if (_saveTimer) {
      clearTimeout(_saveTimer);
    }

    // Set new auto-save timer (2 seconds)
    const timer = window.setTimeout(() => {
      get()._saveToStorage();
    }, 2000);

    set({ _saveTimer: timer });
  },

  // Save to localStorage as backup
  _saveToStorage: () => {
    const { presets } = get();
    try {
      localStorage.setItem('video-presets-storage', JSON.stringify(presets));
    } catch (error) {
      console.error('Error saving presets to localStorage:', error);
    }
  },

  // Load from localStorage as fallback
  _loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('video-presets-storage');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading presets from localStorage:', error);
      return null;
    }
  }
}));

export default useDatabaseVideoPresetStore;