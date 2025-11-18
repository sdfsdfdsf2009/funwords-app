import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ImageGeneration } from '../src/components/image-generation/ImageGeneration';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { ToastProvider } from '../src/components/ui/Toast';
import { LoadingProvider } from '../src/components/ui/LoadingIndicator';

const ImageGenerationPage: React.FC = () => {
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
        <title>图像生成 - AI Creator Now</title>
        <meta name="description" content="使用AI技术生成高质量的图像内容" />
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
                        AI 图像生成
                      </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        基于 DALL-E 3 和其他 AI 模型
                      </span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    智能图像生成
                  </h2>
                  <p className="text-gray-600">
                    选择场景并输入描述，AI 将为您生成高质量的图像。
                    支持多种风格和尺寸，可根据需求调整参数。
                  </p>
                </div>

                {/* Image Generation Component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <ImageGeneration />
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      🎨 多种模型
                    </h3>
                    <p className="text-blue-700">
                      支持 DALL-E 3、Stable Diffusion 等多种 AI 图像生成模型
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      ⚡ 快速生成
                    </h3>
                    <p className="text-green-700">
                      通常在 30-60 秒内完成高质量图像生成
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      🎯 精准控制
                    </h3>
                    <p className="text-purple-700">
                      支持详细的描述词和参数调整，精确控制输出效果
                    </p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                      💰 成本优化
                    </h3>
                    <p className="text-yellow-700">
                      实时显示生成成本，帮助您优化预算使用
                    </p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                      📚 历史记录
                    </h3>
                    <p className="text-red-700">
                      保存所有生成历史，方便管理和复用
                    </p>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      🖼️ 场景管理
                    </h3>
                    <p className="text-indigo-700">
                      按场景组织图像，便于视频制作时选择使用
                    </p>
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-8 bg-amber-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-3">
                    💡 使用技巧
                  </h3>
                  <div className="space-y-2 text-amber-800">
                    <p>• <strong>描述要具体</strong>：详细描述图像内容、风格、光线等</p>
                    <p>• <strong>使用参考风格</strong>：如"照片级真实感"、"水彩画风格"等</p>
                    <p>• <strong>分批生成</strong>：可以为每个场景生成多个版本供选择</p>
                    <p>• <strong>注意版权</strong>：生成图像仅用于项目创作，请遵守相关版权法规</p>
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

export default ImageGenerationPage;