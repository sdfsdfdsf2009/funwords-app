import React, { useState, useEffect } from 'react';
import { Settings, Save, Trash2, Check, Plus, X, ChevronDown } from 'lucide-react';
import { VideoGenerationSettings, VideoGenerationPreset } from '../../types';
import { useVideoPresetStore } from '../../stores/videoPresetStore';

interface VideoPresetManagerProps {
  currentSettings: VideoGenerationSettings;
  onSettingsChange: (settings: VideoGenerationSettings) => void;
}

export const VideoPresetManager: React.FC<VideoPresetManagerProps> = ({
  currentSettings,
  onSettingsChange
}) => {
  const {
    presets,
    savePreset,
    deletePreset,
    applyPreset,
    setDefaultPreset,
    getDefaultPreset
  } = useVideoPresetStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [currentDefaultPreset, setCurrentDefaultPreset] = useState<VideoGenerationPreset | null>(null);

  useEffect(() => {
    setCurrentDefaultPreset(getDefaultPreset());
  }, [getDefaultPreset]);

  const handleApplyPreset = (preset: VideoGenerationPreset) => {
    onSettingsChange({ ...preset.settings });
    setIsDropdownOpen(false);
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim(), newPresetDescription.trim(), currentSettings);
      setNewPresetName('');
      setNewPresetDescription('');
      setShowSaveDialog(false);
    }
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个预设吗？')) {
      deletePreset(presetId);
    }
  };

  const handleSetDefault = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDefaultPreset(presetId);
    setCurrentDefaultPreset(getDefaultPreset());
  };

  const formatSettingsText = (settings: VideoGenerationSettings) => {
    return `${settings.duration}秒 | ${settings.fps}fps | ${settings.quality} | ${settings.motionStrength} | ${settings.aspectRatio}`;
  };

  return (
    <div className="relative">
      {/* 预设管理按钮 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">参数预设</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="保存当前设置为预设"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">保存预设</span>
        </button>
      </div>

      {/* 预设下拉列表 */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">视频生成预设</h3>
            <p className="text-xs text-gray-500 mt-1">选择预设快速应用参数配置</p>
          </div>

          {presets.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">暂无保存的预设</p>
              <p className="text-xs mt-1">点击"保存预设"创建第一个预设</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="relative group hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {preset.name}
                          </h4>
                          {preset.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              默认
                            </span>
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {preset.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2 font-mono">
                          {formatSettingsText(preset.settings)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleSetDefault(preset.id, e)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="设为默认"
                        >
                          <Check className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          className="p-1 hover:bg-red-100 rounded"
                          title="删除预设"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              提示：点击预设应用参数，或保存当前配置为新预设
            </p>
          </div>
        </div>
      )}

      {/* 保存预设对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">保存参数预设</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预设名称 *
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：高质量动画"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预设描述
                </label>
                <textarea
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="描述这个预设的用途和特点..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">当前参数配置</p>
                <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200">
                  {formatSettingsText(currentSettings)}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>保存预设</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 点击外部关闭下拉列表 */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};