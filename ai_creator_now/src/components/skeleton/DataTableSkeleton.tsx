import React from 'react';

// 数据表格骨架屏组件
export const DataTableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
}> = ({
  rows = 10,
  columns = 5,
  showSearch = true,
  showFilters = true,
  showPagination = true
}) => {
  return (
    <div className="animate-pulse">
      {/* 搜索和筛选区域 */}
      {(showSearch || showFilters) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 搜索框 */}
            {showSearch && (
              <div className="flex items-center space-x-4">
                <div className="h-10 bg-gray-300 rounded-lg w-80"></div>
                <div className="h-10 bg-blue-300 rounded-lg w-20"></div>
              </div>
            )}

            {/* 筛选器 */}
            {showFilters && (
              <div className="flex items-center space-x-3">
                <div className="h-10 bg-gray-300 rounded-lg w-32"></div>
                <div className="h-10 bg-gray-300 rounded-lg w-32"></div>
                <div className="h-10 bg-gray-300 rounded-lg w-32"></div>
                <div className="h-10 bg-gray-300 rounded-lg w-20"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '总数', value: '1,234' },
          { label: '活跃', value: '567' },
          { label: '待处理', value: '89' },
          { label: '已完成', value: '578' }
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 表格头部 */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <div className="h-5 bg-gray-300 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 bg-gray-300 rounded w-8"></div>
              <div className="h-8 bg-gray-300 rounded w-8"></div>
              <div className="h-8 bg-gray-300 rounded w-20"></div>
            </div>
          </div>

          {/* 表头 */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50">
            {Array.from({ length: columns }).map((_, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="h-4 bg-gray-300 rounded flex-1"></div>
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* 表格行 */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50">
              {/* 复选框 */}
              <div className="col-span-1">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
              </div>

              {/* 数据列 */}
              {Array.from({ length: columns - 1 }).map((_, colIndex) => (
                <div key={colIndex} className="col-span-1">
                  {/* 根据列类型显示不同的骨架 */}
                  {colIndex === 0 ? (
                    // 第一列：头像 + 文本
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </div>
                  ) : colIndex === 1 ? (
                    // 第二列：状态标签
                    <div className="h-6 bg-gray-300 rounded-full w-16"></div>
                  ) : colIndex === columns - 2 ? (
                    // 倒数第二列：操作按钮
                    <div className="flex space-x-2">
                      <div className="h-8 bg-gray-300 rounded w-8"></div>
                      <div className="h-8 bg-gray-300 rounded w-8"></div>
                      <div className="h-8 bg-gray-300 rounded w-8"></div>
                    </div>
                  ) : (
                    // 其他列：普通文本
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 分页控制 */}
      {showPagination && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* 分页信息 */}
            <div className="text-sm text-gray-600">
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>

            {/* 分页按钮 */}
            <div className="flex items-center space-x-2">
              {/* 上一页 */}
              <div className="h-8 bg-gray-300 rounded w-20"></div>

              {/* 页码 */}
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((page) => (
                  <div
                    key={page}
                    className={`h-8 w-8 rounded ${
                      page === 3 ? 'bg-blue-300' : 'bg-gray-300'
                    }`}
                  ></div>
                ))}
              </div>

              {/* 下一页 */}
              <div className="h-8 bg-gray-300 rounded w-20"></div>
            </div>

            {/* 每页显示数量 */}
            <div className="flex items-center space-x-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-300 rounded w-16"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DataTableSkeleton.displayName = 'DataTableSkeleton';