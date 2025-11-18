import React, { useState, useEffect, useRef } from 'react';
import { Video, Play, AlertCircle, Loader2, Clock } from 'lucide-react';
import { GeneratedVideo } from '../../types';
import { getVideoThumbnail, ThumbnailResult, ThumbnailType } from '../../utils/videoThumbnail';

interface VideoThumbnailProps {
  video: GeneratedVideo;
  className?: string;
  onPlay?: (video: GeneratedVideo) => void;
  width?: number;
  height?: number;
  showControls?: boolean;
  lazy?: boolean;
}

// 时间格式化函数 - 精确到秒
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 格式化创建时间 - 精确到秒
const formatCreateTime = (date: Date | string): string => {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    // 超过一周显示具体日期，精确到秒
    return targetDate.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
};

/**
 * 视频缩略图组件
 * 支持多层回退机制和加载状态
 */
export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  video,
  className = '',
  onPlay,
  width = 640,
  height = 360,
  showControls = true,
  lazy = true
}) => {
  const [thumbnail, setThumbnail] = useState<ThumbnailResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 延迟加载逻辑
  useEffect(() => {
    if (!lazy) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  // 加载缩略图
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const loadThumbnail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getVideoThumbnail(video);
        setThumbnail(result);
      } catch (err) {
        console.error('Failed to load thumbnail:', err);
        setError('加载缩略图失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadThumbnail();
  }, [video, isVisible]);

  // 图片加载状态处理
  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('图片加载失败');
  };

  // 处理播放按钮点击
  const handlePlayClick = () => {
    onPlay?.(video);
  };

  // 获取类型图标和颜色
  const getTypeIcon = (type: ThumbnailType) => {
    switch (type) {
      case ThumbnailType.SOURCE_IMAGE:
        return { icon: Video, color: 'text-blue-600', bg: 'bg-blue-100' };
      case ThumbnailType.API_THUMBNAIL:
        return { icon: Video, color: 'text-green-600', bg: 'bg-green-100' };
      case ThumbnailType.EXTRACTED_FRAME:
        return { icon: Video, color: 'text-purple-600', bg: 'bg-purple-100' };
      case ThumbnailType.PLACEHOLDER:
        return { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-100' };
      default:
        return { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // 骨架屏组件
  const Skeleton = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
      <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    </div>
  );

  // 错误状态组件
  const ErrorState = () => (
    <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-600">
      <AlertCircle className="w-8 h-8 mb-2" />
      <span className="text-sm">{error || '加载失败'}</span>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative bg-gray-100 overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* 延迟加载占位符 */}
      {!isVisible && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <Video className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {/* 加载状态 */}
      {isVisible && isLoading && <Skeleton />}

      {/* 错误状态 */}
      {isVisible && error && <ErrorState />}

      {/* 缩略图图片 */}
      {isVisible && thumbnail && !error && (
        <>
          <img
            ref={imgRef}
            src={thumbnail.url}
            alt={video.prompt || '视频缩略图'}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />

          {/* 类型标识 */}
          {showControls && thumbnail.type !== ThumbnailType.PLACEHOLDER && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              {thumbnail.sourceDescription}
            </div>
          )}

          {/* 播放按钮覆盖层 */}
          {showControls && onPlay && (
            <button
              onClick={handlePlayClick}
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200 group"
              title="播放视频"
            >
              <div className="bg-white/90 rounded-full p-4 transform transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                <Play className="w-6 h-6 text-gray-900 fill-current" />
              </div>
            </button>
          )}

          {/* 类型图标 */}
          {showControls && (
            <div className="absolute top-2 left-2">
              {(() => {
                const { icon: Icon, color, bg } = getTypeIcon(thumbnail.type);
                return (
                  <div className={`${bg} ${color} p-1.5 rounded-md backdrop-blur-sm`}>
                    <Icon className="w-3 h-3" />
                  </div>
                );
              })()}
            </div>
          )}

          {/* 视频信息 */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <div className="text-white text-sm space-y-2">
                {/* 第一行：提供者 + 时长 */}
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{video.provider}</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{formatDuration(video.metadata?.duration || 0)}</span>
                  </div>
                </div>

                {/* 第二行：宽高比 + 创建时间 */}
                <div className="flex items-center justify-between text-xs opacity-90">
                  <span className="bg-white/20 px-2 py-0.5 rounded">{video.metadata?.aspectRatio || '16:9'}</span>
                  <span className="font-medium">{formatCreateTime(video.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 视频徽章 */}
      {showControls && !isLoading && !error && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
          <Video className="w-3 h-3" />
          <span>视频</span>
        </div>
      )}
    </div>
  );
};