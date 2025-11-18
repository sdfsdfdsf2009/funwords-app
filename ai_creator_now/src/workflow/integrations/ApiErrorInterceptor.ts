/**
 * API错误拦截器
 * 自动拦截和处理API调用中的错误
 */

import { workflowManager } from '../WorkflowManager';

export interface ApiErrorInterceptorConfig {
  enableAutomaticRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
  enableLogging?: boolean;
  sensitiveHeaders?: string[];
  ignoredErrors?: string[];
  timeoutThreshold?: number;
}

export interface ApiRequestConfig extends RequestInit {
  workflowContext?: any;
  skipWorkflow?: boolean;
  customErrorHandler?: (error: any) => void;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  url: string;
}

export class ApiErrorInterceptor {
  private static instance: ApiErrorInterceptor;
  private config: Required<ApiErrorInterceptorConfig>;
  private requestInterceptors: Array<(config: ApiRequestConfig) => ApiRequestConfig> = [];
  private responseInterceptors: Array<(response: Response) => Response> = [];
  private errorInterceptors: Array<(error: any) => any> = [];

  private constructor(config: ApiErrorInterceptorConfig = {}) {
    this.config = {
      enableAutomaticRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      retryCondition: this.defaultRetryCondition,
      enableLogging: true,
      sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
      ignoredErrors: [
        'AbortError',
        'NetworkError when attempting to fetch resource'
      ],
      timeoutThreshold: 30000,
      ...config
    };
  }

  public static getInstance(config?: ApiErrorInterceptorConfig): ApiErrorInterceptor {
    if (!ApiErrorInterceptor.instance) {
      ApiErrorInterceptor.instance = new ApiErrorInterceptor(config);
    }
    return ApiErrorInterceptor.instance;
  }

  /**
   * 拦截fetch请求
   */
  public async interceptFetch<T = any>(
    input: RequestInfo | URL,
    init?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';

    try {
      // 应用请求拦截器
      let processedInit = { ...init };
      for (const interceptor of this.requestInterceptors) {
        processedInit = interceptor(processedInit);
      }

      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.config.timeoutThreshold);

      const response = await fetch(input, {
        ...processedInit,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 应用响应拦截器
      let processedResponse = response;
      for (const interceptor of this.responseInterceptors) {
        processedResponse = interceptor(processedResponse);
      }

      // 检查响应状态
      if (!processedResponse.ok) {
        throw await this.createApiError(processedResponse, url, method, startTime);
      }

      // 解析响应数据
      const data = await this.parseResponse<T>(processedResponse);

      const responseTime = Date.now() - startTime;

      return {
        data,
        status: processedResponse.status,
        statusText: processedResponse.statusText,
        headers: processedResponse.headers,
        ok: processedResponse.ok,
        url: processedResponse.url
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 应用错误拦截器
      let processedError = error;
      for (const interceptor of this.errorInterceptors) {
        processedError = interceptor(processedError);
      }

      // 处理错误
      await this.handleApiError(processedError, url, method, responseTime, init);

      // 重新抛出错误
      throw processedError;
    }
  }

  /**
   * 创建增强的fetch函数
   */
  public createEnhancedFetch() {
    return <T = any>(input: RequestInfo | URL, init?: ApiRequestConfig) => {
      return this.interceptFetch<T>(input, init);
    };
  }

  /**
   * 添加请求拦截器
   */
  public addRequestInterceptor(interceptor: (config: ApiRequestConfig) => ApiRequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  public addResponseInterceptor(interceptor: (response: Response) => Response): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 添加错误拦截器
   */
  public addErrorInterceptor(interceptor: (error: any) => any): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * 处理API错误
   */
  private async handleApiError(
    error: any,
    url: string,
    method: string,
    responseTime: number,
    requestInit?: ApiRequestConfig
  ): Promise<void> {
    // 检查是否应该忽略此错误
    if (this.shouldIgnoreError(error)) {
      return;
    }

    // 检查是否应该自动重试
    if (this.shouldRetry(error) && requestInit && !requestInit.skipWorkflow) {
      const retryResult = await this.performRetry(() =>
        this.interceptFetch(url, requestInit)
      );

      if (retryResult.success) {
        return;
      }
    }

    // 构建错误信息
    const errorInfo = this.buildErrorInfo(error, url, method, responseTime, requestInit);

    // 记录错误
    if (this.config.enableLogging) {
      console.error('API Error:', errorInfo);
    }

    // 提交到工作流
    if (!requestInit?.skipWorkflow) {
      try {
        await workflowManager.handleError(errorInfo, requestInit?.workflowContext);
      } catch (workflowError) {
        console.error('Failed to submit API error to workflow:', workflowError);
      }
    }

    // 调用自定义错误处理器
    if (requestInit?.customErrorHandler) {
      try {
        requestInit.customErrorHandler(error);
      } catch (handlerError) {
        console.error('Custom error handler failed:', handlerError);
      }
    }
  }

  /**
   * 创建API错误对象
   */
  private async createApiError(
    response: Response,
    url: string,
    method: string,
    startTime: number
  ): Promise<any> {
    const responseTime = Date.now() - startTime;
    let errorData: any = {};

    try {
      errorData = await response.json();
    } catch {
      // 如果无法解析JSON，使用文本
      try {
        const text = await response.text();
        errorData = { message: text };
      } catch {
        errorData = { message: 'Unable to parse error response' };
      }
    }

    const error = new Error(`API ${method} ${url} failed: ${response.status} ${response.statusText}`);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).response = errorData;
    (error as any).url = url;
    (error as any).method = method;
    (error as any).responseTime = responseTime;

    return error;
  }

  /**
   * 解析响应数据
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text/')) {
      return response.text() as unknown as T;
    } else {
      return response.blob() as unknown as T;
    }
  }

  /**
   * 判断是否应该忽略错误
   */
  private shouldIgnoreError(error: any): boolean {
    return this.config.ignoredErrors.some(ignoredError =>
      error.message?.includes(ignoredError) ||
      error.name?.includes(ignoredError)
    );
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    return this.config.enableAutomaticRetry &&
           this.config.retryCondition(error) &&
           (error as any).retryCount < this.config.maxRetries;
  }

  /**
   * 默认重试条件
   */
  private defaultRetryCondition(error: any): boolean {
    const status = (error as any).status;

    // 重试网络错误和5xx错误
    return !status || // 网络错误
           status >= 500 || // 服务器错误
           status === 429 || // 限流
           status === 408;   // 超时
  }

  /**
   * 执行重试
   */
  private async performRetry<T>(
    requestFn: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: any }> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // 指数退避延迟
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        const result = await requestFn();
        return { success: true, result };

      } catch (error) {
        lastError = error;
        (error as any).retryCount = attempt;

        if (this.config.enableLogging) {
          console.warn(`API retry attempt ${attempt} failed:`, error);
        }
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * 构建错误信息
   */
  private buildErrorInfo(
    error: any,
    url: string,
    method: string,
    responseTime: number,
    requestInit?: ApiRequestConfig
  ): any {
    const headers: Record<string, string> = {};

    // 收集请求头（排除敏感信息）
    if (requestInit?.headers) {
      const headersObj = requestInit.headers as Record<string, string>;
      for (const [key, value] of Object.entries(headersObj)) {
        if (!this.config.sensitiveHeaders.includes(key.toLowerCase())) {
          headers[key] = value;
        }
      }
    }

    return {
      type: 'api',
      message: error.message || 'Unknown API error',
      status: (error as any).status,
      statusText: (error as any).statusText,
      url,
      method,
      responseTime,
      headers,
      timestamp: new Date(),
      source: 'ApiErrorInterceptor',
      context: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        retryCount: (error as any).retryCount || 0,
        requestSize: requestInit?.body ? JSON.stringify(requestInit.body).length : 0,
        workflowContext: requestInit?.workflowContext
      },
      stack: error.stack
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<ApiErrorInterceptorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  public getConfig(): Required<ApiErrorInterceptorConfig> {
    return { ...this.config };
  }
}

// 创建默认实例
export const apiErrorInterceptor = ApiErrorInterceptor.getInstance();

// 便捷的fetch函数
export const enhancedFetch = apiErrorInterceptor.createEnhancedFetch();

// Hook for React组件
export function useApiErrorInterceptor() {
  const [errors, setErrors] = React.useState<any[]>([]);

  const addErrorInterceptor = React.useCallback((handler: (error: any) => void) => {
    const interceptor = (error: any) => {
      setErrors(prev => [...prev.slice(-4), error]); // 保留最新5个错误
      handler(error);
      return error;
    };

    apiErrorInterceptor.addErrorInterceptor(interceptor);

    return () => {
      // 注意：这里没有提供移除拦截器的方法，因为实现比较复杂
      // 在实际使用中，你可能想要维护拦截器的引用
    };
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    clearErrors,
    addErrorInterceptor,
    fetch: enhancedFetch
  };
}

// 导出默认实例
export default apiErrorInterceptor;