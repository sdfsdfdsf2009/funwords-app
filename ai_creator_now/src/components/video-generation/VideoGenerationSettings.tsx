import React, { memo } from 'react';
import { Settings, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { VideoGenerationSettings } from '../../types';

interface VideoGenerationSettingsProps {
  settings: VideoGenerationSettings;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onSettingsChange: (settings: Partial<VideoGenerationSettings>) => void;
}

export const VideoGenerationSettings: React.FC<VideoGenerationSettingsProps> = memo(({
  settings,
  showAdvanced,
  onToggleAdvanced,
  onSettingsChange
}) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-500" />
          <h3 className="font-medium">高级设置</h3>
        </div>

        <button
          onClick={onToggleAdvanced}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="w-4 h-4" />
              收起
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              展开
            </>
          )}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-4">
          {/* 运动强度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              运动强度
            </label>
            <select
              value={settings.motionStrength}
              onChange={(e) => onSettingsChange({ motionStrength: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              控制视频中元素运动的幅度和速度
            </p>
          </div>

          {/* 风格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              视频风格
            </label>
            <select
              value={settings.style}
              onChange={(e) => onSettingsChange({ style: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="realistic">写实</option>
              <option value="cinematic">电影</option>
              <option value="artistic">艺术</option>
              <option value="animated">动画</option>
              <option value="documentary">纪录片</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              选择视频的整体视觉风格
            </p>
          </div>

          {/* 提示增强 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                提示词增强
              </label>
              <p className="text-xs text-gray-500">
                自动优化和扩展您的提示词
              </p>
            </div>
            <button
              onClick={() => onSettingsChange({ promptEnhancement: !settings.promptEnhancement })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.promptEnhancement ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.promptEnhancement ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 自定义参数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自定义参数
            </label>
            <textarea
              value={settings.customParams || ''}
              onChange={(e) => onSettingsChange({ customParams: e.target.value })}
              placeholder='{"key": "value"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              JSON格式的自定义参数 (可选)
            </p>
          </div>

          {/* 预设模板 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              快速预设
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSettingsChange({
                  style: 'cinematic',
                  motionStrength: 'medium',
                  quality: 'high'
                })}
                className="p-2 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                🎬 电影级
              </button>
              <button
                onClick={() => onSettingsChange({
                  style: 'realistic',
                  motionStrength: 'low',
                  fps: 30
                })}
                className="p-2 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                📹 自然流畅
              </button>
              <button
                onClick={() => onSettingsChange({
                  style: 'animated',
                  motionStrength: 'high',
                  fps: 60
                })}
                className="p-2 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                🎨 动态动画
              </button>
              <button
                onClick={() => onSettingsChange({
                  style: 'artistic',
                  motionStrength: 'medium',
                  quality: 'high',
                  promptEnhancement: true
                })}
                className="p-2 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                ✨ 艺术创作
              </button>
            </div>
          </div>

          {/* 性能提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-700">性能提示</p>
                <p className="text-xs text-blue-600 mt-1">
                  更高质量和更长视频会需要更多时间生成。建议先用草稿质量测试效果。
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
});

VideoGenerationSettings.displayName = 'VideoGenerationSettings';