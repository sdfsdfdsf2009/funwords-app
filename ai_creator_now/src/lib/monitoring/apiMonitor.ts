// API性能数据接口
export interface ApiPerformanceData {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
  userAgent: string;
  error?: string;
  responseSize?: number;
  cacheHit?: boolean;
  retryCount?: number;
  endpoint?: string;
}

// API统计接口
export interface ApiStatistics {
  totalRequests: number;
  averageResponseTime: number;
  slowestRequest: { url: string; duration: number } | null;
  fastestRequest: { url: string; duration: number } | null;
  errorRate: number;
  mostAccessedEndpoint: { endpoint: string; count: number } | null;
  requestsByHour: { [hour: string]: number };
  requestsByStatus: { [status: number]: number };
  cacheHitRate: number;
}

// 性能阈值
const API_THRESHOLDS = {
  FAST_RESPONSE: 200, // 200ms
  SLOW_RESPONSE: 1000, // 1s
  VERY_SLOW_RESPONSE: 3000, // 3s
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_RETRY_COUNT: 3
} as const;

// API性能监控器
export class ApiPerformanceMonitor {
  private static instance: ApiPerformanceMonitor;
  private requestData: ApiPerformanceData[] = [];
  private reportCallbacks: ((data: ApiPerformanceData) => void)[] = [];
  private isEnabled = true;

  private constructor() {}

  static getInstance(): ApiPerformanceMonitor {
    if (!ApiPerformanceMonitor.instance) {
      ApiPerformanceMonitor.instance = new ApiPerformanceMonitor();
    }
    return ApiPerformanceMonitor.instance;
  }

  // 开始监控API请求
  startRequest(url: string, method: string, options?: RequestInit): string {
    if (!this.isEnabled) return '';

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 记录请求开始时间
    const startTime = performance.now();

    // 存储开始时间到临时存储
    (window as any).__apiMonitorStartTimes = (window as any).__apiMonitorStartTimes || {};
    (window as any).__apiMonitorStartTimes[requestId] = {
      url,
      method,
      startTime,
      options
    };

    return requestId;
  }

  // 结束监控API请求
  endRequest(requestId: string, response: Response, error?: Error): void {
    if (!this.isEnabled || !requestId) return;

    const startTimeData = (window as any).__apiMonitorStartTimes?.[requestId];
    if (!startTimeData) return;

    const endTime = performance.now();
    const duration = Math.round(endTime - startTimeData.startTime);

    // 获取响应大小
    let responseSize: number | undefined;
    try {
      const contentLength = response.headers.get('content-length');
      responseSize = contentLength ? parseInt(contentLength) : undefined;
    } catch {
      // 忽略错误
    }

    // 检查是否为缓存命中
    const cacheHit = this.isCacheHit(response);

    // 提取endpoint
    const endpoint = this.extractEndpoint(startTimeData.url);

    const data: ApiPerformanceData = {
      id: requestId,
      url: startTimeData.url,
      method: startTimeData.method,
      status: response.status,
      duration,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      error: error?.message,
      responseSize,
      cacheHit,
      endpoint
    };

    // 存储数据
    this.requestData.push(data);

    // 清理临时数据
    delete (window as any).__apiMonitorStartTimes[requestId];

    // 触发回调
    this.reportCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (callbackError) {
        console.error('API性能监控回调执行失败:', callbackError);
      }
    });

    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      this.logApiRequest(data);
    }

    // 异步发送到分析服务
    this.sendToAnalytics(data);
  }

  // 检查是否为缓存命中
  private isCacheHit(response: Response): boolean {
    // 检查常见的缓存指示器
    const cacheControl = response.headers.get('cache-control');
    const age = response.headers.get('age');
    const xCache = response.headers.get('x-cache');

    return !!(age && parseInt(age) > 0) ||
           xCache?.includes('HIT') ||
           cacheControl?.includes('max-age');
  }

  // 提取endpoint
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.pathname}${urlObj.search}`;
    } catch {
      return url;
    }
  }

  // API请求日志
  private logApiRequest(data: ApiPerformanceData): void {
    const statusEmoji = data.status >= 200 && data.status < 300 ? '✅' : '❌';
    const speedEmoji = data.duration < API_THRESHOLDS.FAST_RESPONSE ? '🚀' :
                      data.duration < API_THRESHOLDS.SLOW_RESPONSE ? '⚡' :
                      data.duration < API_THRESHOLDS.VERY_SLOW_RESPONSE ? '🐌' : '🦕';

    let message = `${statusEmoji} ${speedEmoji} ${data.method} ${data.url} - ${data.duration}ms (${data.status})`;

    if (data.cacheHit) {
      message += ' 🗄️';
    }

    console.log(message);

    if (data.error) {
      console.error(`❌ API请求失败: ${data.error}`);
    }

    if (data.duration > API_THRESHOLDS.SLOW_RESPONSE) {
      console.warn(`⚠️ API响应慢: ${data.url} - ${data.duration}ms`);
    }
  }

  // 发送数据到分析服务
  private async sendToAnalytics(data: ApiPerformanceData): Promise<void> {
    // 临时禁用API性能日志以避免速率限制错误
    // try {
    //   // 发送到系统日志API
    //   await fetch('/api/system-logs', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       level: data.status >= 400 ? 'error' : 'info',
    //       message: `API Request: ${data.method} ${data.url} - ${data.duration}ms (${data.status})`,
    //       category: 'api_performance',
    //       metadata: {
    //         apiData: data,
    //         performanceImpact: this.calculatePerformanceImpact(data)
    //       }
    //     })
    //   });
    // } catch (error) {
    //   console.error('发送API性能数据失败:', error);
    // }
  }

  // 计算性能影响
  private calculatePerformanceImpact(data: ApiPerformanceData): 'low' | 'medium' | 'high' {
    if (data.duration < API_THRESHOLDS.FAST_RESPONSE) return 'low';
    if (data.duration < API_THRESHOLDS.SLOW_RESPONSE) return 'medium';
    return 'high';
  }

  // 添加报告回调
  onReport(callback: (data: ApiPerformanceData) => void): void {
    this.reportCallbacks.push(callback);
  }

  // 移除报告回调
  offReport(callback: (data: ApiPerformanceData) => void): void {
    const index = this.reportCallbacks.indexOf(callback);
    if (index > -1) {
      this.reportCallbacks.splice(index, 1);
    }
  }

  // 获取请求数据
  getRequestData(filter?: {
    endpoint?: string;
    method?: string;
    status?: number;
    since?: number;
  }): ApiPerformanceData[] {
    let data = [...this.requestData];

    if (filter) {
      if (filter.endpoint) {
        data = data.filter(item => item.endpoint === filter.endpoint);
      }
      if (filter.method) {
        data = data.filter(item => item.method === filter.method);
      }
      if (filter.status !== undefined) {
        data = data.filter(item => item.status === filter.status);
      }
      if (filter.since) {
        data = data.filter(item => item.timestamp >= filter.since);
      }
    }

    return data;
  }

  // 获取API统计
  getStatistics(filter?: {
    endpoint?: string;
    since?: number;
  }): ApiStatistics {
    let data = this.getRequestData(filter);

    if (data.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowestRequest: null,
        fastestRequest: null,
        errorRate: 0,
        mostAccessedEndpoint: null,
        requestsByHour: {},
        requestsByStatus: {},
        cacheHitRate: 0
      };
    }

    // 基础统计
    const totalRequests = data.length;
    const totalDuration = data.reduce((sum, item) => sum + item.duration, 0);
    const averageResponseTime = totalDuration / totalRequests;

    // 最慢和最快请求
    const slowestRequest = data.reduce((slowest, item) =>
      item.duration > slowest.duration ? item : slowest
    );
    const fastestRequest = data.reduce((fastest, item) =>
      item.duration < fastest.duration ? item : fastest
    );

    // 错误率
    const errorCount = data.filter(item => item.status >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    // 最常访问的endpoint
    const endpointCounts = data.reduce((counts, item) => {
      const endpoint = item.endpoint || item.url;
      counts[endpoint] = (counts[endpoint] || 0) + 1;
      return counts;
    }, {} as { [key: string]: number });

    const mostAccessedEndpoint = Object.entries(endpointCounts)
      .reduce((most, [endpoint, count]) =>
        count > most.count ? { endpoint, count } : most,
        { endpoint: '', count: 0 }
      );

    // 按小时统计
    const requestsByHour = data.reduce((hours, item) => {
      const hour = new Date(item.timestamp).getHours();
      const key = `${hour}:00`;
      hours[key] = (hours[key] || 0) + 1;
      return hours;
    }, {} as { [key: string]: number });

    // 按状态码统计
    const requestsByStatus = data.reduce((statuses, item) => {
      statuses[item.status] = (statuses[item.status] || 0) + 1;
      return statuses;
    }, {} as { [key: number]: number });

    // 缓存命中率
    const cacheHits = data.filter(item => item.cacheHit).length;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowestRequest: {
        url: slowestRequest.url,
        duration: slowestRequest.duration
      },
      fastestRequest: {
        url: fastestRequest.url,
        duration: fastestRequest.duration
      },
      errorRate: Math.round(errorRate * 100) / 100,
      mostAccessedEndpoint: mostAccessedEndpoint.count > 0 ? mostAccessedEndpoint : null,
      requestsByHour,
      requestsByStatus,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }

  // 获取性能报告
  getPerformanceReport(): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
    stats: ApiStatistics;
    recommendations: string[];
    issues: Array<{
      type: 'slow_response' | 'high_error_rate' | 'large_response' | 'cache_miss';
      severity: 'low' | 'medium' | 'high';
      description: string;
      count: number;
    }>;
  } {
    const stats = this.getStatistics();
    let score = 100;
    const recommendations: string[] = [];
    const issues: Array<{
      type: 'slow_response' | 'high_error_rate' | 'large_response' | 'cache_miss';
      severity: 'low' | 'medium' | 'high';
      description: string;
      count: number;
    }> = [];

    // 慢响应分析
    const slowRequests = this.getRequestData().filter(item =>
      item.duration > API_THRESHOLDS.SLOW_RESPONSE
    );
    if (slowRequests.length > 0) {
      score -= Math.min(30, slowRequests.length * 5);
      issues.push({
        type: 'slow_response',
        severity: slowRequests.length > 5 ? 'high' : 'medium',
        description: `${slowRequests.length}个API请求响应慢`,
        count: slowRequests.length
      });
      recommendations.push('优化API响应时间，考虑添加缓存或优化数据库查询');
    }

    // 错误率分析
    if (stats.errorRate > 5) {
      score -= Math.min(25, stats.errorRate * 2);
      issues.push({
        type: 'high_error_rate',
        severity: stats.errorRate > 20 ? 'high' : 'medium',
        description: `API错误率过高: ${stats.errorRate}%`,
        count: Math.round(stats.errorRate * stats.totalRequests / 100)
      });
      recommendations.push('检查API错误，改进错误处理和验证逻辑');
    }

    // 缓存命中率分析
    if (stats.cacheHitRate < 50 && stats.totalRequests > 10) {
      score -= 10;
      issues.push({
        type: 'cache_miss',
        severity: 'low',
        description: `缓存命中率较低: ${stats.cacheHitRate}%`,
        count: stats.totalRequests
      });
      recommendations.push('考虑实现API缓存策略以提高性能');
    }

    // 大响应分析
    const largeResponses = this.getRequestData().filter(item =>
      item.responseSize && item.responseSize > API_THRESHOLDS.MAX_RESPONSE_SIZE
    );
    if (largeResponses.length > 0) {
      score -= largeResponses.length * 3;
      issues.push({
        type: 'large_response',
        severity: 'medium',
        description: `${largeResponses.length}个API响应过大`,
        count: largeResponses.length
      });
      recommendations.push('优化API响应大小，考虑分页或数据压缩');
    }

    // 生成评级
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    // 生成通用建议
    if (recommendations.length === 0) {
      recommendations.push('API性能表现优秀！');
    }

    return {
      grade,
      score: Math.max(0, score),
      stats,
      recommendations: [...new Set(recommendations)],
      issues
    };
  }

  // 清除数据
  clearData(): void {
    this.requestData = [];
    if (typeof window !== 'undefined') {
      (window as any).__apiMonitorStartTimes = {};
    }
  }

  // 启用/禁用监控
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // 导出数据
  exportData(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      data: this.requestData,
      stats: this.getStatistics()
    }, null, 2);
  }
}

// 导出单例实例
export const apiMonitor = ApiPerformanceMonitor.getInstance();

// fetch包装器
export function monitoredFetch(url: string, options?: RequestInit): Promise<Response> {
  const requestId = apiMonitor.startRequest(url, options?.method || 'GET', options);

  return fetch(url, options)
    .then(response => {
      apiMonitor.endRequest(requestId, response);
      return response;
    })
    .catch(error => {
      apiMonitor.endRequest(requestId, new Response('', { status: 0 }), error);
      throw error;
    });
}

// 自动初始化
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 API性能监控已启用');

  // 清理初始化
  (window as any).__apiMonitorStartTimes = {};
}

export default apiMonitor;