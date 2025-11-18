// Logging utility for video generation workstation
// Now uses database storage with localStorage fallback

import { useDatabaseLoggerStore, LogLevel as DBLogLevel, Logger as DBLogger } from '@/stores/databaseLoggerStore';

// Legacy enum for backward compatibility
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Convert legacy log levels to database log levels
const toDBLogLevel = (level: LogLevel): DBLogLevel => {
  switch (level) {
    case LogLevel.DEBUG: return DBLogLevel.DEBUG;
    case LogLevel.INFO: return DBLogLevel.INFO;
    case LogLevel.WARN: return DBLogLevel.WARN;
    case LogLevel.ERROR:
    case LogLevel.FATAL: return DBLogLevel.ERROR;
    default: return DBLogLevel.INFO;
  }
};

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  category: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  projectId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
}

// Legacy Logger class that delegates to database logger
class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private sessionId: string;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.config = {
      level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      maxStorageEntries: 10000
    };
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Configure logger
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Main logging methods - delegate to database logger
  debug(message: string, data?: any, category = 'general'): void {
    DBLogger.debug(message, category, data);
    if (this.config.enableConsole) {
      console.debug(`[${new Date().toISOString()}] [DEBUG] [${category}]`, message, data);
    }
  }

  info(message: string, data?: any, category = 'general'): void {
    // 临时禁用数据库日志记录以避免速率限制
    // DBLogger.info(message, category, data);
    if (this.config.enableConsole) {
      console.info(`[${new Date().toISOString()}] [INFO] [${category}]`, message, data);
    }
  }

  warn(message: string, data?: any, category = 'general'): void {
    // 临时禁用数据库日志记录以避免速率限制
    // DBLogger.warn(message, category, data);
    if (this.config.enableConsole) {
      console.warn(`[${new Date().toISOString()}] [WARN] [${category}]`, message, data);
    }
  }

  error(message: string, data?: any, category = 'general'): void {
    // 临时禁用数据库日志记录以避免速率限制
    // DBLogger.error(message, category, data);
    if (this.config.enableConsole) {
      console.error(`[${new Date().toISOString()}] [ERROR] [${category}]`, message, data);
    }
  }

  fatal(message: string, data?: any, category = 'general'): void {
    // 临时禁用数据库日志记录以避免速率限制
    // DBLogger.error(message, category, { ...data, fatal: true });
    if (this.config.enableConsole) {
      console.error(`[${new Date().toISOString()}] [FATAL] [${category}]`, message, data);
    }
  }

  // Public methods for log retrieval - delegate to store
  async getLogs(level?: LogLevel, category?: string, limit = 100): Promise<LogEntry[]> {
    const store = useDatabaseLoggerStore.getState();
    await store.loadLogs(undefined, { category, limit });

    const logs = store.logs.map(log => ({
      timestamp: log.timestamp || new Date(),
      level: this.fromDBLogLevel(log.level),
      message: log.message,
      category: log.category || 'general',
      data: log.metadata,
      userId: log.userId,
      sessionId: this.sessionId
    }));

    if (level !== undefined) {
      return logs.filter(log => log.level >= level).slice(-limit);
    }

    return logs;
  }

  // Clear logs - delegate to store
  async clearLogs(): Promise<void> {
    const store = useDatabaseLoggerStore.getState();
    await store.clearLogs();
  }

  // Export logs for debugging
  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    const exportData = {
      logs,
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      config: this.config
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Performance logging
  startTimer(label: string): () => void {
    const startTime = Date.now();
    this.debug(`Timer started: ${label}`, { startTime }, 'performance');

    return () => {
      const duration = Date.now() - startTime;
      this.info(`Timer completed: ${label}`, { duration, startTime }, 'performance');
    };
  }

  // API call logging
  logApiCall(method: string, url: string, duration?: number, error?: any): void {
    if (error) {
      this.error(`API call failed: ${method} ${url}`, { method, url, duration, error }, 'api');
    } else {
      this.info(`API call completed: ${method} ${url}`, { method, url, duration }, 'api');
    }
  }

  // User action logging
  logUserAction(action: string, data?: any): void {
    this.info(`User action: ${action}`, data, 'user-action');
  }

  // Feature usage logging
  logFeatureUsage(feature: string, data?: any): void {
    this.info(`Feature used: ${feature}`, data, 'feature-usage');
  }

  // AI generation logging
  logAIGeneration(provider: string, type: 'image' | 'video', duration: number, success: boolean, data?: any): void {
    const logData = {
      provider,
      type,
      duration,
      success,
      ...data
    };

    if (success) {
      this.info(`AI generation completed: ${provider} ${type}`, logData, 'ai-generation');
    } else {
      this.error(`AI generation failed: ${provider} ${type}`, logData, 'ai-generation');
    }
  }

  // File operation logging
  logFileOperation(operation: string, file: File | string, success: boolean, error?: any): void {
    const logData = {
      operation,
      fileName: typeof file === 'string' ? file : file.name,
      fileSize: typeof file === 'object' ? file.size : undefined,
      success,
      error
    };

    if (success) {
      this.info(`File operation completed: ${operation}`, logData, 'file-operation');
    } else {
      this.error(`File operation failed: ${operation}`, logData, 'file-operation');
    }
  }

  // Convert database log levels back to legacy format
  private fromDBLogLevel(level: DBLogLevel): LogLevel {
    switch (level) {
      case DBLogLevel.DEBUG: return LogLevel.DEBUG;
      case DBLogLevel.INFO: return LogLevel.INFO;
      case DBLogLevel.WARN: return LogLevel.WARN;
      case DBLogLevel.ERROR: return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions for specific categories
export const logApi = {
  call: (method: string, url: string, duration?: number, error?: any) =>
    logger.logApiCall(method, url, duration, error),
  success: (method: string, url: string, duration: number) =>
    logger.logApiCall(method, url, duration),
  error: (method: string, url: string, duration: number, error: any) =>
    logger.logApiCall(method, url, duration, error)
};

export const logUser = {
  action: (action: string, data?: any) => logger.logUserAction(action, data),
  login: (userId: string) => logger.info(`User logged in: ${userId}`, { userId }, 'auth'),
  logout: (userId: string) => logger.info(`User logged out: ${userId}`, { userId }, 'auth')
};

export const logFeature = {
  used: (feature: string, data?: any) => logger.logFeatureUsage(feature, data),
  csvImport: (sceneCount: number) => logger.logFeatureUsage('csv-import', { sceneCount }),
  imageGeneration: (provider: string, count: number) =>
    logger.logFeatureUsage('image-generation', { provider, count }),
  videoGeneration: (provider: string, duration: number) =>
    logger.logFeatureUsage('video-generation', { provider, duration }),
  videoExport: (format: string, duration: number, fileSize: number) =>
    logger.logFeatureUsage('video-export', { format, duration, fileSize })
};

export const logAI = {
  generation: (provider: string, type: 'image' | 'video', duration: number, success: boolean, data?: any) =>
    logger.logAIGeneration(provider, type, duration, success, data),
  imageGeneration: (provider: string, duration: number, success: boolean, data?: any) =>
    logger.logAIGeneration(provider, 'image', duration, success, data),
  videoGeneration: (provider: string, duration: number, success: boolean, data?: any) =>
    logger.logAIGeneration(provider, 'video', duration, success, data)
};

export const logFile = {
  operation: (operation: string, file: File | string, success: boolean, error?: any) =>
    logger.logFileOperation(operation, file, success, error),
  upload: (file: File, success: boolean, error?: any) =>
    logger.logFileOperation('upload', file, success, error),
  download: (file: string, success: boolean, error?: any) =>
    logger.logFileOperation('download', file, success, error),
  export: (file: string, success: boolean, error?: any) =>
    logger.logFileOperation('export', file, success, error)
};

export const logPerformance = {
  timer: (label: string) => logger.startTimer(label),
  measure: (label: string, fn: () => void) => {
    const endTimer = logger.startTimer(label);
    fn();
    endTimer();
  },
  asyncMeasure: async (label: string, fn: () => Promise<any>) => {
    const endTimer = logger.startTimer(label);
    const result = await fn();
    endTimer();
    return result;
  }
};