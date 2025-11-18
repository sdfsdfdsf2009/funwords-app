import { RemotionTimeline, RemotionSettings } from '../types';

export interface RenderRequest {
  compositionId: string;
  inputProps: {
    timeline: RemotionTimeline;
    settings: RemotionSettings;
  };
  outputFormat: 'mp4' | 'webm';
  codec: 'h264' | 'vp8' | 'vp9';
  quality: number;
  fps?: number;
  width?: number;
  height?: number;
  durationInSeconds?: number;
}

export interface RenderResponse {
  success: boolean;
  renderId?: string;
  status?: string;
  message?: string;
  outputUrl?: string;
  progress?: number;
  error?: string;
}

export interface RenderStatusResponse {
  success: boolean;
  renderId: string;
  status: 'pending' | 'rendering' | 'completed' | 'error';
  progress: number;
  outputUrl?: string;
  error?: string;
  estimatedTime?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class RemotionRenderService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/video-render';
  }

  // 开始渲染
  async startRender(request: RenderRequest): Promise<RenderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start render');
      }

      return data;
    } catch (error) {
      console.error('RemotionRenderService: Failed to start render', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 获取渲染状态
  async getRenderStatus(renderId: string): Promise<RenderStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${renderId}/status`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get render status');
      }

      return data;
    } catch (error) {
      console.error('RemotionRenderService: Failed to get render status', error);
      return {
        success: false,
        renderId,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 轮询渲染状态直到完成
  async pollUntilComplete(
    renderId: string,
    onProgress?: (progress: number) => void,
    intervalMs: number = 2000
  ): Promise<RenderStatusResponse> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getRenderStatus(renderId);

          if (onProgress) {
            onProgress(status.progress);
          }

          if (status.status === 'completed' || status.status === 'error') {
            resolve(status);
            return;
          }

          // 继续轮询
          setTimeout(poll, intervalMs);
        } catch (error) {
          reject(error);
        }
      };

      // 开始轮询
      poll();
    });
  }

  // 创建默认的时间轴（用于测试）
  createDefaultTimeline(): RemotionTimeline {
    return {
      id: 'default-timeline',
      name: '默认时间轴',
      duration: 10,
      fps: 30,
      width: 1920,
      height: 1080,
      backgroundColor: '#000000',
      segments: [],
      transitions: [],
      textOverlays: [],
      effects: [],
      audioTracks: []
    };
  }

  // 创建默认的设置
  createDefaultSettings(): RemotionSettings {
    return {
      backgroundColor: '#000000',
      defaultDuration: 5,
      defaultFps: 30,
      defaultQuality: 'standard',
      defaultMotionIntensity: 'medium',
      defaultMotionStrength: 'medium',
      defaultStyle: 'realistic',
      defaultAspectRatio: '16:9'
    };
  }

  // 为场景创建时间轴
  createTimelineFromScene(sceneId: string, videoUrl: string): RemotionTimeline {
    const timeline = this.createDefaultTimeline();

    timeline.segments.push({
      id: `segment-${sceneId}`,
      videoSrc: videoUrl,
      startTime: 0,
      duration: timeline.duration,
      endTime: timeline.duration,
      trimStart: 0,
      trimEnd: timeline.duration,
      position: {
        x: 0,
        y: 0,
        width: timeline.width,
        height: timeline.height
      },
      opacity: 1,
      scale: 1,
      rotation: 0,
      transitionIn: null,
      transitionOut: null,
      effects: []
    });

    return timeline;
  }

  // 估算渲染时间（秒）
  estimateRenderTime(timeline: RemotionTimeline): number {
    const baseRenderTime = timeline.duration / timeline.fps;
    const complexityMultiplier = 1.5; // 复杂度系数
    const qualityMultiplier = 1.2; // 质量系数

    return Math.ceil(baseRenderTime * complexityMultiplier * qualityMultiplier);
  }
}

// 导出单例实例
export const remotionRenderService = new RemotionRenderService();