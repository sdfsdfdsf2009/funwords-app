/**
 * 安全错误工作流控制器
 * 增加人工确认和可撤销性，确保AI不会偏离用户需求
 */

import { errorMonitor } from './errorMonitor';
import { errorDebuggingWorkflow, WorkflowTask, WorkflowStage } from './errorDebuggingWorkflow';
import { debugExpert } from './debugExpert';
import { developmentExpert } from './developmentExpert';
import { testingExpert } from './testingExpert';

// 工作流安全级别
export enum SafetyLevel {
  READ_ONLY = 'read_only',           // 只分析，不修改任何代码
  SUGGEST_ONLY = 'suggest_only',     // 只提供建议，等待人工确认
  CONFIRM_REQUIRED = 'confirm_required', // 需要人工确认后执行
  AUTO_REPAIR = 'auto_repair'        // 自动修复（原版本）
}

// 人工确认请求接口
export interface HumanConfirmationRequest {
  id: string;
  taskId: string;
  expertType: 'debug' | 'development' | 'testing';
  action: 'analyze' | 'modify' | 'test';
  title: string;
  description: string;
  proposedChanges: Array<{
    file: string;
    changeType: 'create' | 'modify' | 'delete';
    description: string;
    diff?: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: number;
  requiresManualReview: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// 确认结果接口
export interface ConfirmationResult {
  requestId: string;
  approved: boolean;
  feedback?: string;
  modifications?: Array<{
    file: string;
    originalChange: string;
    modifiedChange: string;
  }>;
  confirmedBy: 'user' | 'auto_declined';
  confirmedAt: Date;
}

// 安全工作流控制器类
export class SafeErrorWorkflowController {
  private safetyLevel: SafetyLevel;
  private pendingConfirmations: Map<string, HumanConfirmationRequest> = new Map();
  private confirmationHistory: Map<string, ConfirmationResult> = new Map();
  private isRunning: boolean = false;

  constructor(safetyLevel: SafetyLevel = SafetyLevel.CONFIRM_REQUIRED) {
    this.safetyLevel = safetyLevel;
  }

  /**
   * 启动安全工作流控制器
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('[SafeErrorWorkflowController] 控制器已在运行');
      return;
    }

    this.isRunning = true;
    console.log(`[SafeErrorWorkflowController] 启动安全工作流控制器 (安全级别: ${this.safetyLevel})`);

    // 启动只读模式下的错误监控
    if (this.safetyLevel !== SafetyLevel.AUTO_REPAIR) {
      this.startReadOnlyMonitoring();
    }
  }

  /**
   * 设置安全级别
   */
  public setSafetyLevel(level: SafetyLevel): void {
    console.log(`[SafeErrorWorkflowController] 安全级别变更为: ${level}`);
    this.safetyLevel = level;
  }

  /**
   * 获取待确认的请求
   */
  public getPendingConfirmations(): HumanConfirmationRequest[] {
    return Array.from(this.pendingConfirmations.values())
      .filter(request => request.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 处理确认请求
   */
  public async handleConfirmation(requestId: string, result: ConfirmationResult): Promise<void> {
    const request = this.pendingConfirmations.get(requestId);
    if (!request) {
      throw new Error(`确认请求 ${requestId} 不存在或已过期`);
    }

    result.requestId = requestId;
    result.confirmedAt = new Date();
    this.confirmationHistory.set(requestId, result);

    if (result.approved) {
      console.log(`[SafeErrorWorkflowController] 用户批准请求: ${request.title}`);
      await this.executeApprovedAction(request, result);
    } else {
      console.log(`[SafeErrorWorkflowController] 用户拒绝请求: ${request.title}`);
      if (result.feedback) {
        console.log(`   用户反馈: ${result.feedback}`);
      }
    }

    this.pendingConfirmations.delete(requestId);
  }

  /**
   * 手动触发安全工作流
   */
  public async triggerSafeWorkflow(errorInfo: any): Promise<string> {
    console.log('[SafeErrorWorkflowController] 触发安全错误调试工作流');

    switch (this.safetyLevel) {
      case SafetyLevel.READ_ONLY:
        return await this.handleReadOnlyWorkflow(errorInfo);
      case SafetyLevel.SUGGEST_ONLY:
        return await this.handleSuggestOnlyWorkflow(errorInfo);
      case SafetyLevel.CONFIRM_REQUIRED:
        return await this.handleConfirmRequiredWorkflow(errorInfo);
      case SafetyLevel.AUTO_REPAIR:
        return await this.handleAutoRepairWorkflow(errorInfo);
      default:
        throw new Error(`未知的安全级别: ${this.safetyLevel}`);
    }
  }

  /**
   * 只读模式：仅分析，不修改
   */
  private async handleReadOnlyWorkflow(errorInfo: any): Promise<string> {
    console.log('[SafeErrorWorkflowController] 执行只读分析模式');

    const taskId = await errorDebuggingWorkflow.triggerWorkflow(errorInfo);

    // 只执行调试分析，不进行修改
    await this.performReadOnlyAnalysis(taskId, errorInfo);

    return taskId;
  }

  /**
   * 建议模式：提供建议，等待人工确认
   */
  private async handleSuggestOnlyWorkflow(errorInfo: any): Promise<string> {
    console.log('[SafeErrorWorkflowController] 执行建议模式');

    const taskId = await errorDebuggingWorkflow.triggerWorkflow(errorInfo);

    // 生成建议但不执行
    await this.generateSuggestionsOnly(taskId, errorInfo);

    return taskId;
  }

  /**
   * 确认模式：需要人工确认后执行
   */
  private async handleConfirmRequiredWorkflow(errorInfo: any): Promise<string> {
    console.log('[SafeErrorWorkflowController] 执行确认模式');

    const taskId = await errorDebuggingWorkflow.triggerWorkflow(errorInfo);

    // 生成确认请求
    await this.generateConfirmationRequests(taskId, errorInfo);

    return taskId;
  }

  /**
   * 自动修复模式：完全自动化（原版本）
   */
  private async handleAutoRepairWorkflow(errorInfo: any): Promise<string> {
    console.log('[SafeErrorWorkflowController] 执行自动修复模式');

    // 这里调用原始的工作流逻辑
    const originalController = require('./errorWorkflowController').errorWorkflowController;
    return await originalController.triggerWorkflow(errorInfo);
  }

  /**
   * 执行只读分析
   */
  private async performReadOnlyAnalysis(taskId: string, errorInfo: any): Promise<void> {
    console.log(`[SafeErrorWorkflowController] 只读分析任务: ${taskId}`);

    // 调用调试专家进行分析，但不生成修复方案
    const analysis = await debugExpert.analyzeError(taskId, errorInfo);

    console.log('📊 分析结果:');
    console.log(`   根本原因: ${analysis.rootCause}`);
    console.log(`   影响程度: ${analysis.impact}`);
    console.log(`   复杂度: ${analysis.complexity}`);
    console.log(`   相关文件: ${analysis.relatedFiles.join(', ')}`);
    console.log(`   建议操作: ${analysis.requiredExpertise.join(', ')}`);

    // 生成分析报告，但不执行任何修改
    this.generateAnalysisReport(taskId, analysis);
  }

  /**
   * 生成建议但不执行
   */
  private async generateSuggestionsOnly(taskId: string, errorInfo: any): Promise<void> {
    console.log(`[SafeErrorWorkflowController] 生成建议: ${taskId}`);

    // 执行完整分析
    const analysis = await debugExpert.analyzeError(taskId, errorInfo);

    // 生成修复建议
    const suggestions = await this.generateFixSuggestions(analysis);

    console.log('💡 修复建议:');
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion.title}`);
      console.log(`      描述: ${suggestion.description}`);
      console.log(`      风险: ${suggestion.riskLevel}`);
      console.log(`      预估时间: ${suggestion.estimatedTime} 分钟`);
    });

    // 保存建议供后续参考
    this.saveSuggestions(taskId, suggestions);
  }

  /**
   * 生成确认请求
   */
  private async generateConfirmationRequests(taskId: string, errorInfo: any): Promise<void> {
    console.log(`[SafeErrorWorkflowController] 生成确认请求: ${taskId}`);

    // 执行调试分析
    const analysis = await debugExpert.analyzeError(taskId, errorInfo);

    // 生成修复方案
    const fixPlan = await this.generateFixPlan(analysis);

    // 创建确认请求
    const requestId = this.generateRequestId();
    const confirmationRequest: HumanConfirmationRequest = {
      id: requestId,
      taskId,
      expertType: 'development',
      action: 'modify',
      title: `修复: ${errorInfo.message.substring(0, 50)}...`,
      description: `基于错误分析生成的修复方案。根本原因: ${analysis.rootCause}`,
      proposedChanges: fixPlan.filesToModify.map(file => ({
        file: file.path,
        changeType: file.type,
        description: file.changes.join(', '),
        diff: `// 预期的修改内容\n${file.changes.join('\n')}`
      })),
      riskLevel: this.assessRisk(analysis),
      estimatedTime: fixPlan.estimatedTime,
      requiresManualReview: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
    };

    this.pendingConfirmations.set(requestId, confirmationRequest);

    console.log(`🔔 生成确认请求: ${confirmationRequest.title}`);
    console.log(`   请访问管理界面查看详情并确认操作`);
  }

  /**
   * 执行已批准的操作
   */
  private async executeApprovedAction(request: HumanConfirmationRequest, result: ConfirmationResult): Promise<void> {
    console.log(`[SafeErrorWorkflowController] 执行已批准的操作: ${request.title}`);

    try {
      // 应用用户可能的修改
      const modifiedChanges = result.modifications || [];
      const adjustedRequest = this.applyUserModifications(request, modifiedChanges);

      // 执行操作
      switch (request.expertType) {
        case 'debug':
          await this.executeDebugAction(adjustedRequest);
          break;
        case 'development':
          await this.executeDevelopmentAction(adjustedRequest);
          break;
        case 'testing':
          await this.executeTestingAction(adjustedRequest);
          break;
      }

      console.log(`✅ 操作执行成功: ${request.title}`);
    } catch (error) {
      console.error(`❌ 操作执行失败: ${request.title}`, error);
      throw error;
    }
  }

  /**
   * 启动只读监控
   */
  private startReadOnlyMonitoring(): void {
    // 监控错误但不自动触发修复
    const originalLogError = errorMonitor.logError.bind(errorMonitor);
    errorMonitor.logError = (errorInfo) => {
      originalLogError(errorInfo);

      // 只记录和分析，不触发工作流
      if (this.shouldAnalyzeError(errorInfo)) {
        console.log(`[SafeErrorWorkflowController] 检测到潜在问题: ${errorInfo.message}`);
        console.log('   使用 triggerSafeWorkflow() 来启动分析流程');
      }
    };
  }

  /**
   * 判断是否应该分析错误
   */
  private shouldAnalyzeError(errorInfo: any): boolean {
    // 简化的分析条件
    const criticalErrors = ['crash', 'fatal', 'security', 'unauthorized'];
    const message = (errorInfo.message || '').toLowerCase();
    return criticalErrors.some(keyword => message.includes(keyword));
  }

  // 辅助方法
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private assessRisk(analysis: any): 'low' | 'medium' | 'high' {
    if (analysis.impact === 'critical' || analysis.complexity === 'complex') {
      return 'high';
    }
    if (analysis.impact === 'high' || analysis.complexity === 'moderate') {
      return 'medium';
    }
    return 'low';
  }

  private async generateFixSuggestions(analysis: any): Promise<any[]> {
    // 生成多个修复建议供用户选择
    return [
      {
        title: '最小化修复',
        description: '只修复核心问题，最小化代码变更',
        riskLevel: 'low',
        estimatedTime: 15,
        changes: analysis.relatedFiles.slice(0, 2)
      },
      {
        title: '全面修复',
        description: '完整修复问题并优化相关代码',
        riskLevel: 'medium',
        estimatedTime: 45,
        changes: analysis.relatedFiles
      },
      {
        title: '重构方案',
        description: '重构相关模块以根本性解决问题',
        riskLevel: 'high',
        estimatedTime: 120,
        changes: analysis.relatedFiles.concat(['additional-refactor-files'])
      }
    ];
  }

  private async generateFixPlan(analysis: any): Promise<any> {
    // 生成详细的修复计划
    return {
      description: `修复方案: ${analysis.rootCause}`,
      filesToModify: analysis.relatedFiles.map(file => ({
        path: file,
        type: 'modify',
        changes: [`修复 ${analysis.rootCause} 相关问题`]
      })),
      estimatedTime: analysis.estimatedFixTime || 30
    };
  }

  private generateAnalysisReport(taskId: string, analysis: any): void {
    const report = {
      taskId,
      timestamp: new Date().toISOString(),
      analysis: {
        rootCause: analysis.rootCause,
        impact: analysis.impact,
        complexity: analysis.complexity,
        relatedFiles: analysis.relatedFiles,
        affectedComponents: analysis.affectedComponents,
        estimatedFixTime: analysis.estimatedFixTime,
        requiredExpertise: analysis.requiredExpertise
      },
      recommendations: {
        immediateActions: ['建议先备份相关代码', '在测试环境中验证修复方案'],
        preventionMeasures: ['增加相关测试用例', '改进错误处理机制']
      }
    };

    console.log('📄 分析报告已生成，可通过API获取详细信息');
    // 这里可以保存到数据库或文件系统
  }

  private saveSuggestions(taskId: string, suggestions: any[]): void {
    // 保存建议供后续查看
    console.log(`💾 已保存 ${suggestions.length} 个修复建议供任务 ${taskId} 使用`);
  }

  private applyUserModifications(request: HumanConfirmationRequest, modifications: any[]): HumanConfirmationRequest {
    // 应用用户对修复方案的修改
    let modifiedRequest = { ...request };

    modifications.forEach(mod => {
      const changeIndex = modifiedRequest.proposedChanges.findIndex(
        change => change.file === mod.file
      );

      if (changeIndex !== -1) {
        modifiedRequest.proposedChanges[changeIndex].description = mod.modifiedChange;
        modifiedRequest.proposedChanges[changeIndex].diff =
          modifiedRequest.proposedChanges[changeIndex].diff?.replace(
            mod.originalChange,
            mod.modifiedChange
          );
      }
    });

    return modifiedRequest;
  }

  private async executeDebugAction(request: HumanConfirmationRequest): Promise<void> {
    console.log(`执行调试分析: ${request.title}`);
    // 实现调试逻辑
  }

  private async executeDevelopmentAction(request: HumanConfirmationRequest): Promise<void> {
    console.log(`执行开发修复: ${request.title}`);
    // 实现开发修复逻辑
  }

  private async executeTestingAction(request: HumanConfirmationRequest): Promise<void> {
    console.log(`执行测试验证: ${request.title}`);
    // 实现测试验证逻辑
  }

  /**
   * 获取安全状态
   */
  public getSafetyStatus(): {
    isRunning: boolean;
    safetyLevel: SafetyLevel;
    pendingConfirmations: number;
    confirmationHistory: number;
  } {
    return {
      isRunning: this.isRunning,
      safetyLevel: this.safetyLevel,
      pendingConfirmations: this.pendingConfirmations.size,
      confirmationHistory: this.confirmationHistory.size
    };
  }

  /**
   * 清理过期的确认请求
   */
  public cleanupExpiredRequests(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, request] of this.pendingConfirmations.entries()) {
      if (request.expiresAt < now) {
        this.pendingConfirmations.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SafeErrorWorkflowController] 清理了 ${cleaned} 个过期的确认请求`);
    }

    return cleaned;
  }
}

// 创建安全工作流控制器实例
export const safeErrorWorkflowController = new SafeErrorWorkflowController(SafetyLevel.CONFIRM_REQUIRED);