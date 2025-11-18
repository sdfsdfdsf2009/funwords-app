import React, { useState } from 'react';
import { Transition } from '../../types';

interface EditingToolsProps {
  selectedSegmentIds: string[];
  onSplit?: (segmentId: string, time: number) => void;
  onTrim?: (segmentId: string, startTime: number, endTime: number) => void;
  onTransition?: (segmentId: string, transition: Transition) => void;
}

export const EditingTools: React.FC<EditingToolsProps> = ({
  selectedSegmentIds,
  onSplit,
  onTrim,
  onTransition,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'transition' | 'effects'>('basic');

  const hasSelection = selectedSegmentIds.length > 0;
  const hasMultipleSelection = selectedSegmentIds.length > 1;

  const handleAddTransition = (type: Transition['type']) => {
    if (hasSelection && !hasMultipleSelection) {
      const transition: Transition = {
        id: `transition_${Date.now()}`,
        type,
        duration: 1.0,
        position: 0, // Would be calculated based on segment position
      };
      onTransition?.(selectedSegmentIds[0], transition);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">编辑工具</h3>
        {hasSelection && (
          <div className="text-sm text-gray-500">
            {selectedSegmentIds.length} 个已选择
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'basic'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          基础
        </button>
        <button
          onClick={() => setActiveTab('transition')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'transition'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          转场
        </button>
        <button
          onClick={() => setActiveTab('effects')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'effects'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          效果
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* Split tool */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">分割工具</h4>
              <button
                disabled={!hasSelection}
                className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={() => {
                  if (hasSelection && !hasMultipleSelection) {
                    onSplit?.(selectedSegmentIds[0], 0); // Would need current time
                  }
                }}
              >
                分割片段
              </button>
              <p className="text-xs text-gray-500 mt-1">
                在播放头位置分割选中的片段
              </p>
            </div>

            {/* Trim tool */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">裁剪工具</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">开始时间 (秒)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    disabled={!hasSelection}
                    onChange={(e) => {
                      if (hasSelection && !hasMultipleSelection) {
                        const startTime = parseFloat(e.target.value);
                        const endTime = 10; // Would need current segment end time
                        onTrim?.(selectedSegmentIds[0], startTime, endTime);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">结束时间 (秒)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    disabled={!hasSelection}
                    onChange={(e) => {
                      if (hasSelection && !hasMultipleSelection) {
                        const startTime = 0; // Would need current segment start time
                        const endTime = parseFloat(e.target.value);
                        onTrim?.(selectedSegmentIds[0], startTime, endTime);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Delete tool */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">删除工具</h4>
              <button
                disabled={!hasSelection}
                className="w-full px-3 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={() => {
                  // Would need to implement delete functionality
                }}
              >
                删除选中片段
              </button>
            </div>
          </div>
        )}

        {activeTab === 'transition' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">转场效果</h4>
              <div className="text-xs text-gray-500 mb-3">
                {hasMultipleSelection
                  ? '请只选择一个片段来添加转场效果'
                  : hasSelection
                    ? '为选中的片段添加转场效果'
                    : '请先选择一个片段'
                }
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'cut' as const, name: '直接切换', icon: '✂️' },
                  { type: 'fade' as const, name: '淡入淡出', icon: '🌓' },
                  { type: 'crossfade' as const, name: '交叉淡化', icon: '🔄' },
                  { type: 'slide' as const, name: '滑动', icon: '➡️' },
                  { type: 'zoom' as const, name: '缩放', icon: '🔍' },
                  { type: 'dissolve' as const, name: '溶解', icon: '💧' },
                ].map(({ type, name, icon }) => (
                  <button
                    key={type}
                    disabled={!hasSelection || hasMultipleSelection}
                    className="p-3 text-center border border-gray-200 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    onClick={() => handleAddTransition(type)}
                  >
                    <div className="text-lg mb-1">{icon}</div>
                    <div className="text-xs">{name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transition duration */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                转场时长
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  defaultValue="1.0"
                  className="flex-1"
                  disabled={!hasSelection}
                />
                <span className="text-sm text-gray-600 w-12">1.0s</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">视频效果</h4>
              <div className="text-xs text-gray-500 mb-3">
                为选中的片段添加视觉效果
              </div>

              <div className="space-y-3">
                {[
                  { name: '亮度调整', icon: '☀️', control: 'slider' },
                  { name: '对比度', icon: '◐', control: 'slider' },
                  { name: '饱和度', icon: '🎨', control: 'slider' },
                  { name: '模糊', icon: '🌫️', control: 'slider' },
                  { name: '棕褐色', icon: '🟤', control: 'toggle' },
                  { name: '黑白', icon: '⚫', control: 'toggle' },
                ].map(({ name, icon, control }) => (
                  <div key={name} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm">{name}</span>
                    </div>
                    {control === 'slider' ? (
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        defaultValue="0"
                        className="w-24"
                        disabled={!hasSelection}
                      />
                    ) : (
                      <button
                        disabled={!hasSelection}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        关
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts info */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-2">快捷键</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>空格键 - 播放/暂停</div>
          <div>S - 分割片段</div>
          <div>Delete - 删除选中片段</div>
          <div>Ctrl+A - 全选</div>
        </div>
      </div>
    </div>
  );
};