/**
 * 工作流日志器
 * 提供结构化的日志记录功能
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
  category?: string;
  tags?: string[];
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  storageKey: string;
  categories: string[];
  enableStructuredOutput: boolean;
  customFormatter?: (entry: LogEntry) => string;
}

export class WorkflowLogger {
  private static instance: WorkflowLogger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private listeners: Array<(entry: LogEntry) => void> = [];

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      storageKey: 'workflow-logs',
      categories: ['workflow', 'error', 'debug', 'performance'],
      enableStructuredOutput: false,
      ...config
    };

    this.loadLogsFromStorage();
  }

  public static getInstance(config?: Partial<LoggerConfig>): WorkflowLogger {
    if (!WorkflowLogger.instance) {
      WorkflowLogger.instance = new WorkflowLogger(config);
    }
    return WorkflowLogger.instance;
  }

  /**
   * 记录调试信息
   */
  public debug(message: string, context?: any, category?: string, tags?: string[]): void {
    this.log('debug', message, context, category, tags);
  }

  /**
   * 记录一般信息
   */
  public info(message: string, context?: any, category?: string, tags?: string[]): void {
    this.log('info', message, context, category, tags);
  }

  /**
   * 记录警告信息
   */
  public warn(message: string, context?: any, category?: string, tags?: string[]): void {
    this.log('warn', message, context, category, tags);
  }

  /**
   * 记录错误信息
   */
  public error(message: string, error?: Error | any, context?: any, category?: string, tags?: string[]): void {
    const errorContext = {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack
    };

    this.log('error', message, errorContext, category, tags, error?.stack);
  }

  /**
   * 记录性能信息
   */
  public performance(operation: string, duration: number, context?: any): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation,
      duration,
      timestamp: Date.now()
    }, 'performance', ['performance', 'timing']);
  }

  /**
   * 记录工作流事件
   */
  public workflow(event: string, context?: any, tags?: string[]): void {
    this.info(`Workflow: ${event}`, context, 'workflow', ['workflow', ...tags]);
  }

  /**
   * 核心日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    context?: any,
    category?: string,
    tags?: string[],
    stack?: string
  ): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      category: category || 'general',
      tags: tags || [],
      stack
    };

    // 添加到内存日志
    this.addLog(entry);

    // 控制台输出
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // 本地存储
    if (this.config.enableStorage) {
      this.saveToStorage();
    }

    // 通知监听器
    this.notifyListeners(entry);
  }

  /**
   * 检查是否应该记录此级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * 添加日志到内存
   */
  private addLog(entry: LogEntry): void {
    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.config.maxStorageEntries) {
      this.logs = this.logs.slice(-this.config.maxStorageEntries);
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const logMethod = this.getConsoleMethod(entry.level);
    const formattedMessage = this.formatMessage(entry);

    // 根据是否有上下文选择输出方式
    if (entry.context && Object.keys(entry.context).length > 0) {
      logMethod(formattedMessage, entry.context);
    } else {
      logMethod(formattedMessage);
    }

    // 如果有堆栈信息，单独输出
    if (entry.stack) {
      console.groupCollapsed(`${entry.level.toUpperCase()} Stack Trace`);
      console.log(entry.stack);
      console.groupEnd();
    }
  }

  /**
   * 获取控制台方法
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug':
        return console.debug || console.log;
      case 'info':
        return console.info || console.log;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(entry: LogEntry): string {
    if (this.config.customFormatter) {
      return this.config.customFormatter(entry);
    }

    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const category = entry.category ? `[${entry.category}]` : '';
    const tags = entry.tags.length > 0 ? `#${entry.tags.join(' #')}` : '';

    if (this.config.enableStructuredOutput) {
      return JSON.stringify({
        timestamp,
        level,
        category,
        message: entry.message,
        tags,
        context: entry.context
      });
    }

    return `${timestamp} ${level} ${category} ${entry.message} ${tags}`.trim();
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const logsToSave = this.logs.slice(-this.config.maxStorageEntries);
        window.localStorage.setItem(this.config.storageKey, JSON.stringify(logsToSave));
      }
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  /**
   * 从本地存储加载日志
   */
  private loadLogsFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedLogs = window.localStorage.getItem(this.config.storageKey);
        if (storedLogs) {
          this.logs = JSON.parse(storedLogs).map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }

  /**
   * 添加日志监听器
   */
  public addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);

    // 返回移除函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取日志
   */
  public getLogs(filter?: {
    level?: LogLevel;
    category?: string;
    tags?: string[];
    since?: Date;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }

      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }

      if (filter.tags && filter.tags.length > 0) {
        filteredLogs = filteredLogs.filter(log =>
          filter.tags!.some(tag => log.tags.includes(tag))
        );
      }

      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
      }

      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs;
  }

  /**
   * 获取日志统计
   */
  public getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      } as Record<LogLevel, number>,
      byCategory: {} as Record<string, number>,
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : undefined,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : undefined
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清除日志
   */
  public clearLogs(): void {
    this.logs = [];

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(this.config.storageKey);
    }

    this.info('Logs cleared', {}, 'system');
  }

  /**
   * 导出日志
   */
  public exportLogs(format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.logs, null, 2);

      case 'csv':
        const headers = ['timestamp', 'level', 'category', 'message', 'tags', 'context'];
        const csvRows = [headers.join(',')];

        this.logs.forEach(log => {
          const row = [
            log.timestamp.toISOString(),
            log.level,
            log.category,
            `"${log.message.replace(/"/g, '""')}"`, // 转义CSV中的引号
            `"${log.tags.join(';')}"`,
            `"${JSON.stringify(log.context).replace(/"/g, '""')}"`
          ];
          csvRows.push(row.join(','));
        });

        return csvRows.join('\n');

      case 'txt':
        return this.logs.map(log => this.formatMessage(log)).join('\n');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

/**
 * 创建工作流日志器
 */
export function createWorkflowLogger(level: LogLevel = 'info'): WorkflowLogger {
  return WorkflowLogger.getInstance({ level });
}

/**
 * 创建分类日志器
 */
export function createCategoryLogger(category: string, level: LogLevel = 'info'): {
  debug: (message: string, context?: any, tags?: string[]) => void;
  info: (message: string, context?: any, tags?: string[]) => void;
  warn: (message: string, context?: any, tags?: string[]) => void;
  error: (message: string, error?: Error | any, context?: any, tags?: string[]) => void;
} {
  const logger = WorkflowLogger.getInstance();

  return {
    debug: (message: string, context?: any, tags?: string[]) =>
      logger.debug(message, context, category, tags),
    info: (message: string, context?: any, tags?: string[]) =>
      logger.info(message, context, category, tags),
    warn: (message: string, context?: any, tags?: string[]) =>
      logger.warn(message, context, category, tags),
    error: (message: string, error?: Error | any, context?: any, tags?: string[]) =>
      logger.error(message, error, context, category, tags)
  };
}

// 导出默认实例
export const workflowLogger = WorkflowLogger.getInstance();

export default WorkflowLogger;