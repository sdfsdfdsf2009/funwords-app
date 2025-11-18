// 客户端缓存系统 - Service Worker缓存、IndexedDB存储、离线支持

// Service Worker缓存配置
export interface ServiceWorkerCacheConfig {
  cacheName: string;
  version: string;
  maxAge: number; // 缓存最大年龄（秒）
  maxSize: number; // 最大缓存大小（字节）
  networkTimeout: number; // 网络请求超时时间（毫秒）
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  strategies: Record<string, CacheStrategy>;
}

// 缓存策略
export interface CacheStrategy {
  name: string;
  cacheFirst?: boolean;
  networkFirst?: boolean;
  staleWhileRevalidate?: boolean;
  maxAge?: number;
  maxEntries?: number;
  ignoreSearch?: boolean;
  ignoreMethod?: string[];
  ignoreVary?: boolean[];
}

// IndexedDB配置
export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: Array<{
    name: string;
    keyPath?: string;
    autoIncrement?: boolean;
    indexes?: Array<{
      name: string;
      keyPath: string;
      unique?: boolean;
    }>;
  }>;
}

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  value: T;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  timestamp: number;
  expiresAt: number;
  size: number;
  etag?: string;
  lastModified?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

// 离线配置
export interface OfflineConfig {
  enableOfflineMode: boolean;
  offlinePages: string[];
  offlineAssets: string[];
  offlineStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  enableBackgroundSync: boolean;
  syncInterval: number; // 同步间隔（毫秒）
  maxOfflineQueueSize: number;
}

// 客户端缓存管理器
export class ClientCacheManager {
  private static instance: ClientCacheManager;
  private swConfig: ServiceWorkerCacheConfig;
  private idbConfig: IndexedDBConfig;
  private offlineConfig: OfflineConfig;
  private isOnline = true;
  private db: IDBDatabase | null = null;
  private offlineQueue: Array<{
    request: RequestInfo;
    timestamp: number;
    retryCount: number;
  }> = [];
  private eventListeners = new Map<string, Function[]>();

  private constructor() {
    this.swConfig = {
      cacheName: 'app-cache',
      version: '1.0.0',
      maxAge: 7 * 24 * 60 * 60, // 7天
      maxSize: 50 * 1024 * 1024, // 50MB
      networkTimeout: 10000,
      enableBackgroundSync: true,
      enablePushNotifications: true,
      strategies: {
        'GET': {
          name: 'cache-first',
          cacheFirst: true,
          maxAge: 24 * 60 * 60, // 1天
          maxEntries: 100
        },
        'POST': {
          name: 'network-first',
          networkFirst: true,
          maxAge: 0
        },
        'PUT': {
          name: 'network-first',
          networkFirst: true,
          maxAge: 0
        },
        'DELETE': {
          name: 'network-first',
          networkFirst: true,
          maxAge: 0
        }
      }
    };

    this.idbConfig = {
      dbName: 'AppCacheDB',
      version: 1,
      stores: [
        {
          name: 'cache',
          keyPath: 'key',
          indexes: [
            { name: 'expiresAt', keyPath: 'expiresAt' },
            { name: 'timestamp', keyPath: 'timestamp' },
            { name: 'tags', keyPath: 'tags', unique: false }
          ]
        },
        {
          name: 'offlineQueue',
          keyPath: 'id',
          autoIncrement: true,
          indexes: [
            { name: 'timestamp', keyPath: 'timestamp' }
          ]
        }
      ]
    };

    this.offlineConfig = {
      enableOfflineMode: true,
      offlinePages: ['/'],
      offlineAssets: [
        '/_next/static/',
        '/api/offline',
        '/manifest.json',
        '/favicon.ico'
      ],
      offlineStrategy: 'cache-first',
      enableBackgroundSync: true,
      syncInterval: 30000, // 30秒
      maxOfflineQueueSize: 100
    };

    this.initializeEventListeners();
  }

  static getInstance(): ClientCacheManager {
    if (!ClientCacheManager.instance) {
      ClientCacheManager.instance = new ClientCacheManager();
    }
    return ClientCacheManager.instance;
  }

  // 初始化客户端缓存
  async initialize(): Promise<void> {
    try {
      // 初始化IndexedDB
      await this.initializeIndexedDB();

      // 设置网络状态监听
      this.setupNetworkListeners();

      // 设置Service Worker
      await this.setupServiceWorker();

      // 启动离线同步
      if (this.offlineConfig.enableBackgroundSync) {
        this.startBackgroundSync();
      }

      console.log('✅ 客户端缓存系统已初始化');
    } catch (error) {
      console.error('❌ 客户端缓存初始化失败:', error);
    }
  }

  // 初始化IndexedDB
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.idbConfig.dbName, this.idbConfig.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target as IDBDatabase;

        // 删除旧版本的对象存储
        for (const storeName of Array.from(db.objectStoreNames)) {
          if (!this.idbConfig.stores.some(s => s.name === storeName)) {
            db.deleteObjectStore(storeName);
          }
        }

        // 创建新版本的对象存储
        for (const storeConfig of this.idbConfig.stores) {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(
              storeConfig.name,
              storeConfig.keyPath ? { keyPath: storeConfig.keyPath } : undefined
            );

            if (storeConfig.autoIncrement) {
              store.createIndex('id', 'id', { autoIncrement: true });
            }

            // 创建索引
            if (storeConfig.indexes) {
              for (const index of storeConfig.indexes) {
                store.createIndex(index.name, index.keyPath, { unique: index.unique });
              }
            }
          }
        }
      };
    });
  }

  // 设置网络状态监听
  private setupNetworkListeners(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;

      if (!wasOnline && this.isOnline) {
        this.emit('online');
        this.processOfflineQueue();
      } else if (wasOnline && !this.isOnline) {
        this.emit('offline');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // 初始状态
    updateOnlineStatus();
  }

  // 设置Service Worker
  private async setupServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        await registration.update();

        // 监听Service Worker消息
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

        console.log('🔧 Service Worker已注册');
      } catch (error) {
        console.warn('Service Worker注册失败:', error);
      }
    }
  }

  // 处理Service Worker消息
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        this.emit('cacheUpdated', data);
        break;
      case 'CACHE_DELETED':
        this.emit('cacheDeleted', data);
        break;
      case 'OFFLINE_QUEUE_PROCESSED':
        this.emit('offlineQueueProcessed', data);
        break;
      case 'SYNC_COMPLETED':
        this.emit('syncCompleted', data);
        break;
    }
  }

  // 启动离线同步
  private startBackgroundSync(): void {
    setInterval(async () => {
      if (this.isOnline && this.offlineQueue.length > 0) {
        await this.processOfflineQueue();
      }
    }, this.offlineConfig.syncInterval);
  }

  // 缓存请求
  async cacheRequest(request: Request, response: Response): Promise<void> {
    try {
      if (!this.shouldCacheRequest(request, response)) {
        return;
      }

      const cacheItem: CacheItem = {
        key: this.generateCacheKey(request),
        value: await response.clone().text(),
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        timestamp: Date.now(),
        expiresAt: Date.now() + this.swConfig.maxAge * 1000,
        size: 0, // 将在序列化后计算
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
        tags: this.extractTags(request),
        metadata: {
          status: response.status,
          statusText: response.statusText,
          cacheControl: response.headers.get('cache-control')
        }
      };

      cacheItem.size = this.calculateItemSize(cacheItem);

      // 保存到IndexedDB
      await this.saveToIndexedDB(cacheItem);

      // 保存到Service Worker缓存
      if ('caches' in window) {
        const cache = await caches.open(this.swConfig.cacheName);
        const cacheResponse = this.createCacheResponse(cacheItem);
        await cache.put(request, cacheResponse);
      }

      this.emit('cached', { key: cacheItem.key, size: cacheItem.size });
    } catch (error) {
      console.error('缓存请求失败:', error);
    }
  }

  // 从缓存获取响应
  async getCachedResponse(request: Request): Promise<Response | null> {
    try {
      // 首先尝试Service Worker缓存
      if ('caches' in window) {
        const cache = await caches.open(this.swConfig.cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse && !this.isExpired(cachedResponse)) {
          return cachedResponse;
        }
      }

      // 然后尝试IndexedDB缓存
      const cacheItem = await this.getFromIndexedDB(this.generateCacheKey(request));

      if (cacheItem && !this.isCacheItemExpired(cacheItem)) {
        return this.createCacheResponse(cacheItem);
      }

      return null;
    } catch (error) {
      console.error('获取缓存响应失败:', error);
      return null;
    }
  }

  // 获取或设置缓存
  async getOrSet<T = any>(
    key: string,
    valueFactory: () => Promise<T> | T,
    options?: {
      ttl?: number;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    let cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await valueFactory();
    await this.set(key, value, options);
    return value;
  }

  // 设置缓存
  async set<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const cacheItem: CacheItem<T> = {
        key,
        value,
        timestamp: Date.now(),
        expiresAt: Date.now() + (options?.ttl || this.swConfig.maxAge) * 1000,
        size: 0,
        tags: options?.tags || [],
        metadata: options?.metadata || {}
      };

      cacheItem.size = this.calculateItemSize(cacheItem);

      await this.saveToIndexedDB(cacheItem);
      this.emit('set', { key, size: cacheItem.size });
    } catch (error) {
      console.error('设置缓存失败:', error);
    }
  }

  // 获取缓存
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cacheItem = await this.getFromIndexedDB(key);

      if (cacheItem && !this.isCacheItemExpired(cacheItem)) {
        // 更新访问时间
        await this.updateCacheItemAccess(key);
        return cacheItem.value;
      }

      return null;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  // 删除缓存
  async delete(key: string): Promise<void> {
    try {
      // 从IndexedDB删除
      await this.deleteFromIndexedDB(key);

      // 从Service Worker缓存删除
      if ('caches' in window) {
        const cache = await caches.open(this.swConfig.cacheName);
        const keys = await cache.keys();

        for (const cacheKey of keys) {
          if (cacheKey.url && this.generateCacheKeyFromUrl(cacheKey.url) === key) {
            await cache.delete(cacheKey);
          }
        }
      }

      this.emit('deleted', { key });
    } catch (error) {
      console.error('删除缓存失败:', error);
    }
  }

  // 按标签删除缓存
  async deleteByTag(tag: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // 从IndexedDB获取匹配的键
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('tags');

      const request = index.openCursor(IDBKeyRange.only(tag));

      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            keysToDelete.push(cursor.value.key);
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      // 删除匹配的缓存项
      for (const key of keysToDelete) {
        await this.delete(key);
      }

      this.emit('deletedByTag', { tag, count: keysToDelete.length });
    } catch (error) {
      console.error('按标签删除缓存失败:', error);
    }
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    try {
      // 清空IndexedDB
      await this.clearIndexedDB();

      // 清空Service Worker缓存
      if ('caches' in window) {
        const cache = await caches.open(this.swConfig.cacheName);
        const keys = await cache.keys();

        for (const key of keys) {
          await cache.delete(key);
        }
      }

      // 清空离线队列
      this.offlineQueue = [];
      await this.clearOfflineQueue();

      this.emit('cleared');
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  // 获取缓存统计
  async getStatistics(): Promise<{
    totalItems: number;
    totalSize: number;
    hitRate: number;
    offlineQueueSize: number;
    cacheDistribution: Record<string, number>;
    oldestItem: number;
    newestItem: number;
  }> {
    try {
      const stats = await this.getIndexedDBStatistics();
      return {
        totalItems: stats.itemCount,
        totalSize: stats.totalSize,
        hitRate: this.calculateHitRate(),
        offlineQueueSize: this.offlineQueue.length,
        cacheDistribution: stats.tagDistribution,
        oldestItem: stats.oldestItem,
        newestItem: stats.newestItem
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        hitRate: 0,
        offlineQueueSize: 0,
        cacheDistribution: {},
        oldestItem: 0,
        newestItem: 0
      };
    }
  }

  // 预加载资源
  async preloadResources(resources: Array<{
    url: string;
    priority?: 'high' | 'medium' | 'low';
    strategy?: CacheStrategy;
  }>): Promise<void> {
    console.log(`🚀 开始预加载 ${resources.length} 个资源`);

    const promises = resources.map(async ({ url, priority = 'medium', strategy }) => {
      try {
        const request = new Request(url);
        const response = await fetch(request);

        if (response.ok) {
          await this.cacheRequest(request, response);
        }
      } catch (error) {
        console.error(`预加载资源失败 ${url}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('✅ 资源预加载完成');
  }

  // 处理离线队列
  private async processOfflineQueue(): Promise<void> {
    const queueToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const queuedItem of queueToProcess) {
      try {
        const response = await fetch(queuedItem.request.url, {
          method: queuedItem.request.method,
          headers: queuedItem.request.headers,
          body: queuedItem.request.body
        });

        if (response.ok) {
          await this.removeFromOfflineQueue(queuedItem);
          this.emit('requestSynced', { url: queuedItem.request.url });
        } else {
          queuedItem.retryCount++;
          if (queuedItem.retryCount < 3) {
            this.offlineQueue.push(queuedItem);
          }
        }
      } catch (error) {
        console.error(`同步离线请求失败 ${queuedItem.request.url}:`, error);
        queuedItem.retryCount++;

        if (queuedItem.retryCount < 3) {
          this.offlineQueue.push(queuedItem);
        }
      }
    }
  }

  // 添加到离线队列
  private async addToOfflineQueue(request: RequestInfo): Promise<void> {
    const queuedItem = {
      request,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.offlineQueue.push(queuedItem);

    // 限制队列大小
    if (this.offlineQueue.length > this.offlineConfig.maxOfflineQueueSize) {
      this.offlineQueue.shift(); // 移除最旧的项
    }

    await this.saveToOfflineQueue();
  }

  // 从离线队列移除
  private async removeFromOfflineQueue(item: { request: RequestInfo; timestamp: number; retryCount: number }): Promise<void> {
    this.offlineQueue = this.offlineQueue.filter(q => q !== item);
    await this.saveToOfflineQueue();
  }

  // 保存到离线队列
  private async saveToOfflineQueue(): Promise<void> {
    try {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');

      // 清空现有队列
      await store.clear();

      // 保存新队列
      for (const item of this.offlineQueue) {
        await store.add(item);
      }
    } catch (error) {
      console.error('保存离线队列失败:', error);
    }
  }

  // 清空离线队列
  private async clearOfflineQueue(): Promise<void> {
    try {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      await store.clear();
    } catch (error) {
      console.error('清空离线队列失败:', error);
    }
  }

  // 应该缓存请求吗？
  private shouldCacheRequest(request: Request, response: Response): boolean {
    const strategy = this.getStrategy(request.method);
    if (!strategy) return false;

    // 检查缓存控制头
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl && cacheControl.includes('no-store')) {
      return false;
    }

    // 检查状态码
    if (!response.ok && response.status !== 304) {
      return false;
    }

    return true;
  }

  // 获取缓存策略
  private getStrategy(method: string): CacheStrategy | null {
    return this.swConfig.strategies[method.toUpperCase()] || null;
  }

  // 生成缓存键
  private generateCacheKey(request: Request): string {
    return createHash('md5').update(`${request.method}:${request.url}`).digest('hex');
  }

  // 从URL生成缓存键
  private generateCacheKeyFromUrl(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }

  // 提取标签
  private extractTags(request: Request): string[] {
    const tags: string[] = [];

    // 从URL提取标签
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      tags.push('api');
    }
    if (url.pathname.includes('/static/') || url.pathname.includes('/_next/')) {
      tags.push('static');
    }

    // 从查询参数提取标签
    url.searchParams.forEach((value, key) => {
      tags.push(`param:${key}`);
    });

    return tags;
  }

  // 计算项目大小
  private calculateItemSize(item: CacheItem): number {
    try {
      const serialized = JSON.stringify(item);
      return Buffer.byteLength(serialized, 'utf8');
    } catch {
      return 1024; // 默认1KB
    }
  }

  // 创建缓存响应
  private createCacheResponse(item: CacheItem): Response {
    const headers = new Headers(item.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Cache-Item-Key', item.key);
    headers.set('X-Cache-Timestamp', item.timestamp.toString());
    headers.set('X-Cache-Expires-At', item.expiresAt.toString());

    if (item.etag) {
      headers.set('ETag', item.etag);
    }
    if (item.lastModified) {
      headers.set('Last-Modified', item.lastModified);
    }

    return new Response(item.value, {
      status: item.metadata?.status || 200,
      statusText: item.metadata?.statusText || 'OK',
      headers
    });
  }

  // 检查响应是否过期
  private isExpired(response: Response): boolean {
    const expiresAt = response.headers.get('X-Cache-Expires-At');
    if (expiresAt) {
      return Date.now() > parseInt(expiresAt);
    }

    const cacheControl = response.headers.get('cache-control');
    if (cacheControl) {
      const maxAge = this.extractMaxAge(cacheControl);
      if (maxAge > 0) {
        const timestamp = response.headers.get('X-Cache-Timestamp');
        if (timestamp) {
          return Date.now() > parseInt(timestamp) + maxAge * 1000;
        }
      }
    }

    return false;
  }

  // 检查缓存项是否过期
  private isCacheItemExpired(item: CacheItem): boolean {
    return Date.now() > item.expiresAt;
  }

  // 提取Max-Age
  private extractMaxAge(cacheControl: string): number {
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // IndexedDB操作方法
  private async saveToIndexedDB(item: CacheItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(key: string): Promise<CacheItem | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async updateCacheItemAccess(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.accessedAt = Date.now();
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDBStatistics(): Promise<{
    itemCount: number;
    totalSize: number;
    tagDistribution: Record<string, number>;
    oldestItem: number;
    newestItem: number;
  }> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CacheItem[];
        const stats = {
          itemCount: items.length,
          totalSize: items.reduce((sum, item) => sum + item.size, 0),
          tagDistribution: {} as Record<string, number>,
          oldestItem: items.length > 0 ? Math.min(...items.map(item => item.timestamp)) : 0,
          newestItem: items.length > 0 ? Math.max(...items.map(item => item.timestamp)) : 0
        };

        // 统计标签分布
        for (const item of items) {
          for (const tag of item.tags) {
            stats.tagDistribution[tag] = (stats.tagDistribution[tag] || 0) + 1;
          }
        }

        resolve(stats);
      };

      request.onerror = () => {
        resolve({
          itemCount: 0,
          totalSize: 0,
          tagDistribution: {},
          oldestItem: 0,
          newestItem: 0
        });
      };
    });
  }

  // 计算命中率
  private calculateHitRate(): number {
    // 这里应该基于实际的命中和未命中数据计算
    // 现在返回模拟数据
    return 0.85;
  }

  // 事件监听器方法
  private initializeEventListeners(): void {
    // 监听Service Worker事件
    this.eventListeners.set('message', []);
    this.eventListeners.set('statechange', []);
  }

  // 添加事件监听器
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  // 移除事件监听器
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 触发事件
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`事件监听器错误 (${event}):`, error);
        }
      });
    }
  }

  // 停止客户端缓存
  stop(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.eventListeners.clear();
    console.log('⏹️ 客户端缓存管理器已停止');
  }
}

// 导出单例实例
export const clientCache = ClientCacheManager.getInstance();

// 导出类型
export type { ServiceWorkerCacheConfig, CacheStrategy, IndexedDBConfig, CacheItem, OfflineConfig };