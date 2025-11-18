import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Eye, EyeOff, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import {
  APIConfiguration,
  APIHeader,
  APIRequestTemplate,
  APIResponseParser,
  APITestSettings,
  APIParameter,
  APIConfigurationTemplate
} from '../../types';
import { apiConfigService } from '../../services/apiConfig';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { logger, logUser } from '../../utils/logger';

interface APIConfigEditorProps {
  config?: APIConfiguration;
  template?: APIConfigurationTemplate;
  onSave?: (config: APIConfiguration) => void;
  onCancel?: () => void;
}

export const APIConfigEditor: React.FC<APIConfigEditorProps> = ({ config, template, onSave, onCancel }) => {
  const { addConfiguration, updateConfiguration } = useAPIConfigStore();
  const [formData, setFormData] = useState<Partial<APIConfiguration>>({
    name: '',
    type: 'image',
    endpoint: '',
    method: 'POST',
    headers: [],
    requestTemplate: {
      format: 'json',
      template: '',
      parameters: [],
      examples: []
    },
    responseParser: {
      format: 'json',
      imageUrlPath: '',
      statusPath: '',
      metadataPaths: {},
      errorHandling: {
        errorPath: '',
        errorMessages: {}
      }
    },
    testSettings: {
      testParameters: {},
      timeout: 30000,
      retryCount: 2,
      retryDelay: 1000
    },
    isActive: true
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    } else if (template) {
      setFormData({
        name: `${template.name} - 自定义`,
        ...template.configuration
      });
    }
  }, [config, template]);

  // 处理表单字段变化
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理嵌套字段变化
  const handleNestedFieldChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof APIConfiguration] as any),
        [field]: value
      }
    }));
  };

  // 添加请求头
  const addHeader = () => {
    const newHeader: APIHeader = {
      key: '',
      value: '',
      description: '',
      enabled: true
    };
    setFormData(prev => ({
      ...prev,
      headers: [...(prev.headers || []), newHeader]
    }));
  };

  // 更新请求头
  const updateHeader = (index: number, updates: Partial<APIHeader>) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers?.map((header, i) =>
        i === index ? { ...header, ...updates } : header
      )
    }));
  };

  // 删除请求头
  const removeHeader = (index: number) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers?.filter((_, i) => i !== index)
    }));
  };

  // 添加参数
  const addParameter = () => {
    const newParam: APIParameter = {
      name: '',
      type: 'string',
      required: false,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      requestTemplate: {
        ...prev.requestTemplate!,
        parameters: [...(prev.requestTemplate?.parameters || []), newParam]
      }
    }));
  };

  // 更新参数
  const updateParameter = (index: number, updates: Partial<APIParameter>) => {
    setFormData(prev => ({
      ...prev,
      requestTemplate: {
        ...prev.requestTemplate!,
        parameters: (prev.requestTemplate?.parameters || []).map((param, i) =>
          i === index ? { ...param, ...updates } : param
        )
      }
    }));
  };

  // 删除参数
  const removeParameter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requestTemplate: {
        ...prev.requestTemplate!,
        parameters: (prev.requestTemplate?.parameters || []).filter((_, i) => i !== index)
      }
    }));
  };

  // 测试配置
  const handleTest = async () => {
    if (!formData.endpoint) {
      setTestResult({ success: false, message: '请填写API端点URL' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testConfig: APIConfiguration = {
        id: config?.id || 'test',
        name: formData.name || 'Test',
        type: formData.type as 'image' | 'video' | 'both',
        endpoint: formData.endpoint!,
        method: formData.method as 'POST' | 'GET',
        headers: formData.headers || [],
        requestTemplate: formData.requestTemplate!,
        responseParser: formData.responseParser!,
        testSettings: formData.testSettings!,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await apiConfigService.testConfiguration(testConfig);
      setTestResult(result);

      logUser.action('api-config-test', {
        endpoint: formData.endpoint,
        success: result.success
      });
    } catch (error) {
      logger.error('API config test failed', error);
      setTestResult({
        success: false,
        message: '测试过程中发生错误'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const handleSave = () => {
    if (!formData.name || !formData.endpoint) {
      alert('请填写配置名称和API端点');
      return;
    }

    try {
      let savedConfig: APIConfiguration;

      if (config) {
        // 更新现有配置
        const updated = updateConfiguration(config.id, formData);
        if (!updated) {
          throw new Error('Failed to update configuration');
        }
        savedConfig = updated;
      } else {
        // 创建新配置
        savedConfig = addConfiguration(formData as Omit<APIConfiguration, 'id' | 'createdAt' | 'updatedAt'>);
      }

      logUser.action('api-config-saved', {
        configId: savedConfig.id,
        isNew: !config
      });

      onSave?.(savedConfig);
    } catch (error) {
      logger.error('Failed to save API configuration', error);
      alert('保存配置失败，请稍后重试。');
    }
  };

  return (
    <div className="glass-card shadow-apple-lg animate-fade-in">
      {/* Header */}
      <div className="px-apple-xl py-apple-lg border-b border-gray-200/50 bg-gray-50/50 rounded-t-apple-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-sf-pro-display font-semibold text-gray-900">
            {config ? '编辑API配置' : '新建API配置'}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className={`btn-secondary ${isTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isTesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                  <span>测试中...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  <span>测试</span>
                </>
              )}
            </button>
            <button onClick={onCancel} className="btn-secondary">
              <X className="w-4 h-4" />
              <span>取消</span>
            </button>
            <button onClick={handleSave} className="btn-primary">
              <Save className="w-4 h-4" />
              <span>保存</span>
            </button>
          </div>
        </div>
      </div>

      {/* 测试结果显示 */}
      {testResult && (
        <div className={`mx-apple-xl mt-apple-lg p-apple-lg rounded-apple-lg flex items-center space-x-2 ${
          testResult.success
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {testResult.success ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-sf-pro-text">{testResult.message}</span>
        </div>
      )}

      <div className="p-apple-xl">
        {/* 基础信息 */}
        <div className="space-y-apple-lg mb-apple-xl">
          <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">基础信息</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-apple-lg">
            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                配置名称 *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="input"
                placeholder="输入配置名称"
              />
            </div>

            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                API类型 *
              </label>
              <select
                value={formData.type || 'image'}
                onChange={(e) => handleFieldChange('type', e.target.value)}
                className="input"
              >
                <option value="image">图片生成</option>
                <option value="video">视频生成</option>
                <option value="both">图片+视频</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                API端点 *
              </label>
              <input
                type="url"
                value={formData.endpoint || ''}
                onChange={(e) => handleFieldChange('endpoint', e.target.value)}
                className="input"
                placeholder="https://api.example.com/v1/generate"
              />
            </div>

            <div>
              <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                请求方法
              </label>
              <select
                value={formData.method || 'POST'}
                onChange={(e) => handleFieldChange('method', e.target.value)}
                className="input"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>
          </div>
        </div>

        {/* 请求头配置 */}
        <div className="space-y-apple-lg mb-apple-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">请求头配置</h3>
            <button onClick={addHeader} className="btn-secondary">
              <Plus className="w-4 h-4" />
              <span>添加请求头</span>
            </button>
          </div>

          <div className="space-y-apple-md">
            {formData.headers?.map((header, index) => (
              <div key={index} className="flex items-center space-x-apple-sm p-apple-lg bg-gray-50/50 rounded-apple-lg">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => updateHeader(index, { key: e.target.value })}
                  className="input flex-1"
                  placeholder="请求头名称 (如: Authorization)"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => updateHeader(index, { value: e.target.value })}
                  className="input flex-1"
                  placeholder="请求头值 (如: Bearer YOUR_API_KEY)"
                />
                <button
                  onClick={() => updateHeader(index, { enabled: !header.enabled })}
                  className={`p-apple-sm rounded-apple-md transition-colors ${
                    header.enabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={header.enabled ? '启用' : '禁用'}
                >
                  {header.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => removeHeader(index)}
                  className="p-apple-sm hover:bg-red-100 rounded-apple-md text-red-600 hover:text-red-800 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {(!formData.headers || formData.headers.length === 0) && (
              <div className="text-center py-apple-lg bg-gray-50/50 rounded-apple-lg border border-gray-200/50">
                <p className="text-sm font-sf-pro-text text-gray-500">
                  暂无请求头配置，点击上方按钮添加
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 高级配置切换 */}
        <div className="mb-apple-xl">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span className="text-sm font-sf-pro-text font-medium">
              {showAdvanced ? '隐藏' : '显示'}高级配置
            </span>
            <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>

        {/* 高级配置 */}
        {showAdvanced && (
          <div className="space-y-apple-xl border-t border-gray-200 pt-apple-xl">
            {/* 请求模板 */}
            <div className="space-y-apple-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">请求模板</h3>
                <button onClick={addParameter} className="btn-secondary">
                  <Plus className="w-4 h-4" />
                  <span>添加参数</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                  请求格式
                </label>
                <select
                  value={formData.requestTemplate?.format || 'json'}
                  onChange={(e) => handleNestedFieldChange('requestTemplate', 'format', e.target.value)}
                  className="input"
                >
                  <option value="json">JSON</option>
                  <option value="form-data">Form Data</option>
                  <option value="raw">Raw</option>
                </select>
              </div>

              {(formData.requestTemplate?.format === 'json' || formData.requestTemplate?.format === 'raw') && (
                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    模板内容
                  </label>
                  <textarea
                    value={formData.requestTemplate?.template || ''}
                    onChange={(e) => handleNestedFieldChange('requestTemplate', 'template', e.target.value)}
                    className="input resize-none"
                    rows={8}
                    placeholder='例如: {"prompt": "{{prompt}}", "size": "1024x1024"}'
                  />
                  <p className="text-xs font-sf-pro-text text-gray-500 mt-apple-sm">
                    使用 {"{{参数名}}"} 作为参数占位符
                  </p>
                </div>
              )}

              {/* 参数列表 */}
              {formData.requestTemplate?.parameters && formData.requestTemplate.parameters.length > 0 && (
                <div className="space-y-apple-md">
                  <h4 className="text-sm font-sf-pro-text font-medium text-gray-700">参数定义</h4>
                  {formData.requestTemplate.parameters.map((param, index) => (
                    <div key={index} className="p-apple-lg bg-gray-50/50 rounded-apple-lg space-y-apple-sm">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-apple-sm">
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => updateParameter(index, { name: e.target.value })}
                          className="input"
                          placeholder="参数名"
                        />
                        <select
                          value={param.type}
                          onChange={(e) => updateParameter(index, { type: e.target.value as any })}
                          className="input"
                        >
                          <option value="string">字符串</option>
                          <option value="number">数字</option>
                          <option value="boolean">布尔值</option>
                          <option value="array">数组</option>
                          <option value="object">对象</option>
                        </select>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={param.required}
                            onChange={(e) => updateParameter(index, { required: e.target.checked })}
                            className="rounded"
                          />
                          <label className="text-sm font-sf-pro-text text-gray-700">必填</label>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={param.description || ''}
                        onChange={(e) => updateParameter(index, { description: e.target.value })}
                        className="input"
                        placeholder="参数描述"
                      />
                      <button
                        onClick={() => removeParameter(index)}
                        className="btn-error"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>删除参数</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 响应解析器 */}
            <div className="space-y-apple-lg">
              <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">响应解析器</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-apple-lg">
                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    响应格式
                  </label>
                  <select
                    value={formData.responseParser?.format || 'json'}
                    onChange={(e) => handleNestedFieldChange('responseParser', 'format', e.target.value)}
                    className="input"
                  >
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                    <option value="text">文本</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    图片URL路径
                  </label>
                  <input
                    type="text"
                    value={formData.responseParser?.imageUrlPath || ''}
                    onChange={(e) => handleNestedFieldChange('responseParser', 'imageUrlPath', e.target.value)}
                    className="input"
                    placeholder="例如: $.data[0].url (JSONPath格式)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    状态路径
                  </label>
                  <input
                    type="text"
                    value={formData.responseParser?.statusPath || ''}
                    onChange={(e) => handleNestedFieldChange('responseParser', 'statusPath', e.target.value)}
                    className="input"
                    placeholder="例如: $.status (JSONPath格式)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    错误路径
                  </label>
                  <input
                    type="text"
                    value={formData.responseParser?.errorHandling?.errorPath || ''}
                    onChange={(e) => handleNestedFieldChange('responseParser', 'errorHandling', {
                      ...formData.responseParser?.errorHandling,
                      errorPath: e.target.value
                    })}
                    className="input"
                    placeholder="例如: $.error (JSONPath格式)"
                  />
                </div>
              </div>

              <div className="text-xs font-sf-pro-text text-gray-500">
                <strong>提示:</strong> JSONPath格式使用 "$.property" 访问属性，"$.array[0].property" 访问数组元素
              </div>
            </div>

            {/* 测试设置 */}
            <div className="space-y-apple-lg">
              <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">测试设置</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-apple-lg">
                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    超时时间 (毫秒)
                  </label>
                  <input
                    type="number"
                    value={formData.testSettings?.timeout || 30000}
                    onChange={(e) => handleNestedFieldChange('testSettings', 'timeout', parseInt(e.target.value))}
                    className="input"
                    min="1000"
                    max="300000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    重试次数
                  </label>
                  <input
                    type="number"
                    value={formData.testSettings?.retryCount || 2}
                    onChange={(e) => handleNestedFieldChange('testSettings', 'retryCount', parseInt(e.target.value))}
                    className="input"
                    min="0"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-sf-pro-text font-medium text-gray-700 mb-apple-sm">
                    重试延迟 (毫秒)
                  </label>
                  <input
                    type="number"
                    value={formData.testSettings?.retryDelay || 1000}
                    onChange={(e) => handleNestedFieldChange('testSettings', 'retryDelay', parseInt(e.target.value))}
                    className="input"
                    min="100"
                    max="10000"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIConfigEditor;