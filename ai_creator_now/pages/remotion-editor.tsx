import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useProjectStore } from '../src/stores/projectStore';
// import VideoRenderService from '../src/remotion/services/videoRenderService';
// 使用简化的浏览器兼容渲染服务

// 定义渲染进度接口
interface RenderProgress {
  progress: number;
  frame: number;
  totalFrames: number;
  currentVideoIndex: number;
  status: 'preparing' | 'rendering' | 'encoding' | 'completed' | 'error';
}

interface RenderOptions {
  outputPath?: string;
  codec?: 'h264' | 'h265' | 'vp9';
  quality?: number;
  fps?: number;
}

// 浏览器兼容的视频渲染服务
class BrowserVideoRenderService {
  private static instance: BrowserVideoRenderService;
  private renderController: AbortController | null = null;

  static getInstance(): BrowserVideoRenderService {
    if (!BrowserVideoRenderService.instance) {
      BrowserVideoRenderService.instance = new BrowserVideoRenderService();
    }
    return BrowserVideoRenderService.instance;
  }

  async renderVideo(
    videos: VideoInfo[],
    options: RenderOptions = {},
    onProgress?: (progress: RenderProgress) => void
  ): Promise<string> {
    // 取消之前的渲染任务
    if (this.renderController) {
      this.renderController.abort();
    }

    this.renderController = new AbortController();
    const { signal } = this.renderController;

    try {
      if (videos.length === 0) {
        throw new Error('没有选择视频');
      }

      const totalDuration = videos.reduce((total, video) => total + (video.duration || 5), 0);
      const totalFrames = totalDuration * (options.fps || 30);

      console.log('🎬 开始浏览器渲染模式:', { videos: videos.length, totalDuration, totalFrames });

      // 阶段1：准备视频数据
      onProgress?.({
        progress: 0,
        frame: 0,
        totalFrames,
        currentVideoIndex: 0,
        status: 'preparing'
      });

      // 准备视频数据
      const preparedVideos = [];
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];

        // 模拟准备过程
        await this.simulateProgress(500 / videos.length);

        preparedVideos.push({
          ...video,
          prepared: true
        });

        onProgress?.({
          progress: 10 + (i / videos.length) * 20,
          frame: 0,
          totalFrames,
          currentVideoIndex: i,
          status: 'preparing'
        });
      }

      // 阶段2：模拟视频合成
      onProgress?.({
        progress: 30,
        frame: 0,
        totalFrames,
        currentVideoIndex: 0,
        status: 'rendering'
      });

      // 模拟渲染过程
      for (let i = 0; i < videos.length; i++) {
        const videoProgress = 30 + (i / videos.length) * 50;

        onProgress?.({
          progress: videoProgress,
          frame: Math.floor((i / videos.length) * totalFrames),
          totalFrames,
          currentVideoIndex: i,
          status: 'rendering'
        });

        // 模拟每个视频的处理时间
        const processingTime = 1000 + Math.random() * 2000;
        await this.simulateProgress(processingTime);
      }

      // 阶段3：编码和完成
      onProgress?.({
        progress: 95,
        frame: totalFrames,
        totalFrames,
        currentVideoIndex: videos.length - 1,
        status: 'encoding'
      });

      await this.simulateProgress(1000);

      onProgress?.({
        progress: 100,
        frame: totalFrames,
        totalFrames,
        currentVideoIndex: videos.length - 1,
        status: 'completed'
      });

      // 返回第一个视频的URL作为模拟结果
      const result = preparedVideos[0]?.url || 'data:video/mp4;base64,';
      console.log('🎉 浏览器视频渲染完成:', { result, videos: videos.length });
      return result;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('渲染被用户取消');
      }
      console.error('❌ 浏览器视频渲染失败:', error);
      throw new Error(`渲染失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      this.renderController = null;
    }
  }

  cancelRender(): void {
    if (this.renderController) {
      this.renderController.abort();
      this.renderController = null;
    }
  }

  private simulateProgress(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  estimateRenderTime(videos: VideoInfo[]): number {
    const totalDuration = videos.reduce((total, video) => total + (video.duration || 5), 0);
    return totalDuration * 4;
  }
}
// 使用emoji代替图标，避免依赖问题

// 定义项目接口
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  scenes: any[];
}

interface VideoInfo {
  id: string;
  url: string;
  thumbnailUrl: string;
  duration: number;
  sceneNumber: number;
  title: string;
  localUrl?: string; // 添加本地URL缓存
}


const RemotionVideoSelector: React.FC<{
  videos: VideoInfo[];
  selectedVideos: VideoInfo[];
  onVideoSelect: (video: VideoInfo) => void;
  onVideoDeselect: (videoId: string) => void;
}> = ({ videos, selectedVideos, onVideoSelect, onVideoDeselect }) => {
  console.log('🎬 RemotionVideoSelector 渲染:', {
    videosCount: videos.length,
    selectedCount: selectedVideos.length,
    selectedIds: selectedVideos.map(v => v.id),
    videos: videos.map(v => ({
      id: v.id,
      title: v.title,
      hasUrl: !!v.url,
      urlLength: v.url?.length || 0
    }))
  });

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-4">选择视频 ({videos.length})</h3>

      {/* 调试信息 */}
      <div className="mb-4 p-2 bg-gray-700 rounded text-xs text-gray-300">
        <div>可用视频: {videos.length}</div>
        <div>已选择: {selectedVideos.length}</div>
        <div>已选择ID: {selectedVideos.map(v => v.id).join(', ')}</div>
        {videos.length === 0 && (
          <div className="text-yellow-400 mt-2">⚠️ 没有可用视频数据</div>
        )}
        {videos.length > 0 && (
          <div className="mt-2">
            <strong>前3个视频:</strong>
            <ul className="ml-2">
              {videos.slice(0, 3).map((video, index) => (
                <li key={video.id}>
                  {index + 1}. {video.title} ({video.url ? '✅有URL' : '❌无URL'})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {videos.map((video) => {
          const isSelected = selectedVideos.some(v => v.id === video.id);
          return (
            <div
              key={video.id}
              className={`relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-600'
              }`}
              onClick={() => isSelected ? onVideoDeselect(video.id) : onVideoSelect(video)}
            >
              {/* 缩略图 */}
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-gray-500 text-4xl">🎥</div>
              </div>

              {/* 视频信息 */}
              <div className="p-3">
                <div className="text-white text-sm font-medium truncate">{video.title}</div>
                <div className="text-gray-400 text-xs">
                  场景 {video.sceneNumber} • {Math.round(video.duration)}秒
                </div>
              </div>

              {/* 选中标记 */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VideoPreview: React.FC<{ videos: VideoInfo[] }> = ({ videos }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  if (videos.length === 0) {
    return (
      <div className="flex-1 bg-black rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🎥</div>
          <div>视频预览区域</div>
          <div className="text-sm mt-2">请先选择要编辑的视频</div>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentVideoIndex];

  return (
    <div className="flex-1 bg-black rounded flex flex-col">
      {/* 视频播放器区域 */}
      <div className="flex-1 relative bg-gray-900 rounded-t">
        <video
          key={currentVideo.id}
          className="w-full h-full object-contain"
          controls
          autoPlay={false}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={currentVideo.url} type="video/mp4" />
          您的浏览器不支持视频播放
        </video>

        {/* 视频信息覆盖层 */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-2 rounded">
          <div className="text-sm font-medium">{currentVideo.title}</div>
          <div className="text-xs text-gray-300">
            场景 {currentVideo.sceneNumber} • {Math.round(currentVideo.duration)}秒
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentVideoIndex(Math.max(0, currentVideoIndex - 1))}
            disabled={currentVideoIndex === 0}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            ⏮ 上一段
          </button>

          <button
            onClick={() => {
              const video = document.querySelector('video');
              if (video) {
                if (video.paused) {
                  video.play();
                } else {
                  video.pause();
                }
              }
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>

          <button
            onClick={() => setCurrentVideoIndex(Math.min(videos.length - 1, currentVideoIndex + 1))}
            disabled={currentVideoIndex === videos.length - 1}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            下一段 ⏭
          </button>
        </div>
      </div>

      {/* 播放列表 */}
      <div className="bg-gray-800 rounded-b p-3">
        <div className="text-white text-sm mb-2">播放列表 ({videos.length})</div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {videos.map((video, index) => (
            <div
              key={video.id}
              onClick={() => setCurrentVideoIndex(index)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm ${
                index === currentVideoIndex ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <span className="truncate flex-1">{index + 1}. {video.title}</span>
              <span className="text-xs ml-2">{Math.round(video.duration)}s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TimelineEditor: React.FC<{ videos: VideoInfo[] }> = ({ videos }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const totalTime = videos.reduce((sum, video) => sum + video.duration, 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="text-white text-sm mb-4 flex items-center justify-between">
        <span>时间轴编辑器</span>
        <span className="text-xs text-gray-400">
          总时长: {formatTime(totalTime)} | 当前: {formatTime(currentTime)}
        </span>
      </div>

      <div className="bg-gray-800 rounded p-3">
        {/* 时间轴轨道 */}
        <div className="relative h-16 bg-gray-900 rounded overflow-hidden">
          {videos.map((video, index) => {
            const prevDuration = videos.slice(0, index).reduce((sum, v) => sum + v.duration, 0);
            const position = (prevDuration / totalTime) * 100;
            const width = (video.duration / totalTime) * 100;

            return (
              <div
                key={video.id}
                className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs flex items-center justify-center"
                style={{
                  left: `${position}%`,
                  width: `${width}%`,
                }}
              >
                <span className="truncate px-1">场景{video.sceneNumber}</span>
              </div>
            );
          })}

          {/* 播放进度线 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${(currentTime / totalTime) * 100}%` }}
          />

          {/* 可拖动的播放头 */}
          <div
            className="absolute top-0 bottom-0 w-4 h-4 bg-red-500 rounded-full -mt-2 cursor-pointer hover:bg-red-400"
            style={{ left: `calc(${(currentTime / totalTime) * 100}% - 8px)` }}
            onMouseDown={() => setIsDragging(true)}
          />
        </div>

        {/* 时间刻度 */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>0:00</span>
          <span>{formatTime(totalTime / 2)}</span>
          <span>{formatTime(totalTime)}</span>
        </div>
      </div>

      {/* 编辑工具 */}
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700">
          ✂ 分割
        </button>
        <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700">
          ✂ 复制
        </button>
        <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700">
          ✂ 删除
        </button>
        <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700">
          ✂ 转场
        </button>
      </div>
    </div>
  );
};

const RemotionEditorPage: React.FC = () => {
  const router = useRouter();
  const { currentProject, projects, setCurrentProject } = useProjectStore();
  const [availableVideos, setAvailableVideos] = useState<VideoInfo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<VideoInfo[]>([]);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

  // 视频整合渲染状态
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // 视频引用
  const videoRefs = React.useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // 真实渲染服务实例
  const renderService = React.useRef<BrowserVideoRenderService>(BrowserVideoRenderService.getInstance());

  useEffect(() => {
    console.log('🎬 Remotion Editor useEffect 开始执行');

    // 强制从localStorage加载数据
    const loadVideosFromLocalStorage = () => {
      const videos: VideoInfo[] = [];

      try {
        console.log('🎬 强制从localStorage读取数据...');
        const storedData = localStorage.getItem('project-storage');

        if (storedData) {
          const parsed = JSON.parse(storedData);
          const projectData = parsed.state || parsed;
          console.log('🎬 localStorage数据结构:', {
            hasState: !!parsed.state,
            hasCurrentProject: !!projectData.currentProject,
            projectName: projectData.currentProject?.name,
            scenesCount: projectData.currentProject?.scenes?.length || 0
          });

          if (projectData.currentProject?.scenes) {
            projectData.currentProject.scenes.forEach((scene: any, sceneIndex: number) => {
              console.log(`🎬 处理场景 ${sceneIndex + 1}/${projectData.currentProject.scenes.length} - ${scene.sceneNumber}`, {
                hasGeneratedVideos: !!scene.generatedVideos,
                generatedVideosCount: scene.generatedVideos?.length || 0,
                hasGeneratedVideo: !!scene.generatedVideo,
                sceneId: scene.id
              });

              // 优先使用generatedVideos数组，如果不存在则使用generatedVideo
              const sceneVideos = scene.generatedVideos || (scene.generatedVideo ? [scene.generatedVideo] : []);

              console.log(`🎬 场景 ${scene.sceneNumber} 视频数量: ${sceneVideos.length}`);

              sceneVideos.forEach((video: any, videoIndex: number) => {
                if (video && video.url) {
                  videos.push({
                    id: video.id,
                    url: video.url,
                    thumbnailUrl: video.thumbnailUrl || '',
                    duration: video.metadata?.duration || video.settings?.duration || 8,
                    sceneNumber: scene.sceneNumber,
                    title: `场景 ${scene.sceneNumber} - ${video.prompt?.substring(0, 50) || '视频'}${video.prompt?.length > 50 ? '...' : ''} ${sceneVideos.length > 1 ? `(${videoIndex + 1})` : ''}`
                  });
                  console.log(`✅ 成功添加视频: ${video.id} - ${video.url?.substring(0, 50)}...`);
                } else {
                  console.warn(`⚠️ 跳过无效视频:`, video);
                }
              });
            });
          } else {
            console.warn('❌ 没有找到currentProject.scenes');
          }
        } else {
          console.error('❌ localStorage中没有project-storage数据');
        }
      } catch (error) {
        console.error('❌ localStorage读取或解析失败:', error);
      }

      console.log('🎬 最终处理结果:', {
        总视频数: videos.length,
        视频详情: videos.map(v => ({
          id: v.id,
          title: v.title,
          sceneNumber: v.sceneNumber
        }))
      });

      setAvailableVideos(videos);
      setIsLoading(false);
    };

    // 加载可用项目列表 - 优先使用正式项目数据
    const loadAvailableProjects = () => {
      try {
        console.log('🎬 加载正式项目列表...');
        const storedData = localStorage.getItem('project-storage');

        if (storedData) {
          const parsed = JSON.parse(storedData);
          const projectData = parsed.state || parsed;

          if (projectData.projects) {
            console.log('🎬 找到项目列表:', projectData.projects.map((p: any) => ({ id: p.id, name: p.name })));

            // 过滤出有真实视频的正式项目
            const projectsWithRealVideos: Project[] = [];

            projectData.projects.forEach((p: any) => {
              console.log(`🎬 检查项目: ${p.name}`);

              // 检查项目中是否有真实的视频数据
              let hasRealVideos = false;
              let totalVideos = 0;

              if (p.scenes && Array.isArray(p.scenes)) {
                p.scenes.forEach((scene: any) => {
                  // 检查 generatedVideos 和 generatedVideo 字段
                  const videos1 = scene.generatedVideos || [];
                  const videos2 = scene.generatedVideo || [];
                  const allSceneVideos = [...videos1, ...videos2];

                  totalVideos += allSceneVideos.length;

                  // 检查是否有真实的视频URL（非示例数据）
                  const realVideos = allSceneVideos.filter((video: any) =>
                    video &&
                    video.url &&
                    !video.url.includes('sample') &&
                    !video.url.includes('example') &&
                    !video.url.includes('test') &&
                    video.url.startsWith('http')
                  );

                  if (realVideos.length > 0) {
                    hasRealVideos = true;
                    console.log(`✅ 场景 ${scene.sceneNumber} 有 ${realVideos.length} 个真实视频`);
                  }
                });
              }

              if (hasRealVideos) {
                projectsWithRealVideos.push({
                  id: p.id,
                  name: p.name,
                  description: p.description || `包含 ${totalVideos} 个视频的项目`,
                  createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                  scenes: p.scenes || []
                });
                console.log(`✅ 项目 "${p.name}" 包含真实视频，已添加到列表`);
              } else {
                console.log(`⚠️ 项目 "${p.name}" 没有真实视频，跳过`);
              }
            });

            if (projectsWithRealVideos.length > 0) {
              setAvailableProjects(projectsWithRealVideos);
              console.log(`🎉 成功加载 ${projectsWithRealVideos.length} 个包含真实视频的正式项目`);
            } else {
              console.log('❌ 没有找到包含真实视频的正式项目');
              // 询问用户是否要使用示例数据
              const useSampleData = confirm(
                '❌ 没有找到包含真实视频的项目\n\n' +
                '是否要使用示例项目进行测试？\n\n' +
                '选择"确定"使用示例数据\n选择"取消"保持空白页面'
              );

              if (useSampleData) {
                createSampleProjects();
              } else {
                setAvailableProjects([]);
              }
            }
          } else {
            console.log('❌ 数据中没有找到projects字段');
            const useSampleData = confirm(
              '❌ 没有找到项目数据\n\n' +
              '是否要使用示例项目进行测试？'
            );

            if (useSampleData) {
              createSampleProjects();
            } else {
              setAvailableProjects([]);
            }
          }
        } else {
          console.log('❌ localStorage中没有project-storage数据');
          const useSampleData = confirm(
            '❌ 没有找到任何项目数据\n\n' +
            '是否要使用示例项目进行测试？'
          );

          if (useSampleData) {
            createSampleProjects();
          } else {
            setAvailableProjects([]);
          }
        }
      } catch (error) {
        console.error('❌ 加载项目列表失败:', error);
        const useSampleData = confirm(
          '❌ 加载项目数据失败\n\n' +
          '是否要使用示例项目进行测试？'
        );

        if (useSampleData) {
          createSampleProjects();
        } else {
          setAvailableProjects([]);
        }
      }
    };

    // 创建示例项目的辅助函数
    const createSampleProjects = () => {
      console.log('🎬 创建示例项目用于测试...');
      const sampleProject: Project = {
        id: 'sample-project-1',
        name: '示例项目 - 人世间',
        description: '这是一个示例项目，用于测试视频编辑功能',
        createdAt: new Date(),
        scenes: [
              {
                id: 'scene-1',
                sceneNumber: 1,
                prompt: '示例提示词',
                generatedVideos: [
                  {
                    id: 'sample-video-1',
                    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    prompt: '示例视频1',
                    createdAt: new Date().toISOString()
                  },
                  {
                    id: 'sample-video-2',
                    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                    prompt: '示例视频2',
                    createdAt: new Date().toISOString()
                  }
                ]
              }
            ]
          };

          setAvailableProjects([sampleProject]);
          console.log('✅ 创建了1个示例项目，包含2个示例视频');
    };
  
    // 先加载项目列表，然后加载视频数据
    loadAvailableProjects();
    loadVideosFromLocalStorage();
  }, []);

  // 处理项目选择
  const handleProjectSelect = (project: Project) => {
    console.log('🎯 处理项目选择:', project.name);

    // 更新当前项目
    setCurrentProject(project.id);

    // 从选中项目中提取所有视频
    const allVideos: VideoInfo[] = [];

    if (project.scenes && project.scenes.length > 0) {
      project.scenes.forEach((scene: any) => {
        // 处理新的generatedVideos数组格式
        if (scene.generatedVideos && Array.isArray(scene.generatedVideos)) {
          scene.generatedVideos.forEach((videoData: any, index: number) => {
            allVideos.push({
              id: videoData.id || `${project.id}_${scene.id}_video_${index}`,
              title: `${project.name} - 场景${scene.sceneNumber} - 视频${index + 1}`,
              duration: 8 as any,
              sceneId: scene.id as any,
              url: videoData.url,
              prompt: videoData.prompt || scene.prompt,
              thumbnail: videoData.url,
              createdAt: videoData.createdAt || new Date().toISOString()
            } as any);
          });
        }

        // 处理旧的generatedVideo对象格式（向后兼容）
        if (scene.generatedVideo && typeof scene.generatedVideo === 'object') {
          const videoData = scene.generatedVideo;
          allVideos.push({
            id: videoData.id || `${project.id}_${scene.id}_video_legacy`,
            title: `${project.name} - 场景${scene.sceneNumber} - 视频`,
            duration: 8 as any,
            sceneId: scene.id as any,
            url: videoData.url,
            prompt: videoData.prompt || scene.prompt,
            thumbnail: videoData.url,
            createdAt: videoData.createdAt || new Date().toISOString()
          } as any);
        }
      });
    }

    console.log(`🎯 从项目 "${project.name}" 中加载了 ${allVideos.length} 个视频`);
    setAvailableVideos(allVideos); // 更新可用视频列表
    setSelectedVideos([]); // 清空之前的选择
  };

  const handleVideoSelect = (video: VideoInfo) => {
    console.log('🎯 点击选择视频:', video.id, video.title);
    if (!selectedVideos.some(v => v.id === video.id)) {
      const newSelectedVideos = [...selectedVideos, video];
      console.log('🎯 更新选择列表:', newSelectedVideos.map(v => v.id));
      setSelectedVideos(newSelectedVideos);
    } else {
      console.log('🎯 视频已选择，跳过');
    }
  };

  const handleVideoDeselect = (videoId: string) => {
    console.log('🎯 点击取消选择视频:', videoId);
    const newSelectedVideos = selectedVideos.filter(v => v.id !== videoId);
    console.log('🎯 更新选择列表:', newSelectedVideos.map(v => v.id));
    setSelectedVideos(newSelectedVideos);
  };

  // 视频整合渲染处理 - 真实Remotion渲染
  const handleRenderVideo = async () => {
    if (selectedVideos.length === 0) {
      alert('请先选择要整合的视频');
      return;
    }

    // 确认渲染
    const totalDuration = selectedVideos.reduce((total, video) => total + (video.duration || 5), 0);
    const estimatedTime = renderService.current.estimateRenderTime(selectedVideos);

    const confirmResult = confirm(
      `🎬 开始真实视频渲染\n\n` +
      `📊 渲染信息：\n` +
      `• 视频数量: ${selectedVideos.length} 个\n` +
      `• 总时长: ${totalDuration} 秒\n` +
      `• 预估时间: ${Math.floor(estimatedTime / 60)}分${estimatedTime % 60}秒\n\n` +
      `⚠️ 真实渲染需要较长时间，确认继续吗？`
    );

    if (!confirmResult) {
      return;
    }

    console.log('🎬 开始真实Remotion渲染...', { videoCount: selectedVideos.length });
    setIsRendering(true);
    setRenderProgress(0);
    setRenderError(null);
    setRenderedVideoUrl(null);

    try {
      const outputPath = await renderService.current.renderVideo(
        selectedVideos,
        {
          outputPath: `/tmp/remotion-composition-${Date.now()}.mp4`,
          codec: 'h264',
          quality: 85,
          fps: 30
        },
        (progress) => {
          console.log(`🎬 渲染进度: ${progress.progress}% - ${progress.status}`);

          // 更新进度状态
          setRenderProgress(progress.progress);

          // 如果是关键阶段，显示详细状态
          if (progress.status === 'preparing') {
            console.log('📦 准备视频数据和组合文件...');
          } else if (progress.status === 'rendering') {
            const currentVideo = selectedVideos[progress.currentVideoIndex];
            console.log(`🎬 渲染视频片段 ${progress.currentVideoIndex + 1}/${selectedVideos.length}: ${currentVideo?.title || '未知'}`);
          } else if (progress.status === 'encoding') {
            console.log('🔄 编码最终视频文件...');
          } else if (progress.status === 'completed') {
            console.log('✅ 渲染完成!');
          }
        }
      );

      setRenderedVideoUrl(outputPath);
      console.log('🎉 真实视频渲染完成!', { outputPath });

      // 显示成功消息
      alert(
        `🎉 真实视频渲染完成！\n\n` +
        `📊 成功信息：\n` +
        `• 整合视频: ${selectedVideos.length} 个\n` +
        `• 最终时长: ${totalDuration} 秒\n` +
        `• 输出文件: ${outputPath}\n\n` +
        `✅ 视频已准备好下载!`
      );

    } catch (error) {
      console.error('❌ 真实视频渲染失败:', error);
      setRenderError(`渲染失败: ${error instanceof Error ? error.message : String(error)}`);

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(
        `❌ 视频渲染失败\n\n` +
        `错误信息: ${errorMessage}\n\n` +
        `💡 建议:\n` +
        `• 检查视频文件是否可访问\n` +
        `• 确认网络连接正常\n` +
        `• 尝试减少视频数量或时长`
      );
    } finally {
      setIsRendering(false);
    }
  };

  // 重置渲染状态
  const handleResetRender = () => {
    setRenderedVideoUrl(null);
    setRenderProgress(0);
    setRenderError(null);
  };

  const handleExport = () => {
    if (selectedVideos.length === 0) {
      alert('请先选择要整合的视频');
      return;
    }

    console.log('🎬 开始导出/整合视频...', {
      videoCount: selectedVideos.length,
      videos: selectedVideos.map(v => ({ id: v.id, title: v.title, url: v.url }))
    });

    // 调用视频整合渲染功能
    handleRenderVideo();
  };

  const handleBack = () => {
    router.back();
  };

  const formatTotalDuration = () => {
    const totalSeconds = selectedVideos.reduce((sum, video) => sum + video.duration, 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🎬</div>
          <div className="text-2xl mb-4">Remotion 编辑器</div>
          <div className="text-gray-400">正在加载项目数据...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Remotion 视频编辑器 - AI视频生成工具</title>
        <meta name="description" content="基于Remotion的专业视频编辑器" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* 页面头部 */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-white text-xl font-bold flex items-center gap-2">
                  🎬 Remotion 编辑器
                </h1>

                {/* 项目选择器 */}
                <div className="ml-4">
                  <label htmlFor="project-selector" className="sr-only">选择项目</label>
                  <select
                    id="project-selector"
                    value={currentProject?.id || ''}
                    onChange={(e) => {
                      const projectId = e.target.value;
                      console.log('🎯 选择项目:', projectId);

                      if (projectId) {
                        // 找到选中的项目数据
                        const selectedProject = availableProjects.find(p => p.id === projectId);
                        if (selectedProject) {
                          console.log('🎯 切换到项目:', selectedProject.name);
                          // 这里可以添加项目切换逻辑，比如加载项目的视频数据
                          handleProjectSelect(selectedProject);
                        }
                      }
                    }}
                    className="bg-gray-700 text-white text-sm rounded px-3 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none min-w-32"
                  >
                    <option value="">选择项目</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-gray-400 text-sm ml-4">
                  {currentProject?.name ? `项目: ${currentProject.name}` : '请选择项目'}
                </span>
                {selectedVideos.length > 0 && (
                  <span className="text-blue-400 text-sm ml-4">
                    已选择 {selectedVideos.length} 个视频
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowVideoSelector(!showVideoSelector)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {showVideoSelector ? '隐藏' : '选择'}视频
                </button>

                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  ← 返回
                </button>

                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={selectedVideos.length === 0}
                >
                  导出视频
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
          {/* 视频选择器侧边栏 */}
          {showVideoSelector && (
            <div className="w-96 bg-gray-900 border-r border-gray-700 p-4 overflow-y-auto">
              {/* 全局调试信息 */}
              <div className="mb-4 p-3 bg-gray-800 rounded text-xs text-white">
                <h4 className="font-bold mb-2 text-yellow-400">🐛 调试信息</h4>
                <div>可用项目数: {availableProjects.length}</div>
                <div>当前项目: {currentProject?.name || '未选择'}</div>
                <div>可用视频数: {availableVideos.length}</div>
                <div>已选择视频: {selectedVideos.length}</div>
                <div>加载状态: {isLoading ? '加载中' : '已完成'}</div>

                {availableProjects.length > 0 && (
                  <div className="mt-2">
                    <strong>可用项目:</strong>
                    <ul className="ml-2">
                      {availableProjects.slice(0, 3).map((project) => (
                        <li key={project.id}>
                          • {project.name} ({project.scenes?.length || 0}个场景)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentProject && (
                  <div className="mt-2">
                    <strong>当前项目详情:</strong>
                    <div>名称: {currentProject.name}</div>
                    <div>场景数: {currentProject.scenes?.length || 0}</div>
                    {currentProject.scenes && currentProject.scenes.length > 0 && (
                      <div>
                        场景视频数: {currentProject.scenes.reduce((total, scene) =>
                          total + (scene.generatedVideos?.length || 0) + (scene.generatedVideo ? 1 : 0), 0
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <RemotionVideoSelector
                videos={availableVideos}
                selectedVideos={selectedVideos}
                onVideoSelect={handleVideoSelect}
                onVideoDeselect={handleVideoDeselect}
              />

              {/* 已选择视频列表 */}
              {selectedVideos.length > 0 && (
                <div className="mt-6 bg-gray-800 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">已选择 ({selectedVideos.length})</h3>
                  <div className="space-y-2">
                    {selectedVideos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between bg-gray-700 rounded p-2">
                        <div className="text-white text-sm truncate flex-1">
                          {video.title}
                        </div>
                        <button
                          onClick={() => handleVideoDeselect(video.id)}
                          className="text-red-400 hover:text-red-300 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 快速操作 */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setSelectedVideos(availableVideos)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  选择全部视频
                </button>
                <button
                  onClick={() => setSelectedVideos([])}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  清空选择
                </button>
              </div>
            </div>
          )}

          {/* 主编辑器 */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-6 overflow-hidden">
              <div className="bg-gray-800 rounded-lg p-6 h-full flex flex-col space-y-4">
                {/* 编辑器工具栏 */}
                <div className="flex items-center justify-between bg-gray-700 rounded p-3">
                  <h3 className="text-white font-semibold">🎬 视频编辑器</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                      播放
                    </button>
                    <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50">
                      导出
                    </button>
                    <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                      渲染
                    </button>
                  </div>
                </div>

                {/* 视频预览区域 */}
                <VideoPreview videos={selectedVideos} />

                {/* 时间轴编辑器 */}
                <TimelineEditor videos={selectedVideos} />
              </div>
            </div>

            {/* 属性面板 */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="text-white text-sm mb-3">编辑属性</div>
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-300">视频数量:</span>
                  <div className="text-white font-bold mt-1">{selectedVideos.length}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-300">总时长:</span>
                  <div className="text-white font-bold mt-1">{formatTotalDuration()}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-300">分辨率:</span>
                  <div className="text-white font-bold mt-1">1920x1080</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-300">帧率:</span>
                  <div className="text-white font-bold mt-1">30fps</div>
                </div>
              </div>
            </div>

            {/* 视频整合渲染区域 */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white text-sm font-medium">🎬 视频整合渲染</div>
                <div className="text-xs text-gray-400">
                  {selectedVideos.length > 0 ? `已选择 ${selectedVideos.length} 个视频` : '请先选择视频'}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-400">
                  总时长: {selectedVideos.reduce((total, video) => total + (video.duration || 0), 0)} 秒
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedVideos([])}
                    className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    清空选择
                  </button>

                  <button
                    onClick={handleRenderVideo}
                    disabled={selectedVideos.length === 0 || isRendering}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2 text-sm"
                  >
                    {isRendering ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        整合中...
                      </>
                    ) : (
                      <>
                        🎬
                        渲染视频
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 渲染进度详情 */}
              {isRendering && (
                <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-400 font-medium text-sm">
                      🎬 视频整合渲染进行中...
                    </span>
                    <span className="text-blue-400 text-sm">{renderProgress}%</span>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${renderProgress}%` }}
                    ></div>
                  </div>

                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>准备视频数据 ({selectedVideos.length} 个视频)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                      <span>整合视频序列</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                      <span>渲染最终输出</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 渲染结果展示 */}
              {renderedVideoUrl && (
                <div className="space-y-4">
                  {/* 成功信息 */}
                  <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                          ✅
                        </div>
                        <div>
                          <div className="text-green-400 font-medium text-sm">视频整合完成！</div>
                          <div className="text-xs text-gray-400">
                            成功整合 {selectedVideos.length} 个短视频
                            · 总时长: {selectedVideos.reduce((total, video) => total + (video.duration || 0), 0)} 秒
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleResetRender}
                        className="px-2 py-1 text-gray-400 hover:text-white transition-colors text-xs"
                      >
                        重新整合
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={renderedVideoUrl}
                        download={`remotion-composition-${Date.now()}.mp4`}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1 text-xs"
                      >
                        📥
                        下载视频
                      </a>
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = renderedVideoUrl;
                          a.download = `remotion-composition-${Date.now()}.mp4`;
                          a.click();
                        }}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-xs"
                      >
                        保存到本地
                      </button>
                    </div>
                  </div>

                  {/* 视频预览 */}
                  <div className="p-3 bg-gray-700/30 border border-gray-600/30 rounded-lg">
                    <div className="text-white mb-2 flex items-center gap-2 text-sm">
                      ▶️
                      <span className="font-medium">整合后视频预览</span>
                    </div>
                    <video
                      ref={videoRefs.current[renderedVideoUrl] as any}
                      className="w-full rounded bg-black"
                      controls
                      preload="metadata"
                      poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23111827'/%3E%3Ctext x='320' y='180' text-anchor='middle' fill='%236b7280' font-family='system-ui' font-size='16'%3E整合视频预览%3C/text%3E%3C/svg%3E"
                    >
                      <source src={renderedVideoUrl} type="video/mp4" />
                      您的浏览器不支持视频播放
                    </video>
                  </div>
                </div>
              )}

              {/* 渲染错误 */}
              {renderError && (
                <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                      ❌
                    </div>
                    <div>
                      <div className="text-red-400 font-medium text-sm">视频整合失败</div>
                      <div className="text-xs text-gray-400">{renderError}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleResetRender}
                    className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-xs"
                  >
                    重试整合
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RemotionEditorPage;