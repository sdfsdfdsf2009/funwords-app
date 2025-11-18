import React, { useState, useMemo } from 'react';
import { GeneratedVideo } from '../../types';
import { VideoThumbnail } from '../video-generation/VideoThumbnail';

interface VideoLibraryProps {
  videos: GeneratedVideo[];
  onVideoSelect?: (video: GeneratedVideo) => void;
  onVideoAddToTimeline?: (video: GeneratedVideo) => void;
  onMultipleVideosAddToTimeline?: (videos: GeneratedVideo[]) => void;
}

export const VideoLibrary: React.FC<VideoLibraryProps> = ({
  videos,
  onVideoSelect,
  onVideoAddToTimeline,
  onMultipleVideosAddToTimeline,
}) => {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'name'>('date');

  // Sort videos based on selected criteria
  const sortedVideos = useMemo(() => {
    const sorted = [...videos];

    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'duration':
        sorted.sort((a, b) => b.metadata.duration - a.metadata.duration);
        break;
      case 'name':
        sorted.sort((a, b) => a.id.localeCompare(b.id));
        break;
    }

    return sorted;
  }, [videos, sortBy]);

  // Handle video selection
  const handleVideoToggle = (videoId: string) => {
    setSelectedVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedVideos.length === videos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(videos.map(v => v.id));
    }
  };

  // Handle add selected videos to timeline
  const handleAddSelectedToTimeline = () => {
    const selectedVideoObjects = videos.filter(v => selectedVideos.includes(v.id));
    if (selectedVideoObjects.length > 0) {
      onMultipleVideosAddToTimeline?.(selectedVideoObjects);
      setSelectedVideos([]);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">视频库</h2>
          <div className="text-sm text-gray-500">
            {videos.length} 个视频
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sort options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'duration' | 'name')}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">按日期排序</option>
            <option value="duration">按时长排序</option>
            <option value="name">按名称排序</option>
          </select>

          {/* View mode */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              title="网格视图"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              title="列表视图"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Selection controls */}
      {selectedVideos.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="text-sm text-blue-700">
            已选择 {selectedVideos.length} 个视频
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddSelectedToTimeline}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
            >
              添加到时间轴
            </button>
            <button
              onClick={() => setSelectedVideos([])}
              className="px-3 py-1 text-blue-700 text-sm hover:bg-blue-100 rounded-md"
            >
              清除选择
            </button>
          </div>
        </div>
      )}

      {/* Video grid/list */}
      <div className="flex-1 overflow-y-auto p-4">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div className="text-lg font-medium">暂无视频</div>
            <div className="text-sm mt-1">请先生成一些视频</div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`relative bg-white border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                      selectedVideos.includes(video.id) ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
                    }`}
                    onClick={() => handleVideoToggle(video.id)}
                  >
                    {/* Selection checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedVideos.includes(video.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}>
                        {selectedVideos.includes(video.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Video thumbnail */}
                    <div className="relative aspect-video bg-gray-100">
                      <VideoThumbnail
                        video={video}
                        className="w-full h-full object-cover"
                      />

                      {/* Duration badge */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(video.metadata.duration)}
                      </div>
                    </div>

                    {/* Video info */}
                    <div className="p-3">
                      <div className="text-sm font-medium text-gray-900 truncate mb-1">
                        {video.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(video.metadata.fileSize)} • {video.provider}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="absolute bottom-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVideoAddToTimeline?.(video);
                        }}
                        className="p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        title="添加到时间轴"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-4 px-3 py-2 bg-gray-50 text-sm text-gray-600 font-medium">
                  <div className="w-8">
                    <input
                      type="checkbox"
                      checked={selectedVideos.length === videos.length}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </div>
                  <div className="flex-1">视频</div>
                  <div className="w-24 text-center">时长</div>
                  <div className="w-20 text-center">大小</div>
                  <div className="w-16 text-center">提供方</div>
                  <div className="w-24 text-center">创建时间</div>
                  <div className="w-20"></div>
                </div>

                {sortedVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`flex items-center space-x-4 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b ${
                      selectedVideos.includes(video.id) ? 'bg-blue-50 border-blue-200' : 'border-gray-100'
                    }`}
                    onClick={() => handleVideoToggle(video.id)}
                  >
                    <div className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedVideos.includes(video.id)}
                        onChange={() => handleVideoToggle(video.id)}
                        className="rounded"
                      />
                    </div>
                    <div className="flex-1 flex items-center space-x-3">
                      <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <VideoThumbnail
                          video={video}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-sm text-gray-900 truncate">
                        {video.id}
                      </div>
                    </div>
                    <div className="w-24 text-center text-sm text-gray-600">
                      {formatDuration(video.metadata.duration)}
                    </div>
                    <div className="w-20 text-center text-sm text-gray-600">
                      {formatFileSize(video.metadata.fileSize)}
                    </div>
                    <div className="w-16 text-center text-sm text-gray-600">
                      {video.provider}
                    </div>
                    <div className="w-24 text-center text-sm text-gray-500">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </div>
                    <div className="w-20 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVideoAddToTimeline?.(video);
                        }}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};