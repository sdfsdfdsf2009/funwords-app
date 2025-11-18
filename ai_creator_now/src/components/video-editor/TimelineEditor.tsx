import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useVideoEditorStore } from '../../stores/videoEditorStore';
import { VideoSegment, Transition, EditingTool } from '../../types';

interface TimelineEditorProps {
  projectId: string;
  onSegmentSelect?: (segmentId: string) => void;
  onTimeChange?: (time: number) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  projectId,
  onSegmentSelect,
  onTimeChange,
}) => {
  const {
    editor,
    updateEditor,
    setCurrentTime,
    selectSegments,
    addVideoSegment,
    removeVideoSegment,
    updateVideoSegment,
    moveVideoSegment,
    trimVideoSegment,
    splitVideoSegment,
    addTransition,
    removeTransition,
    zoomIn,
    zoomOut,
    setPlaying,
  } = useVideoEditorStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSegment, setDraggedSegment] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimmingSegment, setTrimmingSegment] = useState<string | null>(null);
  const [trimEdge, setTrimEdge] = useState<'start' | 'end' | null>(null);

  // Timeline settings
  const pixelsPerSecond = 50 * (editor?.zoom || 1); // Base zoom is 50px per second
  const timelineHeight = 120;
  const trackHeight = 60;
  const headerHeight = 30;

  // Initialize editor if not already done
  useEffect(() => {
    if (!editor && projectId) {
      useVideoEditorStore.getState().initializeEditor(projectId);
    }
  }, [editor, projectId]);

  // Handle timeline click for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging || isTrimming) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !editor) return;

    const clickX = e.clientX - rect.left;
    const time = clickX / pixelsPerSecond;

    setCurrentTime(time);
    onTimeChange?.(time);
  }, [editor, isDragging, isTrimming, pixelsPerSecond, setCurrentTime, onTimeChange]);

  // Handle segment drag start
  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, segmentId: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedSegment(segmentId);
    selectSegments([segmentId]);
  }, [selectSegments]);

  // Handle trim start
  const handleTrimMouseDown = useCallback((e: React.MouseEvent, segmentId: string, edge: 'start' | 'end') => {
    e.stopPropagation();
    setIsTrimming(true);
    setTrimmingSegment(segmentId);
    setTrimEdge(edge);
  }, []);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!editor || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const time = Math.max(0, mouseX / pixelsPerSecond);

    if (isScrubbing) {
      setCurrentTime(time);
      onTimeChange?.(time);
    } else if (isDragging && draggedSegment) {
      const segment = editor.timeline.videoSegments.find(s => s.id === draggedSegment);
      if (segment) {
        const segmentDuration = segment.trimEnd - segment.trimStart;
        const newPosition = Math.max(0, Math.min(time, editor.timeline.duration - segmentDuration));
        moveVideoSegment(draggedSegment, newPosition);
      }
    } else if (isTrimming && trimmingSegment && trimEdge) {
      const segment = editor.timeline.videoSegments.find(s => s.id === trimmingSegment);
      if (segment) {
        const relativeTime = time - segment.position;
        if (trimEdge === 'start') {
          const newTrimStart = Math.max(0, Math.min(relativeTime, segment.trimEnd - 0.1));
          trimVideoSegment(trimmingSegment, newTrimStart, segment.trimEnd);
        } else {
          const newTrimEnd = Math.max(segment.trimStart + 0.1, Math.min(relativeTime, 100));
          trimVideoSegment(trimmingSegment, segment.trimStart, newTrimEnd);
        }
      }
    }
  }, [editor, isScrubbing, isDragging, draggedSegment, isTrimming, trimmingSegment, trimEdge, pixelsPerSecond, setCurrentTime, onTimeChange, moveVideoSegment, trimVideoSegment]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedSegment(null);
    setIsScrubbing(false);
    setIsTrimming(false);
    setTrimmingSegment(null);
    setTrimEdge(null);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging || isScrubbing || isTrimming) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isScrubbing, isTrimming, handleMouseMove, handleMouseUp]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setPlaying(!editor?.isPlaying);
          break;
        case 'Delete':
          if (editor?.selectedSegments?.length && editor.selectedSegments.length > 0) {
            editor.selectedSegments.forEach(segmentId => {
              removeVideoSegment(segmentId);
            });
            selectSegments([]);
          }
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey && editor.currentTime > 0) {
            // Find segment at current time and split it
            const segment = editor.timeline.videoSegments.find(s =>
              editor.currentTime >= s.position &&
              editor.currentTime <= s.position + (s.trimEnd - s.trimStart)
            );
            if (segment) {
              splitVideoSegment(segment.id, editor.currentTime);
            }
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selectSegments(editor.timeline.videoSegments.map(s => s.id));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, setPlaying, removeVideoSegment, selectSegments, splitVideoSegment]);

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Render time markers
  const renderTimeMarkers = useMemo(() => {
    if (!editor) return [];

    const markers = [];
    const duration = editor.timeline.duration;
    const interval = duration > 60 ? 10 : 5; // 10-second intervals for long timelines, 5-second for shorter

    for (let time = 0; time <= duration; time += interval) {
      const x = time * pixelsPerSecond;
      markers.push(
        <div
          key={time}
          className="absolute top-0 bottom-0 border-l border-gray-300"
          style={{ left: `${x}px` }}
        >
          <span className="absolute -top-6 -left-4 text-xs text-gray-500 whitespace-nowrap">
            {formatTime(time)}
          </span>
        </div>
      );
    }

    return markers;
  }, [editor, pixelsPerSecond, formatTime]);

  // Render video segments
  const renderVideoSegments = useMemo(() => {
    if (!editor) return [];

    return editor.timeline.videoSegments.map((segment) => {
      const x = segment.position * pixelsPerSecond;
      const width = (segment.trimEnd - segment.trimStart) * pixelsPerSecond;
      const isSelected = editor?.selectedSegments?.includes(segment.id) || false;

      return (
        <div
          key={segment.id}
          className={`absolute top-8 h-12 rounded cursor-move border-2 transition-colors ${
            isSelected
              ? 'border-blue-500 bg-blue-100'
              : 'border-gray-300 bg-white hover:border-gray-400'
          } ${draggedSegment === segment.id ? 'opacity-50' : ''}`}
          style={{
            left: `${x}px`,
            width: `${width}px`,
          }}
          onMouseDown={(e) => handleSegmentMouseDown(e, segment.id)}
          onClick={() => {
            onSegmentSelect?.(segment.id);
            selectSegments([segment.id]);
          }}
        >
          {/* Video thumbnail placeholder */}
          <div className="absolute inset-1 bg-gray-100 rounded flex items-center justify-center">
            <div className="text-xs text-gray-400 truncate px-1">
              Video {segment.id.slice(-4)}
            </div>
          </div>

          {/* Trim handles */}
          {isSelected && (
            <>
              <div
                className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500 cursor-ew-resize hover:bg-blue-600"
                onMouseDown={(e) => handleTrimMouseDown(e, segment.id, 'start')}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-2 bg-blue-500 cursor-ew-resize hover:bg-blue-600"
                onMouseDown={(e) => handleTrimMouseDown(e, segment.id, 'end')}
              />
            </>
          )}
        </div>
      );
    });
  }, [editor, draggedSegment, pixelsPerSecond, handleSegmentMouseDown, handleTrimMouseDown, onSegmentSelect, selectSegments]);

  // Render transitions
  const renderTransitions = useMemo(() => {
    if (!editor) return [];

    return editor.timeline.transitions.map((transition) => {
      const x = transition.position * pixelsPerSecond;
      const width = transition.duration * pixelsPerSecond;

      return (
        <div
          key={transition.id}
          className="absolute top-8 h-12 bg-purple-500 bg-opacity-50 rounded border border-purple-600 flex items-center justify-center"
          style={{
            left: `${x}px`,
            width: `${width}px`,
          }}
        >
          <div className="text-xs text-purple-800 font-medium">
            {transition.type}
          </div>
        </div>
      );
    });
  }, [editor, pixelsPerSecond]);

  // Render playhead
  const renderPlayhead = useMemo(() => {
    if (!editor) return null;

    const x = editor.currentTime * pixelsPerSecond;

    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
        style={{ left: `${x}px` }}
      >
        <div className="absolute -top-2 -left-3 w-6 h-4 bg-red-500 rounded-sm" />
        <div className="absolute -top-6 left-2 text-xs text-red-500 font-medium whitespace-nowrap">
          {formatTime(editor.currentTime)}
        </div>
      </div>
    );
  }, [editor, pixelsPerSecond, formatTime]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200">
      {/* Timeline header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-900">时间轴</h3>
          <span className="text-sm text-gray-500">
            {editor.timeline.duration.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="缩小"
          >
            −
          </button>
          <span className="text-sm text-gray-500 min-w-8 text-center">
            {Math.round(editor.zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="放大"
          >
            +
          </button>

          {/* Playback controls */}
          <div className="border-l border-gray-300 ml-2 pl-2">
            <button
              onClick={() => setPlaying(!editor.isPlaying)}
              className={`p-2 rounded ${
                editor.isPlaying
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title={editor.isPlaying ? '暂停' : '播放'}
            >
              {editor.isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div
        ref={timelineRef}
        className="flex-1 relative overflow-x-auto overflow-y-hidden bg-gray-50"
        onClick={handleTimelineClick}
        onMouseMove={(e) => {
          if (e.buttons === 1 && !isDragging && !isTrimming) {
            setIsScrubbing(true);
          }
        }}
      >
        <div
          className="relative h-full"
          style={{
            width: `${editor.timeline.duration * pixelsPerSecond + 200}px`,
            minHeight: `${timelineHeight}px`
          }}
        >
          {/* Time markers */}
          {renderTimeMarkers}

          {/* Video track background */}
          <div
            className="absolute top-8 bg-white border border-gray-300 rounded"
            style={{
              left: '0px',
              right: '200px',
              height: `${trackHeight}px`,
            }}
          >
            <div className="absolute top-0 left-2 py-1 text-xs text-gray-500">
              视频
            </div>
          </div>

          {/* Video segments */}
          {renderVideoSegments}

          {/* Transitions */}
          {renderTransitions}

          {/* Playhead */}
          {renderPlayhead}
        </div>
      </div>

      {/* Timeline footer */}
      <div className="px-4 py-1 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            选中: {editor?.selectedSegments?.length || 0} 个片段
          </div>
          <div>
            当前时间: {formatTime(editor?.currentTime || 0)} / {formatTime(editor?.timeline?.duration || 0)}
          </div>
        </div>
      </div>
    </div>
  );
};