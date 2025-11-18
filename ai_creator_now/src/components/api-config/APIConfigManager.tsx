import React, { useEffect, useState } from 'react';
import { Plus, Settings, TestTube, Trash2, Edit2, Eye, EyeOff, Copy, CheckCircle, XCircle, Terminal, Upload } from 'lucide-react';
import { APIConfiguration, APIConfigurationTemplate } from '../../types';
import { logger, logUser } from '../../utils/logger';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { parseCurlCommand, curlToApiConfig, validateCurlCommand } from '../../utils/curlParser';

interface APIConfigManagerProps {
  onConfigSelect?: (config: APIConfiguration) => void;
  onConfigEdit?: (config: APIConfiguration) => void;
  selectedConfigId?: string;
}

export const APIConfigManager: React.FC<APIConfigManagerProps> = ({ onConfigSelect, onConfigEdit, selectedConfigId }) => {
  const {
    configurations,
    isLoading,
    error,
    loadConfigurations,
    addConfiguration,
    updateConfiguration,
    deleteConfiguration,
    toggleConfiguration,
    testConfiguration,
    createFromTemplate,
    clearError
  } = useAPIConfigStore();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [templates, setTemplates] = useState<APIConfigurationTemplate[]>([]);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');
  const [curlImportStatus, setCurlImportStatus] = useState<{ type: 'idle' | 'validating' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadConfigurations();
      loadTemplates();
    }
  }, [loadConfigurations]);

  // Load templates
  const loadTemplates = async () => {
    try {
      const { apiConfigService } = await import('../../services/apiConfig');
      const templateList = apiConfigService.getTemplates();
      setTemplates(templateList);
    } catch (error) {
      logger.error('Failed to load templates', error);
    }
  };

  // 测试API配置
  const handleTestConfig = async (config: APIConfiguration) => {
    setTestingId(config.id);
    try {
      const result = await testConfiguration(config);
      setTestResults(prev => ({
        ...prev,
        [config.id]: {
          success: result.success,
          message: result.message
        }
      }));

      logUser.action('api-config-tested', {
        configId: config.id,
        success: result.success
      });
    } catch (error) {
      logger.error('API config test failed', error, 'api-config');
      setTestResults(prev => ({
        ...prev,
        [config.id]: {
          success: false,
          message: '测试过程中发生错误'
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  // 删除配置
  const handleDeleteConfig = async (configId: string, configName: string) => {
    if (window.confirm(`确定要删除配置"${configName}"吗？此操作无法撤销。`)) {
      try {
        await deleteConfiguration(configId);
        logUser.action('api-config-deleted', { configId });
      } catch (error) {
        logger.error('Failed to delete config', error);
        alert('删除配置失败，请稍后重试。');
      }
    }
  };

  // 切换配置状态
  const handleToggleConfig = async (configId: string) => {
    try {
      await toggleConfiguration(configId);
      logUser.action('api-config-toggled', { configId });
    } catch (error) {
      logger.error('Failed to toggle config', error);
    }
  };

  // 从模板创建配置
  const handleCreateFromTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      alert('模板未找到');
      return;
    }

    const name = prompt(`请输入基于"${template.name}"的新配置名称:`, `${template.name} - 自定义`);
    if (!name) return;

    try {
      const result = createFromTemplate(templateId, name);

      if (!result) {
        throw new Error('模板未找到或创建失败');
      }

      // Store method automatically updates the state, no need to reload
      logUser.action('api-config-created-from-template', { templateId, name });
    } catch (error) {
      logger.error('Failed to create config from template', error);
      alert('创建配置失败，请稍后重试。');
    }
  };

  // 验证curl命令
  const handleValidateCurl = () => {
    if (!curlCommand.trim()) {
      setCurlImportStatus({ type: 'error', message: '请输入curl命令' });
      return;
    }

    setCurlImportStatus({ type: 'validating', message: '验证中...' });

    setTimeout(() => {
      const validation = validateCurlCommand(curlCommand);
      setCurlImportStatus({ type: validation.valid ? 'success' : 'error', message: validation.message });
    }, 500);
  };

  // 从curl导入配置
  const handleImportFromCurl = () => {
    if (!curlCommand.trim()) {
      setCurlImportStatus({ type: 'error', message: '请输入curl命令' });
      return;
    }

    try {
      setCurlImportStatus({ type: 'validating', message: '解析curl命令中...' });

      const parsed = parseCurlCommand(curlCommand);
      if (!parsed) {
        setCurlImportStatus({ type: 'error', message: '无法解析curl命令，请检查格式是否正确' });
        return;
      }

      const result = curlToApiConfig(parsed);
      if (!result.success || !result.config) {
        setCurlImportStatus({ type: 'error', message: result.error || '转换失败' });
        return;
      }

      // 请求用户输入配置名称
      const configName = prompt('请为此API配置命名:', result.config.name || '导入的API配置');
      if (!configName) {
        setCurlImportStatus({ type: 'idle', message: '' });
        return;
      }

      // 添加配置
      const newConfig = addConfiguration({
        ...result.config,
        name: configName,
        type: result.config.type || 'image',
        endpoint: result.config.endpoint || '',
        method: result.config.method || 'POST',
        headers: result.config.headers || [],
        requestTemplate: result.config.requestTemplate || {
          format: 'json',
          template: '',
          parameters: [],
          examples: []
        },
        responseParser: result.config.responseParser || {
          format: 'json',
          imageUrlPath: '',
          statusPath: '',
          errorHandling: {
            errorPath: '',
            errorMessages: {}
          }
        },
        testSettings: result.config.testSettings || {
          testParameters: {},
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000
        },
        isActive: true
      });

      logUser.action('api-config-imported-from-curl', { configName, endpoint: result.config.endpoint });

      // 清理状态
      setCurlCommand('');
      setCurlImportStatus({ type: 'idle', message: '' });
      setShowCurlImport(false);

      // 显示成功消息
      alert('API配置导入成功！');
    } catch (error) {
      logger.error('Failed to import config from curl', error);
      setCurlImportStatus({ type: 'error', message: '导入失败，请稍后重试' });
    }
  };

  // 重置curl导入
  const handleResetCurlImport = () => {
    setCurlCommand('');
    setCurlImportStatus({ type: 'idle', message: '' });
    setShowCurlImport(false);
  };

  // 选择配置
  const handleSelectConfig = (config: APIConfiguration) => {
    onConfigSelect?.(config);
    logUser.action('api-config-selected', { configId: config.id });
  };

  if (isLoading) {
    return (
      <div className="glass-card shadow-apple-lg p-apple-xl animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">加载API配置...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card shadow-apple-lg animate-fade-in">
      {/* Apple-style Header */}
      <div className="px-apple-xl py-apple-lg border-b border-gray-200/50 bg-gray-50/50 rounded-t-apple-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-apple flex items-center justify-center shadow-apple-md">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-sf-pro-display font-semibold text-gray-900">API配置管理</h2>
              <p className="text-sm font-sf-pro-text text-gray-500">配置和管理AI服务提供商API</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCurlImport(true)}
              className="flex items-center space-x-2 px-apple-lg py-apple-sm bg-green-500 text-white rounded-apple-md hover:bg-green-600 transition-colors shadow-apple-sm"
              title="从curl命令导入"
            >
              <Terminal className="w-4 h-4" />
              <span className="text-sm font-sf-pro-text font-medium">导入curl</span>
            </button>
            <div className="glass-card px-apple-lg py-apple-sm">
              <span className="text-sm font-sf-pro-text font-medium text-gray-700">
                {configurations.length} 个配置
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-apple-xl">
        {/* API配置列表 */}
        <div className="space-y-apple-lg mb-apple-xl">
          <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900 mb-apple-lg">我的配置</h3>

          {configurations.length === 0 ? (
            <div className="text-center py-apple-2xl bg-gray-50/50 rounded-apple-lg border border-gray-200/50">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-apple-lg" />
              <h4 className="text-lg font-sf-pro-display font-medium text-gray-700 mb-apple-sm">暂无API配置</h4>
              <p className="text-sm font-sf-pro-text text-gray-500 mb-apple-lg">
                从下面的模板创建您的第一个API配置
              </p>
            </div>
          ) : (
            configurations.map((config) => (
              <div
                key={config.id}
                className={`border rounded-apple-xl p-apple-xl transition-all duration-300 ${
                  selectedConfigId === config.id
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30'
                    : 'border-gray-200/50 hover:border-gray-300 hover:shadow-apple-md bg-white/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-apple-md">
                      <h4 className="text-lg font-sf-pro-display font-semibold text-gray-900">
                        {config.name}
                      </h4>
                      <div className={`px-3 py-1 rounded-full text-xs font-sf-pro-text font-medium ${
                        config.type === 'image'
                          ? 'bg-blue-100 text-blue-800'
                          : config.type === 'video'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {config.type === 'image' ? '图片' : config.type === 'video' ? '视频' : '图片+视频'}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-sf-pro-text font-medium ${
                        config.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {config.isActive ? '已启用' : '已停用'}
                      </div>
                    </div>

                    <div className="space-y-apple-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-sf-pro-text text-gray-500">端点:</span>
                        <span className="text-sm font-sf-pro-text text-gray-700 font-mono bg-gray-50 px-apple-sm py-1 rounded">
                          {config.endpoint}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-sf-pro-text text-gray-500">方法:</span>
                        <span className="text-sm font-sf-pro-text text-gray-700">
                          {config.method}
                        </span>
                      </div>

                      {/* 测试结果显示 */}
                      {testResults[config.id] && (
                        <div className={`flex items-center space-x-2 p-apple-sm rounded-apple-md ${
                          testResults[config.id].success
                            ? 'bg-green-50 text-green-800'
                            : 'bg-red-50 text-red-800'
                        }`}>
                          {testResults[config.id].success ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          <span className="text-sm font-sf-pro-text">
                            {testResults[config.id].message}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-2 ml-apple-lg">
                    {selectedConfigId !== config.id && (
                      <button
                        onClick={() => handleSelectConfig(config)}
                        className="p-apple-sm hover:bg-gray-100 rounded-apple-md text-gray-600 hover:text-gray-900 transition-colors"
                        title="选择配置"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    )}

                    {/* 编辑按钮 */}
                    <button
                      onClick={() => onConfigEdit?.(config)}
                      className="p-apple-sm hover:bg-green-100 rounded-apple-md text-green-600 hover:text-green-800 transition-colors"
                      title="编辑配置"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleTestConfig(config)}
                      disabled={testingId === config.id}
                      className={`p-apple-sm rounded-apple-md transition-colors ${
                        testingId === config.id
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'hover:bg-blue-100 text-blue-600 hover:text-blue-800'
                      }`}
                      title="测试配置"
                    >
                      {testingId === config.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                      ) : (
                        <TestTube className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleConfig(config.id)}
                      className={`p-apple-sm rounded-apple-md transition-colors ${
                        config.isActive
                          ? 'hover:bg-orange-100 text-orange-600 hover:text-orange-800'
                          : 'hover:bg-green-100 text-green-600 hover:text-green-800'
                      }`}
                      title={config.isActive ? '停用' : '启用'}
                    >
                      {config.isActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => handleDeleteConfig(config.id, config.name)}
                      className="p-apple-sm hover:bg-red-100 rounded-apple-md text-red-600 hover:text-red-800 transition-colors"
                      title="删除配置"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 配置模板 */}
        <div className="space-y-apple-lg">
          <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900 mb-apple-lg">配置模板</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-apple-lg">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200/50 rounded-apple-xl p-apple-lg hover:border-gray-300 hover:shadow-apple-md transition-all duration-300 bg-white/80"
              >
                <div className="flex items-start justify-between mb-apple-md">
                  <div>
                    <h4 className="text-base font-sf-pro-display font-semibold text-gray-900 mb-apple-sm">
                      {template.name}
                    </h4>
                    <p className="text-sm font-sf-pro-text text-gray-600 mb-apple-sm">
                      {template.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-sf-pro-text text-gray-500">
                        类别: {template.category}
                      </span>
                      {template.isPopular && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-sf-pro-text font-medium rounded-full">
                          热门
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm font-sf-pro-text text-gray-600 mb-apple-md font-mono bg-gray-50 p-apple-sm rounded truncate">
                  {template.configuration.endpoint}
                </div>

                <button
                  onClick={() => handleCreateFromTemplate(template.id)}
                  className="w-full btn-primary"
                >
                  <Copy className="w-4 h-4" />
                  <span>基于此模板创建</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-apple-xl p-apple-xl bg-blue-50/50 border border-blue-200/50 rounded-apple-lg">
          <h4 className="font-sf-pro-display font-semibold text-blue-900 mb-apple-lg">使用说明</h4>
          <ul className="text-sm font-sf-pro-text text-blue-800 space-y-apple-sm">
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>从配置模板创建新的API配置，系统会自动填充基础设置</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>测试配置确保API端点可用，并验证响应格式正确</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>配置完成后可在图片生成页面选择使用</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>请确保替换模板中的占位符（如YOUR_API_KEY）为实际值</span>
            </li>
          </ul>
        </div>
      </div>

      {/* curl导入模态框 */}
      {showCurlImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-apple-xl p-apple-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-apple-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-apple flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">从curl命令导入API配置</h3>
                  <p className="text-sm font-sf-pro-text text-gray-500">粘贴curl命令自动解析并创建API配置</p>
                </div>
              </div>
              <button
                onClick={handleResetCurlImport}
                className="p-apple-sm hover:bg-gray-100 rounded-apple-md text-gray-500 hover:text-gray-700 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-apple-lg">
              {/* 输入区域 */}
              <div>
                <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                  curl命令
                </label>
                <textarea
                  value={curlCommand}
                  onChange={(e) => {
                    setCurlCommand(e.target.value);
                    setCurlImportStatus({ type: 'idle', message: '' });
                  }}
                  placeholder={`请粘贴curl命令，例如：
curl -X POST 'https://api.example.com/v1/images/generations' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -d '{\"prompt\":\"a cat\",\"size\":\"1024x1024\"}'`}
                  className="w-full h-32 px-apple-md py-apple-sm border border-gray-300 rounded-apple-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* 状态显示 */}
              {curlImportStatus.type !== 'idle' && (
                <div className={`p-apple-sm rounded-apple-md ${
                  curlImportStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : curlImportStatus.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {curlImportStatus.type === 'validating' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    )}
                    {curlImportStatus.type === 'success' && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {curlImportStatus.type === 'error' && (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-sf-pro-text">
                      {curlImportStatus.message}
                    </span>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleValidateCurl}
                  disabled={!curlCommand.trim() || curlImportStatus.type === 'validating'}
                  className="flex-1 px-apple-lg py-apple-sm bg-blue-500 text-white rounded-apple-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>验证命令</span>
                  </div>
                </button>
                <button
                  onClick={handleImportFromCurl}
                  disabled={!curlCommand.trim() || curlImportStatus.type === 'validating' || curlImportStatus.type === 'error'}
                  className="flex-1 px-apple-lg py-apple-sm bg-green-500 text-white rounded-apple-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>导入配置</span>
                  </div>
                </button>
                <button
                  onClick={handleResetCurlImport}
                  className="px-apple-lg py-apple-sm bg-gray-100 text-gray-700 rounded-apple-md hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>

              {/* 使用说明 */}
              <div className="bg-blue-50/50 border border-blue-200/50 rounded-apple-lg p-apple-lg">
                <h4 className="font-sf-pro-display font-semibold text-blue-900 mb-apple-sm">支持的curl格式</h4>
                <div className="text-sm font-sf-pro-text text-blue-800 space-y-apple-sm">
                  <div className="font-mono bg-white p-apple-sm rounded border border-blue-200">
                    <div>curl -X POST 'https://api.example.com/endpoint'</div>
                    <div>  -H 'Content-Type: application/json'</div>
                    <div>  -H 'Authorization: Bearer YOUR_API_KEY'</div>
                    <div>  -d {JSON.stringify({prompt: "a cat"})}</div>
                  </div>
                  <ul className="space-y-apple-xs mt-apple-sm">
                    <li>• 支持 -X/--request 指定HTTP方法</li>
                    <li>• 支持 -H/--header 添加请求头</li>
                    <li>• 支持 -d/--data/--data-binary 添加请求体</li>
                    <li>• 自动识别JSON格式并解析参数</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIConfigManager;