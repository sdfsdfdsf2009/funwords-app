import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { VideoGeneration } from '../src/components/video-generation/VideoGeneration';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { ToastProvider } from '../src/components/ui/Toast';
import { LoadingProvider } from '../src/components/ui/LoadingIndicator';

const VideoGenerationPage: React.FC = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>视频生成 - AI Creator Now</title>
        <meta name="description" content="使用Remotion引擎生成高质量视频内容" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <ErrorBoundary>
        <LoadingProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gray-50">
              {/* Header */}
              <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                      <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        ← 返回主页
                      </button>
                      <h1 className="text-xl font-semibold text-gray-900">
                        AI 视频生成
                      </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        基于 Remotion 专业渲染引擎
                      </span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    专业视频合成
                  </h2>
                  <p className="text-gray-600">
                    选择生成的图像和场景配置，系统将自动合成高质量视频。
                    支持多种输出格式和分辨率，满足不同平台需求。
                  </p>
                </div>

                {/* Video Generation Component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <VideoGeneration />
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      🎬 Remotion 引擎
                    </h3>
                    <p className="text-purple-700">
                      基于 React 的专业视频渲染引擎，支持复杂动画和转场
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      🎭 多场景合成
                    </h3>
                    <p className="text-blue-700">
                      将多个场景和图像合成为完整视频内容
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      ⚙️ 实时渲染
                    </h3>
                    <p className="text-green-700">
                      实时显示渲染进度，支持任务队列管理
                    </p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                      🎬 高清输出
                    </h3>
                    <p className="text-yellow-700">
                      支持 4K、1080P 等多种高清分辨率
                    </p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                      🎛️ 预设模板
                    </h3>
                    <p className="text-red-700">
                      内置多种专业视频预设模板
                    </p>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      📊 进度追踪
                    </h3>
                    <p className="text-indigo-700">
                      详细显示渲染进度和任务状态
                    </p>
                  </div>
                </div>

                {/* Workflow */}
                <div className="mt-8 bg-gray-100 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🔄 视频生成流程
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                        1
                      </div>
                      <p className="text-sm font-medium text-gray-700">选择场景</p>
                      <p className="text-xs text-gray-500">选择要包含的场景</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                        2
                      </div>
                      <p className="text-sm font-medium text-gray-700">选择图像</p>
                      <p className="text-xs text-gray-500">为每个场景选择图像</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                        3
                      </div>
                      <p className="text-sm font-medium text-gray-700">配置参数</p>
                      <p className="text-xs text-gray-500">设置视频参数</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                        4
                      </div>
                      <p className="text-sm font-medium text-gray-700">开始渲染</p>
                      <p className="text-xs text-gray-500">自动生成视频</p>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="mt-8 bg-amber-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-3">
                    ⚙️ 技术细节
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">输出格式</h4>
                      <ul className="space-y-1 text-amber-700 text-sm">
                        <li>• MP4 (H.264/H.265)</li>
                        <li>• WebM (VP9)</li>
                        <li>• MOV (ProRes)</li>
                        <li>• GIF (动画)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">支持分辨率</h4>
                      <ul className="space-y-1 text-amber-700 text-sm">
                        <li>• 3840×2160 (4K)</li>
                        <li>• 1920×1080 (Full HD)</li>
                        <li>• 1280×720 (HD)</li>
                        <li>• 854×480 (SD)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-8 bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    💡 使用建议
                  </h3>
                  <div className="space-y-2 text-blue-700">
                    <p>• <strong>图像质量</strong>：使用高质量图像可提升最终视频效果</p>
                    <p>• <strong>场景时长</strong>：建议单个场景不超过 30 秒</p>
                    <p>• <strong>音频同步</strong>：可添加背景音乐和音效</p>
                    <strong>• 预览功能</strong>：生成前可预览效果</p>
                    <p>• <strong>批量处理</strong>：支持批量生成多个视频</p>
                  </div>
                </div>
              </main>
            </div>
          </ToastProvider>
        </LoadingProvider>
      </ErrorBoundary>
    </>
  );
};

export default VideoGenerationPage;