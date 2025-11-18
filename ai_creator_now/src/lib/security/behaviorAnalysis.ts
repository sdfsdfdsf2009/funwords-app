// 行为分析系统 - 用户行为模式识别和异常检测

import { createHash, randomBytes } from 'crypto';

// 行为事件接口
export interface BehaviorEvent {
  id: string;
  userId: string;
  sessionId: string;
  type: 'click' | 'scroll' | 'key_press' | 'mouse_move' | 'page_view' | 'api_call' | 'form_submit' | 'login' | 'logout';
  timestamp: number;
  data: {
    url?: string;
    element?: string;
    value?: any;
    duration?: number;
    position?: { x: number; y: number };
    scrollDepth?: number;
    keystrokes?: number;
    mouseDistance?: number;
    apiEndpoint?: string;
    responseTime?: number;
    statusCode?: number;
  };
  context: {
    userAgent: string;
    ip: string;
    screenResolution: string;
    timezone: string;
    language: string;
    referrer?: string;
  };
}

// 行为模式接口
export interface BehaviorPattern {
  userId: string;
  patterns: {
    typicalActivityHours: number[];
    averageSessionDuration: number;
    commonPaths: string[];
    clickPatterns: {
      frequentElements: Array<{ element: string; frequency: number }>;
      averageClickSpeed: number;
      heatmapData: Array<{ x: number; y: number; intensity: number }>;
    };
    typingPatterns: {
      averageTypingSpeed: number;
      commonErrors: string[];
      backspaceFrequency: number;
    };
    navigationPatterns: {
      pageTransitionTimes: Record<string, number>;
      bounceRate: number;
      exitPages: string[];
    };
  };
  lastUpdated: number;
  confidence: number;
}

// 异常行为接口
export interface AnomalousBehavior {
  id: string;
  userId: string;
  sessionId: string;
  type: 'unusual_access_time' | 'rapid_clicking' | 'atypical_navigation' | 'suspicious_api_calls' | 'session_hijacking' | 'brute_force_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  events: BehaviorEvent[];
  detectedAt: number;
  actions: string[];
  resolved: boolean;
}

// 行为分析配置
interface BehaviorAnalysisConfig {
  enableRealTimeAnalysis: boolean;
  anomalyThreshold: number;
  sessionTimeout: number;
  maxEventsPerSession: number;
  enableMLAnalysis: boolean;
  enableHeatmapGeneration: boolean;
  retentionPeriod: number; // days
}

export class BehaviorAnalysisEngine {
  private static instance: BehaviorAnalysisEngine;
  private events: BehaviorEvent[] = [];
  private patterns: Map<string, BehaviorPattern> = new Map();
  private anomalies: AnomalousBehavior[] = [];
  private config: BehaviorAnalysisConfig;
  private analysisInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      enableRealTimeAnalysis: true,
      anomalyThreshold: 0.7,
      sessionTimeout: 30 * 60 * 1000, // 30分钟
      maxEventsPerSession: 10000,
      enableMLAnalysis: false, // ML功能需要额外配置
      enableHeatmapGeneration: true,
      retentionPeriod: 90 // 90天
    };

    this.startAnalysisEngine();
  }

  static getInstance(): BehaviorAnalysisEngine {
    if (!BehaviorAnalysisEngine.instance) {
      BehaviorAnalysisEngine.instance = new BehaviorAnalysisEngine();
    }
    return BehaviorAnalysisEngine.instance;
  }

  // 启动分析引擎
  private startAnalysisEngine(): void {
    if (this.config.enableRealTimeAnalysis) {
      // 每分钟分析一次行为数据
      this.analysisInterval = setInterval(() => {
        this.analyzeBehaviorPatterns();
        this.detectAnomalies();
        this.cleanupOldData();
      }, 60 * 1000);
    }

    console.log('🔍 行为分析引擎已启动');
  }

  // 记录行为事件
  recordEvent(event: Omit<BehaviorEvent, 'id' | 'timestamp'>): void {
    const fullEvent: BehaviorEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // 实时分析（如果启用）
    if (this.config.enableRealTimeAnalysis) {
      this.performRealTimeAnalysis(fullEvent);
    }

    // 限制事件数量
    if (this.events.length > this.config.maxEventsPerSession) {
      this.events = this.events.slice(-this.config.maxEventsPerSession);
    }
  }

  // 生成事件ID
  private generateEventId(): string {
    return `evt_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  // 实时分析
  private performRealTimeAnalysis(event: BehaviorEvent): void {
    // 检测快速点击
    if (event.type === 'click') {
      this.detectRapidClicking(event);
    }

    // 检测异常API调用
    if (event.type === 'api_call') {
      this.detectSuspiciousApiCalls(event);
    }

    // 检测异常访问时间
    this.detectUnusualAccessTime(event);
  }

  // 检测快速点击
  private detectRapidClicking(event: BehaviorEvent): void {
    const recentClicks = this.events.filter(e =>
      e.type === 'click' &&
      e.userId === event.userId &&
      e.timestamp > event.timestamp - 1000 // 1秒内
    );

    if (recentClicks.length > 20) { // 1秒内超过20次点击
      this.createAnomaly({
        id: this.generateAnomalyId(),
        userId: event.userId,
        sessionId: event.sessionId,
        type: 'rapid_clicking',
        severity: 'medium',
        confidence: 0.8,
        description: `检测到异常快速点击行为：${recentClicks.length}次/秒`,
        events: recentClicks,
        detectedAt: Date.now(),
        actions: ['log_warning', 'rate_limit_user'],
        resolved: false
      });
    }
  }

  // 检测可疑API调用
  private detectSuspiciousApiCalls(event: BehaviorEvent): void {
    if (event.data.statusCode && event.data.statusCode >= 400) {
      const recentFailures = this.events.filter(e =>
        e.type === 'api_call' &&
        e.userId === event.userId &&
        e.data.statusCode &&
        e.data.statusCode >= 400 &&
        e.timestamp > event.timestamp - 60000 // 1分钟内
      );

      if (recentFailures.length > 10) { // 1分钟内超过10次失败
        this.createAnomaly({
          id: this.generateAnomalyId(),
          userId: event.userId,
          sessionId: event.sessionId,
          type: 'suspicious_api_calls',
          severity: 'high',
          confidence: 0.9,
          description: `检测到可疑API调用模式：${recentFailures.length}次失败调用/分钟`,
          events: recentFailures,
          detectedAt: Date.now(),
          actions: ['log_security_event', 'temporarily_block_user'],
          resolved: false
        });
      }
    }
  }

  // 检测异常访问时间
  private detectUnusualAccessTime(event: BehaviorEvent): void {
    const hour = new Date(event.timestamp).getHours();
    const userPattern = this.patterns.get(event.userId);

    if (userPattern && userPattern.patterns.typicalActivityHours.length > 0) {
      const isUnusualTime = !userPattern.patterns.typicalActivityHours.includes(hour);

      if (isUnusualTime) {
        const recentUnusualAccess = this.anomalies.filter(a =>
          a.userId === event.userId &&
          a.type === 'unusual_access_time' &&
          a.detectedAt > event.timestamp - 24 * 60 * 60 * 1000 // 24小时内
        );

        if (recentUnusualAccess.length === 0) { // 首次检测到异常时间访问
          this.createAnomaly({
            id: this.generateAnomalyId(),
            userId: event.userId,
            sessionId: event.sessionId,
            type: 'unusual_access_time',
            severity: 'low',
            confidence: 0.6,
            description: `用户在异常时间访问：${hour}:00`,
            events: [event],
            detectedAt: Date.now(),
            actions: ['log_info'],
            resolved: false
          });
        }
      }
    }
  }

  // 分析行为模式
  private analyzeBehaviorPatterns(): void {
    const userEvents = this.groupEventsByUser();

    for (const [userId, events] of userEvents) {
      const pattern = this.calculateBehaviorPattern(userId, events);
      this.patterns.set(userId, pattern);
    }
  }

  // 按用户分组事件
  private groupEventsByUser(): Map<string, BehaviorEvent[]> {
    const userEvents = new Map<string, BehaviorEvent[]>();

    for (const event of this.events) {
      if (!userEvents.has(event.userId)) {
        userEvents.set(event.userId, []);
      }
      userEvents.get(event.userId)!.push(event);
    }

    return userEvents;
  }

  // 计算行为模式
  private calculateBehaviorPattern(userId: string, events: BehaviorEvent[]): BehaviorPattern {
    const pattern: BehaviorPattern = {
      userId,
      patterns: {
        typicalActivityHours: this.calculateActivityHours(events),
        averageSessionDuration: this.calculateAverageSessionDuration(events),
        commonPaths: this.calculateCommonPaths(events),
        clickPatterns: this.calculateClickPatterns(events),
        typingPatterns: this.calculateTypingPatterns(events),
        navigationPatterns: this.calculateNavigationPatterns(events)
      },
      lastUpdated: Date.now(),
      confidence: 0.8 // 基于数据量计算
    };

    return pattern;
  }

  // 计算活跃时间
  private calculateActivityHours(events: BehaviorEvent[]): number[] {
    const hourCounts = new Map<number, number>();

    for (const event of events) {
      const hour = new Date(event.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    // 返回活跃次数最多的时间段
    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([hour]) => hour);
  }

  // 计算平均会话时长
  private calculateAverageSessionDuration(events: BehaviorEvent[]): number {
    const sessionDurations: number[] = [];
    const sessions = this.groupEventsBySession(events);

    for (const sessionEvents of sessions.values()) {
      if (sessionEvents.length > 1) {
        const duration = sessionEvents[sessionEvents.length - 1].timestamp - sessionEvents[0].timestamp;
        sessionDurations.push(duration);
      }
    }

    return sessionDurations.length > 0
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0;
  }

  // 按会话分组事件
  private groupEventsBySession(events: BehaviorEvent[]): Map<string, BehaviorEvent[]> {
    const sessions = new Map<string, BehaviorEvent[]>();

    for (const event of events) {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId)!.push(event);
    }

    return sessions;
  }

  // 计算常见路径
  private calculateCommonPaths(events: BehaviorEvent[]): string[] {
    const pathCounts = new Map<string, number>();

    for (const event of events) {
      if (event.data.url) {
        pathCounts.set(event.data.url, (pathCounts.get(event.data.url) || 0) + 1);
      }
    }

    return Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path]) => path);
  }

  // 计算点击模式
  private calculateClickPatterns(events: BehaviorEvent[]) {
    const clickEvents = events.filter(e => e.type === 'click');
    const elementCounts = new Map<string, number>();
    let totalClickSpeed = 0;
    const heatmapData: Array<{ x: number; y: number; intensity: number }> = [];

    for (let i = 0; i < clickEvents.length; i++) {
      const event = clickEvents[i];

      // 统计元素点击频率
      if (event.data.element) {
        elementCounts.set(event.data.element, (elementCounts.get(event.data.element) || 0) + 1);
      }

      // 计算点击速度
      if (i > 0) {
        const timeDiff = event.timestamp - clickEvents[i - 1].timestamp;
        totalClickSpeed += timeDiff;
      }

      // 热力图数据
      if (event.data.position) {
        const existingPoint = heatmapData.find(p =>
          Math.abs(p.x - event.data.position!.x) < 50 &&
          Math.abs(p.y - event.data.position!.y) < 50
        );

        if (existingPoint) {
          existingPoint.intensity++;
        } else {
          heatmapData.push({
            x: event.data.position.x,
            y: event.data.position.y,
            intensity: 1
          });
        }
      }
    }

    return {
      frequentElements: Array.from(elementCounts.entries())
        .map(([element, frequency]) => ({ element, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20),
      averageClickSpeed: clickEvents.length > 1 ? totalClickSpeed / (clickEvents.length - 1) : 0,
      heatmapData
    };
  }

  // 计算输入模式
  private calculateTypingPatterns(events: BehaviorEvent[]) {
    const keyEvents = events.filter(e => e.type === 'key_press');
    let totalTypingSpeed = 0;
    let backspaceCount = 0;
    const commonErrors: string[] = [];

    for (let i = 1; i < keyEvents.length; i++) {
      const timeDiff = keyEvents[i].timestamp - keyEvents[i - 1].timestamp;
      totalTypingSpeed += timeDiff;

      // 检测退格键使用（作为错误指标）
      if (keyEvents[i].data.value === 'Backspace') {
        backspaceCount++;
      }
    }

    return {
      averageTypingSpeed: keyEvents.length > 1 ? 1000 / (totalTypingSpeed / (keyEvents.length - 1)) : 0,
      commonErrors,
      backspaceFrequency: keyEvents.length > 0 ? backspaceCount / keyEvents.length : 0
    };
  }

  // 计算导航模式
  private calculateNavigationPatterns(events: BehaviorEvent[]) {
    const pageViewEvents = events.filter(e => e.type === 'page_view');
    const transitionTimes: Record<string, number> = {};
    const exitPages: string[] = [];
    let bounceCount = 0;

    for (let i = 1; i < pageViewEvents.length; i++) {
      const currentEvent = pageViewEvents[i];
      const previousEvent = pageViewEvents[i - 1];

      if (previousEvent.data.url && currentEvent.data.url) {
        const transitionTime = currentEvent.timestamp - previousEvent.timestamp;
        const key = `${previousEvent.data.url} → ${currentEvent.data.url}`;
        transitionTimes[key] = (transitionTimes[key] || 0) + transitionTime;
      }
    }

    // 计算跳出率（单页面会话）
    const sessions = this.groupEventsBySession(pageViewEvents);
    for (const sessionEvents of sessions.values()) {
      if (sessionEvents.length === 1) {
        bounceCount++;
      } else if (sessionEvents.length > 0) {
        exitPages.push(sessionEvents[sessionEvents.length - 1].data.url || '');
      }
    }

    return {
      pageTransitionTimes: transitionTimes,
      bounceRate: sessions.size > 0 ? bounceCount / sessions.size : 0,
      exitPages: [...new Set(exitPages)]
    };
  }

  // 检测异常
  private detectAnomalies(): void {
    // 检测会话劫持
    this.detectSessionHijacking();

    // 检测暴力破解尝试
    this.detectBruteForceAttempts();

    // 检测异常导航模式
    this.detectAtypicalNavigation();
  }

  // 检测会话劫持
  private detectSessionHijacking(): void {
    const userSessions = new Map<string, Set<string>>();

    for (const event of this.events) {
      if (!userSessions.has(event.userId)) {
        userSessions.set(event.userId, new Set());
      }
      userSessions.get(event.userId)!.add(event.sessionId);
    }

    for (const [userId, sessions] of userSessions) {
      if (sessions.size > 3) { // 同一用户同时存在超过3个会话
        const recentEvents = this.events.filter(e =>
          e.userId === userId &&
          e.timestamp > Date.now() - 5 * 60 * 1000 // 5分钟内
        );

        this.createAnomaly({
          id: this.generateAnomalyId(),
          userId,
          sessionId: Array.from(sessions)[0],
          type: 'session_hijacking',
          severity: 'critical',
          confidence: 0.9,
          description: `检测到可能的会话劫持：同时存在${sessions.size}个活跃会话`,
          events: recentEvents,
          detectedAt: Date.now(),
          actions: ['immediate_block', 'security_alert', 'force_logout_all_sessions'],
          resolved: false
        });
      }
    }
  }

  // 检测暴力破解尝试
  private detectBruteForceAttempts(): void {
    const loginEvents = this.events.filter(e => e.type === 'login');
    const failedLogins = loginEvents.filter(e => e.data.statusCode === 401);

    // 按IP和用户分组失败登录
    const ipFailures = new Map<string, BehaviorEvent[]>();
    const userFailures = new Map<string, BehaviorEvent[]>();

    for (const event of failedLogins) {
      const ip = event.context.ip;
      const userId = event.userId;

      if (!ipFailures.has(ip)) ipFailures.set(ip, []);
      if (!userFailures.has(userId)) userFailures.set(userId, []);

      ipFailures.get(ip)!.push(event);
      userFailures.get(userId)!.push(event);
    }

    // 检测IP暴力破解
    for (const [ip, events] of ipFailures) {
      if (events.length > 10) { // 同一IP失败登录超过10次
        this.createAnomaly({
          id: this.generateAnomalyId(),
          userId: events[0].userId,
          sessionId: events[0].sessionId,
          type: 'brute_force_attempt',
          severity: 'high',
          confidence: 0.95,
          description: `检测到暴力破解尝试：IP ${ip} 失败登录${events.length}次`,
          events,
          detectedAt: Date.now(),
          actions: ['block_ip', 'security_alert', 'increase_captcha_difficulty'],
          resolved: false
        });
      }
    }

    // 检测用户暴力破解
    for (const [userId, events] of userFailures) {
      if (events.length > 5) { // 同一用户失败登录超过5次
        this.createAnomaly({
          id: this.generateAnomalyId(),
          userId,
          sessionId: events[0].sessionId,
          type: 'brute_force_attempt',
          severity: 'medium',
          confidence: 0.8,
          description: `检测到针对用户 ${userId} 的暴力破解尝试：${events.length}次失败`,
          events,
          detectedAt: Date.now(),
          actions: ['lock_account_temporarily', 'security_alert'],
          resolved: false
        });
      }
    }
  }

  // 检测异常导航模式
  private detectAtypicalNavigation(): void {
    for (const [userId, pattern] of this.patterns) {
      const recentEvents = this.events.filter(e =>
        e.userId === userId &&
        e.type === 'page_view' &&
        e.timestamp > Date.now() - 60 * 60 * 1000 // 1小时内
      );

      if (recentEvents.length > 0) {
        const currentPaths = recentEvents.map(e => e.data.url).filter(Boolean);
        const unusualPaths = currentPaths.filter(path =>
          !pattern.patterns.commonPaths.includes(path!)
        );

        if (unusualPaths.length > pattern.patterns.commonPaths.length * 2) {
          this.createAnomaly({
            id: this.generateAnomalyId(),
            userId,
            sessionId: recentEvents[0].sessionId,
            type: 'atypical_navigation',
            severity: 'low',
            confidence: 0.6,
            description: `检测到异常导航模式：访问${unusualPaths.length}个不常见页面`,
            events: recentEvents,
            detectedAt: Date.now(),
            actions: ['log_info', 'increase_monitoring'],
            resolved: false
          });
        }
      }
    }
  }

  // 创建异常记录
  private createAnomaly(anomaly: AnomalousBehavior): void {
    this.anomalies.push(anomaly);

    // 执行安全响应动作
    this.executeSecurityActions(anomaly);

    // 记录到系统日志
    this.logSecurityEvent(anomaly);
  }

  // 执行安全动作
  private executeSecurityActions(anomaly: AnomalousBehavior): void {
    for (const action of anomaly.actions) {
      switch (action) {
        case 'log_warning':
          console.warn(`🚨 行为异常警告: ${anomaly.description}`);
          break;
        case 'log_security_event':
          console.error(`🛡️ 安全事件: ${anomaly.description}`);
          break;
        case 'rate_limit_user':
          // 实施速率限制
          this.applyRateLimit(anomaly.userId);
          break;
        case 'temporarily_block_user':
          // 临时阻止用户
          this.temporaryBlockUser(anomaly.userId);
          break;
        case 'block_ip':
          // 阻止IP地址
          this.blockIPAddress(anomaly.events[0]?.context.ip || '');
          break;
        case 'security_alert':
          // 发送安全警报
          this.sendSecurityAlert(anomaly);
          break;
        case 'immediate_block':
          // 立即阻止
          this.immediateBlock(anomaly.userId);
          break;
        case 'force_logout_all_sessions':
          // 强制登出所有会话
          this.forceLogoutAllSessions(anomaly.userId);
          break;
        case 'lock_account_temporarily':
          // 临时锁定账户
          this.lockAccountTemporarily(anomaly.userId);
          break;
        case 'increase_captcha_difficulty':
          // 增加验证码难度
          this.increaseCaptchaDifficulty(anomaly.events[0]?.context.ip || '');
          break;
        case 'increase_monitoring':
          // 增加监控
          this.increaseMonitoring(anomaly.userId);
          break;
        case 'log_info':
          console.info(`ℹ️ 行为分析信息: ${anomaly.description}`);
          break;
      }
    }
  }

  // 安全动作实现（示例）
  private applyRateLimit(userId: string): void {
    // 实现速率限制逻辑
    console.log(`🚦 对用户 ${userId} 实施速率限制`);
  }

  private temporaryBlockUser(userId: string): void {
    // 实现临时用户阻止逻辑
    console.log(`🚫 临时阻止用户 ${userId}`);
  }

  private blockIPAddress(ip: string): void {
    // 实现IP阻止逻辑
    console.log(`🌐 阻止IP地址 ${ip}`);
  }

  private sendSecurityAlert(anomaly: AnomalousBehavior): void {
    // 实现安全警报发送逻辑
    console.log(`📢 发送安全警报: ${anomaly.description}`);
  }

  private immediateBlock(userId: string): void {
    // 实现立即阻止逻辑
    console.log(`⛔ 立即阻止用户 ${userId}`);
  }

  private forceLogoutAllSessions(userId: string): void {
    // 实现强制登出逻辑
    console.log(`🚪 强制用户 ${userId} 登出所有会话`);
  }

  private lockAccountTemporarily(userId: string): void {
    // 实现账户临时锁定逻辑
    console.log(`🔒 临时锁定用户账户 ${userId}`);
  }

  private increaseCaptchaDifficulty(ip: string): void {
    // 实现验证码难度增加逻辑
    console.log(`🧩 增加IP ${ip} 的验证码难度`);
  }

  private increaseMonitoring(userId: string): void {
    // 实现监控增加逻辑
    console.log(`👁️ 增加对用户 ${userId} 的监控`);
  }

  // 记录安全事件到日志
  private logSecurityEvent(anomaly: AnomalousBehavior): void {
    // 发送到系统日志API
    fetch('/api/system-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: anomaly.severity === 'critical' ? 'critical' :
               anomaly.severity === 'high' ? 'error' : 'warning',
        message: `行为安全事件: ${anomaly.description}`,
        category: 'security_behavior',
        metadata: {
          anomalyId: anomaly.id,
          userId: anomaly.userId,
          type: anomaly.type,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
          eventCount: anomaly.events.length
        }
      })
    }).catch(error => {
      console.error('记录安全事件失败:', error);
    });
  }

  // 生成异常ID
  private generateAnomalyId(): string {
    return `anom_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  // 清理旧数据
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);

    // 清理事件
    this.events = this.events.filter(event => event.timestamp > cutoffTime);

    // 清理异常
    this.anomalies = this.anomalies.filter(anomaly => anomaly.detectedAt > cutoffTime);

    // 清理模式（保留更长时间）
    const patternCutoffTime = Date.now() - (this.config.retentionPeriod * 2 * 24 * 60 * 60 * 1000);
    for (const [userId, pattern] of this.patterns) {
      if (pattern.lastUpdated < patternCutoffTime) {
        this.patterns.delete(userId);
      }
    }
  }

  // 获取用户行为模式
  getBehaviorPattern(userId: string): BehaviorPattern | null {
    return this.patterns.get(userId) || null;
  }

  // 获取用户异常行为
  getAnomalousBehaviors(userId?: string, resolved?: boolean): AnomalousBehavior[] {
    let anomalies = this.anomalies;

    if (userId) {
      anomalies = anomalies.filter(a => a.userId === userId);
    }

    if (resolved !== undefined) {
      anomalies = anomalies.filter(a => a.resolved === resolved);
    }

    return anomalies.sort((a, b) => b.detectedAt - a.detectedAt);
  }

  // 获取行为统计
  getBehaviorStatistics(): {
    totalEvents: number;
    totalAnomalies: number;
    anomaliesByType: Record<string, number>;
    anomaliesBySeverity: Record<string, number>;
    activeUsers: number;
    analyzedUsers: number;
  } {
    const anomaliesByType: Record<string, number> = {};
    const anomaliesBySeverity: Record<string, number> = {};

    for (const anomaly of this.anomalies) {
      anomaliesByType[anomaly.type] = (anomaliesByType[anomaly.type] || 0) + 1;
      anomaliesBySeverity[anomaly.severity] = (anomaliesBySeverity[anomaly.severity] || 0) + 1;
    }

    const activeUsers = new Set(this.events.map(e => e.userId)).size;

    return {
      totalEvents: this.events.length,
      totalAnomalies: this.anomalies.length,
      anomaliesByType,
      anomaliesBySeverity,
      activeUsers,
      analyzedUsers: this.patterns.size
    };
  }

  // 解决异常
  resolveAnomaly(anomalyId: string, resolution: string): void {
    const anomaly = this.anomalies.find(a => a.id === anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      console.log(`✅ 异常已解决: ${anomalyId} - ${resolution}`);
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<BehaviorAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 重启分析引擎
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    this.startAnalysisEngine();
  }

  // 导出数据
  exportData(): {
    events: BehaviorEvent[];
    patterns: BehaviorPattern[];
    anomalies: AnomalousBehavior[];
    statistics: ReturnType<typeof this.getBehaviorStatistics>;
  } {
    return {
      events: this.events,
      patterns: Array.from(this.patterns.values()),
      anomalies: this.anomalies,
      statistics: this.getBehaviorStatistics()
    };
  }

  // 停止分析引擎
  stop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    console.log('⏹️ 行为分析引擎已停止');
  }
}

// 导出单例实例
export const behaviorAnalysis = BehaviorAnalysisEngine.getInstance();

// 客户端行为收集器
export class BehaviorCollector {
  private static instance: BehaviorCollector;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private isCollecting = false;
  private eventQueue: BehaviorEvent[] = [];
  private sendInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): BehaviorCollector {
    if (!BehaviorCollector.instance) {
      BehaviorCollector.instance = new BehaviorCollector();
    }
    return BehaviorCollector.instance;
  }

  // 开始收集行为数据
  startCollection(userId: string): void {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.isCollecting = true;

    // 添加页面加载事件
    this.recordEvent('page_view', {
      url: window.location.href,
      referrer: document.referrer
    });

    // 设置事件监听器
    this.setupEventListeners();

    // 定期发送事件
    this.sendInterval = setInterval(() => {
      this.sendEvents();
    }, 5000); // 每5秒发送一次

    console.log('📊 开始收集行为数据');
  }

  // 停止收集
  stopCollection(): void {
    this.isCollecting = false;

    // 移除事件监听器
    this.removeEventListeners();

    // 发送剩余事件
    this.sendEvents();

    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }

    console.log('⏹️ 停止收集行为数据');
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `sess_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    // 点击事件
    document.addEventListener('click', this.handleClick.bind(this));

    // 滚动事件
    window.addEventListener('scroll', this.handleScroll.bind(this));

    // 键盘事件
    document.addEventListener('keydown', this.handleKeyPress.bind(this));

    // 鼠标移动事件（节流）
    let mouseMoveTimeout: NodeJS.Timeout;
    document.addEventListener('mousemove', (e) => {
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => {
        this.handleMouseMove(e);
      }, 100);
    });

    // 页面可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // 页面卸载
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
  }

  // 移除事件监听器
  private removeEventListeners(): void {
    document.removeEventListener('click', this.handleClick.bind(this));
    window.removeEventListener('scroll', this.handleScroll.bind(this));
    document.removeEventListener('keydown', this.handleKeyPress.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handlePageUnload.bind(this));
  }

  // 处理点击事件
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const element = this.getElementSelector(target);

    this.recordEvent('click', {
      element,
      position: { x: event.clientX, y: event.clientY }
    });
  }

  // 处理滚动事件
  private handleScroll(): void {
    const scrollDepth = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );

    this.recordEvent('scroll', {
      scrollDepth,
      position: { x: window.scrollX, y: window.scrollY }
    });
  }

  // 处理键盘事件
  private handleKeyPress(event: KeyboardEvent): void {
    this.recordEvent('key_press', {
      value: event.key
    });
  }

  // 处理鼠标移动事件
  private handleMouseMove(event: MouseEvent): void {
    this.recordEvent('mouse_move', {
      position: { x: event.clientX, y: event.clientY }
    });
  }

  // 处理页面可见性变化
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.recordEvent('page_view', {
        url: window.location.href,
        duration: Date.now() - (this.sessionId ? parseInt(this.sessionId.split('_')[1]) : Date.now())
      });
    }
  }

  // 处理页面卸载
  private handlePageUnload(): void {
    this.sendEvents(); // 确保在页面卸载前发送所有事件
  }

  // 获取元素选择器
  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      return `.${element.className.split(' ')[0]}`;
    }

    return element.tagName.toLowerCase();
  }

  // 记录事件
  private recordEvent(type: BehaviorEvent['type'], data: any): void {
    if (!this.isCollecting || !this.userId || !this.sessionId) return;

    const event: BehaviorEvent = {
      id: this.generateEventId(),
      userId: this.userId,
      sessionId: this.sessionId,
      type,
      timestamp: Date.now(),
      data,
      context: {
        userAgent: navigator.userAgent,
        ip: '', // 将在服务器端填充
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        referrer: document.referrer
      }
    };

    this.eventQueue.push(event);
  }

  // 生成事件ID
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 发送事件到服务器
  private async sendEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch('/api/behavior/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend })
      });
    } catch (error) {
      console.error('发送行为事件失败:', error);
      // 如果发送失败，将事件重新加入队列
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  // 记录API调用
  recordApiCall(endpoint: string, responseTime: number, statusCode: number): void {
    this.recordEvent('api_call', {
      apiEndpoint: endpoint,
      responseTime,
      statusCode
    });
  }

  // 记录表单提交
  recordFormSubmit(formId: string, data: any): void {
    this.recordEvent('form_submit', {
      element: `form#${formId}`,
      value: data
    });
  }

  // 记录登录事件
  recordLogin(success: boolean, statusCode?: number): void {
    this.recordEvent('login', {
      statusCode: success ? 200 : (statusCode || 401)
    });
  }

  // 记录登出事件
  recordLogout(): void {
    this.recordEvent('logout', {});
  }
}

// 导出单例实例
export const behaviorCollector = BehaviorCollector.getInstance();

// 导出类型
export type { BehaviorEvent, BehaviorPattern, AnomalousBehavior, BehaviorAnalysisConfig };