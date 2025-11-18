import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Calendar, Film, Check, Edit2, Trash2 } from 'lucide-react';
import { useDatabaseProjectStore } from '../../stores/databaseProjectStore';
import { errorMonitor } from '../../utils/errorMonitor';
import { Project } from '../../types';
import CreateProjectModal from './CreateProjectModal';
import UserFriendlyError from '../ui/UserFriendlyError';

interface ProjectSelectorProps {
  className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [operationError, setOperationError] = useState<Error | string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    currentProject,
    projects,
    setCurrentProject,
    createProject,
    deleteProject,
    updateProject,
    isLoading,
    error
  } = useDatabaseProjectStore();

  // Debug logging
  useEffect(() => {
    console.log('ProjectSelector state:', {
      isLoading,
      error,
      projectsCount: projects.length,
      currentProject: currentProject?.name || 'null',
      projects: projects.map(p => p.name)
    });
  }, [isLoading, error, projects.length, currentProject?.name]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingProjectId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProjectSelect = (projectId: string) => {
    console.log(`[ProjectSelector] Attempting to select project with ID: ${projectId}`);
    console.log(`[ProjectSelector] Available projects:`, projects.map(p => ({ id: p.id, name: p.name })));

    const projectExists = projects.some(p => p.id === projectId);
    if (!projectExists) {
      console.error(`[ProjectSelector] Project with ID ${projectId} not found in current projects list`);
      return;
    }

    setCurrentProject(projectId);
    setIsOpen(false);

    console.log(`[ProjectSelector] Project selection completed for ID: ${projectId}`);
  };

  const handleCreateProject = async (name: string, description?: string) => {
    try {
      setIsCreating(true);
      errorMonitor.logUserAction('project-create', 'submit', { name, description });

      await createProject({ name, description });
      setIsCreateModalOpen(false);

      errorMonitor.logUserAction('project-create', 'success', { name, description });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败';

      errorMonitor.logError({
        type: 'javascript',
        message: `创建项目失败: ${errorMessage}`,
        source: 'ProjectSelector.handleCreateProject',
        context: {
          projectName: name,
          description,
          error: error instanceof Error ? error.stack : String(error)
        }
      });

      errorMonitor.logUserAction('project-create', 'error', {
        error: errorMessage,
        projectName: name
      });

      // 重新抛出错误，让模态框组件处理
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateProjectClick = () => {
    setIsCreateModalOpen(true);
    setIsOpen(false);
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();

    try {
      errorMonitor.logUserAction('click', 'delete-project-button', { projectId });

      if (projects.length <= 1) {
        setOperationError('至少需要保留一个项目');
        return;
      }

      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('项目不存在');
      }

      const projectName = project.name;

      if (confirm(`确定要删除项目"${projectName}"吗？此操作无法撤销。`)) {
        errorMonitor.logUserAction('project-delete', 'confirm', { projectId, projectName });

        await deleteProject(projectId);
        setIsOpen(false);

        errorMonitor.logUserAction('project-delete', 'success', { projectId, projectName });
      } else {
        errorMonitor.logUserAction('project-delete', 'cancel', { projectId, projectName });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除项目失败';

      errorMonitor.logError({
        type: 'javascript',
        message: `删除项目失败: ${errorMessage}`,
        source: 'ProjectSelector.handleDeleteProject',
        context: {
          projectId,
          projectName: projects.find(p => p.id === projectId)?.name,
          error: error instanceof Error ? error.stack : String(error)
        }
      });

      errorMonitor.logUserAction('project-delete', 'error', {
        projectId,
        error: errorMessage
      });

      setOperationError(`删除项目失败: ${errorMessage}`);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, projectId: string, currentName: string) => {
    e.stopPropagation();
    setEditingProjectId(projectId);
    setEditName(currentName);
  };

  const handleSaveEdit = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();

    try {
      errorMonitor.logUserAction('click', 'save-project-edit', { projectId });

      const currentProject = projects.find(p => p.id === projectId);
      if (!currentProject) {
        throw new Error('项目不存在');
      }

      const newProjectName = editName.trim();
      const oldProjectName = currentProject.name;

      if (!newProjectName) {
        setOperationError('项目名称不能为空');
        return;
      }

      if (newProjectName.length > 50) {
        setOperationError('项目名称不能超过50个字符');
        return;
      }

      if (!/^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$/.test(newProjectName)) {
        setOperationError('项目名称只能包含中文、英文、数字、空格、连字符和下划线');
        return;
      }

      if (newProjectName === oldProjectName) {
        // 名称没有变化，直接退出编辑模式
        setEditingProjectId(null);
        setEditName('');
        return;
      }

      errorMonitor.logUserAction('project-update', 'submit', {
        projectId,
        oldName: oldProjectName,
        newName: newProjectName
      });

      await updateProject({ name: newProjectName });

      errorMonitor.logUserAction('project-update', 'success', {
        projectId,
        oldName: oldProjectName,
        newName: newProjectName
      });

      setEditingProjectId(null);
      setEditName('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目失败';

      errorMonitor.logError({
        type: 'javascript',
        message: `更新项目失败: ${errorMessage}`,
        source: 'ProjectSelector.handleSaveEdit',
        context: {
          projectId,
          oldName: projects.find(p => p.id === projectId)?.name,
          newName: editName.trim(),
          error: error instanceof Error ? error.stack : String(error)
        }
      });

      errorMonitor.logUserAction('project-update', 'error', {
        projectId,
        error: errorMessage,
        newName: editName.trim()
      });

      setOperationError(`更新项目失败: ${errorMessage}`);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
    setEditName('');
    setOperationError(null);
  };

  const handleRetryOperation = async () => {
    setOperationError(null);
    // 这里可以根据具体的操作类型进行重试
    // 由于我们不知道具体是哪个操作失败，暂时只清除错误
  };

  const formatDate = (date: Date) => {
    try {
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return '未知时间';
      }
      return new Intl.DateTimeFormat('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.warn('Date formatting error:', error);
      return '格式错误';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="glass-card px-apple-lg py-apple-sm flex items-center space-x-2 min-w-0">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-sf-pro-text text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="glass-card px-apple-lg py-apple-sm flex items-center space-x-2 min-w-0 border-red-200 bg-red-50/50">
          <Film className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm font-sf-pro-text text-red-700 truncate">加载失败</span>
          <ChevronDown className={`w-4 h-4 text-red-500 transition-transform duration-200 flex-shrink-0`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-card px-apple-lg py-apple-sm flex items-center space-x-2 hover:bg-gray-50/50 transition-colors duration-200 min-w-0"
        aria-label={`选择项目，当前项目: ${currentProject?.name || '未选择'}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Film className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm font-sf-pro-text font-medium text-gray-700 truncate">
            {currentProject?.name || '选择项目'}
          </span>
          {currentProject && (
            <span className="text-xs font-sf-pro-text text-gray-500 flex-shrink-0">
              ({currentProject.scenes.length} 场景)
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-80 glass-card border border-gray-200/50 shadow-apple-lg z-[10000] animate-fade-in"
          role="listbox"
          aria-label="项目列表"
          aria-orientation="vertical"
        >
          <div className="max-h-96 overflow-y-auto">
            {/* Create New Project Option */}
            <button
              onClick={handleCreateProjectClick}
              className="w-full px-apple-lg py-apple-md flex items-center space-x-3 hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-200/50"
              role="option"
              aria-label="创建新项目"
              title="创建一个新的项目"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCreateProjectClick();
                }
              }}
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-sf-pro-text font-medium text-blue-600">创建新项目</span>
            </button>

            {/* Projects List */}
            {projects.length === 0 ? (
              <div className="px-apple-lg py-apple-xl text-center text-gray-500">
                <Film className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-sf-pro-text">暂无项目</p>
                <p className="text-xs font-sf-pro-text text-gray-400 mt-1">创建您的第一个项目开始使用</p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`group border-b border-gray-100/50 last:border-b-0 ${
                    currentProject?.id === project.id ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                  }`}
                >
                  {editingProjectId === project.id ? (
                    // Edit Mode
                    <div className="px-apple-lg py-apple-md flex items-center space-x-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(e as any, project.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit(e as any);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm font-sf-pro-text border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveEdit(e, project.id)}
                        className="p-1 hover:bg-green-100 text-green-600 rounded transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:bg-gray-100 text-gray-600 rounded transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="group relative">
                      {/* Project Button */}
                      <button
                        onClick={() => handleProjectSelect(project.id)}
                        className="w-full px-apple-lg py-apple-md flex items-center justify-between text-left pr-20" // Add right padding to make space for action buttons
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {/* Current Project Indicator */}
                          {currentProject?.id === project.id && (
                            <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <Film className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className={`text-sm font-sf-pro-text font-medium truncate ${
                                currentProject?.id === project.id ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {project.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 mt-1 text-xs font-sf-pro-text text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Film className="w-3 h-3" />
                                <span>{project.scenes.length} 场景</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(project.updatedAt)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Action Buttons - positioned outside to prevent nesting */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => handleStartEdit(e, project.id, project.name)}
                          className="p-1 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                          title="重命名项目"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteProject(e, project.id)}
                            className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                            title="删除项目"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          {projects.length > 0 && (
            <div className="px-apple-lg py-apple-sm bg-gray-50/50 border-t border-gray-200/50">
              <p className="text-xs font-sf-pro-text text-gray-500">
                共 {projects.length} 个项目
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
        isLoading={isCreating}
      />

      {/* Operation Error Display */}
      {operationError && (
        <div className="absolute top-full left-0 mt-2 w-96 z-[10001]">
          <UserFriendlyError
            error={operationError}
            context="项目管理操作"
            onRetry={handleRetryOperation}
            onDismiss={() => setOperationError(null)}
            showDetails={true}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;