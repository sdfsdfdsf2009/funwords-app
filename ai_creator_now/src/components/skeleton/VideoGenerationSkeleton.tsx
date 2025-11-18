import React from 'react';

// 视频生成骨架屏组件
export const VideoGenerationSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* 头部控制区域 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-6 bg-gray-300 rounded w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 bg-gray-300 rounded w-32"></div>
            <div className="h-10 bg-blue-300 rounded w-24"></div>
          </div>
        </div>

        {/* 进度条骨架 */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧配置区域 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 配置面板 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-5 bg-gray-300 rounded w-24 mb-4"></div>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-10 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3 mt-6">
              <div className="h-10 bg-gray-300 rounded flex-1"></div>
              <div className="h-10 bg-gray-300 rounded flex-1"></div>
            </div>
          </div>

          {/* 高级设置 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-5 bg-gray-300 rounded w-28 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-36"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧预览区域 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* 视频预览区域 */}
            <div className="h-96 bg-gray-100 rounded-lg mb-4 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-32 mx-auto"></div>
                </div>
              </div>
            </div>

            {/* 视频信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '分辨率', value: '1920x1080' },
                { label: '时长', value: '0:30' },
                { label: '帧率', value: '30fps' },
                { label: '格式', value: 'MP4' }
              ].map((info, index) => (
                <div key={index} className="text-center">
                  <div className="h-3 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-20 mx-auto"></div>
                </div>
              ))}
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-300 rounded w-8"></div>
                <div className="h-8 bg-gray-300 rounded w-8"></div>
                <div className="h-8 bg-gray-300 rounded w-8"></div>
              </div>
              <div className="flex space-x-3">
                <div className="h-10 bg-gray-300 rounded w-24"></div>
                <div className="h-10 bg-green-300 rounded w-28"></div>
              </div>
            </div>
          </div>

          {/* 历史记录 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <div className="h-5 bg-gray-300 rounded w-24 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-300 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

VideoGenerationSkeleton.displayName = 'VideoGenerationSkeleton';