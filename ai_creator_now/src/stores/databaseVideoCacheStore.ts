import { create } from 'zustand';
import { VideoInfo } from '../types';
import { prismaHelpers } from '@/lib/prisma';

export interface CachedVideo {
  id: string;
  localPath: string;
  originalUrl: string;
  downloadDate: number;
  fileSize: number;
  metadata?: any;
  userId?: string;
  isActive: boolean;
}

export interface VideoCacheStore {
  cache: Map<string, CachedVideo>;
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeCache: () => Promise<void>;
  getFromCache: (videoId: string) => CachedVideo | null;
  addToCache: (video: VideoInfo, localPath: string, fileSize?: number) => Promise<CachedVideo | null>;
  removeFromCache: (videoId: string) => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheInfo: () => {
    totalVideos: number;
    totalSize: number;
    videos: Array<{
      id: string;
      originalUrl: string;
      downloadDate: string;
      fileSize: string;
    }>;
  };
  prepareVideos: (videos: VideoInfo[]) => Promise<Array<VideoInfo & { localUrl: string }>>;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Fallback methods
  saveToStorage: () => void;
  loadFromStorage: () => CachedVideo[] | null;
}

// 默认用户ID
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

class VideoCacheAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/video-cache';
  }

  async createCache(data: Omit<CachedVideo, 'id' | 'isActive'>): Promise<CachedVideo> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        userId: data.userId || DEFAULT_USER_ID,
        downloadDate: BigInt(data.downloadDate),
        fileSize: data.fileSize ? BigInt(data.fileSize) : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create video cache: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      ...result,
      downloadDate: Number(result.downloadDate),
      fileSize: Number(result.fileSize || 0),
    };
  }

  async getCache(userId?: string, videoId?: string): Promise<CachedVideo[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (videoId) params.append('videoId', videoId);

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to load video cache: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.caches || []).map((cache: any) => ({
      ...cache,
      downloadDate: Number(cache.downloadDate),
      fileSize: Number(cache.fileSize || 0),
    }));
  }

  async updateCache(userId: string | undefined, videoId: string, data: Partial<CachedVideo>): Promise<CachedVideo> {
    const response = await fetch(`${this.baseUrl}/${videoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        downloadDate: data.downloadDate ? BigInt(data.downloadDate) : undefined,
        fileSize: data.fileSize ? BigInt(data.fileSize) : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update video cache: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      ...result,
      downloadDate: Number(result.downloadDate),
      fileSize: Number(result.fileSize || 0),
    };
  }

  async deleteCache(userId?: string, videoId?: string): Promise<void> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (videoId) params.append('videoId', videoId);

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete video cache: ${response.statusText}`);
    }
  }

  async getCacheStats(userId?: string): Promise<{ total: number; totalSize: number }> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await fetch(`${this.baseUrl}/stats${params}`);
    if (!response.ok) {
      throw new Error(`Failed to get cache stats: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      total: data.total,
      totalSize: Number(data.totalSize),
    };
  }
}

const videoCacheAPI = new VideoCacheAPI();

export const useDatabaseVideoCacheStore = create<VideoCacheStore>((set, get) => ({
  // Initial state
  cache: new Map(),
  isLoading: false,
  error: null,

  // Initialize cache from database
  initializeCache: async () => {
    set({ isLoading: true, error: null });

    try {
      const caches = await videoCacheAPI.getCache(DEFAULT_USER_ID);
      const cacheMap = new Map<string, CachedVideo>();

      caches.forEach(cache => {
        if (cache.isActive) {
          cacheMap.set(cache.id, cache);
        }
      });

      set({ cache: cacheMap, error: null });

      // Backup to localStorage
      get().saveToStorage();
    } catch (error) {
      console.error('Error initializing video cache:', error);
      set({ error: '初始化视频缓存失败' });

      // Fallback to localStorage
      const localStorageCaches = get().loadFromStorage();
      if (localStorageCaches) {
        const cacheMap = new Map<string, CachedVideo>();
        localStorageCaches.forEach(cache => {
          cacheMap.set(cache.id, cache);
        });
        set({ cache: cacheMap });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // Get video from cache
  getFromCache: (videoId: string) => {
    const { cache } = get();
    return cache.get(videoId) || null;
  },

  // Add video to cache
  addToCache: async (video, localPath, fileSize) => {
    set({ isLoading: true, error: null });

    try {
      const cacheData: Omit<CachedVideo, 'id' | 'isActive'> = {
        id: video.id,
        localPath,
        originalUrl: video.url,
        downloadDate: Date.now(),
        fileSize: fileSize || 0,
        metadata: {},
        userId: DEFAULT_USER_ID,
      };

      const createdCache = await videoCacheAPI.createCache(cacheData);

      set(state => {
        const newCache = new Map(state.cache);
        newCache.set(createdCache.id, createdCache);
        return { cache: newCache, error: null };
      });

      // Backup to localStorage
      get().saveToStorage();

      return createdCache;
    } catch (error) {
      console.error('Error adding video to cache:', error);
      set({ error: '添加视频到缓存失败' });

      // Fallback to localStorage
      const fallbackCache: CachedVideo = {
        id: video.id,
        localPath,
        originalUrl: video.url,
        downloadDate: Date.now(),
        fileSize: fileSize || 0,
        metadata: {},
        userId: DEFAULT_USER_ID,
        isActive: true,
      };

      set(state => {
        const newCache = new Map(state.cache);
        newCache.set(fallbackCache.id, fallbackCache);
        return { cache: newCache };
      });

      get().saveToStorage();

      return fallbackCache;
    } finally {
      set({ isLoading: false });
    }
  },

  // Remove video from cache
  removeFromCache: async (videoId: string) => {
    try {
      await videoCacheAPI.deleteCache(DEFAULT_USER_ID, videoId);

      set(state => {
        const newCache = new Map(state.cache);
        const cached = newCache.get(videoId);

        if (cached && cached.localPath.startsWith('blob:')) {
          URL.revokeObjectURL(cached.localPath);
        }

        newCache.delete(videoId);
        return { cache: newCache };
      });

      // Backup to localStorage
      get().saveToStorage();
    } catch (error) {
      console.error('Error removing video from cache:', error);
      set({ error: '从缓存中移除视频失败' });
    }
  },

  // Clear all cache
  clearCache: async () => {
    try {
      await videoCacheAPI.deleteCache(DEFAULT_USER_ID);

      // Revoke object URLs to prevent memory leaks
      const { cache } = get();
      cache.forEach(cached => {
        if (cached.localPath.startsWith('blob:')) {
          URL.revokeObjectURL(cached.localPath);
        }
      });

      set({ cache: new Map(), error: null });

      // Clear localStorage backup
      if (typeof window !== 'undefined') {
        localStorage.removeItem('remotion-video-cache');
      }
    } catch (error) {
      console.error('Error clearing video cache:', error);
      set({ error: '清空视频缓存失败' });
    }
  },

  // Get cache information
  getCacheInfo: () => {
    const { cache } = get();
    const videos = Array.from(cache.values());

    return {
      totalVideos: videos.length,
      totalSize: videos.reduce((sum, v) => sum + v.fileSize, 0),
      videos: videos.map(v => ({
        id: v.id,
        originalUrl: v.originalUrl,
        downloadDate: new Date(v.downloadDate).toLocaleString(),
        fileSize: `${(v.fileSize / 1024 / 1024).toFixed(2)}MB`
      }))
    };
  },

  // Prepare videos for processing
  prepareVideos: async (videos) => {
    console.log(`🎬 准备处理 ${videos.length} 个视频`);

    const { cache } = get();
    const preparedVideos = await Promise.all(
      videos.map(async (video) => {
        // Check cache first
        const cached = cache.get(video.id);
        if (cached) {
          console.log(`🎬 使用缓存视频: ${video.id}`);
          return {
            ...video,
            localUrl: cached.localPath
          };
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

          // Add to cache
          await get().addToCache(video, localUrl, fileSize);

          console.log(`🎬 视频下载完成: ${video.id}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
          return {
            ...video,
            localUrl
          };

        } catch (error) {
          console.error(`🎬 视频下载失败: ${video.id}`, error);
          return {
            ...video,
            localUrl: video.url // Fallback to original URL
          };
        }
      })
    );

    console.log(`🎬 所有视频准备完成`);
    return preparedVideos;
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Save to localStorage as backup
  saveToStorage: () => {
    if (typeof window !== 'undefined') {
      try {
        const { cache } = get();
        const cacheArray = Array.from(cache.values());
        localStorage.setItem('remotion-video-cache', JSON.stringify(cacheArray));
      } catch (error) {
        console.error('Error saving video cache to localStorage:', error);
      }
    }
  },

  // Load from localStorage as fallback
  loadFromStorage: () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('remotion-video-cache');
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error('Error loading video cache from localStorage:', error);
        return null;
      }
    }
    return null;
  }
}));

// Export singleton instance for backward compatibility
export const videoCacheManager = {
  initialize: () => {
    return useDatabaseVideoCacheStore.getState().initializeCache();
  },

  getFromCache: (videoId: string) => {
    return useDatabaseVideoCacheStore.getState().getFromCache(videoId);
  },

  downloadVideo: async (video: VideoInfo) => {
    const store = useDatabaseVideoCacheStore.getState();
    const cached = store.getFromCache(video.id);

    if (cached) {
      console.log(`🎬 使用缓存视频: ${video.id}`);
      return cached;
    }

    try {
      const response = await fetch(video.url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      const blob = await response.blob();
      const fileSize = blob.size;
      const localUrl = URL.createObjectURL(blob);

      const result = await store.addToCache(video, localUrl, fileSize);
      console.log(`🎬 视频下载完成: ${video.id}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      return result || {
        id: video.id,
        localPath: localUrl,
        originalUrl: video.url,
        downloadDate: Date.now(),
        fileSize
      };

    } catch (error) {
      console.error(`🎬 视频下载失败: ${video.id}`, error);
      return {
        id: video.id,
        localPath: video.url,
        originalUrl: video.url,
        downloadDate: Date.now(),
        fileSize: 0
      };
    }
  },

  prepareVideos: (videos: VideoInfo[]) => {
    return useDatabaseVideoCacheStore.getState().prepareVideos(videos);
  },

  clearCache: () => {
    return useDatabaseVideoCacheStore.getState().clearCache();
  },

  getCacheInfo: () => {
    return useDatabaseVideoCacheStore.getState().getCacheInfo();
  }
};

export default useDatabaseVideoCacheStore;