import { logger } from './logger';

/**
 * 安全日志过滤器
 * 用于过滤和脱敏日志中的敏感信息，防止API密钥等敏感数据泄露
 */
export class SecureLogger {
  private static readonly SENSITIVE_PATTERNS = [
    // API密钥模式 - 更严格的匹配
    /api[_-]?key[\'"]?\s*[:=]\s*[\'"]?([a-zA-Z0-9_-]{15,})[\'"]?/gi,
    /apikey[\'"]?\s*[:=]\s*[\'"]?([a-zA-Z0-9_-]{15,})[\'"]?/gi,
    /API[_-]?KEY[\'"]?\s*[:=]\s*[\'"]?([a-zA-Z0-9_-]{15,})[\'"]?/gi,

    // Bearer token模式
    /bearer\s+([a-zA-Z0-9._-]{20,})/gi,
    /Bearer\s+([a-zA-Z0-9._-]{20,})/gi,

    // 密码模式
    /password[\'"]?\s*[:=]\s*[\'"]?([^\'"\s]{6,})[\'"]?/gi,
    /Password[\'"]?\s*[:=]\s*[\'"]?([^\'"\s]{6,})[\'"]?/gi,
    /passwd[\'"]?\s*[:=]\s*[\'"]?([^\'"\s]{6,})[\'"]?/gi,

    // 秘钥和令牌模式
    /secret[\'"]?\s*[:=]\s*[\'"]?([^\'"\s]{8,})[\'"]?/gi,
    /token[\'"]?\s*[:=]\s*[\'"]?([a-zA-Z0-9._-]{15,})[\'"]?/gi,
    /Token[\'"]?\s*[:=]\s*[\'"]?([a-zA-Z0-9._-]{15,})[\'"]?/gi,

    // 授权头部
    /authorization[\'"]?\s*[:=]\s*[\'"]?([^\'"]{20,})[\'"]?/gi,
    /Authorization[\'"]?\s*[:=]\s*[\'"]?([^\'"]{20,})[\'"]?/gi,

    // 凭证模式
    /credential[\'"]?\s*[:=]\s*[\'"]?([^\'"\s]{8,})[\'"]?/gi,
    /auth[\'"]?\s*[:=]\s*[\'"]?([^\'"\s]{8,})[\'"]?/gi,

    // 私钥模式
    /private[_-]?key[\'"]?\s*[:=]\s*[\'"]?([^\'"]{20,})[\'"]?/gi,

    // 会话ID
    /session[_-]?id[\'"]?\s*[:=]\s*[\'"]?([a-zA-Z0-9_-]{20,})[\'"]?/gi,

    // URL参数中的敏感信息
    /[?&](api[_-]?key|token|secret|password|auth)=([^&\s]+)/gi,

    // Base64编码的敏感信息检测（常见密钥长度）
    /[\"']([A-Za-z0-9+/]{32,}={0,2})[\"']/
  ];

  private static readonly REPLACEMENT = '***REDACTED***';

  // 敏感字段名称列表
  private static readonly SENSITIVE_FIELDS = [
    'api_key', 'apikey', 'apiKey', 'API_KEY', 'api-key',
    'password', 'passwd', 'pwd',
    'secret', 'private_key', 'privateKey', 'private-key',
    'token', 'access_token', 'accessToken', 'access-token',
    'authorization', 'auth', 'credential', 'credentials',
    'session_key', 'sessionId', 'session-id', 'session',
    'bearer', 'Bearer', 'refresh_token', 'refreshToken'
  ];

  private static readonly MAX_DEPTH = 5;

  /**
   * 脱敏处理 - 主要入口函数
   * @param data 需要脱敏的数据
   * @param depth 递归深度限制
   * @returns 脱敏后的数据
   */
  static sanitize(data: any, depth: number = 0): any {
    // 防止循环引用和过深递归
    if (depth > this.MAX_DEPTH) {
      return '[Max Depth Reached]';
    }

    if (data === null || data === undefined) {
      return data;
    }

    // 处理字符串
    if (typeof data === 'string') {
      return this.redactSensitiveString(data);
    }

    // 处理错误对象
    if (data instanceof Error) {
      return {
        name: data.name,
        message: this.redactSensitiveString(data.message),
        stack: this.redactSensitiveString(data.stack || ''),
        ...(data.cause && { cause: this.sanitize(data.cause, depth + 1) })
      };
    }

    // 处理数组
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item, depth + 1));
    }

    // 处理对象
    if (typeof data === 'object') {
      // 处理特殊对象类型
      if (data instanceof Date) {
        return data;
      }

      if (data instanceof RegExp) {
        return '[RegExp]';
      }

      if (data instanceof Function) {
        return '[Function]';
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // 检查键名是否敏感
        if (this.isSensitiveKey(key)) {
          sanitized[key] = this.REPLACEMENT;
        } else {
          sanitized[key] = this.sanitize(value, depth + 1);
        }
      }
      return sanitized;
    }

    // 基本类型直接返回
    return data;
  }

  /**
   * 检查字段名是否为敏感字段
   * @param key 字段名
   * @returns 是否敏感
   */
  private static isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.SENSITIVE_FIELDS.some(sensitive =>
      lowerKey.includes(sensitive.toLowerCase()) ||
      lowerKey.endsWith(sensitive.toLowerCase()) ||
      lowerKey.startsWith(sensitive.toLowerCase())
    );
  }

  /**
   * 脱敏字符串中的敏感信息
   * @param str 原始字符串
   * @returns 脱敏后的字符串
   */
  private static redactSensitiveString(str: string): string {
    let redacted = str;

    // 应用所有敏感模式
    for (const pattern of this.SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, (match, ...args) => {
        if (args[0] && args[0].length > 0) {
          const sensitive = args[0];
          // 根据长度决定脱敏策略
          if (sensitive.length <= 6) {
            return match.replace(sensitive, this.REPLACEMENT);
          } else if (sensitive.length <= 15) {
            // 短密钥只显示首尾各1位
            return match.replace(sensitive,
              `${sensitive.substring(0, 1)}***${sensitive.substring(sensitive.length - 1)}`
            );
          } else {
            // 长密钥显示首3位和末3位
            return match.replace(sensitive,
              `${sensitive.substring(0, 3)}***${sensitive.substring(sensitive.length - 3)}`
            );
          }
        }
        return match.replace(/[a-zA-Z0-9._-]+/g, this.REPLACEMENT);
      });
    }

    return redacted;
  }

  /**
   * 安全日志记录
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  static log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    // 获取配置的日志级别
    const logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info';
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };

    // 只记录等于或高于配置级别的日志
    if (levels[level] >= levels[logLevel as keyof typeof levels]) {
      const sanitizedData = data ? this.sanitize(data) : undefined;
      const sanitizedMessage = this.redactSensitiveString(message);

      // 根据环境使用不同的日志方式
      if (process.env.NODE_ENV === 'production') {
        // 生产环境使用结构化日志
        this.structuredLog(level, sanitizedMessage, sanitizedData);
      } else {
        // 开发环境使用详细日志
        this.devLog(level, sanitizedMessage, sanitizedData);
      }
    }
  }

  /**
   * 开发环境日志格式
   */
  private static devLog(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data);
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data);
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data);
        break;
    }
  }

  /**
   * 生产环境结构化日志
   */
  private static structuredLog(level: string, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data })
    };

    // 使用JSON格式输出，便于日志分析系统处理
    console.log(JSON.stringify(logEntry));
  }

  /**
   * 快捷方法：调试日志
   */
  static debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * 快捷方法：信息日志
   */
  static info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * 快捷方法：警告日志
   */
  static warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * 快捷方法：错误日志
   */
  static error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * 创建安全的对象键值对
   * 用于避免在对象字面量中直接暴露敏感信息
   */
  static createSafeObject(unsafeObject: Record<string, any>): Record<string, any> {
    return this.sanitize(unsafeObject);
  }

  /**
   * 验证字符串是否包含敏感信息
   * @param str 要检查的字符串
   * @returns 是否包含敏感信息
   */
  static containsSensitiveData(str: string): boolean {
    return this.SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
  }

  /**
   * 提取敏感信息的类型
   * @param str 要检查的字符串
   * @returns 发现的敏感信息类型数组
   */
  static getSensitiveDataTypes(str: string): string[] {
    const types: string[] = [];

    if (/api[_-]?key/i.test(str)) types.push('API Key');
    if (/password/i.test(str)) types.push('Password');
    if (/token/i.test(str)) types.push('Token');
    if (/secret/i.test(str)) types.push('Secret');
    if (/authorization/i.test(str)) types.push('Authorization');
    if (/bearer/i.test(str)) types.push('Bearer Token');
    if (/credential/i.test(str)) types.push('Credential');
    if (/session/i.test(str)) types.push('Session ID');

    return types;
  }
}

// 导出默认实例
export const secureLogger = SecureLogger;

// 为了向后兼容，提供原有logger的增强版本
export const enhancedLogger = {
  debug: (message: string, data?: any) => SecureLogger.debug(message, data),
  info: (message: string, data?: any) => SecureLogger.info(message, data),
  warn: (message: string, data?: any) => SecureLogger.warn(message, data),
  error: (message: string, data?: any) => SecureLogger.error(message, data),
  logUserAction: (action: string, details?: any) => {
    SecureLogger.info(`User Action: ${action}`, details);
  },
  logApiError: (url: string, method: string, status: number, message: string, details?: any) => {
    SecureLogger.error(`API Error: ${method} ${url} - ${status}`, {
      url,
      method,
      status,
      message,
      ...details
    });
  }
};

export default SecureLogger;