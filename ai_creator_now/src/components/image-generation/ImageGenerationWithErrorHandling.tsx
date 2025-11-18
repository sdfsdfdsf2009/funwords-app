import React, { useState, useEffect } from 'react';
import {
  Image,
  Play,
  Pause,
  RotateCw,
  Download,
  Eye,
  EyeOff,
  Settings,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Copy,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import {
  ImageGenerationRequest,
  ImageGenerationProgress,
  Scene,
  APIConfiguration
} from '../../types';
import { imageGenerationService, generateImage, getImageGenerationHistory } from '../../services/imageGeneration';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { useProjectStore } from '../../stores/projectStore';
import { logger } from '../../utils/logger';
import { errorMonitor } from '../../utils/errorMonitor';
import { useComponentErrorHandler } from '../../hooks/useComponentErrorHandler';

// 错误处理增强版的图片生成组件
export const ImageGenerationWithErrorHandling: React.FC<{ className?: string }> = ({ className = '' }) => {
  const errorHandler = useComponentErrorHandler({
    componentName: 'ImageGeneration',
    maxRetries: 3,
    enableUserFeedback: true,
    onError: (error, context) => {
      // 自定义错误处理
      console.warn('ImageGeneration component error:', error, context);
    },
    onRetry: (retryCount) => {
      console.log(`ImageGeneration retry attempt: ${retryCount}`);
    },
    onRecover: () => {
      console.log('ImageGeneration component recovered from error');
    }
  });

  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<ImageGenerationProgress[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // Store hooks
  const { configurations, getActiveConfig } = useAPIConfigStore();
  const { currentProject, scenes, addGeneratedImages } = useProjectStore();

  // 安全的useEffect包装器
  errorHandler.useSafeEffect(() => {
    if (!currentProject || !scenes) {
      errorHandler.addWarning('当前没有选中的项目或场景');
      return;
    }

    // 加载图片生成历史
    loadHistory();
  }, [currentProject, scenes]);

  // 加载历史记录 - 使用错误处理包装器
  const loadHistory = errorHandler.withAsyncErrorHandling(
    async () => {
      const history = await getImageGenerationHistory();
      setGenerationProgress(history);
    },
    'loadHistory',
    { projectId: currentProject?.id }
  );

  // 生成图片 - 使用错误处理包装器
  const handleGenerateImage = errorHandler.createSafeEventHandler(
    async () => {
      if (!selectedSceneId) {
        errorHandler.handleError('请先选择一个场景');
        return;
      }

      // 修复配置选择逻辑 - 确保选择正确的图片生成配置
      let config = configurations.find(c => c.id === selectedConfigId && c.type === 'image');

      // 如果没有选中的配置或选中的不是图片配置，查找活跃的图片配置
      if (!config) {
        config = getActiveConfig('image');
      }

      // 最后的备选方案：查找任何启用的图片配置
      if (!config) {
        config = configurations.find(c => c.type === 'image' && c.isActive);
      }

      if (!config) {
        errorHandler.handleError('请先配置并启用图片生成API设置');
        return;
      }

      // 验证配置是否包含必要的Authorization头部
      const hasAuthHeader = config.headers?.some(h =>
        h.key?.toLowerCase() === 'authorization' &&
        h.enabled !== false &&
        h.value?.trim().length > 0
      );

      if (!hasAuthHeader) {
        console.error('选中的配置缺少有效的Authorization头部', {
          configId: config.id,
          configName: config.name,
          headers: config.headers?.map(h => ({ key: h.key, enabled: h.enabled, hasValue: !!h.value }))
        });
        errorHandler.handleError('API配置缺少有效的Authorization头部，请检查配置');
        return;
      }

      const scene = scenes.find(s => s.id === selectedSceneId);
      if (!scene) {
        errorHandler.handleError('选中的场景不存在');
        return;
      }

      setIsGenerating(true);

      try {
        errorHandler.addWarning('开始生成图片，请稍候...');

        const request: ImageGenerationRequest = {
          prompt: scene.videoPrompt || scene.title,
          sceneId: selectedSceneId,
          config: config // 传递完整的配置对象，包含headers和其他必要信息
        };

        const result = await generateImage(request);

        if (result.images && result.images.length > 0) {
          await addGeneratedImages(selectedSceneId, result.images);
          await loadHistory(); // 重新加载历史

          errorHandler.recover(); // 清除警告和错误状态

          // 记录成功事件
          errorMonitor.logUserAction('image-generation', 'success', {
            sceneId: selectedSceneId,
            imageCount: result.images.length,
            prompt: request.prompt
          });
        } else {
          errorHandler.handleError('生成图片失败，没有返回结果');
        }
      } finally {
        setIsGenerating(false);
      }
    },
    'generateImage'
  );

  // 选择图片 - 使用错误处理包装器
  const handleImageSelect = errorHandler.createSafeEventHandler(
    (imageId: string) => {
      const newSelection = new Set(selectedImages);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
      } else {
        newSelection.add(imageId);
      }
      setSelectedImages(newSelection);

      errorMonitor.logUserAction('image-select', 'toggle', {
        imageId,
        sceneId: selectedSceneId,
        selected: newSelection.has(imageId)
      });
    },
    'imageSelect'
  );

  // 删除图片 - 使用错误处理包装器
  const handleDeleteImage = errorHandler.createSafeEventHandler(
    async (imageId: string) => {
      // 这里应该调用删除API
      errorHandler.addWarning(`删除图片功能尚未实现: ${imageId}`);
    },
    'deleteImage'
  );

  // 下载图片 - 使用错误处理包装器
  const handleDownloadImage = errorHandler.createSafeEventHandler(
    async (imageUrl: string, imageName: string) => {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = imageName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        errorMonitor.logUserAction('image-download', 'success', {
          imageUrl,
          imageName
        });
      } catch (error) {
        errorHandler.handleError(`下载图片失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    'downloadImage'
  );

  // 批量操作 - 使用错误处理包装器
  const handleBatchSelect = errorHandler.createSafeEventHandler(
    (sceneId: string, selectAll: boolean) => {
      const sceneImages = generationProgress
        .filter(p => p.sceneId === sceneId)
        .flatMap(p => p.result ? [p.result.id] : []);

      const newSelection = new Set(selectedImages);

      if (selectAll) {
        sceneImages.forEach(id => newSelection.add(id));
        errorHandler.addWarning(`已选择场景中的 ${sceneImages.length} 张图片`);
      } else {
        sceneImages.forEach(id => newSelection.delete(id));
      }

      setSelectedImages(newSelection);

      errorMonitor.logUserAction('batch-select', selectAll ? 'select-all' : 'deselect-all', {
        sceneId,
        count: sceneImages.length,
        selected: selectAll
      });
    },
    'batchSelect'
  );

  // 如果有错误，显示错误界面
  if (errorHandler.hasError) {
    return (
      <div className={`${className} p-6`}>
        <div className="flex items-center justify-center min-h-64 bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">
              图片生成组件遇到错误
            </h3>
            <p className="text-sm text-red-700 mb-4">
              {errorHandler.error?.message}
            </p>

            {/* 显示警告 */}
            {errorHandler.hasWarnings && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  {errorHandler.warnings.map((warning, index) => (
                    <div key={index} className="mb-1">{warning}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {errorHandler.canRetry && (
                <button
                  onClick={() => errorHandler.retry(async () => {
                    await loadHistory();
                  })}
                  disabled={errorHandler.isRetrying}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {errorHandler.isRetrying ? (
                    <div className="flex items-center justify-center space-x-2">
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>重试中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>重试 {errorHandler.retryCount > 0 && `(${errorHandler.retryCount})`}</span>
                    </div>
                  )}
                </button>
              )}
              <button
                onClick={errorHandler.recover}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                忽略错误继续
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 警告显示
  const WarningDisplay = () => {
    if (!errorHandler.hasWarnings) return null;

    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">警告:</span>
          </div>
          <button
            onClick={errorHandler.clearWarnings}
            className="text-yellow-600 hover:text-yellow-800"
          >
            ×
          </button>
        </div>
        <div className="mt-1 text-sm text-yellow-700">
          {errorHandler.warnings.map((warning, index) => (
            <div key={index}>{warning}</div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${className} space-y-6`}>
      {/* 警告显示 */}
      <WarningDisplay />

      {/* 主要内容 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">图片生成</h2>
          <div className="flex items-center space-x-2">
            {errorHandler.isHealthy && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>状态正常</span>
              </div>
            )}
          </div>
        </div>

        {/* 场景选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择场景
          </label>
          <select
            value={selectedSceneId}
            onChange={(e) => setSelectedSceneId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择场景</option>
            {scenes.map(scene => (
              <option key={scene.id} value={scene.id}>
                场景 {scene.sceneNumber}: {scene.title}
              </option>
            ))}
          </select>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerateImage}
          disabled={isGenerating || !selectedSceneId}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center space-x-2">
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>生成中...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Image className="w-4 h-4" />
              <span>生成图片</span>
            </div>
          )}
        </button>
      </div>

      {/* 生成历史 */}
      {generationProgress.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">生成历史</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generationProgress.map((progress, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                {progress.result ? (
                  <div>
                    <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                      <img
                        src={progress.result.url}
                        alt={progress.result.prompt}
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    </div>
                    <div className="text-sm text-gray-700 truncate mb-2">
                      {progress.result.prompt}
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleImageSelect(progress.result.id)}
                        className={`p-2 rounded transition-colors ${
                          selectedImages.has(progress.result.id)
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {selectedImages.has(progress.result.id) ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadImage(progress.result.url, `image-${index}.png`)}
                        className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationWithErrorHandling;