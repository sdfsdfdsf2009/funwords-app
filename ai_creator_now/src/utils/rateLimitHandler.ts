/**
 * 智能速率限制处理和重试机制
 * 专门解决HTTP 429 "Too Many Requests" 错误
 */

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  jitter: boolean
  retryableErrors: string[]
  retryableStatusCodes: number[]
}

export interface RateLimitInfo {
  isRateLimited: boolean
  retryAfter?: number
  limit?: number
  remaining?: number
  resetTime?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface RequestMetadata {
  url: string
  method: string
  timestamp: number
  retryCount: number
  lastRetryTime?: number
}

export class RateLimitHandler {
  private static instance: RateLimitHandler
  private requestCache = new Map<string, RequestMetadata>()
  private rateLimitHistory: Array<{ timestamp: number; severity: RateLimitInfo['severity'] }> = []

  private readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 5,
    baseDelay: 2000, // 增加到2秒基础延迟
    maxDelay: 60000, // 最大60秒
    backoffFactor: 2.5, // 更保守的退避因子
    jitter: true, // 添加随机抖动避免雷群效应
    retryableErrors: [
      'Too Many Requests',
      'rate limit',
      'rate_limit_exceeded',
      '429',
      'quota exceeded',
      'throttled'
    ],
    retryableStatusCodes: [429, 502, 503, 504, 520, 521, 522, 523, 524]
  }

  static getInstance(): RateLimitHandler {
    if (!RateLimitHandler.instance) {
      RateLimitHandler.instance = new RateLimitHandler()
    }
    return RateLimitHandler.instance
  }

  /**
   * 检测响应是否包含速率限制信息
   */
  analyzeRateLimit(response: Response): RateLimitInfo {
    const rateLimitInfo: RateLimitInfo = {
      isRateLimited: false,
      severity: 'low'
    }

    // 检查状态码
    if (response.status === 429) {
      rateLimitInfo.isRateLimited = true
      rateLimitInfo.severity = 'high'
    }

    // 解析速率限制头部
    const retryAfter = response.headers.get('Retry-After')
    const limit = response.headers.get('X-RateLimit-Limit') || response.headers.get('RateLimit-Limit')
    const remaining = response.headers.get('X-RateLimit-Remaining') || response.headers.get('RateLimit-Remaining')
    const resetTime = response.headers.get('X-RateLimit-Reset') || response.headers.get('RateLimit-Reset')

    if (retryAfter) {
      const retryAfterSeconds = parseInt(retryAfter)
      if (!isNaN(retryAfterSeconds)) {
        rateLimitInfo.retryAfter = retryAfterSeconds * 1000 // 转换为毫秒
        if (retryAfterSeconds > 300) { // 超过5分钟
          rateLimitInfo.severity = 'critical'
        } else if (retryAfterSeconds > 60) { // 超过1分钟
          rateLimitInfo.severity = 'high'
        }
      }
    }

    if (limit) {
      rateLimitInfo.limit = parseInt(limit)
    }

    if (remaining) {
      rateLimitInfo.remaining = parseInt(remaining)
      // 根据剩余请求数判断严重程度
      const remainingNum = rateLimitInfo.remaining
      const limitNum = rateLimitInfo.limit

      if (limitNum && remainingNum !== undefined) {
        const ratio = remainingNum / limitNum
        if (ratio < 0.1) {
          rateLimitInfo.severity = 'critical'
        } else if (ratio < 0.3) {
          rateLimitInfo.severity = 'high'
        } else if (ratio < 0.6) {
          rateLimitInfo.severity = 'medium'
        }
      }
    }

    if (resetTime) {
      rateLimitInfo.resetTime = parseInt(resetTime) * 1000
    }

    // 记录速率限制历史
    if (rateLimitInfo.isRateLimited) {
      this.recordRateLimitEvent(rateLimitInfo.severity)
    }

    return rateLimitInfo
  }

  /**
   * 检查请求是否应该被阻止（基于历史速率限制）
   */
  shouldBlockRequest(url: string): boolean {
    const key = this.getRequestKey(url)
    const now = Date.now()

    // 检查最近的速率限制事件
    const recentEvents = this.rateLimitHistory.filter(
      event => now - event.timestamp < 300000 // 5分钟内
    )

    // 如果最近有多个严重事件，阻止请求
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length
    const highEvents = recentEvents.filter(e => e.severity === 'high').length

    if (criticalEvents >= 2 || highEvents >= 3) {
      return true
    }

    // 检查相同URL的请求频率
    const cached = this.requestCache.get(key)
    if (cached) {
      const timeSinceLastRequest = now - cached.timestamp
      const timeSinceLastRetry = cached.lastRetryTime ? now - cached.lastRetryTime : Infinity

      // 如果请求过于频繁，阻止
      if (timeSinceLastRequest < 1000 || timeSinceLastRetry < 5000) {
        return true
      }
    }

    return false
  }

  /**
   * 记录请求元数据
   */
  recordRequest(url: string, method: string = 'GET'): void {
    const key = this.getRequestKey(url, method)
    const now = Date.now()

    this.requestCache.set(key, {
      url,
      method,
      timestamp: now,
      retryCount: 0
    })

    // 清理过期的缓存条目
    this.cleanupCache()
  }

  /**
   * 计算智能重试延迟
   */
  calculateRetryDelay(
    retryCount: number,
    rateLimitInfo: RateLimitInfo,
    config: Partial<RetryConfig> = {}
  ): number {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }

    // 如果有服务器指定的Retry-After，优先使用
    if (rateLimitInfo.retryAfter) {
      const serverDelay = rateLimitInfo.retryAfter
      const adjustedDelay = Math.min(serverDelay * 1.2, finalConfig.maxDelay) // 增加20%缓冲
      return this.addJitter(adjustedDelay, finalConfig.jitter)
    }

    // 基于严重程度调整延迟
    let severityMultiplier = 1
    switch (rateLimitInfo.severity) {
      case 'critical':
        severityMultiplier = 4
        break
      case 'high':
        severityMultiplier = 2.5
        break
      case 'medium':
        severityMultiplier = 1.5
        break
    }

    // 指数退避计算
    const exponentialDelay = Math.min(
      finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, retryCount) * severityMultiplier,
      finalConfig.maxDelay
    )

    return this.addJitter(exponentialDelay, finalConfig.jitter)
  }

  /**
   * 执行智能重试
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    let lastError: Error

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const result = await requestFn()

        // 如果成功，清除请求缓存
        this.clearRequestCache()
        return result

      } catch (error) {
        lastError = error

        // 检查是否是可重试的错误
        if (!this.isRetryableError(error, finalConfig)) {
          throw error
        }

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === finalConfig.maxRetries) {
          throw this.enhanceRateLimitError(error, attempt, finalConfig)
        }

        // 分析速率限制信息
        let rateLimitInfo: RateLimitInfo = { isRateLimited: false, severity: 'low' }

        if (error.response) {
          rateLimitInfo = this.analyzeRateLimit(error.response)
        } else if (this.isRateLimitError(error)) {
          rateLimitInfo = {
            isRateLimited: true,
            severity: 'medium'
          }
        }

        // 计算重试延迟
        const delay = this.calculateRetryDelay(attempt, rateLimitInfo, finalConfig)

        console.warn(`Request failed (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}), retrying in ${Math.round(delay)}ms`, {
          error: error.message,
          rateLimitInfo,
          willRetry: true
        })

        // 等待后重试
        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  /**
   * 检查错误是否可重试
   */
  private isRetryableError(error: any, config: RetryConfig): boolean {
    // 检查状态码
    if (error.response?.status) {
      return config.retryableStatusCodes.includes(error.response.status)
    }

    // 检查错误消息
    const errorMessage = error.message?.toLowerCase() || ''
    return config.retryableErrors.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    )
  }

  /**
   * 检查是否是速率限制错误
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || ''
    const rateLimitPatterns = [
      'too many requests',
      'rate limit',
      'rate_limit_exceeded',
      '429',
      'quota exceeded',
      'throttled',
      'api rate limit',
      'frequency limit'
    ]

    return rateLimitPatterns.some(pattern => errorMessage.includes(pattern))
  }

  /**
   * 增强错误信息
   */
  private enhanceRateLimitError(error: any, attemptCount: number, config: RetryConfig): Error {
    const baseMessage = error.message || '请求失败'

    if (this.isRateLimitError(error)) {
      const enhancedMessage = `请求频率过高：${baseMessage}

解决建议：
1. 等待 ${Math.round(config.maxDelay / 1000)} 秒后重试
2. 减少并发请求数量
3. 分批处理大量数据
4. 检查是否有其他程序在同时发送请求

已重试 ${attemptCount} 次，建议稍后再试。`

      return new Error(enhancedMessage)
    }

    return error
  }

  /**
   * 添加随机抖动
   */
  private addJitter(delay: number, enabled: boolean): number {
    if (!enabled) return delay

    // 添加±25%的随机抖动
    const jitterFactor = 0.25
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1)
    return Math.max(0, delay + jitter)
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取请求键
   */
  private getRequestKey(url: string, method: string = 'GET'): string {
    return `${method}:${url}`
  }

  /**
   * 记录速率限制事件
   */
  private recordRateLimitEvent(severity: RateLimitInfo['severity']): void {
    this.rateLimitHistory.push({
      timestamp: Date.now(),
      severity
    })

    // 保持历史记录在合理范围内
    if (this.rateLimitHistory.length > 100) {
      this.rateLimitHistory = this.rateLimitHistory.slice(-50)
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now()
    const maxAge = 300000 // 5分钟

    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.requestCache.delete(key)
      }
    }
  }

  /**
   * 清除请求缓存
   */
  private clearRequestCache(): void {
    this.requestCache.clear()
  }

  /**
   * 获取速率限制统计
   */
  getRateLimitStats(): {
    totalEvents: number
    recentEvents: number
    severityBreakdown: Record<RateLimitInfo['severity'], number>
    activeRequests: number
  } {
    const now = Date.now()
    const recentEvents = this.rateLimitHistory.filter(
      event => now - event.timestamp < 300000 // 5分钟内
    )

    const severityBreakdown = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1
      return acc
    }, {} as Record<RateLimitInfo['severity'], number>)

    return {
      totalEvents: this.rateLimitHistory.length,
      recentEvents: recentEvents.length,
      severityBreakdown,
      activeRequests: this.requestCache.size
    }
  }
}

// 导出单例实例
export const rateLimitHandler = RateLimitHandler.getInstance()

// 导出便捷函数
export async function withRateLimitRetry<T>(
  requestFn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  return rateLimitHandler.executeWithRetry(requestFn, config)
}