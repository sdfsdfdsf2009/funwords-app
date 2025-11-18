import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Play,
  Download,
  Settings,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Image,
  Zap,
  Eye,
  RotateCw,
  Trash2,
  Copy,
  Film,
  Key,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { ModelSelector, CostAnalysis, EvoLinkModel } from '../model-selection';
import {
  GeneratedVideo,
  VideoGenerationSettings,
  Scene,
  GeneratedImage,
  ImageGenerationProgress
} from '../../types';
import { ImagePreviewModal } from './ImagePreviewModal';
import { VideoPresetManager } from './VideoPresetManager';
import { VideoThumbnail } from './VideoThumbnail';
import { useProjectStore } from '../../stores/projectStore';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { useVideoTaskStore } from '../../stores/videoTaskStore';
import { logger } from '../../utils/logger';
import { secureLogger } from '../../utils/secureLogger';
import { parseVideoError } from '../../utils/errorHandler';
import { videoThumbnailManager } from '../../utils/videoThumbnail';
import { ProgressContainer, VideoTask, VideoTaskStatus } from './ProgressContainer';

interface VideoGenerationProps {
  className?: string;
}

export const VideoGeneration: React.FC<VideoGenerationProps> = ({ className = '' }) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]); // 支持多选
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<GeneratedVideo[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<any>(null); // 异步任务状态
  const [taskProgress, setTaskProgress] = useState(0); // 任务进度
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null); // 轮询定时器（单个任务）
  const [taskConfigs, setTaskConfigs] = useState<Map<string, any>>(new Map()); // 任务ID到配置的映射
  const [taskPollingIntervals, setTaskPollingIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map()); // 任务ID到轮询定时器的映射

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // 使用新的视频任务管理store
  const {
    tasks: videoTasks,
    loadTasks: loadVideoTasks,
    addTask: addVideoTask,
    updateTask: updateVideoTask,
    deleteTask: deleteVideoTask,
    isLoading: isTasksLoading,
    error: tasksError
  } = useVideoTaskStore();

  const [showProgressContainer, setShowProgressContainer] = useState(true); // 是否显示进度容器

  // 模型选择状态
  const [selectedModel, setSelectedModel] = useState<EvoLinkModel | null>(null);
  const [showCostAnalysis, setShowCostAnalysis] = useState(false);

  // 初始化时从数据库加载任务
  useEffect(() => {
    console.log('🔧 初始化开始，从数据库加载视频任务...');
    loadVideoTasks();
  }, [loadVideoTasks]);

  // 恢复轮询 - 检查是否有正在处理的任务
  useEffect(() => {
    const processingTasks = videoTasks.filter(task =>
      task.status === 'processing' || task.status === 'pending'
    );
    if (processingTasks.length > 0) {
      console.log('🔄 恢复轮询，发现', processingTasks.length, '个处理中的任务');

      // 为每个处理中的任务恢复配置
      processingTasks.forEach(task => {
        // 如果没有配置，尝试从localStorage恢复
        if (!taskConfigs.has(task.id)) {
          // 配置会在后面的useEffect中自动恢复
          console.log(`⚠️ 任务 ${task.id} 缺少配置，将在后续恢复`);
        }
      });
    }
  }, [videoTasks, taskConfigs]);

  const [generationSettings, setGenerationSettings] = useState<VideoGenerationSettings>({
    duration: 5,
    aspectRatio: '16:9',
    quality: 'standard',
    motionStrength: 'medium',
    style: 'realistic',
    fps: 30,
    promptEnhancement: true
  });

  const {
    currentProject,
    getSceneSelectedImages,
    isImageSelected,
    addGeneratedVideo
  } = useProjectStore();

  // Get scenes from current project
  const scenes = currentProject?.scenes || [];

  // 更新视频缩略图管理器的场景数据
  useEffect(() => {
    if (scenes) {
      videoThumbnailManager.updateScenes(scenes);
    }
  }, [scenes]);

  const { configurations: apiConfigs, isLoading, error: configError, loadConfigurations } = useAPIConfigStore();
  const [configurations, setConfigurations] = useState<any[]>([]);

  // 加载配置从API配置Store
  useEffect(() => {
    const initializeConfigs = () => {
      try {
        loadConfigurations();

        // Map API configurations to video generation format
        const videoConfigs = apiConfigs
          .filter(config => config.type === 'video' || config.isActive)
          .map(config => ({
            id: config.id,
            name: config.name,
            type: config.type || 'video',
            endpoint: config.endpoint,
            method: config.method || 'POST',
            headers: config.headers || [],
            requestParams: {
              model: config.requestParams?.model || 'veo3.1-fast',
              aspect_ratio: config.requestParams?.aspect_ratio || '16:9',
              ...config.requestParams
            },
            responseParser: config.responseParser || {
              successCode: 200,
              resultPath: '$.data[0].url',
              errorPath: '$.error'
            },
            isActive: config.isActive,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
          }));

        // Update configurations state
        setConfigurations(videoConfigs);

        // Auto-select first config if none selected
        if (videoConfigs.length > 0 && !selectedConfig) {
          setSelectedConfig(videoConfigs[0].id);
        }
      } catch (error) {
        console.error('Failed to load API configurations:', error);
      }
    };

    initializeConfigs();
  }, [apiConfigs, loadConfigurations, selectedConfig]);

  // 为处理中的任务恢复配置
  useEffect(() => {
    const processingTasks = videoTasks.filter(task =>
      task.status === 'processing' || task.status === 'pending'
    );
    if (processingTasks.length > 0) {
      processingTasks.forEach(task => {
        // 如果没有配置，尝试从当前选中的配置恢复
        if (!taskConfigs.has(task.id)) {
          const apiConfig = configurations.find(c => c.id === selectedConfig);
          if (apiConfig) {
            taskConfigs.set(task.id, apiConfig);
            console.log(`✅ 为任务 ${task.id} 恢复配置`);
          }
        }
      });
    }
  }, [videoTasks, taskConfigs, configurations, selectedConfig]);

  // 加载视频历史记录
  const loadVideoHistory = () => {
    if (!currentProject || !scenes) return;

    // Get all videos from scenes
    const allVideos: GeneratedVideo[] = [];
    const seenVideos = new Set<string>(); // Track unique video IDs and URLs to prevent duplicates

    scenes.forEach(scene => {
      // Handle backward compatibility - check both old and new formats
      if (scene.generatedVideo && (!scene.generatedVideos || scene.generatedVideos.length === 0)) {
        // Old format: single video
        const videoKey = `${scene.generatedVideo.id}-${scene.generatedVideo.url}`;
        if (!seenVideos.has(videoKey)) {
          seenVideos.add(videoKey);
          allVideos.push(scene.generatedVideo);
        }
      } else if (scene.generatedVideos && scene.generatedVideos.length > 0) {
        // New format: multiple videos array
        scene.generatedVideos.forEach(video => {
          const videoKey = `${video.id}-${video.url}`;
          if (!seenVideos.has(videoKey)) {
            seenVideos.add(videoKey);
            allVideos.push(video);
          }
        });
      }
    });

    // Sort by creation date (newest first)
    allVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`📹 [loadVideoHistory] Loaded ${allVideos.length} unique videos from ${scenes.length} scenes`);
    setGenerationHistory(allVideos);
  };

  // 视频任务事件处理函数
  const handleTaskComplete = useCallback((task: VideoTask) => {
    console.log('✅ 视频任务完成:', task);
    // 更新对应的生成历史记录
    if (task.videoUrl) {
      const generatedVideo: GeneratedVideo = {
        id: task.id,
        url: task.videoUrl,
        thumbnailUrl: '', // Remove invalid thumbnail URL - let VideoThumbnail component handle it properly
        provider: task.model || 'Unknown',
        sourceImageId: task.sourceImageId || '',
        prompt: task.prompt,
        settings: generationSettings,
        metadata: {
          duration: generationSettings.duration,
          aspectRatio: generationSettings.aspectRatio,
          resolution: '1280x720',
          format: 'mp4',
          fileSize: 5242880,
          frameRate: generationSettings.fps,
          model: task.model || 'veo3.1-fast'
        },
        createdAt: task.completedAt || new Date()
      };

      console.log(`📹 [handleTaskComplete] Adding video to scene ${selectedSceneId}: ${task.id}`);
      addGeneratedVideo(selectedSceneId, generatedVideo);
      // Only reload history if adding was successful (the addGeneratedVideo function now handles duplicates)
      setTimeout(() => {
        console.log(`📹 [handleTaskComplete] Reloading video history after task completion`);
        loadVideoHistory();
      }, 100); // Small delay to ensure state is updated
    }
  }, [selectedImageIds, selectedSceneId, generationSettings, addGeneratedVideo, loadVideoHistory]);

  const handleTaskFailed = useCallback((task: VideoTask) => {
    console.error('❌ 视频任务失败:', task);
  }, []);

  // 清理特定任务的轮询
  const cleanupTaskPolling = useCallback((taskId: string) => {
    const interval = taskPollingIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      setTaskPollingIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });
      console.log(`🧹 已清理任务 ${taskId} 的轮询`);
    }

    // 同时清理旧的currentTask轮询（向后兼容）
    if (currentTask?.id === taskId && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      setCurrentTask(null);
    }
  }, [currentTask, pollingInterval, taskPollingIntervals]);

  const handleTaskCancel = useCallback((taskId: string) => {
    console.log('🚫 取消任务:', taskId);
    // 从数据库中删除任务
    deleteVideoTask(taskId);
    // 停止该任务的轮询
    cleanupTaskPolling(taskId);
  }, [deleteVideoTask, cleanupTaskPolling]);

  const handleTaskRetry = useCallback((task: VideoTask) => {
    console.log('🔄 重试任务:', task);
    // 重新提交任务
    // TODO: 实现重试逻辑
  }, []);

  // 图片预览处理函数
  const handleImagePreview = useCallback((image: GeneratedImage) => {
    setPreviewImage(image);
    setIsPreviewModalOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewModalOpen(false);
    setPreviewImage(null);
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPreviewModalOpen) {
        if (e.key === 'Escape') {
          handleClosePreview();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewModalOpen, handleClosePreview]);

  const handleTaskView = useCallback((task: VideoTask) => {
    if (task.videoUrl) {
      setPlayingVideoId(task.id);
    }
  }, []);

  const handleTaskDownload = useCallback((task: VideoTask) => {
    if (task.videoUrl) {
      const link = document.createElement('a');
      link.href = task.videoUrl;
      link.download = `video_${task.id}.mp4`;
      link.click();
    }
  }, []);

  const handleTaskDelete = useCallback((taskId: string) => {
    deleteVideoTask(taskId);
  }, [deleteVideoTask]);

  // 检查历史任务状态
  const checkHistoricalTask = async (taskId: string) => {
    console.log('🔍 检查历史任务:', taskId);

    try {
      // 使用默认配置检查历史任务
      const defaultConfig = videoConfigurations[0];
      if (!defaultConfig) {
        console.error('❌ 没有可用的配置');
        alert('没有可用的API配置');
        return;
      }

      // 调用轮询任务状态函数
      const taskStatus = await pollTaskStatus(taskId, defaultConfig);

      if (taskStatus && taskStatus.status === 'completed' && taskStatus.videoUrl) {
        // 如果任务已完成，创建视频记录并添加到历史
        const generatedVideo: GeneratedVideo = {
          id: taskId,
          url: taskStatus.videoUrl,
          thumbnailUrl: '', // Remove invalid thumbnail URL - let VideoThumbnail component handle it properly
          provider: taskStatus.model || 'Evolink',
          sourceImageId: 'unknown',
          prompt: taskStatus.prompt || '历史任务',
          settings: generationSettings,
          metadata: {
            duration: 5,
            aspectRatio: '16:9',
            resolution: '1280x720',
            format: 'mp4',
            fileSize: 5242880,
            frameRate: 30,
            model: taskStatus.model || 'veo3.1-fast'
          },
          createdAt: taskStatus.completedAt || new Date()
        };

        // 添加到当前场景
        if (selectedSceneId) {
          addGeneratedVideo(selectedSceneId, generatedVideo);
        }

        // 刷新历史记录
        loadVideoHistory();

        alert('✅ 历史视频已恢复！');
      } else if (taskStatus && taskStatus.status === 'processing') {
        alert('⏳ 任务仍在处理中...');
      } else if (taskStatus && taskStatus.status === 'failed') {
        alert('❌ 任务已失败');
      } else {
        alert('❓ 未找到任务信息');
      }
    } catch (error) {
      console.error('❌ 检查历史任务失败:', error);
      alert('检查失败: ' + error.message);
    }
  };

  // Filter configurations for video generation only
  const videoConfigurations = configurations.filter(config => {
    const isActive = config.isActive;
    const isVideoType = config.type === 'video' || config.type === 'both';
    const hasVideoInName = config.name.toLowerCase().includes('video') ||
                         config.name.toLowerCase().includes('视频');
    const hasVideoInEndpoint = config.endpoint.toLowerCase().includes('video') ||
                              config.endpoint.toLowerCase().includes('videos');
    const hasEvolinkInName = config.name.toLowerCase().includes('evolink');
    const hasVeonInEndpoint = config.endpoint.toLowerCase().includes('veo');

    // 更宽松的条件：包含多种匹配策略
    const shouldInclude = (isActive && (isVideoType || hasVideoInName || hasVideoInEndpoint || hasEvolinkInName || hasVeonInEndpoint)) ||
                         hasVideoInName || // 名称包含视频关键词的总是包含
                         hasEvolinkInName || // Evolink相关配置总是包含
                         (hasVeonInEndpoint && hasEvolinkInName); // 端点有veo且名称有evolink

    return shouldInclude;
  });

  // 记录视频配置数量用于调试
  if (videoConfigurations.length === 0) {
    logger.warn('没有找到可用的视频配置', {
      totalConfigurations: configurations.length,
      configurations: configurations.map(c => ({
        name: c.name,
        type: c.type,
        isActive: c.isActive
      }))
    });
  }

  // 如果没有视频配置，创建一个默认的Evolink视频配置
  if (videoConfigurations.length === 0) {
    logger.info('没有找到视频配置，创建默认配置');
    const defaultVideoConfig = {
      id: crypto.randomUUID(),
      name: 'Evolink 视频生成 - 默认',
      type: 'video' as const,
      endpoint: '/api/evolink/v1/videos/generations',
      method: 'POST' as const,
      headers: [
        {
          key: 'Authorization',
          value: 'Bearer your-api-key-here'
        }
      ],
      requestParams: {
        model: 'veo3.1-fast',
        aspect_ratio: '16:9'
      },
      responseParser: {
        successCode: 200,
        resultPath: '$.data[0].url',
        errorPath: '$.error'
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 直接添加到videoConfigurations数组
    videoConfigurations.push(defaultVideoConfig);

    // 自动选择这个配置
    if (!selectedConfig) {
      setSelectedConfig(defaultVideoConfig.id);
    }
  }

  // Auto-select available video configurations
  useEffect(() => {
    if (videoConfigurations.length > 0 && !selectedConfig) {
      setSelectedConfig(videoConfigurations[0].id);
    }
  }, [videoConfigurations, selectedConfig]);

  // Load video generation history
  useEffect(() => {
    loadVideoHistory();
  }, [currentProject, scenes]);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('🧹 清理轮询定时器');
      }
    };
  }, [pollingInterval]);

  const handleImageSelect = (sceneId: string, imageId: string) => {
    setSelectedSceneId(sceneId);

    // 切换图片选择状态
    setSelectedImageIds(prev => {
      if (prev.includes(imageId)) {
        // 如果已选中，则取消选中
        return prev.filter(id => id !== imageId);
      } else {
        // 如果未选中，则添加到选中列表
        return [...prev, imageId];
      }
    });
  };

  // 新增：多选控制函数
  const handleSelectAll = (sceneId: string, images: any[]) => {
    setSelectedSceneId(sceneId);
    const imageIds = images.map(img => img.id);
    setSelectedImageIds(imageIds);
  };

  const handleClearSelection = () => {
    setSelectedImageIds([]);
  };

  // 模型选择处理函数
  const handleModelSelect = (model: EvoLinkModel) => {
    console.log('🎯 选择模型:', model.name);
    setSelectedModel(model);

    // 自动选择包含该模型的API配置
    const targetConfig = configurations.find(config =>
      config.name.toLowerCase().includes(model.name.toLowerCase()) ||
      config.name.toLowerCase().includes('evolink') ||
      config.requestParams?.model === model.id
    );

    if (targetConfig) {
      setSelectedConfig(targetConfig.id);
      console.log('🔧 自动切换到API配置:', targetConfig.name);
    }
  };

  
  // 轮询任务状态 - 直接调用Evolink API
  const pollTaskStatus = async (taskId: string, config: any) => {
    try {
      console.log('🔍 轮询任务状态:', taskId);

      // 获取任务对象以检查是否有originalApiId
      const task = videoTasks.find(t => t.id === taskId);
      const apiTaskId = task?.originalApiId || taskId; // 使用原始API ID或直接使用taskId

      if (task?.originalApiId) {
        secureLogger.debug('📋 使用原始API ID', {
          localTaskId: taskId,
          originalApiId: task.originalApiId.substring(0, 8) + '***', // 脱敏处理
          sourceImageId: task.sourceImageId
        });
      }

      // 优先使用存储的配置，确保使用创建任务时的相同API密钥
      const storedConfig = taskConfigs.get(taskId);
      const effectiveConfig = storedConfig || config;

      secureLogger.debug('📋 使用配置', {
        taskId,
        apiTaskId,
        hasStoredConfig: !!storedConfig,
        configName: effectiveConfig?.name,
        isStored: !!storedConfig
      });

      // 尝试直接调用Evolink API
      const authHeader = effectiveConfig.headers?.find((h: any) => h.key === 'Authorization');
      if (!authHeader || !authHeader.value) {
        throw new Error('配置中未找到有效的Authorization头部');
      }

      const apiKey = authHeader.value.replace(/^Bearer\s+/, '');
      // 使用安全日志记录API密钥信息，只记录长度而不暴露密钥本身
      secureLogger.info('🔑 使用API密钥进行API调用', {
        apiKeyLength: apiKey.length,
        hasValidFormat: apiKey.length > 10,
        endpoint: '/api/evolink/v1/tasks/' + apiTaskId,
        configName: effectiveConfig?.name || 'Unknown'
      });

      // 使用本地代理API调用，避免CORS问题
      secureLogger.info('📡 使用代理API调用任务状态', {
        apiTaskId,
        endpoint: '/api/evolink/v1/tasks/' + apiTaskId,
        configName: effectiveConfig?.name || 'Unknown'
      });

      // 构建代理请求的配置头部
      const proxyConfig = {
        headers: effectiveConfig.headers || []
      };

      const response = await fetch(`/api/evolink/v1/tasks/${apiTaskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-config': encodeURIComponent(JSON.stringify(proxyConfig))
        }
      });

      secureLogger.debug('📡 API响应状态', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 代理API调用失败:', {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText.substring(0, 500)
        });

        // 代理调用失败，返回错误信息
        throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
      }

      const taskData = await response.json();
      console.log('📊 任务状态响应:', taskData);

      // 更新数据库中的任务状态
      const taskUpdateData = {
        status: taskData.status as VideoTaskStatus,
        progress: taskData.progress || 0,
        model: taskData.model || 'veo3.1-fast',
        videoUrl: taskData.results?.[0] || taskData.url || taskData.video_url,
        completedAt: taskData.status === 'completed' ? new Date() : undefined,
        errorMessage: taskData.error || taskData.message
      };

      await updateVideoTask(taskId, taskUpdateData);

      // 检查任务是否完成
      if (taskData.status === 'completed') {
        console.log('✅ 视频生成完成:', taskData);

        // 停止轮询
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        // 找到对应的任务以获取源图片ID和场景ID
        const videoTask = videoTasks.find(task => task.id === taskId);
        const sourceImageId = videoTask?.sourceImageId || selectedImageIds[0] || '';
        const sceneId = videoTask?.sceneId || selectedSceneId;

        console.log(`🎯 [Video Generation Complete] Task completion details:`, {
          taskId,
          sourceImageId,
          sceneId,
          videoTaskSceneId: videoTask?.sceneId,
          selectedSceneId,
          selectedImageIds,
          provider: config.name
        });

        // 创建完成的视频对象 - 使用本地唯一ID而不是API ID
        const completedVideo: GeneratedVideo = {
          id: taskId, // 使用本地唯一任务ID，避免冲突
          originalApiId: taskData.id, // 保存原始API ID供参考
          url: taskData.results?.[0] || taskData.url || taskData.video_url, // 优先使用results数组的第一个链接
          thumbnailUrl: taskData.thumbnail_url || sourceImageId,
          provider: config.name,
          sourceImageId: sourceImageId,
          prompt: currentTask?.prompt || '',
          settings: generationSettings,
          metadata: {
            duration: taskData.duration || generationSettings.duration,
            aspectRatio: taskData.aspect_ratio || generationSettings.aspectRatio,
            resolution: taskData.resolution || '1280x720',
            format: taskData.format || 'mp4',
            fileSize: taskData.file_size || 5242880,
            frameRate: taskData.frame_rate || generationSettings.fps,
            model: taskData.model || 'veo3.1-fast',
            localTaskId: taskId, // 添加本地任务ID
            originalApiTaskId: taskData.id // 添加原始API任务ID
          },
          createdAt: new Date()
        };

        // 保存视频到场景
        console.log(`💾 [Video Generation] Saving video to scene:`, { sceneId, videoId: completedVideo.id });
        addGeneratedVideo(sceneId, completedVideo);

        // 立即重新加载视频历史以确保状态同步
        console.log(`🔄 [Video Generation] Reloading video history for status sync`);
        loadVideoHistory();

        // 重置状态
        setCurrentTask(null);
        setTaskProgress(0);
        setIsGenerating(false);

        console.log(`✅ [Video Generation] Video generation completed and saved successfully`);

        // alert('视频生成完成！'); // 已移除弹窗提示

      } else if (taskData.status === 'failed') {
        console.error('❌ 视频生成失败:', taskData);

        // 更新数据库中的任务状态为失败，包含详细错误信息
        const failureUpdateData = {
          status: 'failed' as VideoTaskStatus,
          errorMessage: taskData.error?.message || taskData.message || '未知错误',
          errorCode: taskData.error?.code || taskData.code,
          errorDetails: taskData.error || taskData
        };

        await updateVideoTask(taskId, failureUpdateData);

        // 停止轮询
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }

        // 重置状态
        setCurrentTask(null);
        setTaskProgress(0);
        setIsGenerating(false);

        // 移除简单的alert弹窗，错误详情在ProgressContainer中显示

      } else {
        // 任务仍在进行中，继续轮询
        console.log(`⏳ 任务进行中: ${taskData.status}, 进度: ${taskData.progress}%`);
      }

    } catch (error) {
      console.error('❌ 轮询任务状态失败:', error);

      // 停止轮询
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      setCurrentTask(null);
      setTaskProgress(0);
      setIsGenerating(false);

      // 移除简单的alert弹窗，错误详情在ProgressContainer中显示
      console.error('轮询任务状态失败:', error);
    }
  };

  // 简化的任务启动函数（只记录配置，不再创建独立轮询）
  const startTaskPolling = (taskId: string, config: any) => {
    console.log('📝 记录任务配置:', taskId);
    setTaskConfigs(prev => new Map(prev).set(taskId, config));
  };

  // 统一轮询管理器 - 使用useEffect实现
  useEffect(() => {
    // 创建一个统一的轮询器来管理所有任务
    const unifiedPollingInterval = setInterval(async () => {
      try {
        // 获取所有正在处理中的任务 (包括 pending 和 processing 状态)
        const processingTasks = videoTasks.filter(task =>
          task.status === 'processing' || task.status === 'pending'
        );

        if (processingTasks.length === 0) {
          return; // 没有处理中的任务，跳过本轮询
        }

        console.log(`🔄 统一轮询 ${processingTasks.length} 个任务...`);

        // 并行查询所有处理中的任务
        const pollPromises = processingTasks.map(async (task) => {
          const config = taskConfigs.get(task.id);
          if (!config) {
            console.warn(`⚠️ 任务 ${task.id} 没有配置，跳过轮询`);
            console.warn(`📋 可用配置:`, Array.from(taskConfigs.keys()));
            return null;
          }

          try {
            await pollTaskStatus(task.id, config);
            return { taskId: task.id, success: true };
          } catch (error) {
            console.error(`❌ 轮询任务 ${task.id} 失败:`, error);
            return { taskId: task.id, success: false, error };
          }
        });

        // 等待所有轮询完成（使用Promise.allSettled避免单个失败影响整体）
        const results = await Promise.allSettled(pollPromises);

        // 统计结果
        const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
        const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).length;

        if (successful > 0 || failed > 0) {
          console.log(`📊 轮询结果: 成功 ${successful}, 失败 ${failed}`);
        }

      } catch (error) {
        console.error('❌ 统一轮询失败:', error);
      }
    }, 3000); // 每3秒统一轮询一次

    // 清理函数：组件卸载时清除轮询器
    return () => {
      if (unifiedPollingInterval) {
        clearInterval(unifiedPollingInterval);
        console.log('🧹 清理统一轮询器');
      }
    };
  }, [videoTasks, taskConfigs]); // 依赖项：当任务列表或配置变化时重新设置

  const handleGenerateVideo = async () => {
    if (selectedImageIds.length === 0 || !selectedSceneId) {
      alert('请先选择要生成视频的图片');
      return;
    }

    if (!selectedConfig) {
      alert('请先选择API配置');
      return;
    }

    if (!selectedModel) {
      alert('请先选择AI模型');
      return;
    }

    // 验证所选模型是否支持视频生成
    if (selectedModel.type !== 'video' && selectedModel.type !== 'both') {
      alert(`所选模型 ${selectedModel.name} 不支持视频生成，请选择支持视频的模型`);
      return;
    }

    // Get the selected configuration (must be video-capable)
    // Find the configuration in all configurations, not just videoConfigurations
    const selectedConfigObject = configurations.find(c => c.id === selectedConfig);
    const videoConfig = videoConfigurations.find(c => c.id === selectedConfig);

    // If selected config is not in videoConfigurations, try to find it in all configurations
    const finalVideoConfig = videoConfig || (
      selectedConfigObject &&
      (selectedConfigObject.type === 'video' ||
       selectedConfigObject.type === 'both' ||
       selectedConfigObject.name.toLowerCase().includes('video') ||
       selectedConfigObject.name.toLowerCase().includes('视频'))
        ? selectedConfigObject : null
    );

    // 添加配置验证和调试信息
    console.log('视频配置调试信息:', {
      selectedConfig,
      selectedConfigObject: selectedConfigObject ? {
        id: selectedConfigObject.id,
        name: selectedConfigObject.name,
        type: selectedConfigObject.type,
        isActive: selectedConfigObject.isActive
      } : null,
      videoConfig: videoConfig ? {
        id: videoConfig.id,
        name: videoConfig.name,
        type: videoConfig.type
      } : null,
      finalVideoConfig: finalVideoConfig ? {
        id: finalVideoConfig.id,
        name: finalVideoConfig.name,
        type: finalVideoConfig.type
      } : null,
      totalConfigurations: configurations.length,
      videoConfigurationsCount: videoConfigurations.length,
      selectedImageIds: selectedImageIds.length
    });

    if (!finalVideoConfig) {
      console.error('未找到有效的视频配置:', {
        selectedConfig,
        availableConfigs: configurations.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          isActive: c.isActive
        })),
        videoConfigs: videoConfigurations.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type
        }))
      });
      alert('没有找到支持视频生成的API配置，请确保API配置的类型设置为"视频"或"两者"');
      return;
    }

    setIsGenerating(true);

    try {
      logger.info('开始批量视频生成', {
        sceneId: selectedSceneId,
        imageIds: selectedImageIds,
        imageCount: selectedImageIds.length,
        settings: generationSettings
      });

      // Get the selected scene
      const scene = scenes.find(s => s.id === selectedSceneId);
      if (!scene) {
        throw new Error('未找到选中图片的场景');
      }

      // 获取所有选中的图片
      console.log(`🔍 调试信息 - 场景图片总数: ${scene.images.length}`);
      console.log(`🔍 调试信息 - 选中的图片ID数组:`, selectedImageIds);
      console.log(`🔍 调试信息 - 场景中所有图片的ID:`, scene.images.map(img => img.id));

      let selectedImages = scene.images.filter(img => selectedImageIds.includes(img.id));
      console.log(`🔍 调试信息 - 过滤后的选中图片数量: ${selectedImages.length}`);

      // 如果场景中的图片不完整，尝试从全局状态或其他地方获取图片数据
      if (selectedImages.length < selectedImageIds.length) {
        console.warn(`⚠️ 场景中图片数据不完整，尝试从其他来源获取图片数据`);

        // 尝试从项目的所有图片中查找
        const allProjectImages = scenes.flatMap(s => s.images);
        console.log(`🔍 项目中所有图片数量: ${allProjectImages.length}`);
        console.log(`🔍 项目中所有图片ID:`, allProjectImages.map(img => img.id));

        const additionalImages = allProjectImages.filter(img =>
          selectedImageIds.includes(img.id) &&
          !selectedImages.some(selected => selected.id === img.id)
        );

        console.log(`🔍 从项目中找到额外图片: ${additionalImages.length} 张`);

        // 合并图片数据
        selectedImages = [...selectedImages, ...additionalImages];
        console.log(`🔍 合并后的图片总数: ${selectedImages.length}`);
      }

      // 如果还是找不到所有图片，创建占位符图片数据
      if (selectedImages.length < selectedImageIds.length) {
        console.error(`❌ 仍然无法找到所有图片数据，创建占位符处理`);

        const missingImageIds = selectedImageIds.filter(id => !selectedImages.some(img => img.id === id));
        console.warn(`⚠️ 完全缺失的图片ID:`, missingImageIds);

        // 为缺失的图片创建占位符
        const placeholderImages = missingImageIds.map(id => ({
          id: id,
          url: `https://tempfile.aiquickdraw.com/workers/nano/image_${Date.now()}_placeholder.png`,
          placeholder: true
        }));

        selectedImages = [...selectedImages, ...placeholderImages];
        console.log(`🔍 添加占位符后总图片数: ${selectedImages.length}`);
      }

      if (selectedImages.length === 0) {
        console.error(`❌ 批量处理失败: 完全找不到任何图片数据`);
        throw new Error(`找不到任何可用的图片数据`);
      }

      console.log(`🎬 开始批量生成 ${selectedImages.length} 个视频`);
      console.log(`📋 最终处理的图片详情:`, selectedImages.map(img => ({
        id: img.id,
        url: img.url.substring(0, 50) + '...',
        isPlaceholder: img.placeholder || false
      })));

      // 创建批量任务，并发处理所有图片
      const batchPromises = selectedImages.map(async (image, index) => {
        const promiseId = `promise-${index + 1}-${image.id.substring(0, 8)}`;

        try {
          console.log(`📸 [${promiseId}] 开始处理第 ${index + 1}/${selectedImages.length} 张图片: ${image.id}`);

          // 检查是否为占位符图片
          if (image.placeholder) {
            console.warn(`⚠️ [${promiseId}] 检测到占位符图片，跳过API调用`);
            return {
              success: false,
              imageId: image.id,
              error: `占位符图片：无法找到原始图片数据，请重新生成或上传图片`,
              promiseId
            };
          }

          // Create video generation request for each image
          const videoRequest = {
            imageUrl: image.url,
            prompt: scene.videoPrompt || scene.imagePrompt,
            settings: generationSettings,
            provider: finalVideoConfig.name
          };

          console.log(`📤 [${promiseId}] 准备发送API请求:`, {
            imageId: image.id,
            hasImageUrl: !!image.url,
            urlPreview: image.url.substring(0, 50) + '...',
            promptLength: videoRequest.prompt?.length || 0,
            provider: videoRequest.provider
          });

          logger.info(`视频生成请求 ${index + 1}`, { ...videoRequest, imageId: image.id });

          // Call the video generation API for each image
          console.log(`🚀 [${promiseId}] 开始调用API...`);
          const apiResponse = await callVideoGenerationAPI(videoRequest);
          console.log(`📬 [${promiseId}] API响应成功:`, {
            hasId: !!apiResponse.id,
            hasUrl: !!apiResponse.url,
            status: apiResponse.status,
            isAsync: apiResponse.id && !apiResponse.url && (apiResponse.status === 'pending' || apiResponse.status === 'processing')
          });

          // 检查是否为异步任务响应
          if (apiResponse.id && !apiResponse.url && (apiResponse.status === 'pending' || apiResponse.status === 'processing')) {
            // 为每个图片创建唯一的任务ID，避免重复
            const uniqueTaskId = `${apiResponse.id}-img-${image.id.substring(0, 8)}`;

            console.log(`🎬 第 ${index + 1} 个异步视频任务已创建:`);
            console.log(`  原始API ID: ${apiResponse.id}`);
            console.log(`  图片ID: ${image.id}`);
            console.log(`  唯一任务ID: ${uniqueTaskId}`);

            // 创建VideoTask对象
            const newVideoTask: VideoTask = {
              id: uniqueTaskId, // 使用唯一任务ID
              originalApiId: apiResponse.id, // 保存原始API ID用于查询
              prompt: scene.videoPrompt || scene.imagePrompt,
              status: apiResponse.status as VideoTaskStatus,
              progress: apiResponse.progress || 0,
              model: finalVideoConfig.requestParams?.model || 'veo3.1-fast',
              createdAt: new Date(),
              config: finalVideoConfig,
              sourceImageId: image.id, // 添加源图片ID映射
              sceneId: selectedSceneId // 添加场景ID映射
            };

            // 添加到数据库
            await addVideoTask(newVideoTask);

            // 保存任务到配置的映射并开始轮询任务状态
            setTaskConfigs(prev => new Map(prev).set(uniqueTaskId, finalVideoConfig));
            startTaskPolling(uniqueTaskId, finalVideoConfig);

            console.log(`✅ [${promiseId}] 异步任务创建成功:`, apiResponse.id);
            return {
              success: true,
              imageId: image.id,
              taskId: apiResponse.id,
              isAsync: true,
              promiseId
            };
          }

          // 如果不是异步任务，按原来的同步逻辑处理
          const generatedVideo: GeneratedVideo = {
            id: apiResponse.id || `video_${Date.now()}_${index}`,
            url: apiResponse.url || apiResponse.videoUrl,
            thumbnailUrl: apiResponse.thumbnailUrl || image.url,
            provider: finalVideoConfig.name,
            sourceImageId: image.id,
            prompt: scene.videoPrompt || scene.imagePrompt,
            settings: generationSettings,
            metadata: {
              duration: apiResponse.duration || generationSettings.duration,
              aspectRatio: apiResponse.aspectRatio || generationSettings.aspectRatio,
              resolution: apiResponse.resolution || '1280x720',
              format: apiResponse.format || 'mp4',
              fileSize: apiResponse.fileSize || 5242880,
              frameRate: apiResponse.frameRate || generationSettings.fps,
              model: apiResponse.model || finalVideoConfig.name
            },
            createdAt: new Date()
          };

          // Add video to scene and store
          addGeneratedVideo(selectedSceneId, generatedVideo);

          logger.info(`第 ${index + 1} 个视频生成完成`, { videoId: generatedVideo.id, url: generatedVideo.url });

          console.log(`✅ [${promiseId}] 同步视频生成成功:`, generatedVideo.id);
          return {
            success: true,
            imageId: image.id,
            video: generatedVideo,
            isAsync: false,
            promiseId
          };

        } catch (error) {
          console.error(`❌ [${promiseId}] 第 ${index + 1} 个视频生成失败:`, error);
          logger.error(`第 ${index + 1} 个视频生成失败`, { error, imageId: image.id, promiseId });

          let errorMessage = `视频生成失败: ${error instanceof Error ? error.message : '未知错误'}`;

          // Special handling for model access issues
          if (error instanceof Error && error.message.includes('无可用渠道')) {
            errorMessage = `视频生成模型权限不足\n\n您的API密钥无法访问视频生成模型(veo3.1)。\n\n解决方案：\n1. 联系Evolink客服申请veo3.1模型权限\n2. 或升级到支持视频生成的API套餐`;
          }

          console.error(`❌ [${promiseId}] 失败原因:`, errorMessage);

          return {
            success: false,
            imageId: image.id,
            error: errorMessage,
            promiseId
          };
        }
      });

      // 等待所有任务完成
      console.log(`⏳ 等待 ${batchPromises.length} 个批量任务完成...`);
      console.log(`📋 批量任务ID列表:`, batchPromises.map((_, index) => {
        const image = selectedImages[index];
        return `promise-${index + 1}-${image.id.substring(0, 8)}`;
      }));

      const results = await Promise.all(batchPromises);
      console.log(`✅ 所有批量任务已完成，结果数量: ${results.length}`);
      console.log(`📋 详细结果:`, results.map((r, i) => ({
        index: i,
        success: r.success,
        imageId: r.imageId,
        taskId: r.taskId,
        isAsync: r.isAsync,
        promiseId: r.promiseId,
        error: r.error ? r.error.substring(0, 50) + '...' : undefined
      })));

      // 验证批量处理的完整性
      if (results.length !== selectedImages.length) {
        console.error(`❌ 批量处理结果不完整: 期望 ${selectedImages.length} 个结果，但只得到 ${results.length} 个`);
      }

      // 统计结果
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const asyncCount = results.filter(r => r.isAsync).length;
      const syncCount = successCount - asyncCount;

      console.log(`📊 批量生成完成: 成功 ${successCount}/${selectedImages.length}, 失败 ${failureCount}, 异步 ${asyncCount}, 同步 ${syncCount}`);

      // 刷新历史记录
      loadVideoHistory();

      // 显示结果摘要
      let summaryMessage = `批量视频生成完成！\n\n`;
      summaryMessage += `总处理数量: ${selectedImages.length} 张图片\n`;
      summaryMessage += `成功: ${successCount} 张\n`;
      summaryMessage += `失败: ${failureCount} 张\n`;

      if (asyncCount > 0) {
        summaryMessage += `\n其中有 ${asyncCount} 个任务正在异步处理中，请在右下角进度面板查看进度。`;
      }

      if (failureCount > 0) {
        summaryMessage += `\n\n失败的图片:`;
        results.filter(r => !r.success).forEach((result, index) => {
          summaryMessage += `\n${index + 1}. 图片ID: ${result.imageId}`;
        });
      }

      // alert(summaryMessage); // 已移除批量生成完成弹窗提示

    } catch (error) {
      logger.error('批量视频生成失败', error);
      alert(`批量视频生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const callVideoGenerationAPI = async (request: any) => {
    try {
      console.log('🚀 开始调用视频生成API', {
        provider: request.provider,
        imageUrl: request.imageUrl.substring(0, 50) + '...',
        prompt: request.prompt.substring(0, 50) + '...'
      });
      logger.info('开始调用视频生成API', { provider: request.provider });

      // Get the selected configuration (must be video-capable)
      const config = videoConfigurations.find(c => c.id === selectedConfig);
      if (!config) {
        throw new Error('未找到支持视频生成的API配置');
      }

      // Evolink uses the same endpoint for both images and videos
      // The API determines the output type based on the request parameters

      // Prepare API request for Evolink video generation using correct video API
      const apiRequest = {
        prompt: request.prompt,
        image_urls: [request.imageUrl], // Use array format for image-to-video
        aspect_ratio: request.settings.aspectRatio, // Video API uses aspect_ratio
        model: selectedModel?.id || config.requestParams?.model || 'veo3.1-fast' // Use selected model first
      };

      // 添加模型选择的日志
      if (selectedModel) {
        console.log('🎯 使用选中的模型:', {
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          modelType: selectedModel.type,
          costPerCall: selectedModel.costPerCall
        });
      }

      // Detect Evolink by checking if the endpoint path or name contains 'evolink'
      const isEvolink = config.endpoint.includes('evolink.ai') ||
                       config.endpoint.includes('/api/evolink/v1/images/generations') ||
                       config.endpoint.includes('/api/evolink/v1/videos/generations') ||
                       config.name.toLowerCase().includes('evolink');

      // Use the user's selected endpoint
      let apiEndpoint = config.endpoint;

      // For Evolink configurations, ensure using the correct video endpoint
      if (isEvolink) {
        // If user configured image endpoint but is doing video generation, redirect to video endpoint
        if (apiEndpoint.includes('/images/generations')) {
          apiEndpoint = apiEndpoint.replace('/images/generations', '/videos/generations');
        }
      }

      // 使用我们的Next.js API代理来避免CORS问题
      const proxyEndpoint = '/api/evolink/v1/videos/generations';

      console.log('🚀 发送视频生成请求到API代理:', {
        endpoint: proxyEndpoint,
        method: 'POST',
        originalEndpoint: apiEndpoint,
        configName: config.name,
        requestBody: apiRequest
      });

      const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...apiRequest,
          // 传递原始配置信息给代理
          _config: {
            endpoint: apiEndpoint,
            headers: config.headers
          }
        })
      });

      console.log('📥 收到API响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      let data;
      let responseText = '';
      try {
        responseText = await response.text();

        console.log('📄 响应内容长度:', responseText.length);
        console.log('📄 响应内容前100字符:', responseText.substring(0, 100));

        if (responseText.length === 0) {
          console.error('❌ API返回空响应');
          throw new Error('API返回空响应');
        }

        data = JSON.parse(responseText);
        console.log('✅ JSON解析成功:', data);
      } catch (parseError) {
        console.error('❌ JSON解析失败:', {
          parseError: parseError.message,
          responseStatus: response.status,
          responseText: responseText.substring(0, 200)
        });
        logger.error('JSON解析失败', {
          parseError: parseError.message,
          responseStatus: response.status
        });
        throw new Error(`JSON解析失败: ${parseError.message}`);
      }

      if (!response.ok) {
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('API密钥无效或已过期。请检查API配置。');
        } else {
          // Try to extract meaningful error message
          let errorMessage = '未知错误';
          if (typeof data === 'string') {
            errorMessage = data;
          } else if (data && typeof data === 'object') {
            errorMessage = data.error || data.message || data.detail || JSON.stringify(data);
          }

          throw new Error(`API调用失败 (${response.status}): ${errorMessage}`);
        }
      }

      return data;
    } catch (error) {
      logger.error('视频生成API调用失败', error);
      throw error;
    }
  };

  const handleDownloadVideo = (video: GeneratedVideo) => {
    // Create download link
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `video_${video.id}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logger.info('视频下载', { videoId: video.id });
  };

  const handleDeleteVideo = (videoId: string) => {
    if (confirm('确定要删除这个视频吗？此操作无法撤销。')) {
      // In a real implementation, this would delete from the database
      logger.info('视频删除', { videoId });
      loadVideoHistory();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板');
    }).catch(() => {
      alert('复制失败');
    });
  };

  const handlePlayVideo = (videoId: string) => {
    setPlayingVideoId(playingVideoId === videoId ? null : videoId);
  };

  const selectedConfigInfo = configurations.find(c => c.id === selectedConfig);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Group images by scene for selection
  const imagesByScene = (scenes || []).map(scene => {
    // Images are stored directly in the scene
    let sceneImages = scene.images || [];

    // Ensure all images have proper metadata with sceneId
    sceneImages = sceneImages.map(img => ({
      ...img,
      metadata: {
        ...img.metadata,
        sceneId: img.metadata?.sceneId || scene.id // Ensure sceneId is set
      }
    }));

    return {
      scene,
      images: sceneImages
    };
  }).filter(item => item.images.length > 0);

  // Debug logging
  console.log('Video Generation Debug:', {
    currentProject: currentProject?.name,
    scenesCount: scenes?.length,
    imagesBySceneCount: imagesByScene.length,
    totalImages: imagesByScene.reduce((sum, item) => sum + item.images.length, 0),
    imagesByScene: imagesByScene.map(item => ({
      sceneId: item.scene.id,
      sceneNumber: item.scene.sceneNumber,
      imagesCount: item.images.length,
      hasImages: item.images.length > 0
    }))
  });

  // 获取选中的图片信息
  const getSelectedImages = useCallback(() => {
    const selectedImages: any[] = [];
    imagesByScene.forEach(({ scene, images }) => {
      images.forEach(image => {
        if (selectedImageIds.includes(image.id)) {
          selectedImages.push({ ...image, sceneId: scene.id, scene });
        }
      });
    });
    return selectedImages;
  }, [imagesByScene, selectedImageIds]);

  // 检查特定图片是否有生成的视频
  const hasGeneratedVideoForImage = useCallback((imageId: string) => {
    if (!scenes) {
      console.log(`🔍 [hasGeneratedVideoForImage] No scenes available for imageId: ${imageId}`);
      return false;
    }

    console.log(`🔍 [hasGeneratedVideoForImage] Checking video for imageId: ${imageId} (selectedSceneId: ${selectedSceneId})`);
    console.log(`📋 [hasGeneratedVideoForImage] Available scenes:`, scenes.map(s => ({
      id: s.id,
      sceneNumber: s.sceneNumber,
      generatedVideoCount: s.generatedVideos?.length || 0,
      hasLegacyVideo: !!s.generatedVideo,
      isSelected: s.id === selectedSceneId
    })));

    // 首先检查当前选中的场景
    if (selectedSceneId) {
      const selectedScene = scenes.find(scene => scene.id === selectedSceneId);
      if (selectedScene) {
        console.log(`🎯 [hasGeneratedVideoForImage] Checking selected scene: ${selectedScene.id} (${selectedScene.sceneNumber})`);

        // 检查旧格式的单个视频
        if (selectedScene.generatedVideo) {
          console.log(`📹 [hasGeneratedVideoForImage] Found legacy video in selected scene:`, {
            sourceImageId: selectedScene.generatedVideo.sourceImageId,
            isMatch: selectedScene.generatedVideo.sourceImageId === imageId
          });
          if (selectedScene.generatedVideo.sourceImageId === imageId) {
            console.log(`✅ [hasGeneratedVideoForImage] Found matching legacy video in selected scene for imageId: ${imageId}`);
            return true;
          }
        }

        // 检查新格式的多个视频
        if (selectedScene.generatedVideos && selectedScene.generatedVideos.length > 0) {
          console.log(`🎬 [hasGeneratedVideoForImage] Found ${selectedScene.generatedVideos.length} videos in selected scene`);
          const hasMatch = selectedScene.generatedVideos.some((video, index) => {
            const isMatch = video.sourceImageId === imageId;
            console.log(`📹 [hasGeneratedVideoForImage] Selected scene video ${index}:`, {
              sourceImageId: video.sourceImageId,
              isMatch
            });
            return isMatch;
          });

          if (hasMatch) {
            console.log(`✅ [hasGeneratedVideoForImage] Found matching video in selected scene for imageId: ${imageId}`);
            return true;
          }
        }
      }
    }

    // 如果在选中场景中没有找到，再检查所有场景（向后兼容）
    console.log(`🔄 [hasGeneratedVideoForImage] Checking all scenes for backward compatibility`);
    for (const scene of scenes) {
      // 跳过已经检查过的选中场景
      if (selectedSceneId && scene.id === selectedSceneId) {
        continue;
      }

      console.log(`🏗️ [hasGeneratedVideoForImage] Checking other scene: ${scene.id} (${scene.sceneNumber})`);

      // 检查旧格式的单个视频
      if (scene.generatedVideo) {
        console.log(`📹 [hasGeneratedVideoForImage] Found legacy video in other scene ${scene.id}:`, {
          sourceImageId: scene.generatedVideo.sourceImageId,
          isMatch: scene.generatedVideo.sourceImageId === imageId
        });
        if (scene.generatedVideo.sourceImageId === imageId) {
          console.log(`✅ [hasGeneratedVideoForImage] Found matching legacy video in other scene for imageId: ${imageId}`);
          return true;
        }
      }

      // 检查新格式的多个视频
      if (scene.generatedVideos && scene.generatedVideos.length > 0) {
        console.log(`🎬 [hasGeneratedVideoForImage] Found ${scene.generatedVideos.length} videos in other scene ${scene.id}`);
        const hasMatch = scene.generatedVideos.some((video, index) => {
          const isMatch = video.sourceImageId === imageId;
          console.log(`📹 [hasGeneratedVideoForImage] Other scene video ${index}:`, {
            sourceImageId: video.sourceImageId,
            isMatch
          });
          return isMatch;
        });

        if (hasMatch) {
          console.log(`✅ [hasGeneratedVideoForImage] Found matching video in other scene for imageId: ${imageId}`);
          return true;
        }
      }
    }

    console.log(`❌ [hasGeneratedVideoForImage] No video found for imageId: ${imageId}`);
    return false;
  }, [scenes, selectedSceneId]);

  // 调试：测试我们的调试系统是否工作
  console.log(`🧪 [Debug Test] hasGeneratedVideoForImage function loaded, scenes count: ${scenes?.length || 0}`);

  return (
    <div className={`space-y-apple-lg ${className}`}>
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-sf-pro-display font-semibold text-gray-900 flex items-center space-x-2">
            <Film className="w-6 h-6 text-blue-600" />
            <span>视频生成</span>
          </h2>
          <p className="text-sm font-sf-pro-text text-gray-600 mt-apple-xs">
            选择图片生成动态视频内容
          </p>
        </div>
      </div>

      
      {/* Header Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="glass-card px-apple-md py-apple-sm flex items-center space-x-2 hover:bg-gray-50/50 transition-colors duration-200"
        >
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-sf-pro-text text-gray-700">
            {showAdvanced ? '隐藏设置' : '高级设置'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            showAdvanced ? 'rotate-180' : ''
          }`} />
        </button>
      </div>

      {/* API Configuration */}
      <div className="glass-card border border-gray-200/50 p-apple-lg">
        <h3 className="text-lg font-sf-pro-display font-medium text-gray-900 mb-apple-md">API配置</h3>

        {configLoading && (
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
                  {configError.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {!configLoading && !configError && configurations.length === 0 && (
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

        <div className="space-y-apple-md">
          {/* 模型选择器 */}
          <div>
            <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
              选择AI模型
            </label>
            <ModelSelector
              taskType="video"
              onModelSelect={handleModelSelect}
              selectedModelId={selectedModel?.id}
              disabled={isGenerating}
              showCostAnalysis={true}
              className="mb-4"
            />
          </div>

          <div>
            <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
              API配置
            </label>
            <select
              value={selectedConfig}
              onChange={(e) => {
                setSelectedConfig(e.target.value);
              }}
              disabled={isGenerating}
              className="w-full px-apple-sm py-apple-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">请选择API配置...</option>
              {configurations.map(config => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* 成本分析切换按钮 */}
          {selectedModel && (
            <div className="flex items-center justify-between p-apple-sm bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-sf-pro-text text-blue-800">
                  {selectedModel.name} - ${selectedModel.costPerCall}/次
                </span>
              </div>
              <button
                onClick={() => setShowCostAnalysis(!showCostAnalysis)}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {showCostAnalysis ? '隐藏' : '显示'}成本分析
              </button>
            </div>
          )}

          {showAdvanced && selectedConfigInfo && (
            <div className="space-y-apple-sm">
              <div className="text-sm font-sf-pro-text text-gray-600">
                <span className="font-medium">端点:</span>
                <code className="ml-2 text-xs bg-gray-100 px-apple-sm py-1 rounded">
                  {selectedConfigInfo.endpoint}
                </code>
              </div>
              <div className="text-sm font-sf-pro-text text-gray-600">
                <span className="font-medium">类型:</span>
                <span className="ml-2">{selectedConfigInfo.type}</span>
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

        {!selectedConfig && (
          <div className="mt-apple-md p-apple-sm bg-yellow-50/50 border border-yellow-200/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-sf-pro-text text-yellow-800">
                  请先选择API配置
                </p>
                <p className="text-xs font-sf-pro-text text-yellow-700 mt-1">
                  前往"API配置"页面创建和配置AI服务
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 成本分析面板 */}
      {showCostAnalysis && selectedModel && (
        <div className="glass-card border border-gray-200/50">
          <CostAnalysis
            selectedModel={selectedModel}
            comparisonModels={[]}
            estimatedUsage={{
              videosPerMonth: 50,
              averageLength: generationSettings.duration / 60
            }}
          />
        </div>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="glass-card border border-gray-200/50 p-apple-lg space-y-apple-md">
          <div className="flex items-center justify-between mb-apple-md">
            <h3 className="text-lg font-sf-pro-display font-medium text-gray-900">视频生成设置</h3>
            <VideoPresetManager
              currentSettings={generationSettings}
              onSettingsChange={setGenerationSettings}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-apple-md">
            {/* Duration */}
            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
                视频时长 (秒)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={generationSettings.duration}
                onChange={(e) => setGenerationSettings(prev => ({
                  ...prev,
                  duration: parseInt(e.target.value) || 5
                }))}
                className="w-full px-apple-sm py-apple-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
                视频比例
              </label>
              <select
                value={generationSettings.aspectRatio}
                onChange={(e) => setGenerationSettings(prev => ({
                  ...prev,
                  aspectRatio: e.target.value as any
                }))}
                className="w-full px-apple-sm py-apple-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="16:9">16:9 (横屏)</option>
                <option value="9:16">9:16 (竖屏)</option>
                <option value="1:1">1:1 (正方形)</option>
                <option value="4:3">4:3 (经典)</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
                视频质量
              </label>
              <select
                value={generationSettings.quality}
                onChange={(e) => setGenerationSettings(prev => ({
                  ...prev,
                  quality: e.target.value as any
                }))}
                className="w-full px-apple-sm py-apple-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">标准</option>
                <option value="high">高清</option>
                <option value="ultra">超高清</option>
              </select>
            </div>

            {/* Motion Strength */}
            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
                运动强度
              </label>
              <select
                value={generationSettings.motionStrength}
                onChange={(e) => setGenerationSettings(prev => ({
                  ...prev,
                  motionStrength: e.target.value as any
                }))}
                className="w-full px-apple-sm py-apple-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="subtle">轻微</option>
                <option value="medium">中等</option>
                <option value="strong">强烈</option>
              </select>
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
                视频风格
              </label>
              <select
                value={generationSettings.style}
                onChange={(e) => setGenerationSettings(prev => ({
                  ...prev,
                  style: e.target.value as any
                }))}
                className="w-full px-apple-sm py-apple-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="realistic">写实</option>
                <option value="cinematic">电影</option>
                <option value="artistic">艺术</option>
                <option value="animated">动画</option>
              </select>
            </div>

            {/* FPS */}
            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-xs">
                帧率 (FPS)
              </label>
              <select
                value={generationSettings.fps}
                onChange={(e) => setGenerationSettings(prev => ({
                  ...prev,
                  fps: parseInt(e.target.value)
                }))}
                className="w-full px-apple-sm py-apple-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
            </div>
          </div>

          {/* Prompt Enhancement */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="promptEnhancement"
              checked={generationSettings.promptEnhancement}
              onChange={(e) => setGenerationSettings(prev => ({
                ...prev,
                promptEnhancement: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="promptEnhancement" className="text-sm font-sf-pro-text text-gray-700">
              启用提示词增强 (自动优化视频生成效果)
            </label>
          </div>
        </div>
      )}

      {/* Image Selection */}
      <div className="glass-card border border-gray-200/50 p-apple-lg">
        <h3 className="text-lg font-sf-pro-display font-medium text-gray-900 mb-apple-md">
          选择图片生成视频
        </h3>

        {imagesByScene.length === 0 ? (
          <div className="text-center py-apple-xl">
            <Image className="w-12 h-12 text-gray-300 mx-auto mb-apple-sm" />
            <p className="text-sm font-sf-pro-text text-gray-500 mb-apple-xs">
              还没有生成的图片
            </p>
            <p className="text-xs font-sf-pro-text text-gray-400">
              请先在"图像生成"页面生成图片
            </p>
          </div>
        ) : (
          <div className="space-y-apple-lg">
            {imagesByScene.map(({ scene, images }) => (
              <div key={scene.id} className="border border-gray-200/50 rounded-lg p-apple-md">
                <div className="flex items-center justify-between mb-apple-sm">
                  <div className="flex items-center space-x-2">
                    <Film className="w-4 h-4 text-blue-600" />
                    <h4 className="font-sf-pro-display font-medium text-gray-900">
                      场景 {scene.sceneNumber}: {scene.title}
                    </h4>
                    <span className="text-xs font-sf-pro-text text-gray-500">
                      ({images.length} 张图片)
                    </span>
                    {(scene.generatedVideo || (scene.generatedVideos && scene.generatedVideos.length > 0)) && (
                      <div className="flex items-center space-x-1">
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        </div>
                        {scene.generatedVideos && scene.generatedVideos.length > 1 && (
                          <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-medium">
                            {scene.generatedVideos.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSelectAll(scene.id, images)}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    >
                      全选
                    </button>
                    <button
                      onClick={() => handleClearSelection()}
                      className="text-xs px-2 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      清除
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-apple-sm">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className={`relative group border-2 rounded-lg overflow-hidden transition-all duration-200 ${
                        selectedImageIds.includes(image.id)
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Checkbox for multi-selection */}
                      <div
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageSelect(scene.id, image.id);
                        }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                          selectedImageIds.includes(image.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white border-gray-300 hover:border-blue-400'
                        }`}>
                          {selectedImageIds.includes(image.id) && (
                            <div className="w-2 h-2 bg-white rounded-sm"></div>
                          )}
                        </div>
                      </div>

                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-32 object-contain bg-gray-50 cursor-pointer rounded-sm"
                        onClick={() => handleImageSelect(scene.id, image.id)}
                      />

                      {/* Selection Indicator */}
                      {selectedImageIds.includes(image.id) && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-1">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                      )}

                      {/* Video Completion Indicator */}
                      {hasGeneratedVideoForImage(image.id) && (
                        <div className="absolute top-1 left-1 bg-green-600 text-white rounded-full p-1" title="视频已生成">
                          <Video className="w-3 h-3" />
                        </div>
                      )}

                      {/* Preview Button */}
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImagePreview(image);
                          }}
                          className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-1.5 transition-colors"
                          title="预览图片 (P)"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Image Info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-xs font-sf-pro-text text-white truncate">
                          {image.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-apple-lg flex justify-center">
          <button
            onClick={handleGenerateVideo}
            disabled={selectedImageIds.length === 0 || !selectedConfig || isGenerating}
            className={`px-apple-xl py-apple-md rounded-lg font-sf-pro-text font-medium flex items-center space-x-2 transition-all duration-200 ${
              selectedImageIds.length > 0 && selectedConfig && !isGenerating
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>正在生成视频...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>生成视频 ({selectedImageIds.length}张)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video History */}
      <div className="glass-card border border-gray-200/50 p-apple-lg">
        <div className="flex items-center justify-between mb-apple-md">
          <h3 className="text-lg font-sf-pro-display font-medium text-gray-900">
            视频生成历史
          </h3>
          <button
            onClick={() => checkHistoricalTask('task-unified-1763026390-y23ttfrj')}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            检查当前任务
          </button>
        </div>

        {generationHistory.length === 0 ? (
          <div className="text-center py-apple-xl">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-apple-sm" />
            <p className="text-sm font-sf-pro-text text-gray-500">
              还没有生成的视频
            </p>
            <p className="text-xs font-sf-pro-text text-gray-400">
              选择一张或多张图片并点击"生成视频"开始创建
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-apple-md">
            {generationHistory.map((video, index) => (
              <div
                key={`${video.id}-${video.url}-${index}`}
                className="border border-gray-200/50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                {/* Video Player */}
                <div className="relative aspect-video bg-gray-100">
                  {playingVideoId === video.id ? (
                    <video
                      src={video.url}
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                      onEnded={() => setPlayingVideoId(null)}
                    />
                  ) : (
                    <VideoThumbnail
                      video={video}
                      onPlay={() => handlePlayVideo(video.id)}
                      showControls={true}
                      lazy={true}
                    />
                  )}
                </div>

                {/* Video Info */}
                <div className="p-apple-sm">
                  <h4 className="font-sf-pro-display font-medium text-gray-900 text-sm truncate mb-apple-xs">
                    {video.prompt}
                  </h4>

                  <div className="flex items-center justify-between text-xs font-sf-pro-text text-gray-500 mb-apple-xs">
                    <span>{video.provider}</span>
                    <span>{formatDuration(video.metadata.duration)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-sf-pro-text text-gray-500 mb-apple-xs">
                    <span>{video.metadata.aspectRatio}</span>
                    <span>{formatFileSize(video.metadata.fileSize)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-sf-pro-text text-gray-500 mb-apple-sm">
                    <span>创建时间</span>
                    <span>{video.createdAt.toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDownloadVideo(video)}
                      className="flex-1 px-apple-sm py-apple-xs bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>下载</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(video.url)}
                      className="p-apple-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors duration-200"
                      title="复制链接"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="p-apple-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors duration-200"
                      title="删除视频"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 视频生成进度容器 */}
      {true && (
        <ProgressContainer
          tasks={videoTasks}
          onTaskComplete={handleTaskComplete}
          onTaskFailed={handleTaskFailed}
          onTaskCancel={handleTaskCancel}
          onTaskRetry={handleTaskRetry}
          onTaskView={handleTaskView}
          onTaskDownload={handleTaskDownload}
          onTaskDelete={handleTaskDelete}
          maxTasks={10}
          enableNotifications={true}
        />
      )}

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        image={previewImage}
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
      />
    </div>
  );
};

export default VideoGeneration;