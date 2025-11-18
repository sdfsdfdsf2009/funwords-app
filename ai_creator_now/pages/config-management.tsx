import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { APIConfigManager } from '../src/components/api-config/APIConfigManager';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { ToastProvider } from '../src/components/ui/Toast';
import { LoadingProvider } from '../src/components/ui/LoadingIndicator';
import { APIConfiguration } from '../src/types';

const ConfigManagementPage: React.FC = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<APIConfiguration | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleConfigSelect = (config: APIConfiguration) => {
    setSelectedConfig(config);
    console.log('Selected API configuration:', config.name);
  };

  const handleConfigEdit = (config: APIConfiguration) => {
    console.log('Editing API configuration:', config.name);
    // 这里可以添加编辑逻辑，比如打开编辑模态框
  };

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
        <title>API配置管理 - AI Creator Now</title>
        <meta name="description" content="配置和管理AI服务提供商API，支持多种配置模板和curl导入" />
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
                        API 配置管理
                      </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                      {selectedConfig && (
                        <span className="text-sm text-gray-500">
                          当前选择: {selectedConfig.name}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        支持多种 AI 服务提供商
                      </span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    智能 API 配置管理
                  </h2>
                  <p className="text-gray-600">
                    配置和管理多个AI服务提供商的API接口，支持配置模板、curl命令导入、
                    连接测试和热切换功能。确保您的AI创作流程稳定可靠。
                  </p>
                </div>

                {/* API Config Manager Component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <APIConfigManager
                    onConfigSelect={handleConfigSelect}
                    onConfigEdit={handleConfigEdit}
                    selectedConfigId={selectedConfig?.id}
                  />
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      🔧 多 API 管理
                    </h3>
                    <p className="text-blue-700">
                      支持同时配置多个AI服务提供商，灵活切换使用
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      📋 配置模板
                    </h3>
                    <p className="text-green-700">
                      内置主流AI服务商配置模板，一键创建配置
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      🖥️ curl 导入
                    </h3>
                    <p className="text-purple-700">
                      支持从curl命令自动解析并导入API配置
                    </p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                      🧪 连接测试
                    </h3>
                    <p className="text-yellow-700">
                      实时测试API连接状态，确保配置正确可用
                    </p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                      🔄 热切换
                    </h3>
                    <p className="text-red-700">
                      无需重启应用即可切换API配置，提高效率
                    </p>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      🔒 安全存储
                    </h3>
                    <p className="text-indigo-700">
                      API密钥等敏感信息安全加密存储
                    </p>
                  </div>
                </div>

                {/* Supported Providers */}
                <div className="mt-8 bg-gray-100 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🏢 支持的服务提供商
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-green-600 font-bold">OAI</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">OpenAI</p>
                      <p className="text-xs text-gray-500">GPT-4, DALL-E</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-blue-600 font-bold">SD</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Stable Diffusion</p>
                      <p className="text-xs text-gray-500">图像生成</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-purple-600 font-bold">Evo</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">EvoLink</p>
                      <p className="text-xs text-gray-500">多模态AI</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-red-600 font-bold">Mid</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Midjourney</p>
                      <p className="text-xs text-gray-500">图像创作</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-yellow-600 font-bold">Claude</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Claude</p>
                      <p className="text-xs text-gray-500">文本生成</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-indigo-600 font-bold">Hug</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Hugging Face</p>
                      <p className="text-xs text-gray-500">开源模型</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-gray-600 font-bold">Custom</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">自定义API</p>
                      <p className="text-xs text-gray-500">任意REST API</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-orange-600 font-bold">Local</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">本地部署</p>
                      <p className="text-xs text-gray-500">私有化部署</p>
                    </div>
                  </div>
                </div>

                {/* Configuration Examples */}
                <div className="mt-8 bg-amber-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-3">
                    📝 配置示例
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">OpenAI API 配置</h4>
                      <div className="bg-amber-100 p-3 rounded font-mono text-sm text-amber-900">
                        <div>端点: https://api.openai.com/v1/images/generations</div>
                        <div>方法: POST</div>
                        <div>认证: Bearer Token (sk-...)</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">自定义API配置</h4>
                      <div className="bg-amber-100 p-3 rounded font-mono text-sm text-amber-900">
                        <div>端点: https://your-api.com/v1/generate</div>
                        <div>方法: POST</div>
                        <div>自定义头: Authorization, Content-Type</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-8 bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    💡 配置建议
                  </h3>
                  <div className="space-y-2 text-blue-700">
                    <p>• <strong>密钥安全</strong>：请勿在代码中硬编码API密钥，使用配置管理功能</p>
                    <p>• <strong>测试配置</strong>：添加配置后立即测试连接，确保参数正确</p>
                    <p>• <strong>备用配置</strong>：建议配置多个服务商作为备用</p>
                    <p>• <strong>权限控制</strong>：API密钥仅授予必要的权限</p>
                    <p>• <strong>定期更新</strong>：定期检查和更新API配置，确保安全</p>
                  </div>
                </div>

                {/* Troubleshooting */}
                <div className="mt-8 bg-red-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">
                    🔧 常见问题
                  </h3>
                  <div className="space-y-3 text-red-700">
                    <div>
                      <p className="font-medium text-red-800">连接测试失败？</p>
                      <p className="text-sm">检查网络连接、API密钥有效性、端点URL是否正确</p>
                    </div>
                    <div>
                      <p className="font-medium text-red-800">curl导入失败？</p>
                      <p className="text-sm">确保curl命令格式正确，包含必要的认证头和请求体</p>
                    </div>
                    <div>
                      <p className="font-medium text-red-800">配置不生效？</p>
                      <p className="text-sm">确保配置已启用，检查请求参数是否匹配API要求</p>
                    </div>
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

export default ConfigManagementPage;