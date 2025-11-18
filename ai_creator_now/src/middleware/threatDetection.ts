// 实时威胁检测系统 - IP信誉检查、请求频率分析、自动阻止机制

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

// 威胁类型定义
export type ThreatType =
  | 'sql_injection'
  | 'xss_attack'
  | 'csrf_attack'
  | 'ddos_attack'
  | 'brute_force'
  | 'suspicious_user_agent'
  | 'malicious_ip'
  | 'unusual_request_pattern'
  | 'data_exfiltration'
  | 'session_hijack';

// 威胁等级
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

// 威胁事件接口
export interface ThreatEvent {
  id: string;
  timestamp: number;
  ip: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  type: ThreatType;
  level: ThreatLevel;
  description: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  };
  response: {
    statusCode: number;
    size: number;
  };
  confidence: number;
  indicators: string[];
  blocked: boolean;
  action: string;
  metadata: Record<string, any>;
}

// IP信誉数据接口
export interface IPReputation {
  ip: string;
  score: number; // 0-100, 越低越危险
  category: 'clean' | 'suspicious' | 'malicious' | 'known_attacker';
  sources: string[];
  lastSeen: number;
  threats: ThreatType[];
  geographicInfo: {
    country: string;
    region: string;
    city: string;
    isp: string;
    organization: string;
  };
  behavior: {
    requestCount: number;
    uniquePaths: number;
    errorRate: number;
    averageResponseSize: number;
    lastActivity: number;
  };
}

// 威胁检测配置
export interface ThreatDetectionConfig {
  enableRealTimeBlocking: boolean;
  ipReputationThreshold: number;
  rateLimitThresholds: {
    requestsPerMinute: number;
    requestsPerHour: number;
    errorsPerMinute: number;
    suspiciousPatternsPerMinute: number;
  };
  blockedCountries: string[];
  blockedUserAgents: RegExp[];
  suspiciousPatterns: RegExp[];
  enableMachineLearning: boolean;
  loggingLevel: 'info' | 'warn' | 'error' | 'critical';
  autoBlockDuration: number; // minutes
}

// 威胁检测引擎
export class ThreatDetectionEngine {
  private static instance: ThreatDetectionEngine;
  private config: ThreatDetectionConfig;
  private ipReputationCache = new Map<string, IPReputation>();
  private requestTracker = new Map<string, number[]>(); // IP -> timestamps
  private blockedIPs = new Map<string, { until: number; reason: string }>();
  private threatEvents: ThreatEvent[] = [];
  private suspiciousPatterns: RegExp[] = [];
  private blockedUserAgents: RegExp[] = [];

  private constructor() {
    this.config = {
      enableRealTimeBlocking: true,
      ipReputationThreshold: 30,
      rateLimitThresholds: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        errorsPerMinute: 20,
        suspiciousPatternsPerMinute: 5
      },
      blockedCountries: [],
      blockedUserAgents: [],
      suspiciousPatterns: [],
      enableMachineLearning: false,
      loggingLevel: 'warn',
      autoBlockDuration: 60 // 1小时
    };

    this.initializePatterns();
    this.startCleanupTimer();
  }

  static getInstance(): ThreatDetectionEngine {
    if (!ThreatDetectionEngine.instance) {
      ThreatDetectionEngine.instance = new ThreatDetectionEngine();
    }
    return ThreatDetectionEngine.instance;
  }

  // 初始化检测模式
  private initializePatterns(): void {
    // SQL注入模式
    this.suspiciousPatterns.push(
      /(\b(select|insert|update|delete|drop|union|exec|script)\b)/i,
      /('|(\\')|('')|(\-\-)|(\;)|(\||\|)|(\*|\/\*))/i,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/i
    );

    // XSS攻击模式
    this.suspiciousPatterns.push(
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi
    );

    // 路径遍历模式
    this.suspiciousPatterns.push(
      /\.\.\//g,
      /%2e%2e/gi,
      /\/etc\/passwd/gi,
      /\/windows\/system32/gi
    );

    // 命令注入模式
    this.suspiciousPatterns.push(
      /(\||&|;|`|\$\(|\$\{)/g,
      /(curl|wget|nc|netcat|ssh|telnet)/gi,
      /(rm|del|format|fdisk)/gi
    );

    // 恶意User-Agent模式
    this.blockedUserAgents.push(
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|java|go|rust/i,
      /sqlmap|nmap|nikto|burp/i,
      /hack|crack|exploit|inject/i
    );

    this.config.suspiciousPatterns = this.suspiciousPatterns;
    this.config.blockedUserAgents = this.blockedUserAgents;
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredBlocks();
      this.cleanupOldRequestData();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  // 主要威胁检测函数
  async detectThreats(request: NextRequest, response?: Response): Promise<{
    isThreat: boolean;
    threatLevel: ThreatLevel;
    threats: ThreatEvent[];
    shouldBlock: boolean;
    actions: string[];
  }> {
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    // 检查IP是否被阻止
    if (this.isIPBlocked(ip)) {
      return {
        isThreat: true,
        threatLevel: 'critical',
        threats: [{
          id: this.generateThreatId(),
          timestamp: Date.now(),
          ip,
          userAgent,
          type: 'malicious_ip',
          level: 'critical',
          description: `IP ${ip} 被阻止: ${this.blockedIPs.get(ip)?.reason}`,
          request: this.serializeRequest(request),
          response: response ? this.serializeResponse(response) : this.createDefaultResponse(),
          confidence: 1.0,
          indicators: ['blocked_ip'],
          blocked: true,
          action: 'immediate_block',
          metadata: { blockReason: this.blockedIPs.get(ip)?.reason }
        }],
        shouldBlock: true,
        actions: ['immediate_block']
      };
    }

    const threats: ThreatEvent[] = [];
    const actions: string[] = [];

    // 1. IP信誉检查
    const ipReputationThreat = await this.checkIPReputation(ip, userAgent);
    if (ipReputationThreat) {
      threats.push(ipReputationThreat);
      if (ipReputationThreat.level === 'high' || ipReputationThreat.level === 'critical') {
        actions.push('block_ip');
      }
    }

    // 2. 请求频率分析
    const rateLimitThreat = this.analyzeRequestRate(ip, request);
    if (rateLimitThreat) {
      threats.push(rateLimitThreat);
      if (rateLimitThreat.level === 'high' || rateLimitThreat.level === 'critical') {
        actions.push('rate_limit', 'increase_monitoring');
      }
    }

    // 3. 恶意User-Agent检测
    const userAgentThreat = this.checkUserAgent(userAgent, ip);
    if (userAgentThreat) {
      threats.push(userAgentThreat);
      actions.push('monitor_user_agent');
    }

    // 4. 恶意模式检测
    const patternThreats = this.detectMaliciousPatterns(request, ip, userAgent);
    threats.push(...patternThreats);
    if (patternThreats.some(t => t.level === 'high' || t.level === 'critical')) {
      actions.push('block_request', 'security_alert');
    }

    // 5. 异常请求模式检测
    const anomalyThreat = this.detectRequestAnomalies(request, ip);
    if (anomalyThreat) {
      threats.push(anomalyThreat);
      actions.push('increase_monitoring');
    }

    // 6. 地理位置检查
    const geoThreat = this.checkGeographicLocation(ip);
    if (geoThreat) {
      threats.push(geoThreat);
      actions.push('geo_warning');
    }

    // 记录威胁事件
    for (const threat of threats) {
      this.recordThreatEvent(threat);
    }

    // 执行自动防护动作
    this.executeProtectionActions(actions, ip, threats);

    const maxThreatLevel = this.getMaxThreatLevel(threats);
    const shouldBlock = this.shouldBlockRequest(maxThreatLevel, actions);

    return {
      isThreat: threats.length > 0,
      threatLevel: maxThreatLevel,
      threats,
      shouldBlock,
      actions
    };
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

  // 检查IP是否被阻止
  private isIPBlocked(ip: string): boolean {
    const block = this.blockedIPs.get(ip);
    if (!block) return false;

    if (Date.now() > block.until) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  // IP信誉检查
  private async checkIPReputation(ip: string, userAgent: string): Promise<ThreatEvent | null> {
    let reputation = this.ipReputationCache.get(ip);

    if (!reputation) {
      reputation = await this.fetchIPReputation(ip);
      this.ipReputationCache.set(ip, reputation);
    }

    if (reputation.score < this.config.ipReputationThreshold) {
      return {
        id: this.generateThreatId(),
        timestamp: Date.now(),
        ip,
        userAgent,
        type: 'malicious_ip',
        level: reputation.score < 10 ? 'critical' : reputation.score < 20 ? 'high' : 'medium',
        description: `IP信誉分数过低: ${reputation.score}/100`,
        request: this.createDefaultRequest(),
        response: this.createDefaultResponse(),
        confidence: 0.9,
        indicators: ['low_reputation_score', ...reputation.threats],
        blocked: false,
        action: 'monitor',
        metadata: { reputation }
      };
    }

    return null;
  }

  // 获取IP信誉数据（模拟实现）
  private async fetchIPReputation(ip: string): Promise<IPReputation> {
    // 这里应该调用真实的IP信誉服务，如 VirusTotal, AbuseIPDB 等
    // 现在返回模拟数据
    return {
      ip,
      score: 75, // 默认良好分数
      category: 'clean',
      sources: [],
      lastSeen: Date.now(),
      threats: [],
      geographicInfo: {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        isp: 'Unknown',
        organization: 'Unknown'
      },
      behavior: {
        requestCount: 0,
        uniquePaths: 0,
        errorRate: 0,
        averageResponseSize: 0,
        lastActivity: Date.now()
      }
    };
  }

  // 请求频率分析
  private analyzeRequestRate(ip: string, request: NextRequest): ThreatEvent | null {
    const now = Date.now();
    const timestamps = this.requestTracker.get(ip) || [];

    // 添加当前请求时间戳
    timestamps.push(now);
    this.requestTracker.set(ip, timestamps);

    // 清理过期的时间戳（1小时前）
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentTimestamps = timestamps.filter(t => t > oneHourAgo);
    this.requestTracker.set(ip, recentTimestamps);

    // 检查频率限制
    const oneMinuteAgo = now - 60 * 1000;
    const requestsInLastMinute = recentTimestamps.filter(t => t > oneMinuteAgo).length;
    const requestsInLastHour = recentTimestamps.length;

    if (requestsInLastMinute > this.config.rateLimitThresholds.requestsPerMinute) {
      return {
        id: this.generateThreatId(),
        timestamp: now,
        ip,
        userAgent: request.headers.get('user-agent') || '',
        type: 'ddos_attack',
        level: requestsInLastMinute > this.config.rateLimitThresholds.requestsPerMinute * 2 ? 'critical' : 'high',
        description: `请求频率过高: ${requestsInLastMinute} 请求/分钟`,
        request: this.serializeRequest(request),
        response: this.createDefaultResponse(),
        confidence: 0.95,
        indicators: ['high_request_rate'],
        blocked: false,
        action: 'rate_limit',
        metadata: {
          requestsPerMinute: requestsInLastMinute,
          requestsPerHour: requestsInLastHour
        }
      };
    }

    if (requestsInLastHour > this.config.rateLimitThresholds.requestsPerHour) {
      return {
        id: this.generateThreatId(),
        timestamp: now,
        ip,
        userAgent: request.headers.get('user-agent') || '',
        type: 'ddos_attack',
        level: 'medium',
        description: `小时请求频率过高: ${requestsInLastHour} 请求/小时`,
        request: this.serializeRequest(request),
        response: this.createDefaultResponse(),
        confidence: 0.8,
        indicators: ['high_hourly_rate'],
        blocked: false,
        action: 'monitor',
        metadata: { requestsPerHour: requestsInLastHour }
      };
    }

    return null;
  }

  // 检查User-Agent
  private checkUserAgent(userAgent: string, ip: string): ThreatEvent | null {
    for (const pattern of this.blockedUserAgents) {
      if (pattern.test(userAgent)) {
        return {
          id: this.generateThreatId(),
          timestamp: Date.now(),
          ip,
          userAgent,
          type: 'suspicious_user_agent',
          level: 'medium',
          description: `检测到可疑User-Agent: ${userAgent}`,
          request: this.createDefaultRequest(),
          response: this.createDefaultResponse(),
          confidence: 0.7,
          indicators: ['blocked_user_agent'],
          blocked: false,
          action: 'monitor',
          metadata: { userAgent, pattern: pattern.source }
        };
      }
    }

    return null;
  }

  // 检测恶意模式
  private detectMaliciousPatterns(request: NextRequest, ip: string, userAgent: string): ThreatEvent[] {
    const threats: ThreatEvent[] = [];
    const url = request.url;
    const method = request.method;

    // 检查URL中的恶意模式
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(url)) {
        let threatType: ThreatType = 'unusual_request_pattern';
        let description = `URL中检测到可疑模式: ${pattern.source}`;

        if (pattern.source.includes('select|insert|update|delete')) {
          threatType = 'sql_injection';
          description = `检测到可能的SQL注入攻击`;
        } else if (pattern.source.includes('script|javascript')) {
          threatType = 'xss_attack';
          description = `检测到可能的XSS攻击`;
        } else if (pattern.source.includes('\\.\\.|%2e%2e')) {
          threatType = 'data_exfiltration';
          description = `检测到可能的路径遍历攻击`;
        } else if (pattern.source.includes('\\||&|;|`')) {
          threatType = 'data_exfiltration';
          description = `检测到可能的命令注入攻击`;
        }

        threats.push({
          id: this.generateThreatId(),
          timestamp: Date.now(),
          ip,
          userAgent,
          type: threatType,
          level: 'high',
          description,
          request: this.serializeRequest(request),
          response: this.createDefaultResponse(),
          confidence: 0.85,
          indicators: ['malicious_pattern', pattern.source],
          blocked: false,
          action: 'block_request',
          metadata: { pattern: pattern.source, url }
        });
      }
    }

    // 检查请求体（如果有）
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = request.body;
        if (body) {
          const bodyText = await request.text();
          for (const pattern of this.suspiciousPatterns) {
            if (pattern.test(bodyText)) {
              threats.push({
                id: this.generateThreatId(),
                timestamp: Date.now(),
                ip,
                userAgent,
                type: 'data_exfiltration',
                level: 'critical',
                description: `请求体中检测到恶意模式: ${pattern.source}`,
                request: this.serializeRequest(request),
                response: this.createDefaultResponse(),
                confidence: 0.9,
                indicators: ['malicious_body_pattern', pattern.source],
                blocked: false,
                action: 'block_request',
                metadata: { pattern: pattern.source, bodySize: bodyText.length }
              });
            }
          }
        }
      } catch (error) {
        // 忽略读取body的错误
      }
    }

    return threats;
  }

  // 检测请求异常
  private detectRequestAnomalies(request: NextRequest, ip: string): ThreatEvent | null {
    const url = new URL(request.url);
    const suspiciousIndicators: string[] = [];

    // 检查异常长的URL
    if (url.href.length > 2048) {
      suspiciousIndicators.push('long_url');
    }

    // 检查异常多的参数
    if (url.searchParams.size > 50) {
      suspiciousIndicators.push('too_many_parameters');
    }

    // 检查异常的参数值
    for (const [key, value] of url.searchParams) {
      if (value.length > 1000) {
        suspiciousIndicators.push('long_parameter_value');
      }
      if (value.includes('${') || value.includes('<%')) {
        suspiciousIndicators.push('template_injection_attempt');
      }
    }

    // 检查异常的请求头
    const headers = request.headers;
    if (headers.get('content-length') && parseInt(headers.get('content-length')!) > 10 * 1024 * 1024) {
      suspiciousIndicators.push('large_request_body');
    }

    if (suspiciousIndicators.length > 0) {
      return {
        id: this.generateThreatId(),
        timestamp: Date.now(),
        ip,
        userAgent: headers.get('user-agent') || '',
        type: 'unusual_request_pattern',
        level: 'medium',
        description: `检测到异常请求模式: ${suspiciousIndicators.join(', ')}`,
        request: this.serializeRequest(request),
        response: this.createDefaultResponse(),
        confidence: 0.6,
        indicators: suspiciousIndicators,
        blocked: false,
        action: 'monitor',
        metadata: { url: url.href, indicators: suspiciousIndicators }
      };
    }

    return null;
  }

  // 检查地理位置
  private checkGeographicLocation(ip: string): ThreatEvent | null {
    const reputation = this.ipReputationCache.get(ip);
    if (!reputation) return null;

    const { country } = reputation.geographicInfo;
    if (this.config.blockedCountries.includes(country)) {
      return {
        id: this.generateThreatId(),
        timestamp: Date.now(),
        ip,
        userAgent: '',
        type: 'malicious_ip',
        level: 'high',
        description: `来自被阻止国家的请求: ${country}`,
        request: this.createDefaultRequest(),
        response: this.createDefaultResponse(),
        confidence: 0.8,
        indicators: ['blocked_country'],
        blocked: false,
        action: 'geo_block',
        metadata: { country }
      };
    }

    return null;
  }

  // 序列化请求
  private serializeRequest(request: NextRequest): ThreatEvent['request'] {
    const url = new URL(request.url);

    return {
      url: url.href,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries())
    };
  }

  // 序列化响应
  private serializeResponse(response: Response): ThreatEvent['response'] {
    return {
      statusCode: response.status,
      size: parseInt(response.headers.get('content-length') || '0')
    };
  }

  // 创建默认请求
  private createDefaultRequest(): ThreatEvent['request'] {
    return {
      url: '',
      method: 'GET',
      headers: {},
      query: {}
    };
  }

  // 创建默认响应
  private createDefaultResponse(): ThreatEvent['response'] {
    return {
      statusCode: 200,
      size: 0
    };
  }

  // 记录威胁事件
  private recordThreatEvent(threat: ThreatEvent): void {
    this.threatEvents.push(threat);

    // 限制事件数量
    if (this.threatEvents.length > 10000) {
      this.threatEvents = this.threatEvents.slice(-5000);
    }

    // 记录到日志
    this.logThreatEvent(threat);
  }

  // 记录威胁事件到日志
  private logThreatEvent(threat: ThreatEvent): void {
    const logLevel = this.getLogLevel(threat.level);

    fetch('/api/system-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: logLevel,
        message: `威胁检测: ${threat.description}`,
        category: 'security_threat',
        metadata: {
          threatId: threat.id,
          ip: threat.ip,
          type: threat.type,
          level: threat.level,
          confidence: threat.confidence,
          url: threat.request.url,
          userAgent: threat.userAgent
        }
      })
    }).catch(error => {
      console.error('记录威胁事件失败:', error);
    });

    // 控制台日志
    if (threat.level === 'critical') {
      console.error(`🚨 关键威胁: ${threat.description} (IP: ${threat.ip})`);
    } else if (threat.level === 'high') {
      console.warn(`⚠️ 高级威胁: ${threat.description} (IP: ${threat.ip})`);
    } else if (this.config.loggingLevel === 'info') {
      console.info(`ℹ️ 威胁检测: ${threat.description} (IP: ${threat.ip})`);
    }
  }

  // 获取日志级别
  private getLogLevel(threatLevel: ThreatLevel): string {
    switch (threatLevel) {
      case 'critical': return 'critical';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  // 获取最高威胁等级
  private getMaxThreatLevel(threats: ThreatEvent[]): ThreatLevel {
    if (threats.length === 0) return 'low';

    const levels: ThreatLevel[] = ['low', 'medium', 'high', 'critical'];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (threats.some(t => t.level === levels[i])) {
        return levels[i];
      }
    }

    return 'low';
  }

  // 判断是否应该阻止请求
  private shouldBlockRequest(threatLevel: ThreatLevel, actions: string[]): boolean {
    if (!this.config.enableRealTimeBlocking) return false;

    return threatLevel === 'critical' ||
           threatLevel === 'high' ||
           actions.includes('block_request') ||
           actions.includes('block_ip');
  }

  // 执行防护动作
  private executeProtectionActions(actions: string[], ip: string, threats: ThreatEvent[]): void {
    for (const action of actions) {
      switch (action) {
        case 'block_ip':
          this.blockIP(ip, '威胁检测自动阻止', threats);
          break;
        case 'rate_limit':
          this.applyRateLimit(ip);
          break;
        case 'geo_block':
          this.applyGeoBlock(ip);
          break;
        case 'security_alert':
          this.sendSecurityAlert(threats);
          break;
        case 'increase_monitoring':
          this.increaseMonitoring(ip);
          break;
      }
    }
  }

  // 阻止IP
  private blockIP(ip: string, reason: string, threats: ThreatEvent[]): void {
    const until = Date.now() + (this.config.autoBlockDuration * 60 * 1000);
    this.blockedIPs.set(ip, { until, reason });

    console.log(`🚫 IP已阻止: ${ip} - ${reason} (时长: ${this.config.autoBlockDuration}分钟)`);
  }

  // 应用速率限制
  private applyRateLimit(ip: string): void {
    // 实现速率限制逻辑
    console.log(`🚦 对IP ${ip} 应用速率限制`);
  }

  // 应用地理阻止
  private applyGeoBlock(ip: string): void {
    // 实现地理阻止逻辑
    console.log(`🌍 对IP ${ip} 应用地理阻止`);
  }

  // 发送安全警报
  private sendSecurityAlert(threats: ThreatEvent[]): void {
    const criticalThreats = threats.filter(t => t.level === 'critical');
    const highThreats = threats.filter(t => t.level === 'high');

    if (criticalThreats.length > 0 || highThreats.length > 2) {
      console.error(`🚨 安全警报: 检测到 ${criticalThreats.length} 个关键威胁和 ${highThreats.length} 个高级威胁`);
    }
  }

  // 增加监控
  private increaseMonitoring(ip: string): void {
    // 实现增加监控逻辑
    console.log(`👁️ 增加对IP ${ip} 的监控`);
  }

  // 生成威胁ID
  private generateThreatId(): string {
    return `threat_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  // 清理过期的阻止
  private cleanupExpiredBlocks(): void {
    const now = Date.now();
    for (const [ip, block] of this.blockedIPs) {
      if (now > block.until) {
        this.blockedIPs.delete(ip);
        console.log(`✅ IP阻止已过期: ${ip}`);
      }
    }
  }

  // 清理旧的请求数据
  private cleanupOldRequestData(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [ip, timestamps] of this.requestTracker) {
      const recentTimestamps = timestamps.filter(t => t > oneHourAgo);
      if (recentTimestamps.length === 0) {
        this.requestTracker.delete(ip);
      } else {
        this.requestTracker.set(ip, recentTimestamps);
      }
    }
  }

  // 获取威胁统计
  getThreatStatistics(): {
    totalThreats: number;
    threatsByType: Record<string, number>;
    threatsByLevel: Record<string, number>;
    blockedIPs: number;
    activeMonitors: number;
    topThreatSources: Array<{ ip: string; count: number }>;
  } {
    const threatsByType: Record<string, number> = {};
    const threatsByLevel: Record<string, number> = {};
    const ipCounts = new Map<string, number>();

    for (const threat of this.threatEvents) {
      threatsByType[threat.type] = (threatsByType[threat.type] || 0) + 1;
      threatsByLevel[threat.level] = (threatsByLevel[threat.level] || 0) + 1;
      ipCounts.set(threat.ip, (ipCounts.get(threat.ip) || 0) + 1);
    }

    const topThreatSources = Array.from(ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    return {
      totalThreats: this.threatEvents.length,
      threatsByType,
      threatsByLevel,
      blockedIPs: this.blockedIPs.size,
      activeMonitors: this.requestTracker.size,
      topThreatSources
    };
  }

  // 获取阻止的IP列表
  getBlockedIPs(): Array<{ ip: string; until: number; reason: string; remainingTime: number }> {
    const now = Date.now();
    return Array.from(this.blockedIPs.entries())
      .map(([ip, block]) => ({
        ip,
        until: block.until,
        reason: block.reason,
        remainingTime: Math.max(0, block.until - now)
      }))
      .filter(block => block.remainingTime > 0);
  }

  // 手动阻止IP
  manuallyBlockIP(ip: string, reason: string, durationMinutes: number = 60): void {
    const until = Date.now() + (durationMinutes * 60 * 1000);
    this.blockedIPs.set(ip, { until, reason });
    console.log(`🚫 手动阻止IP: ${ip} - ${reason} (时长: ${durationMinutes}分钟)`);
  }

  // 解除IP阻止
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    console.log(`✅ 解除IP阻止: ${ip}`);
  }

  // 更新配置
  updateConfig(newConfig: Partial<ThreatDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 威胁检测配置已更新');
  }

  // 导出威胁数据
  exportThreatData(): {
    threats: ThreatEvent[];
    statistics: ReturnType<typeof this.getThreatStatistics>;
    blockedIPs: ReturnType<typeof this.getBlockedIPs>;
  } {
    return {
      threats: this.threatEvents,
      statistics: this.getThreatStatistics(),
      blockedIPs: this.getBlockedIPs()
    };
  }

  // 清除威胁数据
  clearThreatData(): void {
    this.threatEvents = [];
    this.ipReputationCache.clear();
    console.log('🗑️ 威胁数据已清除');
  }
}

// 导出单例实例
export const threatDetection = ThreatDetectionEngine.getInstance();

// Next.js中间件
export function createThreatDetectionMiddleware(config?: Partial<ThreatDetectionConfig>) {
  if (config) {
    threatDetection.updateConfig(config);
  }

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    // 检测威胁
    const result = await threatDetection.detectThreats(request);

    // 如果应该阻止请求
    if (result.shouldBlock) {
      return new NextResponse(
        JSON.stringify({
          error: 'Request blocked',
          reason: 'Security threat detected',
          threats: result.threats.map(t => ({
            type: t.type,
            level: t.level,
            description: t.description
          }))
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Blocked-By': 'Threat-Detection-Middleware',
            'X-Threat-Level': result.threatLevel
          }
        }
      );
    }

    // 添加安全头
    const response = NextResponse.next();
    response.headers.set('X-Threat-Checked', 'true');
    response.headers.set('X-Threat-Level', result.threatLevel);

    if (result.isThreat) {
      response.headers.set('X-Threat-Detected', 'true');
      response.headers.set('X-Threat-Actions', result.actions.join(','));
    }

    return response;
  };
}

// 导出类型
export type { ThreatEvent, IPReputation, ThreatDetectionConfig };