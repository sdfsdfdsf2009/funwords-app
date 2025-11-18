/**
 * 视频缩略图处理工具
 * 提供源图片查找、视频帧提取、缩略图缓存等功能
 */

import { GeneratedVideo, GeneratedImage, Scene } from '../types';

// 缩略图类型枚举
export enum ThumbnailType {
  SOURCE_IMAGE = 'source_image',
  API_THUMBNAIL = 'api_thumbnail',
  EXTRACTED_FRAME = 'extracted_frame',
  PLACEHOLDER = 'placeholder'
}

// 缩略图结果接口
export interface ThumbnailResult {
  url: string;
  type: ThumbnailType;
  sourceDescription: string;
  isLoading?: boolean;
}

// 缓存条目接口
interface CacheEntry {
  url: string;
  type: ThumbnailType;
  timestamp: number;
  isValid: boolean;
}

/**
 * 视频缩略图管理器
 */
export class VideoThumbnailManager {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 100;
  private cacheTimeout = 30 * 60 * 1000; // 30分钟

  constructor(private scenes: Scene[] = []) {}

  /**
   * 更新场景数据
   */
  updateScenes(scenes: Scene[]): void {
    this.scenes = scenes;
  }

  /**
   * 获取视频缩略图URL（多层回退机制）
   */
  async getVideoThumbnail(video: GeneratedVideo): Promise<ThumbnailResult> {
    const cacheKey = this.getCacheKey(video);

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log(`🎯 Using cached thumbnail for video ${video.id}: ${cached.type}`);
      return {
        url: cached.url,
        type: cached.type,
        sourceDescription: this.getSourceDescription(cached.type)
      };
    }

    console.log(`🎯 Generating thumbnail for video ${video.id} using fallback strategy`);

    // 多层回退策略
    const strategies = [
      {
        name: 'Source Image',
        fn: () => this.getSourceImageThumbnail(video)
      },
      {
        name: 'API Thumbnail',
        fn: () => this.getApiThumbnail(video)
      },
      {
        name: 'Video Frame Extraction',
        fn: () => this.extractVideoFrame(video)
      },
      {
        name: 'Placeholder',
        fn: () => this.getPlaceholderThumbnail(video)
      }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`🎯 Trying ${strategy.name} strategy for video ${video.id}`);
        const result = await strategy.fn();
        if (result && result.url) {
          console.log(`✅ ${strategy.name} strategy successful for video ${video.id}`);
          // 缓存结果
          this.cache.set(cacheKey, {
            url: result.url,
            type: result.type,
            timestamp: Date.now(),
            isValid: true
          });

          this.cleanCache();
          return result;
        } else {
          console.log(`❌ ${strategy.name} strategy returned null for video ${video.id}`);
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} strategy failed for video ${video.id}:`, error);
        // 继续下一个策略
      }
    }

    // 最终回退 - 这不应该发生，因为placeholder总是成功
    console.error(`❌ All thumbnail strategies failed for video ${video.id}, using emergency placeholder`);
    return this.getPlaceholderThumbnail(video);
  }

  /**
   * 优先使用源图片作为缩略图
   */
  private async getSourceImageThumbnail(video: GeneratedVideo): Promise<ThumbnailResult | null> {
    if (!video.sourceImageId) {
      console.log(`🖼️ Video ${video.id} has no sourceImageId for thumbnail`);
      return null;
    }

    const sourceImage = this.findSourceImage(video.sourceImageId);
    if (sourceImage?.url) {
      console.log(`🖼️ Found source image for video ${video.id}: ${sourceImage.url}`);
      // 验证图片URL是否有效
      const isValid = await this.validateImageUrl(sourceImage.url);
      if (isValid) {
        return {
          url: sourceImage.url,
          type: ThumbnailType.SOURCE_IMAGE,
          sourceDescription: `源图片: ${sourceImage.prompt || '未知'}`
        };
      } else {
        console.warn(`🖼️ Source image URL is invalid for video ${video.id}: ${sourceImage.url}`);
      }
    } else {
      console.log(`🖼️ No source image found for video ${video.id} with sourceImageId: ${video.sourceImageId}`);
    }

    return null;
  }

  /**
   * 使用API提供的缩略图
   */
  private async getApiThumbnail(video: GeneratedVideo): Promise<ThumbnailResult | null> {
    if (video.thumbnailUrl && video.thumbnailUrl.trim()) {
      console.log(`🔗 Testing API thumbnail for video ${video.id}: ${video.thumbnailUrl}`);
      const isValid = await this.validateImageUrl(video.thumbnailUrl);
      if (isValid) {
        return {
          url: video.thumbnailUrl,
          type: ThumbnailType.API_THUMBNAIL,
          sourceDescription: 'API缩略图'
        };
      } else {
        console.warn(`🔗 API thumbnail URL is invalid for video ${video.id}: ${video.thumbnailUrl}`);
      }
    } else {
      console.log(`🔗 Video ${video.id} has no valid thumbnailUrl`);
    }

    return null;
  }

  /**
   * 从视频中提取第一帧（增强版）
   */
  private async extractVideoFrame(video: GeneratedVideo): Promise<ThumbnailResult | null> {
    if (!video.url) {
      console.warn(`Video ${video.id} has no URL for frame extraction`);
      return null;
    }

    try {
      console.log(`🎬 Extracting frame from video ${video.id}: ${video.url}`);
      const frameUrl = await this.extractFirstFrame(video.url);
      return {
        url: frameUrl,
        type: ThumbnailType.EXTRACTED_FRAME,
        sourceDescription: '视频第一帧'
      };
    } catch (error) {
      console.warn(`Failed to extract frame from video ${video.id}:`, error);
      return null;
    }
  }

  /**
   * 生成占位符缩略图
   */
  private async getPlaceholderThumbnail(video: GeneratedVideo): Promise<ThumbnailResult> {
    console.log(`🎨 Generating placeholder thumbnail for video ${video.id}`);
    const placeholderUrl = this.generatePlaceholder(video);
    return {
      url: placeholderUrl,
      type: ThumbnailType.PLACEHOLDER,
      sourceDescription: '占位符'
    };
  }

  /**
   * 查找源图片
   */
  private findSourceImage(sourceImageId: string): GeneratedImage | null {
    for (const scene of this.scenes) {
      // 在场景图片列表中查找
      const found = scene.images.find(img => img.id === sourceImageId);
      if (found) return found;

      // 在选中图片中查找
      if (scene.selectedImage?.id === sourceImageId) {
        return scene.selectedImage;
      }
    }
    return null;
  }

  /**
   * 验证图片URL是否可访问
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000); // 5秒超时

      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };

      img.src = url;
    });
  }

  /**
   * 从视频提取第一帧（增强版）
   */
  private async extractFirstFrame(videoUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 设置超时处理
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Video frame extraction timeout'));
      }, 15000); // 15秒超时

      const cleanup = () => {
        clearTimeout(timeout);
        video.pause();
        video.src = '';
        video.load();
      };

      if (!ctx) {
        cleanup();
        reject(new Error('Canvas context not available'));
        return;
      }

      // 设置跨域属性
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        try {
          // 设置合理的画布尺寸
          const maxWidth = 1280;
          const maxHeight = 720;
          let width = video.videoWidth;
          let height = video.videoHeight;

          // 如果视频尺寸过大，进行缩放
          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = Math.min(width, maxWidth);
              height = width / aspectRatio;
            } else {
              height = Math.min(height, maxHeight);
              width = height * aspectRatio;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // 尝试提取多个时间点的帧以确保成功
          const timePoints = [0.1, 0.5, 1.0];
          let attempts = 0;

          const tryExtractFrame = () => {
            if (attempts >= timePoints.length) {
              cleanup();
              reject(new Error('Failed to extract video frame after multiple attempts'));
              return;
            }

            // 等待一帧时间让视频稳定
            setTimeout(() => {
              try {
                // 绘制当前帧到画布
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                cleanup();
                resolve(dataUrl);
              } catch (drawError) {
                // 如果绘制失败，尝试下一个时间点
                video.currentTime = timePoints[attempts];
                attempts++;
              }
            }, 100);
          };

          video.onseeked = tryExtractFrame;

          video.onerror = () => {
            cleanup();
            reject(new Error('Video loading error'));
          };

          // 开始提取尝试
          tryExtractFrame();
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };

      // 设置视频源
      video.src = videoUrl;
    });
  }

  /**
   * 格式化时长显示
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 生成占位符图片（增强版）
   */
  private generatePlaceholder(video: GeneratedVideo): string {
    const duration = video.metadata?.duration || 0;
    const aspectRatio = video.metadata?.aspectRatio || '16:9';
    const resolution = video.metadata?.resolution || '1280x720';
    const formattedDuration = this.formatDuration(duration);
    const createDate = typeof video.createdAt === 'string' ? new Date(video.createdAt) : video.createdAt;
    const createTime = createDate.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 根据宽高比调整SVG尺寸
    let width = 640;
    let height = 360;

    if (aspectRatio === '9:16') {
      width = 360;
      height = 640;
    } else if (aspectRatio === '1:1') {
      width = height = 480;
    }

    // 获取提示词预览
    const promptPreview = video.prompt ?
      (video.prompt.length > 30 ? video.prompt.substring(0, 30) + '...' : video.prompt) :
      '无提示词';

    // 创建增强的SVG占位符
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- 背景渐变 -->
        <rect width="${width}" height="${height}" fill="#F9FAFB"/>
        <rect width="${width}" height="${height}" fill="url(#bgGradient)" opacity="0.3"/>

        <!-- 视频图标区域 -->
        <g transform="translate(${width/2}, ${height/2})">
          <!-- 视频播放按钮背景 -->
          <circle cx="0" cy="0" r="45" fill="#6B7280" opacity="0.2"/>
          <circle cx="0" cy="0" r="40" fill="#374151" opacity="0.3"/>
          <!-- 播放三角形 -->
          <polygon points="-15,-25 -15,25 20,0" fill="#FFFFFF" opacity="0.9"/>
        </g>

        <!-- 提示词文本 -->
        <text x="${width/2}" y="${height/2 + 80}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#374151">
          ${promptPreview}
        </text>

        <!-- 时长信息 -->
        <g transform="translate(${width/2}, ${height/2 + 110})">
          <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#000000" opacity="0.7"/>
          <text x="0" y="4" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="#FFFFFF">
            ${formattedDuration}
          </text>
        </g>

        <!-- 底部信息栏 -->
        <g transform="translate(0, ${height - 60})">
          <rect x="0" y="0" width="${width}" height="60" fill="#000000" opacity="0.05"/>

          <!-- 左侧：技术信息 -->
          <text x="20" y="25" font-family="system-ui" font-size="12" font-weight="500" fill="#6B7280">
            ${aspectRatio} • ${resolution}
          </text>
          <text x="20" y="45" font-family="system-ui" font-size="11" fill="#9CA3AF">
            ${video.provider || '未知提供者'}
          </text>

          <!-- 右侧：时间信息 -->
          <text x="${width - 20}" y="25" text-anchor="end" font-family="system-ui" font-size="11" fill="#6B7280">
            ${createTime}
          </text>
          <text x="${width - 20}" y="45" text-anchor="end" font-family="system-ui" font-size="10" fill="#9CA3AF">
            视频缩略图
          </text>
        </g>

        <!-- 装饰性元素 -->
        <rect x="10" y="10" width="3" height="20" rx="1.5" fill="#3B82F6" opacity="0.6"/>
        <rect x="${width - 13}" y="10" width="3" height="20" rx="1.5" fill="#10B981" opacity="0.6"/>
        <rect x="10" y="${height - 30}" width="3" height="20" rx="1.5" fill="#3B82F6" opacity="0.6"/>
        <rect x="${width - 13}" y="${height - 30}" width="3" height="20" rx="1.5" fill="#10B981" opacity="0.6"/>

        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:0.1"/>
            <stop offset="50%" style="stop-color:#8B5CF6;stop-opacity:0.05"/>
            <stop offset="100%" style="stop-color:#10B981;stop-opacity:0.1"/>
          </linearGradient>
        </defs>
      </svg>
    `;

    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(video: GeneratedVideo): string {
    return `video_thumb_${video.id}_${video.sourceImageId || 'none'}_${video.thumbnailUrl || 'none'}`;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return entry.isValid && (Date.now() - entry.timestamp) < this.cacheTimeout;
  }

  /**
   * 清理过期缓存
   */
  private cleanCache(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // 删除过期条目
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.cache.delete(key);
      }
    }

    // 如果仍然超过大小，删除最旧的条目
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
    toDelete.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * 获取类型描述
   */
  private getSourceDescription(type: ThumbnailType): string {
    const descriptions = {
      [ThumbnailType.SOURCE_IMAGE]: '源图片',
      [ThumbnailType.API_THUMBNAIL]: 'API缩略图',
      [ThumbnailType.EXTRACTED_FRAME]: '视频第一帧',
      [ThumbnailType.PLACEHOLDER]: '占位符'
    };
    return descriptions[type] || '未知';
  }

  /**
   * 预加载视频缩略图
   */
  async preloadThumbnails(videos: GeneratedVideo[]): Promise<void> {
    const promises = videos.map(video => this.getVideoThumbnail(video));
    await Promise.allSettled(promises);
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; validEntries: number; types: Record<ThumbnailType, number> } {
    const validEntries = Array.from(this.cache.values()).filter(entry => this.isCacheValid(entry));
    const types: Record<ThumbnailType, number> = {
      [ThumbnailType.SOURCE_IMAGE]: 0,
      [ThumbnailType.API_THUMBNAIL]: 0,
      [ThumbnailType.EXTRACTED_FRAME]: 0,
      [ThumbnailType.PLACEHOLDER]: 0
    };

    validEntries.forEach(entry => {
      types[entry.type]++;
    });

    return {
      size: this.cache.size,
      validEntries: validEntries.length,
      types
    };
  }
}

// 导出单例实例
export const videoThumbnailManager = new VideoThumbnailManager();

// 便捷函数
export const getVideoThumbnail = (video: GeneratedVideo): Promise<ThumbnailResult> => {
  return videoThumbnailManager.getVideoThumbnail(video);
};

export const preloadVideoThumbnails = (videos: GeneratedVideo[]): Promise<void> => {
  return videoThumbnailManager.preloadThumbnails(videos);
};