/**
 * 错误分析器
 * 智能分析错误并提供分类和严重性评估
 */

import { ErrorPriority, ErrorCategory } from '../../utils/errorDebuggingWorkflow';
import { WorkflowEnvironment } from '../WorkflowConfig';

export interface ErrorAnalysis {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: ErrorCategory;
  priority: ErrorPriority;
  confidence: number; // 0-1, 分析的置信度
  tags: string[];
  suggestions: string[];
  context: any;
  reproducible: boolean;
  frequency: number;
  impact: {
    userExperience: 'none' | 'minor' | 'moderate' | 'severe';
    functionality: 'none' | 'partial' | 'significant' | 'complete';
    data: 'none' | 'corrupted' | 'lost' | 'critical';
  };
}

export interface AnalysisContext {
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
  environment?: string;
  customData?: any;
}

export class ErrorAnalyzer {
  private config: WorkflowEnvironment;
  private errorPatterns: Map<string, RegExp[]> = new Map();
  private frequencyTracker: Map<string, number[]> = new Map();

  constructor(config: WorkflowEnvironment) {
    this.config = config;
    this.initializePatterns();
  }

  /**
   * 分析错误
   */
  public async analyzeError(error: any, context?: AnalysisContext): Promise<ErrorAnalysis> {
    const analysis: ErrorAnalysis = {
      type: this.determineErrorType(error),
      severity: this.determineSeverity(error),
      category: this.determineCategory(error),
      priority: ErrorPriority.MEDIUM,
      confidence: this.calculateConfidence(error),
      tags: this.extractTags(error),
      suggestions: [],
      context: context || {},
      reproducible: this.assessReproducibility(error, context),
      frequency: this.getErrorFrequency(error),
      impact: this.assessImpact(error)
    };

    // 确定优先级
    analysis.priority = this.determinePriority(analysis.severity, analysis.impact, analysis.frequency);

    // 生成建议
    analysis.suggestions = this.generateSuggestions(analysis);

    return analysis;
  }

  /**
   * 确定错误类型
   */
  private determineErrorType(error: any): string {
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    // 网络错误
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }

    // API错误
    if (message.includes('api') || message.includes('http') || message.includes('status')) {
      return 'api';
    }

    // React错误
    if (stack.includes('react') || message.includes('component') || message.includes('render')) {
      return 'react';
    }

    // 状态管理错误
    if (message.includes('state') || message.includes('store') || message.includes('dispatch')) {
      return 'state';
    }

    // 类型错误
    if (message.includes('undefined') || message.includes('null') || message.includes('property')) {
      return 'type';
    }

    // 异步错误
    if (message.includes('promise') || message.includes('async') || message.includes('await')) {
      return 'async';
    }

    // 性能错误
    if (message.includes('timeout') || message.includes('slow') || message.includes('performance')) {
      return 'performance';
    }

    // 安全错误
    if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('csrf')) {
      return 'security';
    }

    // 数据错误
    if (message.includes('parse') || message.includes('json') || message.includes('format')) {
      return 'data';
    }

    return 'unknown';
  }

  /**
   * 确定严重程度
   */
  private determineSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    const message = (error.message || '').toLowerCase();
    const type = error.type || '';

    // 关键错误
    if (type === 'security' ||
        message.includes('crash') ||
        message.includes('fatal') ||
        message.includes('security') ||
        message.includes('unauthorized') ||
        message.includes('forbidden')) {
      return 'critical';
    }

    // 高严重性
    if (message.includes('cannot read') ||
        message.includes('undefined is not') ||
        message.includes('network error') ||
        message.includes('server error') ||
        type === 'react') {
      return 'high';
    }

    // 中等严重性
    if (message.includes('timeout') ||
        message.includes('slow') ||
        message.includes('warning') ||
        type === 'api' ||
        type === 'state') {
      return 'medium';
    }

    // 低严重性
    return 'low';
  }

  /**
   * 确定错误分类
   */
  private determineCategory(error: any): ErrorCategory {
    const type = this.determineErrorType(error);
    const message = (error.message || '').toLowerCase();

    const categoryMap: Record<string, ErrorCategory> = {
      'network': ErrorCategory.API_ERROR,
      'api': ErrorCategory.API_ERROR,
      'react': ErrorCategory.UI_ERROR,
      'state': ErrorCategory.LOGIC_ERROR,
      'type': ErrorCategory.UI_ERROR,
      'async': ErrorCategory.SYSTEM_ERROR,
      'performance': ErrorCategory.PERFORMANCE_ERROR,
      'security': ErrorCategory.SECURITY_ERROR,
      'data': ErrorCategory.DATA_ERROR,
      'unknown': ErrorCategory.SYSTEM_ERROR
    };

    // 根据消息内容进一步细化分类
    if (message.includes('storage') || message.includes('database')) {
      return ErrorCategory.DATA_ERROR;
    }

    if (message.includes('config') || message.includes('setting')) {
      return ErrorCategory.CONFIGURATION_ERROR;
    }

    return categoryMap[type] || ErrorCategory.SYSTEM_ERROR;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(error: any): number {
    let confidence = 0.5; // 基础置信度

    // 有详细错误信息
    if (error.message && error.message.length > 10) {
      confidence += 0.2;
    }

    // 有堆栈信息
    if (error.stack) {
      confidence += 0.2;
    }

    // 有明确的错误类型
    if (error.type && error.type !== 'unknown') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * 提取标签
   */
  private extractTags(error: any): string[] {
    const tags: string[] = [];
    const message = (error.message || '').toLowerCase();

    // 环境标签
    if (typeof window !== 'undefined') {
      tags.push('browser');
      if (window.location.protocol === 'https:') {
        tags.push('https');
      }
    } else {
      tags.push('server');
    }

    // 错误特征标签
    if (message.includes('async')) tags.push('async');
    if (message.includes('promise')) tags.push('promise');
    if (message.includes('callback')) tags.push('callback');
    if (message.includes('timeout')) tags.push('timeout');
    if (message.includes('memory')) tags.push('memory');
    if (message.includes('cors')) tags.push('cors');
    if (message.includes('chunk')) tags.push('chunk');

    // 用户代理标签
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('chrome')) tags.push('chrome');
      if (ua.includes('firefox')) tags.push('firefox');
      if (ua.includes('safari')) tags.push('safari');
      if (ua.includes('mobile')) tags.push('mobile');
    }

    return [...new Set(tags)]; // 去重
  }

  /**
   * 评估可重现性
   */
  private assessReproducibility(error: any, context?: AnalysisContext): boolean {
    // 有堆栈信息通常更容易重现
    if (error.stack) {
      return true;
    }

    // 有具体的用户操作上下文
    if (context?.customData?.userAction) {
      return true;
    }

    // 有明确的组件或文件信息
    if (error.source || error.component) {
      return true;
    }

    return false;
  }

  /**
   * 获取错误频率
   */
  private getErrorFrequency(error: any): number {
    const key = this.generateErrorKey(error);
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    if (!this.frequencyTracker.has(key)) {
      this.frequencyTracker.set(key, []);
    }

    const timestamps = this.frequencyTracker.get(key)!;
    timestamps.push(now);

    // 清理过期记录
    const recentTimestamps = timestamps.filter(time => time > oneHourAgo);
    this.frequencyTracker.set(key, recentTimestamps);

    return recentTimestamps.length;
  }

  /**
   * 评估影响
   */
  private assessImpact(error: any): ErrorAnalysis['impact'] {
    const message = (error.message || '').toLowerCase();
    const type = this.determineErrorType(error);

    // 用户体验影响
    let userExperience: ErrorAnalysis['impact']['userExperience'] = 'minor';
    if (type === 'react' || message.includes('crash') || message.includes('fatal')) {
      userExperience = 'severe';
    } else if (message.includes('cannot') || message.includes('undefined')) {
      userExperience = 'moderate';
    }

    // 功能影响
    let functionality: ErrorAnalysis['impact']['functionality'] = 'partial';
    if (type === 'api' || type === 'network') {
      functionality = 'significant';
    } else if (type === 'state' || type === 'security') {
      functionality = 'complete';
    }

    // 数据影响
    let data: ErrorAnalysis['impact']['data'] = 'none';
    if (message.includes('data') || message.includes('storage') || message.includes('database')) {
      data = 'corrupted';
    } else if (message.includes('lost') || message.includes('delete')) {
      data = 'lost';
    }

    return {
      userExperience,
      functionality,
      data
    };
  }

  /**
   * 确定优先级
   */
  private determinePriority(
    severity: string,
    impact: ErrorAnalysis['impact'],
    frequency: number
  ): ErrorPriority {
    // 基于严重程度的基础优先级
    let priority: ErrorPriority;
    switch (severity) {
      case 'critical':
        priority = ErrorPriority.CRITICAL;
        break;
      case 'high':
        priority = ErrorPriority.HIGH;
        break;
      case 'medium':
        priority = ErrorPriority.MEDIUM;
        break;
      default:
        priority = ErrorPriority.LOW;
    }

    // 根据影响调整优先级
    if (impact.userExperience === 'severe' || impact.functionality === 'complete') {
      priority = ErrorPriority.CRITICAL;
    } else if (impact.userExperience === 'moderate' || impact.functionality === 'significant') {
      priority = ErrorPriority.HIGH;
    }

    // 根据频率调整优先级
    if (frequency > 10) {
      priority = ErrorPriority.CRITICAL;
    } else if (frequency > 5) {
      priority = ErrorPriority.HIGH;
    }

    return priority;
  }

  /**
   * 生成建议
   */
  private generateSuggestions(analysis: ErrorAnalysis): string[] {
    const suggestions: string[] = [];
    const { type, severity, impact } = analysis;

    // 基于错误类型的建议
    switch (type) {
      case 'network':
        suggestions.push(
          '检查网络连接状态',
          '验证API端点可访问性',
          '考虑添加重试机制',
          '实施网络错误降级策略'
        );
        break;

      case 'api':
        suggestions.push(
          '验证API请求参数格式',
          '检查API响应数据结构',
          '添加API错误处理逻辑',
          '考虑实现API缓存机制'
        );
        break;

      case 'react':
        suggestions.push(
          '检查组件props和state的初始化',
          '添加PropTypes或TypeScript类型检查',
          '使用React Error Boundary包裹组件',
          '考虑使用React.memo优化性能'
        );
        break;

      case 'state':
        suggestions.push(
          '验证状态更新的合法性',
          '检查状态更新逻辑',
          '考虑使用状态管理工具的中间件',
          '添加状态变更日志'
        );
        break;

      case 'type':
        suggestions.push(
          '添加变量存在性检查',
          '使用可选链操作符(?.)',
          '实施防御性编程',
          '添加类型检查'
        );
        break;

      case 'async':
        suggestions.push(
          '添加Promise错误处理',
          '使用try-catch包装异步操作',
          '考虑使用async/await简化代码',
          '实施超时机制'
        );
        break;

      case 'performance':
        suggestions.push(
          '优化算法复杂度',
          '考虑使用缓存或记忆化',
          '实施懒加载策略',
          '添加性能监控'
        );
        break;

      case 'security':
        suggestions.push(
          '检查认证和授权逻辑',
          '验证输入数据的合法性',
          '实施CORS策略',
          '添加安全头部'
        );
        break;

      default:
        suggestions.push(
          '检查错误日志获取更多信息',
          '添加更详细的错误处理',
          '考虑实施监控和告警',
          '编写测试用例重现问题'
        );
    }

    // 基于严重程度的建议
    if (severity === 'critical' || severity === 'high') {
      suggestions.push('立即处理此问题以避免进一步影响');
    }

    // 基于影响的建议
    if (impact.userExperience === 'severe') {
      suggestions.push('优先修复影响用户体验的问题');
    }

    if (impact.data !== 'none') {
      suggestions.push('检查数据完整性，实施备份机制');
    }

    return suggestions;
  }

  /**
   * 生成错误键
   */
  private generateErrorKey(error: any): string {
    const type = error.type || 'unknown';
    const message = (error.message || '').substring(0, 100);
    const source = error.source || 'unknown';
    return `${type}:${source}:${message}`;
  }

  /**
   * 初始化错误模式
   */
  private initializePatterns(): void {
    // React错误模式
    this.errorPatterns.set('react', [
      /Cannot read prop|Cannot read property/gi,
      /undefined is not (an object|function)/gi,
      /React.createElement: type is invalid/gi,
      /Maximum call stack size exceeded/gi,
      /Objects are not valid as a React child/gi
    ]);

    // API错误模式
    this.errorPatterns.set('api', [
      /Network request failed/gi,
      /Failed to fetch/gi,
      /Request timed out/gi,
      /HTTP \d+ \w+/gi,
      /CORS policy/gi
    ]);

    // 状态管理错误模式
    this.errorPatterns.set('state', [
      /Invalid state update/gi,
      /State mutation detected/gi,
      /Cannot update during state transition/gi,
      /Immutable update/gi
    ]);
  }

  /**
   * 匹配错误模式
   */
  public matchPatterns(error: any): string[] {
    const matches: string[] = [];
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    for (const [patternName, patterns] of this.errorPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(message) || pattern.test(stack)) {
          matches.push(patternName);
          break;
        }
      }
    }

    return matches;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: WorkflowEnvironment): void {
    this.config = config;
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    frequentErrors: Array<{ key: string; count: number }>;
  } {
    const stats = {
      totalErrors: 0,
      errorsByType: {} as Record<string, number>,
      errorsByCategory: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      frequentErrors: [] as Array<{ key: string; count: number }>
    };

    for (const [key, timestamps] of this.frequencyTracker.entries()) {
      const count = timestamps.length;
      stats.totalErrors += count;
      stats.frequentErrors.push({ key, count });

      // 这里可以进一步分析错误类型和分类
      // 由于我们没有保存完整的错误信息，这里只是示例
    }

    // 排序频繁错误
    stats.frequentErrors.sort((a, b) => b.count - a.count);
    stats.frequentErrors = stats.frequentErrors.slice(0, 10);

    return stats;
  }
}

export class ErrorClassifier {
  /**
   * 对错误进行分类
   */
  public static classify(error: any): {
    category: string;
    subcategory: string;
    isRecoverable: boolean;
    userFacing: boolean;
  } {
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    // 分类逻辑
    if (stack.includes('react') || message.includes('component')) {
      return {
        category: 'ui',
        subcategory: 'react',
        isRecoverable: true,
        userFacing: true
      };
    }

    if (message.includes('api') || message.includes('fetch') || message.includes('network')) {
      return {
        category: 'network',
        subcategory: 'api',
        isRecoverable: true,
        userFacing: true
      };
    }

    if (message.includes('state') || message.includes('store')) {
      return {
        category: 'state',
        subcategory: 'management',
        isRecoverable: false,
        userFacing: true
      };
    }

    return {
      category: 'unknown',
      subcategory: 'general',
      isRecoverable: false,
      userFacing: false
    };
  }
}

export default ErrorAnalyzer;