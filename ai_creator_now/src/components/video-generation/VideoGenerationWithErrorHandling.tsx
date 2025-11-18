import React from 'react';
import { useComponentErrorHandler } from '../../hooks/useComponentErrorHandler';

export const VideoGenerationWithErrorHandling: React.FC = () => {
  const { errors, handleError, clearAllErrors } = useComponentErrorHandler();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">🎬 视频生成（带错误处理）</h2>

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-red-800 font-medium">错误信息</h3>
            <button
              onClick={clearAllErrors}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              清除所有错误
            </button>
          </div>
          {errors.map(error => (
            <div key={error.id} className="mt-2 text-red-700">
              {error.message}
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-700">
        视频生成组件正在维护中。
      </p>
    </div>
  );
};