// Custom error classes for the video generation workstation

export class VideoWorkstationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VideoWorkstationError';
  }
}

export class CSVImportError extends VideoWorkstationError {
  constructor(message: string, public row?: number, public field?: string) {
    super(message, 'CSV_IMPORT_ERROR', { row, field });
    this.name = 'CSVImportError';
  }
}

export class AIProviderError extends VideoWorkstationError {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number
  ) {
    super(message, 'AI_PROVIDER_ERROR', { provider, statusCode });
    this.name = 'AIProviderError';
  }
}

export class VideoProcessingError extends VideoWorkstationError {
  constructor(message: string, public operation: string) {
    super(message, 'VIDEO_PROCESSING_ERROR', { operation });
    this.name = 'VideoProcessingError';
  }
}

export class AudioProcessingError extends VideoWorkstationError {
  constructor(message: string, public operation: string) {
    super(message, 'AUDIO_PROCESSING_ERROR', { operation });
    this.name = 'AudioProcessingError';
  }
}

export class StorageError extends VideoWorkstationError {
  constructor(message: string, public operation: string) {
    super(message, 'STORAGE_ERROR', { operation });
    this.name = 'StorageError';
  }
}

export class ValidationError extends VideoWorkstationError {
  constructor(message: string, public field?: string, public value?: any) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends VideoWorkstationError {
  constructor(message: string, public url?: string, public method?: string) {
    super(message, 'NETWORK_ERROR', { url, method });
    this.name = 'NetworkError';
  }
}

// Error handler utility
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: VideoWorkstationError) => void)[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Add error listener for UI updates
  addErrorListener(listener: (error: VideoWorkstationError) => void): void {
    this.errorListeners.push(listener);
  }

  // Remove error listener
  removeErrorListener(listener: (error: VideoWorkstationError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  // Handle and notify listeners of errors
  handleError(error: VideoWorkstationError): void {
    console.error(`[${error.code}] ${error.message}`, error.details);

    // Notify all listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // Send to external error tracking service in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(error);
    }
  }

  // Wrap async functions with error handling
  wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const workstationError = this.normalizeError(error, context);
        this.handleError(workstationError);
        throw workstationError;
      }
    };
  }

  // Wrap sync functions with error handling
  wrap<T extends any[], R>(
    fn: (...args: T) => R,
    context?: string
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        const workstationError = this.normalizeError(error, context);
        this.handleError(workstationError);
        throw workstationError;
      }
    };
  }

  // Normalize different error types to VideoWorkstationError
  private normalizeError(error: any, context?: string): VideoWorkstationError {
    if (error instanceof VideoWorkstationError) {
      return error;
    }

    if (error instanceof Error) {
      // Convert common error types
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        return new NetworkError(error.message, undefined, context);
      }

      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return new ValidationError(error.message);
      }

      return new VideoWorkstationError(error.message, 'UNKNOWN_ERROR', {
        originalError: error.name,
        context
      });
    }

    if (typeof error === 'string') {
      return new VideoWorkstationError(error, 'UNKNOWN_ERROR', { context });
    }

    return new VideoWorkstationError('An unknown error occurred', 'UNKNOWN_ERROR', {
      originalError: error,
      context
    });
  }

  // Send error to external tracking service
  private sendToErrorTracking(error: VideoWorkstationError): void {
    // Integration with services like Sentry, LogRocket, etc.
    // This would be implemented based on the chosen error tracking service
    try {
      // Example: Sentry.captureException(error);
    } catch (trackingError) {
      console.error('Failed to send error to tracking service:', trackingError);
    }
  }

  // Create user-friendly error messages
  getUserFriendlyMessage(error: VideoWorkstationError): string {
    switch (error.code) {
      case 'CSV_IMPORT_ERROR':
        return `CSV导入失败: ${error.message}. 请检查文件格式是否正确。`;

      case 'AI_PROVIDER_ERROR':
        return `AI服务错误: ${error.message}. 请稍后重试或更换AI服务商。`;

      case 'VIDEO_PROCESSING_ERROR':
        return `视频处理错误: ${error.message}. 请检查视频文件是否损坏。`;

      case 'AUDIO_PROCESSING_ERROR':
        return `音频处理错误: ${error.message}. 请检查音频文件格式。`;

      case 'STORAGE_ERROR':
        return `存储错误: ${error.message}. 请检查磁盘空间和权限。`;

      case 'VALIDATION_ERROR':
        return `输入验证错误: ${error.message}. 请检查输入数据。`;

      case 'NETWORK_ERROR':
        return `网络错误: ${error.message}. 请检查网络连接。`;

      default:
        return `系统错误: ${error.message}. 请稍后重试，如问题持续请联系客服。`;
    }
  }

  // Get suggested actions for errors
  getSuggestedAction(error: VideoWorkstationError): string {
    switch (error.code) {
      case 'CSV_IMPORT_ERROR':
        return '请下载CSV模板并按照格式填写数据。';

      case 'AI_PROVIDER_ERROR':
        if (error.statusCode === 401) {
          return '请检查API密钥是否正确配置。';
        } else if (error.statusCode === 429) {
          return 'API调用次数已达上限，请稍后重试或升级套餐。';
        } else {
          return '请检查网络连接并稍后重试。';
        }

      case 'VIDEO_PROCESSING_ERROR':
        return '尝试降低视频质量或缩短视频长度。';

      case 'AUDIO_PROCESSING_ERROR':
        return '请使用支持的音频格式 (MP3, WAV, M4A)。';

      case 'STORAGE_ERROR':
        return '请清理磁盘空间或更换存储位置。';

      case 'VALIDATION_ERROR':
        return '请检查输入数据是否符合要求。';

      case 'NETWORK_ERROR':
        return '请检查网络连接并刷新页面。';

      default:
        return '请刷新页面重试，如问题持续请联系技术支持。';
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleError = (error: VideoWorkstationError) => errorHandler.handleError(error);
export const wrapAsync = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => errorHandler.wrapAsync(fn, context);
export const wrap = <T extends any[], R>(
  fn: (...args: T) => R,
  context?: string
) => errorHandler.wrap(fn, context);