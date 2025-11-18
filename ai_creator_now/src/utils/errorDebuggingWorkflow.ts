/**
 * 错误调试工作流系统
 * 协调调试专家、开发专家和测试专家进行错误处理
 */

// 工作流阶段枚举
export enum WorkflowStage {
  INITIALIZED = 'initialized',
  DEBUG_ASSIGNED = 'debug_assigned',
  DEBUG_IN_PROGRESS = 'debug_in_progress',
  DEBUG_COMPLETED = 'debug_completed',
  DEVELOPMENT_ASSIGNED = 'development_assigned',
  DEVELOPMENT_IN_PROGRESS = 'development_in_progress',
  DEVELOPMENT_COMPLETED = 'development_completed',
  TESTING_ASSIGNED = 'testing_assigned',
  TESTING_IN_PROGRESS = 'testing_in_progress',
  TESTING_COMPLETED = 'testing_completed',
  RESOLVED = 'resolved',
  FAILED = 'failed'
}

// 专家类型枚举
export enum ExpertType {
  DEBUG = 'debug',
  DEVELOPMENT = 'development',
  TESTING = 'testing'
}

// 错误优先级枚举
export enum ErrorPriority {
  CRITICAL = 'critical',    // 系统崩溃，安全漏洞
  HIGH = 'high',           // 核心功能不可用
  MEDIUM = 'medium',       // 部分功能受影响
  LOW = 'low'             // 轻微问题，用户体验
}

// 错误分类枚举
export enum ErrorCategory {
  SYSTEM_ERROR = 'system_error',
  API_ERROR = 'api_error',
  UI_ERROR = 'ui_error',
  LOGIC_ERROR = 'logic_error',
  PERFORMANCE_ERROR = 'performance_error',
  SECURITY_ERROR = 'security_error',
  DATA_ERROR = 'data_error',
  CONFIGURATION_ERROR = 'configuration_error'
}

// 工作流任务接口
export interface WorkflowTask {
  id: string;
  errorId: string;
  title: string;
  description: string;
  expertType: ExpertType;
  assignedTo?: string;
  status: WorkflowStage;
  priority: ErrorPriority;
  category: ErrorCategory;
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration?: number; // 预估完成时间（分钟）
  actualDuration?: number; // 实际完成时间（分钟）
  context?: {
    userAgent?: string;
    url?: string;
    userId?: string;
    sessionId?: string;
    componentStack?: string;
    reproducible?: boolean;
    frequency?: number;
  };
  attachments?: {
    logs?: string[];
    screenshots?: string[];
    errorReports?: string[];
  };
}

// 专家诊断报告接口
export interface DebugReport {
  taskId: string;
  expertId: string;
  diagnosis: {
    rootCause: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    complexity: 'simple' | 'moderate' | 'complex';
    reproducible: boolean;
    relatedFiles?: string[];
    affectedComponents?: string[];
  };
  recommendations: {
    immediateActions: string[];
    longTermFixes: string[];
    preventionMeasures: string[];
  };
  estimatedFixTime: number; // 分钟
  requiredExpertise: string[];
  createdAt: Date;
}

// 开发修复报告接口
export interface DevelopmentReport {
  taskId: string;
  debugTaskId: string;
  expertId: string;
  changes: {
    filesModified: string[];
    filesAdded: string[];
    filesDeleted: string[];
    description: string;
  };
  testing: {
    unitTestsAdded: number;
    integrationTestsAdded: number;
    manualTestsPerformed: string[];
  };
  verification: {
    fixVerified: boolean;
    regressionTestsPassed: boolean;
    performanceImpact?: 'positive' | 'neutral' | 'negative';
  };
  createdAt: Date;
  timeSpent: number; // 分钟
}

// 测试验证报告接口
export interface TestingReport {
  taskId: string;
  developmentTaskId: string;
  expertId: string;
  testResults: {
    unitTests: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
    integrationTests: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
    manualTests: {
      total: number;
      passed: number;
      failed: number;
      notes: string[];
    };
  };
  qualityAssessment: {
    bugFixed: boolean;
    noRegressions: boolean;
    userImpact: 'none' | 'minimal' | 'moderate' | 'significant';
    overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
  };
  recommendations: string[];
  createdAt: Date;
  timeSpent: number; // 分钟
}

// 工作流管理器类
export class ErrorDebuggingWorkflow {
  private tasks: Map<string, WorkflowTask> = new Map();
  private debugReports: Map<string, DebugReport> = new Map();
  private developmentReports: Map<string, DevelopmentReport> = new Map();
  private testingReports: Map<string, TestingReport> = new Map();
  private expertQueue: Map<ExpertType, string[]> = new Map();
  private activeWorkflows: Map<string, WorkflowStage[]> = new Map();

  constructor() {
    this.initializeQueues();
    this.loadFromStorage();
  }

  private initializeQueues(): void {
    this.expertQueue.set(ExpertType.DEBUG, ['debug-specialist']);
    this.expertQueue.set(ExpertType.DEVELOPMENT, ['backend-architect', 'frontend-developer']);
    this.expertQueue.set(ExpertType.TESTING, ['test-writer-fixer']);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('error-debugging-workflow');
      if (stored) {
        const data = JSON.parse(stored);
        // 恢复任务数据
        if (data.tasks) {
          Object.entries(data.tasks).forEach(([id, task]: [string, any]) => {
            task.createdAt = new Date(task.createdAt);
            task.updatedAt = new Date(task.updatedAt);
            this.tasks.set(id, task);
          });
        }
        // 恢复报告数据
        if (data.debugReports) {
          Object.entries(data.debugReports).forEach(([id, report]: [string, any]) => {
            report.createdAt = new Date(report.createdAt);
            this.debugReports.set(id, report);
          });
        }
        if (data.developmentReports) {
          Object.entries(data.developmentReports).forEach(([id, report]: [string, any]) => {
            report.createdAt = new Date(report.createdAt);
            this.developmentReports.set(id, report);
          });
        }
        if (data.testingReports) {
          Object.entries(data.testingReports).forEach(([id, report]: [string, any]) => {
            report.createdAt = new Date(report.createdAt);
            this.testingReports.set(id, report);
          });
        }
      }
    } catch (error) {
      console.warn('[ErrorDebuggingWorkflow] Failed to load from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        tasks: Object.fromEntries(this.tasks),
        debugReports: Object.fromEntries(this.debugReports),
        developmentReports: Object.fromEntries(this.developmentReports),
        testingReports: Object.fromEntries(this.testingReports)
      };
      localStorage.setItem('error-debugging-workflow', JSON.stringify(data));
    } catch (error) {
      console.warn('[ErrorDebuggingWorkflow] Failed to save to storage:', error);
    }
  }

  /**
   * 触发错误调试工作流
   */
  public async triggerWorkflow(errorInfo: any): Promise<string> {
    const taskId = this.generateTaskId();
    const category = this.categorizeError(errorInfo);
    const priority = this.determinePriority(errorInfo, category);

    const task: WorkflowTask = {
      id: taskId,
      errorId: errorInfo.id || this.generateErrorId(),
      title: this.generateTaskTitle(errorInfo),
      description: this.generateTaskDescription(errorInfo),
      expertType: ExpertType.DEBUG,
      status: WorkflowStage.INITIALIZED,
      priority,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
      context: {
        userAgent: errorInfo.userAgent,
        url: errorInfo.url,
        userId: errorInfo.userId,
        sessionId: errorInfo.sessionId,
        componentStack: errorInfo.context?.componentStack,
        reproducible: this.assessReproducibility(errorInfo),
        frequency: errorInfo.context?.frequency || 1
      },
      attachments: {
        logs: errorInfo.context?.logs || [],
        screenshots: errorInfo.context?.screenshots || [],
        errorReports: [JSON.stringify(errorInfo, null, 2)]
      }
    };

    this.tasks.set(taskId, task);
    this.activeWorkflows.set(taskId, [WorkflowStage.INITIALIZED]);
    this.saveToStorage();

    // 立即分配调试专家
    await this.assignDebugExpert(taskId);

    return taskId;
  }

  private generateTaskId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeError(errorInfo: any): ErrorCategory {
    const message = (errorInfo.message || '').toLowerCase();
    const source = (errorInfo.source || '').toLowerCase();
    const type = (errorInfo.type || '').toLowerCase();

    if (message.includes('security') || message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.SECURITY_ERROR;
    }
    if (message.includes('api') || source.includes('api') || type.includes('api')) {
      return ErrorCategory.API_ERROR;
    }
    if (message.includes('performance') || message.includes('timeout') || message.includes('slow')) {
      return ErrorCategory.PERFORMANCE_ERROR;
    }
    if (message.includes('config') || message.includes('setting')) {
      return ErrorCategory.CONFIGURATION_ERROR;
    }
    if (message.includes('data') || message.includes('database') || message.includes('storage')) {
      return ErrorCategory.DATA_ERROR;
    }
    if (type.includes('react') || source.includes('component') || message.includes('render')) {
      return ErrorCategory.UI_ERROR;
    }
    if (message.includes('logic') || message.includes('calculation') || message.includes('algorithm')) {
      return ErrorCategory.LOGIC_ERROR;
    }

    return ErrorCategory.SYSTEM_ERROR;
  }

  private determinePriority(errorInfo: any, category: ErrorCategory): ErrorPriority {
    // 安全相关错误优先级最高
    if (category === ErrorCategory.SECURITY_ERROR) {
      return ErrorPriority.CRITICAL;
    }

    // 系统崩溃或核心功能不可用
    const message = (errorInfo.message || '').toLowerCase();
    if (message.includes('crash') || message.includes('fatal') ||
        message.includes('system unavailable') || category === ErrorCategory.SYSTEM_ERROR) {
      return ErrorPriority.CRITICAL;
    }

    // API错误和UI错误通常是高优先级
    if (category === ErrorCategory.API_ERROR || category === ErrorCategory.UI_ERROR) {
      return ErrorPriority.HIGH;
    }

    // 性能和数据错误为中等优先级
    if (category === ErrorCategory.PERFORMANCE_ERROR || category === ErrorCategory.DATA_ERROR) {
      return ErrorPriority.MEDIUM;
    }

    // 配置错误为低优先级
    if (category === ErrorCategory.CONFIGURATION_ERROR) {
      return ErrorPriority.LOW;
    }

    // 根据错误频率判断
    const frequency = errorInfo.context?.frequency || 1;
    if (frequency > 10) {
      return ErrorPriority.HIGH;
    } else if (frequency > 5) {
      return ErrorPriority.MEDIUM;
    }

    return ErrorPriority.LOW;
  }

  private generateTaskTitle(errorInfo: any): string {
    const type = errorInfo.type || 'Unknown';
    const message = errorInfo.message || 'Unknown error';
    const shortMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;
    return `${type}: ${shortMessage}`;
  }

  private generateTaskDescription(errorInfo: any): string {
    return `
错误详情:
- 类型: ${errorInfo.type || 'Unknown'}
- 消息: ${errorInfo.message || 'No message'}
- 来源: ${errorInfo.source || 'Unknown'}
- 组件: ${errorInfo.component || 'Unknown'}
- 时间: ${errorInfo.timestamp || new Date().toISOString()}

上下文信息:
${JSON.stringify(errorInfo.context || {}, null, 2)}
    `.trim();
  }

  private assessReproducibility(errorInfo: any): boolean {
    // 如果有具体的组件堆栈或明确的触发条件，认为可重现
    return !!(errorInfo.context?.componentStack ||
             errorInfo.context?.trigger ||
             errorInfo.action);
  }

  /**
   * 分配调试专家
   */
  private async assignDebugExpert(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.expertType !== ExpertType.DEBUG) {
      return;
    }

    const debugExperts = this.expertQueue.get(ExpertType.DEBUG) || [];
    const assignedExpert = debugExperts[0]; // 简化：分配第一个可用专家

    task.assignedTo = assignedExpert;
    task.status = WorkflowStage.DEBUG_ASSIGNED;
    task.updatedAt = new Date();

    const workflow = this.activeWorkflows.get(taskId) || [];
    workflow.push(WorkflowStage.DEBUG_ASSIGNED);
    this.activeWorkflows.set(taskId, workflow);

    this.saveToStorage();

    // 这里应该通知调试专家开始工作
    // 在实际实现中，这会通过消息系统或事件系统通知相应的专家代理
    console.log(`[ErrorDebuggingWorkflow] Debug expert ${assignedExpert} assigned to task ${taskId}`);
  }

  /**
   * 提交调试报告
   */
  public async submitDebugReport(taskId: string, report: Omit<DebugReport, 'taskId' | 'createdAt'>): Promise<void> {
    const debugReport: DebugReport = {
      ...report,
      taskId,
      createdAt: new Date()
    };

    this.debugReports.set(taskId, debugReport);

    // 更新任务状态
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = WorkflowStage.DEBUG_COMPLETED;
      task.updatedAt = new Date();
      task.actualDuration = Math.round((new Date().getTime() - task.createdAt.getTime()) / (1000 * 60));
    }

    const workflow = this.activeWorkflows.get(taskId) || [];
    workflow.push(WorkflowStage.DEBUG_COMPLETED);
    this.activeWorkflows.set(taskId, workflow);

    this.saveToStorage();

    // 创建开发任务
    await this.createDevelopmentTask(taskId, debugReport);
  }

  /**
   * 创建开发任务
   */
  private async createDevelopmentTask(debugTaskId: string, debugReport: DebugReport): Promise<string> {
    const devTaskId = this.generateTaskId();
    const debugTask = this.tasks.get(debugTaskId);

    if (!debugTask) {
      throw new Error(`Debug task ${debugTaskId} not found`);
    }

    const devTask: WorkflowTask = {
      id: devTaskId,
      errorId: debugTask.errorId,
      title: `修复: ${debugTask.title}`,
      description: `
基于调试报告的开发任务:

根本原因: ${debugReport.diagnosis.rootCause}
影响范围: ${debugReport.diagnosis.impact}
复杂度: ${debugReport.diagnosis.complexity}

建议修复方案:
${debugReport.recommendations.immediateActions.join('\n')}

预估时间: ${debugReport.estimatedFixTime} 分钟
      `.trim(),
      expertType: ExpertType.DEVELOPMENT,
      status: WorkflowStage.DEVELOPMENT_ASSIGNED,
      priority: debugTask.priority,
      category: debugTask.category,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: debugReport.estimatedFixTime,
      context: {
        ...debugTask.context,
        debugReportId: debugTaskId,
        rootCause: debugReport.diagnosis.rootCause,
        relatedFiles: debugReport.diagnosis.relatedFiles
      }
    };

    this.tasks.set(devTaskId, devTask);

    const workflow = this.activeWorkflows.get(debugTaskId) || [];
    workflow.push(WorkflowStage.DEVELOPMENT_ASSIGNED);
    this.activeWorkflows.set(debugTaskId, workflow);

    this.saveToStorage();

    // 分配开发专家
    await this.assignDevelopmentExpert(devTaskId);

    return devTaskId;
  }

  /**
   * 分配开发专家
   */
  private async assignDevelopmentExpert(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.expertType !== ExpertType.DEVELOPMENT) {
      return;
    }

    const devExperts = this.expertQueue.get(ExpertType.DEVELOPMENT) || [];
    const assignedExpert = devExperts[0]; // 简化：分配第一个可用专家

    task.assignedTo = assignedExpert;
    task.status = WorkflowStage.DEVELOPMENT_IN_PROGRESS;
    task.updatedAt = new Date();

    this.saveToStorage();

    console.log(`[ErrorDebuggingWorkflow] Development expert ${assignedExpert} assigned to task ${taskId}`);
  }

  /**
   * 提交开发报告
   */
  public async submitDevelopmentReport(taskId: string, report: Omit<DevelopmentReport, 'taskId' | 'createdAt'>): Promise<void> {
    const devReport: DevelopmentReport = {
      ...report,
      taskId,
      createdAt: new Date()
    };

    this.developmentReports.set(taskId, devReport);

    // 更新任务状态
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = WorkflowStage.DEVELOPMENT_COMPLETED;
      task.updatedAt = new Date();
      task.actualDuration = report.timeSpent;
    }

    // 找到相关的工作流并更新状态
    for (const [workflowId, stages] of this.activeWorkflows.entries()) {
      if (stages.includes(WorkflowStage.DEVELOPMENT_IN_PROGRESS)) {
        stages.push(WorkflowStage.DEVELOPMENT_COMPLETED);
        this.activeWorkflows.set(workflowId, stages);
        break;
      }
    }

    this.saveToStorage();

    // 创建测试任务
    await this.createTestingTask(taskId, devReport);
  }

  /**
   * 创建测试任务
   */
  private async createTestingTask(devTaskId: string, devReport: DevelopmentReport): Promise<string> {
    const testTaskId = this.generateTaskId();
    const devTask = this.tasks.get(devTaskId);

    if (!devTask) {
      throw new Error(`Development task ${devTaskId} not found`);
    }

    const testTask: WorkflowTask = {
      id: testTaskId,
      errorId: devTask.errorId,
      title: `测试验证: ${devTask.title}`,
      description: `
验证开发修复的测试任务:

修改的文件:
${devReport.changes.filesModified.join('\n')}

新增的文件:
${devReport.changes.filesAdded.join('\n')}

修改描述:
${devReport.changes.description}

已添加的测试:
- 单元测试: ${devReport.testing.unitTestsAdded} 个
- 集成测试: ${devReport.testing.integrationTestsAdded} 个
- 手动测试: ${devReport.testing.manualTestsPerformed.length} 个
      `.trim(),
      expertType: ExpertType.TESTING,
      status: WorkflowStage.TESTING_ASSIGNED,
      priority: devTask.priority,
      category: devTask.category,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: 30, // 默认30分钟测试时间
      context: {
        ...devTask.context,
        developmentReportId: devTaskId,
        changes: devReport.changes,
        previousTests: devReport.testing
      }
    };

    this.tasks.set(testTaskId, testTask);

    // 更新工作流状态
    for (const [workflowId, stages] of this.activeWorkflows.entries()) {
      if (stages.includes(WorkflowStage.DEVELOPMENT_COMPLETED)) {
        stages.push(WorkflowStage.TESTING_ASSIGNED);
        this.activeWorkflows.set(workflowId, stages);
        break;
      }
    }

    this.saveToStorage();

    // 分配测试专家
    await this.assignTestingExpert(testTaskId);

    return testTaskId;
  }

  /**
   * 分配测试专家
   */
  private async assignTestingExpert(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.expertType !== ExpertType.TESTING) {
      return;
    }

    const testExperts = this.expertQueue.get(ExpertType.TESTING) || [];
    const assignedExpert = testExperts[0]; // 简化：分配第一个可用专家

    task.assignedTo = assignedExpert;
    task.status = WorkflowStage.TESTING_IN_PROGRESS;
    task.updatedAt = new Date();

    this.saveToStorage();

    console.log(`[ErrorDebuggingWorkflow] Testing expert ${assignedExpert} assigned to task ${taskId}`);
  }

  /**
   * 提交测试报告
   */
  public async submitTestingReport(taskId: string, report: Omit<TestingReport, 'taskId' | 'createdAt'>): Promise<void> {
    const testReport: TestingReport = {
      ...report,
      taskId,
      createdAt: new Date()
    };

    this.testingReports.set(taskId, testReport);

    // 更新任务状态
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = WorkflowStage.TESTING_COMPLETED;
      task.updatedAt = new Date();
      task.actualDuration = report.timeSpent;
    }

    // 更新工作流状态
    for (const [workflowId, stages] of this.activeWorkflows.entries()) {
      if (stages.includes(WorkflowStage.TESTING_IN_PROGRESS)) {
        if (testReport.qualityAssessment.bugFixed && testReport.qualityAssessment.noRegressions) {
          stages.push(WorkflowStage.TESTING_COMPLETED, WorkflowStage.RESOLVED);
        } else {
          stages.push(WorkflowStage.TESTING_COMPLETED, WorkflowStage.FAILED);
        }
        this.activeWorkflows.set(workflowId, stages);
        break;
      }
    }

    this.saveToStorage();
  }

  /**
   * 获取任务状态
   */
  public getTaskStatus(taskId: string): WorkflowTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取工作流进度
   */
  public getWorkflowProgress(workflowId: string): WorkflowStage[] {
    return this.activeWorkflows.get(workflowId) || [];
  }

  /**
   * 获取所有活跃任务
   */
  public getActiveTasks(): WorkflowTask[] {
    return Array.from(this.tasks.values()).filter(task =>
      task.status !== WorkflowStage.RESOLVED &&
      task.status !== WorkflowStage.FAILED
    );
  }

  /**
   * 获取所有已解决的任务
   */
  public getResolvedTasks(): WorkflowTask[] {
    return Array.from(this.tasks.values()).filter(task =>
      task.status === WorkflowStage.RESOLVED ||
      task.status === WorkflowStage.FAILED
    );
  }

  /**
   * 根据优先级获取任务
   */
  public getTasksByPriority(priority: ErrorPriority): WorkflowTask[] {
    return Array.from(this.tasks.values()).filter(task => task.priority === priority);
  }

  /**
   * 根据分类获取任务
   */
  public getTasksByCategory(category: ErrorCategory): WorkflowTask[] {
    return Array.from(this.tasks.values()).filter(task => task.category === category);
  }

  /**
   * 生成工作流报告
   */
  public generateWorkflowReport(): string {
    const activeTasks = this.getActiveTasks();
    const resolvedTasks = this.getResolvedTasks();

    const report = {
      summary: {
        totalTasks: this.tasks.size,
        activeTasks: activeTasks.length,
        resolvedTasks: resolvedTasks.length,
        successRate: resolvedTasks.length > 0 ?
          (resolvedTasks.filter(t => t.status === WorkflowStage.RESOLVED).length / resolvedTasks.length * 100).toFixed(2) + '%' :
          '0%'
      },
      tasksByPriority: {
        critical: this.getTasksByPriority(ErrorPriority.CRITICAL).length,
        high: this.getTasksByPriority(ErrorPriority.HIGH).length,
        medium: this.getTasksByPriority(ErrorPriority.MEDIUM).length,
        low: this.getTasksByPriority(ErrorPriority.LOW).length
      },
      tasksByCategory: {
        system_error: this.getTasksByCategory(ErrorCategory.SYSTEM_ERROR).length,
        api_error: this.getTasksByCategory(ErrorCategory.API_ERROR).length,
        ui_error: this.getTasksByCategory(ErrorCategory.UI_ERROR).length,
        logic_error: this.getTasksByCategory(ErrorCategory.LOGIC_ERROR).length,
        performance_error: this.getTasksByCategory(ErrorCategory.PERFORMANCE_ERROR).length,
        security_error: this.getTasksByCategory(ErrorCategory.SECURITY_ERROR).length,
        data_error: this.getTasksByCategory(ErrorCategory.DATA_ERROR).length,
        configuration_error: this.getTasksByCategory(ErrorCategory.CONFIGURATION_ERROR).length
      },
      activeWorkflows: Array.from(this.activeWorkflows.entries()).map(([id, stages]) => ({
        id,
        currentStage: stages[stages.length - 1],
        progress: stages,
        completed: stages.includes(WorkflowStage.RESOLVED) || stages.includes(WorkflowStage.FAILED)
      })),
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(report, null, 2);
  }
}

// 创建单例实例
export const errorDebuggingWorkflow = new ErrorDebuggingWorkflow();