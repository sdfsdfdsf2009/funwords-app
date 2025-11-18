import { NextRequest, NextResponse } from 'next/server';
import { JWTUtils } from '@/lib/jwt';

// CORS配置
const CORS_CONFIG = {
  // 允许的源域名
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://localhost:3003',
    // 添加生产环境域名
    ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
  ],

  // 允许的HTTP方法
  allowedMethods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS'
  ],

  // 允许的请求头
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Client-Version',
    'X-Request-ID',
    'Accept',
    'Origin',
    'Cache-Control'
  ],

  // 暴露的响应头
  exposedHeaders: [
    'X-Total-Count',
    'X-Request-ID',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],

  // 允许凭据
  credentials: true,

  // 预检请求缓存时间（秒）
  maxAge: 86400 // 24小时
};

// 速率限制配置
const RATE_LIMIT_CONFIG = {
  // 每个IP每分钟的请求数
  requestsPerMinute: 60,

  // 每个IP每小时的请求数
  requestsPerHour: 1000,

  // 每个认证用户每分钟的请求数
  authenticatedRequestsPerMinute: 120,

  // 每个认证用户每小时的请求数
  authenticatedRequestsPerHour: 2000
};

// 安全头配置
const SECURITY_HEADERS = {
  // 内容安全策略
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.evolink.ai https://api.openai.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

  // X-Frame-Options
  'X-Frame-Options': 'DENY',

  // X-Content-Type-Options
  'X-Content-Type-Options': 'nosniff',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '),

  // Strict Transport Security (仅在HTTPS下)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  }),

  // X-XSS-Protection
  'X-XSS-Protection': '1; mode=block'
};

/**
 * IP速率限制器
 */
class RateLimiter {
  private static requests = new Map<string, {
    count: number;
    resetTime: number;
    lastRequest: number;
  }>();

  static isRateLimited(
    identifier: string,
    isAuthenticted: boolean = false,
    windowMs: number = 60 * 1000,
    maxRequests: number = 60
  ): {
    isLimited: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    const existing = this.requests.get(key);

    if (!existing || now > existing.resetTime) {
      // 新的时间窗口
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs,
        lastRequest: now
      });

      return {
        isLimited: false,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    // 检查是否超过限制
    if (existing.count >= maxRequests) {
      return {
        isLimited: true,
        remaining: 0,
        resetTime: existing.resetTime
      };
    }

    // 增加请求计数
    existing.count++;
    existing.lastRequest = now;

    return {
      isLimited: false,
      remaining: maxRequests - existing.count,
      resetTime: existing.resetTime
    };
  }

  /**
   * 清理过期的速率限制记录
   */
  static cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        expired.push(key);
      }
    }

    expired.forEach(key => this.requests.delete(key));
  }
}

// 定期清理速率限制记录（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * 检查源是否被允许
 */
function isOriginAllowed(origin: string): boolean {
  if (!origin) return true; // 允许非浏览器请求

  return CORS_CONFIG.allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === '*') return true;
    if (allowedOrigin === origin) return true;

    // 支持通配符匹配
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }

    return false;
  });
}

/**
 * 生成CORS头
 */
function generateCorsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  headers['Access-Control-Allow-Methods'] = CORS_CONFIG.allowedMethods.join(', ');
  headers['Access-Control-Allow-Headers'] = CORS_CONFIG.allowedHeaders.join(', ');
  headers['Access-Control-Expose-Headers'] = CORS_CONFIG.exposedHeaders.join(', ');
  headers['Access-Control-Max-Age'] = CORS_CONFIG.maxAge.toString();

  if (CORS_CONFIG.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * 获取客户端IP地址
 */
function getClientIP(request: NextRequest): string {
  // 尝试从各种头部获取真实IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return request.ip || 'unknown';
}

/**
 * 获取请求标识符
 */
function getRequestIdentifier(request: NextRequest): string {
  // 优先使用用户ID，然后使用IP
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      const token = JWTUtils.extractTokenFromHeader(authHeader);
      if (token) {
        const payload = JWTUtils.verifyAccessToken(token);
        return `user:${payload.userId}`;
      }
    } catch {
      // 忽略认证错误，使用IP
    }
  }

  return `ip:${getClientIP(request)}`;
}

/**
 * 安全中间件
 */
export function securityMiddleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const method = request.method;

  // 跳过静态资源的CORS检查
  if (pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.includes('.')) {
    return null;
  }

  // 处理预检请求
  if (method === 'OPTIONS') {
    const corsHeaders = generateCorsHeaders(origin || undefined);

    // 检查源是否被允许
    if (origin && !isOriginAllowed(origin)) {
      return new NextResponse('CORS policy violation', {
        status: 403,
        headers: corsHeaders
      });
    }

    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // API路由的安全检查
  if (pathname.startsWith('/api/')) {
    // CORS检查
    if (origin && !isOriginAllowed(origin)) {
      return NextResponse.json(
        { error: 'CORS policy violation' },
        { status: 403 }
      );
    }

    // 速率限制检查
    const clientIP = getClientIP(request);
    const requestIdentifier = getRequestIdentifier(request);
    const isAuthenticted = request.headers.has('authorization');

    // 根据认证状态选择不同的限制
    const minuteLimit = isAuthenticted
      ? RATE_LIMIT_CONFIG.authenticatedRequestsPerMinute
      : RATE_LIMIT_CONFIG.requestsPerMinute;

    const rateLimitResult = RateLimiter.isRateLimited(
      requestIdentifier,
      isAuthenticted,
      60 * 1000, // 1分钟
      minuteLimit
    );

    if (rateLimitResult.isLimited) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        },
        {
          status: 429,
          headers: {
            'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
            'X-Rate-Limit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // 某些敏感API需要认证
    const protectedAPIs = [
      '/api/api-configs',
      '/api/projects',
      '/api/scenes',
      '/api/video-tasks',
      '/api/user'
    ];

    if (protectedAPIs.some(api => pathname.startsWith(api))) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      try {
        const token = JWTUtils.extractTokenFromHeader(authHeader);
        if (!token) {
          throw new Error('No token provided');
        }

        const payload = JWTUtils.verifyAccessToken(token);

        // 更新会话访问时间
        if (payload.sessionId) {
          const { SessionManager } = require('@/lib/jwt');
          SessionManager.updateSessionAccess(payload.sessionId);
        }
      } catch (error) {
        let errorMessage = 'Invalid token';
        let statusCode = 401;

        if (error instanceof Error) {
          if (error.message === 'ACCESS_TOKEN_EXPIRED') {
            errorMessage = 'Access token expired';
            statusCode = 401;
          } else if (error.message === 'INVALID_ACCESS_TOKEN') {
            errorMessage = 'Invalid access token';
            statusCode = 401;
          }
        }

        return NextResponse.json(
          { error: errorMessage },
          { status: statusCode }
        );
      }
    }

    // 创建响应并添加安全头
    const response = NextResponse.next();

    // 添加CORS头
    const corsHeaders = generateCorsHeaders(origin || undefined);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // 添加安全头
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // 添加速率限制头
    response.headers.set('X-Rate-Limit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-Rate-Limit-Reset', rateLimitResult.resetTime.toString());

    // 添加请求ID头
    const requestID = request.headers.get('x-request-id') ||
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    response.headers.set('X-Request-ID', requestID);

    return response;
  }

  // 对于非API请求，只添加基本安全头
  const response = NextResponse.next();

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * 错误处理中间件
 */
export function handleSecurityError(error: Error, request: NextRequest): NextResponse {
  console.error('Security middleware error:', error);

  // 不暴露敏感错误信息
  const isDevelopment = process.env.NODE_ENV === 'development';

  return NextResponse.json(
    {
      error: 'Internal server error',
      ...(isDevelopment && {
        message: error.message,
        stack: error.stack
      })
    },
    { status: 500 }
  );
}

export default securityMiddleware;