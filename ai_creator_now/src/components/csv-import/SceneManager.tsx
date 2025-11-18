import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { GripVertical, Edit2, Trash2, Eye, EyeOff, Save, X, Image, CheckCircle } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useDatabaseProjectStore } from '../../stores/databaseProjectStore';
import { Scene } from '../../types';
import { logger } from '../../utils/logger';

interface SceneManagerProps {
  onSceneSelect?: (scene: Scene) => void;
  selectedSceneId?: string;
}

export const SceneManager: React.FC<SceneManagerProps> = ({ onSceneSelect, selectedSceneId }) => {
  const { currentProject, updateScene, deleteScene, reorderScenes, isImageSelected, getSceneSelectedImages } = useDatabaseProjectStore();
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    imagePrompt: '',
    videoPrompt: ''
  });
  const [hiddenPrompts, setHiddenPrompts] = useState<Set<string>>(new Set());

  if (!currentProject || currentProject.scenes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">暂无场景数据，请先导入CSV文件</p>
      </div>
    );
  }

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const fromIndex = result.source.index;
    const toIndex = result.destination.index;

    if (fromIndex !== toIndex) {
      reorderScenes(fromIndex, toIndex);
      // 防御性日志记录
      try {
        logger?.logUser?.action?.('scene-reordered', { fromIndex, toIndex });
      } catch (error) {
        console.warn('Logger unavailable, using console fallback:', 'scene-reordered', { fromIndex, toIndex });
      }
    }
  };

  // Start editing scene
  const handleStartEdit = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditForm({
      imagePrompt: scene.imagePrompt,
      videoPrompt: scene.videoPrompt
    });
  };

  // Save edited scene
  const handleSaveEdit = () => {
    if (editingSceneId) {
      updateScene(editingSceneId, {
        imagePrompt: editForm.imagePrompt,
        videoPrompt: editForm.videoPrompt
      });
      setEditingSceneId(null);
      // 防御性日志记录
      try {
        logger?.logUser?.action?.('scene-updated', { sceneId: editingSceneId });
      } catch (error) {
        console.warn('Logger unavailable, using console fallback:', 'scene-updated', { sceneId: editingSceneId });
      }
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingSceneId(null);
    setEditForm({ imagePrompt: '', videoPrompt: '' });
  };

  // Delete scene
  const handleDeleteScene = (sceneId: string) => {
    if (window.confirm('确定要删除这个场景吗？此操作无法撤销。')) {
      deleteScene(sceneId);
      // 防御性日志记录
      try {
        logger?.logUser?.action?.('scene-deleted', { sceneId });
      } catch (error) {
        console.warn('Logger unavailable, using console fallback:', 'scene-deleted', { sceneId });
      }
    }
  };

  // Toggle prompt visibility
  const togglePromptVisibility = (sceneId: string) => {
    setHiddenPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  // Select scene
  const handleSceneSelect = (scene: Scene) => {
    onSceneSelect?.(scene);
    // 防御性日志记录 - 如果logger未定义，不影响核心功能
    try {
      logger?.logUser?.action?.('scene-selected', { sceneId: scene.id });
    } catch (error) {
      // 日志记录失败时，静默处理或使用console.log作为备用
      console.warn('Logger unavailable, using console fallback:', 'scene-selected', { sceneId: scene.id });
    }
  };

  return (
    <div className="glass-card shadow-apple-lg animate-fade-in">
      {/* Apple-style Header */}
      <div className="px-apple-xl py-apple-lg border-b border-gray-200/50 bg-gray-50/50 rounded-t-apple-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-sf-pro-display font-semibold text-gray-900">场景管理</h2>
            <p className="text-sm font-sf-pro-text text-gray-500 mt-1">
              管理和编辑您的视频场景
            </p>
          </div>
          <div className="glass-card px-apple-lg py-apple-sm">
            <span className="text-sm font-sf-pro-text font-medium text-gray-700">
              {currentProject.scenes.length} 个场景
            </span>
          </div>
        </div>
      </div>

      {/* Apple-style Scene List */}
      <div className="p-apple-xl">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="scenes">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-apple-lg"
              >
                {currentProject.scenes.map((scene, index) => (
                  <Draggable key={scene.id} draggableId={scene.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`
                          group border rounded-apple-xl p-apple-xl transition-all duration-300
                          ${snapshot.isDragging
                            ? 'shadow-apple-xl border-blue-400 bg-blue-50/50 scale-[1.02]'
                            : 'border-gray-200/50 hover:border-gray-300 hover:shadow-apple-md'
                          }
                          ${selectedSceneId === scene.id ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30' : ''}
                          ${editingSceneId === scene.id ? 'bg-yellow-50/50 border-yellow-300' : 'bg-white/80'}
                          ${!snapshot.isDragging && 'hover:scale-[1.01]'}
                        `}
                        style={{
                          ...provided.draggableProps.style,
                          backdropFilter: 'blur(20px)',
                          background: snapshot.isDragging
                            ? 'rgba(219, 234, 254, 0.8)'
                            : selectedSceneId === scene.id
                            ? 'rgba(219, 234, 254, 0.3)'
                            : 'rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        <div className="flex items-start space-x-apple-lg">
                          {/* Apple-style Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="mt-1 cursor-move group-hover:opacity-100 opacity-60 transition-opacity duration-200"
                          >
                            <div className="w-6 h-6 bg-gray-200 rounded-apple flex items-center justify-center group-hover:bg-gray-300 transition-colors duration-200">
                              <GripVertical className="w-4 h-4 text-gray-600" />
                            </div>
                          </div>

                          {/* Apple-style Scene Number */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-apple flex items-center justify-center shadow-apple-md group-hover:shadow-apple-lg transition-all duration-300 group-hover:scale-105">
                              <span className="text-white font-sf-pro-display font-bold text-lg">
                                {scene.sceneNumber}
                              </span>
                            </div>
                          </div>

                          {/* Apple-style Content */}
                          <div className="flex-1 min-w-0">
                            {editingSceneId === scene.id ? (
                              // Apple-style Edit mode
                              <div className="space-y-apple-lg animate-fade-in">
                                <div>
                                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                                    图片提示词
                                  </label>
                                  <textarea
                                    value={editForm.imagePrompt}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, imagePrompt: e.target.value }))}
                                    className="input resize-none"
                                    rows={3}
                                    placeholder="输入图片生成提示词..."
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                                    视频提示词
                                  </label>
                                  <textarea
                                    value={editForm.videoPrompt}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, videoPrompt: e.target.value }))}
                                    className="input resize-none"
                                    rows={3}
                                    placeholder="输入视频生成提示词..."
                                  />
                                </div>
                                <div className="flex space-x-apple-sm">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="btn-success"
                                  >
                                    <Save className="w-4 h-4" />
                                    <span>保存</span>
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="btn-secondary"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>取消</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Apple-style View mode
                              <div>
                                <div className="space-y-apple-lg">
                                  {/* Image Prompt */}
                                  <div>
                                    <div className="flex items-center justify-between mb-apple-sm">
                                      <label className="text-sm font-sf-pro-text font-medium text-gray-700">
                                        图片提示词
                                      </label>
                                      <button
                                        onClick={() => togglePromptVisibility(scene.id)}
                                        className="p-2 hover:bg-gray-100 rounded-apple-md transition-colors group"
                                      >
                                        {hiddenPrompts.has(scene.id) ? (
                                          <Eye className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                                        ) : (
                                          <EyeOff className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                                        )}
                                      </button>
                                    </div>
                                    <div className={`
                                      text-sm font-sf-pro-text text-gray-600 bg-gray-50/50 rounded-apple-md p-apple-lg leading-relaxed transition-all duration-300
                                      ${hiddenPrompts.has(scene.id) ? 'blur-sm select-none' : ''}
                                    `}>
                                      {scene.imagePrompt}
                                    </div>
                                  </div>

                                  {/* Video Prompt */}
                                  <div>
                                    <div className="flex items-center justify-between mb-apple-sm">
                                      <label className="text-sm font-sf-pro-text font-medium text-gray-700">
                                        视频提示词
                                      </label>
                                    </div>
                                    <div className={`
                                      text-sm font-sf-pro-text text-gray-600 bg-gray-50/50 rounded-apple-md p-apple-lg leading-relaxed transition-all duration-300
                                      ${hiddenPrompts.has(scene.id) ? 'blur-sm select-none' : ''}
                                    `}>
                                      {scene.videoPrompt}
                                    </div>
                                  </div>

                                  {/* Apple-style Status */}
                                  <div className="flex flex-wrap gap-apple-sm">
                                    {/* Image count badge */}
                                    <div className="glass-card px-apple-lg py-apple-sm">
                                      <span className="text-xs font-sf-pro-text text-gray-700 flex items-center space-x-1">
                                        <Image className="w-3 h-3 text-gray-500" />
                                        {scene.images.length} 张图片
                                      </span>
                                    </div>

                                    {/* Selected images count indicator */}
                                    {scene.images.length > 0 && (
                                      <div className="glass-card px-apple-lg py-apple-sm">
                                        <span className="text-xs font-sf-pro-text text-purple-700 flex items-center space-x-1">
                                          <CheckCircle className="w-3 h-3 text-purple-500" />
                                          已选 {scene.images.filter(img =>
                                            isImageSelected(scene.id, img.id)
                                          ).length} 张
                                        </span>
                                      </div>
                                    )}

                                    {scene.selectedImage && (
                                      <div className="glass-card px-apple-lg py-apple-sm">
                                        <span className="text-xs font-sf-pro-text text-green-700 flex items-center space-x-1">
                                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                          已选择图片
                                        </span>
                                      </div>
                                    )}
                                    {(scene.generatedVideo || (scene.generatedVideos && scene.generatedVideos.length > 0)) && (
                                      <div className="glass-card px-apple-lg py-apple-sm">
                                        <span className="text-xs font-sf-pro-text text-blue-700 flex items-center space-x-1">
                                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                          已生成视频
                                          {scene.generatedVideos && scene.generatedVideos.length > 1 && (
                                            <span className="ml-1 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-medium">
                                              {scene.generatedVideos.length}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Apple-style Actions */}
                          <div className="flex-shrink-0">
                            <div className="flex flex-col space-y-apple-sm">
                              {editingSceneId !== scene.id && (
                                <>
                                  <button
                                    onClick={() => handleSceneSelect(scene)}
                                    className={`
                                      p-apple-sm rounded-apple-md transition-all duration-200 group
                                      ${selectedSceneId === scene.id
                                        ? 'bg-blue-500 text-white shadow-apple-md'
                                        : 'hover:bg-gray-100 text-gray-600 hover:shadow-apple-sm'
                                      }
                                    `}
                                    title="选择场景"
                                  >
                                    <Eye className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(scene)}
                                    className="p-apple-sm hover:bg-gray-100 rounded-apple-md text-gray-600 hover:shadow-apple-sm transition-all duration-200 group"
                                    title="编辑场景"
                                  >
                                    <Edit2 className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteScene(scene.id)}
                                    className="p-apple-sm hover:bg-red-100 rounded-apple-md text-red-600 hover:shadow-apple-sm transition-all duration-200 group"
                                    title="删除场景"
                                  >
                                    <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Apple-style Instructions */}
        <div className="mt-apple-xl p-apple-xl bg-blue-50/50 border border-blue-200/50 rounded-apple-lg">
          <h4 className="font-sf-pro-display font-semibold text-blue-900 mb-apple-lg">操作说明</h4>
          <ul className="text-sm font-sf-pro-text text-blue-800 space-y-apple-sm">
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>拖拽场景可以重新排序</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>点击编辑按钮可以修改提示词</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>点击眼睛图标可以隐藏/显示敏感内容</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>选择场景后可以开始生成图片和视频</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SceneManager;