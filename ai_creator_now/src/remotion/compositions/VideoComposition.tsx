import React from 'react';
import {
  Composition,
  Sequence,
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Video,
} from 'remotion';
import {
  RemotionTimeline,
  RemotionSettings,
  RemotionVideoSegment,
  RemotionTransition,
  RemotionTextOverlay,
  RemotionAudioTrack,
  RemotionVideoEffect
} from '../../types';

// 视频根组件 - 处理所有时间轴元素
const VideoRoot: React.FC<{
  timeline: RemotionTimeline;
  settings: RemotionSettings;
}> = ({ timeline, settings }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: timeline.backgroundColor }}>
      {/* 背景层 */}
      <BackgroundLayer settings={settings} />

      {/* 视频片段层 */}
      {timeline.segments.map((segment, index) => (
        <VideoSegmentLayer
          key={segment.id}
          segment={segment}
          index={index}
          settings={settings}
          fps={fps}
        />
      ))}

      {/* 转场效果层 */}
      {timeline.transitions.map((transition) => (
        <TransitionLayer
          key={transition.id}
          transition={transition}
          settings={settings}
          fps={fps}
        />
      ))}

      {/* 文字叠加层 */}
      {timeline.textOverlays.map((overlay) => (
        <TextOverlayLayer
          key={overlay.id}
          overlay={overlay}
          settings={settings}
          fps={fps}
        />
      ))}

      {/* 视频效果层 */}
      {timeline.effects.map((effect) => (
        <EffectLayer
          key={effect.id}
          effect={effect}
          settings={settings}
          fps={fps}
        />
      ))}

      {/* 音频处理 */}
      <AudioComposition
        audioTracks={timeline.audioTracks}
        fps={fps}
      />
    </AbsoluteFill>
  );
};

// 背景层组件
const BackgroundLayer: React.FC<{ settings: RemotionSettings }> = ({ settings }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: settings.backgroundColor,
      }}
    />
  );
};

// 单个视频片段组件
const VideoSegmentLayer: React.FC<{
  segment: RemotionVideoSegment;
  index: number;
  settings: RemotionSettings;
  fps: number;
}> = ({ segment, index, settings, fps }) => {
  const { frame } = useCurrentFrame();
  const segmentStartFrame = segment.startTime * fps;
  const segmentDurationFrames = segment.duration * fps;

  return (
    <Sequence
      from={segmentStartFrame}
      durationInFrames={segmentDurationFrames}
    >
      <AbsoluteFill
        style={{
          position: 'absolute',
          left: segment.position.x,
          top: segment.position.y,
          width: segment.position.width,
          height: segment.position.height,
          opacity: segment.opacity,
          transform: `scale(${segment.scale}) rotate(${segment.rotation}deg)`,
        }}
      >
        <VideoContent
          src={segment.videoSrc}
          startTime={segment.trimStart}
          duration={segment.trimEnd - segment.trimStart}
          segment={segment}
          settings={settings}
          frame={frame}
        />

        {/* 片段转场效果 */}
        {segment.transitionIn && (
          <TransitionEffect
            transition={segment.transitionIn}
            position="start"
            duration={segment.transitionIn.duration * fps}
            frame={frame - segmentStartFrame}
          />
        )}

        {segment.transitionOut && (
          <TransitionEffect
            transition={segment.transitionOut}
            position="end"
            duration={segment.transitionOut.duration * fps}
            frame={frame - segmentStartFrame}
          />
        )}
      </AbsoluteFill>
    </Sequence>
  );
};

// 视频内容组件
const VideoContent: React.FC<{
  src: string;
  startTime: number;
  duration: number;
  segment: RemotionVideoSegment;
  settings: RemotionSettings;
  frame: number;
}> = ({ src, startTime, duration, segment, settings, frame }) => {
  return (
    <AbsoluteFill>
      <Video
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </AbsoluteFill>
  );
};

// 转场效果组件
const TransitionEffect: React.FC<{
  transition: RemotionTransition;
  position: 'start' | 'end';
  duration: number;
  frame: number;
}> = ({ transition, position, duration, frame }) => {
  const opacity = transition.intensity;

  // 基于转场类型和位置计算透明度
  const calculateOpacity = () => {
    const progress = frame / duration;

    switch (transition.type) {
      case 'fade':
        return position === 'start'
          ? interpolate(progress, [opacity, 0])
          : interpolate(progress, [0, opacity]);

      case 'crossfade':
        return position === 'start'
          ? interpolate(progress, [opacity, 1])
          : interpolate(progress, [1, opacity]);

      default:
        return opacity;
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: position === 'start' ? 'white' : 'black',
        opacity: calculateOpacity(),
        pointerEvents: 'none',
      }}
    />
  );
};

// 文字叠加组件
const TextOverlayLayer: React.FC<{
  overlay: RemotionTextOverlay;
  settings: RemotionSettings;
  fps: number;
}> = ({ overlay, settings, fps }) => {
  const { frame } = useCurrentFrame();
  const overlayStartFrame = overlay.startTime * fps;
  const overlayDurationFrames = overlay.duration * fps;

  return (
    <Sequence
      from={overlayStartFrame}
      durationInFrames={overlayDurationFrames}
    >
      <TextOverlayContent
        overlay={overlay}
        settings={settings}
        frame={frame - overlayStartFrame}
      />
    </Sequence>
  );
};

// 文字内容组件
const TextOverlayContent: React.FC<{
  overlay: RemotionTextOverlay;
  settings: RemotionSettings;
  frame: number;
}> = ({ overlay, settings, frame }) => {
  // 基于动画类型计算文字属性
  const calculateTextProperties = () => {
    if (!overlay.animation) {
      return {
        opacity: 1,
        transform: 'translate(0, 0) scale(1)',
      };
    }

    const progress = frame / (overlay.animation.duration * settings.fps);

    switch (overlay.animation.type) {
      case 'fade':
        return {
          opacity: interpolate(progress, [0, 1], overlay.animation.easing as any),
          transform: 'translate(0, 0) scale(1)',
        };

      case 'slide':
        return {
          opacity: interpolate(progress, [0, 1], overlay.animation.easing as any),
          transform: `translate(${interpolate(progress, [-50, 0], [0, 0])}%, 0) scale(1)`,
        };

      case 'typewriter':
        return {
          opacity: 1,
          transform: 'translate(0, 0) scale(1)',
        };

      case 'bounce':
        return {
          opacity: interpolate(progress, [0, 1, 1, 0.8, 1], 'easeOutBounce'),
          transform: `translate(0, 0) scale(${interpolate(progress, [0.9, 1], [0.9, 1, 1.1, 1], 'easeOutElastic')})`,
        };

      default:
        return {
          opacity: 1,
          transform: 'translate(0, 0) scale(1)',
        };
    }
  };

  const textProps = calculateTextProperties();

  return (
    <AbsoluteFill
      style={{
        position: 'absolute',
        left: overlay.position.x,
        top: overlay.position.y,
        ...textProps,
        fontFamily: overlay.fontFamily,
        fontSize: overlay.fontSize,
        color: overlay.color,
        backgroundColor: overlay.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textShadow: overlay.effects
          .filter(e => e.type === 'shadow')
          .map(e => `2px 2px 4px rgba(0, 0, 0, ${e.properties.intensity})`)
          .join(', ') || 'none',
        // 处理描边效果
        WebkitTextStroke: overlay.effects
          .filter(e => e.type === 'stroke')
          .map(e => `1px ${e.properties.color}`)
          .join(' ') || 'none',
        // 处理模糊效果
        filter: overlay.effects
          .filter(e => e.type === 'blur')
          .map(e => `blur(${e.properties.intensity}px)`)
          .join(' ') || 'none',
      }}
    >
      {overlay.text}
    </AbsoluteFill>
  );
};

// 视频效果组件
const EffectLayer: React.FC<{
  effect: RemotionVideoEffect;
  settings: RemotionSettings;
  fps: number;
}> = ({ effect, settings, fps }) => {
  const { frame } = useCurrentFrame();

  // 基于效果类型和强度计算CSS滤镜
  const calculateFilter = () => {
    switch (effect.type) {
      case 'brightness':
        return `brightness(${100 + effect.intensity * 50}%)`;

      case 'contrast':
        return `contrast(${100 + effect.intensity * 50}%)`;

      case 'saturation':
        return `saturate(${100 + effect.intensity * 50}%)`;

      case 'blur':
        return `blur(${effect.intensity}px)`;

      case 'sepia':
        return `sepia(${effect.intensity * 50}%)`;

      case 'grayscale':
        return `grayscale(${effect.intensity}%)`;

      case 'zoom':
        return `scale(${1 + effect.intensity * 0.1})`;

      case 'rotate':
        return `rotate(${effect.intensity * 10}deg)`;

      default:
        return 'none';
    }
  };

  return (
    <AbsoluteFill
      style={{
        filter: calculateFilter(),
        pointerEvents: 'none',
      }}
    />
  );
};

// 音频合成组件
const AudioComposition: React.FC<{
  audioTracks: RemotionAudioTrack[];
  fps: number;
}> = ({ audioTracks, fps }) => {
  return (
    <>
      {audioTracks.map((track) => (
        <Audio
          key={track.id}
          src={track.audioSrc}
          startTime={track.startTime * fps}
          volume={track.volume}
          muted={track.mute}
          style={{
            filter: track.effects
              .map(e => e.type === 'filter' ? `filter(${e.properties.properties})` : '')
              .join(' ') || 'none',
          }}
        />
      ))}
    </>
  );
};

// 主要的视频合成组件
export const VideoComposition: React.FC<{
  timeline: RemotionTimeline;
  settings: RemotionSettings;
  preview?: boolean;
}> = ({ timeline, settings, preview = false }) => {
  return (
    <Composition
      id="main-video"
      durationInFrames={timeline.duration * timeline.fps}
      fps={timeline.fps}
      width={timeline.width}
      height={timeline.height}
    >
      <VideoRoot
        timeline={timeline}
        settings={settings}
      />
    </Composition>
  );
};

export default VideoComposition;