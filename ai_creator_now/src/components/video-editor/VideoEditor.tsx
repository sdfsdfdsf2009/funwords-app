import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useVideoEditorStore } from '../../stores/videoEditorStore';
import { useProjectStore } from '../../stores/projectStore';
import { TimelineEditor } from './TimelineEditor';
import { VideoPreview } from './VideoPreview';
import { VideoLibrary } from './VideoLibrary';
import { ExportPanel } from './ExportPanel';
import { EditingTools } from './EditingTools';
import { VideoSegment, GeneratedVideo } from '../../types';

interface VideoEditorProps {
  projectId: string;
  onClose?: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ projectId, onClose }) => {
  const {
    editor,
    initializeEditor,
    addVideoSegment,
    reset,
  } = useVideoEditorStore();

  const { currentProject } = useProjectStore();
  const [activePanel, setActivePanel] = useState<'timeline' | 'library' | 'export'>('timeline');
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);

  // Defensive: Memoize safe access to selectedSegments
  const selectedSegmentsCount = useMemo(() => {
    if (!editor) return 0;
    if (!Array.isArray(editor.selectedSegments)) {
      console.warn('VideoEditor: selectedSegments is not an array', editor.selectedSegments);
      return 0;
    }
    return editor.selectedSegments.length;
  }, [editor?.selectedSegments]);

  // Defensive: Memoize safe access to timeline data
  const timelineData = useMemo(() => {
    if (!editor?.timeline) {
      return { duration: 0, videoSegments: [], transitions: [] };
    }
    return {
      duration: typeof editor.timeline.duration === 'number' ? editor.timeline.duration : 0,
      videoSegments: Array.isArray(editor.timeline.videoSegments) ? editor.timeline.videoSegments : [],
      transitions: Array.isArray(editor.timeline.transitions) ? editor.timeline.transitions : [],
    };
  }, [editor?.timeline]);

  // Initialize editor when component mounts
  useEffect(() => {
    if (projectId) {
      initializeEditor(projectId);
    }

    return () => {
      reset();
    };
  }, [projectId, initializeEditor, reset]);

  // Debug: Validate editor state in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && editor) {
      validateEditorState();
    }
  }, [editor, selectedSegmentsCount, timelineData]);

  // Handle adding a video to timeline
  const handleAddVideoToTimeline = (video: GeneratedVideo, startTime: number = 0) => {
    const segment: VideoSegment = {
      id: `segment_${Date.now()}`,
      videoId: video.id,
      position: startTime,
      trimStart: 0,
      trimEnd: video.metadata.duration,
    };

    addVideoSegment(segment);
  };

  // Handle adding multiple videos to timeline
  const handleAddMultipleVideosToTimeline = (videos: GeneratedVideo[]) => {
    let currentTime = 0;
    videos.forEach((video) => {
      handleAddVideoToTimeline(video, currentTime);
      currentTime += video.metadata.duration;
    });
  };

  // Debug function to validate editor state
  const validateEditorState = () => {
    if (!editor) return true;

    const issues: string[] = [];

    if (!Array.isArray(editor.selectedSegments)) {
      issues.push(`selectedSegments is not an array: ${typeof editor.selectedSegments}`);
    }

    if (!editor.timeline) {
      issues.push('timeline is undefined');
    } else {
      if (!Array.isArray(editor.timeline.videoSegments)) {
        issues.push(`timeline.videoSegments is not an array: ${typeof editor.timeline.videoSegments}`);
      }
      if (!Array.isArray(editor.timeline.transitions)) {
        issues.push(`timeline.transitions is not an array: ${typeof editor.timeline.transitions}`);
      }
      if (typeof editor.timeline.duration !== 'number') {
        issues.push(`timeline.duration is not a number: ${typeof editor.timeline.duration}`);
      }
    }

    if (issues.length > 0) {
      console.error('VideoEditor state validation failed:', issues);
      console.error('Editor state:', editor);
      return false;
    }

    return true;
  };

  // Get all videos from current project
  const getAllProjectVideos = (): GeneratedVideo[] => {
    if (!currentProject) return [];

    const videos: GeneratedVideo[] = [];
    currentProject.scenes.forEach((scene) => {
      if (scene.generatedVideos && scene.generatedVideos.length > 0) {
        videos.push(...scene.generatedVideos);
      }
      // Also check legacy generatedVideo field
      if (scene.generatedVideo) {
        videos.push(scene.generatedVideo);
      }
    });

    return videos;
  };

  const allVideos = getAllProjectVideos();

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-2">正在加载视频编辑器...</div>
          <div className="text-sm text-gray-500">请稍候</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">视频编辑器</h1>
          {currentProject && (
            <div className="text-sm text-gray-500">
              项目: {currentProject.name}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Panel tabs */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActivePanel('timeline')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activePanel === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              时间轴
            </button>
            <button
              onClick={() => setActivePanel('library')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activePanel === 'library'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              视频库
            </button>
            <button
              onClick={() => setActivePanel('export')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activePanel === 'export'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              导出
            </button>
          </div>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md"
              title="关闭编辑器"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Video preview and tools */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="flex h-64">
            {/* Video preview */}
            <div className="flex-1 flex items-center justify-center bg-black">
              <VideoPreview
                currentTime={editor?.currentTime || 0}
                isPlaying={editor?.isPlaying || false}
                volume={editor?.volume || 1}
                onTimeChange={(time) => {
                  // Update timeline playhead
                }}
                onVolumeChange={(volume) => {
                  // Update editor volume
                }}
              />
            </div>

            {/* Editing tools */}
            <div className="w-64 border-l border-gray-200 p-4">
              <EditingTools
                selectedSegmentIds={editor?.selectedSegments || []}
                onSplit={(segmentId, time) => {
                  // Handle split
                }}
                onTrim={(segmentId, start, end) => {
                  // Handle trim
                }}
                onTransition={(segmentId, transition) => {
                  // Handle transition
                }}
              />
            </div>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 flex flex-col">
          {activePanel === 'timeline' && (
            <TimelineEditor
              projectId={projectId}
              onSegmentSelect={(segmentId) => {
                // Handle segment selection
              }}
              onTimeChange={(time) => {
                // Handle time change
              }}
            />
          )}

          {activePanel === 'library' && (
            <VideoLibrary
              videos={allVideos}
              onVideoSelect={(video) => {
                setSelectedVideo(video);
              }}
              onVideoAddToTimeline={(video) => {
                handleAddVideoToTimeline(video);
              }}
              onMultipleVideosAddToTimeline={(videos) => {
                handleAddMultipleVideosToTimeline(videos);
              }}
            />
          )}

          {activePanel === 'export' && (
            <ExportPanel
              timeline={{
                videoSegments: timelineData.videoSegments,
                audioTracks: editor?.timeline?.audioTracks || [],
                transitions: timelineData.transitions,
                duration: timelineData.duration,
              }}
              onExport={(settings) => {
                // Handle export
              }}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white text-sm">
        <div className="flex items-center space-x-4">
          <span>
            时间轴: {timelineData.duration.toFixed(1)}s
          </span>
          <span>
            片段: {timelineData.videoSegments.length}
          </span>
          <span>
            转场: {timelineData.transitions.length}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span>
            选中: {selectedSegmentsCount} 个片段
          </span>
          <span>
            当前时间: {editor?.currentTime?.toFixed(1) || '0.0'}s
          </span>
        </div>
      </div>
    </div>
  );
};