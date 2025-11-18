import React, { useState, useEffect } from 'react';
import { SceneManager } from './components/csv-import/SceneManager';
import { APIConfigManager } from './components/api-config/APIConfigManager';
import { APIConfigEditor } from './components/api-config/APIConfigEditor';
import TaskStatusIndicator from './components/TaskStatusIndicator';
import { PromptEditor, PromptType } from './components/prompt-editor/PromptEditor';
import { ErrorBoundary, withErrorBoundary, useErrorMonitor } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { LoadingProvider } from './components/ui/LoadingIndicator';
import { useResponsive, useIsMobile } from './hooks/useResponsive';
import { useDatabaseProjectStore } from './stores/databaseProjectStore';
import { useAPIConfigStore } from './stores/apiConfigStore';
import { errorMonitor } from './utils/errorMonitor';
import { Scene, APIConfiguration, GenerationProgress } from './types';
import { Film, Upload, List, BarChart3, Sparkles, Settings, Plus, Image, CheckSquare, Bug, Wrench, Video, Cpu, Edit3, ChevronRight, Lightbulb, Users, TrendingUp, Smartphone } from 'lucide-react';
import { useRouter } from 'next/router';
import { TabNavigation } from './components/navigation/TabNavigation';
import { WorkflowIndicator } from './components/navigation/WorkflowIndicator';
import { preloadCriticalComponents } from './components/ui/LazyLoader';

// Import components directly for now
import { CSVImport } from './components/csv-import/CSVImport';
import { ImageGeneration } from './components/image-generation/ImageGeneration';
import { VideoGeneration } from './components/video-generation/VideoGeneration';
import { VideoEditor } from './components/video-editor/VideoEditor';
import { DebugPage } from './components/debug/DebugPage';
import { ProjectSelector } from './components/project/ProjectSelector';
import { CreateProjectModal } from './components/project/CreateProjectModal';
import { AIRecommendationEngine } from './components/ai-recommendations/AIRecommendationEngine';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { CollaborationHub } from './components/collaboration/CollaborationHub';
import { MobileOptimizedInterface } from './components/mobile/MobileOptimizedInterface';

type View = 'import' | 'scenes' | 'generation' | 'video-generation' | 'timeline' | 'api-config' | 'api-config-editor' | 'task-management' | 'debug' | 'prompt-editor' | 'ai-recommendations' | 'collaboration' | 'analytics' | 'mobile-optimization';

export const App: React.FC = () => {
  const router = useRouter();
  const { breakpoint, isMobile, isTablet, isDesktop } = useResponsive();
  const [currentView, setCurrentView] = useState<View>('import');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [editingConfig, setEditingConfig] = useState<APIConfiguration | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const {
  currentProject,
  projects,
  isLoading,
  createProject,
  addGeneratedImages,
  error,
  clearError,
  setCurrentProject
} = useDatabaseProjectStore();
  const { loadConfigurations, selectConfig, clearSelectedConfig, configurations, selectedConfigId } = useAPIConfigStore();

  // Load API configurations on mount
  React.useEffect(() => {
    loadConfigurations();

    // Preload critical components for better UX
    preloadCriticalComponents();
  }, [loadConfigurations]);

  // Handle client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Separate effect for loading projects with proper dependencies
  useEffect(() => {
    // Load data from PostgreSQL database (not localStorage)
    if (typeof window !== 'undefined' && isClient) {
      const initializeData = async () => {
        try {
          console.log('[App] 开始初始化数据...');
          const state = useDatabaseProjectStore.getState();

          // Load projects from database
          await state.loadProjects();

          console.log('[App] 项目加载完成:', {
            projectsCount: state.projects.length,
            currentProject: state.currentProject?.name || 'null',
            isLoading: state.isLoading
          });
        } catch (error) {
          console.error('[App] 初始化数据库数据失败:', error);
        }
      };

      initializeData();
    }
  }, [isClient]);

  // Auto-select project when projects are loaded and no project is selected
  useEffect(() => {
    if (!isLoading && projects.length > 0 && !currentProject) {
      console.log('[App] 开始自动选择最新项目:', {
        projectsCount: projects.length,
        currentProject: currentProject?.name || 'null',
        isLoading
      });

      const latestProject = projects.reduce((latest, project) => {
        const latestDate = new Date(latest.updatedAt);
        const projectDate = new Date(project.updatedAt);
        return projectDate > latestDate ? project : latest;
      });

      console.log('[App] 正在自动选择最新项目:', latestProject.name, 'ID:', latestProject.id);
      setCurrentProject(latestProject.id);
      console.log('[App] 从数据库自动恢复项目完成');
    } else if (!isLoading && projects.length === 0) {
      console.log('[App] 没有可用项目，项目列表为空');
    } else if (!isLoading && currentProject) {
      console.log('[App] 已有选中项目:', currentProject.name);
    }
  }, [isLoading, projects, currentProject, setCurrentProject]);

  // Open create project modal
  const handleCreateProjectClick = () => {
    if (isCreatingProject) return; // Prevent multiple clicks
    setShowCreateProjectModal(true);
  };

  // Handle project creation from modal
  const handleCreateProject = async (projectName: string, projectDescription?: string) => {
    setIsCreatingProject(true);
    try {
      await createProject({
        name: projectName,
        description: projectDescription
      });
      setCurrentView('import');
      console.log('✅ 项目创建成功:', projectName);
    } catch (error) {
      console.error('❌ 项目创建失败:', error);
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Handle scene selection
  const handleSceneSelect = (scene: Scene) => {
    setSelectedScene(scene);
  };

  // Handle CSV import completion
  const handleImportComplete = (result: any) => {
    if (result.scenes.length > 0) {
      setCurrentView('scenes');
    }
  };

  // Handle API configuration selection
  const handleConfigSelect = (config: APIConfiguration) => {
    selectConfig(config.id);
    setEditingConfig(config);
    setCurrentView('api-config-editor');
  };

  // Handle API configuration save
  const handleConfigSave = (config: APIConfiguration) => {
    setEditingConfig(null);
    setCurrentView('api-config');
  };

  // Handle API configuration cancel
  const handleConfigCancel = () => {
    setEditingConfig(null);
    setCurrentView('api-config');
  };

  // Handle primary navigation click
  const handlePrimaryNavClick = (itemId: string, subItemId?: string) => {
    if (subItemId) {
      // 处理子项点击
      const subItem = primaryNavItems
        .find(item => item.id === itemId)
        ?.subItems.find(sub => sub.id === subItemId);

      if (subItem && 'action' in subItem && typeof subItem.action === 'function') {
        (subItem as any).action();
      } else if (subItemId) {
        setCurrentView(subItemId as View);
      }
    } else {
      // 处理主项点击 - 默认选择第一个可用的子项
      const primaryItem = primaryNavItems.find(item => item.id === itemId);
      if (primaryItem) {
        const firstAvailableSubItem = primaryItem.subItems.find(sub => !('disabled' in sub) || !sub.disabled);
        if (firstAvailableSubItem) {
          if ('action' in firstAvailableSubItem && typeof firstAvailableSubItem.action === 'function') {
            (firstAvailableSubItem as any).action();
          } else {
            setCurrentView(firstAvailableSubItem.id as View);
          }
        }
      }
    }
  };

  // Handle settings dropdown click
  const handleSettingsClick = (action: string) => {
    setShowSettingsDropdown(false);

    switch (action) {
      case 'api-config':
        setCurrentView('api-config');
        break;
      case 'debug':
        setCurrentView('debug');
        break;
      case 'preferences':
        // TODO: 实现偏好设置页面
        alert('偏好设置功能正在开发中...');
        break;
      case 'data-management':
        // TODO: 实现数据管理页面
        alert('数据管理功能正在开发中...');
        break;
      case 'usage-stats':
        // TODO: 实现使用统计页面
        alert('使用统计功能正在开发中...');
        break;
    }
  };

  // Handle advanced tools click
  const handleAdvancedToolClick = (toolId: string) => {
    const tool = advancedTools.find(t => t.id === toolId);
    if (tool) {
      setCurrentView(toolId as View);
    }
  };

  // Handle image generation completion
  const handleImageGenerationComplete = (sceneId: string, progress: GenerationProgress) => {
    if (progress.status === 'completed' && progress.result) {
      // Save the generated image to the project
      const imageToSave = {
        id: progress.result.id,
        url: progress.result.url,
        thumbnailUrl: progress.result.thumbnailUrl,
        provider: progress.result.provider,
        prompt: progress.result.prompt,
        settings: progress.result.settings,
        metadata: {
          ...progress.result.metadata,
          sceneId, // 添加场景ID以便于后续查找
          configId: selectedConfigId // 确保保存配置ID用于历史记录
        },
        createdAt: progress.result.createdAt ? new Date(progress.result.createdAt) : new Date()
      };

      addGeneratedImages(sceneId, [imageToSave]);

      // 强制触发持久化保存
      setTimeout(() => {
        console.log('Image saved to project:', { sceneId, imageId: progress.result.id, imageData: imageToSave });
      }, 100);
      console.log('Image saved to project:', { sceneId, imageId: progress.result.id });
    }
  };

  // 清除所有数据的函数（数据库版本）
  const clearAllData = async () => {
    const projects = useDatabaseProjectStore.getState().projects;
    const currentProject = useDatabaseProjectStore.getState().currentProject;

    // 显示详细信息
    const message = currentProject
      ? `⚠️ 确定要清除所有数据吗？\n\n当前项目: ${currentProject.name}\n总项目数: ${projects.length}\n\n此操作将从数据库中删除所有项目、场景、图片和视频数据，且不可撤销！`
      : `⚠️ 确定要清除所有数据吗？\n\n总项目数: ${projects.length}\n\n此操作将从数据库中删除所有项目、场景、图片和视频数据，且不可撤销！`;

    if (!confirm(message)) {
      return;
    }

    // 第二次确认
    const finalConfirmation = prompt('请输入 "CLEAR" 来确认清除所有数据:');
    if (finalConfirmation !== 'CLEAR') {
      alert('操作已取消。');
      return;
    }

    try {
      // 清除数据库中的数据
      const { clearAllData: clearDatabaseData } = useDatabaseProjectStore.getState();
      await clearDatabaseData();

      // 清除 API配置存储
      const { configurations } = useAPIConfigStore.getState();
      useAPIConfigStore.setState({
        configurations: [],
        selectedConfigId: null,
        isLoading: false,
        error: null
      });

      alert('✅ 所有数据已从数据库中安全清除！页面将重新加载。');
      window.location.reload();
    } catch (error) {
      alert('❌ 清除数据时出错，请重试。');
      console.error('Clear data error:', error);
    }
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Close settings dropdown if clicking outside
      if (showSettingsDropdown && !target.closest('[data-settings-dropdown]')) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsDropdown]);

  // Debug: Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+D to open debug page
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setCurrentView('debug');
      }

      // Ctrl+Shift+C to clear all data
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        clearAllData();
      }

      // Escape to close dropdowns
      if (event.key === 'Escape') {
        setShowSettingsDropdown(false);
        setShowAdvancedTools(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 自动修正Evolink配置端点
  const fixEvolinkEndpoints = () => {
    const { updateConfiguration } = useAPIConfigStore.getState();
    let fixedCount = 0;

    for (const config of configurations) {
      if (config.name.includes('Evolink') || config.endpoint.includes('evolink')) {
        const updates: any = {};

        // 修正主端点
        if (config.endpoint.startsWith('https://api.evolink.ai')) {
          updates.endpoint = '/api/evolink/v1/images/generations';
        }

        // 修正轮询端点
        if (config.responseParser?.pollEndpoint?.startsWith('https://api.evolink.ai')) {
          updates.responseParser = {
            ...config.responseParser,
            pollEndpoint: '/api/evolink/v1/tasks/{taskId}'
          };
        }

        // 如果有需要修正的内容，执行更新
        if (Object.keys(updates).length > 0) {
          updateConfiguration(config.id, updates);
          fixedCount++;
        }
      }
    }

    if (fixedCount > 0) {
      alert(`✅ 已自动修正 ${fixedCount} 个Evolink配置的端点！\n\n现在可以正常使用图片生成功能了。`);
    } else {
      alert(`✅ 所有Evolink配置都正确使用了代理端点！`);
    }
  };

  // 配置检查功能
  const checkConfigStatus = () => {
    const activeConfig = configurations.find(config => config.isActive && config.id === selectedConfigId);
    const issues = [];

    for (const config of configurations) {
      if (config.name.includes('Evolink') || config.endpoint.includes('evolink')) {
        if (config.endpoint.startsWith('https://api.evolink.ai')) {
          issues.push({
            configName: config.name,
            problem: '使用直接API端点',
            currentEndpoint: config.endpoint,
            shouldUse: '/api/evolink/v1/images/generations'
          });
        }

        if (config.responseParser?.pollEndpoint?.startsWith('https://api.evolink.ai')) {
          issues.push({
            configName: config.name,
            problem: '轮询端点使用直接API',
            currentEndpoint: config.responseParser.pollEndpoint,
            shouldUse: '/api/evolink/v1/tasks/{taskId}'
          });
        }
      }
    }

    let message = `🔧 API配置状态检查\n\n`;
    message += `当前活动配置: ${activeConfig ? activeConfig.name : '无'}\n`;
    message += `端点: ${activeConfig ? activeConfig.endpoint : '无'}\n\n`;

    if (issues.length > 0) {
      message += `🚨 发现 ${issues.length} 个端点问题:\n\n`;
      issues.forEach((issue, index) => {
        message += `${index + 1}. ${issue.configName}\n`;
        message += `   问题: ${issue.problem}\n`;
        message += `   当前: ${issue.currentEndpoint}\n`;
        message += `   应该使用: ${issue.shouldUse}\n\n`;
      });

      // 添加自动修复按钮选项
      const shouldFix = confirm(message + `\n💡 是否要自动修正这些配置？\n\n点击"确定"自动修正，点击"取消"手动修正。`);
      if (shouldFix) {
        fixEvolinkEndpoints();
      }
    } else {
      message += `✅ 所有Evolink配置都正确使用了代理端点`;
      alert(message);
    }
  };

  // 打开Remotion编辑器
  const openRemotionEditor = () => {
    if (currentProject) {
      router.push({
        pathname: '/remotion-editor',
        query: { projectId: currentProject.id }
      });
    }
  };

  // 处理新的标签页导航
  const handleTabNavigation = (tabId: string, subItemId?: string) => {
    if (subItemId) {
      // 直接设置视图到子项
      if (subItemId === 'remotion-editor') {
        openRemotionEditor();
      } else {
        setCurrentView(subItemId as View);
      }
    } else {
      // 根据标签页ID设置默认视图
      switch (tabId) {
        case 'import':
          setCurrentView('import');
          break;
        case 'create':
          setCurrentView('generation');
          break;
        case 'edit':
          setCurrentView('timeline');
          break;
        case 'tools':
          setCurrentView('api-config');
          break;
        default:
          setCurrentView('import');
      }
    }
  };

  // 主要导航项目 - 4+2模式（新增第四阶段高级功能）
  const primaryNavItems = [
    {
      id: 'content-creation',
      label: '内容创作',
      icon: Upload,
      disabled: !currentProject,
      description: 'CSV导入、场景管理、提示词编辑',
      subItems: [
        { id: 'import', label: 'CSV导入', icon: Upload },
        { id: 'scenes', label: '场景管理', icon: List },
        { id: 'prompt-editor', label: '提示词编辑', icon: Edit3 }
      ]
    },
    {
      id: 'ai-generation',
      label: 'AI生成',
      icon: Sparkles,
      disabled: !currentProject,
      description: '图片生成、视频生成',
      subItems: [
        { id: 'generation', label: '图片生成', icon: Image },
        { id: 'video-generation', label: '视频生成', icon: Video }
      ]
    },
    {
      id: 'project-management',
      label: '项目管理',
      icon: Film,
      disabled: !currentProject,
      description: '项目选择、任务跟踪、项目设置',
      subItems: [
        { id: 'task-management', label: '任务管理', icon: CheckSquare },
        { id: 'timeline', label: '视频编辑', icon: Film, disabled: !currentProject || !currentProject.scenes.some(s => s.generatedVideo || (s.generatedVideos && s.generatedVideos.length > 0)) },
        { id: 'remotion-editor', label: 'Remotion编辑器', icon: Cpu, disabled: !currentProject, action: openRemotionEditor }
      ]
    },
    {
      id: 'advanced-features',
      label: '高级功能',
      icon: BarChart3,
      description: 'AI推荐、团队协作、数据分析',
      subItems: [
        { id: 'ai-recommendations', label: 'AI推荐', icon: Lightbulb },
        { id: 'collaboration', label: '团队协作', icon: Users },
        { id: 'analytics', label: '数据分析', icon: TrendingUp },
        { id: 'mobile-optimization', label: '移动端优化', icon: Smartphone }
      ]
    }
  ] as const;

  // 高级工具区域 (可折叠)
  const advancedTools = [
    {
      id: 'api-config',
      label: 'API配置',
      icon: Settings,
      description: '全局API配置管理',
      global: true
    },
    {
      id: 'debug',
      label: '调试工具',
      icon: Bug,
      description: '系统调试和诊断',
      global: true
    }
  ] as const;

  // 在客户端初始化完成前不渲染动态内容
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Loading placeholder */}
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="App">
      <ToastProvider>
        <LoadingProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-blue-50/50 relative overflow-x-hidden overflow-y-auto">
            {/* 优化的背景装饰 - 减少动画性能影响 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-60 h-60 bg-gradient-to-br from-purple-300/10 to-pink-300/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-40 -left-40 w-60 h-60 bg-gradient-to-br from-blue-300/10 to-cyan-300/10 rounded-full blur-2xl"></div>
            </div>
      {/* Apple-style Header */}
      <header className="bg-white/80 backdrop-blur-apple border-b border-gray-200/50 shadow-apple-navbar sticky top-0 z-apple-sticky">
        <div className="max-w-apple-xl mx-auto px-apple-lg">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 brand-icon rounded-xl flex items-center justify-center animate-brandPulse">
                <Film className="w-6 h-6 text-white relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-sf-pro-display font-bold brand-title">AI视频工作站</h1>
                <p className="text-sm font-sf-pro-text text-gray-600 font-medium">智能创作 · 无限可能</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 relative z-[9999]">
              {/* Project Selector */}
              <ProjectSelector />

              {/* Task Status Indicator */}
              <TaskStatusIndicator
                compact={true}
                onClick={() => setCurrentView('task-management')}
              />

              {/* Settings Dropdown */}
              <div className="relative" data-settings-dropdown>
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="btn-secondary flex items-center space-x-2"
                  title="系统设置"
                >
                  <Settings className="w-4 h-4" />
                  <svg className={`w-3 h-3 transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Settings Dropdown Menu */}
                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-apple-lg shadow-apple-lg border border-gray-200/50 z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-sf-pro-text font-semibold text-gray-500 uppercase tracking-wider">
                        系统设置
                      </div>

                      <button
                        onClick={() => handleSettingsClick('api-config')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-apple-md transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-apple flex items-center justify-center">
                          <Settings className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">API配置</div>
                          <div className="text-xs text-gray-500">全局API配置管理</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSettingsClick('preferences')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-apple-md transition-colors"
                      >
                        <div className="w-8 h-8 bg-purple-100 rounded-apple flex items-center justify-center">
                          <Settings className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">偏好设置</div>
                          <div className="text-xs text-gray-500">界面主题、快捷键等</div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSettingsClick('data-management')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-apple-md transition-colors"
                      >
                        <div className="w-8 h-8 bg-green-100 rounded-apple flex items-center justify-center">
                          <Settings className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">数据管理</div>
                          <div className="text-xs text-gray-500">存储空间、备份等</div>
                        </div>
                      </button>

                      <div className="border-t border-gray-200 my-2"></div>

                      <div className="px-3 py-2 text-xs font-sf-pro-text font-semibold text-gray-500 uppercase tracking-wider">
                        开发工具
                      </div>

                      <button
                        onClick={() => handleSettingsClick('debug')}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-apple-md transition-colors"
                      >
                        <div className="w-8 h-8 bg-orange-100 rounded-apple flex items-center justify-center">
                          <Bug className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">调试工具</div>
                          <div className="text-xs text-gray-500">系统诊断和调试</div>
                        </div>
                      </button>

                      <button
                        onClick={checkConfigStatus}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-apple-md transition-colors"
                      >
                        <div className="w-8 h-8 bg-yellow-100 rounded-apple flex items-center justify-center">
                          <Wrench className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">配置检查</div>
                          <div className="text-xs text-gray-500">检查API配置状态</div>
                        </div>
                      </button>

                      <button
                        onClick={fixEvolinkEndpoints}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-apple-md transition-colors"
                      >
                        <div className="w-8 h-8 bg-red-100 rounded-apple flex items-center justify-center">
                          <Wrench className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">快速修复</div>
                          <div className="text-xs text-gray-500">修复Evolink配置端点</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateProjectClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCreateProjectClick();
                  }
                }}
                tabIndex={0}
                className="btn-primary"
                role="button"
                aria-label={currentProject ? '创建新项目' : '开始创建新项目'}
                disabled={isCreatingProject}
              >
                {isCreatingProject ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    创建中...
                  </span>
                ) : (
                  <>{currentProject ? '新建项目' : '开始项目'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 新的标签页导航系统 */}
      {currentProject && (
        <>
          <TabNavigation
            currentView={currentView}
            onTabChange={handleTabNavigation}
            currentProject={currentProject}
          />

          {/* 工作流程指示器 */}
          <div className="max-w-apple-xl mx-auto px-apple-lg mt-4 mb-6">
            <WorkflowIndicator
              currentProject={currentProject}
              currentView={currentView}
            />
          </div>
        </>
      )}

      {/* Apple-style Error Banner */}
      {error && (
        <div className="max-w-apple-xl mx-auto px-apple-lg mt-apple-lg">
          <div className="glass-card border-red-200 bg-red-50/90 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-sf-pro-text font-medium text-red-800">错误:</span>
                <span className="text-sm font-sf-pro-text text-red-700">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="p-1 rounded-apple hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apple-style Main Content */}
      <main className="max-w-apple-xl mx-auto px-apple-lg py-apple-2xl relative z-10">
        {!currentProject ? (
          // 品牌优化的欢迎屏幕
          <div className="text-center py-16 animate-fade-in">
            {/* 主要品牌图标和标题 */}
            <div className="w-24 h-24 brand-icon rounded-2xl flex items-center justify-center mx-auto mb-8 animate-brandFloat">
              <Film className="w-12 h-12 text-white relative z-10" />
            </div>
            <h1 className="text-5xl font-bold brand-title mb-6 animate-fade-in-up">
              AI视频创作工作站
            </h1>
            <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              专业级AI视频制作平台，融合创意与技术，让每个故事都栩栩如生
            </p>

            {/* 主要CTA按钮 */}
            <button
              onClick={handleCreateProjectClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCreateProjectClick();
                }
              }}
              tabIndex={0}
              className="btn-primary text-white px-12 py-6 rounded-2xl font-semibold text-lg mb-16 animate-fade-in-up flex items-center justify-center mx-auto transform transition-all duration-300 hover:scale-105"
              style={{animationDelay: '0.4s'}}
              role="button"
              aria-label="开始创建新的AI视频项目"
              disabled={isCreatingProject}
            >
              {isCreatingProject ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  正在创建项目...
                </span>
              ) : (
                <>开始创建项目</>
              )}
            </button>

            {/* 品牌工作流程展示 */}
            <div className="max-w-7xl mx-auto mt-16 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
              <h3 className="text-3xl font-bold text-gray-900 mb-12 brand-title">完整创作工作流程</h3>

              {/* 响应式品牌化流程布局 */}
              <div className="hidden lg:flex items-center justify-center space-x-8 lg:space-x-16">
                {[
                  {
                    icon: Upload,
                    label: '导入内容',
                    desc: '智能CSV批量导入',
                    gradient: 'from-blue-500 to-cyan-400',
                    glowColor: 'rgba(59, 130, 246, 0.3)'
                  },
                  {
                    icon: Sparkles,
                    label: 'AI生成',
                    desc: 'AI智能生成图片视频',
                    gradient: 'from-purple-500 to-pink-400',
                    glowColor: 'rgba(168, 85, 247, 0.3)'
                  },
                  {
                    icon: Film,
                    label: '视频编辑',
                    desc: '专业级视频剪辑',
                    gradient: 'from-green-500 to-emerald-400',
                    glowColor: 'rgba(34, 197, 94, 0.3)'
                  },
                  {
                    icon: Settings,
                    label: '高级工具',
                    desc: '系统配置与调试',
                    gradient: 'from-orange-500 to-red-400',
                    glowColor: 'rgba(251, 146, 60, 0.3)'
                  }
                ].map((step, index) => (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center text-center group max-w-xs animate-fade-in-up"
                         style={{animationDelay: `${0.8 + index * 0.2}s`}}>
                      <div className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-6 transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg relative overflow-hidden will-change-transform`}>
                        <step.icon className="w-10 h-10 text-white relative z-10" />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                             style={{boxShadow: `0 0 30px ${step.glowColor}`}}></div>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">
                        {step.label}
                      </h4>
                      <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                    {index < 3 && (
                      <div className="flex items-center justify-center animate-pulse">
                        <ChevronRight className="w-10 h-10 text-gray-400 group-hover:text-purple-500 transition-colors duration-300" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* 移动端垂直布局 */}
              <div className="lg:hidden space-y-8">
                {[
                  {
                    icon: Upload,
                    label: '导入内容',
                    desc: '智能CSV批量导入',
                    gradient: 'from-blue-500 to-cyan-400',
                    glowColor: 'rgba(59, 130, 246, 0.3)'
                  },
                  {
                    icon: Sparkles,
                    label: 'AI生成',
                    desc: 'AI智能生成图片视频',
                    gradient: 'from-purple-500 to-pink-400',
                    glowColor: 'rgba(168, 85, 247, 0.3)'
                  },
                  {
                    icon: Film,
                    label: '视频编辑',
                    desc: '专业级视频剪辑',
                    gradient: 'from-green-500 to-emerald-400',
                    glowColor: 'rgba(34, 197, 94, 0.3)'
                  },
                  {
                    icon: Settings,
                    label: '高级工具',
                    desc: '系统配置与调试',
                    gradient: 'from-orange-500 to-red-400',
                    glowColor: 'rgba(251, 146, 60, 0.3)'
                  }
                ].map((step, index) => (
                  <div key={step.label} className="flex items-center space-x-6 animate-fade-in-up"
                       style={{animationDelay: `${0.8 + index * 0.2}s`}}>
                    <div className={`w-16 h-16 bg-gradient-to-br ${step.gradient} rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 shadow-lg relative overflow-hidden will-change-transform flex-shrink-0`}>
                      <step.icon className="w-8 h-8 text-white relative z-10" />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{step.label}</h4>
                      <p className="text-gray-600 text-sm">{step.desc}</p>
                    </div>
                    {index < 3 && (
                      <div className="text-gray-400">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 简化的功能亮点 */}
            <div className="mt-8 px-4">
              <div className="inline-flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 rounded-full px-4 py-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>全新导航系统 · 一站式创作流程</span>
              </div>
            </div>
          </div>
        ) : (
          // Project views
          <div>
            {currentView === 'import' && (
              <CSVImport onComplete={handleImportComplete} />
            )}

            {currentView === 'scenes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">场景管理</h2>
                  <div className="flex items-center space-x-4">
                    {selectedScene && (
                      <div className="text-sm text-gray-600">
                        已选择: 场景 {selectedScene.sceneNumber}
                      </div>
                    )}
                    <button
                      onClick={() => setCurrentView('import')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                    >
                      导入更多场景
                    </button>
                  </div>
                </div>
                <SceneManager
                  onSceneSelect={handleSceneSelect}
                  selectedSceneId={selectedScene?.id}
                />
              </div>
            )}

            {currentView === 'api-config' && (
              <APIConfigManager
                onConfigSelect={handleConfigSelect}
                onConfigEdit={handleConfigSelect}
                selectedConfigId={editingConfig?.id}
              />
            )}

            {currentView === 'api-config-editor' && (
              <APIConfigEditor
                config={editingConfig || undefined}
                onSave={handleConfigSave}
                onCancel={handleConfigCancel}
              />
            )}

            {currentView === 'generation' && (
              <ImageGeneration
                onGenerationComplete={handleImageGenerationComplete}
              />
            )}

            {currentView === 'video-generation' && (
              <VideoGeneration />
            )}

            {currentView === 'task-management' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">任务管理</h2>
                  <div className="text-sm text-gray-600">
                    实时跟踪和管理所有AI生成任务
                  </div>
                </div>
                <div className="text-center text-gray-500 py-8">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>任务管理功能正在开发中...</p>
                </div>
              </div>
            )}

            {currentView === 'timeline' && (
              <div className="h-screen -mt-8">
                <VideoEditor
                  projectId={currentProject.id}
                  onClose={() => setCurrentView('scenes')}
                />
              </div>
            )}

            {currentView === 'prompt-editor' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">提示词编辑器</h2>
                  <div className="text-sm text-gray-600">
                    专业的AI提示词编辑和管理工具
                  </div>
                </div>
                <PromptEditor
                  type={PromptType.VIDEO_GENERATION}
                  onContentChange={(content) => console.log('Prompt content changed:', content)}
                  onSave={(content) => {
                    console.log('Prompt saved:', content);
                    alert('提示词已保存！');
                  }}
                  placeholder="输入您的视频生成提示词..."
                  maxLength={2000}
                  showQualityScore={true}
                  showTemplates={true}
                  enableAIAssistance={true}
                />
              </div>
            )}

            {currentView === 'debug' && (
              <DebugPage />
            )}

            {/* 第四阶段：高级功能扩展 */}
            {currentView === 'ai-recommendations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">AI智能推荐</h2>
                  <div className="text-sm text-gray-600">
                    基于用户行为模式的个性化建议
                  </div>
                </div>
                <AIRecommendationEngine
                  userId={currentProject?.id}
                  currentProject={currentProject}
                  onRecommendationApply={(recommendation: any) => {
                    console.log('应用AI推荐:', recommendation);
                  }}
                />
              </div>
            )}

            {currentView === 'collaboration' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">团队协作</h2>
                  <div className="text-sm text-gray-600">
                    实时协作与项目共享功能
                  </div>
                </div>
                <CollaborationHub
                  projectId={currentProject?.id}
                  currentUserId="current-user"
                  onInviteUser={(email: string, role: string) => {
                    console.log('邀请用户:', { email, role });
                  }}
                />
              </div>
            )}

            {currentView === 'analytics' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">数据分析中心</h2>
                  <div className="text-sm text-gray-600">
                    用户行为与系统性能分析
                  </div>
                </div>
                <AnalyticsDashboard />
              </div>
            )}

            {currentView === 'mobile-optimization' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">移动端优化</h2>
                  <div className="text-sm text-gray-600">
                    移动设备体验优化与适配
                  </div>
                </div>
                <MobileOptimizedInterface
                  onDeviceChange={(device: any) => {
                    console.log('设备类型变化:', device);
                  }}
                >
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">移动端特性演示</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">触摸交互优化</h4>
                        <p className="text-blue-700">支持触摸手势、滑动导航和长按操作</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">响应式布局</h4>
                        <p className="text-green-700">自动适配不同屏幕尺寸和设备方向</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">性能优化</h4>
                        <p className="text-purple-700">移动端专用的性能优化和资源管理</p>
                      </div>
                    </div>
                  </div>
                </MobileOptimizedInterface>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onCreateProject={handleCreateProject}
        isLoading={isCreatingProject}
      />
    </div>
        </LoadingProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;