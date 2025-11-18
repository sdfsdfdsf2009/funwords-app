import React, { memo, useState } from 'react';
import { X, Eye, Download, Info } from 'lucide-react';
import { GeneratedImage } from '../../types';

interface ImagePreviewModalProps {
  image: GeneratedImage;
  isOpen: boolean;
  onClose: () => void;
}

export const ImagePreviewModal = memo<ImagePreviewModalProps>(({
  image,
  isOpen,
  onClose
}) => {
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen || !image) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image_${image.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载图片失败:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          title="关闭"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 工具栏 */}
        <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 space-y-1">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              title="图片信息"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/20 rounded text-white transition-colors"
              title="下载图片"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 图片信息面板 */}
        {showInfo && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white max-w-sm">
            <h3 className="font-semibold mb-2">图片信息</h3>
            <div className="space-y-1 text-sm">
              <div><strong>ID:</strong> {image.id}</div>
              <div><strong>提供商:</strong> {image.provider}</div>
              <div><strong>尺寸:</strong> {image.metadata.dimensions?.width || '未知'} × {image.metadata.dimensions?.height || '未知'}</div>
              <div><strong>文件大小:</strong> {formatFileSize(image.metadata.fileSize || 0)}</div>
              <div><strong>格式:</strong> {image.metadata.format || '未知'}</div>
              <div><strong>创建时间:</strong> {new Date(image.createdAt).toLocaleString()}</div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/20">
              <h4 className="font-medium mb-1">提示词</h4>
              <div className="text-sm opacity-90 line-clamp-3">{image.prompt}</div>
            </div>
          </div>
        )}

        {/* 图片容器 */}
        <div className="relative max-w-full max-h-full">
          <img
            src={image.url}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
});

ImagePreviewModal.displayName = 'ImagePreviewModal';