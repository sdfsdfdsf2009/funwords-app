import React from 'react';
import { CheckCircle, Circle, ArrowRight, Play, Edit3, Download } from 'lucide-react';
import { useDatabaseProjectStore } from '../../stores/databaseProjectStore';

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  isCompleted: boolean;
  isCurrent: boolean;
  isNext: boolean;
  reason?: string;
}

interface WorkflowIndicatorProps {
  currentProject?: any;
  currentView: string;
  className?: string;
}

export const WorkflowIndicator: React.FC<WorkflowIndicatorProps> = ({
  currentProject,
  currentView,
  className = ''
}) => {
  const { projects } = useDatabaseProjectStore();

  if (!currentProject) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <Play className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">开始您的创作之旅</h3>
            <p className="text-xs text-blue-700">创建项目或选择现有项目开始</p>
          </div>
        </div>
      </div>
    );
  }

  // 计算工作流程状态
  const hasScenes = currentProject.scenes.length > 0;
  const hasImages = currentProject.scenes.some(s => s.generatedImage);
  const hasVideos = currentProject.scenes.some(s => s.generatedVideo || (s.generatedVideos && s.generatedVideos.length > 0));

  // 定义工作流程步骤
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'import',
      label: '导入内容',
      description: 'CSV导入和场景管理',
      icon: Play,
      isCompleted: hasScenes,
      isCurrent: ['import', 'scenes'].includes(currentView),
      isNext: !hasScenes
    },
    {
      id: 'create',
      label: 'AI生成',
      description: '生成图片和视频',
      icon: Edit3,
      isCompleted: hasVideos,
      isCurrent: ['generation', 'video-generation', 'prompt-editor'].includes(currentView),
      isNext: hasScenes && !hasVideos,
      reason: !hasScenes ? '需要先导入场景' : undefined
    },
    {
      id: 'edit',
      label: '视频编辑',
      description: '编辑和合成视频',
      icon: Edit3,
      isCompleted: false, // 编辑步骤通常没有明确的完成状态
      isCurrent: ['timeline', 'remotion-editor'].includes(currentView),
      isNext: hasVideos,
      reason: !hasVideos ? '需要先生成视频' : undefined
    },
    {
      id: 'export',
      label: '导出下载',
      description: '下载和分享作品',
      icon: Download,
      isCompleted: false,
      isCurrent: false,
      isNext: hasVideos && ['timeline', 'remotion-editor'].includes(currentView),
      reason: !hasVideos ? '需要先完成编辑' : undefined
    }
  ];

  // 找到当前步骤索引
  const currentStepIndex = workflowSteps.findIndex(step => step.isCurrent);
  const completedSteps = workflowSteps.filter(step => step.isCompleted).length;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Web优化的进度条 */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-base font-medium text-gray-900">项目进度</span>
            {completedSteps > 0 && (
              <span className="text-sm text-gray-500">({completedSteps}/{workflowSteps.length} 步骤完成)</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedSteps / workflowSteps.length) * 100}%` }}
              />
            </div>
            {currentStepIndex >= 0 && (
              <span className="text-sm font-medium text-gray-700">
                {workflowSteps[currentStepIndex].label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Web端步骤展示 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.isCurrent || step.isCompleted;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                {/* 步骤图标 */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 mb-2
                  ${step.isCompleted
                    ? 'bg-green-500 text-white shadow-md'
                    : step.isCurrent
                    ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-200'
                    : step.isNext
                    ? 'bg-gray-300 text-gray-600'
                    : 'bg-gray-200 text-gray-400'
                  }
                `}>
                  {step.isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* 步骤标签 */}
                <div className="text-center">
                  <span className={`
                    text-sm font-medium block
                    ${isActive ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    {step.label}
                  </span>
                  {step.reason && (
                    <span className="text-xs text-orange-600 mt-1 block" title={step.reason}>
                      {step.reason}
                    </span>
                  )}
                </div>

                {/* 连接线 */}
                {index < workflowSteps.length - 1 && (
                  <div className={`w-full h-0.5 mt-5 ${step.isCompleted ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* 当前步骤提示 */}
        {currentStepIndex >= 0 && workflowSteps[currentStepIndex].reason && (
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              💡 {workflowSteps[currentStepIndex].reason}
            </p>
          </div>
        )}

        {/* 下一步建议 */}
        {completedSteps > 0 && completedSteps < workflowSteps.length && (
          <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Play className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {hasScenes && !hasVideos && '下一步：开始生成图片和视频'}
                {hasVideos && '下一步：开始编辑您的视频'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowIndicator;