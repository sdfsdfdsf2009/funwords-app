import React, { memo } from 'react';
import { Video, Image, Settings, Play, AlertCircle } from 'lucide-react';
import { GeneratedImage, Scene, VideoGenerationSettings } from '../../types';

interface VideoGenerationControlsProps {
  scenes: Scene[];
  selectedSceneId: string;
  selectedImageIds: string[];
  configurations: any[];
  selectedConfig: string;
  configLoading: boolean;
  canGenerateVideo: boolean;
  isGenerating: boolean;
  generationSettings: VideoGenerationSettings;
  onSceneSelect: (sceneId: string) => void;
  onImageSelect: (imageId: string, isSelected: boolean) => void;
  onConfigSelect: (configId: string) => void;
  onSettingsChange: (settings: Partial<VideoGenerationSettings>) => void;
  onGenerateVideo: () => void;
  onPreviewImage: (image: GeneratedImage) => void;
  selectedSceneImages: GeneratedImage[];
  isImageSelected: (sceneId: string, imageId: string) => boolean;
}

export const VideoGenerationControls: React.FC<VideoGenerationControlsProps> = memo(({
  scenes,
  selectedSceneId,
  selectedImageIds,
  configurations,
  selectedConfig,
  configLoading,
  canGenerateVideo,
  isGenerating,
  generationSettings,
  onSceneSelect,
  onImageSelect,
  onConfigSelect,
  onSettingsChange,
  onGenerateVideo,
  onPreviewImage,
  selectedSceneImages,
  isImageSelected
}) => {
  return (
    <div className="space-y-4">

      {/* 场景选择 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Video className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium">选择场景</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenes.map(scene => (
            <div
              key={scene.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedSceneId === scene.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onSceneSelect(scene.id)}
            >
              <div className="font-medium text-sm">{scene.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {scene.generatedImages?.length || 0} 张图片
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 图片选择 */}
      {selectedSceneId && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Image className="w-5 h-5 text-green-500" />
            <h3 className="font-medium">选择图片</h3>
            <span className="text-sm text-gray-500">
              ({selectedImageIds.length} 已选择)
            </span>
          </div>

          {selectedSceneImages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>该场景还没有生成的图片</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {selectedSceneImages.map(image => (
                <div
                  key={image.id}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIds.includes(image.id)
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onImageSelect(image.id, !selectedImageIds.includes(image.id))}
                >
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-24 object-cover"
                  />

                  {/* 选择标记 */}
                  {selectedImageIds.includes(image.id) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* 预览按钮 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewImage(image);
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 px-2 py-1 rounded text-xs transition-opacity"
                    >
                      预览
                    </button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs truncate">{image.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API配置选择 */}
      {selectedImageIds.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-purple-500" />
            <h3 className="font-medium">API配置</h3>
          </div>

          {configLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-500 mt-2">加载配置中...</p>
            </div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>没有可用的API配置</p>
            </div>
          ) : (
            <div className="space-y-2">
              {configurations.map(config => (
                <label
                  key={config.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedConfig === config.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="config"
                    value={config.id}
                    checked={selectedConfig === config.id}
                    onChange={() => onConfigSelect(config.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{config.name}</div>
                    <div className="text-sm text-gray-500">
                      模型: {config.requestParams.model}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    config.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 基础设置 */}
      {selectedConfig && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-3">基础设置</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                视频长度 (秒)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={generationSettings.duration}
                onChange={(e) => onSettingsChange({ duration: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                宽高比
              </label>
              <select
                value={generationSettings.aspectRatio}
                onChange={(e) => onSettingsChange({ aspectRatio: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="16:9">16:9 (横屏)</option>
                <option value="9:16">9:16 (竖屏)</option>
                <option value="1:1">1:1 (正方形)</option>
                <option value="4:3">4:3 (经典)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                质量
              </label>
              <select
                value={generationSettings.quality}
                onChange={(e) => onSettingsChange({ quality: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">草稿</option>
                <option value="standard">标准</option>
                <option value="high">高质量</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                帧率
              </label>
              <select
                value={generationSettings.fps}
                onChange={(e) => onSettingsChange({ fps: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24">24 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 生成按钮 */}
      {canGenerateVideo && (
        <div className="flex justify-center">
          <button
            onClick={onGenerateVideo}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                生成中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                生成视频 ({selectedImageIds.length} 张图片)
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
});

VideoGenerationControls.displayName = 'VideoGenerationControls';