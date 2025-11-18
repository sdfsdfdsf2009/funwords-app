import React from 'react';

// 项目骨架屏组件
export const ProjectSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* 头部骨架 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div>
              <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="h-10 bg-gray-300 rounded w-24"></div>
            <div className="h-10 bg-blue-300 rounded w-20"></div>
          </div>
        </div>
      </div>

      {/* 项目列表骨架 */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded"></div>
                <div className="h-5 bg-gray-300 rounded w-40"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-300 rounded w-32"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-300 rounded w-28"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

ProjectSkeleton.displayName = 'ProjectSkeleton';