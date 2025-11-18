import React, { useState, useEffect } from 'react';
import { useAPIConfigStore } from '../src/stores/apiConfigStore';

export default function TestAPI() {
  const { configurations } = useAPIConfigStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<any>(null);

  useEffect(() => {
    // 查找Evolink配置
    const evolinkConfig = configurations.find(config =>
      config.name.toLowerCase().includes('evolink')
    );
    setSelectedConfig(evolinkConfig);
  }, [configurations]);

  const testAPI = async () => {
    if (!selectedConfig) {
      setError('未找到Evolink配置');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🧪 开始测试API代理...');
      console.log('📋 使用配置:', selectedConfig.name);

      const response = await fetch('/api/evolink/v1/videos/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'veo3.1-fast',
          prompt: 'A cat playing piano',
          aspect_ratio: '16:9',
          image_urls: [],
          _config: {
            endpoint: selectedConfig.endpoint,
            headers: selectedConfig.headers
          }
        })
      });

      const data = await response.text();

      console.log('📥 API响应状态:', response.status);
      console.log('📄 API响应内容:', data);

      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      });

    } catch (err: any) {
      console.error('❌ 测试失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 API代理测试</h1>

      {selectedConfig ? (
        <div style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #00ff00',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>📋 使用配置:</h3>
          <p><strong>名称:</strong> {selectedConfig.name}</p>
          <p><strong>端点:</strong> {selectedConfig.endpoint}</p>
          <p><strong>类型:</strong> {selectedConfig.type}</p>
          <p><strong>状态:</strong> {selectedConfig.isActive ? '激活' : '未激活'}</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#ffe8e8',
          border: '1px solid #ff0000',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>❌ 未找到Evolink配置</h3>
          <p>请在API配置中添加Evolink相关配置</p>
        </div>
      )}

      <button
        onClick={testAPI}
        disabled={loading || !selectedConfig}
        style={{
          padding: '10px 20px',
          backgroundColor: (loading || !selectedConfig) ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: (loading || !selectedConfig) ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? '测试中...' : '测试API代理'}
      </button>

      {error && (
        <div style={{
          backgroundColor: '#ffe8e8',
          border: '1px solid #ff0000',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>❌ 错误:</h3>
          <pre>{error}</pre>
        </div>
      )}

      {result && (
        <div style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #00ff00',
          padding: '10px',
          borderRadius: '5px'
        }}>
          <h3>✅ 测试结果:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '15px',
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3>📝 说明:</h3>
        <p>这个测试会使用你正式环境中的Evolink配置调用API代理。</p>
        <p><strong>预期结果:</strong></p>
        <ul>
          <li>✅ <strong>200状态码</strong>: 成功创建视频任务</li>
          <li>⚠️ <strong>401状态码</strong>: API密钥无效</li>
          <li>❌ <strong>其他错误</strong>: 配置或代理有问题</li>
        </ul>
        <p>现在应该能在Evolink网站看到API请求记录！</p>
      </div>
    </div>
  );
}