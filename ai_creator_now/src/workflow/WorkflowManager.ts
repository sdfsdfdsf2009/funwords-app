/**
 * 工作流管理器
 * 统一管理所有工作流相关的功能和集成
 */

import { safeErrorWorkflowController, SafetyLevel } from '../utils/safeErrorWorkflowController';
import { errorMonitor } from '../utils/errorMonitor';
import { workflowConfig, WorkflowEnvironment } from './WorkflowConfig';
import { ErrorAnalyzer } from './utils/ErrorAnalyzer';
import { createWorkflowLogger } from './utils/WorkflowLogger';

export interface WorkflowManagerConfig {
  autoStart?: boolean;
  environment?: string;
  safetyLevel?: SafetyLevel;
  customRules?: any[];
}

export class WorkflowManager {
  private static instance: WorkflowManager;
  private isRunning: boolean = false;
  private errorAnalyzer: ErrorAnalyzer;
  private logger: any;
  private config: WorkflowEnvironment;
  private monitoringIntervals: NodeJS.Timeout[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor(config?: WorkflowManagerConfig) {
    this.config = workflowConfig.getCurrentConfig();
    this.errorAnalyzer = new ErrorAnalyzer(this.config);
    this.logger = createWorkflowLogger(this.config.logLevel);

    // 应用配置覆盖
    if (config) {
      this.applyConfig(config);
    }

    this.initializeEventListeners();
  }

  public static getInstance(config?: WorkflowManagerConfig): WorkflowManager {
    if (!WorkflowManager.instance) {
      WorkflowManager.instance = new WorkflowManager(config);
    }
    return WorkflowManager.instance;
  }

  /**
   * 启动工作流管理器
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('WorkflowManager is already running');
      return;
    }

    try {
      this.logger.info('Starting WorkflowManager...');

      // 启动安全工作流控制器
      safeErrorWorkflowController.setSafetyLevel(this.config.safetyLevel);
      safeErrorWorkflowController.start();

      // 启动监控
      if (this.config.enableRealTimeMonitoring) {
        this.startMonitoring();
      }

      // 集成错误监控
      this.integrateErrorMonitoring();

      this.isRunning = true;
      this.logger.info(`WorkflowManager started successfully in ${this.config.name} environment`);

      // 触发启动事件
      this.emitEvent('manager_started', {
        environment: this.config.name,
        safetyLevel: this.config.safetyLevel,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Failed to start WorkflowManager:', error);
      throw error;
    }
  }

  /**
   * 停止工作流管理器
   */
  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn('WorkflowManager is not running');
      return;
    }

    try {
      this.logger.info('Stopping WorkflowManager...');

      // 停止监控
      this.stopMonitoring();

      // 停止工作流控制器
      safeErrorWorkflowController.stop();

      this.isRunning = false;
      this.logger.info('WorkflowManager stopped');

      // 触发停止事件
      this.emitEvent('manager_stopped', {
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('Error stopping WorkflowManager:', error);
    }
  }

  /**
   * 处理错误
   */
  public async handleError(error: any, context?: any): Promise<string | null> {
    if (!this.isRunning) {
      this.logger.warn('WorkflowManager is not running, error not processed');
      return null;
    }

    try {
      // 检查是否应该处理这个错误
      if (!this.config.shouldProcessError(error)) {
        this.logger.debug('Error filtered out by custom rules:', error);
        return null;
      }

      // 分析错误
      const analysis = await this.errorAnalyzer.analyzeError(error, context);

      // 记录错误
      this.logger.info('Processing error:', {
        type: analysis.type,
        severity: analysis.severity,
        category: analysis.category,
        message: error.message
      });

      // 触发工作流
      const taskId = await safeErrorWorkflowController.triggerSafeWorkflow({
        ...error,
        ...analysis,
        context: {
          ...context,
          analyzedAt: new Date(),
          managerVersion: '1.0.0'
        }
      });

      // 触发错误处理事件
      this.emitEvent('error_processed', {
        taskId,
        error,
        analysis,
        timestamp: new Date()
      });

      return taskId;

    } catch (error) {
      this.logger.error('Error in handleError:', error);
      return null;
    }
  }

  /**
   * 手动触发工作流
   */
  public async triggerWorkflow(errorInfo: any, context?: any): Promise<string> {
    if (!this.isRunning) {
      throw new Error('WorkflowManager is not running');
    }

    this.logger.info('Manual workflow trigger:', errorInfo);

    const taskId = await this.handleError(errorInfo, context);

    if (!taskId) {
      throw new Error('Failed to trigger workflow');
    }

    return taskId;
  }

  /**
   * 获取工作流统计
   */
  public getStats() {
    const workflowStats = safeErrorWorkflowController.getWorkflowStats();
    const controllerStatus = safeErrorWorkflowController.getControllerStatus();

    return {
      ...workflowStats,
      manager: {
        isRunning: this.isRunning,
        environment: this.config.name,
        safetyLevel: this.config.safetyLevel,
        uptime: this.isRunning ? Date.now() - (this as any).startTime : 0
      },
      controller: controllerStatus,
      config: {
        maxConcurrentTasks: this.config.maxConcurrentTasks,
        enableNotifications: this.config.enableNotifications,
        customRules: this.config.customRules.length
      }
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<WorkflowEnvironment>): void {
    const oldSafetyLevel = this.config.safetyLevel;

    workflowConfig.updateConfig(updates);
    this.config = workflowConfig.getCurrentConfig();

    // 如果安全级别改变，更新控制器
    if (updates.safetyLevel && updates.safetyLevel !== oldSafetyLevel) {
      safeErrorWorkflowController.setSafetyLevel(updates.safetyLevel);
      this.logger.info(`Safety level updated: ${oldSafetyLevel} -> ${updates.safetyLevel}`);
    }

    // 如果监控设置改变，重新启动监控
    if (updates.enableRealTimeMonitoring !== undefined) {
      if (this.isRunning) {
        this.stopMonitoring();
        if (updates.enableRealTimeMonitoring) {
          this.startMonitoring();
        }
      }
    }

    this.emitEvent('config_updated', {
      updates,
      timestamp: new Date()
    });
  }

  /**
   * 获取待确认请求
   */
  public getPendingConfirmations() {
    return safeErrorWorkflowController.getPendingConfirmations();
  }

  /**
   * 处理确认请求
   */
  public async handleConfirmation(requestId: string, result: any): Promise<void> {
    await safeErrorWorkflowController.handleConfirmation(requestId, result);

    this.emitEvent('confirmation_handled', {
      requestId,
      approved: result.approved,
      timestamp: new Date()
    });
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 获取错误分析器
   */
  public getErrorAnalyzer(): ErrorAnalyzer {
    return this.errorAnalyzer;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): WorkflowEnvironment {
    return { ...this.config };
  }

  // 私有方法

  private applyConfig(config: WorkflowManagerConfig): void {
    if (config.environment) {
      // 切换环境配置
      const envConfig = (workflowConfig as any).getConfigForEnvironment(config.environment);
      this.config = { ...envConfig };
    }

    if (config.safetyLevel) {
      this.config.safetyLevel = config.safetyLevel;
    }

    if (config.customRules) {
      this.config.customRules = [...this.config.customRules, ...config.customRules];
    }

    workflowConfig.updateConfig(this.config);
  }

  private initializeEventListeners(): void {
    // 监听工作流控制器事件
    const controllerEvents = [
      'WORKFLOW_TRIGGERED',
      'WORKFLOW_COMPLETED',
      'WORKFLOW_FAILED',
      'STAGE_UPDATED'
    ];

    controllerEvents.forEach(eventType => {
      safeErrorWorkflowController.addEventListener(eventType as any, (event: any) => {
        this.emitEvent(eventType.toLowerCase(), event);
      });
    });
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    // 记录重要事件
    if (this.config.shouldLogEvent(event)) {
      this.logger.info(`Event: ${event}`, data);
    }
  }

  private startMonitoring(): void {
    // 定期清理过期请求
    const cleanupInterval = setInterval(() => {
      safeErrorWorkflowController.cleanupExpiredRequests();
    }, 5 * 60 * 1000); // 每5分钟清理一次

    // 定期收集统计信息
    const statsInterval = setInterval(() => {
      const stats = this.getStats();
      this.emitEvent('stats_updated', stats);
    }, 30 * 1000); // 每30秒更新统计

    // 定期检查待确认请求
    const confirmationInterval = setInterval(() => {
      const pending = this.getPendingConfirmations();
      if (pending.length > 0) {
        this.emitEvent('pending_confirmations', { count: pending.length, requests: pending });
      }
    }, 60 * 1000); // 每分钟检查一次

    this.monitoringIntervals.push(cleanupInterval, statsInterval, confirmationInterval);
  }

  private stopMonitoring(): void {
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals = [];
  }

  private integrateErrorMonitoring(): void {
    if (this.config.integrationPoints.reactErrorBoundary) {
      this.integrateReactErrorBoundary();
    }

    if (this.config.integrationPoints.apiErrorInterceptor) {
      this.integrateApiErrorInterceptor();
    }

    if (this.config.integrationPoints.stateErrorMonitor) {
      this.integrateStateErrorMonitor();
    }
  }

  private integrateReactErrorBoundary(): void {
    // React错误边界集成将在EnhancedErrorBoundary中处理
    this.logger.debug('React Error Boundary integration enabled');
  }

  private integrateApiErrorInterceptor(): void {
    // API错误拦截器集成将在ApiErrorInterceptor中处理
    this.logger.debug('API Error Interceptor integration enabled');
  }

  private integrateStateErrorMonitor(): void {
    // 状态错误监控集成将在StateErrorMonitor中处理
    this.logger.debug('State Error Monitor integration enabled');
  }
}

// 创建默认实例
export const workflowManager = WorkflowManager.getInstance();

// 导出便捷方法
export const startWorkflowManager = () => workflowManager.start();
export const stopWorkflowManager = () => workflowManager.stop();
export const handleWorkflowError = (error: any, context?: any) => workflowManager.handleError(error, context);
export const getWorkflowStats = () => workflowManager.getStats();