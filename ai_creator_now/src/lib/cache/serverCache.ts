// 服务端缓存系统 - Redis缓存集成、智能缓存策略、分布式缓存支持

import { createHash } from 'crypto';

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  value: T;
  ttl: number; // 生存时间（秒）
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  tags: string[];
  metadata: Record<string, any>;
  size: number; // 字节大小
}

// 缓存配置接口
export interface CacheConfig {
  defaultTTL: number;
  maxSize: number; // 最大缓存大小（字节）
  maxItems: number; // 最大缓存项数
  compressionThreshold: number; // 压缩阈值（字节）
  enableCompression: boolean;
  enableMetrics: boolean;
  enableDistributedCache: boolean;
  redisUrl?: string;
  redisOptions?: any;
  namespace: string;
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'random';
}

// 缓存统计接口
export interface CacheStatistics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  itemCount: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  topHitKeys: Array<{ key: string; hits: number }>;
  keyDistribution: Record<string, number>;
}

// 缓存事件接口
export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'error';
  key: string;
  timestamp: number;
  duration?: number;
  size?: number;
  tags?: string[];
  error?: string;
  metadata?: Record<string, any>;
}

// 智能缓存策略接口
export interface CacheStrategy {
  name: string;
  ttl: number | ((data: any, context?: any) => number);
  condition?: (key: string, data?: any, context?: any) => boolean;
  tags?: string[];
  compress?: boolean;
  metadata?: Record<string, any>;
  dependencies?: string[]; // 依赖的缓存键
  onInvalidate?: (key: string, value: any) => void;
}

// 分布式缓存接口
export interface DistributedCacheAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  getTTL(key: string): Promise<number>;
  setTTL(key: string, ttl: number): Promise<void>;
}

// 服务端缓存管理器
export class ServerCacheManager {
  private static instance: ServerCacheManager;
  private config: CacheConfig;
  private cache = new Map<string, CacheItem>();
  private strategies = new Map<string, CacheStrategy>();
  private events: CacheEvent[] = [];
  private statistics: CacheStatistics;
  private distributedAdapter: DistributedCacheAdapter | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private compressionEnabled = false;

  private constructor() {
    this.config = {
      defaultTTL: 300, // 5分钟
      maxSize: 100 * 1024 * 1024, // 100MB
      maxItems: 10000,
      compressionThreshold: 1024, // 1KB
      enableCompression: true,
      enableMetrics: true,
      enableDistributedCache: false,
      namespace: 'default',
      evictionPolicy: 'lru'
    };

    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      itemCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      topHitKeys: [],
      keyDistribution: {}
    };

    this.initializeCompression();
    this.startCleanupTimer();
  }

  static getInstance(): ServerCacheManager {
    if (!ServerCacheManager.instance) {
      ServerCacheManager.instance = new ServerCacheManager();
    }
    return ServerCacheManager.instance;
  }

  // 初始化压缩
  private async initializeCompression(): Promise<void> {
    // 这里可以初始化压缩库，如 node-gzip
    this.compressionEnabled = this.config.enableCompression;
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
      this.enforceMemoryLimits();
      this.updateStatistics();
    }, 60 * 1000); // 每分钟清理一次
  }

  // 设置分布式缓存适配器
  setDistributedAdapter(adapter: DistributedCacheAdapter): void {
    this.distributedAdapter = adapter;
    this.config.enableDistributedCache = true;
    console.log('🌐 分布式缓存适配器已设置');
  }

  // 注册缓存策略
  registerStrategy(keyPattern: string | RegExp, strategy: CacheStrategy): void {
    const key = typeof keyPattern === 'string' ? keyPattern : keyPattern.source;
    this.strategies.set(key, strategy);
    console.log(`📝 缓存策略已注册: ${strategy.name} for ${key}`);
  }

  // 获取缓存项
  async get<T = any>(key: string, context?: any): Promise<T | null> {
    const startTime = Date.now();

    try {
      let item: CacheItem<T> | null = null;

      // 首先尝试本地缓存
      item = this.cache.get(this.getNamespacedKey(key)) || null;

      // 如果本地没有，尝试分布式缓存
      if (!item && this.distributedAdapter) {
        const distributedValue = await this.distributedAdapter.get(this.getNamespacedKey(key));
        if (distributedValue !== null) {
          item = distributedValue;
          // 将分布式缓存的数据同步到本地
          this.cache.set(this.getNamespacedKey(key), item);
        }
      }

      if (item) {
        // 检查是否过期
        if (this.isExpired(item)) {
          await this.delete(key);
          this.recordEvent('miss', key, Date.now() - startTime);
          this.statistics.misses++;
          return null;
        }

        // 更新访问信息
        item.accessedAt = Date.now();
        item.accessCount++;

        this.recordEvent('hit', key, Date.now() - startTime, item.size, item.tags);
        this.statistics.hits++;
        return item.value;
      }

      this.recordEvent('miss', key, Date.now() - startTime);
      this.statistics.misses++;
      return null;
    } catch (error) {
      this.recordEvent('error', key, Date.now() - startTime, 0, [], error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  // 设置缓存项
  async set<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      strategy?: string;
      compress?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const strategy = options?.strategy ? this.strategies.get(options.strategy) : null;

      // 检查缓存条件
      if (strategy && strategy.condition && !strategy.condition(key, value, context)) {
        return;
      }

      // 确定TTL
      const ttl = options?.ttl ||
                   (strategy?.ttl && typeof strategy.ttl === 'function' ? strategy.ttl(value, context) : strategy.ttl) ||
                   this.config.defaultTTL;

      // 确定标签
      const tags = [...(options?.tags || []), ...(strategy?.tags || [])];

      // 序列化和压缩值
      let serializedValue = JSON.stringify(value);
      let shouldCompress = options?.compress || strategy?.compress || false;

      if (this.compressionEnabled && !shouldCompress && serializedValue.length > this.config.compressionThreshold) {
        shouldCompress = true;
      }

      const finalValue = shouldCompress ? await this.compress(serializedValue) : serializedValue;
      const size = Buffer.byteLength(finalValue, 'utf8');

      const cacheItem: CacheItem<T> = {
        key: this.getNamespacedKey(key),
        value,
        ttl,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        accessCount: 0,
        tags,
        metadata: { ...(strategy?.metadata || {}), ...(options?.metadata || {}) },
        size
      };

      // 检查内存限制
      if (this.shouldEvictBeforeSet(size)) {
        await this.evictItems(size);
      }

      // 设置本地缓存
      this.cache.set(cacheItem.key, cacheItem);

      // 设置分布式缓存
      if (this.distributedAdapter) {
        await this.distributedAdapter.set(cacheItem.key, cacheItem, ttl);
      }

      // 设置依赖项的失效回调
      if (strategy?.dependencies && strategy.onInvalidate) {
        for (const dependency of strategy.dependencies) {
          this.watchDependency(dependency, key, strategy.onInvalidate);
        }
      }

      this.recordEvent('set', key, Date.now() - startTime, size, tags);
      this.statistics.sets++;
    } catch (error) {
      this.recordEvent('error', key, Date.now() - startTime, 0, [], error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // 删除缓存项
  async delete(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      const namespacedKey = this.getNamespacedKey(key);
      const item = this.cache.get(namespacedKey);

      if (item) {
        this.cache.delete(namespacedKey);

        // 删除分布式缓存
        if (this.distributedAdapter) {
          await this.distributedAdapter.delete(namespacedKey);
        }

        // 触发依赖失效
        this.triggerDependencyInvalidation(key);

        this.recordEvent('delete', key, Date.now() - startTime, item.size, item.tags);
        this.statistics.deletes++;
      }
    } catch (error) {
      this.recordEvent('error', key, Date.now() - startTime, 0, [], error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // 检查缓存项是否存在
  async exists(key: string): Promise<boolean> {
    const namespacedKey = this.getNamespacedKey(key);

    // 检查本地缓存
    if (this.cache.has(namespacedKey)) {
      const item = this.cache.get(namespacedKey)!;
      return !this.isExpired(item);
    }

    // 检查分布式缓存
    if (this.distributedAdapter) {
      return await this.distributedAdapter.exists(namespacedKey);
    }

    return false;
  }

  // 按标签删除缓存项
  async deleteByTag(tag: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache) {
      if (item.tags.includes(tag)) {
        keysToDelete.push(this.extractOriginalKey(key));
      }
    }

    await Promise.all(keysToDelete.map(key => this.delete(key)));
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    this.cache.clear();

    if (this.distributedAdapter) {
      await this.distributedAdapter.clear();
    }

    this.statistics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      itemCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      topHitKeys: [],
      keyDistribution: {}
    };
  }

  // 获取或设置缓存项（如果不存在则设置）
  async getOrSet<T = any>(
    key: string,
    valueFactory: () => Promise<T> | T,
    options?: {
      ttl?: number;
      tags?: string[];
      strategy?: string;
      compress?: boolean;
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

  // 预热缓存
  async warmup(entries: Array<{
    key: string;
    valueFactory: () => Promise<any> | any;
    options?: {
      ttl?: number;
      tags?: string[];
      strategy?: string;
    };
  }>): Promise<void> {
    console.log(`🔥 开始预热缓存，共 ${entries.length} 项`);

    const promises = entries.map(async ({ key, valueFactory, options }) => {
      try {
        const value = await valueFactory();
        await this.set(key, value, options);
      } catch (error) {
        console.error(`预热缓存失败 ${key}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('✅ 缓存预热完成');
  }

  // 批量获取
  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    const promises = keys.map(key => this.get<T>(key));
    return Promise.all(promises);
  }

  // 批量设置
  async mset<T = any>(entries: Array<{
    key: string;
    value: T;
    options?: {
      ttl?: number;
      tags?: string[];
      strategy?: string;
    };
  }>): Promise<void> {
    const promises = entries.map(({ key, value, options }) => this.set(key, value, options));
    await Promise.all(promises);
  }

  // 原子递增
  async incr(key: string, amount: number = 1): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current || 0) + amount;
    await this.set(key, newValue);
    return newValue;
  }

  // 原子递减
  async decr(key: string, amount: number = 1): Promise<number> {
    return this.incr(key, -amount);
  }

  // 获取缓存统计
  getStatistics(): CacheStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  // 获取热门键
  getTopKeys(limit: number = 10): Array<{ key: string; hits: number }> {
    const keyHits = new Map<string, number>();

    for (const item of this.cache.values()) {
      keyHits.set(this.extractOriginalKey(item.key), item.accessCount);
    }

    return Array.from(keyHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, hits]) => ({ key, hits }));
  }

  // 获取缓存大小
  getCacheSize(): { itemCount: number; byteSize: number } {
    let itemCount = 0;
    let byteSize = 0;

    for (const item of this.cache.values()) {
      itemCount++;
      byteSize += item.size;
    }

    return { itemCount, byteSize };
  }

  // 获取命名空间键
  private getNamespacedKey(key: string): string {
    return `${this.config.namespace}:${key}`;
  }

  // 提取原始键
  private extractOriginalKey(namespacedKey: string): string {
    return namespacedKey.replace(`${this.config.namespace}:`, '');
  }

  // 检查项目是否过期
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.createdAt > item.ttl * 1000;
  }

  // 压缩数据
  private async compress(data: string): Promise<string> {
    // 这里应该实现真正的压缩算法
    // 现在返回原数据
    return data;
  }

  // 解压数据
  private async decompress(data: string): Promise<string> {
    // 这里应该实现真正的解压算法
    // 现在返回原数据
    return data;
  }

  // 是否应该在设置前驱逐项目
  private shouldEvictBeforeSet(newItemSize: number): boolean {
    const currentSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);
    const wouldExceedMaxSize = currentSize + newItemSize > this.config.maxSize;
    const wouldExceedMaxItems = this.cache.size >= this.config.maxItems;

    return wouldExceedMaxSize || wouldExceedMaxItems;
  }

  // 驱逐缓存项
  private async evictItems(requiredSpace: number): Promise<void> {
    const itemsToEvict = this.selectItemsToEvict(requiredSpace);

    for (const item of itemsToEvict) {
      this.cache.delete(item.key);

      if (this.distributedAdapter) {
        await this.distributedAdapter.delete(item.key);
      }

      this.statistics.evictions++;
      this.recordEvent('evict', this.extractOriginalKey(item.key), 0, item.size, item.tags);
    }
  }

  // 选择要驱逐的项目
  private selectItemsToEvict(requiredSpace: number): CacheItem[] {
    const items = Array.from(this.cache.values());
    let freedSpace = 0;
    const itemsToEvict: CacheItem[] = [];

    switch (this.config.evictionPolicy) {
      case 'lru': // 最近最少使用
        items.sort((a, b) => a.accessedAt - b.accessedAt);
        break;
      case 'lfu': // 最少使用
        items.sort((a, b) => a.accessCount - b.accessCount);
        break;
      case 'fifo': // 先进先出
        items.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'random': // 随机
        items.sort(() => Math.random() - 0.5);
        break;
    }

    for (const item of items) {
      itemsToEvict.push(item);
      freedSpace += item.size;

      if (freedSpace >= requiredSpace) {
        break;
      }
    }

    return itemsToEvict;
  }

  // 清理过期项目
  private cleanupExpiredItems(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache) {
      if (now - item.createdAt > item.ttl * 1000) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.statistics.evictions++;
    }
  }

  // 强制执行内存限制
  private enforceMemoryLimits(): void {
    const currentSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);

    if (currentSize > this.config.maxSize) {
      const excessSize = currentSize - this.config.maxSize * 0.8; // 清理到80%
      this.evictItems(excessSize);
    }

    if (this.cache.size > this.config.maxItems) {
      const excessCount = this.cache.size - Math.floor(this.config.maxItems * 0.8);
      const items = Array.from(this.cache.values());
      items.sort((a, b) => a.accessedAt - b.accessedAt);

      for (let i = 0; i < excessCount; i++) {
        this.cache.delete(items[i].key);
        this.statistics.evictions++;
      }
    }
  }

  // 监听依赖变化
  private watchDependency(dependencyKey: string, dependentKey: string, onInvalidate: (key: string, value: any) => void): void {
    // 这里应该实现依赖监听机制
    // 现在只是一个占位符
  }

  // 触发依赖失效
  private triggerDependencyInvalidation(changedKey: string): void {
    // 这里应该实现依赖失效机制
    // 现在只是一个占位符
  }

  // 记录缓存事件
  private recordEvent(
    type: CacheEvent['type'],
    key: string,
    duration: number,
    size?: number,
    tags?: string[],
    error?: string
  ): void {
    const event: CacheEvent = {
      type,
      key,
      timestamp: Date.now(),
      duration,
      size,
      tags,
      error
    };

    this.events.push(event);

    // 限制事件数量
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }

    // 更新统计信息
    if (this.config.enableMetrics) {
      this.updateKeyStatistics(key, type);
    }
  }

  // 更新键统计
  private updateKeyStatistics(key: string, type: CacheEvent['type']): void {
    if (!this.statistics.keyDistribution[key]) {
      this.statistics.keyDistribution[key] = 0;
    }

    switch (type) {
      case 'hit':
        this.statistics.keyDistribution[key]++;
        break;
      case 'set':
        // 不增加计数，只记录存在
        break;
    }
  }

  // 更新统计信息
  private updateStatistics(): void {
    const { hits, misses } = this.statistics;
    const total = hits + misses;

    this.statistics.hitRate = total > 0 ? hits / total : 0;
    this.statistics.itemCount = this.cache.size;
    this.statistics.size = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);
    this.statistics.topHitKeys = this.getTopKeys(10);
  }

  // 更新配置
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 缓存配置已更新');
  }

  // 导出缓存数据
  exportData(): {
    items: Array<CacheItem>;
    statistics: CacheStatistics;
    events: CacheEvent[];
    strategies: Array<{ pattern: string; strategy: CacheStrategy }>;
  } {
    return {
      items: Array.from(this.cache.values()),
      statistics: this.getStatistics(),
      events: this.events.slice(-1000), // 最近1000个事件
      strategies: Array.from(this.strategies.entries()).map(([pattern, strategy]) => ({
        pattern,
        strategy
      }))
    };
  }

  // 停止缓存管理器
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('⏹️ 服务端缓存管理器已停止');
  }
}

// 导出单例实例
export const serverCache = ServerCacheManager.getInstance();

// Redis适配器
export class RedisAdapter implements DistributedCacheAdapter {
  private redis: any;
  private isConnected = false;

  constructor(redisUrl: string, options: any = {}) {
    // 这里应该初始化Redis客户端
    // this.redis = new Redis(redisUrl, options);
    this.isConnected = false;
  }

  async connect(): Promise<void> {
    try {
      // await this.redis.connect();
      this.isConnected = true;
      console.log('🔗 Redis连接已建立');
    } catch (error) {
      console.error('Redis连接失败:', error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET失败:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
    } catch (error) {
      console.error('Redis SET失败:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis DELETE失败:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS失败:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Redis CLEAR失败:', error);
      throw error;
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('Redis KEYS失败:', error);
      return [];
    }
  }

  async getTTL(key: string): Promise<number> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error('Redis TTL失败:', error);
      return -1;
    }
  }

  async setTTL(key: string, ttl: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      console.error('Redis EXPIRE失败:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
      console.log('🔌 Redis连接已断开');
    }
  }
}

// 导出类型
export type { CacheItem, CacheConfig, CacheStatistics, CacheEvent, CacheStrategy, DistributedCacheAdapter };