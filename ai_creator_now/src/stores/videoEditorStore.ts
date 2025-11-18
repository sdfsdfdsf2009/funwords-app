import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

interface VideoEditorStore extends VideoEditorState {
  // Editor actions
  initializeEditor: (projectId: string) => void;
  updateEditor: (updates: Partial<VideoEditor>) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setZoom: (zoom: number) => void;
  setPlaybackRate: (rate: number) => void;

  // Timeline management
  addVideoSegment: (segment: VideoSegment) => void;
  removeVideoSegment: (segmentId: string) => void;
  updateVideoSegment: (segmentId: string, updates: Partial<VideoSegment>) => void;
  moveVideoSegment: (segmentId: string, newTime: number) => void;
  trimVideoSegment: (segmentId: string, trimStart: number, trimEnd: number) => void;
  splitVideoSegment: (segmentId: string, splitTime: number) => void;

  // Audio management
  addAudioTrack: (audioTrack: AudioTrack) => void;
  removeAudioTrack: (trackId: string) => void;
  updateAudioTrack: (trackId: string, updates: Partial<AudioTrack>) => void;

  // Text overlays
  addTextOverlay: (textOverlay: TextOverlay) => void;
  removeTextOverlay: (overlayId: string) => void;
  updateTextOverlay: (overlayId: string, updates: Partial<TextOverlay>) => void;

  // Video effects
  addVideoEffect: (effect: VideoEffect) => void;
  removeVideoEffect: (effectId: string) => void;
  updateVideoEffect: (effectId: string, updates: Partial<VideoEffect>) => void;

  // Transitions
  addTransition: (transition: Transition) => void;
  removeTransition: (transitionId: string) => void;
  updateTransition: (transitionId: string, updates: Partial<Transition>) => void;

  // Selection management
  selectSegments: (segmentIds: string[]) => void;
  clearSelection: () => void;
  getSelection: () => string[];

  // Timeline tracks
  addTrack: (track: TimelineTrack) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  // Viewport management
  setViewport: (viewport: TimelineViewport) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToContent: () => void;

  // Editing tools
  setActiveTool: (toolId: string) => void;
  getActiveTool: () => EditingTool | null;

  // Export functionality
  startExport: (settings: any) => void;
  updateExportProgress: (progress: number) => void;
  completeExport: (outputPath: string, fileSize: number, duration: number) => void;
  failExport: (error: string) => void;

  // Timeline selection
  setTimelineSelection: (selection: TimelineSelection) => void;
  clearTimelineSelection: () => void;
  getTimelineSelection: () => TimelineSelection | null;

  // Utility
  reset: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const DEFAULT_TOOLS: EditingTool[] = [
  { id: 'select', name: '选择工具', icon: '↖️', type: 'select', isActive: true },
  { id: 'trim', name: '裁剪工具', icon: '✂️', type: 'trim', isActive: false },
  { id: 'split', name: '分割工具', icon: '⚔️', type: 'split', isActive: false },
  { id: 'transition', name: '转场工具', icon: '🎭', type: 'transition', isActive: false },
  { id: 'text', name: '文字工具', icon: '📝', type: 'text', isActive: false },
  { id: 'audio', name: '音频工具', icon: '🎵', type: 'audio', isActive: false },
  { id: 'effect', name: '效果工具', icon: '✨', type: 'effect', isActive: false },
];

const DEFAULT_SHORTCUTS: EditorShortcut[] = [
  { key: ' ', modifiers: [], action: 'playPause', description: '播放/暂停', category: 'playback' },
  { key: 'ArrowLeft', modifiers: [], action: 'seekPrevious', description: '后退一帧', category: 'navigation' },
  { key: 'ArrowRight', modifiers: [], action: 'seekNext', description: '前进一帧', category: 'navigation' },
  { key: 'ArrowLeft', modifiers: ['shift'], action: 'seekPreviousSecond', description: '后退1秒', category: 'navigation' },
  { key: 'ArrowRight', modifiers: ['shift'], action: 'seekNextSecond', description: '前进1秒', category: 'navigation' },
  { key: 's', modifiers: [], action: 'split', description: '分割片段', category: 'editing' },
  { key: 'Delete', modifiers: [], action: 'deleteSelected', description: '删除选中片段', category: 'editing' },
  { key: 'a', modifiers: ['ctrl'], action: 'selectAll', description: '全选', category: 'editing' },
  { key: 'z', modifiers: ['ctrl'], action: 'undo', description: '撤销', category: 'editing' },
  { key: 'z', modifiers: ['ctrl', 'shift'], action: 'redo', description: '重做', category: 'editing' },
];

export const useVideoEditorStore = create<VideoEditorStore>()(
  persist(
    (set, get) => ({
      // Initial state
      editor: null,
      isLoading: false,
      isExporting: false,
      exportProgress: 0,
      error: null,

      // Editor actions
      initializeEditor: (projectId) => {
        const newEditor: VideoEditor = {
          id: `editor_${Date.now()}`,
          projectId,
          timeline: {
            id: `timeline_${Date.now()}`,
            projectId,
            videoSegments: [],
            audioTracks: [],
            transitions: [],
            duration: 0,
          },
          currentTime: 0,
          isPlaying: false,
          volume: 1,
          zoom: 1,
          selectedSegments: [],
          playbackRate: 1,
        };

        set({ editor: newEditor, error: null });
      },

      updateEditor: (updates) => {
        set(state => {
          if (!state.editor) return state;

          // Defensive: ensure selectedSegments is always an array
          const sanitizedUpdates = {
            ...updates,
            selectedSegments: Array.isArray(updates.selectedSegments) ? updates.selectedSegments : state.editor.selectedSegments || [],
          };

          return {
            editor: {
              ...state.editor,
              ...sanitizedUpdates,
            }
          };
        });
      },

      setCurrentTime: (time) => {
        set(state => {
          if (!state.editor) return state;

          return {
            editor: {
              ...state.editor,
              currentTime: Math.max(0, Math.min(time, state.editor.timeline.duration)),
            }
          };
        });
      },

      setPlaying: (playing) => {
        set(state => {
          if (!state.editor) return state;

          return {
            editor: {
              ...state.editor,
              isPlaying: playing,
            }
          };
        });
      },

      setVolume: (volume) => {
        set(state => {
          if (!state.editor) return state;

          return {
            editor: {
              ...state.editor,
              volume: Math.max(0, Math.min(1, volume)),
            }
          };
        });
      },

      setZoom: (zoom) => {
        set(state => {
          if (!state.editor) return state;

          return {
            editor: {
              ...state.editor,
              zoom: Math.max(0.1, Math.min(10, zoom)),
            }
          };
        });
      },

      setPlaybackRate: (rate) => {
        set(state => {
          if (!state.editor) return state;

          return {
            editor: {
              ...state.editor,
              playbackRate: rate,
            }
          };
        });
      },

      // Timeline management
      addVideoSegment: (segment) => {
        set(state => {
          if (!state.editor) return state;

          const updatedTimeline = {
            ...state.editor.timeline,
            videoSegments: [...state.editor.timeline.videoSegments, segment],
            duration: Math.max(
              state.editor.timeline.duration,
              segment.position + (segment.trimEnd - segment.trimStart)
            ),
          };

          return {
            editor: {
              ...state.editor,
              timeline: updatedTimeline,
            }
          };
        });
      },

      removeVideoSegment: (segmentId) => {
        set(state => {
          if (!state.editor) return state;

          const updatedSegments = state.editor.timeline.videoSegments.filter(s => s.id !== segmentId);

          // Recalculate timeline duration
          const newDuration = updatedSegments.reduce((max, segment) => {
            return Math.max(max, segment.position + (segment.trimEnd - segment.trimStart));
          }, 0);

          const updatedTimeline = {
            ...state.editor.timeline,
            videoSegments: updatedSegments,
            duration: newDuration,
          };

          return {
            editor: {
              ...state.editor,
              timeline: updatedTimeline,
              selectedSegments: state.editor.selectedSegments.filter(id => id !== segmentId),
            }
          };
        });
      },

      updateVideoSegment: (segmentId, updates) => {
        set(state => {
          if (!state.editor) return state;

          const updatedSegments = state.editor.timeline.videoSegments.map(segment =>
            segment.id === segmentId ? { ...segment, ...updates } : segment
          );

          return {
            editor: {
              ...state.editor,
              timeline: {
                ...state.editor.timeline,
                videoSegments: updatedSegments,
              }
            }
          };
        });
      },

      moveVideoSegment: (segmentId, newTime) => {
        const { updateVideoSegment } = get();
        updateVideoSegment(segmentId, { position: newTime });
      },

      trimVideoSegment: (segmentId, trimStart, trimEnd) => {
        const { updateVideoSegment } = get();
        updateVideoSegment(segmentId, { trimStart, trimEnd });
      },

      splitVideoSegment: (segmentId, splitTime) => {
        set(state => {
          if (!state.editor) return state;

          const segment = state.editor.timeline.videoSegments.find(s => s.id === segmentId);
          if (!segment) return state;

          const segmentDuration = segment.trimEnd - segment.trimStart;
          const relativeSplitTime = splitTime - segment.position;

          if (relativeSplitTime <= 0 || relativeSplitTime >= segmentDuration) return state;

          const firstSegment: VideoSegment = {
            ...segment,
            id: `${segment.id}_1`,
            trimEnd: segment.trimStart + relativeSplitTime,
          };

          const secondSegment: VideoSegment = {
            ...segment,
            id: `${segment.id}_2`,
            position: splitTime,
            trimStart: segment.trimStart + relativeSplitTime,
          };

          const updatedSegments = state.editor.timeline.videoSegments
            .filter(s => s.id !== segmentId)
            .concat([firstSegment, secondSegment]);

          return {
            editor: {
              ...state.editor,
              timeline: {
                ...state.editor.timeline,
                videoSegments: updatedSegments,
              }
            }
          };
        });
      },

      // Audio management
      addAudioTrack: (audioTrack) => {
        set(state => {
          if (!state.editor) return state;

          const updatedTimeline = {
            ...state.editor.timeline,
            audioTracks: [...state.editor.timeline.audioTracks, audioTrack],
            duration: Math.max(
              state.editor.timeline.duration,
              audioTrack.position + (audioTrack.trimEnd - audioTrack.trimStart)
            ),
          };

          return {
            editor: {
              ...state.editor,
              timeline: updatedTimeline,
            }
          };
        });
      },

      removeAudioTrack: (trackId) => {
        set(state => {
          if (!state.editor) return state;

          const updatedTimeline = {
            ...state.editor.timeline,
            audioTracks: state.editor.timeline.audioTracks.filter(track => track.id !== trackId),
          };

          return {
            editor: {
              ...state.editor,
              timeline: updatedTimeline,
            }
          };
        });
      },

      updateAudioTrack: (trackId, updates) => {
        set(state => {
          if (!state.editor) return state;

          const updatedTracks = state.editor.timeline.audioTracks.map(track =>
            track.id === trackId ? { ...track, ...updates } : track
          );

          return {
            editor: {
              ...state.editor,
              timeline: {
                ...state.editor.timeline,
                audioTracks: updatedTracks,
              }
            }
          };
        });
      },

      // Text overlays
      addTextOverlay: (textOverlay) => {
        console.log('Adding text overlay:', textOverlay);
        // This would be implemented when we have text overlay functionality
      },

      removeTextOverlay: (overlayId) => {
        console.log('Removing text overlay:', overlayId);
        // This would be implemented when we have text overlay functionality
      },

      updateTextOverlay: (overlayId, updates) => {
        console.log('Updating text overlay:', overlayId, updates);
        // This would be implemented when we have text overlay functionality
      },

      // Video effects
      addVideoEffect: (effect) => {
        console.log('Adding video effect:', effect);
        // This would be implemented when we have video effects functionality
      },

      removeVideoEffect: (effectId) => {
        console.log('Removing video effect:', effectId);
        // This would be implemented when we have video effects functionality
      },

      updateVideoEffect: (effectId, updates) => {
        console.log('Updating video effect:', effectId, updates);
        // This would be implemented when we have video effects functionality
      },

      // Transitions
      addTransition: (transition) => {
        set(state => {
          if (!state.editor) return state;

          const updatedTimeline = {
            ...state.editor.timeline,
            transitions: [...state.editor.timeline.transitions, transition],
          };

          return {
            editor: {
              ...state.editor,
              timeline: updatedTimeline,
            }
          };
        });
      },

      removeTransition: (transitionId) => {
        set(state => {
          if (!state.editor) return state;

          const updatedTimeline = {
            ...state.editor.timeline,
            transitions: state.editor.timeline.transitions.filter(t => t.id !== transitionId),
          };

          return {
            editor: {
              ...state.editor,
              timeline: updatedTimeline,
            }
          };
        });
      },

      updateTransition: (transitionId, updates) => {
        set(state => {
          if (!state.editor) return state;

          const updatedTransitions = state.editor.timeline.transitions.map(transition =>
            transition.id === transitionId ? { ...transition, ...updates } : transition
          );

          return {
            editor: {
              ...state.editor,
              timeline: {
                ...state.editor.timeline,
                transitions: updatedTransitions,
              }
            }
          };
        });
      },

      // Selection management
      selectSegments: (segmentIds) => {
        set(state => {
          if (!state.editor) return state;

          return {
            editor: {
              ...state.editor,
              selectedSegments: Array.isArray(segmentIds) ? segmentIds : [],
            }
          };
        });
      },

      clearSelection: () => {
        set(state => {
          if (!state.editor) return state;

          return {
            editor: {
              ...state.editor,
              selectedSegments: [],
            }
          };
        });
      },

      getSelection: () => {
        const state = get();
        return state.editor?.selectedSegments || [];
      },

      // Timeline tracks
      addTrack: (track) => {
        console.log('Adding track:', track);
        // This would be implemented when we have multi-track functionality
      },

      removeTrack: (trackId) => {
        console.log('Removing track:', trackId);
        // This would be implemented when we have multi-track functionality
      },

      updateTrack: (trackId, updates) => {
        console.log('Updating track:', trackId, updates);
        // This would be implemented when we have multi-track functionality
      },

      reorderTracks: (fromIndex, toIndex) => {
        console.log('Reordering tracks:', fromIndex, toIndex);
        // This would be implemented when we have multi-track functionality
      },

      // Viewport management
      setViewport: (viewport) => {
        console.log('Setting viewport:', viewport);
        // This would be implemented when we have viewport management
      },

      zoomIn: () => {
        const state = get();
        const currentZoom = state.editor?.zoom || 1;
        const newZoom = Math.min(currentZoom * 1.2, 10);
        state.setZoom(newZoom);
      },

      zoomOut: () => {
        const state = get();
        const currentZoom = state.editor?.zoom || 1;
        const newZoom = Math.max(currentZoom / 1.2, 0.1);
        state.setZoom(newZoom);
      },

      fitToContent: () => {
        console.log('Fitting to content');
        // This would be implemented when we have viewport management
      },

      // Editing tools
      setActiveTool: (toolId) => {
        console.log('Setting active tool:', toolId);
        // This would be implemented when we have tool management
      },

      getActiveTool: () => {
        return DEFAULT_TOOLS.find(tool => tool.isActive) || null;
      },

      // Export functionality
      startExport: (settings) => {
        set({ isExporting: true, exportProgress: 0, error: null });
      },

      updateExportProgress: (progress) => {
        set({ exportProgress: progress });
      },

      completeExport: (outputPath, fileSize, duration) => {
        set({
          isExporting: false,
          exportProgress: 100,
          error: null
        });
      },

      failExport: (error) => {
        set({
          isExporting: false,
          exportProgress: 0,
          error
        });
      },

      // Timeline selection
      setTimelineSelection: (selection) => {
        console.log('Setting timeline selection:', selection);
        // This would be implemented when we have timeline selection
      },

      clearTimelineSelection: () => {
        console.log('Clearing timeline selection');
        // This would be implemented when we have timeline selection
      },

      getTimelineSelection: () => {
        return null; // This would be implemented when we have timeline selection
      },

      // Utility
      reset: () => {
        set({
          editor: null,
          isLoading: false,
          isExporting: false,
          exportProgress: 0,
          error: null,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'video-editor-storage',
      storage: createJSONStorage(() => {
        const storage = localStorage;
        return {
          getItem: (name) => {
            const str = storage.getItem(name);
            if (!str) return null;
            try {
              return JSON.parse(str, (key, value) => {
                if (value && typeof value === 'object' && value.__type === 'Date') {
                  return new Date(value.value);
                }
                return value;
              });
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            const str = JSON.stringify(value, (key, value) => {
              if (value instanceof Date) {
                return { __type: 'Date', value: value.toISOString() };
              }
              return value;
            });
            storage.setItem(name, str);
          },
          removeItem: (name) => storage.removeItem(name),
        };
      }),
      partialize: (state) => ({
        editor: state.editor,
      }),
      skipHydration: true,
    }
  )
);