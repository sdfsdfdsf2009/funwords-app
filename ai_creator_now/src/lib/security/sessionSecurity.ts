// 会话安全增强 - 会话指纹识别、并发会话管理、异地登录检测

import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';

// 会话指纹接口
export interface SessionFingerprint {
  id: string;
  userId: string;
  sessionId: string;
  fingerprint: string;
  components: {
    userAgent: string;
    language: string;
    timezone: string;
    screenResolution: string;
    colorDepth: string;
    platform: string;
    cookiesEnabled: boolean;
    javaEnabled: boolean;
    plugins: string[];
    fonts: string[];
    canvas: string;
    webgl: string;
    audio: string;
    hardwareConcurrency: number;
    deviceMemory: number;
    connection: string;
    ip: string;
    country: string;
    region: string;
    city: string;
    isp: string;
  };
  createdAt: number;
  lastSeen: number;
  confidence: number;
  isMobile: boolean;
  isBot: boolean;
  riskScore: number;
}

// 会话事件接口
export interface SessionEvent {
  id: string;
  userId: string;
  sessionId: string;
  type: 'login' | 'logout' | 'activity' | 'suspicious_activity' | 'concurrent_login' | 'geo_anomaly' | 'fingerprint_mismatch';
  timestamp: number;
  data: {
    ip?: string;
    userAgent?: string;
    fingerprint?: string;
    location?: {
      country: string;
      region: string;
      city: string;
      coordinates?: { lat: number; lng: number };
    };
    deviceInfo?: {
      type: string;
      os: string;
      browser: string;
    };
    previousSessionId?: string;
    anomalyReason?: string;
    riskScore?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  action: string;
}

// 会话安全配置
export interface SessionSecurityConfig {
  enableFingerprinting: boolean;
  enableGeoTracking: boolean;
  enableConcurrentSessionLimit: boolean;
  maxConcurrentSessions: number;
  enableFingerprintValidation: boolean;
  fingerprintThreshold: number;
  enableGeoAnomalyDetection: boolean;
  trustedCountries: string[];
  suspiciousCountries: string[];
  enableDeviceValidation: boolean;
  sessionTimeout: number; // minutes
  enableActivityTracking: boolean;
  riskScoreThreshold: number;
  enableAutoLogout: boolean;
  enableNotification: boolean;
}

// 会话安全管理器
export class SessionSecurityManager {
  private static instance: SessionSecurityManager;
  private config: SessionSecurityConfig;
  private fingerprints = new Map<string, SessionFingerprint>();
  private activeSessions = new Map<string, Set<string>>(); // userId -> sessionIds
  private sessionEvents: SessionEvent[] = [];
  private blockedSessions = new Set<string>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      enableFingerprinting: true,
      enableGeoTracking: true,
      enableConcurrentSessionLimit: true,
      maxConcurrentSessions: 3,
      enableFingerprintValidation: true,
      fingerprintThreshold: 0.8,
      enableGeoAnomalyDetection: true,
      trustedCountries: ['CN', 'US', 'JP', 'KR', 'SG', 'HK'],
      suspiciousCountries: [],
      enableDeviceValidation: true,
      sessionTimeout: 30 * 60, // 30分钟
      enableActivityTracking: true,
      riskScoreThreshold: 0.7,
      enableAutoLogout: true,
      enableNotification: true
    };

    this.startCleanupTimer();
  }

  static getInstance(): SessionSecurityManager {
    if (!SessionSecurityManager.instance) {
      SessionSecurityManager.instance = new SessionSecurityManager();
    }
    return SessionSecurityManager.instance;
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupOldEvents();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  // 生成会话指纹
  async generateFingerprint(
    request: NextRequest,
    userId: string,
    sessionId: string
  ): Promise<SessionFingerprint> {
    const components = await this.collectFingerprintComponents(request);
    const fingerprint = this.createFingerprintHash(components);

    const sessionFingerprint: SessionFingerprint = {
      id: this.generateFingerprintId(),
      userId,
      sessionId,
      fingerprint,
      components,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      confidence: this.calculateConfidence(components),
      isMobile: this.detectMobile(components.userAgent),
      isBot: this.detectBot(components.userAgent),
      riskScore: this.calculateRiskScore(components)
    };

    this.fingerprints.set(sessionId, sessionFingerprint);

    // 更新活跃会话
    if (!this.activeSessions.has(userId)) {
      this.activeSessions.set(userId, new Set());
    }
    this.activeSessions.get(userId)!.add(sessionId);

    return sessionFingerprint;
  }

  // 收集指纹组件
  private async collectFingerprintComponents(request: NextRequest): Promise<SessionFingerprint['components']> {
    const userAgent = request.headers.get('user-agent') || '';
    const ip = this.getClientIP(request);
    const geoInfo = await this.getGeoLocation(ip);

    // 解析User-Agent获取设备和浏览器信息
    const deviceInfo = this.parseUserAgent(userAgent);

    return {
      userAgent,
      language: request.headers.get('accept-language') || 'unknown',
      timezone: 'UTC', // 客户端需要提供
      screenResolution: 'unknown', // 客户端需要提供
      colorDepth: 'unknown', // 客户端需要提供
      platform: deviceInfo.os,
      cookiesEnabled: true, // 客户端需要提供
      javaEnabled: false, // 客户端需要提供
      plugins: [], // 客户端需要提供
      fonts: [], // 客户端需要提供
      canvas: 'unknown', // 客户端需要提供
      webgl: 'unknown', // 客户端需要提供
      audio: 'unknown', // 客户端需要提供
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: (navigator as any).deviceMemory || 4,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      ip,
      country: geoInfo.country,
      region: geoInfo.region,
      city: geoInfo.city,
      isp: geoInfo.isp
    };
  }

  // 生成指纹哈希
  private createFingerprintHash(components: SessionFingerprint['components']): string {
    const fingerprintData = [
      components.userAgent,
      components.language,
      components.platform,
      components.screenResolution,
      components.colorDepth,
      components.timezone,
      components.plugins.join(','),
      components.fonts.join(','),
      components.canvas,
      components.webgl,
      components.audio,
      components.hardwareConcurrency.toString(),
      components.deviceMemory.toString(),
      components.connection
    ].join('|');

    return createHash('sha256').update(fingerprintData).digest('hex');
  }

  // 计算置信度
  private calculateConfidence(components: SessionFingerprint['components']): number {
    let confidence = 0.5; // 基础置信度

    // 检查关键组件是否可用
    if (components.userAgent !== 'unknown') confidence += 0.15;
    if (components.screenResolution !== 'unknown') confidence += 0.1;
    if (components.canvas !== 'unknown') confidence += 0.1;
    if (components.webgl !== 'unknown') confidence += 0.1;
    if (components.fonts.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  // 检测移动设备
  private detectMobile(userAgent: string): boolean {
    const mobileKeywords = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileKeywords.test(userAgent);
  }

  // 检测机器人
  private detectBot(userAgent: string): boolean {
    const botKeywords = /bot|crawler|spider|scraper|curl|wget|python|java|go|rust|headless|phantom|selenium/i;
    return botKeywords.test(userAgent);
  }

  // 计算风险评分
  private calculateRiskScore(components: SessionFingerprint['components']): number {
    let riskScore = 0;

    // 地理位置风险
    if (this.config.suspiciousCountries.includes(components.country)) {
      riskScore += 0.3;
    } else if (!this.config.trustedCountries.includes(components.country)) {
      riskScore += 0.1;
    }

    // User-Agent风险
    if (this.detectBot(components.userAgent)) {
      riskScore += 0.4;
    }

    // 设备信息风险
    if (components.userAgent === 'unknown') {
      riskScore += 0.2;
    }

    // 网络风险
    if (components.connection === 'unknown') {
      riskScore += 0.1;
    }

    return Math.min(riskScore, 1.0);
  }

  // 解析User-Agent
  private parseUserAgent(userAgent: string): { os: string; browser: string } {
    // 简化的User-Agent解析
    let os = 'Unknown';
    let browser = 'Unknown';

    // 操作系统检测
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // 浏览器检测
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    return { os, browser };
  }

  // 获取客户端IP
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.ip;

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP.trim();
    }
    if (clientIP) {
      return clientIP;
    }

    return 'unknown';
  }

  // 获取地理位置信息
  private async getGeoLocation(ip: string): Promise<{
    country: string;
    region: string;
    city: string;
    isp: string;
  }> {
    // 这里应该调用真实的地理位置服务，如 MaxMind GeoIP2
    // 现在返回模拟数据
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      isp: 'Unknown'
    };
  }

  // 验证会话指纹
  validateSessionFingerprint(
    request: NextRequest,
    userId: string,
    sessionId: string,
    clientFingerprint?: string
  ): {
    isValid: boolean;
    riskScore: number;
    threats: string[];
    actions: string[];
  } {
    const threats: string[] = [];
    const actions: string[] = [];
    let riskScore = 0;

    const storedFingerprint = this.fingerprints.get(sessionId);
    if (!storedFingerprint) {
      threats.push('session_not_found');
      actions.push('terminate_session');
      return { isValid: false, riskScore: 1.0, threats, actions };
    }

    // 检查会话是否被阻止
    if (this.blockedSessions.has(sessionId)) {
      threats.push('session_blocked');
      actions.push('terminate_session');
      return { isValid: false, riskScore: 1.0, threats, actions };
    }

    // 验证指纹匹配
    if (clientFingerprint && this.config.enableFingerprintValidation) {
      const similarity = this.calculateFingerprintSimilarity(clientFingerprint, storedFingerprint.fingerprint);
      if (similarity < this.config.fingerprintThreshold) {
        threats.push('fingerprint_mismatch');
        riskScore += 0.5;
        actions.push('security_alert', 'require_reauthentication');
      }
    }

    // 检查地理位置异常
    if (this.config.enableGeoAnomalyDetection) {
      const currentIP = this.getClientIP(request);
      const geoAnomaly = this.detectGeoAnomaly(currentIP, storedFingerprint);
      if (geoAnomaly) {
        threats.push('geo_anomaly');
        riskScore += 0.3;
        actions.push('geo_security_alert');
      }
    }

    // 检查并发会话限制
    if (this.config.enableConcurrentSessionLimit) {
      const concurrentCount = this.activeSessions.get(userId)?.size || 0;
      if (concurrentCount > this.config.maxConcurrentSessions) {
        threats.push('concurrent_session_limit_exceeded');
        riskScore += 0.2;
        actions.push('terminate_oldest_session');
      }
    }

    // 检查会话超时
    const sessionAge = Date.now() - storedFingerprint.lastSeen;
    if (sessionAge > this.config.sessionTimeout * 60 * 1000) {
      threats.push('session_timeout');
      actions.push('terminate_session');
      return { isValid: false, riskScore: 1.0, threats, actions };
    }

    // 更新最后活动时间
    storedFingerprint.lastSeen = Date.now();

    const isValid = riskScore < this.config.riskScoreThreshold;

    if (!isValid && this.config.enableAutoLogout) {
      actions.push('auto_logout');
    }

    return { isValid, riskScore, threats, actions };
  }

  // 计算指纹相似度
  private calculateFingerprintSimilarity(fp1: string, fp2: string): number {
    // 简单的字符串相似度计算
    const longer = fp1.length > fp2.length ? fp1 : fp2;
    const shorter = fp1.length > fp2.length ? fp2 : fp1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // 计算编辑距离
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // 检测地理位置异常
  private detectGeoAnomaly(currentIP: string, fingerprint: SessionFingerprint): boolean {
    // 如果IP变化很大，可能是异常
    return currentIP !== fingerprint.components.ip;
  }

  // 记录会话事件
  recordSessionEvent(event: Omit<SessionEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SessionEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    };

    this.sessionEvents.push(fullEvent);

    // 执行安全动作
    this.executeSessionActions(fullEvent);

    // 限制事件数量
    if (this.sessionEvents.length > 10000) {
      this.sessionEvents = this.sessionEvents.slice(-5000);
    }
  }

  // 执行会话安全动作
  private executeSessionActions(event: SessionEvent): void {
    for (const action of event.action.split(',')) {
      switch (action.trim()) {
        case 'terminate_session':
          this.terminateSession(event.sessionId);
          break;
        case 'terminate_oldest_session':
          this.terminateOldestSession(event.userId);
          break;
        case 'block_session':
          this.blockSession(event.sessionId);
          break;
        case 'require_reauthentication':
          this.requireReauthentication(event.sessionId);
          break;
        case 'security_alert':
          this.sendSecurityAlert(event);
          break;
        case 'geo_security_alert':
          this.sendGeoSecurityAlert(event);
          break;
        case 'auto_logout':
          this.autoLogout(event.sessionId);
          break;
      }
    }
  }

  // 终止会话
  private terminateSession(sessionId: string): void {
    this.fingerprints.delete(sessionId);

    // 从活跃会话中移除
    for (const [userId, sessions] of this.activeSessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.activeSessions.delete(userId);
      }
    }

    console.log(`🚫 会话已终止: ${sessionId}`);
  }

  // 终止最旧的会话
  private terminateOldestSession(userId: string): void {
    const userSessions = this.activeSessions.get(userId);
    if (!userSessions || userSessions.size === 0) return;

    let oldestSessionId = '';
    let oldestTime = Date.now();

    for (const sessionId of userSessions) {
      const fingerprint = this.fingerprints.get(sessionId);
      if (fingerprint && fingerprint.createdAt < oldestTime) {
        oldestTime = fingerprint.createdAt;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      this.terminateSession(oldestSessionId);
    }
  }

  // 阻止会话
  private blockSession(sessionId: string): void {
    this.blockedSessions.add(sessionId);
    console.log(`🛑 会话已阻止: ${sessionId}`);
  }

  // 要求重新认证
  private requireReauthentication(sessionId: string): void {
    console.log(`🔐 会话要求重新认证: ${sessionId}`);
  }

  // 发送安全警报
  private sendSecurityAlert(event: SessionEvent): void {
    console.error(`🚨 会话安全警报: ${event.type} - 用户 ${event.userId}`);

    // 记录到系统日志
    fetch('/api/system-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: event.severity === 'critical' ? 'critical' :
               event.severity === 'high' ? 'error' : 'warning',
        message: `会话安全事件: ${event.type}`,
        category: 'session_security',
        metadata: {
          eventId: event.id,
          userId: event.userId,
          sessionId: event.sessionId,
          type: event.type,
          severity: event.severity,
          ip: event.data.ip,
          riskScore: event.data.riskScore
        }
      })
    }).catch(error => {
      console.error('记录会话安全事件失败:', error);
    });
  }

  // 发送地理位置安全警报
  private sendGeoSecurityAlert(event: SessionEvent): void {
    console.error(`🌍 地理位置安全警报: 用户 ${event.userId} 可能的异地登录`);

    // 记录到系统日志
    fetch('/api/system-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: 'warning',
        message: `地理位置异常: 可能的异地登录`,
        category: 'geo_security',
        metadata: {
          userId: event.userId,
          sessionId: event.sessionId,
          location: event.data.location,
          previousIP: event.data.ip,
          anomalyReason: event.data.anomalyReason
        }
      })
    }).catch(error => {
      console.error('记录地理位置安全事件失败:', error);
    });
  }

  // 自动登出
  private autoLogout(sessionId: string): void {
    console.log(`🚪 自动登出: ${sessionId}`);
    this.terminateSession(sessionId);
  }

  // 检测并发登录
  detectConcurrentLogin(userId: string, sessionId: string, ip: string): boolean {
    const userSessions = this.activeSessions.get(userId);
    if (!userSessions) return false;

    // 检查是否有其他活跃会话
    for (const existingSessionId of userSessions) {
      if (existingSessionId !== sessionId) {
        const fingerprint = this.fingerprints.get(existingSessionId);
        if (fingerprint && fingerprint.components.ip !== ip) {
          // 检测到来自不同IP的并发会话
          this.recordSessionEvent({
            userId,
            sessionId,
            type: 'concurrent_login',
            data: {
              ip,
              fingerprint: fingerprint.fingerprint,
              location: {
                country: fingerprint.components.country,
                region: fingerprint.components.region,
                city: fingerprint.components.city
              }
            },
            severity: 'medium',
            blocked: false,
            action: 'security_alert,terminate_oldest_session'
          });

          return true;
        }
      }
    }

    return false;
  }

  // 更新会话活动
  updateSessionActivity(sessionId: string, additionalData?: any): void {
    const fingerprint = this.fingerprints.get(sessionId);
    if (fingerprint) {
      fingerprint.lastSeen = Date.now();

      if (this.config.enableActivityTracking && additionalData) {
        this.recordSessionEvent({
          userId: fingerprint.userId,
          sessionId,
          type: 'activity',
          data: additionalData,
          severity: 'low',
          blocked: false,
          action: ''
        });
      }
    }
  }

  // 清理过期会话
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeout = this.config.sessionTimeout * 60 * 1000;

    for (const [sessionId, fingerprint] of this.fingerprints) {
      if (now - fingerprint.lastSeen > timeout) {
        this.terminateSession(sessionId);
      }
    }
  }

  // 清理旧事件
  private cleanupOldEvents(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.sessionEvents = this.sessionEvents.filter(event => event.timestamp > oneWeekAgo);
  }

  // 生成指纹ID
  private generateFingerprintId(): string {
    return `fp_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  // 生成事件ID
  private generateEventId(): string {
    return `evt_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  // 获取会话统计
  getSessionStatistics(): {
    totalSessions: number;
    activeUsers: number;
    blockedSessions: number;
    averageSessionsPerUser: number;
    sessionEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topCountries: Array<{ country: string; count: number }>;
    riskDistribution: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const countryCounts = new Map<string, number>();
    const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const fingerprint of this.fingerprints.values()) {
      const country = fingerprint.components.country;
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);

      if (fingerprint.riskScore < 0.3) riskDistribution.low++;
      else if (fingerprint.riskScore < 0.6) riskDistribution.medium++;
      else if (fingerprint.riskScore < 0.8) riskDistribution.high++;
      else riskDistribution.critical++;
    }

    for (const event of this.sessionEvents) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    }

    const topCountries = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    const totalSessions = this.fingerprints.size;
    const activeUsers = this.activeSessions.size;
    const averageSessionsPerUser = activeUsers > 0 ? totalSessions / activeUsers : 0;

    return {
      totalSessions,
      activeUsers,
      blockedSessions: this.blockedSessions.size,
      averageSessionsPerUser,
      sessionEvents: this.sessionEvents.length,
      eventsByType,
      eventsBySeverity,
      topCountries,
      riskDistribution
    };
  }

  // 获取用户会话列表
  getUserSessions(userId: string): Array<{
    sessionId: string;
    fingerprint: SessionFingerprint;
    isActive: boolean;
    riskScore: number;
  }> {
    const userSessionIds = this.activeSessions.get(userId);
    if (!userSessionIds) return [];

    return Array.from(userSessionIds).map(sessionId => {
      const fingerprint = this.fingerprints.get(sessionId);
      if (!fingerprint) return null;

      return {
        sessionId,
        fingerprint,
        isActive: !this.blockedSessions.has(sessionId),
        riskScore: fingerprint.riskScore
      };
    }).filter(Boolean) as Array<{
      sessionId: string;
      fingerprint: SessionFingerprint;
      isActive: boolean;
      riskScore: number;
    }>;
  }

  // 获取高风险会话
  getHighRiskSessions(threshold: number = 0.7): Array<{
    sessionId: string;
    userId: string;
    fingerprint: SessionFingerprint;
    riskFactors: string[];
  }> {
    const highRiskSessions: Array<{
      sessionId: string;
      userId: string;
      fingerprint: SessionFingerprint;
      riskFactors: string[];
    }> = [];

    for (const [sessionId, fingerprint] of this.fingerprints) {
      if (fingerprint.riskScore >= threshold) {
        const riskFactors: string[] = [];

        if (this.detectBot(fingerprint.components.userAgent)) {
          riskFactors.push('bot_user_agent');
        }
        if (this.config.suspiciousCountries.includes(fingerprint.components.country)) {
          riskFactors.push('suspicious_country');
        }
        if (fingerprint.components.userAgent === 'unknown') {
          riskFactors.push('unknown_user_agent');
        }

        highRiskSessions.push({
          sessionId,
          userId: fingerprint.userId,
          fingerprint,
          riskFactors
        });
      }
    }

    return highRiskSessions.sort((a, b) => b.fingerprint.riskScore - a.fingerprint.riskScore);
  }

  // 手动阻止会话
  manuallyBlockSession(sessionId: string, reason: string): void {
    this.blockSession(sessionId);

    const fingerprint = this.fingerprints.get(sessionId);
    if (fingerprint) {
      this.recordSessionEvent({
        userId: fingerprint.userId,
        sessionId,
        type: 'suspicious_activity',
        data: {
          anomalyReason: reason,
          riskScore: 1.0
        },
        severity: 'high',
        blocked: true,
        action: 'block_session'
      });
    }
  }

  // 手动解除会话阻止
  unblockSession(sessionId: string): void {
    this.blockedSessions.delete(sessionId);
    console.log(`✅ 解除会话阻止: ${sessionId}`);
  }

  // 强制用户登出所有会话
  forceLogoutAllSessions(userId: string): void {
    const userSessionIds = this.activeSessions.get(userId);
    if (userSessionIds) {
      for (const sessionId of Array.from(userSessionIds)) {
        this.terminateSession(sessionId);
      }
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<SessionSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 会话安全配置已更新');
  }

  // 导出会话数据
  exportSessionData(): {
    fingerprints: SessionFingerprint[];
    events: SessionEvent[];
    statistics: ReturnType<typeof this.getSessionStatistics>;
  } {
    return {
      fingerprints: Array.from(this.fingerprints.values()),
      events: this.sessionEvents,
      statistics: this.getSessionStatistics()
    };
  }

  // 停止会话安全管理
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('⏹️ 会话安全管理已停止');
  }
}

// 导出单例实例
export const sessionSecurity = SessionSecurityManager.getInstance();

// 客户端会话指纹收集器
export class ClientFingerprintCollector {
  private static instance: ClientFingerprintCollector;
  private fingerprintData: any = {};

  private constructor() {}

  static getInstance(): ClientFingerprintCollector {
    if (!ClientFingerprintCollector.instance) {
      ClientFingerprintCollector.instance = new ClientFingerprintCollector();
    }
    return ClientFingerprintCollector.instance;
  }

  // 收集客户端指纹数据
  async collectFingerprint(): Promise<string> {
    const data = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      javaEnabled: navigator.javaEnabled(),
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      connection: (navigator as any).connection?.effectiveType,
      fonts: await this.getFontList(),
      canvas: await this.getCanvasFingerprint(),
      webgl: await this.getWebGLFingerprint(),
      audio: await this.getAudioFingerprint(),
      plugins: this.getPluginList()
    };

    this.fingerprintData = data;

    // 生成指纹哈希
    const fingerprintString = Object.values(data).join('|');
    return this.hashString(fingerprintString);
  }

  // 获取字体列表
  private async getFontList(): Promise<string[]> {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Arial Unicode MS',
      'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas',
      'Courier', 'Courier New', 'Geneva', 'Georgia', 'Helvetica',
      'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
      'Palatino', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
      'Verdana', 'Webdings'
    ];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return [];

    const detectedFonts: string[] = [];

    for (const font of testFonts) {
      context.font = `72px ${font}, monospace`;
      context.fillText('mmmmmmmmmmlli', 2, 2);

      const baseWidth = context.measureText('mmmmmmmmmmlli').width;

      context.font = `72px '${font}', monospace`;
      context.fillText('mmmmmmmmmmlli', 2, 2);

      const fontWidth = context.measureText('mmmmmmmmmmlli').width;

      if (baseWidth !== fontWidth) {
        detectedFonts.push(font);
      }
    }

    return detectedFonts;
  }

  // 获取Canvas指纹
  private async getCanvasFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return '';

    // 绘制复杂图案
    context.textBaseline = 'top';
    context.font = '14px Arial';
    context.fillStyle = '#f60';
    context.fillRect(125, 1, 62, 20);
    context.fillStyle = '#069';
    context.fillText('Canvas fingerprint', 2, 15);
    context.fillStyle = 'rgba(102, 204, 0, 0.7)';
    context.fillText('Canvas fingerprint', 4, 17);

    return canvas.toDataURL();
  }

  // 获取WebGL指纹
  private async getWebGLFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      return `${vendor}|${renderer}`;
    }

    return '';
  }

  // 获取音频指纹
  private async getAudioFingerprint(): Promise<string> {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return '';

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, context.currentTime);

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(0);

      return new Promise((resolve) => {
        setTimeout(() => {
          oscillator.stop();
          context.close();
          resolve('audio_fingerprint_collected');
        }, 100);
      });
    } catch (error) {
      return '';
    }
  }

  // 获取插件列表
  private getPluginList(): string[] {
    const plugins: string[] = [];

    if (navigator.plugins) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        const plugin = navigator.plugins[i];
        plugins.push(plugin.name);
      }
    }

    return plugins;
  }

  // 字符串哈希
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // 获取完整的指纹数据
  getFingerprintData(): any {
    return this.fingerprintData;
  }
}

// 导出单例实例
export const clientFingerprintCollector = ClientFingerprintCollector.getInstance();

// 导出类型
export type { SessionFingerprint, SessionEvent, SessionSecurityConfig };