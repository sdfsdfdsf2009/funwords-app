/**
 * 调试专家系统
 * 专门负责错误诊断和根因分析
 */

import { errorMonitor } from './errorMonitor';
import { errorDebuggingWorkflow, DebugReport, ErrorPriority, ErrorCategory } from './errorDebuggingWorkflow';

// 调试分析结果接口
export interface DebugAnalysis {
  rootCause: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  complexity: 'simple' | 'moderate' | 'complex';
  reproducible: boolean;
  relatedFiles: string[];
  affectedComponents: string[];
  reproductionSteps: string[];
  additionalContext: string[];
  estimatedFixTime: number;
  requiredExpertise: string[];
}

// 调试专家类
export class DebugExpert {
  private expertId: string;
  private name: string;
  private specialties: string[];

  constructor(expertId: string = 'debug-specialist', name: string = '调试专家') {
    this.expertId = expertId;
    this.name = name;
    this.specialties = [
      'JavaScript错误分析',
      'React错误诊断',
      'API错误调试',
      '性能问题分析',
      '状态管理错误',
      '网络连接问题',
      '浏览器兼容性',
      '异步操作调试'
    ];
  }

  /**
   * 分析错误并生成诊断报告
   */
  public async analyzeError(taskId: string, errorInfo: any): Promise<DebugAnalysis> {
    console.log(`[DebugExpert] 开始分析错误任务: ${taskId}`);

    // 收集相关错误信息
    const relatedErrors = this.collectRelatedErrors(errorInfo);
    const userActions = this.getRelevantUserActions(errorInfo);

    // 执行根因分析
    const rootCause = await this.identifyRootCause(errorInfo, relatedErrors, userActions);

    // 评估影响和复杂度
    const impact = this.assessImpact(errorInfo, rootCause);
    const complexity = this.assessComplexity(errorInfo, rootCause);

    // 确定可重现性
    const reproducible = this.assessReproducibility(errorInfo, userActions);

    // 识别相关文件和组件
    const relatedFiles = this.identifyRelatedFiles(errorInfo);
    const affectedComponents = this.identifyAffectedComponents(errorInfo);

    // 生成重现步骤
    const reproductionSteps = this.generateReproductionSteps(errorInfo, userActions);

    // 收集额外上下文
    const additionalContext = this.gatherAdditionalContext(errorInfo, relatedErrors);

    // 估算修复时间
    const estimatedFixTime = this.estimateFixTime(complexity, impact, relatedFiles.length);

    // 确定所需专业技能
    const requiredExpertise = this.identifyRequiredExpertise(errorInfo, relatedFiles);

    const analysis: DebugAnalysis = {
      rootCause,
      impact,
      complexity,
      reproducible,
      relatedFiles,
      affectedComponents,
      reproductionSteps,
      additionalContext,
      estimatedFixTime,
      requiredExpertise
    };

    console.log(`[DebugExpert] 错误分析完成:`, analysis);
    return analysis;
  }

  /**
   * 收集相关错误信息
   */
  private collectRelatedErrors(errorInfo: any): any[] {
    const allErrors = errorMonitor.getErrors();
    const errorTimestamp = new Date(errorInfo.timestamp || Date.now());
    const oneHourAgo = new Date(errorTimestamp.getTime() - 60 * 60 * 1000);

    // 收集1小时内的相关错误
    return allErrors.filter(error => {
      const errorTime = new Date(error.timestamp);
      return errorTime >= oneHourAgo &&
             (error.type === errorInfo.type ||
              error.component === errorInfo.component ||
              error.source === errorInfo.source);
    });
  }

  /**
   * 获取相关的用户操作
   */
  private getRelevantUserActions(errorInfo: any): any[] {
    const allActions = errorMonitor.getUserActions();
    const errorTimestamp = new Date(errorInfo.timestamp || Date.now());
    const fiveMinutesAgo = new Date(errorTimestamp.getTime() - 5 * 60 * 1000);

    // 收集5分钟内的用户操作
    return allActions.filter(action => {
      const actionTime = new Date(action.timestamp);
      return actionTime >= fiveMinutesAgo;
    });
  }

  /**
   * 识别根本原因
   */
  private async identifyRootCause(errorInfo: any, relatedErrors: any[], userActions: any[]): Promise<string> {
    const message = errorInfo.message || '';
    const stack = errorInfo.stack || '';
    const component = errorInfo.component || '';
    const type = errorInfo.type || '';

    // 基于错误类型的分析
    if (type === 'api' || message.includes('api') || message.includes('fetch')) {
      return this.analyzeAPIError(errorInfo, relatedErrors);
    }

    if (type === 'react' || component || message.includes('render')) {
      return this.analyzeReactError(errorInfo, relatedErrors);
    }

    if (message.includes('network') || message.includes('connection')) {
      return this.analyzeNetworkError(errorInfo, relatedErrors);
    }

    if (message.includes('timeout') || message.includes('slow')) {
      return this.analyzePerformanceError(errorInfo, relatedErrors);
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return this.analyzeSecurityError(errorInfo, relatedErrors);
    }

    if (message.includes('state') || message.includes('store')) {
      return this.analyzeStateError(errorInfo, relatedErrors);
    }

    // 通用错误分析
    return this.analyzeGenericError(errorInfo, relatedErrors, userActions);
  }

  private analyzeAPIError(errorInfo: any, relatedErrors: any[]): string {
    const message = errorInfo.message || '';

    if (message.includes('401') || message.includes('unauthorized')) {
      return 'API认证失败：用户身份验证过期或API密钥无效';
    }

    if (message.includes('403') || message.includes('forbidden')) {
      return 'API权限不足：当前用户没有访问该资源的权限';
    }

    if (message.includes('404') || message.includes('not found')) {
      return 'API端点不存在：请求的URL路径错误或服务器端点已移除';
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return 'API调用频率超限：请求过于频繁，触发了速率限制';
    }

    if (message.includes('500') || message.includes('server error')) {
      return '服务器内部错误：API服务器处理请求时发生异常';
    }

    if (message.includes('network') || message.includes('connection')) {
      return '网络连接问题：无法连接到API服务器，可能是网络故障或服务器不可用';
    }

    return 'API调用失败：未知的API错误，需要进一步调查';
  }

  private analyzeReactError(errorInfo: any, relatedErrors: any[]): string {
    const message = errorInfo.message || '';
    const component = errorInfo.component || '';

    if (message.includes('Cannot read prop') || message.includes('undefined')) {
      return `React组件属性错误：组件 ${component} 尝试访问未定义的属性`;
    }

    if (message.includes('state') || message.includes('setState')) {
      return `React状态错误：组件 ${component} 状态更新出现问题`;
    }

    if (message.includes('render') || message.includes('hydration')) {
      return `React渲染错误：组件 ${component} 渲染过程中发生异常`;
    }

    if (message.includes('hook') || message.includes('useEffect')) {
      return `React Hook错误：组件 ${component} 中的Hook使用不当`;
    }

    if (message.includes('props') || message.includes('children')) {
      return `React属性传递错误：组件 ${component} 的props或children配置有问题`;
    }

    return `React组件错误：组件 ${component} 运行时发生未知异常`;
  }

  private analyzeNetworkError(errorInfo: any, relatedErrors: any[]): string {
    const message = errorInfo.message || '';

    if (message.includes('CORS') || message.includes('cross-origin')) {
      return 'CORS跨域错误：前端应用无法访问跨域资源，需要服务器配置CORS策略';
    }

    if (message.includes('timeout')) {
      return '网络超时：请求响应时间过长，可能是网络延迟或服务器处理缓慢';
    }

    if (message.includes('connection refused')) {
      return '连接被拒绝：目标服务器不可达或端口未开放';
    }

    if (message.includes('SSL') || message.includes('certificate')) {
      return 'SSL证书错误：HTTPS连接的证书验证失败';
    }

    return '网络连接错误：无法建立网络连接，需要检查网络配置和服务器状态';
  }

  private analyzePerformanceError(errorInfo: any, relatedErrors: any[]): string {
    const message = errorInfo.message || '';

    if (message.includes('memory') || message.includes('leak')) {
      return '内存泄漏问题：应用存在内存管理问题，导致内存使用持续增长';
    }

    if (message.includes('slow') || message.includes('lag')) {
      return '性能瓶颈：应用响应缓慢，需要优化算法或减少计算量';
    }

    if (message.includes('render') || message.includes('paint')) {
      return '渲染性能问题：组件渲染过于频繁或渲染成本过高';
    }

    return '性能问题：应用运行缓慢，需要进行性能优化';
  }

  private analyzeSecurityError(errorInfo: any, relatedErrors: any[]): string {
    const message = errorInfo.message || '';

    if (message.includes('XSS') || message.includes('script')) {
      return 'XSS安全漏洞：存在跨站脚本攻击风险，需要输入验证和输出编码';
    }

    if (message.includes('CSRF') || message.includes('forgery')) {
      return 'CSRF安全漏洞：存在跨站请求伪造风险，需要CSRF令牌验证';
    }

    if (message.includes('injection') || message.includes('SQL')) {
      return '注入攻击风险：存在代码注入漏洞，需要参数化查询和输入过滤';
    }

    return '安全问题：检测到潜在的安全风险，需要安全审计';
  }

  private analyzeStateError(errorInfo: any, relatedErrors: any[]): string {
    const message = errorInfo.message || '';
    const source = errorInfo.source || '';

    if (source.includes('projectStore') || source.includes('project')) {
      return '项目状态管理错误：项目数据的增删改查操作出现异常';
    }

    if (source.includes('apiConfigStore') || source.includes('api')) {
      return 'API配置状态错误：API配置信息的更新或读取出现问题';
    }

    if (source.includes('videoPresetStore') || source.includes('video')) {
      return '视频预设状态错误：视频预设数据的管理操作异常';
    }

    return '状态管理错误：应用状态更新过程中发生异常';
  }

  private analyzeGenericError(errorInfo: any, relatedErrors: any[], userActions: any[]): string {
    const message = errorInfo.message || '';

    // 基于最近的用户操作分析
    if (userActions.length > 0) {
      const lastAction = userActions[0];
      if (lastAction.type === 'click' && message.includes('click')) {
        return `用户操作触发错误：点击元素 "${lastAction.target}" 时发生异常`;
      }

      if (lastAction.type === 'form-submit' && message.includes('submit')) {
        return `表单提交错误：提交表单时数据处理出现异常`;
      }
    }

    // 基于相关错误模式分析
    if (relatedErrors.length > 3) {
      return `系统性错误：在短时间内发生${relatedErrors.length + 1}个相关错误，可能存在系统性问题`;
    }

    return `未知错误：${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
  }

  /**
   * 评估错误影响
   */
  private assessImpact(errorInfo: any, rootCause: string): 'critical' | 'high' | 'medium' | 'low' {
    const message = errorInfo.message || '';
    const type = errorInfo.type || '';

    // 关键影响
    if (rootCause.includes('安全') || rootCause.includes('崩溃') || message.includes('fatal')) {
      return 'critical';
    }

    // 高影响
    if (type === 'api' || rootCause.includes('核心功能') || message.includes('unavailable')) {
      return 'high';
    }

    // 中等影响
    if (type === 'ui' || rootCause.includes('渲染') || message.includes('display')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 评估修复复杂度
   */
  private assessComplexity(errorInfo: any, rootCause: string): 'simple' | 'moderate' | 'complex' {
    // 简单问题
    if (rootCause.includes('配置') || rootCause.includes('权限') || rootCause.includes('API密钥')) {
      return 'simple';
    }

    // 中等复杂度
    if (rootCause.includes('组件') || rootCause.includes('属性') || rootCause.includes('状态')) {
      return 'moderate';
    }

    // 复杂问题
    if (rootCause.includes('系统') || rootCause.includes('性能') || rootCause.includes('安全')) {
      return 'complex';
    }

    return 'moderate';
  }

  /**
   * 评估可重现性
   */
  private assessReproducibility(errorInfo: any, userActions: any[]): boolean {
    // 如果有明确的错误堆栈或组件信息，认为可重现
    if (errorInfo.stack || errorInfo.component || errorInfo.context?.componentStack) {
      return true;
    }

    // 如果有具体的用户操作序列，认为可重现
    if (userActions.length > 0 && userActions[0].target !== 'unknown') {
      return true;
    }

    // 如果错误频率较高，认为可重现
    if (errorInfo.context?.frequency && errorInfo.context.frequency > 1) {
      return true;
    }

    return false;
  }

  /**
   * 识别相关文件
   */
  private identifyRelatedFiles(errorInfo: any): string[] {
    const files: string[] = [];
    const source = errorInfo.source || '';
    const component = errorInfo.component || '';
    const stack = errorInfo.stack || '';

    // 基于错误类型识别文件
    if (source.includes('api')) {
      files.push(
        'pages/api/evolink/v1/tasks/[taskId].ts',
        'pages/api/evolink/v1/videos/generations.ts',
        'pages/api/evolink/v1/images/generations.ts',
        'src/utils/apiService.ts'
      );
    }

    if (component || stack.includes('components')) {
      files.push(
        `src/components/${component}*.tsx`,
        'src/components/ui/ErrorBoundary.tsx',
        'src/hooks/useComponentErrorHandler.ts'
      );
    }

    if (source.includes('store')) {
      files.push(
        'src/stores/projectStore.ts',
        'src/stores/apiConfigStore.ts',
        'src/stores/videoPresetStore.ts'
      );
    }

    // 基于错误堆栈识别文件
    if (stack) {
      const stackLines = stack.split('\n');
      stackLines.forEach(line => {
        if (line.includes('.tsx') || line.includes('.ts')) {
          const match = line.match(/(src\/.*?\.(tsx|ts))/);
          if (match) {
            files.push(match[1]);
          }
        }
      });
    }

    // 去重并返回
    return [...new Set(files)];
  }

  /**
   * 识别受影响的组件
   */
  private identifyAffectedComponents(errorInfo: any): string[] {
    const components: string[] = [];
    const component = errorInfo.component || '';
    const stack = errorInfo.stack || '';

    if (component) {
      components.push(component);
    }

    // 基于错误堆栈识别组件
    if (stack) {
      const componentMatches = stack.match(/(\w+Component|[\w-]+\.tsx)/g);
      if (componentMatches) {
        componentMatches.forEach(match => {
          if (!components.includes(match)) {
            components.push(match);
          }
        });
      }
    }

    // 基于错误信息推断组件
    const message = errorInfo.message || '';
    if (message.includes('video')) {
      components.push('VideoGeneration', 'VideoProgress');
    }
    if (message.includes('image')) {
      components.push('ImageGeneration');
    }
    if (message.includes('project')) {
      components.push('ProjectSelector', 'ProjectManager');
    }
    if (message.includes('api')) {
      components.push('APIConfigManager', 'APIConfigEditor');
    }

    return [...new Set(components)];
  }

  /**
   * 生成重现步骤
   */
  private generateReproductionSteps(errorInfo: any, userActions: any[]): string[] {
    const steps: string[] = [];

    // 基于用户操作生成步骤
    if (userActions.length > 0) {
      steps.push('1. 打开应用页面');
      userActions.slice(0, 5).forEach((action, index) => {
        if (action.type === 'click') {
          steps.push(`${index + 2}. 点击 "${action.target}" 元素`);
        } else if (action.type === 'form-submit') {
          steps.push(`${index + 2}. 提交表单`);
        }
      });
      steps.push(`${userActions.length + 2}. 错误发生`);
    } else {
      // 基于错误信息生成通用步骤
      steps.push('1. 打开相关功能页面');
      steps.push('2. 执行相关操作');
      steps.push('3. 错误发生');
    }

    return steps;
  }

  /**
   * 收集额外上下文
   */
  private gatherAdditionalContext(errorInfo: any, relatedErrors: any[]): string[] {
    const context: string[] = [];

    // 添加时间上下文
    const errorTime = new Date(errorInfo.timestamp || Date.now());
    context.push(`错误发生时间: ${errorTime.toISOString()}`);

    // 添加相关错误统计
    if (relatedErrors.length > 0) {
      context.push(`1小时内相关错误: ${relatedErrors.length} 个`);
    }

    // 添加环境信息
    if (typeof window !== 'undefined') {
      context.push(`浏览器: ${navigator.userAgent}`);
      context.push(`页面URL: ${window.location.href}`);
    }

    // 添加用户上下文
    if (errorInfo.userId) {
      context.push(`用户ID: ${errorInfo.userId}`);
    }

    if (errorInfo.sessionId) {
      context.push(`会话ID: ${errorInfo.sessionId}`);
    }

    return context;
  }

  /**
   * 估算修复时间
   */
  private estimateFixTime(complexity: string, impact: string, fileCount: number): number {
    let baseTime = 30; // 基础时间30分钟

    // 根据复杂度调整
    if (complexity === 'simple') {
      baseTime = 15;
    } else if (complexity === 'complex') {
      baseTime = 120;
    }

    // 根据影响调整
    if (impact === 'critical') {
      baseTime *= 1.5;
    }

    // 根据文件数量调整
    baseTime += fileCount * 10;

    return Math.round(baseTime);
  }

  /**
   * 识别所需专业技能
   */
  private identifyRequiredExpertise(errorInfo: any, relatedFiles: string[]): string[] {
    const expertise: string[] = [];

    // 基于错误类型
    const type = errorInfo.type || '';
    if (type === 'api') {
      expertise.push('API开发', '网络编程');
    }
    if (type === 'react') {
      expertise.push('React开发', '前端开发');
    }
    if (type === 'state') {
      expertise.push('状态管理', '数据流设计');
    }

    // 基于相关文件
    relatedFiles.forEach(file => {
      if (file.includes('api')) {
        expertise.push('后端开发');
      }
      if (file.includes('components')) {
        expertise.push('组件开发');
      }
      if (file.includes('stores')) {
        expertise.push('状态管理');
      }
    });

    // 去重并返回
    return [...new Set(expertise)];
  }

  /**
   * 处理调试任务
   */
  public async handleDebugTask(taskId: string): Promise<void> {
    console.log(`[DebugExpert] 开始处理调试任务: ${taskId}`);

    try {
      // 获取任务信息
      const task = errorDebuggingWorkflow.getTaskStatus(taskId);
      if (!task) {
        throw new Error(`任务 ${taskId} 不存在`);
      }

      // 分析错误
      const analysis = await this.analyzeError(taskId, task.context);

      // 生成调试报告
      const debugReport: Omit<DebugReport, 'taskId' | 'createdAt'> = {
        expertId: this.expertId,
        diagnosis: {
          rootCause: analysis.rootCause,
          impact: analysis.impact,
          complexity: analysis.complexity,
          reproducible: analysis.reproducible,
          relatedFiles: analysis.relatedFiles,
          affectedComponents: analysis.affectedComponents
        },
        recommendations: {
          immediateActions: this.generateImmediateActions(analysis),
          longTermFixes: this.generateLongTermFixes(analysis),
          preventionMeasures: this.generatePreventionMeasures(analysis)
        },
        estimatedFixTime: analysis.estimatedFixTime,
        requiredExpertise: analysis.requiredExpertise
      };

      // 提交调试报告
      await errorDebuggingWorkflow.submitDebugReport(taskId, debugReport);

      console.log(`[DebugExpert] 调试任务 ${taskId} 完成`);
    } catch (error) {
      console.error(`[DebugExpert] 调试任务 ${taskId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 生成立即行动建议
   */
  private generateImmediateActions(analysis: DebugAnalysis): string[] {
    const actions: string[] = [];

    if (analysis.reproducible) {
      actions.push('按照重现步骤验证错误');
    }

    actions.push('检查相关文件的代码逻辑');

    if (analysis.relatedFiles.length > 0) {
      actions.push(`重点检查: ${analysis.relatedFiles.slice(0, 3).join(', ')}`);
    }

    if (analysis.impact === 'critical') {
      actions.push('立即采取临时修复措施以减少影响');
    }

    return actions;
  }

  /**
   * 生成长期修复建议
   */
  private generateLongTermFixes(analysis: DebugAnalysis): string[] {
    const fixes: string[] = [];

    if (analysis.complexity === 'complex') {
      fixes.push('重构相关代码模块');
    }

    fixes.push('添加单元测试和集成测试');
    fixes.push('改进错误处理机制');

    if (analysis.relatedFiles.length > 2) {
      fixes.push('优化代码架构，减少模块间耦合');
    }

    return fixes;
  }

  /**
   * 生成预防措施建议
   */
  private generatePreventionMeasures(analysis: DebugAnalysis): string[] {
    const measures: string[] = [];

    measures.push('加强代码审查流程');
    measures.push('改进日志记录和监控');

    if (analysis.reproducible) {
      measures.push('添加自动化测试覆盖此场景');
    }

    if (analysis.impact === 'critical' || analysis.impact === 'high') {
      measures.push('建立预警机制，提前发现问题');
    }

    return measures;
  }
}

// 创建调试专家实例
export const debugExpert = new DebugExpert();