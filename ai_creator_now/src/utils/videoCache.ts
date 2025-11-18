import { VideoInfo } from '../types';
import { videoCacheManager as dbVideoCacheManager } from '@/stores/databaseVideoCacheStore';
import { useDatabaseVideoCacheStore } from '@/stores/databaseVideoCacheStore';

interface CachedVideo {
  id: string;
  localPath: string;
  originalUrl: string;
  downloadDate: number;
  fileSize: number;
  metadata?: any;
  userId?: string;
  isActive: boolean;
}

// Legacy VideoCacheManager that delegates to database cache
class VideoCacheManager {
  private readonly cacheDir = '/tmp/remotion-videos';
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (!this.initialized) {
      try {
        await dbVideoCacheManager.initialize();
        this.initialized = true;
      } catch (error) {
        console.warn('Failed to initialize video cache:', error);
      }
    }
  }

  async downloadVideo(video: VideoInfo): Promise<CachedVideo> {
    await this.initialize();

    // Check database cache first
    const cached = dbVideoCacheManager.getFromCache(video.id);
    if (cached) {
      console.log(`🎬 使用缓存视频: ${video.id}`);
      return cached;
    }

    console.log(`🎬 开始下载视频: ${video.id}`);

    try {
      const response = await fetch(video.url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      const blob = await response.blob();
      const fileSize = blob.size;

      // Create local URL
      const localUrl = URL.createObjectURL(blob);

      // Add to database cache
      const dbCached = await dbVideoCacheManager.downloadVideo(video);

      console.log(`🎬 视频下载完成: ${video.id}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      // Return cached video in legacy format
      return {
        id: video.id,
        localPath: localUrl,
        originalUrl: video.url,
        downloadDate: Date.now(),
        fileSize,
        metadata: dbCached?.metadata,
        userId: dbCached?.userId,
        isActive: true
      };

    } catch (error) {
      console.error(`🎬 视频下载失败: ${video.id}`, error);
      // Fallback to original URL
      return {
        id: video.id,
        localPath: video.url,
        originalUrl: video.url,
        downloadDate: Date.now(),
        fileSize: 0,
        isActive: false
      };
    }
  }

  async prepareVideos(videos: VideoInfo[]): Promise<Array<VideoInfo & { localUrl: string }>> {
    await this.initialize();

    console.log(`🎬 准备处理 ${videos.length} 个视频`);

    const preparedVideos = await dbVideoCacheManager.prepareVideos(videos);

    console.log(`🎬 所有视频准备完成`);
    return preparedVideos;
  }

  async clearCache() {
    await this.initialize();

    await dbVideoCacheManager.clearCache();
    console.log('🎬 视频缓存已清空');
  }

  getCacheInfo() {
    const store = useDatabaseVideoCacheStore.getState();
    return store.getCacheInfo();
  }

  // Additional methods for compatibility
  async getFromCache(videoId: string): Promise<CachedVideo | null> {
    await this.initialize();
    return dbVideoCacheManager.getFromCache(videoId);
  }

  async addToCache(video: VideoInfo, localPath: string, fileSize?: number): Promise<void> {
    await this.initialize();
    await dbVideoCacheManager.addToCache(video, localPath, fileSize);
  }

  async removeFromCache(videoId: string): Promise<void> {
    await this.initialize();
    await dbVideoCacheManager.removeFromCache(videoId);
  }
}

// Export singleton instance
export const videoCacheManager = new VideoCacheManager();