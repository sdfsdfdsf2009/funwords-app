import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  AlertTriangle
} from 'lucide-react';
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

// 子组件定义
import { VideoGenerationControls } from './VideoGenerationControls';
import { VideoGenerationHistory } from './VideoGenerationHistory';
import { VideoGenerationSettings as VideoSettingsPanel } from './VideoGenerationSettings';
import { VideoGenerationProgress } from './VideoGenerationProgress';

interface VideoGenerationProps {
  className?: string;
}

// 性能优化的主组件
export const VideoGenerationOptimized: React.FC<VideoGenerationProps> = memo(({ className = '' }) => {
  // 基础状态
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<GeneratedVideo[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // 任务管理状态
  const [showProgressContainer, setShowProgressContainer] = useState(true);
  const [taskConfigs, setTaskConfigs] = useState<Map<string, any>>(new Map());
  const [taskPollingIntervals, setTaskPollingIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // 生成设置
  const [generationSettings, setGenerationSettings] = useState<VideoGenerationSettings>({
    duration: 5,
    aspectRatio: '16:9',
    quality: 'standard',
    motionStrength: 'medium',
    style: 'realistic',
    fps: 30,
    promptEnhancement: true
  });

  // Store hooks
  const {
    currentProject,
    getSceneSelectedImages,
    isImageSelected,
    addGeneratedVideo
  } = useProjectStore();

  const {
    tasks: videoTasks,
    loadTasks: loadVideoTasks,
    addTask: addVideoTask,
    updateTask: updateVideoTask,
    deleteTask: deleteVideoTask,
    isLoading: isTasksLoading,
    error: tasksError
  } = useVideoTaskStore();

  const { configurations: apiConfigs, isLoading, error: configError, loadConfigurations } = useAPIConfigStore();

  // 计算属性 - 使用useMemo优化
  const scenes = useMemo(() => currentProject?.scenes || [], [currentProject?.scenes]);

  const configurations = useMemo(() => {
    return apiConfigs
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
  }, [apiConfigs]);

  // Initialize configurations on mount
  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  const processingTasks = useMemo(() =>
    videoTasks.filter(task => task.status === 'processing' || task.status === 'pending'),
    [videoTasks]
  );

  // 获取当前选中场景
  const selectedScene = useMemo(() =>
    scenes.find(scene => scene.id === selectedSceneId),
    [scenes, selectedSceneId]
  );

  // 获取当前选中场景的图片
  const selectedSceneImages = useMemo(() =>
    selectedScene ? getSceneSelectedImages(selectedSceneId) : [],
    [selectedScene, selectedSceneId, getSceneSelectedImages]
  );

  // 计算是否可以生成视频
  const canGenerateVideo = useMemo(() => {
    return selectedSceneId &&
           selectedImageIds.length > 0 &&
           selectedConfig &&
           !isGenerating &&
           configurations.some(c => c.id === selectedConfig);
  }, [selectedSceneId, selectedImageIds, selectedConfig, isGenerating, configurations]);

  // 回调函数 - 使用useCallback优化
  const handleSceneSelect = useCallback((sceneId: string) => {
    setSelectedSceneId(sceneId);
    setSelectedImageIds([]);
    setPlayingVideoId(null);
  }, []);

  const handleImageSelect = useCallback((imageId: string, isSelected: boolean) => {
    setSelectedImageIds(prev =>
      isSelected
        ? [...prev, imageId]
        : prev.filter(id => id !== imageId)
    );
  }, []);

  const handleConfigSelect = useCallback((configId: string) => {
    setSelectedConfig(configId);
  }, []);

  const handleSettingsChange = useCallback((newSettings: Partial<VideoGenerationSettings>) => {
    setGenerationSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const handleVideoPlay = useCallback((videoId: string) => {
    setPlayingVideoId(videoId === playingVideoId ? null : videoId);
  }, [playingVideoId]);

  const handleImagePreview = useCallback((image: GeneratedImage) => {
    setPreviewImage(image);
    setIsPreviewModalOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewModalOpen(false);
    setPreviewImage(null);
  }, []);

  // 加载配置
  const loadConfigurations = useCallback(async () => {
    try {
      const configs = await getAllApiConfigs();

      // 配置会在configurations useMemo中自动转换

      // 自动选择第一个配置
      if (configurations.length > 0 && !selectedConfig) {
        setSelectedConfig(configurations[0].id);
      }
    } catch (error) {
      logger.error('Failed to load API configurations:', error);
    }
  }, [getAllApiConfigs, configurations.length, selectedConfig]);

  // 加载视频历史记录
  const loadVideoHistory = useCallback(() => {
    if (!currentProject || !scenes) return;

    const allVideos: GeneratedVideo[] = [];

    scenes.forEach(scene => {
      if (scene.generatedVideos) {
        scene.generatedVideos.forEach(video => {
          allVideos.push({
            ...video,
            sceneId: scene.id,
            sceneName: scene.name
          });
        });
      }
    });

    setGenerationHistory(allVideos.reverse());
  }, [currentProject, scenes]);

  // 生成视频
  const generateVideo = useCallback(async () => {
    if (!canGenerateVideo) return;

    setIsGenerating(true);

    try {
      const scene = scenes.find(s => s.id === selectedSceneId);
      if (!scene) {
        throw new Error('Scene not found');
      }

      const selectedImages = selectedImageIds
        .map(id => scene.generatedImages?.find(img => img.id === id))
        .filter(Boolean) as GeneratedImage[];

      if (selectedImages.length === 0) {
        throw new Error('No valid images selected');
      }

      const apiConfig = configurations.find(c => c.id === selectedConfig);
      if (!apiConfig) {
        throw new Error('API configuration not found');
      }

      // 创建视频任务
      const task = await addVideoTask({
        sceneId: selectedSceneId,
        sceneName: scene.name,
        imageIds: selectedImageIds,
        configId: selectedConfig,
        config: apiConfig,
        settings: generationSettings,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 保存任务配置
      taskConfigs.set(task.id, apiConfig);

      logger.info('Video generation task created:', { taskId: task.id });

    } catch (error) {
      logger.error('Failed to create video generation task:', error);
      // 这里可以显示错误提示
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerateVideo, scenes, selectedSceneId, selectedImageIds, selectedConfig, configurations, generationSettings, addVideoTask, taskConfigs]);

  // 删除视频
  const deleteVideo = useCallback(async (videoId: string, sceneId: string) => {
    try {
      // 从项目状态中删除视频
      const scene = scenes.find(s => s.id === sceneId);
      if (scene && scene.generatedVideos) {
        const updatedVideos = scene.generatedVideos.filter(v => v.id !== videoId);
        // 这里需要更新场景中的视频列表
        logger.info('Video deleted:', { videoId, sceneId });
      }

      // 重新加载历史记录
      loadVideoHistory();

    } catch (error) {
      logger.error('Failed to delete video:', error);
    }
  }, [scenes, loadVideoHistory]);

  // 下载视频
  const downloadVideo = useCallback(async (video: GeneratedVideo) => {
    try {
      const link = document.createElement('a');
      link.href = video.url;
      link.download = `video-${video.id}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logger.info('Video downloaded:', { videoId: video.id });
    } catch (error) {
      logger.error('Failed to download video:', error);
    }
  }, []);

  // 副本视频设置
  const duplicateVideoSettings = useCallback((video: GeneratedVideo) => {
    if (video.settings) {
      setGenerationSettings(video.settings);
      setShowAdvanced(true);
    }
  }, []);

  // 效果hooks
  useEffect(() => {
    logger.debug('初始化开始，从数据库加载视频任务...');
    loadVideoTasks();
  }, [loadVideoTasks]);

  useEffect(() => {
    if (scenes) {
      videoThumbnailManager.updateScenes(scenes);
    }
  }, [scenes]);

  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  useEffect(() => {
    loadVideoHistory();
  }, [loadVideoHistory]);

  // 恢复处理中任务的配置
  useEffect(() => {
    if (processingTasks.length > 0 && configurations.length > 0) {
      processingTasks.forEach(task => {
        if (!taskConfigs.has(task.id)) {
          const apiConfig = configurations.find(c => c.id === selectedConfig);
          if (apiConfig) {
            setTaskConfigs(prev => new Map(prev).set(task.id, apiConfig));
            logger.debug(`为任务 ${task.id} 恢复配置`);
          }
        }
      });
    }
  }, [processingTasks, configurations, selectedConfig, taskConfigs]);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      taskPollingIntervals.forEach(interval => clearInterval(interval));
    };
  }, [taskPollingIntervals]);

  // 渲染主要内容
  return (
    <div className={`video-generation ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 左侧控制面板 */}
        <div className="lg:col-span-2 space-y-6">

          {/* 场景和图片选择 */}
          <VideoGenerationControls
            scenes={scenes}
            selectedSceneId={selectedSceneId}
            selectedImageIds={selectedImageIds}
            configurations={configurations}
            selectedConfig={selectedConfig}
            configLoading={configLoading}
            canGenerateVideo={canGenerateVideo}
            isGenerating={isGenerating}
            generationSettings={generationSettings}
            onSceneSelect={handleSceneSelect}
            onImageSelect={handleImageSelect}
            onConfigSelect={handleConfigSelect}
            onSettingsChange={handleSettingsChange}
            onGenerateVideo={generateVideo}
            onPreviewImage={handleImagePreview}
            selectedSceneImages={selectedSceneImages}
            isImageSelected={isImageSelected}
          />

          {/* 生成历史 */}
          <VideoGenerationHistory
            history={generationHistory}
            playingVideoId={playingVideoId}
            onVideoPlay={handleVideoPlay}
            onVideoDelete={deleteVideo}
            onVideoDownload={downloadVideo}
            onDuplicateSettings={duplicateVideoSettings}
            onPreviewImage={handleImagePreview}
          />

        </div>

        {/* 右侧面板 */}
        <div className="space-y-6">

          {/* 设置面板 */}
          <VideoSettingsPanel
            settings={generationSettings}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            onSettingsChange={handleSettingsChange}
          />

          {/* 进度面板 */}
          {showProgressContainer && (
            <VideoGenerationProgress
              tasks={videoTasks}
              taskConfigs={taskConfigs}
              onTasksChange={() => {}} // 任务变化会通过store自动更新
              onToggleVisibility={() => setShowProgressContainer(!showProgressContainer)}
            />
          )}

        </div>

      </div>

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        isOpen={isPreviewModalOpen}
        image={previewImage}
        onClose={handleClosePreview}
      />

    </div>
  );
});

VideoGenerationOptimized.displayName = 'VideoGenerationOptimized';

export default VideoGenerationOptimized;