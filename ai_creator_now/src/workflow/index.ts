/**
 * 错误调试工作流 - 完整集成包
 * 统一导出所有工作流相关的功能和配置
 */

// 核心工作流组件
export { safeErrorWorkflowController, SafetyLevel } from '../utils/safeErrorWorkflowController';
export { errorDebuggingWorkflow, WorkflowStage, ErrorPriority, ErrorCategory } from '../utils/errorDebuggingWorkflow';
export { errorWorkflowController, WorkflowEventType } from '../utils/errorWorkflowController';

// 专家系统
export { debugExpert } from '../utils/debugExpert';
export { developmentExpert } from '../utils/developmentExpert';
export { testingExpert } from '../utils/testingExpert';

// UI组件
export { default as WorkflowStatusTracker } from '../components/debug/WorkflowStatusTracker';
export { default as SafetyConfirmationPanel } from '../components/debug/SafetyConfirmationPanel';

// 集成管理器
export { default as WorkflowManager } from './WorkflowManager';
export { WorkflowConfig } from './WorkflowConfig';

// 错误处理集成
export { EnhancedErrorBoundary } from './integrations/ReactErrorBoundary';
export { ApiErrorInterceptor } from './integrations/ApiErrorInterceptor';
export { StateErrorMonitor } from './integrations/StateErrorMonitor';

// 工具函数
export { ErrorAnalyzer, ErrorClassifier } from './utils/ErrorAnalyzer';
export { createWorkflowLogger } from './utils/WorkflowLogger';

// 类型定义
export type {
  HumanConfirmationRequest,
  ConfirmationResult,
  WorkflowEvent,
  WorkflowStats
} from '../utils/safeErrorWorkflowController';

export type {
  WorkflowTask,
  DebugReport,
  DevelopmentReport,
  TestingReport
} from '../utils/errorDebuggingWorkflow';