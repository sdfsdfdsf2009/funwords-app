/**
 * 请求去重机制
 * 防止用户快速重复触发相同的请求，避免429错误
 */

export interface PendingRequest<T = any> {
  key: string
  promise: Promise<T>
  timestamp: number
  timeout?: NodeJS.Timeout
  abortController: AbortController
  metadata?: {
    url?: string
    method?: string
    userId?: string
    projectId?: string
  }
}

export interface DeduplicationConfig {
  timeout: number // 请求超时时间 (ms)
  maxPendingRequests: number // 最大并发请求数
  cleanupInterval: number // 清理间隔 (ms)
  keyGenerator?: (args: any[]) => string
  shouldDeduplicate?: (args: any[]) => boolean
}

export class RequestDeduplicator {
  private static instance: RequestDeduplicator
  private pendingRequests = new Map<string, PendingRequest>()
  private config: DeduplicationConfig
  private cleanupTimer?: NodeJS.Timeout

  private readonly DEFAULT_CONFIG: DeduplicationConfig = {
    timeout: 30000, // 30秒超时
    maxPendingRequests: 10,
    cleanupInterval: 60000, // 1分钟清理一次
    keyGenerator: (args: any[]) => {
      // 默认键生成器：基于参数的JSON字符串
      return JSON.stringify(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ))
    },
    shouldDeduplicate: (args: any[]) => {
      // 默认去重规则：检查是否有重复的项目ID和操作类型
      return args.some(arg =>
        typeof arg === 'object' &&
        (arg.projectId || arg.userId || arg.url)
      )
    }
  }

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.startCleanupTimer()
  }

  static getInstance(config?: Partial<DeduplicationConfig>): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator(config)
    }
    return RequestDeduplicator.instance
  }

  /**
   * 执行去重的请求
   */
  async execute<T>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    metadata?: PendingRequest['metadata']
  ): Promise<T> {
    // 检查是否已有相同的请求在进行中
    const existingRequest = this.pendingRequests.get(key)

    if (existingRequest) {
      console.warn(`Request deduplicated: ${key}`, {
        existingTime: Date.now() - existingRequest.timestamp,
        metadata
      })

      try {
        return await existingRequest.promise
      } catch (error) {
        // 如果现有请求失败，继续执行新请求
        this.pendingRequests.delete(key)
        throw error
      }
    }

    // 检查并发请求数量
    if (this.pendingRequests.size >= this.config.maxPendingRequests) {
      throw new Error(`请求过多：当前有 ${this.pendingRequests.size} 个并发请求，请等待部分请求完成后再试。

解决建议：
1. 等待当前请求完成
2. 分批处理操作
3. 检查是否有重复的标签页或窗口在执行相同操作`)
    }

    // 创建新的AbortController
    const abortController = new AbortController()

    // 创建新的请求Promise
    const promise = this.createRequestPromise(
      key,
      requestFn,
      abortController.signal,
      metadata
    )

    // 设置超时
    const timeout = setTimeout(() => {
      abortController.abort()
      this.pendingRequests.delete(key)
      console.warn(`Request timeout: ${key}`)
    }, this.config.timeout)

    // 存储请求信息
    const pendingRequest: PendingRequest<T> = {
      key,
      promise,
      timestamp: Date.now(),
      timeout,
      abortController,
      metadata
    }

    this.pendingRequests.set(key, pendingRequest)

    try {
      const result = await promise
      return result
    } finally {
      // 清理请求
      this.cleanupRequest(key)
    }
  }

  /**
   * 创建请求Promise
   */
  private async createRequestPromise<T>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    signal: AbortSignal,
    metadata?: PendingRequest['metadata']
  ): Promise<T> {
    try {
      console.debug(`Executing request: ${key}`, { metadata })
      const result = await requestFn(signal)
      console.debug(`Request completed: ${key}`, { metadata })
      return result
    } catch (error) {
      if (signal.aborted) {
        console.warn(`Request aborted: ${key}`, { metadata })
        throw new Error('请求被取消：超时或用户取消')
      }
      console.error(`Request failed: ${key}`, { error: error.message, metadata })
      throw error
    }
  }

  /**
   * 清理请求
   */
  private cleanupRequest(key: string): void {
    const request = this.pendingRequests.get(key)
    if (request) {
      if (request.timeout) {
        clearTimeout(request.timeout)
      }
      // 不需要调用abortController.abort()，因为请求已经完成
      this.pendingRequests.delete(key)
    }
  }

  /**
   * 取消请求
   */
  cancelRequest(key: string): boolean {
    const request = this.pendingRequests.get(key)
    if (request) {
      request.abortController.abort()
      this.cleanupRequest(key)
      return true
    }
    return false
  }

  /**
   * 取消所有请求
   */
  cancelAllRequests(): number {
    let cancelledCount = 0
    for (const key of this.pendingRequests.keys()) {
      if (this.cancelRequest(key)) {
        cancelledCount++
      }
    }
    return cancelledCount
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredRequests()
    }, this.config.cleanupInterval)
  }

  /**
   * 清理过期请求
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.config.timeout) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => {
      console.warn(`Cleaning up expired request: ${key}`)
      this.cancelRequest(key)
    })

    if (expiredKeys.length > 0) {
      console.info(`Cleaned up ${expiredKeys.length} expired requests`)
    }
  }

  /**
   * 获取状态信息
   */
  getStatus(): {
    pendingCount: number
    maxPendingRequests: number
    pendingRequests: Array<{
      key: string
      timestamp: number
      age: number
      metadata?: PendingRequest['metadata']
    }>
  } {
    const now = Date.now()
    const pendingRequests = Array.from(this.pendingRequests.values()).map(request => ({
      key: request.key,
      timestamp: request.timestamp,
      age: now - request.timestamp,
      metadata: request.metadata
    }))

    return {
      pendingCount: this.pendingRequests.size,
      maxPendingRequests: this.config.maxPendingRequests,
      pendingRequests
    }
  }

  /**
   * 生成请求键
   */
  generateKey(...args: any[]): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(args)
    }

    // 默认键生成逻辑
    return this.defaultKeyGenerator(args)
  }

  /**
   * 默认键生成器
   */
  private defaultKeyGenerator(args: any[]): string {
    const filteredArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // 提取关键字段用于生成键
        const keyFields = {}
        const importantFields = ['projectId', 'userId', 'url', 'method', 'sceneNumber', 'strategy']

        importantFields.forEach(field => {
          if (arg[field] !== undefined) {
            keyFields[field] = arg[field]
          }
        })

        return JSON.stringify(keyFields)
      }
      return String(arg)
    })

    return filteredArgs.join('|')
  }

  /**
   * 检查是否应该去重
   */
  shouldDeduplicate(...args: any[]): boolean {
    if (this.config.shouldDeduplicate) {
      return this.config.shouldDeduplicate(args)
    }

    // 默认去重逻辑：检查是否有重要的业务参数
    return args.some(arg =>
      typeof arg === 'object' &&
      arg !== null &&
      (arg.projectId || arg.userId || arg.url)
    )
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cancelAllRequests()
    this.pendingRequests.clear()
  }
}

// 创建默认实例
export const requestDeduplicator = RequestDeduplicator.getInstance()

// 便捷函数
export async function withDeduplication<T>(
  key: string,
  requestFn: (signal: AbortSignal) => Promise<T>,
  metadata?: PendingRequest['metadata']
): Promise<T> {
  return requestDeduplicator.execute(key, requestFn, metadata)
}

// 专门用于CSV导入的去重函数
export async function withCSVDeduplication<T>(
  projectId: string,
  operation: string,
  requestFn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const key = `csv-import:${projectId}:${operation}`
  return withDeduplication(key, requestFn, {
    projectId,
    url: '/api/scenes/batch-import',
    method: 'POST'
  })
}