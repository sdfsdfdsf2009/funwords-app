import { create } from 'zustand';
import {
  VideoEditor,
  VideoEditorState,
  TimelineTrack,
  VideoSegment,
  AudioTrack,
  TextOverlay,
  VideoEffect,
  Transition,
  EditingTool,
  ExportJob,
  TimelineSelection,
  TimelineViewport,
  EditorShortcut
} from '../types';

// 数据库API客户端
class VideoEditorAPI {
  private baseUrl = '/api/video-editors';

  async getEditor(projectId: string): Promise<VideoEditor | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch video editor');
      return await response.json();
    } catch (error) {
      console.warn('Database fetch failed, returning null:', error);
      return null;
    }
  }

  async createEditor(projectId: string, editorData: Partial<VideoEditor>): Promise<VideoEditor> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...editorData
        })
      });
      if (!response.ok) throw new Error('Failed to create video editor');
      return await response.json();
    } catch (error) {
      console.warn('Database create failed:', error);
      throw error;
    }
  }

  async updateEditor(projectId: string, updates: Partial<VideoEditor>): Promise<VideoEditor | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update video editor');
      return await response.json();
    } catch (error) {
      console.warn('Database update failed:', error);
      return null;
    }
  }

  async deleteEditor(projectId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${projectId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.warn('Database delete failed:', error);
      return false;
    }
  }

  async saveEditorProjectData(projectId: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${projectId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to save editor project data:', error);
      return false;
    }
  }

  async loadEditorProjectData(projectId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${projectId}/data`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn('Failed to load editor project data:', error);
      return null;
    }
  }
}

const videoEditorAPI = new VideoEditorAPI();

interface DatabaseVideoEditorStore extends VideoEditorState {
  // Database-specific actions
  loadEditor: (projectId: string) => Promise<void>;
  saveEditor: () => Promise<void>;
  loadProjectData: (projectId: string) => Promise<void>;
  saveProjectData: (data: any) => Promise<void>;

  // Enhanced editor actions with database sync
  updateEditor: (updates: Partial<VideoEditor>) => Promise<void>;
  setCurrentTime: (time: number) => Promise<void>;
  setPlaying: (playing: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setZoom: (zoom: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;

  // Timeline management with database sync
  addVideoSegment: (segment: VideoSegment) => Promise<void>;
  removeVideoSegment: (segmentId: string) => Promise<void>;
  updateVideoSegment: (segmentId: string, updates: Partial<VideoSegment>) => Promise<void>;
  moveVideoSegment: (segmentId: string, newTime: number) => Promise<void>;
  trimVideoSegment: (segmentId: string, trimStart: number, trimEnd: number) => Promise<void>;
  splitVideoSegment: (segmentId: string, splitTime: number) => Promise<void>;

  // Audio management with database sync
  addAudioTrack: (audioTrack: AudioTrack) => Promise<void>;
  removeAudioTrack: (trackId: string) => Promise<void>;
  updateAudioTrack: (trackId: string, updates: Partial<AudioTrack>) => Promise<void>;

  // Text overlays with database sync
  addTextOverlay: (textOverlay: TextOverlay) => Promise<void>;
  removeTextOverlay: (overlayId: string) => Promise<void>;
  updateTextOverlay: (overlayId: string, updates: Partial<TextOverlay>) => Promise<void>;

  // Video effects with database sync
  addVideoEffect: (effect: VideoEffect) => Promise<void>;
  removeVideoEffect: (effectId: string) => Promise<void>;
  updateVideoEffect: (effectId: string, updates: Partial<VideoEffect>) => Promise<void>;

  // Transitions with database sync
  addTransition: (transition: Transition) => Promise<void>;
  removeTransition: (transitionId: string) => Promise<void>;
  updateTransition: (transitionId: string, updates: Partial<Transition>) => Promise<void>;

  // Export job management with database sync
  startExport: (exportJob: ExportJob) => Promise<void>;
  cancelExport: () => Promise<void>;
  updateExportProgress: (progress: number) => Promise<void>;
  completeExport: (videoUrl: string) => Promise<void>;
  failExport: (error: string) => Promise<void>;

  // Timeline selection
  setTimelineSelection: (selection: TimelineSelection) => Promise<void>;
  clearTimelineSelection: () => Promise<void>;
  getTimelineSelection: () => Promise<TimelineSelection | null>;

  // Utility
  reset: () => Promise<void>;
  setLoading: (loading: boolean) => Promise<void>;
  setError: (error: string | null) => Promise<void>;

  // localStorage backup
  saveToStorage: () => void;
  loadFromStorage: () => void;
}

export const useDatabaseVideoEditorStore = create<DatabaseVideoEditorStore>((set, get) => ({
  // 初始状态
  editor: null,
  isLoading: false,
  isExporting: false,
  exportProgress: 0,
  error: null,

  // Database-specific actions
  loadEditor: async (projectId) => {
    try {
      set({ isLoading: true, error: null });

      // 首先尝试从数据库加载
      const dbEditor = await videoEditorAPI.getEditor(projectId);

      if (dbEditor) {
        set({ editor: dbEditor, isLoading: false });

        // 加载项目数据
        const projectData = await videoEditorAPI.loadEditorProjectData(projectId);
        if (projectData) {
          set(state => ({
            editor: {
              ...state.editor!,
              ...projectData
            }
          }));
        }
      } else {
        // 数据库中没有，尝试从localStorage加载
        console.log('Database empty, falling back to localStorage for editor');
        get().loadFromStorage();
      }
    } catch (error) {
      console.error('Failed to load video editor:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load video editor',
        isLoading: false
      });
    }
  },

  saveEditor: async () => {
    try {
      const { editor } = get();
      if (!editor) return;

      await videoEditorAPI.updateEditor(editor.projectId, editor);
      await get().saveProjectData();
    } catch (error) {
      console.error('Failed to save video editor:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to save video editor'
      });
    }
  },

  loadProjectData: async (projectId) => {
    try {
      const projectData = await videoEditorAPI.loadEditorProjectData(projectId);
      if (projectData) {
        set(state => ({
          editor: state.editor ? {
            ...state.editor,
            ...projectData
          } : null
        }));
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  },

  saveProjectData: async (data?: any) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const projectData = data || {
        currentTime: editor.currentTime,
        isPlaying: editor.isPlaying,
        volume: editor.volume,
        zoom: editor.zoom,
        playbackRate: editor.playbackRate,
        timeline: editor.timeline,
        audioTracks: editor.audioTracks,
        videoSegments: editor.videoSegments,
        textOverlays: editor.textOverlays,
        videoEffects: editor.videoEffects,
        transitions: editor.transitions,
        selection: editor.selection,
        viewport: editor.viewport
      };

      await videoEditorAPI.saveEditorProjectData(editor.projectId, projectData);
    } catch (error) {
      console.error('Failed to save project data:', error);
    }
  },

  // Enhanced editor actions with database sync
  updateEditor: async (updates) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedEditor = await videoEditorAPI.updateEditor(editor.projectId, updates);
      if (updatedEditor) {
        set({ editor: updatedEditor });
        await get().saveProjectData();
      } else {
        // 数据库更新失败，只更新本地状态
        set(state => ({
          editor: state.editor ? { ...state.editor, ...updates } : null
        }));
      }
    } catch (error) {
      console.error('Failed to update editor:', error);
    }
  },

  setCurrentTime: async (time) => {
    try {
      await get().updateEditor({ currentTime: time });
    } catch (error) {
      console.error('Failed to set current time:', error);
    }
  },

  setPlaying: async (playing) => {
    try {
      await get().updateEditor({ isPlaying: playing });
    } catch (error) {
      console.error('Failed to set playing state:', error);
    }
  },

  setVolume: async (volume) => {
    try {
      await get().updateEditor({ volume });
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  },

  setZoom: async (zoom) => {
    try {
      await get().updateEditor({ zoom });
    } catch (error) {
      console.error('Failed to set zoom:', error);
    }
  },

  setPlaybackRate: async (rate) => {
    try {
      await get().updateEditor({ playbackRate: rate });
    } catch (error) {
      console.error('Failed to set playback rate:', error);
    }
  },

  // Timeline management with database sync
  addVideoSegment: async (segment) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedSegments = [...(editor.videoSegments || []), segment];
      await get().updateEditor({ videoSegments: updatedSegments });
    } catch (error) {
      console.error('Failed to add video segment:', error);
    }
  },

  removeVideoSegment: async (segmentId) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedSegments = (editor.videoSegments || []).filter(s => s.id !== segmentId);
      await get().updateEditor({ videoSegments: updatedSegments });
    } catch (error) {
      console.error('Failed to remove video segment:', error);
    }
  },

  updateVideoSegment: async (segmentId, updates) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedSegments = (editor.videoSegments || []).map(segment =>
        segment.id === segmentId ? { ...segment, ...updates } : segment
      );
      await get().updateEditor({ videoSegments: updatedSegments });
    } catch (error) {
      console.error('Failed to update video segment:', error);
    }
  },

  moveVideoSegment: async (segmentId, newTime) => {
    try {
      await get().updateVideoSegment(segmentId, { startTime: newTime });
    } catch (error) {
      console.error('Failed to move video segment:', error);
    }
  },

  trimVideoSegment: async (segmentId, trimStart, trimEnd) => {
    try {
      await get().updateVideoSegment(segmentId, { trimStart, trimEnd });
    } catch (error) {
      console.error('Failed to trim video segment:', error);
    }
  },

  splitVideoSegment: async (segmentId, splitTime) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const segment = (editor.videoSegments || []).find(s => s.id === segmentId);
      if (!segment) return;

      // 创建新段
      const newSegment: VideoSegment = {
        ...segment,
        id: `segment_${Date.now()}`,
        startTime: splitTime,
        endTime: segment.endTime,
        sourceUrl: segment.sourceUrl
      };

      // 更新原段
      const updatedSegment = {
        ...segment,
        endTime: splitTime
      };

      const updatedSegments = (editor.videoSegments || [])
        .map(s => s.id === segmentId ? updatedSegment : s)
        .concat(newSegment);

      await get().updateEditor({ videoSegments: updatedSegments });
    } catch (error) {
      console.error('Failed to split video segment:', error);
    }
  },

  // Audio management with database sync
  addAudioTrack: async (audioTrack) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedTracks = [...(editor.audioTracks || []), audioTrack];
      await get().updateEditor({ audioTracks: updatedTracks });
    } catch (error) {
      console.error('Failed to add audio track:', error);
    }
  },

  removeAudioTrack: async (trackId) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedTracks = (editor.audioTracks || []).filter(t => t.id !== trackId);
      await get().updateEditor({ audioTracks: updatedTracks });
    } catch (error) {
      console.error('Failed to remove audio track:', error);
    }
  },

  updateAudioTrack: async (trackId, updates) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedTracks = (editor.audioTracks || []).map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      );
      await get().updateEditor({ audioTracks: updatedTracks });
    } catch (error) {
      console.error('Failed to update audio track:', error);
    }
  },

  // Text overlays with database sync
  addTextOverlay: async (textOverlay) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedOverlays = [...(editor.textOverlays || []), textOverlay];
      await get().updateEditor({ textOverlays: updatedOverlays });
    } catch (error) {
      console.error('Failed to add text overlay:', error);
    }
  },

  removeTextOverlay: async (overlayId) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedOverlays = (editor.textOverlays || []).filter(o => o.id !== overlayId);
      await get().updateEditor({ textOverlays: updatedOverlays });
    } catch (error) {
      console.error('Failed to remove text overlay:', error);
    }
  },

  updateTextOverlay: async (overlayId, updates) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedOverlays = (editor.textOverlays || []).map(overlay =>
        overlay.id === overlayId ? { ...overlay, ...updates } : overlay
      );
      await get().updateEditor({ textOverlays: updatedOverlays });
    } catch (error) {
      console.error('Failed to update text overlay:', error);
    }
  },

  // Video effects with database sync
  addVideoEffect: async (effect) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedEffects = [...(editor.videoEffects || []), effect];
      await get().updateEditor({ videoEffects: updatedEffects });
    } catch (error) {
      console.error('Failed to add video effect:', error);
    }
  },

  removeVideoEffect: async (effectId) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedEffects = (editor.videoEffects || []).filter(e => e.id !== effectId);
      await get().updateEditor({ videoEffects: updatedEffects });
    } catch (error) {
      console.error('Failed to remove video effect:', error);
    }
  },

  updateVideoEffect: async (effectId, updates) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedEffects = (editor.videoEffects || []).map(effect =>
        effect.id === effectId ? { ...effect, ...updates } : effect
      );
      await get().updateEditor({ videoEffects: updatedEffects });
    } catch (error) {
      console.error('Failed to update video effect:', error);
    }
  },

  // Transitions with database sync
  addTransition: async (transition) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedTransitions = [...(editor.transitions || []), transition];
      await get().updateEditor({ transitions: updatedTransitions });
    } catch (error) {
      console.error('Failed to add transition:', error);
    }
  },

  removeTransition: async (transitionId) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedTransitions = (editor.transitions || []).filter(t => t.id !== transitionId);
      await get().updateEditor({ transitions: updatedTransitions });
    } catch (error) {
      console.error('Failed to remove transition:', error);
    }
  },

  updateTransition: async (transitionId, updates) => {
    try {
      const { editor } = get();
      if (!editor) return;

      const updatedTransitions = (editor.transitions || []).map(transition =>
        transition.id === transitionId ? { ...transition, ...updates } : transition
      );
      await get().updateEditor({ transitions: updatedTransitions });
    } catch (error) {
      console.error('Failed to update transition:', error);
    }
  },

  // Export job management with database sync
  startExport: async (exportJob) => {
    try {
      await get().updateEditor({
        isExporting: true,
        exportProgress: 0,
        exportJob
      });
    } catch (error) {
      console.error('Failed to start export:', error);
    }
  },

  cancelExport: async () => {
    try {
      await get().updateEditor({
        isExporting: false,
        exportProgress: 0,
        exportJob: null,
        error: 'Export cancelled'
      });
    } catch (error) {
      console.error('Failed to cancel export:', error);
    }
  },

  updateExportProgress: async (progress) => {
    try {
      await get().updateEditor({
        exportProgress: progress
      });
    } catch (error) {
      console.error('Failed to update export progress:', error);
    }
  },

  completeExport: async (videoUrl) => {
    try {
      await get().updateEditor({
        isExporting: false,
        exportProgress: 100,
        exportJob: null,
        error: null
      });
    } catch (error) {
      console.error('Failed to complete export:', error);
    }
  },

  failExport: async (error) => {
    try {
      await get().updateEditor({
        isExporting: false,
        exportProgress: 0,
        exportJob: null,
        error
      });
    } catch (error) {
      console.error('Failed to fail export:', error);
    }
  },

  // Timeline selection
  setTimelineSelection: async (selection) => {
    try {
      await get().updateEditor({ selection });
    } catch (error) {
      console.error('Failed to set timeline selection:', error);
    }
  },

  clearTimelineSelection: async () => {
    try {
      await get().updateEditor({ selection: null });
    } catch (error) {
      console.error('Failed to clear timeline selection:', error);
    }
  },

  getTimelineSelection: async () => {
    const { editor } = get();
    return editor?.selection || null;
  },

  // Utility
  reset: async () => {
    try {
      const { editor } = get();
      if (editor) {
        await videoEditorAPI.deleteEditor(editor.projectId);
      }
      set({
        editor: null,
        isLoading: false,
        isExporting: false,
        exportProgress: 0,
        error: null
      });
    } catch (error) {
      console.error('Failed to reset video editor:', error);
    }
  },

  setLoading: async (loading) => {
    set({ isLoading: loading });
  },

  setError: async (error) => {
    set({ error });
  },

  // localStorage backup
  saveToStorage: () => {
    try {
      const { editor } = get();
      if (editor) {
        localStorage.setItem('video-editor-storage', JSON.stringify(editor));
      }
    } catch (error) {
      console.error('Failed to save video editor to localStorage:', error);
    }
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('video-editor-storage');
      if (stored) {
        const parsedEditor = JSON.parse(stored, (key, value) => {
          if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
          }
          return value;
        });
        set({ editor: parsedEditor, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load video editor from localStorage:', error);
    }
  }
}));