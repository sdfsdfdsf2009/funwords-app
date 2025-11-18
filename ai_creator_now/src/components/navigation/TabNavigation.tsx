import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  Film,
  Settings,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useDatabaseProjectStore } from '../../stores/databaseProjectStore';

// 标签页配置 - 基于工作流程导向
const TABS = [
  {
    id: 'import',
    label: '导入内容',
    icon: Upload,
    description: 'CSV导入和场景创建',
    color: 'blue',
    subItems: [
      { id: 'import', label: 'CSV导入', icon: Upload },
      { id: 'scenes', label: '场景管理', icon: Settings }
    ]
  },
  {
    id: 'create',
    label: 'AI生成',
    icon: Sparkles,
    description: '图片和视频生成',
    color: 'purple',
    subItems: [
      { id: 'generation', label: '图片生成', icon: Upload },
      { id: 'video-generation', label: '视频生成', icon: Film },
      { id: 'prompt-editor', label: '提示词编辑', icon: Settings }
    ]
  },
  {
    id: 'edit',
    label: '视频编辑',
    icon: Film,
    description: '编辑和合成视频',
    color: 'green',
    subItems: [
      { id: 'timeline', label: '视频编辑', icon: Film },
      { id: 'remotion-editor', label: 'Remotion编辑器', icon: Settings }
    ]
  },
  {
    id: 'tools',
    label: '高级工具',
    icon: Settings,
    description: '配置和调试工具',
    color: 'gray',
    subItems: [
      { id: 'api-config', label: 'API配置', icon: Settings },
      { id: 'debug', label: '调试工具', icon: Settings },
      { id: 'task-management', label: '任务管理', icon: Settings }
    ]
  }
] as const;

interface TabNavigationProps {
  currentView: string;
  onTabChange: (tabId: string, subItemId?: string) => void;
  currentProject?: any;
}

interface TabStatus {
  available: boolean;
  reason?: string;
  progress?: number;
  badge?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  currentView,
  onTabChange,
  currentProject
}) => {
  const [expandedTabs, setExpandedTabs] = useState<string[]>(['import']);
  const { projects } = useDatabaseProjectStore();

  // 检查标签页状态
  const getTabStatus = (tab: typeof TABS[0]): TabStatus => {
    if (!currentProject) {
      return {
        available: tab.id === 'import',
        reason: '请先创建项目'
      };
    }

    switch (tab.id) {
      case 'import':
        return {
          available: true,
          progress: currentProject.scenes.length > 0 ? 100 : 0,
          badge: currentProject.scenes.length > 0 ? '已完成' : undefined
        };

      case 'create':
        const hasScenes = currentProject.scenes.length > 0;
        const generatedImages = currentProject.scenes.filter(s => s.generatedImage).length;
        const generatedVideos = currentProject.scenes.filter(s => s.generatedVideo || (s.generatedVideos && s.generatedVideos.length > 0)).length;

        return {
          available: hasScenes,
          reason: hasScenes ? undefined : '请先导入场景',
          progress: hasScenes ? Math.round((generatedImages + generatedVideos) / (currentProject.scenes.length * 2) * 100) : 0,
          badge: generatedVideos > 0 ? `${generatedVideos}个视频` : undefined
        };

      case 'edit':
        const hasVideos = currentProject.scenes.some(s => s.generatedVideo || (s.generatedVideos && s.generatedVideos.length > 0));
        return {
          available: hasVideos,
          reason: hasVideos ? undefined : '请先生成视频',
          badge: hasVideos ? '可编辑' : '需要视频'
        };

      case 'tools':
        return {
          available: true,
          badge: '配置'
        };

      default:
        return { available: true };
    }
  };

  // 获取标签页颜色样式
  const getTabColorClasses = (color: string, isActive: boolean, status: TabStatus) => {
    if (!status.available) {
      return `
        text-gray-400 border-gray-200 bg-gray-50
        hover:text-gray-500 hover:border-gray-300
      `;
    }

    const colorClasses = {
      blue: isActive ? 'text-blue-600 border-blue-500 bg-blue-50' : 'text-gray-600 border-gray-300 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50',
      purple: isActive ? 'text-purple-600 border-purple-500 bg-purple-50' : 'text-gray-600 border-gray-300 hover:text-purple-600 hover:border-purple-400 hover:bg-purple-50',
      green: isActive ? 'text-green-600 border-green-500 bg-green-50' : 'text-gray-600 border-gray-300 hover:text-green-600 hover:border-green-400 hover:bg-green-50',
      gray: isActive ? 'text-gray-700 border-gray-500 bg-gray-100' : 'text-gray-600 border-gray-300 hover:text-gray-700 hover:border-gray-500 hover:bg-gray-100'
    };

    return colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  };

  // 处理标签页点击
  const handleTabClick = (tabId: string) => {
    const tab = TABS.find(t => t.id === tabId);
    if (!tab) return;

    const status = getTabStatus(tab);
    if (!status.available) {
      // 显示不可用原因
      console.log('功能不可用:', status.reason);
      return;
    }

    // 切换展开状态
    setExpandedTabs(prev =>
      prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    );

    // 如果标签页没有子项，直接切换
    if (tab.subItems.length === 0) {
      onTabChange(tabId);
    }
  };

  // 处理子项点击
  const handleSubItemClick = (tabId: string, subItemId: string) => {
    onTabChange(tabId, subItemId);
  };

  // 获取状态图标
  const getStatusIcon = (status: TabStatus) => {
    if (!status.available) {
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }

    if (status.progress === 100) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }

    if (status.progress && status.progress > 0) {
      return <Clock className="w-4 h-4 text-blue-500" />;
    }

    return null;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4">
        {/* Web端标签页 */}
        <div className="flex items-center space-x-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id || tab.subItems.some(sub => currentView === sub.id);
            const isExpanded = expandedTabs.includes(tab.id);
            const status = getTabStatus(tab);
            const colorClasses = getTabColorClasses(tab.color, isActive, status);

            return (
              <div key={tab.id} className="relative">
                {/* 主标签页 */}
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-3 border-b-2 transition-all duration-200
                    ${colorClasses}
                    ${status.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  `}
                  disabled={!status.available}
                  title={status.reason || tab.description}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>

                  {/* 状态图标 */}
                  {getStatusIcon(status)}

                  {/* 徽章 */}
                  {status.badge && (
                    <span className="px-2 py-1 text-xs rounded-full bg-current/10 text-current">
                      {status.badge}
                    </span>
                  )}

                  {/* 展开指示器 */}
                  {tab.subItems.length > 0 && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* 子项下拉菜单 */}
                {tab.subItems.length > 0 && isExpanded && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
                    {tab.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = currentView === subItem.id;

                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleSubItemClick(tab.id, subItem.id)}
                          className={`
                            w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors
                            ${isSubActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50'
                            }
                            ${subItem.id === 'timeline' && status.reason ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                          disabled={subItem.id === 'timeline' && !!status.reason}
                          title={subItem.id === 'timeline' && status.reason ? status.reason : undefined}
                        >
                          <SubIcon className="w-4 h-4" />
                          <span className="flex-1">{subItem.label}</span>
                          {isSubActive && <CheckCircle className="w-4 h-4 text-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 移动端标签页 */}
        <div className="lg:hidden">
          {/* 移动端滚动标签页 */}
          <div className="flex items-center space-x-1 overflow-x-auto py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentView === tab.id || tab.subItems.some(sub => currentView === sub.id);
              const status = getTabStatus(tab);
              const colorClasses = getTabColorClasses(tab.color, isActive, status);

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    flex items-center space-x-2 px-3 py-2 border rounded-lg whitespace-nowrap transition-all duration-200
                    ${colorClasses}
                    ${status.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                  `}
                  disabled={!status.available}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                  {status.badge && (
                    <span className="px-1 py-0.5 text-xs rounded bg-current/10">
                      {status.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 移动端子项 */}
          {expandedTabs.map((tabId) => {
            const tab = TABS.find(t => t.id === tabId);
            if (!tab || tab.subItems.length === 0) return null;

            return (
              <div key={tabId} className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <tab.icon className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">{tab.label}</span>
                </div>
                <div className="space-y-1">
                  {tab.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = currentView === subItem.id;

                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleSubItemClick(tabId, subItem.id)}
                        className={`
                          w-full flex items-center space-x-2 px-3 py-2 rounded text-left transition-colors
                          ${isSubActive
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:bg-white'
                          }
                        `}
                      >
                        <SubIcon className="w-4 h-4" />
                        <span className="text-sm">{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TabNavigation;