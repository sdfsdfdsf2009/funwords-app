/**
 * 错误调试技能
 * 简单的技能：当用户提错误时，先找调试专家→开发专家→测试专家
 */

import React, { useState, useEffect, useCallback } from 'react';
import { errorMonitor } from '../utils/errorMonitor';

// 技能状态
enum SkillStage {
  WAITING = 'waiting',           // 等待错误
  DEBUG_ANALYSIS = 'debug',      // 调试专家分析中
  DEVELOPMENT_FIX = 'dev',        // 开发专家修复中
  TESTING_VERIFY = 'test',        // 测试专家验证中
  PRODUCT_EVALUATION = 'product', // 产品专家评估中
  COMPLETED = 'completed',        // 完成
  FAILED = 'failed'               // 失败
}

// 专家报告接口
interface ExpertReport {
  expert: string;
  stage: SkillStage;
  findings: string;
  recommendations: string[];
  confidence: number; // 0-100
  timestamp: Date;
  // 产品专家特有字段
  priority?: string; // 优先级
  userImpact?: string; // 用户影响
  businessValue?: number; // 商业价值 1-10
  deviationRisk?: string; // 偏离风险
}

// 技能结果
interface SkillResult {
  errorId: string;
  originalError: any;
  stage: SkillStage;
  reports: ExpertReport[];
  finalRecommendation?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ErrorDebuggingSkill {
  private activeSkills: Map<string, SkillResult> = new Map();
  private maxConcurrentSkills = 3;

  constructor() {
    console.log('🔧 错误调试技能已启用');
  }

  /**
   * 检测错误并启动技能
   */
  async detectAndStart(error: any): Promise<string> {
    // 检查是否应该启动技能
    if (!this.shouldStartSkill(error)) {
      return 'skipped';
    }

    // 检查并发限制
    if (this.activeSkills.size >= this.maxConcurrentSkills) {
      console.log('⚠️ 技能队列已满，等待空闲');
      return 'queue_full';
    }

    // 创建技能实例
    const skillId = this.generateSkillId();
    const skill: SkillResult = {
      errorId: skillId,
      originalError: error,
      stage: SkillStage.DEBUG_ANALYSIS,
      reports: [],
      createdAt: new Date()
    };

    this.activeSkills.set(skillId, skill);
    console.log(`🚀 启动错误调试技能: ${skillId}`);

    // 开始执行技能流程
    this.executeSkillFlow(skillId);

    return skillId;
  }

  /**
   * 执行技能流程
   */
  private async executeSkillFlow(skillId: string): Promise<void> {
    const skill = this.activeSkills.get(skillId);
    if (!skill) return;

    try {
      // 阶段1: 调试专家分析
      const debugReport = await this.callDebugExpert(skill.originalError);
      skill.reports.push(debugReport);
      skill.stage = SkillStage.DEVELOPMENT_FIX;

      // 阶段2: 开发专家修复
      const devReport = await this.callDevelopmentExpert(skill.originalError, debugReport);
      skill.reports.push(devReport);
      skill.stage = SkillStage.TESTING_VERIFY;

      // 阶段3: 测试专家验证
      const testReport = await this.callTestingExpert(skill.originalError, debugReport, devReport);
      skill.reports.push(testReport);
      skill.stage = SkillStage.PRODUCT_EVALUATION;

      // 阶段4: 产品专家评估
      const productReport = await this.callProductExpert(skill.originalError, testReport);
      skill.reports.push(productReport);
      skill.stage = SkillStage.COMPLETED;

      // 生成最终建议
      skill.finalRecommendation = this.generateFinalRecommendation(skill);
      skill.completedAt = new Date();

      console.log(`✅ 错误调试技能完成: ${skillId}`);
      console.log(`💡 最终建议: ${skill.finalRecommendation}`);

    } catch (error) {
      skill.stage = SkillStage.FAILED;
      console.error(`❌ 错误调试技能失败: ${skillId}`, error);
    }
  }

  /**
   * 调试专家分析
   */
  private async callDebugExpert(error: any): Promise<ExpertReport> {
    console.log('🔍 调试专家开始分析...');

    // 模拟分析时间
    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysis = this.analyzeError(error);

    const report: ExpertReport = {
      expert: '调试专家',
      stage: SkillStage.DEBUG_ANALYSIS,
      findings: analysis.rootCause,
      recommendations: analysis.suggestions,
      confidence: analysis.confidence,
      timestamp: new Date()
    };

    console.log(`📊 调试专家分析完成: ${analysis.rootCause}`);
    return report;
  }

  /**
   * 开发专家修复
   */
  private async callDevelopmentExpert(error: any, debugReport: ExpertReport): Promise<ExpertReport> {
    console.log('👨‍💻 开发专家开始修复...');

    // 模拟修复时间
    await new Promise(resolve => setTimeout(resolve, 3000));

    const fixPlan = this.createFixPlan(error, debugReport);

    const report: ExpertReport = {
      expert: '开发专家',
      stage: SkillStage.DEVELOPMENT_FIX,
      findings: fixPlan.description,
      recommendations: fixPlan.steps,
      confidence: fixPlan.confidence,
      timestamp: new Date()
    };

    console.log(`🔧 开发专家修复完成: ${fixPlan.description}`);
    return report;
  }

  /**
   * 测试专家验证
   */
  private async callTestingExpert(error: any, debugReport: ExpertReport, devReport: ExpertReport): Promise<ExpertReport> {
    console.log('🧪 测试专家开始验证...');

    // 模拟测试时间
    await new Promise(resolve => setTimeout(resolve, 2500));

    const testResult = this.performTests(error, debugReport, devReport);

    const report: ExpertReport = {
      expert: '测试专家',
      stage: SkillStage.TESTING_VERIFY,
      findings: testResult.findings,
      recommendations: testResult.nextSteps,
      confidence: testResult.confidence,
      timestamp: new Date()
    };

    console.log(`✅ 测试专家验证完成: ${testResult.status}`);
    return report;
  }

  /**
   * 产品专家评估
   */
  private async callProductExpert(error: any, testReport: ExpertReport): Promise<ExpertReport> {
    console.log('📦 产品专家开始评估...');

    // 模拟评估时间
    await new Promise(resolve => setTimeout(resolve, 2000));

    const evaluation = this.evaluateProductImpact(error, testReport);

    const report: ExpertReport = {
      expert: '产品专家',
      stage: SkillStage.PRODUCT_EVALUATION,
      findings: evaluation.assessment,
      recommendations: evaluation.recommendations,
      confidence: evaluation.confidence,
      timestamp: new Date(),
      priority: evaluation.priority,
      userImpact: evaluation.userImpact,
      businessValue: evaluation.businessValue,
      deviationRisk: evaluation.deviationRisk
    };

    console.log(`📦 产品专家评估完成: ${evaluation.assessment}`);
    return report;
  }

  /**
   * 分析错误
   */
  private analyzeError(error: any): {
    rootCause: string;
    suggestions: string[];
    confidence: number;
  } {
    const message = error.message || '';
    let rootCause = '未知错误';
    let suggestions: string[] = [];
    let confidence = 50;

    // 简单的错误分析
    if (message.includes('Cannot read prop')) {
      rootCause = '属性未定义或为空';
      suggestions = [
        '检查对象是否存在',
        '添加默认值',
        '使用可选链操作符(?.)'
      ];
      confidence = 90;
    } else if (message.includes('Network error')) {
      rootCause = '网络连接问题';
      suggestions = [
        '检查网络连接',
        '验证API端点',
        '添加重试机制'
      ];
      confidence = 85;
    } else if (message.includes('timeout')) {
      rootCause = '请求超时';
      suggestions = [
        '增加超时时间',
        '优化性能',
        '检查服务器响应'
      ];
      confidence = 80;
    } else if (message.includes('API')) {
      rootCause = 'API调用失败';
      suggestions = [
        '检查API密钥',
        '验证请求参数',
        '查看API文档'
      ];
      confidence = 75;
    }

    return { rootCause, suggestions, confidence };
  }

  /**
   * 创建修复计划
   */
  private createFixPlan(error: any, debugReport: ExpertReport): {
    description: string;
    steps: string[];
    confidence: number;
  } {
    const steps = [
      '1. 备份相关代码',
      '2. 修复根本原因',
      '3. 添加错误处理',
      '4. 编写测试用例',
      '5. 验证修复效果'
    ];

    // 根据调试建议调整步骤
    if (debugReport.recommendations.length > 0) {
      steps.unshift('1. 应用调试专家建议');
    }

    return {
      description: `修复: ${debugReport.findings}`,
      steps,
      confidence: debugReport.confidence
    };
  }

  /**
   * 执行测试
   */
  private performTests(error: any, debugReport: ExpertReport, devReport: ExpertReport): {
    findings: string;
    status: string;
    nextSteps: string[];
    confidence: number;
  } {
    // 简单的测试逻辑
    const confidence = (debugReport.confidence + devReport.confidence) / 2;

    let status = '通过';
    let nextSteps: string[] = ['部署到生产环境'];

    if (confidence < 70) {
      status = '需要更多测试';
      nextSteps = ['增加测试用例', '手动验证', '团队代码审查'];
    }

    return {
      findings: `测试完成，置信度: ${confidence}%`,
      status,
      nextSteps,
      confidence
    };
  }

  /**
   * 生成最终建议
   */
  private generateFinalRecommendation(skill: SkillResult): string {
    const debugReport = skill.reports.find(r => r.stage === SkillStage.DEBUG_ANALYSIS);
    const devReport = skill.reports.find(r => r.stage === SkillStage.DEVELOPMENT_FIX);
    const testReport = skill.reports.find(r => r.stage === SkillStage.TESTING_VERIFY);
    const productReport = skill.reports.find(r => r.stage === SkillStage.PRODUCT_EVALUATION);

    const avgConfidence = skill.reports.reduce((sum, r) => sum + r.confidence, 0) / skill.reports.length;

    let recommendation = '';

    // 基于产品专家的偏离风险调整建议
    const riskLevel = productReport?.deviationRisk || '未知风险';

    if (avgConfidence > 80 && riskLevel === '无偏离风险') {
      recommendation = `高置信度(${avgConfidence.toFixed(0)}%)：建议立即执行${devReport?.findings || '修复计划'}，${productReport?.findings || '符合产品需求'}`;
    } else if (avgConfidence > 60) {
      recommendation = `中等置信度(${avgConfidence.toFixed(0)}%)：建议先在测试环境验证，然后执行${devReport?.findings || '修复'}，${riskLevel === '低偏离风险' ? '符合产品需求' : '需关注产品影响'}`;
    } else {
      recommendation = `低置信度(${avgConfidence.toFixed(0)}%)：建议人工审查，${riskLevel}，或寻求更详细的错误信息`;
    }

    return recommendation;
  }

  /**
   * 评估产品影响
   */
  private evaluateProductImpact(error: any, testReport: ExpertReport): {
    assessment: string;
    recommendations: string[];
    confidence: number;
    priority: string;
    userImpact: string;
    businessValue: number;
    deviationRisk: string;
  } {
    const message = error.message || '';
    let assessment = '修复方案符合产品需求';
    let recommendations: string[] = ['建议正常实施'];
    let confidence = testReport.confidence;
    let priority = '中等';
    let userImpact = '正面 - 提升用户体验';
    let businessValue = 8;
    let deviationRisk = '无偏离风险';

    // 根据错误类型评估产品影响
    if (message.includes('项目') && message.includes('历史')) {
      assessment = '数据恢复方案完全符合产品需求，用户数据得到保护';
      recommendations = [
        '建议立即实施数据恢复',
        '建立数据备份机制',
        '优化数据迁移流程',
        '收集用户满意度反馈'
      ];
      priority = '高';
      userImpact = '正面 - 恢复用户信任';
      businessValue = 9;
      deviationRisk = '无偏离风险';
      confidence = 95;
    } else if (message.includes('API') || message.includes('Network')) {
      assessment = '网络修复方案可能影响用户体验';
      recommendations = [
        '建议在低峰期实施',
        '准备回滚方案',
        '监控用户反馈'
      ];
      priority = '高';
      userImpact = '中性 - 短期影响';
      businessValue = 7;
      deviationRisk = '低偏离风险';
      confidence = 85;
    }

    return {
      assessment,
      recommendations,
      confidence,
      priority,
      userImpact,
      businessValue,
      deviationRisk
    };
  }

  /**
   * 判断是否应该启动技能
   */
  private shouldStartSkill(error: any): boolean {
    // 简单的判断逻辑
    const message = error.message || '';

    // 忽略一些常见的、不重要的错误
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Script error',
      'Non-Error promise rejection captured'
    ];

    return !ignoredErrors.some(ignored => message.includes(ignored));
  }

  /**
   * 生成技能ID
   */
  private generateSkillId(): string {
    return `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取技能状态
   */
  public getSkillStatus(skillId: string): SkillResult | null {
    return this.activeSkills.get(skillId) || null;
  }

  /**
   * 获取所有活跃技能
   */
  public getActiveSkills(): Map<string, SkillResult> {
    return new Map(this.activeSkills);
  }

  /**
   * 清理完成的技能
   */
  public cleanupCompletedSkills(): number {
    let cleaned = 0;

    for (const [skillId, skill] of this.activeSkills.entries()) {
      if (skill.stage === SkillStage.COMPLETED || skill.stage === SkillStage.FAILED) {
        this.activeSkills.delete(skillId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 清理了 ${cleaned} 个已完成的技能`);
    }

    return cleaned;
  }

  /**
   * 获取技能统计
   */
  public getStats(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    byStage: Record<SkillStage, number>;
  } {
    const stats = {
      total: this.activeSkills.size,
      active: 0,
      completed: 0,
      failed: 0,
      byStage: {} as Record<SkillStage, number>
    };

    for (const skill of this.activeSkills.values()) {
      switch (skill.stage) {
        case SkillStage.DEBUG_ANALYSIS:
        case SkillStage.DEVELOPMENT_FIX:
        case SkillStage.TESTING_VERIFY:
        case SkillStage.PRODUCT_EVALUATION:
          stats.active++;
          break;
        case SkillStage.COMPLETED:
          stats.completed++;
          break;
        case SkillStage.FAILED:
          stats.failed++;
          break;
      }

      stats.byStage[skill.stage] = (stats.byStage[skill.stage] || 0) + 1;
    }

    return stats;
  }
}

// 创建单例实例
export const errorDebuggingSkill = new ErrorDebuggingSkill();

// 导出便捷方法
export const startErrorDebugging = (error: any) => errorDebuggingSkill.detectAndStart(error);

// Hook for React
export function useErrorDebuggingSkill() {
  const [skills, setSkills] = useState<Map<string, SkillResult>>(new Map());
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const updateStats = () => {
      setSkills(new Map(errorDebuggingSkill.getActiveSkills()));
      setStats(errorDebuggingSkill.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleError = useCallback((error: any) => {
    return errorDebuggingSkill.detectAndStart(error);
  }, []);

  const cleanup = useCallback(() => {
    return errorDebuggingSkill.cleanupCompletedSkills();
  }, []);

  return {
    skills,
    stats,
    handleError,
    cleanup,
    isRunning: (stats?.active || 0) > 0
  };
}

export default errorDebuggingSkill;