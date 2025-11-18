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
  TrendingUp,
  X
} from 'lucide-react';
import {
  ImageGenerationRequest,
  ImageGenerationProgress,
  Scene,
  APIConfiguration,
  ImageGenerationConfig,
  EvolinkImageGenerationRequest,
  EvolinkImageGenerationResponse,
  GeneratedImage
} from '../../types';
import { imageGenerationService, generateImage, getImageGenerationHistory } from '../../services/imageGeneration';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { useDatabaseProjectStore } from '../../stores/databaseProjectStore';
import { logger } from '../../utils/logger';
import { ModelSelector, CostAnalysis, EvoLinkModel } from '../model-selection';
import { RateLimitErrorModal } from '../ui/RateLimitErrorModal';

// Scene Grouped Image History Component
interface SceneGroupedImageHistoryProps {
  history: ImageGenerationProgress[];
  scenes: Scene[];
  onImageSelect: (sceneId: string, imageId: string) => void;
  isImageSelected: (sceneId: string, imageId: string) => boolean;
  getSceneSelectedImages: (sceneId: string) => string[];
}

const SceneGroupedImageHistory: React.FC<SceneGroupedImageHistoryProps> = ({
  history,
  scenes,
  onImageSelect,
  isImageSelected,
  getSceneSelectedImages
}) => {
  // Group images by scene
  const imagesByScene = scenes.map(scene => ({
    scene,
    images: history.filter(h =>
      scenes.find(s => s.id === h.sceneId) &&
      scenes.find(s => s.id === h.sceneId)!.images.some(img => img.id === h.result?.id)
    )
  })).filter(group => group.images.length > 0);

  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  const toggleSceneExpansion = (sceneId: string) => {
    setExpandedScenes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  const handleSelectAllInScene = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const sceneImages = history.filter(h =>
      scenes.find(s => s.id === h.sceneId) &&
      scenes.find(s => s.id === h.sceneId)!.images.some(img => img.id === h.result?.id)
    );

    // Toggle all images in this scene
    const allSelected = sceneImages.every(h => isImageSelected(sceneId, h.result?.id || ''));

    sceneImages.forEach(h => {
      if (h.result) {
        if (allSelected) {
          // All are selected, deselect all
          const selectedImages = getSceneSelectedImages(sceneId);
          selectedImages.forEach(imgId => {
            if (sceneImages.some(sh => sh.result?.id === imgId)) {
              onImageSelect(sceneId, imgId);
            }
          });
        } else {
          // Select all
          onImageSelect(sceneId, h.result?.id || '');
        }
      }
    });
  };

  if (imagesByScene.length === 0) {
    return (
      <div className="text-center py-apple-xl text-gray-500">
        <Image className="w-12 h-12 mx-auto mb-apple-md opacity-50" />
        <p className="text-sm font-sf-pro-text">暂无场景图片</p>
        <p className="text-xs font-sf-pro-text mt-apple-sm">生成图片后会在这里按场景分组显示</p>
      </div>
    );
  }

  return (
    <div className="space-y-apple-lg">
      {imagesByScene.map(({ scene, images }) => (
        <div key={scene.id} className="border border-gray-200/50 rounded-apple-lg overflow-hidden">
          {/* Scene Header */}
          <div
            className="flex items-center justify-between p-apple-lg bg-gradient-to-r from-blue-50 to-purple-50 cursor-pointer hover:from-blue-100 hover:to-purple-100 transition-colors"
            onClick={() => toggleSceneExpansion(scene.id)}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-apple flex items-center justify-center text-white font-bold text-sm">
                {scene.sceneNumber}
              </div>
              <div>
                <h3 className="text-base font-sf-pro-display font-semibold text-gray-900">
                  场景 {scene.sceneNumber}
                </h3>
                <p className="text-sm font-sf-pro-text text-gray-600">
                  {images.length} 张图片 • {getSceneSelectedImages(scene.id).length} 张已选择
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAllInScene(scene.id);
                }}
                className="px-apple-sm py-apple-xs bg-white/80 hover:bg-white rounded-apple-md text-xs font-medium text-gray-700 border border-gray-300 transition-colors"
              >
                {images.every(h => isImageSelected(scene.id, h.result?.id || '')) ? '取消全选' : '全选'}
              </button>
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform ${
                  expandedScenes.has(scene.id) ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>

          {/* Scene Images Grid */}
          {expandedScenes.has(scene.id) && (
            <div className="p-apple-lg bg-gray-50/50 border-t border-gray-200/50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-apple-md">
                {images.map((history) => {
                  const isSelected = isImageSelected(scene.id, history.result?.id || '');
                  return (
                    <div
                      key={history.id}
                      className="relative group cursor-pointer"
                      onClick={() => history.result && onImageSelect(scene.id, history.result.id)}
                    >
                      <div className="aspect-square rounded-apple-md overflow-hidden bg-gray-100">
                        <img
                          src={history.result!.thumbnailUrl}
                          alt="Generated image"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Selection checkbox */}
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className={`w-5 h-5 rounded-apple-md border-2 ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-gray-300'
                          } flex items-center justify-center`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l8-8z"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        {/* Download button */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement download functionality
                              console.log('Download image:', history.result!.url);
                            }}
                            className="p-1 bg-white/90 hover:bg-white rounded-apple-md shadow-lg text-gray-700 hover:text-gray-900 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-sf-pro-text text-gray-600 line-clamp-2">
                        {history.result!.prompt || '无提示词'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface ImageGenerationProps {
  onGenerationComplete?: (sceneId: string, progress: ImageGenerationProgress) => void;
}

export const ImageGeneration: React.FC<ImageGenerationProps> = ({
  onGenerationComplete
}) => {
  const databaseStore = useDatabaseProjectStore();
  const { toggleImageSelection: toggleImageSelectionAsync, isImageSelected, getSceneSelectedImages } = databaseStore;

  // 包装异步的toggleImageSelection以保持同步调用模式
  const toggleImageSelection = async (sceneId: string, imageId: string) => {
    try {
      await toggleImageSelectionAsync(sceneId, imageId);
    } catch (error) {
      console.error('Failed to toggle image selection:', error);
    }
  };
  const scenes = databaseStore.currentProject?.scenes || [];
  const [selectedScenes, setSelectedScenes] = useState<Scene[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeGenerations, setActiveGenerations] = useState<Map<string, ImageGenerationProgress>>(new Map());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<ImageGenerationProgress[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'byScene'>('all'); // View mode for history display

  // 模型选择状态
  const [selectedModel, setSelectedModel] = useState<EvoLinkModel | null>(null);
  const [showCostAnalysis, setShowCostAnalysis] = useState(false);

  // 速率限制和错误处理状态
  const [rateLimitError, setRateLimitError] = useState<Error | null>(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isGeneratingPrevented, setIsGeneratingPrevented] = useState(false);

  // Use individual selectors to prevent infinite loops
  const configurations = useAPIConfigStore((state) => state.configurations);
  const loadConfigurations = useAPIConfigStore((state) => state.loadConfigurations);
  const isLoading = useAPIConfigStore((state) => state.isLoading);
  const configError: string | null = useAPIConfigStore((state) => state.error);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  // Load configurations once on mount
  useEffect(() => {
    try {
      loadConfigurations();
    } catch (error) {
      console.error('Failed to load API configurations:', error);
    }
  }, []);

  // Auto-select first config if none selected - run when configurations change
  useEffect(() => {
    const imageConfigs = configurations
      .filter(config => config.type === 'image' || config.isActive);

    if (imageConfigs.length > 0 && !selectedConfigId) {
      const firstConfig = imageConfigs[0];
      setSelectedConfigId(firstConfig.id);
      setSelectedConfig(firstConfig.id);
    }
  }, [configurations, selectedConfigId]);

  useEffect(() => {
    // Auto-select available configurations
    if (selectedConfigId && selectedConfig !== selectedConfigId) {
      setSelectedConfig(selectedConfigId);
    }
  }, [selectedConfigId, selectedConfig]);

  // Local function to handle config selection
  const selectConfig = (configId: string) => {
    setSelectedConfigId(configId);
    setSelectedConfig(configId);
  };

  // Scene selection
  const toggleSceneSelection = (scene: Scene) => {
    const isSelected = selectedScenes.some(s => s.id === scene.id);
    if (isSelected) {
      setSelectedScenes(selectedScenes.filter(s => s.id !== scene.id));
    } else {
      setSelectedScenes([...selectedScenes, scene]);
    }
  };

  const selectAllScenes = () => {
    setSelectedScenes([...scenes]);
  };

  const clearSceneSelection = () => {
    setSelectedScenes([]);
  };

  // 模型选择处理函数
  const handleModelSelect = (model: EvoLinkModel) => {
    console.log('🎯 图像生成选择模型:', model.name);
    setSelectedModel(model);

    // 自动选择包含该模型的API配置
    const targetConfig = configurations.find(config =>
      config.name.toLowerCase().includes(model.name.toLowerCase()) ||
      config.name.toLowerCase().includes('evolink') ||
      config.model === model.id
    );

    if (targetConfig) {
      setSelectedConfig(targetConfig.id);
      console.log('🔧 自动切换到API配置:', targetConfig.name);
    }
  };

  // 加载生成历史
  const loadGenerationHistory = () => {
    try {
      const history = getImageGenerationHistory();
      setGenerationHistory(history);
    } catch (error) {
      logger.error('Failed to load generation history', error);
    }
  };

  // 组件挂载时加载历史
  useEffect(() => {
    loadGenerationHistory();
  }, []);

  // Generation
  const generateImages = async () => {
    const currentTime = Date.now();

    // 防重复点击机制
    if (isGenerating || isGeneratingPrevented) {
      console.log('⚠️ 生成正在进行中，忽略重复点击');
      return;
    }

    // 检查点击间隔（防止快速连击）
    if (currentTime - lastClickTime < 1000) {
      console.log('⚠️ 点击过于频繁，请稍等');
      setError('请等待1秒后再次点击');
      return;
    }

    setLastClickTime(currentTime);
    console.log('🎯 generateImages 函数被调用');
    console.log('📊 选中场景数量:', selectedScenes.length);
    console.log('⚙️ 选中的配置ID:', selectedConfig);
    console.log('🔥 当前是否正在生成:', isGenerating);

    // 增强的参数验证
    if (selectedScenes.length === 0) {
      console.error('❌ 验证失败: 没有选择场景');
      setError('请选择至少一个场景来生成图片');
      return;
    }

    if (!selectedConfig) {
      console.error('❌ 验证失败: 没有选择配置');
      setError('请选择API配置');
      return;
    }

    // 清除之前的错误状态
    setError(null);
    setRateLimitError(null);
    setRetryCount(0);

    // 验证场景数据完整性 - 增强版本
    console.log('🔍 开始验证场景数据完整性...');
    console.log('📋 selectedScenes内容:', selectedScenes);
    console.log('📋 scenes数组内容:', scenes);

    const invalidScenes = selectedScenes.filter(scene => {
      // 增强的场景编号验证
      const sceneNumber = scene.sceneNumber || scene.id?.replace(/\D/g, '') || Math.floor(Math.random() * 1000);
      console.log(`🔍 检查场景: ${scene.id}, sceneNumber: ${scene.sceneNumber}, fallback: ${sceneNumber}`);
      console.log(`  - imagePrompt: "${scene.imagePrompt}"`);
      console.log(`  - imagePrompt存在性: ${!!scene.imagePrompt}`);
      console.log(`  - imagePrompt长度: ${scene.imagePrompt?.length || 0}`);
      console.log(`  - imagePrompt是否为空: ${!scene.imagePrompt || scene.imagePrompt.trim() === ''}`);

      // 多重验证策略
      const hasValidImagePrompt = scene.imagePrompt && scene.imagePrompt.trim().length > 0;
      const hasValidDescription = scene.description && scene.description.trim().length > 0;
      const hasValidTitle = scene.title && scene.title.trim().length > 0 &&
                           !scene.title.match(/^Scene\s+\d+$/); // 排除纯"Scene X"格式

      // 优先级：imagePrompt > description > title
      let effectivePrompt = scene.imagePrompt || '';
      if (!effectivePrompt && hasValidDescription) {
        effectivePrompt = scene.description;
      }
      if (!effectivePrompt && hasValidTitle) {
        effectivePrompt = scene.title;
      }

      console.log(`  - 有效提示词: "${effectivePrompt}"`);
      console.log(`  - 是否有效: ${effectivePrompt.trim().length > 0}`);

      const isInvalid = effectivePrompt.trim().length === 0;
      if (isInvalid) {
        console.warn(`❌ 场景 ${sceneNumber} 缺少有效的图片提示词`);
      }

      return isInvalid;
    });

    if (invalidScenes.length > 0) {
      console.error('❌ 验证失败: 部分场景缺少图片提示词', {
        totalScenes: scenes.length,
        selectedScenes: selectedScenes.length,
        invalidScenes: invalidScenes.length,
        invalidSceneDetails: invalidScenes.map(sceneId => {
          const scene = scenes.find(s => s.id === sceneId);
          return {
            id: sceneId,
            sceneNumber: scene?.sceneNumber,
            hasImagePrompt: !!scene?.imagePrompt,
            imagePromptLength: scene?.imagePrompt?.length || 0,
            title: scene?.title || 'Unknown'
          };
        }),
        allScenesDebug: scenes.map(s => ({
          id: s.id,
          sceneNumber: s.sceneNumber,
          hasImagePrompt: !!s.imagePrompt,
          imagePromptLength: s.imagePrompt?.length || 0,
          isSelected: selectedScenes.includes(s.id),
          title: s.title || 'Unknown'
        }))
      });

      const sceneNumbers = invalidScenes.map(scene => {
        // 增强的场景编号获取，避免undefined
        return scene.sceneNumber || scene.id?.replace(/\D/g, '') || 'Unknown';
      }).join(', ');

      setError(`场景 ${sceneNumbers} 缺少图片提示词，请先完善场景描述后再生成图片`);
      return;
    }

    console.log('✅ 增强验证通过，开始生成流程');
    setIsGenerating(true);
    setIsGeneratingPrevented(true);
    const newGenerations = new Map<string, ImageGenerationProgress>();

    try {
      logger.info('Starting batch image generation with rate limit protection', {
        sceneCount: selectedScenes.length,
        configId: selectedConfig,
        timestamp: new Date().toISOString()
      }, 'image-generation');
      console.log('📝 批量生成开始，场景数量:', selectedScenes.length);

      // 更保守的批次处理 - 减少并发数以避免429错误
      const batchSize = Math.min(2, selectedScenes.length); // 最多2个并发
      const batches = [];

      for (let i = 0; i < selectedScenes.length; i += batchSize) {
        batches.push(selectedScenes.slice(i, i + batchSize));
      }

      console.log(`🔄 将分 ${batches.length} 批次处理，每批最多 ${batchSize} 个场景`);

      let batchIndex = 0;
      for (const batch of batches) {
        batchIndex++;
        console.log(`📦 处理第 ${batchIndex}/${batches.length} 批次`);

        try {
          // 串行处理批次以避免并发过多导致429错误
          const promises = batch.map(scene =>
            generateImageRequest(scene).catch(error => {
              console.error(`场景 ${scene.sceneNumber} 生成失败:`, error);
              // 检查是否是429错误
              if (error.message && (
                error.message.includes('429') ||
                error.message.includes('Too Many Requests') ||
                error.message.includes('rate limit')
              )) {
                // 抛出速率限制错误以停止后续批次
                throw error;
              }
              // 其他错误继续处理
              return null;
            })
          );

          const results = await Promise.all(promises);

          // 检查是否有429错误
          const hasRateLimitError = results.some(result =>
            result && result.error && (
              result.error.includes('429') ||
              result.error.includes('Too Many Requests') ||
              result.error.includes('rate limit')
            )
          );

          if (hasRateLimitError) {
            throw new Error('检测到速率限制，已停止后续批次处理');
          }

          // 批次间添加延迟以避免触发速率限制
          if (batchIndex < batches.length) {
            console.log('⏱️ 批次间等待3秒以避免速率限制...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

        } catch (batchError) {
          console.error(`💥 第 ${batchIndex} 批次处理失败:`, batchError);

          // 如果是速率限制错误，停止后续处理
          if (batchError.message && (
            batchError.message.includes('429') ||
            batchError.message.includes('Too Many Requests') ||
            batchError.message.includes('rate limit')
          )) {
            throw batchError;
          }
        }
      }

      console.log('✅ 所有批次处理完成');

    } catch (error) {
      console.error('💥 批量图片生成失败:', error);

      // 增强的错误处理 - 特别处理429错误
      let errorMessage = '图片生成失败';
      let isRateLimitError = false;

      if (error instanceof Error) {
        errorMessage = error.message;
        isRateLimitError = error.message.includes('429') ||
                          error.message.includes('Too Many Requests') ||
                          error.message.includes('rate limit') ||
                          error.message.includes('请求频率过高');

        if (isRateLimitError) {
          // 设置速率限制错误状态
          setRateLimitError(error);
          setShowRateLimitModal(true);
          setRetryCount(prev => prev + 1);
        }
      }

      // 记录详细错误日志
      logger.error('Batch image generation failed', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          isRateLimitError
        },
        timestamp: new Date().toISOString(),
        sceneCount: selectedScenes.length,
        retryCount: retryCount
      }, 'image-generation');

      // 如果不是速率限制错误，显示普通错误消息
      if (!isRateLimitError) {
        setError(errorMessage);
      }

    } finally {
      console.log('🏁 生成流程结束，重置状态');
      setIsGenerating(false);
      setActiveGenerations(newGenerations);

      // 延迟重置防重复点击状态，给用户一些视觉反馈时间
      setTimeout(() => {
        setIsGeneratingPrevented(false);
      }, 2000);
    }
  };

  const generateImageRequest = async (scene: Scene) => {
    try {
      console.log('🚀 开始生成图片请求 - 场景:', scene.sceneNumber);
      console.log('📋 选中的配置ID:', selectedConfig);

      // 获取完整的配置对象（使用组件顶层的configurations变量）
      const config = configurations.find(c => c.id === selectedConfig);

      console.log('🔧 找到的配置:', config ? config.name : '未找到配置');
      console.log('📝 所有可用配置:', configurations.map(c => ({ id: c.id, name: c.name })));

      // 详细调试配置对象结构
      if (config) {
        console.log('🔍 配置对象详细结构:', {
          id: config.id,
          name: config.name,
          type: config.type,
          endpoint: config.endpoint,
          headersCount: config.headers?.length || 0,
          headers: config.headers?.map(h => ({
            key: h.key,
            hasValue: !!h.value,
            enabled: h.enabled,
            isAuth: h.key?.toLowerCase() === 'authorization'
          })),
          isActive: config.isActive
        });
      }

      if (!config) {
        console.error('❌ 没有找到选中的API配置');
        throw new Error('没有找到选中的API配置');
      }

      // 增强的场景数据验证 - 修复sceneNumber为undefined的问题
      const sceneNumber = scene.sceneNumber || scene.id?.replace(/\D/g, '') || Math.floor(Math.random() * 1000);
      console.log(`🔍 场景数据验证: ID=${scene.id}, sceneNumber=${scene.sceneNumber}, fallback=${sceneNumber}`);

      // 增强的提示词获取策略
      let effectivePrompt = scene.imagePrompt || '';

      // 回退策略：使用description或title
      if (!effectivePrompt && scene.description) {
        effectivePrompt = scene.description;
        console.log(`🔄 场景 ${sceneNumber} 使用 description 作为提示词`);
      }
      if (!effectivePrompt && scene.title && !scene.title.match(/^Scene\s+\d+$/)) {
        effectivePrompt = scene.title;
        console.log(`🔄 场景 ${sceneNumber} 使用 title 作为提示词`);
      }

      // 最终回退 - 使用有意义的提示词
      if (!effectivePrompt) {
        effectivePrompt = `请为场景${sceneNumber}生成一张精美的图片`;
        console.log(`🔄 场景 ${sceneNumber} 使用有意义的默认提示词`);
      }

      console.log(`📝 场景 ${sceneNumber} 最终提示词: "${effectivePrompt.substring(0, 100)}..."`);

      const request: ImageGenerationRequest = {
        sceneId: scene.id,
        configId: selectedConfig,
        config: config, // 添加完整的配置对象
        prompt: effectivePrompt
      };

      console.log('📤 准备发送请求:', {
        sceneId: request.sceneId,
        configId: request.configId,
        prompt: request.prompt?.substring(0, 100) + '...',
        endpoint: config.endpoint
      });

      // The generateImage function already handles async polling and returns completed progress
      const progress = await generateImage(request);

      setActiveGenerations(prev => new Map(prev.set(progress.id, progress)));

      // If generation was successful and callback is provided, save to project
      if (progress.status === 'completed' && progress.result && onGenerationComplete) {
        onGenerationComplete(scene.id, progress);
        // 刷新生成历史
        loadGenerationHistory();
      }

    } catch (error) {
      logger.error('Image generation request failed', { sceneId: scene.id, error }, 'image-generation');
      const sceneNumber = scene.sceneNumber || scene.id?.replace(/\D/g, '') || 'Unknown';
      setError(`场景 ${sceneNumber} 生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const cancelGeneration = (generationId: string) => {
    imageGenerationService.cancelGeneration(generationId);
    setActiveGenerations(prev => {
      const newMap = new Map(prev);
      newMap.delete(generationId);
      return newMap;
    });
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `scene-${image.id}-${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logger.logFeature.used('image-download', { imageUrl: image.url });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show success feedback (could add a toast notification)
  };

  // 速率限制处理函数
  const handleRetryFromRateLimit = () => {
    console.log('🔄 用户选择从速率限制错误中重试');
    setShowRateLimitModal(false);
    setRateLimitError(null);

    // 延迟重试以给服务器一些时间
    setTimeout(() => {
      generateImages();
    }, 2000);
  };

  const handleCloseRateLimitModal = () => {
    setShowRateLimitModal(false);
    setRateLimitError(null);
  };

  const selectedConfigInfo = configurations.find(c => c.id === selectedConfig);

  return (
    <div className="w-full max-w-apple-xl mx-auto p-apple-xl animate-fade-in">
      <div className="glass-card shadow-apple-lg">
        {/* Header */}
        <div className="px-apple-xl py-apple-lg border-b border-gray-200/50 bg-gray-50/50 rounded-t-apple-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-apple flex items-center justify-center shadow-apple-md">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-sf-pro-display font-semibold text-gray-900">AI图片生成</h2>
                <p className="text-sm font-sf-pro-text text-gray-500">使用AI服务为场景生成高质量图片</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="glass-card px-apple-lg py-apple-sm">
                <span className="text-sm font-sf-pro-text font-medium text-gray-700">
                  {activeGenerations.size} 个进行中
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-apple-xl space-y-apple-xl">
          {/* API Configuration */}
          <div className="space-y-apple-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">API配置</h3>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-sm font-sf-pro-text text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showAdvanced ? '隐藏配置' : '显示配置'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-apple-lg">
              <div>
                <label className="block text-sm font-sf-pro-display font-medium text-gray-900 mb-apple-sm">
                  选择AI服务
                </label>
                <select
                  value={selectedConfig}
                  onChange={(e) => {
                    setSelectedConfig(e.target.value);
                    selectConfig(e.target.value);
                  }}
                  className="w-full px-apple-lg py-apple-md border border-gray-300 rounded-apple-md text-sm font-sf-pro-text focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  <option value="">请选择API配置...</option>
                  {configurations.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>

              {showAdvanced && selectedConfigInfo && (
                <div className="md:col-span-2 space-y-apple-sm">
                  <div className="text-sm font-sf-pro-text text-gray-600">
                    <span className="font-medium">端点:</span>
                    <code className="ml-2 text-xs bg-gray-100 px-apple-sm py-1 rounded">
                      {selectedConfigInfo.endpoint}
                    </code>
                  </div>
                  <div className="text-sm font-sf-pro-text text-gray-600">
                    <span className="font-medium">状态:</span>
                    <span className={`ml-2 ${selectedConfigInfo.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                      {selectedConfigInfo.isActive ? '已启用' : '未启用'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="p-apple-lg bg-blue-50/50 border border-blue-200/50 rounded-apple-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <p className="text-sm font-sf-pro-display font-medium text-blue-900">
                    正在加载API配置...
                  </p>
                </div>
              </div>
            )}

            {configError && (
              <div className="p-apple-lg bg-red-50/50 border border-red-200/50 rounded-apple-lg">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-sf-pro-display font-medium text-red-900">
                      API配置加载失败
                    </p>
                    <p className="text-sm font-sf-pro-text text-red-800 mt-1">
                      {configError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !configError && configurations.length === 0 && (
              <div className="p-apple-lg bg-yellow-50/50 border border-yellow-200/50 rounded-apple-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-sf-pro-display font-medium text-yellow-900">
                      请先配置API服务
                    </p>
                    <p className="text-sm font-sf-pro-text text-yellow-800 mt-1">
                      前往"API配置"页面创建和配置AI服务
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scene Selection */}
          <div className="space-y-apple-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">选择场景</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllScenes}
                  disabled={!scenes.length || isGenerating}
                  className="px-apple-lg py-apple-sm text-sm font-sf-pro-text text-gray-700 bg-gray-100 rounded-apple-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  全选
                </button>
                <button
                  onClick={clearSceneSelection}
                  disabled={!selectedScenes.length || isGenerating}
                  className="px-apple-lg py-apple-sm text-sm font-sf-pro-text text-gray-700 bg-gray-100 rounded-apple-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  清除
                </button>
              </div>
            </div>

            <div className="text-sm font-sf-pro-text text-gray-600 mb-apple-md">
              已选择 {selectedScenes.length} / {scenes.length} 个场景
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-apple-lg max-h-96 overflow-y-auto p-apple-sm">
              {scenes.map((scene) => {
                const isSelected = selectedScenes.some(s => s.id === scene.id);
                const hasImage = scene.images.length > 0;
                const isGenerating = Array.from(activeGenerations.values()).some(
                  g => g.status === 'processing' && g.id.includes(scene.id)
                );

                return (
                  <div
                    key={scene.id}
                    className={`border rounded-apple-lg p-apple-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    } ${isGenerating ? 'pointer-events-none opacity-50' : ''}`}
                    onClick={() => !isGenerating && toggleSceneSelection(scene)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-apple-sm">
                          <h4 className="text-sm font-sf-pro-display font-medium text-gray-900 truncate">
                            场景 {scene.sceneNumber}
                          </h4>
                          {hasImage && (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-sf-pro-text text-gray-600 line-clamp-2">
                          {(() => {
                            let displayPrompt = scene.imagePrompt || '';
                            if (!displayPrompt && scene.description) {
                              displayPrompt = scene.description;
                            }
                            if (!displayPrompt && scene.title && !scene.title.match(/^Scene\s+\d+$/)) {
                              displayPrompt = scene.title;
                            }
                            if (!displayPrompt) {
                              displayPrompt = 'No prompt available';
                            }
                            return displayPrompt.length > 100 ?
                              `${displayPrompt.substring(0, 100)}...` :
                              displayPrompt;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Display */}
          {error && !showRateLimitModal && (
            <div className="p-apple-lg bg-red-50/50 border border-red-200/50 rounded-apple-lg">
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-sf-pro-display font-medium text-red-900">
                    生成错误
                  </p>
                  <p className="text-sm font-sf-pro-text text-red-800 mt-1">
                    {error}
                  </p>
                  {error.includes('429') && (
                    <div className="mt-2 text-xs font-sf-pro-text text-red-700">
                      <strong>提示：</strong>这是速率限制错误，系统已自动重试。建议等待几分钟后重试。
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-red-100 rounded-apple-md text-red-600 hover:text-red-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Generation Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-sf-pro-text text-gray-600">
              {selectedScenes.length === 0
                ? '请选择要生成图片的场景'
                : isGenerating
                  ? `正在生成 ${selectedScenes.length} 张图片...`
                  : `准备生成 ${selectedScenes.length} 张图片`
              }
              {isGenerating && (
                <div className="flex items-center space-x-1 mt-1 text-blue-600">
                  <div className="animate-pulse">●</div>
                  <span className="text-xs">智能速率限制保护已启用</span>
                </div>
              )}
              {retryCount > 0 && !isGenerating && (
                <div className="flex items-center space-x-1 mt-1 text-orange-600">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-xs">已重试 {retryCount} 次</span>
                </div>
              )}
            </div>
            <button
              onClick={generateImages}
              disabled={!selectedScenes.length || !selectedConfig || isGenerating || isGeneratingPrevented}
              className={`btn-primary relative ${
                isGeneratingPrevented ? 'opacity-75 cursor-not-allowed' : ''
              } ${!selectedScenes.length || !selectedConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={
                !selectedScenes.length
                  ? '请先选择场景'
                  : !selectedConfig
                    ? '请先选择API配置'
                    : isGeneratingPrevented
                      ? '请等待当前操作完成'
                      : '开始生成图片'
              }
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>生成中...</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                </>
              ) : isGeneratingPrevented ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>请稍候...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>开始生成</span>
                </>
              )}
            </button>
          </div>

          {/* Active Generations */}
          {activeGenerations.size > 0 && (
            <div className="space-y-apple-md">
              <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">生成进度</h3>
              <div className="space-y-apple-md">
                {Array.from(activeGenerations.values()).map((progress) => {
                  const scene = scenes.find(s => s.id === progress.id.split('_')[1]);

                  return (
                    <div
                      key={progress.id}
                      className="border border-gray-200 rounded-apple-lg p-apple-lg"
                    >
                      <div className="flex items-center justify-between mb-apple-md">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            progress.status === 'completed'
                              ? 'bg-green-100'
                              : progress.status === 'failed'
                              ? 'bg-red-100'
                              : 'bg-blue-100'
                          }`}>
                            {progress.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : progress.status === 'failed' ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-sf-pro-display font-medium text-gray-900">
                              {scene ? `场景 ${scene.sceneNumber}` : '生成任务'}
                            </p>
                            <p className="text-xs font-sf-pro-text text-gray-500">
                              {progress.status === 'processing' && `进度: ${progress.progress}%`}
                              {progress.status === 'completed' && '生成完成'}
                              {progress.status === 'failed' && `错误: ${progress.error}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {progress.status === 'processing' && (
                            <button
                              onClick={() => cancelGeneration(progress.id)}
                              className="p-apple-sm hover:bg-red-100 rounded-apple-md text-red-600 hover:text-red-800 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {progress.status === 'processing' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                      )}

                      {progress.result && (
                        <div className="flex justify-center">
                          <img
                            src={progress.result.thumbnailUrl}
                            alt="Generated image"
                            className="w-full h-32 object-cover rounded-apple-md"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generation History */}
          <div className="space-y-apple-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">生成历史</h3>
              <div className="flex items-center space-x-2">
                {/* View mode toggle */}
                <div className="flex bg-gray-100 rounded-apple-md p-1">
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-apple-sm py-apple-xs rounded-apple-sm text-sm font-medium transition-colors ${
                      viewMode === 'all'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    全部图片
                  </button>
                  <button
                    onClick={() => setViewMode('byScene')}
                    className={`px-apple-sm py-apple-xs rounded-apple-sm text-sm font-medium transition-colors ${
                      viewMode === 'byScene'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    按场景
                  </button>
                </div>
                <button
                  onClick={() => loadGenerationHistory()}
                  className="p-apple-sm hover:bg-gray-100 rounded-apple-md text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center space-x-2 text-sm font-sf-pro-text text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {showHistory ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showHistory ? '隐藏历史' : '显示历史'}</span>
                </button>
              </div>
            </div>

            {showHistory && (
              <div className="space-y-apple-md">
                {/* 调试信息 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="p-apple-md bg-yellow-50 border border-yellow-200 rounded-apple-md text-xs">
                    <p><strong>调试信息:</strong></p>
                    <p>生成历史总数: {generationHistory.length}</p>
                    <p>已完成且结果存在: {generationHistory.filter(h => h.status === 'completed' && h.result).length}</p>
                    <p>历史记录: {JSON.stringify(generationHistory.slice(0, 2), null, 2)}</p>
                  </div>
                )}

                {/* Conditional rendering based on view mode */}
                {viewMode === 'all' ? (
                  // All Images View (existing)
                  generationHistory.length === 0 ? (
                    <div className="text-center py-apple-xl text-gray-500">
                      <Image className="w-12 h-12 mx-auto mb-apple-md opacity-50" />
                      <p className="text-sm font-sf-pro-text">暂无生成历史记录</p>
                      <p className="text-xs font-sf-pro-text mt-apple-sm">生成图片后会在这里显示历史记录</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-apple-lg">
                      {generationHistory.filter(history => history.result).map((history) => (
                      <div
                        key={history.id}
                        className="border border-gray-200/50 rounded-apple-lg p-apple-md hover:shadow-lg transition-all duration-300 group cursor-pointer"
                      >
                        <div className="relative aspect-square mb-apple-md overflow-hidden rounded-apple-md bg-gray-50">
                          <img
                            src={history.result!.thumbnailUrl}
                            alt="Generated image"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              console.error('图片加载失败:', history.result!.thumbnailUrl);
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0gMzAwIDMwMCB2b3JkZXI9CiAgPHBhdGggZmlsbD0iI0VCRkNGRSIgZD0iTjIuMDJ2aWMgNDYuODc2IDE3LjkxYyIvCjwvZz48L3N2Zz4K';
                            }}
                            onLoad={() => {
                              console.log('图片加载成功:', history.result!.thumbnailUrl);
                            }}
                          />
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => downloadImage(history.result!)}
                              className="p-apple-xs bg-white/90 hover:bg-white rounded-apple-md shadow-lg text-gray-700 hover:text-gray-900 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-apple-sm">
                          <div className="flex items-center justify-between">
                            {history.status === 'completed' ? (
                              <span className="inline-flex items-center px-apple-xs py-1 rounded-apple-md text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                已完成
                              </span>
                            ) : history.status === 'failed' ? (
                              <span className="inline-flex items-center px-apple-xs py-1 rounded-apple-md text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 mr-1" />
                                失败
                              </span>
                            ) : history.status === 'processing' ? (
                              <span className="inline-flex items-center px-apple-xs py-1 rounded-apple-md text-xs font-medium bg-blue-100 text-blue-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                处理中
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-apple-xs py-1 rounded-apple-md text-xs font-medium bg-gray-100 text-gray-800">
                                <Clock className="w-3 h-3 mr-1" />
                                {history.status || '未知状态'}
                              </span>
                            )}
                            <span className="text-xs font-sf-pro-text text-gray-500">
                              {new Date(history.endTime || history.startTime).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-sf-pro-text text-gray-700 line-clamp-2">
                            {history.result!.prompt || '无提示词'}
                          </p>
                          <div className="flex items-center justify-between text-xs font-sf-pro-text text-gray-500">
                            <span>{history.result!.provider}</span>
                            <span>{Math.round((history.endTime! - history.startTime) / 1000)}s</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )) : (
                  // Scene Grouped View (new)
                  <SceneGroupedImageHistory
                    history={generationHistory.filter(history => history.result)}
                    scenes={scenes}
                    onImageSelect={toggleImageSelection}
                    isImageSelected={isImageSelected}
                    getSceneSelectedImages={getSceneSelectedImages}
                  />
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-apple-lg bg-blue-50/50 border border-blue-200/50 rounded-apple-lg">
            <h4 className="text-sm font-sf-pro-display font-medium text-blue-900 mb-apple-lg">使用说明</h4>
            <ul className="text-sm font-sf-pro-text text-blue-800 space-y-apple-sm">
              <li className="flex items-start space-x-2">
                <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>选择要生成图片的场景和已配置的API服务</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>系统会并发处理最多3个场景以加快生成速度</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>生成的图片会自动保存到对应的场景中</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                <span>可以随时取消正在进行的生成任务</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 速率限制错误处理模态框 */}
      <RateLimitErrorModal
        isOpen={showRateLimitModal}
        onClose={handleCloseRateLimitModal}
        error={rateLimitError || undefined}
        onRetry={handleRetryFromRateLimit}
        retryCount={retryCount}
        estimatedWaitTime={Math.min(60 * Math.pow(2, retryCount), 300)} // 指数退避，最大5分钟
      />
    </div>
  );
};

export default ImageGeneration;