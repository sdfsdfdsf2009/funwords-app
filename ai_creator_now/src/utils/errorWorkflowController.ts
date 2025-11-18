/**
 * 错误工作流控制器
 * 统一管理错误调试工作流的触发、协调和监控
 */

import { errorMonitor } from './errorMonitor';
import { errorDebuggingWorkflow, WorkflowTask, WorkflowStage } from './errorDebuggingWorkflow';
import { debugExpert } from './debugExpert';
import { developmentExpert } from './developmentExpert';
import { testingExpert } from './testingExpert';

// 工作流控制器配置
export interface WorkflowControllerConfig {
  autoTriggerEnabled: boolean;
  expertAssignmentDelay: number; // 专家分配延迟（毫秒）
  maxConcurrentTasks: number;
  notificationEnabled: boolean;
  autoRetryFailedTasks: boolean;
  monitoringInterval: number; // 监控间隔（毫秒）
}

// 工作流事件类型
export enum WorkflowEventType {
  TASK_CREATED = 'task_created',
  TASK_ASSIGNED = 'task_assigned',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  EXPERT_ASSIGNED = 'expert_assigned',
  DEBUG_REPORT_SUBMITTED = 'debug_report_submitted',
  DEVELOPMENT_REPORT_SUBMITTED = 'development_report_submitted',
  TESTING_REPORT_SUBMITTED = 'testing_report_submitted'
}

// 工作流事件接口
export interface WorkflowEvent {
  type: WorkflowEventType;
  taskId: string;
  workflowId?: string;
  timestamp: Date;
  data?: any;
  message?: string;
}

// 工作流控制器类
export class ErrorWorkflowController {
  private config: WorkflowControllerConfig;
  private eventListeners: Map<WorkflowEventType, ((event: WorkflowEvent) => void)[]> = new Map();
  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private activeTaskProcessing: Set<string> = new Set();

  constructor(config: Partial<WorkflowControllerConfig> = {}) {
    this.config = {
      autoTriggerEnabled: true,
      expertAssignmentDelay: 1000,
      maxConcurrentTasks: 5,
      notificationEnabled: true,
      autoRetryFailedTasks: true,
      monitoringInterval: 10000, // 10秒
      ...config
    };

    this.initializeEventListeners();
  }

  /**
   * 启动工作流控制器
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('[ErrorWorkflowController] 控制器已在运行');
      return;
    }

    console.log('[ErrorWorkflowController] 启动错误调试工作流控制器');
    this.isRunning = true;

    // 启动错误监控
    if (this.config.autoTriggerEnabled) {
      this.startErrorMonitoring();
    }

    // 启动工作流监控
    this.startWorkflowMonitoring();

    // 触发事件
    this.emitEvent({
      type: WorkflowEventType.TASK_CREATED,
      taskId: 'controller-start',
      timestamp: new Date(),
      message: '错误调试工作流控制器已启动'
    });
  }

  /**
   * 停止工作流控制器
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn('[ErrorWorkflowController] 控制器未在运行');
      return;
    }

    console.log('[ErrorWorkflowController] 停止错误调试工作流控制器');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // 停止错误监控
    this.stopErrorMonitoring();
  }

  /**
   * 手动触发工作流
   */
  public async triggerWorkflow(errorInfo: any): Promise<string> {
    console.log('[ErrorWorkflowController] 手动触发错误调试工作流');

    try {
      const taskId = await errorDebuggingWorkflow.triggerWorkflow(errorInfo);

      this.emitEvent({
        type: WorkflowEventType.TASK_CREATED,
        taskId,
        timestamp: new Date(),
        data: { errorInfo },
        message: `手动触发错误调试工作流: ${taskId}`
      });

      // 立即处理新任务
      this.processTask(taskId);

      return taskId;
    } catch (error) {
      console.error('[ErrorWorkflowController] 触发工作流失败:', error);
      throw error;
    }
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(
    eventType: WorkflowEventType,
    listener: (event: WorkflowEvent) => void
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(
    eventType: WorkflowEventType,
    listener: (event: WorkflowEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 获取工作流统计信息
   */
  public getWorkflowStats(): {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
    averageResolutionTime: number;
    tasksByPriority: Record<string, number>;
    tasksByCategory: Record<string, number>;
  } {
    const activeTasks = errorDebuggingWorkflow.getActiveTasks();
    const resolvedTasks = errorDebuggingWorkflow.getResolvedTasks();

    const completedTasks = resolvedTasks.filter(t => t.status === WorkflowStage.RESOLVED).length;
    const failedTasks = resolvedTasks.filter(t => t.status === WorkflowStage.FAILED).length;
    const totalTasks = completedTasks + failedTasks;

    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // 计算平均解决时间
    const completedTasksWithDuration = resolvedTasks
      .filter(t => t.status === WorkflowStage.RESOLVED && t.actualDuration)
      .map(t => t.actualDuration!);

    const averageResolutionTime = completedTasksWithDuration.length > 0 ?
      completedTasksWithDuration.reduce((sum, duration) => sum + duration, 0) / completedTasksWithDuration.length :
      0;

    // 按优先级统计
    const tasksByPriority: Record<string, number> = {};
    activeTasks.forEach(task => {
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
    });

    // 按分类统计
    const tasksByCategory: Record<string, number> = {};
    activeTasks.forEach(task => {
      tasksByCategory[task.category] = (tasksByCategory[task.category] || 0) + 1;
    });

    return {
      activeTasks: activeTasks.length,
      completedTasks,
      failedTasks,
      successRate: Math.round(successRate * 100) / 100,
      averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
      tasksByPriority,
      tasksByCategory
    };
  }

  /**
   * 获取控制器状态
   */
  public getControllerStatus(): {
    isRunning: boolean;
    config: WorkflowControllerConfig;
    stats: ReturnType<typeof this.getWorkflowStats>;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      stats: this.getWorkflowStats(),
      uptime: this.isRunning ? Date.now() - (this as any).startTime : 0
    };
  }

  /**
   * 初始化事件监听器
   */
  private initializeEventListeners(): void {
    // 调试专家监听器
    debugExpert.addEventListener?.(WorkflowEventType.DEBUG_REPORT_SUBMITTED, (event) => {
      this.handleDebugReportSubmitted(event);
    });

    // 开发专家监听器
    developmentExpert.addEventListener?.(WorkflowEventType.DEVELOPMENT_REPORT_SUBMITTED, (event) => {
      this.handleDevelopmentReportSubmitted(event);
    });

    // 测试专家监听器
    testingExpert.addEventListener?.(WorkflowEventType.TESTING_REPORT_SUBMITTED, (event) => {
      this.handleTestingReportSubmitted(event);
    });
  }

  /**
   * 启动错误监控
   */
  private startErrorMonitoring(): void {
    // 监听错误监控器的新错误
    const originalLogError = errorMonitor.logError.bind(errorMonitor);
    errorMonitor.logError = (errorInfo) => {
      originalLogError(errorInfo);

      // 检查是否需要触发工作流
      if (this.shouldTriggerWorkflow(errorInfo)) {
        setTimeout(() => {
          this.triggerWorkflow(errorInfo);
        }, this.config.expertAssignmentDelay);
      }
    };
  }

  /**
   * 停止错误监控
   */
  private stopErrorMonitoring(): void {
    // 恢复原始的错误记录方法
    // 这里应该保存原始方法并恢复，简化处理
  }

  /**
   * 启动工作流监控
   */
  private startWorkflowMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.monitorWorkflows();
    }, this.config.monitoringInterval);
  }

  /**
   * 监控工作流状态
   */
  private monitorWorkflows(): void {
    if (!this.isRunning) return;

    try {
      const activeTasks = errorDebuggingWorkflow.getActiveTasks();

      // 检查是否有需要处理的任务
      activeTasks.forEach(task => {
        if (!this.activeTaskProcessing.has(task.id)) {
          this.processTask(task.id);
        }
      });

      // 检查是否有失败的任务需要重试
      if (this.config.autoRetryFailedTasks) {
        this.retryFailedTasks();
      }

    } catch (error) {
      console.error('[ErrorWorkflowController] 工作流监控失败:', error);
    }
  }

  /**
   * 判断是否应该触发工作流
   */
  private shouldTriggerWorkflow(errorInfo: any): boolean {
    // 简单的触发条件判断
    // 在实际实现中，这里会有更复杂的逻辑

    // 忽略一些常见的、不重要的错误
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Script error',
      'Non-Error promise rejection captured'
    ];

    const message = errorInfo.message || '';
    if (ignoredErrors.some(ignored => message.includes(ignored))) {
      return false;
    }

    // 检查错误频率
    const recentErrors = errorMonitor.getErrors().filter(error => {
      const errorTime = new Date(error.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return errorTime >= oneHourAgo && error.message === message;
    });

    // 如果同一个错误在1小时内出现超过3次，触发工作流
    return recentErrors.length >= 3;
  }

  /**
   * 处理任务
   */
  private async processTask(taskId: string): Promise<void> {
    if (this.activeTaskProcessing.has(taskId)) {
      return; // 任务已在处理中
    }

    this.activeTaskProcessing.add(taskId);

    try {
      const task = errorDebuggingWorkflow.getTaskStatus(taskId);
      if (!task) {
        console.warn(`[ErrorWorkflowController] 任务 ${taskId} 不存在`);
        return;
      }

      // 根据任务状态决定处理方式
      switch (task.status) {
        case WorkflowStage.DEBUG_ASSIGNED:
          await this.handleDebugTask(taskId);
          break;
        case WorkflowStage.DEVELOPMENT_ASSIGNED:
          await this.handleDevelopmentTask(taskId);
          break;
        case WorkflowStage.TESTING_ASSIGNED:
          await this.handleTestingTask(taskId);
          break;
        default:
          // 其他状态暂不处理
          break;
      }

    } catch (error) {
      console.error(`[ErrorWorkflowController] 处理任务 ${taskId} 失败:`, error);
      this.emitEvent({
        type: WorkflowEventType.TASK_FAILED,
        taskId,
        timestamp: new Date(),
        data: { error },
        message: `任务处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      this.activeTaskProcessing.delete(taskId);
    }
  }

  /**
   * 处理调试任务
   */
  private async handleDebugTask(taskId: string): Promise<void> {
    this.emitEvent({
      type: WorkflowEventType.EXPERT_ASSIGNED,
      taskId,
      timestamp: new Date(),
      message: `调试专家开始处理任务: ${taskId}`
    });

    // 调用调试专家处理任务
    await debugExpert.handleDebugTask(taskId);
  }

  /**
   * 处理开发任务
   */
  private async handleDevelopmentTask(taskId: string): Promise<void> {
    this.emitEvent({
      type: WorkflowEventType.EXPERT_ASSIGNED,
      taskId,
      timestamp: new Date(),
      message: `开发专家开始处理任务: ${taskId}`
    });

    // 获取调试报告ID（简化处理）
    const debugReportId = `debug-${taskId}`;

    // 调用开发专家处理任务
    await developmentExpert.handleDevelopmentTask(taskId, debugReportId);
  }

  /**
   * 处理测试任务
   */
  private async handleTestingTask(taskId: string): Promise<void> {
    this.emitEvent({
      type: WorkflowEventType.EXPERT_ASSIGNED,
      taskId,
      timestamp: new Date(),
      message: `测试专家开始处理任务: ${taskId}`
    });

    // 获取开发报告ID（简化处理）
    const developmentReportId = `dev-${taskId}`;

    // 调用测试专家处理任务
    await testingExpert.handleTestingTask(taskId, developmentReportId);
  }

  /**
   * 重试失败的任务
   */
  private async retryFailedTasks(): Promise<void> {
    const failedTasks = errorDebuggingWorkflow.getResolvedTasks()
      .filter(task => task.status === WorkflowStage.FAILED);

    // 简单的重试逻辑，实际实现中会更复杂
    for (const task of failedTasks.slice(0, 2)) { // 限制重试数量
      if (Math.random() > 0.7) { // 30%的概率重试
        console.log(`[ErrorWorkflowController] 重试失败任务: ${task.id}`);
        // 这里会重新触发工作流
      }
    }
  }

  /**
   * 处理调试报告提交
   */
  private handleDebugReportSubmitted(event: WorkflowEvent): void {
    console.log('[ErrorWorkflowController] 调试报告已提交:', event.taskId);
    this.emitEvent(event);
  }

  /**
   * 处理开发报告提交
   */
  private handleDevelopmentReportSubmitted(event: WorkflowEvent): void {
    console.log('[ErrorWorkflowController] 开发报告已提交:', event.taskId);
    this.emitEvent(event);
  }

  /**
   * 处理测试报告提交
   */
  private handleTestingReportSubmitted(event: WorkflowEvent): void {
    console.log('[ErrorWorkflowController] 测试报告已提交:', event.taskId);
    this.emitEvent(event);

    // 检查工作流是否完成
    const workflowProgress = errorDebuggingWorkflow.getWorkflowProgress(event.taskId);
    const lastStage = workflowProgress[workflowProgress.length - 1];

    if (lastStage === WorkflowStage.RESOLVED) {
      this.emitEvent({
        type: WorkflowEventType.WORKFLOW_COMPLETED,
        taskId: event.taskId,
        timestamp: new Date(),
        message: `错误调试工作流已完成: ${event.taskId}`
      });
    } else if (lastStage === WorkflowStage.FAILED) {
      this.emitEvent({
        type: WorkflowEventType.WORKFLOW_FAILED,
        taskId: event.taskId,
        timestamp: new Date(),
        message: `错误调试工作流失败: ${event.taskId}`
      });
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: WorkflowEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[ErrorWorkflowController] 事件监听器执行失败:', error);
        }
      });
    }

    // 如果启用了通知，这里可以发送通知
    if (this.config.notificationEnabled) {
      this.sendNotification(event);
    }
  }

  /**
   * 发送通知
   */
  private sendNotification(event: WorkflowEvent): void {
    // 简化的通知实现
    console.log(`[通知] ${event.message || event.type}`);
  }
}

// 创建全局工作流控制器实例
export const errorWorkflowController = new ErrorWorkflowController();

// 自动启动控制器（可选）
if (typeof window !== 'undefined') {
  // 在浏览器环境中自动启动
  // errorWorkflowController.start();
}