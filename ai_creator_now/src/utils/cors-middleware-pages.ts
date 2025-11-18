import type { NextApiRequest, NextApiResponse } from 'next';
import { getCorsConfig, validateOrigin, buildCORSHeaders, isPreflightRequest, logCORSViolation } from '../lib/corsConfig';

/**
 * Next.js Pages API的CORS中间件
 * 为Next.js Pages API路由提供CORS保护
 */
export function withCorsPages(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const corsConfig = getCorsConfig();
    const origin = req.headers.origin;
    const method = req.method;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] as string ||
               req.headers['x-real-ip'] as string ||
               'unknown';

    try {
      // 处理预检请求
      if (isPreflightRequest(method)) {
        // 验证Origin是否在白名单中
        if (origin && !validateOrigin(origin, corsConfig.origin)) {
          logCORSViolation({
            origin: origin || 'null',
            method: method || 'UNKNOWN',
            userAgent,
            ip,
            reason: 'Origin not in whitelist (preflight)'
          });

          res.setHeader('Content-Type', 'application/json');
          return res.status(403).json({
            error: 'CORS Error',
            message: 'Origin not allowed'
          });
        }

        // 构建CORS响应头
        const headers = buildCORSHeaders(origin, corsConfig);

        // 添加安全头
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // 设置所有CORS头
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        return res.status(200).send('');
      }

      // 处理实际请求
      if (origin && !validateOrigin(origin, corsConfig.origin)) {
        logCORSViolation({
          origin: origin || 'null',
          method: method || 'UNKNOWN',
          userAgent,
          ip,
          reason: 'Origin not in whitelist (actual request)'
        });

        res.setHeader('Content-Type', 'application/json');
        return res.status(403).json({
          error: 'CORS Error',
          message: 'Origin not allowed'
        });
      }

      // 为实际请求设置CORS头
      const headers = buildCORSHeaders(origin, corsConfig);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // 添加安全头
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // 确保Content-Type已设置
      if (!res.getHeader('content-type')) {
        res.setHeader('Content-Type', 'application/json');
      }

      // 执行原始处理程序
      await handler(req, res);

    } catch (error) {
      console.error('CORS Pages Middleware Error:', error);

      // 记录中间件错误
      logCORSViolation({
        origin: origin || 'null',
        method: method || 'UNKNOWN',
        userAgent,
        ip,
        reason: 'Middleware error'
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'CORS middleware failed',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * 简化的CORS中间件
 */
export function withBasicCorsPages(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const corsConfig = getCorsConfig();
    const origin = req.headers.origin;
    const method = req.method;

    try {
      // 处理预检请求
      if (isPreflightRequest(method)) {
        const headers = buildCORSHeaders(origin, corsConfig);
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        return res.status(200).send('');
      }

      // 为实际请求设置CORS头
      const headers = buildCORSHeaders(origin, corsConfig);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // 执行原始处理程序
      await handler(req, res);

    } catch (error) {
      console.error('Basic CORS Pages Middleware Error:', error);

      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'CORS middleware failed'
      });
    }
  };
}

/**
 * Pages API安全检查工具
 */
export class PagesAPISecurityGuard {
  static validateRequest(req: NextApiRequest): {
    isValid: boolean;
    reason?: string;
    risk: 'low' | 'medium' | 'high';
  } {
    const userAgent = req.headers['user-agent'] || '';
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const ip = req.headers['x-forwarded-for'] as string ||
               req.headers['x-real-ip'] as string ||
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

    // 修复：允许包含Mozilla的User-Agent通过（这是正常浏览器）
    // 只有非Mozilla浏览器才进行可疑模式检查
    const isSuspicious = !userAgent.includes('Mozilla') &&
      suspiciousPatterns.some(pattern => pattern.test(userAgent));

    if (isSuspicious) {
      return {
        isValid: false,
        reason: 'Suspicious User-Agent',
        risk: 'high'
      };
    }

    return { isValid: true, risk: 'low' };
  }

  static withSecurityCheck(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
      const securityCheck = this.validateRequest(req);

      if (!securityCheck.isValid) {
        // 记录安全违规
        logCORSViolation({
          origin: req.headers.origin || 'null',
          method: req.method || 'UNKNOWN',
          userAgent: req.headers['user-agent'] || '',
          ip: req.headers['x-forwarded-for'] as string || 'unknown',
          reason: securityCheck.reason
        });

        res.setHeader('Content-Type', 'application/json');
        return res.status(securityCheck.risk === 'high' ? 429 : 403).json({
          error: 'Security Violation',
          message: securityCheck.reason,
          risk: securityCheck.risk
        });
      }

      // 执行原始处理程序
      await handler(req, res);
    };
  }
}

/**
 * 组合中间件：同时应用CORS和安全检查
 */
export function withSecurityAndCorsPages(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return PagesAPISecurityGuard.withSecurityCheck(withCorsPages(handler));
}

export default withCorsPages;