/**
 * 安全工具模块
 * 提供各种安全相关的实用函数
 */

// 内容安全策略生成器
export class CSPBuilder {
  private directives: Record<string, string[]> = {};

  constructor() {
    // 默认CSP配置
    this.directives = {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    };
  }

  addDirective(directive: string, sources: string[]): this {
    this.directives[directive] = [...(this.directives[directive] || []), ...sources];
    return this;
  }

  allowScriptSrc(sources: string[]): this {
    return this.addDirective('script-src', sources);
  }

  allowStyleSrc(sources: string[]): this {
    return this.addDirective('style-src', sources);
  }

  allowConnectSrc(sources: string[]): this {
    return this.addDirective('connect-src', sources);
  }

  allowImgSrc(sources: string[]): this {
    return this.addDirective('img-src', sources);
  }

  allowFrameSrc(sources: string[]): this {
    return this.addDirective('frame-src', sources);
  }

  build(): string {
    return Object.entries(this.directives)
      .filter(([_, sources]) => sources.length > 0)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }
}

// 输入验证函数
export class InputValidator {
  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证URL格式
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证文件名安全性
   */
  static isValidFileName(fileName: string): boolean {
    // 检查危险字符
    const dangerousChars = /[<>:"|?*\\\/\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      return false;
    }

    // 检查保留名称 (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(fileName)) {
      return false;
    }

    // 检查长度
    if (fileName.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * 清理HTML内容，防止XSS攻击
   */
  static sanitizeHtml(html: string): string {
    // 简单的HTML清理 - 生产环境建议使用DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * 验证密码强度
   */
  static validatePassword(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('密码长度至少需要8位');
    }

    // 包含大写字母
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('密码需要包含大写字母');
    }

    // 包含小写字母
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('密码需要包含小写字母');
    }

    // 包含数字
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('密码需要包含数字');
    }

    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('密码需要包含特殊字符');
    }

    return {
      isValid: score >= 4,
      score,
      feedback
    };
  }
}

// 加密工具函数
export class CryptoUtils {
  /**
   * 生成随机字符串
   */
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成UUID v4
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 计算字符串哈希值 (简单实现)
   */
  static async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// 权限检查工具
export class PermissionChecker {
  /**
   * 检查用户是否有管理员权限
   */
  static isAdmin(user: { role?: string; permissions?: string[] }): boolean {
    return user.role === 'admin' || user.permissions?.includes('admin') || false;
  }

  /**
   * 检查用户是否有特定权限
   */
  static hasPermission(
    user: { role?: string; permissions?: string[] },
    permission: string
  ): boolean {
    return user.permissions?.includes(permission) || user.role === 'admin' || false;
  }

  /**
   * 检查用户是否可以访问资源
   */
  static canAccess(
    user: { id: string; role?: string; permissions?: string[] },
    resource: { ownerId?: string; requiredPermissions?: string[] }
  ): boolean {
    // 管理员可以访问所有资源
    if (this.isAdmin(user)) {
      return true;
    }

    // 检查资源所有权
    if (resource.ownerId && resource.ownerId === user.id) {
      return true;
    }

    // 检查所需权限
    if (resource.requiredPermissions) {
      return resource.requiredPermissions.every(permission =>
        this.hasPermission(user, permission)
      );
    }

    return false;
  }
}

// 安全日志记录
export class SecurityLogger {
  /**
   * 记录安全事件
   */
  static logSecurityEvent(
    event: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      ip: this.getClientIP()
    };

    // 在开发环境中输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY] ${severity.toUpperCase()}: ${event}`, logEntry);
    }

    // 在生产环境中应该发送到日志服务
    // this.sendToLogService(logEntry);
  }

  /**
   * 获取客户端IP地址
   */
  private static getClientIP(): string {
    // 在服务器端，这应该从请求头中获取
    return typeof window !== 'undefined' ? 'client' : 'server';
  }

  /**
   * 记录可疑活动
   */
  static logSuspiciousActivity(activity: string, details: Record<string, any>): void {
    this.logSecurityEvent(`SUSPICIOUS_ACTIVITY: ${activity}`, details, 'high');
  }

  /**
   * 记录认证失败
   */
  static logAuthFailure(identifier: string, reason: string): void {
    this.logSecurityEvent('AUTH_FAILURE', { identifier, reason }, 'medium');
  }

  /**
   * 记录权限违规
   */
  static logPermissionViolation(user: string, resource: string, action: string): void {
    this.logSecurityEvent('PERMISSION_VIOLATION', { user, resource, action }, 'high');
  }
}

// CSRF保护
export class CSRFProtection {
  /**
   * 生成CSRF令牌
   */
  static generateToken(): string {
    return CryptoUtils.generateRandomString(32);
  }

  /**
   * 验证CSRF令牌
   */
  static validateToken(token: string, sessionToken: string): boolean {
    // 简单验证 - 实际应用中应该使用更安全的方法
    return token.length === 32 && token === sessionToken;
  }
}

// 内容安全检查
export class ContentSecurityChecker {
  /**
   * 检查内容是否包含恶意代码
   */
  static checkMaliciousContent(content: string): {
    isSafe: boolean;
    threats: string[];
  } {
    const threats: string[] = [];
    const patterns = [
      { pattern: /<script[^>]*>/i, threat: 'script_tag' },
      { pattern: /javascript:/i, threat: 'javascript_protocol' },
      { pattern: /on\w+\s*=/i, threat: 'event_handler' },
      { pattern: /<iframe[^>]*>/i, threat: 'iframe_tag' },
      { pattern: /<object[^>]*>/i, threat: 'object_tag' },
      { pattern: /<embed[^>]*>/i, threat: 'embed_tag' },
      { pattern: /eval\s*\(/i, threat: 'eval_function' },
      { pattern: /document\.cookie/i, threat: 'cookie_access' },
      { pattern: /localStorage\./i, threat: 'localstorage_access' }
    ];

    patterns.forEach(({ pattern, threat }) => {
      if (pattern.test(content)) {
        threats.push(threat);
      }
    });

    return {
      isSafe: threats.length === 0,
      threats
    };
  }

  /**
   * 清理用户输入内容
   */
  static sanitizeUserInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // 移除尖括号
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+\s*=/gi, '') // 移除事件处理器
      .substring(0, 10000); // 限制长度
  }
}

export default {
  CSPBuilder,
  InputValidator,
  CryptoUtils,
  PermissionChecker,
  SecurityLogger,
  CSRFProtection,
  ContentSecurityChecker
};