import React, { memo } from 'react';
import {
  Play,
  Download,
  Trash2,
  Copy,
  Film,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { GeneratedVideo, GeneratedImage } from '../../types';
import { VideoThumbnail } from './VideoThumbnail';

interface VideoGenerationHistoryProps {
  history: GeneratedVideo[];
  playingVideoId: string | null;
  onVideoPlay: (videoId: string) => void;
  onVideoDelete: (videoId: string, sceneId: string) => void;
  onVideoDownload: (video: GeneratedVideo) => void;
  onDuplicateSettings: (video: GeneratedVideo) => void;
  onPreviewImage: (image: GeneratedImage) => void;
}

export const VideoGenerationHistory: React.FC<VideoGenerationHistoryProps> = memo(({
  history,
  playingVideoId,
  onVideoPlay,
  onVideoDelete,
  onVideoDownload,
  onDuplicateSettings,
  onPreviewImage
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Film className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium">生成历史</h3>
        </div>

        <div className="text-center py-8 text-gray-500">
          <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>还没有生成过视频</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium">生成历史</h3>
        <span className="text-sm text-gray-500">({history.length})</span>
      </div>

      <div className="space-y-4">
        {history.map((video) => (
          <div
            key={video.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-4">

              {/* 视频缩略图 */}
              <div className="flex-shrink-0">
                <VideoThumbnail
                  videoUrl={video.url}
                  thumbnailUrl={video.thumbnailUrl}
                  alt={video.prompt}
                  className="w-32 h-20 rounded-lg object-cover cursor-pointer"
                  onPlay={() => onVideoPlay(video.id)}
                  isPlaying={playingVideoId === video.id}
                />
              </div>

              {/* 视频信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{video.prompt}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {video.sceneName} • {formatDate(video.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {getStatusIcon(video.status)}
                    {video.duration && (
                      <span className="text-sm text-gray-500">
                        {formatDuration(video.duration)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 视频参数 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {video.settings && (
                    <>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {video.settings.aspectRatio}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {video.settings.quality}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {video.settings.fps}fps
                      </span>
                    </>
                  )}
                </div>

                {/* 错误信息 */}
                {video.status === 'failed' && video.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                    <p className="text-sm text-red-600">{video.error}</p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  {video.status === 'completed' && (
                    <>
                      <button
                        onClick={() => onVideoPlay(video.id)}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                          playingVideoId === video.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        {playingVideoId === video.id ? '停止' : '播放'}
                      </button>

                      <button
                        onClick={() => onVideoDownload(video)}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        下载
                      </button>
                    </>
                  )}

                  {video.sourceImageIds && video.sourceImageIds.length > 0 && (
                    <button
                      onClick={() => {
                        // 这里应该显示源图片，暂时使用第一个图片
                        const sourceImage = {
                          id: video.sourceImageIds[0],
                          url: '', // 需要从场景数据中获取
                          prompt: video.prompt
                        } as GeneratedImage;
                        onPreviewImage(sourceImage);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      查看原图
                    </button>
                  )}

                  <button
                    onClick={() => onDuplicateSettings(video)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    复制设置
                  </button>

                  <button
                    onClick={() => onVideoDelete(video.id, video.sceneId)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

VideoGenerationHistory.displayName = 'VideoGenerationHistory';