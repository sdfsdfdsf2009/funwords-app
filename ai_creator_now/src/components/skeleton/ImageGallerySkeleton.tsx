import React from 'react';

// 图片画廊骨架屏组件
export const ImageGallerySkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* 头部控制区域 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 bg-gray-300 rounded w-36 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-56"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-10 bg-gray-300 rounded w-32"></div>
            <div className="h-10 bg-blue-300 rounded w-28"></div>
            <div className="h-10 bg-green-300 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* 筛选和排序栏 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-8 bg-gray-300 rounded w-24"></div>
            <div className="h-8 bg-gray-300 rounded w-28"></div>
            <div className="h-8 bg-gray-300 rounded w-32"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-8 bg-gray-300 rounded w-20"></div>
            <div className="h-8 bg-gray-300 rounded w-20"></div>
          </div>
        </div>
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* 图片占位符 */}
            <div className="aspect-w-16 aspect-h-9 bg-gray-200">
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>

            {/* 图片信息 */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
              </div>

              {/* 标签 */}
              <div className="flex flex-wrap gap-1 mb-3">
                {[1, 2, 3].map((tag) => (
                  <div key={tag} className="h-5 bg-gray-200 rounded w-16"></div>
                ))}
              </div>

              {/* 状态和操作 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控制 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 bg-gray-300 rounded w-8"></div>
            <div className="h-8 bg-gray-300 rounded w-8"></div>
            <div className="h-8 bg-gray-300 rounded w-8"></div>
            <div className="h-8 bg-gray-300 rounded w-8"></div>
            <div className="h-8 bg-gray-300 rounded w-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

ImageGallerySkeleton.displayName = 'ImageGallerySkeleton';