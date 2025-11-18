import { errorMonitor } from '../utils/errorMonitor';

// API请求配置接口
interface APIRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheKey?: string;
}

// API响应接口
interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cached?: boolean;
}

// API错误接口
interface APIError extends Error {
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
  retryable?: boolean;
  timeout?: boolean;
}

/**
 * 增强版API服务
 * 提供重试机制、超时处理、缓存、错误分类等功能
 */
export class EnhancedAPIService {
  private static instance: EnhancedAPIService;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTimeout = 30000; // 30秒
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1秒

  private constructor() {}

  static getInstance(): EnhancedAPIService {
    if (!EnhancedAPIService.instance) {
      EnhancedAPIService.instance = new EnhancedAPIService();
    }
    return EnhancedAPIService.instance;
  }

  /**
   * 创建API错误
   */
  private createAPIError(
    message: string,
    status?: number,
    statusText?: string,
    url?: string,
    method?: string,
    retryable: boolean = false,
    timeout: boolean = false
  ): APIError {
    const error = new Error(message) as APIError;
    error.status = status;
    error.statusText = statusText;
    error.url = url;
    error.method = method;
    error.retryable = retryable;
    error.timeout = timeout;
    return error;
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(status: number, error: Error): boolean {
    // HTTP状态码判断
    if (status >= 500 || status === 408 || status === 429) {
      return true;
    }

    // 网络错误判断
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true;
    }

    // 特定错误消息判断
    const retryableMessages = [
      'network error',
      'timeout',
      'connection refused',
      'connection reset',
      'connection timeout',
      'read timeout',
      'socket timeout'
    ];

    return retryableMessages.some(msg =>
      error.message.toLowerCase().includes(msg)
    );
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    return baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 检查缓存
   */
  private checkCache<T>(cacheKey: string): T | null {
    this.cleanExpiredCache();
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    return null;
  }

  /**
   * 设置缓存
   */
  private setCache<T>(cacheKey: string, data: T, ttl: number = 300000): void { // 默认5分钟
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 增强版fetch请求
   */
  private async enhancedFetch(config: APIRequestConfig): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.defaultTimeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 主API请求方法
   */
  async request<T = any>(config: APIRequestConfig): Promise<APIResponse<T>> {
    const startTime = Date.now();
    const operationId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 记录请求开始
    errorMonitor.logUserAction('api-request', 'start', {
      operationId,
      url: config.url,
      method: config.method,
      timeout: config.timeout || this.defaultTimeout
    });

    // 检查缓存
    if (config.enableCache && config.cacheKey) {
      const cachedData = this.checkCache<T>(config.cacheKey);
      if (cachedData) {
        errorMonitor.logUserAction('api-request', 'cache-hit', {
          operationId,
          url: config.url,
          cacheKey: config.cacheKey
        });

        return {
          data: cachedData,
          status: 200,
          statusText: 'OK (Cached)',
          headers: {},
          cached: true
        };
      }
    }

    let lastError: Error | null = null;
    const maxRetries = config.retries ?? this.maxRetries;
    const baseDelay = config.retryDelay ?? this.baseRetryDelay;

    // 重试循环
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.enhancedFetch(config);
        const duration = Date.now() - startTime;

        // 检查响应状态
        if (!response.ok) {
          const isRetryable = this.isRetryableError(response.status, new Error(response.statusText));

          if (attempt < maxRetries && isRetryable) {
            const retryDelay = this.calculateRetryDelay(attempt, baseDelay);

            errorMonitor.logUserAction('api-request', 'retry', {
              operationId,
              url: config.url,
              method: config.method,
              status: response.status,
              attempt: attempt + 1,
              maxRetries: maxRetries + 1,
              retryDelay
            });

            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }

          const error = this.createAPIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.statusText,
            config.url,
            config.method,
            false,
            false
          );

          // 记录API错误
          errorMonitor.logApiError(
            config.url,
            config.method,
            response.status,
            response.statusText,
            { operationId, attempt, duration }
          );

          throw error;
        }

        // 解析响应
        const contentType = response.headers.get('content-type');
        let data: T;

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }

        // 缓存响应
        if (config.enableCache && config.cacheKey && response.ok) {
          this.setCache(config.cacheKey, data);
        }

        // 记录成功
        errorMonitor.logUserAction('api-request', 'success', {
          operationId,
          url: config.url,
          method: config.method,
          status: response.status,
          duration,
          attempt: attempt + 1,
          cached: false
        });

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          cached: false
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const duration = Date.now() - startTime;

        // 判断是否可重试
        if (attempt < maxRetries) {
          const isRetryable = lastError.name === 'AbortError' ||
                            this.isRetryableError(0, lastError);

          if (isRetryable) {
            const retryDelay = this.calculateRetryDelay(attempt, baseDelay);

            errorMonitor.logUserAction('api-request', 'retry', {
              operationId,
              url: config.url,
              method: config.method,
              error: lastError.message,
              attempt: attempt + 1,
              maxRetries: maxRetries + 1,
              retryDelay,
              duration
            });

            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }

        // 记录失败
        errorMonitor.logUserAction('api-request', 'error', {
          operationId,
          url: config.url,
          method: config.method,
          error: lastError.message,
          attempt: attempt + 1,
          duration
        });

        // 记录API错误
        errorMonitor.logApiError(
          config.url,
          config.method,
          0,
          lastError.message,
          {
            operationId,
            attempt,
            duration,
            errorType: lastError.name,
            isTimeout: lastError.name === 'AbortError'
          }
        );

        throw lastError;
      }
    }

    // 如果所有重试都失败了，抛出最后一个错误
    throw lastError;
  }

  /**
   * GET请求
   */
  async get<T = any>(
    url: string,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
      cache?: boolean;
      cacheKey?: string;
      cacheTTL?: number;
    } = {}
  ): Promise<APIResponse<T>> {
    const config: APIRequestConfig = {
      url,
      method: 'GET',
      headers: options.headers,
      timeout: options.timeout,
      retries: options.retries,
      enableCache: options.cache,
      cacheKey: options.cacheKey || url
    };

    const response = await this.request<T>(config);

    // 自定义缓存TTL
    if (options.cache && options.cacheTTL && options.cacheKey) {
      this.setCache(options.cacheKey, response.data, options.cacheTTL);
    }

    return response;
  }

  /**
   * POST请求
   */
  async post<T = any>(
    url: string,
    body?: any,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<APIResponse<T>> {
    const config: APIRequestConfig = {
      url,
      method: 'POST',
      headers: options.headers,
      body,
      timeout: options.timeout,
      retries: options.retries
    };

    return this.request<T>(config);
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    url: string,
    body?: any,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<APIResponse<T>> {
    const config: APIRequestConfig = {
      url,
      method: 'PUT',
      headers: options.headers,
      body,
      timeout: options.timeout,
      retries: options.retries
    };

    return this.request<T>(config);
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    url: string,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<APIResponse<T>> {
    const config: APIRequestConfig = {
      url,
      method: 'DELETE',
      headers: options.headers,
      timeout: options.timeout,
      retries: options.retries
    };

    return this.request<T>(config);
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<APIResponse<T>> {
    const config: APIRequestConfig = {
      url,
      method: 'PATCH',
      headers: options.headers,
      body,
      timeout: options.timeout,
      retries: options.retries
    };

    return this.request<T>(config);
  }

  /**
   * 文件上传
   */
  async upload<T = any>(
    url: string,
    file: File,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
      onProgress?: (progress: number) => void;
      fieldName?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<APIResponse<T>> {
    const formData = new FormData();
    formData.append(options.fieldName || 'file', file);

    // 添加元数据
    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        formData.append(key, JSON.stringify(value));
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultTimeout);

    try {
      const xhr = new XMLHttpRequest();

      // 设置上传进度回调
      if (options.onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            options.onProgress!(progress);
          }
        });
      }

      return new Promise((resolve, reject) => {
        xhr.open('POST', url);

        // 设置请求头
        if (options.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }

        xhr.onload = () => {
          clearTimeout(timeoutId);

          if (xhr.status >= 200 && xhr.status < 300) {
            let data: T;
            try {
              data = JSON.parse(xhr.responseText);
            } catch {
              data = xhr.responseText as unknown as T;
            }

            resolve({
              data,
              status: xhr.status,
              statusText: xhr.statusText,
              headers: {}
            });
          } else {
            reject(this.createAPIError(
              `Upload failed: ${xhr.status} ${xhr.statusText}`,
              xhr.status,
              xhr.statusText,
              url,
              'POST'
            ));
          }
        };

        xhr.onerror = () => {
          clearTimeout(timeoutId);
          reject(this.createAPIError(
            'Upload failed: Network error',
            0,
            'Network Error',
            url,
            'POST',
            true
          ));
        };

        xhr.ontimeout = () => {
          clearTimeout(timeoutId);
          reject(this.createAPIError(
            'Upload failed: Timeout',
            0,
            'Timeout',
            url,
            'POST',
            false,
            true
          ));
        };

        xhr.send(formData);
      });

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 批量请求
   */
  async batch<T = any>(
    requests: Array<APIRequestConfig & { id: string }>,
    options: {
      concurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<Array<{ id: string; response?: APIResponse<T>; error?: Error }>> {
    const concurrency = options.concurrency || 5;
    const failFast = options.failFast || false;
    const results: Array<{ id: string; response?: APIResponse<T>; error?: Error }> = [];

    // 分批处理请求
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);

      const batchPromises = batch.map(async (request) => {
        try {
          const response = await this.request<T>(request);
          return { id: request.id, response };
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));

          if (failFast) {
            throw errorObj;
          }

          return { id: request.id, error: errorObj };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 如果是failFast模式且有错误，立即停止
      if (failFast && batchResults.some(result => result.error)) {
        break;
      }
    }

    return results;
  }

  /**
   * 健康检查
   */
  async healthCheck(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      const response = await this.get(url, { timeout, retries: 0 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * 清理缓存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    this.cleanExpiredCache();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 导出单例实例
export const apiService = EnhancedAPIService.getInstance();

// 导出类型
export type { APIRequestConfig, APIResponse, APIError };