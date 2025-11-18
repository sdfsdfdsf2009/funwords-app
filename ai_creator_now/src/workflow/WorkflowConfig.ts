/**
 * 工作流配置管理
 * 提供环境相关的配置和设置
 */

import { SafetyLevel } from '../utils/safeErrorWorkflowController';

export interface WorkflowEnvironment {
  name: string;
  safetyLevel: SafetyLevel;
  autoStart: boolean;
  enableNotifications: boolean;
  maxConcurrentTasks: number;
  retentionDays: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableRealTimeMonitoring: boolean;
  integrationPoints: IntegrationConfig;
  customRules: CustomRule[];
}

export interface IntegrationConfig {
  reactErrorBoundary: boolean;
  apiErrorInterceptor: boolean;
  stateErrorMonitor: boolean;
  userActionTracking: boolean;
  performanceMonitoring: boolean;
  networkMonitoring: boolean;
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  type: 'error_filter' | 'auto_approval' | 'notification' | 'escalation';
  condition: string; // 可以是函数或表达式
  action: string;   // 对应的执行动作
  priority: number;
  enabled: boolean;
}

// 默认配置
export const DEFAULT_CONFIGS: Record<string, WorkflowEnvironment> = {
  development: {
    name: 'development',
    safetyLevel: SafetyLevel.CONFIRM_REQUIRED,
    autoStart: true,
    enableNotifications: true,
    maxConcurrentTasks: 5,
    retentionDays: 7,
    logLevel: 'debug',
    enableRealTimeMonitoring: true,
    integrationPoints: {
      reactErrorBoundary: true,
      apiErrorInterceptor: true,
      stateErrorMonitor: true,
      userActionTracking: true,
      performanceMonitoring: true,
      networkMonitoring: true
    },
    customRules: [
      {
        id: 'dev-auto-approve-low-risk',
        name: '自动批准低风险修复',
        description: '在开发环境中自动批准低风险的修复',
        type: 'auto_approval',
        condition: 'request.riskLevel === "low" && request.estimatedTime < 15',
        action: 'approve',
        priority: 1,
        enabled: true
      }
    ]
  },

  staging: {
    name: 'staging',
    safetyLevel: SafetyLevel.SUGGEST_ONLY,
    autoStart: true,
    enableNotifications: true,
    maxConcurrentTasks: 3,
    retentionDays: 14,
    logLevel: 'info',
    enableRealTimeMonitoring: true,
    integrationPoints: {
      reactErrorBoundary: true,
      apiErrorInterceptor: true,
      stateErrorMonitor: true,
      userActionTracking: false,
      performanceMonitoring: true,
      networkMonitoring: true
    },
    customRules: [
      {
        id: 'staging-manual-security-review',
        name: '安全问题人工审查',
        description: '所有安全问题都需要人工审查',
        type: 'error_filter',
        condition: 'error.category === "security" || error.message.includes("auth")',
        action: 'require_manual_review',
        priority: 10,
        enabled: true
      }
    ]
  },

  production: {
    name: 'production',
    safetyLevel: SafetyLevel.READ_ONLY,
    autoStart: true,
    enableNotifications: true,
    maxConcurrentTasks: 2,
    retentionDays: 30,
    logLevel: 'warn',
    enableRealTimeMonitoring: true,
    integrationPoints: {
      reactErrorBoundary: true,
      apiErrorInterceptor: true,
      stateErrorMonitor: true,
      userActionTracking: false,
      performanceMonitoring: false,
      networkMonitoring: false
    },
    customRules: [
      {
        id: 'prod-critical-errors-only',
        name: '只处理关键错误',
        description: '生产环境只处理关键错误',
        type: 'error_filter',
        condition: 'error.priority === "critical" || error.priority === "high"',
        action: 'process',
        priority: 10,
        enabled: true
      },
      {
        id: 'prod-immediate-alert',
        name: '关键错误立即告警',
        description: '关键错误立即发送告警',
        type: 'notification',
        condition: 'error.priority === "critical"',
        action: 'send_immediate_alert',
        priority: 20,
        enabled: true
      }
    ]
  },

  testing: {
    name: 'testing',
    safetyLevel: SafetyLevel.AUTO_REPAIR,
    autoStart: false,
    enableNotifications: false,
    maxConcurrentTasks: 10,
    retentionDays: 1,
    logLevel: 'debug',
    enableRealTimeMonitoring: false,
    integrationPoints: {
      reactErrorBoundary: true,
      apiErrorInterceptor: true,
      stateErrorMonitor: true,
      userActionTracking: false,
      performanceMonitoring: false,
      networkMonitoring: false
    },
    customRules: []
  }
};

export class WorkflowConfig {
  private static instance: WorkflowConfig;
  private currentConfig: WorkflowEnvironment;
  private environment: string;

  private constructor() {
    this.environment = this.detectEnvironment();
    this.currentConfig = this.getConfigForEnvironment(this.environment);
  }

  public static getInstance(): WorkflowConfig {
    if (!WorkflowConfig.instance) {
      WorkflowConfig.instance = new WorkflowConfig();
    }
    return WorkflowConfig.instance;
  }

  private detectEnvironment(): string {
    // 检测当前环境
    if (typeof window !== 'undefined') {
      // 浏览器环境
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      } else if (hostname.includes('staging') || hostname.includes('test')) {
        return 'staging';
      } else {
        return 'production';
      }
    } else {
      // Node.js环境
      return process.env.NODE_ENV || 'development';
    }
  }

  private getConfigForEnvironment(env: string): WorkflowEnvironment {
    const config = DEFAULT_CONFIGS[env];
    if (!config) {
      console.warn(`Unknown environment: ${env}, falling back to development config`);
      return DEFAULT_CONFIGS.development;
    }
    return { ...config }; // 返回副本避免意外修改
  }

  public getCurrentConfig(): WorkflowEnvironment {
    return { ...this.currentConfig };
  }

  public getEnvironment(): string {
    return this.environment;
  }

  public updateConfig(updates: Partial<WorkflowEnvironment>): void {
    this.currentConfig = { ...this.currentConfig, ...updates };
    console.log('Workflow config updated:', updates);
  }

  public setSafetyLevel(level: SafetyLevel): void {
    this.currentConfig.safetyLevel = level;
    console.log(`Safety level changed to: ${level}`);
  }

  public addCustomRule(rule: CustomRule): void {
    this.currentConfig.customRules.push(rule);
    console.log(`Custom rule added: ${rule.name}`);
  }

  public removeCustomRule(ruleId: string): void {
    const index = this.currentConfig.customRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.currentConfig.customRules.splice(index, 1);
      console.log(`Custom rule removed: ${ruleId}`);
    }
  }

  public getCustomRules(): CustomRule[] {
    return [...this.currentConfig.customRules];
  }

  public isFeatureEnabled(feature: keyof IntegrationConfig): boolean {
    return this.currentConfig.integrationPoints[feature];
  }

  public shouldLogError(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.currentConfig.logLevel);
    const errorLevel = levels.indexOf(level);
    return errorLevel >= configLevel;
  }

  public shouldProcessError(error: any): boolean {
    // 检查自定义过滤规则
    const filterRules = this.currentConfig.customRules.filter(
      rule => rule.type === 'error_filter' && rule.enabled
    );

    for (const rule of filterRules) {
      try {
        if (this.evaluateCondition(rule.condition, { error })) {
          return rule.action === 'process';
        }
      } catch (error) {
        console.warn(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    // 默认处理逻辑
    return true;
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // 简单的条件评估器
    // 在实际应用中，你可能想要使用更强大的表达式解析器

    // 替换变量
    let evaluatedCondition = condition;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      evaluatedCondition = evaluatedCondition.replace(regex, JSON.stringify(value));
    }

    try {
      // 使用 Function 构造函数安全地评估条件
      const func = new Function(`return ${evaluatedCondition}`);
      return func();
    } catch (error) {
      console.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  public exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  public importConfig(configJson: string): void {
    try {
      const imported = JSON.parse(configJson);
      this.currentConfig = { ...DEFAULT_CONFIGS[this.environment], ...imported };
      console.log('Configuration imported successfully');
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Invalid configuration JSON');
    }
  }

  public resetToDefaults(): void {
    this.currentConfig = this.getConfigForEnvironment(this.environment);
    console.log('Configuration reset to defaults');
  }

  // 预设配置模板
  public static getPresets(): Record<string, Partial<WorkflowEnvironment>> {
    return {
      'minimal': {
        safetyLevel: SafetyLevel.READ_ONLY,
        enableRealTimeMonitoring: false,
        integrationPoints: {
          reactErrorBoundary: true,
          apiErrorInterceptor: false,
          stateErrorMonitor: false,
          userActionTracking: false,
          performanceMonitoring: false,
          networkMonitoring: false
        }
      },
      'balanced': {
        safetyLevel: SafetyLevel.SUGGEST_ONLY,
        enableRealTimeMonitoring: true,
        maxConcurrentTasks: 3,
        integrationPoints: {
          reactErrorBoundary: true,
          apiErrorInterceptor: true,
          stateErrorMonitor: true,
          userActionTracking: false,
          performanceMonitoring: true,
          networkMonitoring: false
        }
      },
      'aggressive': {
        safetyLevel: SafetyLevel.CONFIRM_REQUIRED,
        enableRealTimeMonitoring: true,
        maxConcurrentTasks: 8,
        integrationPoints: {
          reactErrorBoundary: true,
          apiErrorInterceptor: true,
          stateErrorMonitor: true,
          userActionTracking: true,
          performanceMonitoring: true,
          networkMonitoring: true
        }
      }
    };
  }

  public applyPreset(presetName: string): void {
    const presets = WorkflowConfig.getPresets();
    const preset = presets[presetName];

    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }

    this.updateConfig(preset);
    console.log(`Applied preset: ${presetName}`);
  }
}

// 导出配置实例
export const workflowConfig = WorkflowConfig.getInstance();