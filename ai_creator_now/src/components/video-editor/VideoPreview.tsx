import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VideoPreviewProps {
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  onTimeChange?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onPlayPause?: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  currentTime,
  isPlaying,
  volume,
  onTimeChange,
  onVolumeChange,
  onPlayPause,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync video element with editor state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime;
    }

    if (video.paused !== !isPlaying) {
      if (isPlaying) {
        video.play().catch(err => {
          console.warn('Video play failed:', err);
        });
      } else {
        video.pause();
      }
    }

    video.volume = volume;
  }, [currentTime, isPlaying, volume]);

  // Handle video events
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    setIsVideoLoaded(true);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isDragging) return;

    onTimeChange?.(video.currentTime);
  }, [onTimeChange, isDragging]);

  const handleVideoEnded = useCallback(() => {
    onPlayPause?.(); // Pause when video ends
  }, [onPlayPause]);

  // Handle seekbar drag
  const handleSeekMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleSeekMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
    onTimeChange?.(newTime);
  }, [isDragging, duration, onTimeChange]);

  const handleSeekMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSeekClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    onTimeChange?.(newTime);
  }, [isDragging, duration, onTimeChange]);

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black">
      {/* Video element */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        {!isVideoLoaded ? (
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-gray-500 text-sm">
              视频预览
            </div>
            <div className="text-gray-600 text-xs mt-1">
              将视频片段添加到时间轴以开始预览
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="max-w-full max-h-full bg-black"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              playsInline
            >
              <source src="" type="video/mp4" />
              您的浏览器不支持视频播放
            </video>

            {/* Canvas for video composition (when multiple segments) */}
            <canvas
              ref={canvasRef}
              className="hidden"
              width={1920}
              height={1080}
            />
          </>
        )}
      </div>

      {/* Video controls */}
      <div className="w-full bg-gray-900 border-t border-gray-800">
        {/* Seek bar */}
        <div
          className="relative h-2 bg-gray-700 cursor-pointer group"
          onMouseDown={handleSeekMouseDown}
          onMouseMove={handleSeekMouseMove}
          onMouseUp={handleSeekMouseUp}
          onMouseLeave={handleSeekMouseUp}
          onClick={handleSeekClick}
        >
          {/* Progress bar */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
            style={{
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            }}
          />

          {/* Seek handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Time markers */}
          <div className="absolute top-3 left-0 right-0 flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-3">
            {/* Play/Pause button */}
            <button
              onClick={onPlayPause}
              className="p-2 text-white hover:text-blue-400 transition-colors"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>

            {/* Time display */}
            <div className="text-sm text-white font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Volume control */}
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {volume > 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Playback speed */}
            <select
              className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-700"
              // onChange={(e) => onPlaybackRateChange?.(parseFloat(e.target.value))}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};