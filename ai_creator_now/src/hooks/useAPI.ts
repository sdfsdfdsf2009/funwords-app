import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, APIResponse, APIError } from '../services/apiServiceEnhanced';
import { errorMonitor } from '../utils/errorMonitor';

// Hook状态接口
interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: APIError | null;
  lastUpdated: Date | null;
  requestCount: number;
}

// Hook选项接口
interface UseAPIOptions<T> {
  immediate?: boolean;
  cache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  timeout?: number;
  retries?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: APIError) => void;
  retry?: boolean;
  retryDelay?: number;
}

/**
 * 通用API Hook
 */
export function useAPI<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  options: UseAPIOptions<T> = {}
) {
  const {
    immediate = false,
    cache = false,
    cacheKey,
    cacheTTL,
    timeout,
    retries,
    onSuccess,
    onError,
    retry: autoRetry = true,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<APIState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    requestCount: 0
  });

  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const lastRequestRef = useRef<{
    url: string;
    method: string;
    body?: any;
  } | null>(null);

  // 清理函数
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 安全的状态更新
  const safeSetState = useCallback((updates: Partial<APIState<T>>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // 执行API请求
  const execute = useCallback(async (
    requestUrl: string = url,
    requestMethod: string = method,
    requestBody: any = body
  ) => {
    try {
      safeSetState({
        loading: true,
        error: null
      });

      lastRequestRef.current = {
        url: requestUrl,
        method: requestMethod,
        body: requestBody
      };

      errorMonitor.logUserAction('api-hook', 'start', {
        url: requestUrl,
        method: requestMethod,
        hasBody: !!requestBody
      });

      let response: APIResponse<T>;

      switch (requestMethod) {
        case 'GET':
          response = await apiService.get<T>(requestUrl, {
            timeout,
            retries,
            cache,
            cacheKey,
            cacheTTL
          });
          break;
        case 'POST':
          response = await apiService.post<T>(requestUrl, requestBody, {
            timeout,
            retries
          });
          break;
        case 'PUT':
          response = await apiService.put<T>(requestUrl, requestBody, {
            timeout,
            retries
          });
          break;
        case 'DELETE':
          response = await apiService.delete<T>(requestUrl, {
            timeout,
            retries
          });
          break;
        case 'PATCH':
          response = await apiService.patch<T>(requestUrl, requestBody, {
            timeout,
            retries
          });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${requestMethod}`);
      }

      safeSetState({
        data: response.data,
        loading: false,
        lastUpdated: new Date(),
        requestCount: state.requestCount + 1
      });

      retryCountRef.current = 0;

      errorMonitor.logUserAction('api-hook', 'success', {
        url: requestUrl,
        method: requestMethod,
        status: response.status,
        cached: response.cached
      });

      if (onSuccess) {
        onSuccess(response.data);
      }

      return response.data;

    } catch (error) {
      const apiError = error as APIError;

      safeSetState({
        loading: false,
        error: apiError
      });

      errorMonitor.logUserAction('api-hook', 'error', {
        url: requestUrl,
        method: requestMethod,
        error: apiError.message,
        status: apiError.status,
        retryable: apiError.retryable
      });

      if (onError) {
        onError(apiError);
      }

      // 自动重试
      if (autoRetry && apiError.retryable && retryCountRef.current < 3) {
        retryCountRef.current++;

        errorMonitor.logUserAction('api-hook', 'auto-retry', {
          url: requestUrl,
          method: requestMethod,
          retryCount: retryCountRef.current,
          retryDelay: retryDelay * retryCountRef.current
        });

        setTimeout(() => {
          execute(requestUrl, requestMethod, requestBody);
        }, retryDelay * retryCountRef.current);
      }

      throw apiError;
    }
  }, [
    url, method, body,
    cache, cacheKey, cacheTTL,
    timeout, retries,
    onSuccess, onError,
    autoRetry, retryDelay,
    state.requestCount,
    safeSetState
  ]);

  // 手动重试
  const retry = useCallback(() => {
    if (lastRequestRef.current) {
      retryCountRef.current = 0;
      execute(
        lastRequestRef.current.url,
        lastRequestRef.current.method,
        lastRequestRef.current.body
      );
    }
  }, [execute]);

  // 重置状态
  const reset = useCallback(() => {
    safeSetState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
      requestCount: 0
    });
    retryCountRef.current = 0;
    lastRequestRef.current = null;
  }, [safeSetState]);

  // 立即执行
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // 只在immediate变化时执行

  return {
    ...state,
    execute,
    retry,
    reset,
    canRetry: state.error?.retryable || false,
    isRetryable: !!state.error?.retryable
  };
}

/**
 * 专门用于GET请求的Hook
 */
export function useGet<T = any>(url: string, options: UseAPIOptions<T> = {}) {
  return useAPI<T>(url, 'GET', undefined, options);
}

/**
 * 专门用于POST请求的Hook
 */
export function usePost<T = any>(
  url: string,
  body?: any,
  options: UseAPIOptions<T> = {}
) {
  const [postData, setPostData] = useState(body);
  const api = useAPI<T>(url, 'POST', postData, options);

  const executePost = useCallback((newBody?: any) => {
    if (newBody !== undefined) {
      setPostData(newBody);
    }
    return api.execute(url, 'POST', newBody || postData);
  }, [api, url, postData]);

  return {
    ...api,
    execute: executePost,
    setPostData
  };
}

/**
 * 专门用于PUT请求的Hook
 */
export function usePut<T = any>(
  url: string,
  body?: any,
  options: UseAPIOptions<T> = {}
) {
  const [putData, setPutData] = useState(body);
  const api = useAPI<T>(url, 'PUT', putData, options);

  const executePut = useCallback((newBody?: any) => {
    if (newBody !== undefined) {
      setPutData(newBody);
    }
    return api.execute(url, 'PUT', newBody || putData);
  }, [api, url, putData]);

  return {
    ...api,
    execute: executePut,
    setPutData
  };
}

/**
 * 专门用于DELETE请求的Hook
 */
export function useDelete<T = any>(url: string, options: UseAPIOptions<T> = {}) {
  return useAPI<T>(url, 'DELETE', undefined, options);
}

/**
 * 批量API请求Hook
 */
export function useBatchAPI<T = any>(
  requests: Array<{ id: string; url: string; method: string; body?: any }>,
  options: {
    concurrency?: number;
    failFast?: boolean;
    immediate?: boolean;
  } = {}
) {
  const [state, setState] = useState<{
    loading: boolean;
    results: Array<{ id: string; response?: APIResponse<T>; error?: Error }>;
    error: Error | null;
  }>({
    loading: false,
    results: [],
    error: null
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((updates: Partial<typeof state>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const execute = useCallback(async () => {
    try {
      safeSetState({
        loading: true,
        error: null,
        results: []
      });

      errorMonitor.logUserAction('batch-api', 'start', {
        requestCount: requests.length,
        concurrency: options.concurrency
      });

      const batchRequests = requests.map(req => ({
        id: req.id,
        url: req.url,
        method: req.method as any,
        body: req.body
      }));

      const results = await apiService.batch<T>(batchRequests, {
        concurrency: options.concurrency,
        failFast: options.failFast
      });

      safeSetState({
        loading: false,
        results
      });

      errorMonitor.logUserAction('batch-api', 'success', {
        requestCount: requests.length,
        successCount: results.filter(r => r.response).length,
        errorCount: results.filter(r => r.error).length
      });

      return results;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      safeSetState({
        loading: false,
        error: errorObj
      });

      errorMonitor.logUserAction('batch-api', 'error', {
        error: errorObj.message,
        requestCount: requests.length
      });

      throw errorObj;
    }
  }, [requests, options.concurrency, options.failFast, safeSetState]);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [options.immediate, execute]);

  return {
    ...state,
    execute,
    retry: execute,
    reset: () => safeSetState({
      loading: false,
      results: [],
      error: null
    })
  };
}

/**
 * 文件上传Hook
 */
export function useFileUpload<T = any>(
  url: string,
  options: {
    timeout?: number;
    retries?: number;
    fieldName?: string;
    onProgress?: (progress: number) => void;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [state, setState] = useState<{
    loading: boolean;
    progress: number;
    data: T | null;
    error: Error | null;
  }>({
    loading: false,
    progress: 0,
    data: null,
    error: null
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((updates: Partial<typeof state>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const upload = useCallback(async (
    file: File,
    metadata?: Record<string, any>
  ) => {
    try {
      safeSetState({
        loading: true,
        progress: 0,
        error: null
      });

      errorMonitor.logUserAction('file-upload', 'start', {
        url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const response = await apiService.upload<T>(url, file, {
        timeout: options.timeout,
        retries: options.retries,
        onProgress: (progress) => {
          safeSetState({ progress });
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        fieldName: options.fieldName,
        metadata
      });

      safeSetState({
        loading: false,
        data: response.data,
        progress: 100
      });

      errorMonitor.logUserAction('file-upload', 'success', {
        url,
        fileName: file.name,
        status: response.status
      });

      if (options.onSuccess) {
        options.onSuccess(response.data);
      }

      return response.data;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      safeSetState({
        loading: false,
        error: errorObj
      });

      errorMonitor.logUserAction('file-upload', 'error', {
        url,
        fileName: file.name,
        error: errorObj.message
      });

      if (options.onError) {
        options.onError(errorObj);
      }

      throw errorObj;
    }
  }, [url, options, safeSetState]);

  const reset = useCallback(() => {
    safeSetState({
      loading: false,
      progress: 0,
      data: null,
      error: null
    });
  }, [safeSetState]);

  return {
    ...state,
    upload,
    reset
  };
}

export default useAPI;