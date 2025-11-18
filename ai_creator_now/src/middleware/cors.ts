import { NextRequest, NextResponse } from 'next/server';
import { getCorsConfig, validateOrigin, buildCORSHeaders, isPreflightRequest, logCORSViolation } from '../lib/corsConfig';

/**
 * CORS安全中间件
 * 为Next.js API路由提供CORS保护
 */
export function withCORS(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const corsConfig = getCorsConfig();
    const origin = req.headers.get('origin');
    const method = req.method;
    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown';

    try {
      // 处理预检请求
      if (isPreflightRequest(method)) {
        // 验证Origin是否在白名单中
        if (origin && !validateOrigin(origin, corsConfig.origin)) {
          logCORSViolation({
            origin: origin || 'null',
            method,
            userAgent,
            ip,
            reason: 'Origin not in whitelist'
          });

          return NextResponse.json(
            { error: 'CORS Error', message: 'Origin not allowed' },
            { status: 403 }
          );
        }

        // 构建CORS响应头
        const headers = buildCORSHeaders(origin, corsConfig);

        // 添加安全头
        headers['X-Content-Type-Options'] = 'nosniff';
        headers['X-Frame-Options'] = 'DENY';
        headers['X-XSS-Protection'] = '1; mode=block';
        headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

        return new NextResponse(null, {
          status: 200,
          headers
        });
      }

      // 处理实际请求
      if (origin && !validateOrigin(origin, corsConfig.origin)) {
        logCORSViolation({
          origin: origin || 'null',
          method,
          userAgent,
          ip,
          reason: 'Origin not in whitelist for actual request'
        });

        return NextResponse.json(
          { error: 'CORS Error', message: 'Origin not allowed' },
          { status: 403 }
        );
      }

      // 执行原始处理程序
      const response = await handler(req, context);

      // 添加CORS头到响应
      const headers = buildCORSHeaders(origin, corsConfig);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // 添加安全头
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

      // 添加内容类型保护
      if (!response.headers.get('content-type')) {
        response.headers.set('content-type', 'application/json');
      }

      return response;

    } catch (error) {
      console.error('CORS Middleware Error:', error);

      // 记录中间件错误
      logCORSViolation({
        origin: origin || 'null',
        method,
        userAgent,
        ip,
        reason: 'Middleware error'
      });

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'CORS middleware failed',
          timestamp: new Date().toISOString()
        },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff'
          }
        }
      );
    }
  };
}

/**
 * 创建带有CORS保护的API路由处理器
 * @param handler 原始API处理程序
 * @returns 包装后的处理程序
 */
export function createSecureAPIRoute(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withCORS(handler);
}

/**
 * 简化的CORS中间件，用于不需要完整验证的API
 */
export function withBasicCORS(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const corsConfig = getCorsConfig();
    const origin = req.headers.get('origin');
    const method = req.method;

    try {
      // 处理预检请求
      if (isPreflightRequest(method)) {
        const headers = buildCORSHeaders(origin, corsConfig);
        return new NextResponse(null, {
          status: 200,
          headers
        });
      }

      // 执行原始处理程序
      const response = await handler(req, context);

      // 添加CORS头到响应
      const headers = buildCORSHeaders(origin, corsConfig);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      console.error('Basic CORS Middleware Error:', error);

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'CORS middleware failed'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * API路由安全检查工具
 * 验证请求是否符合安全要求
 */
export class APISecurityGuard {
  static validateRequest(req: NextRequest): {
    isValid: boolean;
    reason?: string;
    risk: 'low' | 'medium' | 'high';
  } {
    const userAgent = req.headers.get('user-agent') || '';
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown';

    // 检查User-Agent
    if (!userAgent) {
      return {
        isValid: false,
        reason: 'Missing User-Agent header',
        risk: 'medium'
      };
    }

    // 检查可疑的User-Agent模式
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /node/i,
      /fetch/i,
      /axios/i,
      /postman/i,
      /insomnia/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern =>
      pattern.test(userAgent) && !userAgent.includes('Mozilla')
    );

    if (isSuspicious) {
      return {
        isValid: false,
        reason: 'Suspicious User-Agent',
        risk: 'high'
      };
    }

    // 检查请求频率（简单的时间窗口检查）
    const now = Date.now();
    const requestKey = `api_request_${ip}`;
    const lastRequest = globalThis[requestKey] || 0;

    if (now - lastRequest < 100) { // 100ms内的请求视为可疑
      return {
        isValid: false,
        reason: 'Request rate too high',
        risk: 'medium'
      };
    }

    globalThis[requestKey] = now;

    return { isValid: true, risk: 'low' };
  }

  /**
   * 创建带有安全检查的API处理器
   */
  static withSecurityCheck(
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
      const securityCheck = this.validateRequest(req);

      if (!securityCheck.isValid) {
        // 记录安全违规
        logCORSViolation({
          origin: req.headers.get('origin') || 'null',
          method: req.method,
          userAgent: req.headers.get('user-agent') || '',
          ip: req.headers.get('x-forwarded-for') || 'unknown',
          reason: securityCheck.reason
        });

        return NextResponse.json(
          {
            error: 'Security Violation',
            message: securityCheck.reason,
            risk: securityCheck.risk
          },
          { status: securityCheck.risk === 'high' ? 429 : 403 }
        );
      }

      // 执行原始处理程序
      return await handler(req, context);
    };
  }
}

/**
 * 组合中间件：同时应用CORS和安全检查
 */
export function withSecurityAndCORS(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return APISecurityGuard.withSecurityCheck(withCORS(handler));
}

export default withCORS;