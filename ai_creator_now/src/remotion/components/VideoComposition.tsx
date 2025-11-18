import React from 'react';
import { Composition, useCurrentFrame, useVideoConfig, Audio, continueRender, delayRender } from 'remotion';
import { VideoInfo } from '../../types';

interface VideoCompositionProps {
  videos: VideoInfo[];
}

// 单个视频片段组件
const VideoSegment: React.FC<{ video: VideoInfo; startTime: number; duration: number }> = ({
  video,
  startTime,
  duration
}) => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const currentFrame = frame - (startTime * fps);

  // 只有在当前视频的时间范围内才渲染
  if (currentFrame < 0 || currentFrame >= duration * fps) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
      }}
    >
      <video
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        src={video.url}
        autoPlay
        muted
        loop
      />
      {/* 视频标题 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          color: 'white',
          fontSize: 24,
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '10px 15px',
          borderRadius: '8px',
        }}
      >
        {video.title || '视频片段'}
      </div>
    </div>
  );
};

// 主视频合成组件
const MainVideoComposition: React.FC<VideoCompositionProps> = ({ videos }) => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const totalDuration = videos.reduce((total, video) => total + (video.duration || 5), 0);

  // 计算当前应该显示哪个视频
  let currentTime = frame / fps;
  let accumulatedTime = 0;
  let currentVideoIndex = -1;

  for (let i = 0; i < videos.length; i++) {
    if (currentTime < accumulatedTime + (videos[i].duration || 5)) {
      currentVideoIndex = i;
      break;
    }
    accumulatedTime += videos[i].duration || 5;
  }

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#111827',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 渲染当前视频片段 */}
      {videos.map((video, index) => {
        const videoStartTime = videos
          .slice(0, index)
          .reduce((total, v) => total + (v.duration || 5), 0);
        const videoDuration = video.duration || 5;

        return (
          <VideoSegment
            key={video.id}
            video={video}
            startTime={videoStartTime}
            duration={videoDuration}
          />
        );
      })}

      {/* 进度指示器 */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          color: 'white',
          fontSize: 18,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontFamily: 'monospace',
        }}
      >
        {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} /
        {Math.floor(totalDuration / 60)}:{(Math.floor(totalDuration % 60)).toString().padStart(2, '0')}
      </div>

      {/* 视频片段指示器 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          display: 'flex',
          gap: '8px',
        }}
      >
        {videos.map((video, index) => (
          <div
            key={index}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: index === currentVideoIndex ? '#10b981' : '#6b7280',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* 标题 */}
      {currentVideoIndex >= 0 && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            color: 'white',
            fontSize: 32,
            fontWeight: 'bold',
            textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '15px 20px',
            borderRadius: '10px',
          }}
        >
          视频整合 - 片段 {currentVideoIndex + 1} / {videos.length}
        </div>
      )}
    </div>
  );
};

// 导出Composition
export const VideoComposition: React.FC<VideoCompositionProps> = ({ videos }) => {
  if (!videos || videos.length === 0) {
    return null;
  }

  const totalDuration = videos.reduce((total, video) => total + (video.duration || 5), 0);

  return (
    <>
      <Composition
        id="VideoComposition"
        component={() => <MainVideoComposition videos={videos} />}
        durationInFrames={totalDuration * 30} // 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

export default VideoComposition;