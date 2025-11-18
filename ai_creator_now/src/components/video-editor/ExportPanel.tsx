import React, { useState, useMemo } from 'react';
import { Timeline, ExportSettings, ExportJob } from '../../types';
import { useVideoEditorStore } from '../../stores/videoEditorStore';

interface ExportPanelProps {
  timeline: Timeline;
  onExport?: (settings: ExportSettings) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  timeline,
  onExport,
}) => {
  const { isExporting, exportProgress, startExport, updateExportProgress, completeExport, failExport } = useVideoEditorStore();
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    resolution: { width: 1920, height: 1080 },
    quality: 'high',
    frameRate: 30,
    bitrate: 5000,
    audioSettings: {
      codec: 'aac',
      bitrate: 128,
      sampleRate: 44100,
    },
    includeSubtitles: false,
  });

  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

  // Calculate estimated file size
  const estimatedFileSize = useMemo(() => {
    const duration = timeline.duration;
    const bitrate = exportSettings.bitrate;
    const audioBitrate = exportSettings.audioSettings.bitrate;
    const totalBitrate = bitrate + audioBitrate;
    const sizeInBytes = (totalBitrate * duration * 1000) / 8; // Convert to bytes
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return sizeInMB.toFixed(1);
  }, [timeline.duration, exportSettings.bitrate, exportSettings.audioSettings.bitrate]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle export
  const handleExport = () => {
    const finalSettings: ExportSettings = {
      ...exportSettings,
      metadata: metadata.title || metadata.description || metadata.tags.length > 0 ? {
        title: metadata.title || undefined,
        description: metadata.description || undefined,
        tags: metadata.tags.length > 0 ? metadata.tags : undefined,
      } : undefined,
    };

    onExport?.(finalSettings);
    startExport(finalSettings);

    // Simulate export progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        completeExport('/path/to/exported/video.mp4', parseFloat(estimatedFileSize) * 1024 * 1024, timeline.duration);
      }
      updateExportProgress(Math.round(progress));
    }, 500);
  };

  // Handle tag input
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Preset configurations
  const presetConfigs = [
    {
      name: '高质量 1080p',
      settings: {
        resolution: { width: 1920, height: 1080 },
        quality: 'high' as const,
        frameRate: 30,
        bitrate: 8000,
        audioSettings: { codec: 'aac' as const, bitrate: 192, sampleRate: 48000 },
      }
    },
    {
      name: '标准 720p',
      settings: {
        resolution: { width: 1280, height: 720 },
        quality: 'medium' as const,
        frameRate: 30,
        bitrate: 4000,
        audioSettings: { codec: 'aac' as const, bitrate: 128, sampleRate: 44100 },
      }
    },
    {
      name: '快速 480p',
      settings: {
        resolution: { width: 854, height: 480 },
        quality: 'low' as const,
        frameRate: 25,
        bitrate: 2000,
        audioSettings: { codec: 'aac' as const, bitrate: 96, sampleRate: 44100 },
      }
    },
  ];

  if (timeline.videoSegments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-lg font-medium mb-1">没有可导出的内容</div>
          <div className="text-sm">请先将视频片段添加到时间轴</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">导出设置</h3>
        <div className="text-sm text-gray-500">
          时长: {formatDuration(timeline.duration)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Export progress */}
        {isExporting && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">正在导出...</span>
              <span className="text-sm text-blue-700">{exportProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Preset configurations */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">快速预设</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {presetConfigs.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setExportSettings(prev => ({ ...prev, ...preset.settings }))}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <div className="font-medium text-sm text-gray-900">{preset.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {preset.settings.resolution.width}x{preset.settings.resolution.height} • {preset.settings.bitrate / 1000}Mbps
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Video settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">视频设置</h4>
            <div className="space-y-4">
              {/* Format */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">格式</label>
                <select
                  value={exportSettings.format}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                >
                  <option value="mp4">MP4 (推荐)</option>
                  <option value="mov">MOV</option>
                  <option value="webm">WebM</option>
                  <option value="avi">AVI</option>
                </select>
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">分辨率</label>
                <select
                  value={`${exportSettings.resolution.width}x${exportSettings.resolution.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setExportSettings(prev => ({
                      ...prev,
                      resolution: { width, height }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                >
                  <option value="3840x2160">4K (3840x2160)</option>
                  <option value="1920x1080">1080p (1920x1080)</option>
                  <option value="1280x720">720p (1280x720)</option>
                  <option value="854x480">480p (854x480)</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">质量</label>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'high'].map((quality) => (
                    <button
                      key={quality}
                      onClick={() => setExportSettings(prev => ({ ...prev, quality: quality as any }))}
                      className={`py-2 px-3 border rounded-md text-sm transition-colors ${
                        exportSettings.quality === quality
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      disabled={isExporting}
                    >
                      {quality === 'low' ? '低' : quality === 'medium' ? '中' : '高'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame rate */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">帧率 (FPS)</label>
                <select
                  value={exportSettings.frameRate}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, frameRate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                >
                  <option value={24}>24 FPS</option>
                  <option value={25}>25 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>

              {/* Bitrate */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  比特率: {exportSettings.bitrate / 1000} Mbps
                </label>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="500"
                  value={exportSettings.bitrate}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, bitrate: Number(e.target.value) }))}
                  className="w-full"
                  disabled={isExporting}
                />
              </div>
            </div>
          </div>

          {/* Audio settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">音频设置</h4>
            <div className="space-y-4">
              {/* Audio codec */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">音频编码</label>
                <select
                  value={exportSettings.audioSettings.codec}
                  onChange={(e) => setExportSettings(prev => ({
                    ...prev,
                    audioSettings: { ...prev.audioSettings, codec: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                >
                  <option value="aac">AAC (推荐)</option>
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                </select>
              </div>

              {/* Audio bitrate */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  音频比特率: {exportSettings.audioSettings.bitrate} kbps
                </label>
                <input
                  type="range"
                  min="64"
                  max="320"
                  step="32"
                  value={exportSettings.audioSettings.bitrate}
                  onChange={(e) => setExportSettings(prev => ({
                    ...prev,
                    audioSettings: { ...prev.audioSettings, bitrate: Number(e.target.value) }
                  }))}
                  className="w-full"
                  disabled={isExporting}
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">元数据 (可选)</h4>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">标题</label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="输入视频标题"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">描述</label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="输入视频描述"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">标签</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-md"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                        disabled={isExporting}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="输入标签并按回车添加"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExporting}
                />
              </div>
            </div>
          </div>

          {/* Export summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">导出摘要</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>格式: {exportSettings.format.toUpperCase()}</div>
              <div>分辨率: {exportSettings.resolution.width}x{exportSettings.resolution.height}</div>
              <div>帧率: {exportSettings.frameRate} FPS</div>
              <div>视频比特率: {exportSettings.bitrate / 1000} Mbps</div>
              <div>音频比特率: {exportSettings.audioSettings.bitrate} kbps</div>
              <div>预计文件大小: ~{estimatedFileSize} MB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Export button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleExport}
          disabled={isExporting || timeline.videoSegments.length === 0}
          className="w-full py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? `导出中... ${exportProgress}%` : '开始导出'}
        </button>
      </div>
    </div>
  );
};