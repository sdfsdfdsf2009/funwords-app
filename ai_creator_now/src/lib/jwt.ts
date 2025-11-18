import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT工具类
 * 提供JWT令牌的生成、验证和管理功能
 */
export class JWTUtils {
  /**
   * 生成访问令牌
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'ai-creator-next',
      audience: 'ai-creator-users'
    });
  }

  /**
   * 生成刷新令牌
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      {
        userId,
        type: 'refresh',
        sessionId: crypto.randomUUID()
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  /**
   * 生成令牌对
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    const sessionId = crypto.randomUUID();
    const accessToken = this.generateAccessToken({ ...payload, sessionId });
    const refreshToken = this.generateRefreshToken(payload.userId);

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * 验证访问令牌
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'ai-creator-next',
        audience: 'ai-creator-users'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_ACCESS_TOKEN');
      } else {
        throw new Error('TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * 验证刷新令牌
   */
  static verifyRefreshToken(token: string): { userId: string; sessionId: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('INVALID_REFRESH_TOKEN_TYPE');
      }

      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_REFRESH_TOKEN');
      } else {
        throw new Error('REFRESH_TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * 从请求头中提取令牌
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * 检查令牌是否即将过期（1小时内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;

      return timeUntilExpiry < 3600; // 1小时
    } catch {
      return true;
    }
  }

  /**
   * 获取令牌剩余有效时间（秒）
   */
  static getTokenRemainingTime(token: string): number {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return 0;

      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - now);
    } catch {
      return 0;
    }
  }
}

/**
 * 会话管理器
 * 管理用户会话和令牌状态
 */
export class SessionManager {
  private static sessions = new Map<string, {
    userId: string;
    createdAt: Date;
    lastAccessedAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }>();

  /**
   * 创建新会话
   */
  static createSession(
    sessionId: string,
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): void {
    this.sessions.set(sessionId, {
      userId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      userAgent,
      ipAddress
    });
  }

  /**
   * 更新会话访问时间
   */
  static updateSessionAccess(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.lastAccessedAt = new Date();
    return true;
  }

  /**
   * 获取会话信息
   */
  static getSession(sessionId: string): ReturnType<typeof SessionManager.sessions.get> {
    return this.sessions.get(sessionId);
  }

  /**
   * 删除会话
   */
  static deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 删除用户的所有会话
   */
  static deleteUserSessions(userId: string): number {
    let deletedCount = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * 清理过期会话（7天未访问）
   */
  static cleanupExpiredSessions(): number {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastAccessedAt < sevenDaysAgo) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 获取用户活跃会话数量
   */
  static getUserActiveSessionCount(userId: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取所有活跃会话统计
   */
  static getSessionStats(): {
    totalSessions: number;
    activeUsers: number;
    averageSessionDuration: number;
  } {
    const totalSessions = this.sessions.size;
    const uniqueUsers = new Set(
      Array.from(this.sessions.values()).map(s => s.userId)
    ).size;

    const now = new Date();
    let totalDuration = 0;
    let validSessions = 0;

    for (const session of this.sessions.values()) {
      const duration = now.getTime() - session.createdAt.getTime();
      totalDuration += duration;
      validSessions++;
    }

    return {
      totalSessions,
      activeUsers: uniqueUsers,
      averageSessionDuration: validSessions > 0 ? totalDuration / validSessions : 0
    };
  }
}

// 定期清理过期会话（每小时执行一次）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleanedCount = SessionManager.cleanupExpiredSessions();
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }, 60 * 60 * 1000); // 1小时
}

export default JWTUtils;