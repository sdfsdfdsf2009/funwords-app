/**
 * CORS安全配置
 * 提供基于域名的白名单机制和动态CORS中间件
 */

// 开发环境域名白名单
export const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003'
];

// 生产环境域名白名单
export const PRODUCTION_ORIGINS = [
  'https://app.yourdomain.com',
  'https://yourdomain.com',
  'https://admin.yourdomain.com',
  'https://staging.yourdomain.com'
  // 从环境变量动态添加
  // ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
];

// 允许的HTTP方法
export const ALLOWED_METHODS = [
  'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'
];

// 允许的请求头
export const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-API-Version',
  'X-Requested-With',
  'Accept',
  'Origin',
  'User-Agent',
  'X-Forwarded-For',
  'X-Forwarded-Proto'
];

// 暴露的响应头
export const EXPOSED_HEADERS = [
  'Content-Length',
  'Content-Type',
  'Content-Range',
  'X-Request-ID',
  'X-Rate-Limit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset'
];

// CORS缓存配置
export const CACHE_CONFIG = {
  development: {
    maxAge: 86400, // 24小时
  },
  production: {
    maxAge: 3600 // 1小时
  }
};

// 安全头配置
export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

export interface CORSConfig {
  origin: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export function getCorsConfig(): CORSConfig {
  const env = process.env.NODE_ENV || 'development';

  return {
    origin: env === 'development' ? DEVELOPMENT_ORIGINS : PRODUCTION_ORIGINS,
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: EXPOSED_HEADERS,
    credentials: true,
    maxAge: CACHE_CONFIG[env as keyof typeof CACHE_CONFIG]?.maxAge || 3600
  };
}

/**
 * 验证Origin是否在白名单中
 * @param origin 请求的Origin
 * @param allowedOrigins 允许的域名列表
 * @returns 是否验证通过
 */
export function validateOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    // 没有Origin头，通常是同源请求或移动应用
    return false;
  }

  // 精确匹配
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // 子域名匹配（如允许 *.yourdomain.com）
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      if (origin.endsWith(domain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 从环境变量获取额外允许的域名
 * @returns 额外域名数组
 */
export function getAdditionalOrigins(): string[] {
  const originsEnv = process.env.ALLOWED_ORIGINS;
  if (!originsEnv) {
    return [];
  }

  try {
    return originsEnv.split(',').map(origin => origin.trim()).filter(Boolean);
  } catch (error) {
    console.error('Error parsing ALLOWED_ORIGINS:', error);
    return [];
  }
}

/**
 * 获取生产环境完整域名列表
 * @returns 生产环境域名数组
 */
export function getProductionOrigins(): string[] {
  const additionalOrigins = getAdditionalOrigins();
  return [...PRODUCTION_ORIGINS, ...additionalOrigins];
}

/**
 * 检查是否为预检请求
 * @param method HTTP方法
 * @returns 是否为预检请求
 */
export function isPreflightRequest(method: string): boolean {
  return method.toUpperCase() === 'OPTIONS';
}

/**
 * 构建CORS响应头
 * @param origin 请求的Origin
 * @param config CORS配置
 * @returns 响应头对象
 */
export function buildCORSHeaders(origin: string | null, config: CORSConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // 设置Origin头
  if (origin && config.origin.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && config.origin.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (config.origin.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  // 设置其他CORS头
  headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
  headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
  headers['Access-Control-Max-Age'] = config.maxAge.toString();

  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  if (config.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
  }

  return headers;
}

/**
 * 创建CORS错误响应
 * @param message 错误消息
 * @param status HTTP状态码
 * @returns Response对象
 */
export function createCORSErrorResponse(message: string, status: number = 400): Response {
  return new Response(JSON.stringify({
    error: 'CORS Error',
    message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * 验证API请求的来源安全性
 * @param req Request对象
 * @returns 验证结果
 */
export function validateAPIRequest(req: {
  headers: Record<string, string>;
  method: string;
  ip?: string;
}): {
  isValid: boolean;
  reason?: string;
  details?: Record<string, any>;
} {
  const origin = req.headers['origin'];
  const userAgent = req.headers['user-agent'];
  const referer = req.headers['referer'];

  // 检查必需的头信息
  if (!origin) {
    return {
      isValid: false,
      reason: 'Missing Origin header',
      details: { userAgent, referer }
    };
  }

  // 检查User-Agent
  if (!userAgent) {
    return {
      isValid: false,
      reason: 'Missing User-Agent header',
      details: { origin, referer }
    };
  }

  // 检查是否为已知的攻击模式 - 修改为更宽松的检测
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /node/i,
    // 移除 /fetch/i 和 /axios/i 以避免误判正常浏览器请求
    /postman/i
  ];

  // 更严格的检测逻辑，要求同时满足多个条件才认为是可疑的
  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(userAgent) &&
    !userAgent.includes('Mozilla') &&
    !userAgent.includes('Chrome') &&
    !userAgent.includes('Safari') &&
    !userAgent.includes('Firefox')
  );

  if (isSuspicious) {
    return {
      isValid: false,
      reason: 'Suspicious User-Agent',
      details: { userAgent, origin, ip: req.ip }
    };
  }

  return { isValid: true };
}

/**
 * 记录CORS违规事件
 * @param details 违规详情
 */
export function logCORSViolation(details: {
  origin?: string;
  method: string;
  userAgent?: string;
  ip?: string;
  reason: string;
}): void {
  const violationData = {
    timestamp: new Date().toISOString(),
    type: 'CORS_VIOLATION',
    severity: 'medium',
    ...details
  };

  // 在生产环境发送到安全监控
  if (process.env.NODE_ENV === 'production') {
    // 这里可以集成到安全监控系统
    console.warn('[CORS Violation]', violationData);
  } else {
    // 开发环境详细日志
    console.error('[CORS Violation]', violationData);
  }
}

export default {
  getCorsConfig,
  validateOrigin,
  buildCORSHeaders,
  createCORSErrorResponse,
  validateAPIRequest,
  logCORSViolation
};