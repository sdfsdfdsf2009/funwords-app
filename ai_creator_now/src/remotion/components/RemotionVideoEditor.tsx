import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player } from '@remotion/player';
import {
  RemotionTimeline,
  RemotionSettings,
  RemotionVideoSegment,
  useRemotionEditorStore
} from '../../stores/remotionEditorStore';
import VideoComposition from '../compositions/VideoComposition';

interface RemotionVideoEditorProps {
  projectId?: string;
  onTimelineChange?: (timeline: RemotionTimeline) => void;
  className?: string;
}

// 时间格式化工具
const formatTime = (timeInSeconds: number): string => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const frames = Math.floor((timeInSeconds % 1) * 30);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
};

// 时间轴轨道组件
const TimelineTrack: React.FC<{
  segments: RemotionVideoSegment[];
  selectedSegment: string | null;
  currentTime: number;
  scale: number;
  onSegmentClick: (segmentId: string) => void;
  onSegmentDrag: (segmentId: string, newStartTime: number) => void;
}> = ({ segments, selectedSegment, currentTime, scale, onSegmentClick, onSegmentDrag }) => {
  const [draggingSegment, setDraggingSegment] = useState<string | null>(null);
  const [dragStartTime, setDragStartTime] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);

  const handleMouseDown = (e: React.MouseEvent, segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;

    setDraggingSegment(segmentId);
    setDragStartTime(segment.startTime);
    setDragOffset((offsetX / scale) - segment.startTime);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingSegment || !e.currentTarget) return;

    const timelineElement = e.currentTarget as HTMLElement;
    const rect = timelineElement.getBoundingClientRect();
    const newStartTime = Math.max(0, ((e.clientX - rect.left - dragOffset) / scale));

    onSegmentDrag(draggingSegment, newStartTime);
  }, [draggingSegment, dragOffset, scale, onSegmentDrag]);

  const handleMouseUp = useCallback(() => {
    setDraggingSegment(null);
    setDragStartTime(0);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    if (draggingSegment) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingSegment, handleMouseMove, handleMouseUp]);

  const totalDuration = Math.max(...segments.map(s => s.startTime + s.duration), 1);

  return (
    <div className="relative h-20 bg-gray-800 rounded overflow-hidden">
      {/* 时间标尺 */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gray-900 flex items-center px-2">
        {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute text-xs text-gray-400"
            style={{ left: `${i * scale}px` }}
          >
            {i}s
          </div>
        ))}
      </div>

      {/* 播放头 */}
      <div
        className="absolute top-4 bottom-0 w-0.5 bg-red-500 z-20"
        style={{ left: `${currentTime * scale}px` }}
      >
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full"></div>
      </div>

      {/* 视频片段 */}
      {segments.map((segment) => (
        <div
          key={segment.id}
          className={`absolute top-6 bottom-0 cursor-pointer transition-all duration-150 ${
            selectedSegment === segment.id
              ? 'ring-2 ring-blue-500 z-10'
              : 'hover:ring-1 hover:ring-blue-400'
          } ${draggingSegment === segment.id ? 'opacity-75' : ''}`}
          style={{
            left: `${segment.startTime * scale}px`,
            width: `${segment.duration * scale}px`,
          }}
          onClick={() => onSegmentClick(segment.id)}
          onMouseDown={(e) => handleMouseDown(e, segment.id)}
        >
          <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center px-2">
            <div className="text-white text-xs truncate">
              {segment.id.split('-').pop()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 工具栏组件
const Toolbar: React.FC<{
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}> = ({ selectedTool, onToolSelect, onUndo, onRedo, canUndo, canRedo }) => {
  const tools = [
    { id: 'select', icon: '↖️', name: '选择' },
    { id: 'trim', icon: '✂️', name: '裁剪' },
    { id: 'split', icon: '💔', name: '分割' },
    { id: 'text', icon: '📝', name: '文字' },
    { id: 'transition', icon: '🔄', name: '转场' },
    { id: 'effect', icon: '✨', name: '效果' },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
      {/* 撤销/重做 */}
      <div className="flex items-center gap-1 border-r border-gray-600 pr-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1 rounded ${canUndo ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-500 cursor-not-allowed'}`}
          title="撤销"
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1 rounded ${canRedo ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-500 cursor-not-allowed'}`}
          title="重做"
        >
          ↷
        </button>
      </div>

      {/* 编辑工具 */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={`p-2 rounded transition-colors ${
              selectedTool === tool.id
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'
            }`}
            title={tool.name}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
};

// 播放控制组件
const PlaybackControls: React.FC<{
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
}> = ({ isPlaying, currentTime, duration, onPlayPause, onTimeChange }) => {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
      <button
        onClick={onPlayPause}
        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
      >
        {isPlaying ? '⏸️' : '▶️'}
      </button>

      <div className="flex items-center gap-2 flex-1">
        <span className="text-gray-300 text-sm font-mono">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration}
          step={1/30} // 帧精度
          value={currentTime}
          onChange={(e) => onTimeChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-gray-300 text-sm font-mono">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

const RemotionVideoEditor: React.FC<RemotionVideoEditorProps> = ({
  projectId,
  onTimelineChange,
  className = '',
}) => {
  const [scale, setScale] = useState(50); // 时间轴缩放比例 (像素/秒)
  const [showProperties, setShowProperties] = useState(true);

  const {
    timeline,
    currentSettings,
    selectedSegment,
    selectedTool,
    currentTime,
    isPlaying,
    canUndo,
    canRedo,
    loadProject,
    selectSegment,
    setPlaybackTime,
    setPlaying,
    undo,
    redo,
    updateSegment,
  } = useRemotionEditorStore();

  const playerRef = useRef<Player>(null);

  // 初始化项目
  useEffect(() => {
    if (projectId && !timeline) {
      loadProject(projectId);
    }
  }, [projectId, timeline, loadProject]);

  // 通知外部时间轴变化
  useEffect(() => {
    if (timeline && onTimelineChange) {
      onTimelineChange(timeline);
    }
  }, [timeline, onTimelineChange]);

  // 播放控制
  const handlePlayPause = useCallback(() => {
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying]);

  const handleTimeChange = useCallback((time: number) => {
    setPlaybackTime(time);
    if (playerRef.current) {
      playerRef.current.seekTo(time);
    }
  }, [setPlaybackTime]);

  // 片段操作
  const handleSegmentClick = useCallback((segmentId: string) => {
    selectSegment(segmentId === selectedSegment ? null : segmentId);
  }, [selectedSegment, selectSegment]);

  const handleSegmentDrag = useCallback((segmentId: string, newStartTime: number) => {
    updateSegment(segmentId, { startTime: newStartTime });
  }, [updateSegment]);

  // 选中的片段属性
  const selectedSegmentData = timeline?.segments.find(s => s.id === selectedSegment);

  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 mb-2">🎬</div>
          <div className="text-gray-500">加载项目中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* 工具栏 */}
      <div className="p-4 border-b border-gray-800">
        <Toolbar
          selectedTool={selectedTool}
          onToolSelect={useRemotionEditorStore.getState().setPlaying} // 临时实现
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* 主编辑区域 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 预览播放器 */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {timeline.segments.length > 0 ? (
              <Player
                ref={playerRef}
                component={VideoComposition}
                durationInFrames={Math.floor(timeline.duration * timeline.fps)}
                compositionWidth={timeline.width}
                compositionHeight={timeline.height}
                fps={timeline.fps}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                inputProps={{
                  timeline,
                  settings: currentSettings,
                  preview: true,
                }}
                autoPlay={false}
                loop
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🎥</div>
                  <div>拖拽视频到这里开始编辑</div>
                </div>
              </div>
            )}
          </div>

          {/* 播放控制 */}
          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={timeline.duration}
            onPlayPause={handlePlayPause}
            onTimeChange={handleTimeChange}
          />

          {/* 时间轴 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">时间轴</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale(Math.max(10, scale - 10))}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  🔍-
                </button>
                <span className="text-gray-400 text-sm">{scale}px/s</span>
                <button
                  onClick={() => setScale(Math.min(200, scale + 10))}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  🔍+
                </button>
              </div>
            </div>

            <TimelineTrack
              segments={timeline.segments}
              selectedSegment={selectedSegment}
              currentTime={currentTime}
              scale={scale}
              onSegmentClick={handleSegmentClick}
              onSegmentDrag={handleSegmentDrag}
            />
          </div>
        </div>

        {/* 属性面板 */}
        <div className="space-y-4">
          {/* 时间轴信息 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">项目信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">时长:</span>
                <span className="text-gray-200">{formatTime(timeline.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">分辨率:</span>
                <span className="text-gray-200">{timeline.width}×{timeline.height}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">帧率:</span>
                <span className="text-gray-200">{timeline.fps}fps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">片段数:</span>
                <span className="text-gray-200">{timeline.segments.length}</span>
              </div>
            </div>
          </div>

          {/* 选中片段属性 */}
          {selectedSegmentData && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3">片段属性</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-sm">开始时间</label>
                  <input
                    type="number"
                    value={selectedSegmentData.startTime.toFixed(2)}
                    onChange={(e) => updateSegment(selectedSegment!, {
                      startTime: parseFloat(e.target.value) || 0
                    })}
                    className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">持续时间</label>
                  <input
                    type="number"
                    value={selectedSegmentData.duration.toFixed(2)}
                    onChange={(e) => updateSegment(selectedSegment!, {
                      duration: parseFloat(e.target.value) || 1
                    })}
                    className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    step="0.1"
                    min="0.1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">透明度</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedSegmentData.opacity}
                    onChange={(e) => updateSegment(selectedSegment!, {
                      opacity: parseFloat(e.target.value)
                    })}
                    className="w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">缩放</label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={selectedSegmentData.scale}
                    onChange={(e) => updateSegment(selectedSegment!, {
                      scale: parseFloat(e.target.value)
                    })}
                    className="w-full mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 快速操作 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">快速操作</h3>
            <div className="space-y-2">
              <button
                onClick={() => useRemotionEditorStore.getState().duplicateSegment(selectedSegment!)}
                disabled={!selectedSegment}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
              >
                复制片段
              </button>
              <button
                onClick={() => useRemotionEditorStore.getState().splitSegment(selectedSegment!, currentTime)}
                disabled={!selectedSegment}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
              >
                分割片段
              </button>
              <button
                onClick={() => useRemotionEditorStore.getState().removeSegment(selectedSegment!)}
                disabled={!selectedSegment}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
              >
                删除片段
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemotionVideoEditor;