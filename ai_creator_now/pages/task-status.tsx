import React, { useState } from 'react';
import { useAPIConfigStore } from '../src/stores/apiConfigStore';

export default function TaskStatusPage() {
  const { configurations } = useAPIConfigStore();
  const [taskId, setTaskId] = useState('task-unified-1763006917-xp4neusl'); // 预填充测试任务ID
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // 查找Evolink配置
  const evolinkConfig = configurations.find(config =>
    config.name.toLowerCase().includes('evolink')
  );

  const checkTaskStatus = async () => {
    if (!taskId) {
      setError('请输入任务ID');
      return;
    }

    if (!evolinkConfig) {
      setError('未找到Evolink配置');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🔍 查询任务状态:', taskId);

      const response = await fetch(`/api/evolink/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-config': JSON.stringify(evolinkConfig)
        }
      });

      const data = await response.json();

      console.log('📊 任务状态响应:', data);
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data
      });

    } catch (err: any) {
      console.error('❌ 查询失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 任务状态查询</h1>

      {evolinkConfig ? (
        <div style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #00ff00',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>📋 使用配置:</h3>
          <p><strong>名称:</strong> {evolinkConfig.name}</p>
          <p><strong>端点:</strong> {evolinkConfig.endpoint}</p>
          <p><strong>类型:</strong> {evolinkConfig.type}</p>
          <p><strong>状态:</strong> {evolinkConfig.isActive ? '激活' : '未激活'}</p>
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

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <strong>任务ID:</strong>
        </label>
        <input
          type="text"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="输入任务ID (如: task-unified-123456789-abc123)"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        />
      </div>

      <button
        onClick={checkTaskStatus}
        disabled={loading || !taskId || !evolinkConfig}
        style={{
          padding: '10px 20px',
          backgroundColor: (loading || !taskId || !evolinkConfig) ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: (loading || !taskId || !evolinkConfig) ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? '查询中...' : '查询任务状态'}
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
          <h3>✅ 查询结果:</h3>

          <div style={{ marginBottom: '15px' }}>
            <h4>HTTP状态:</h4>
            <p><strong>状态码:</strong> {result.status}</p>
            <p><strong>状态文本:</strong> {result.statusText}</p>
          </div>

          <div>
            <h4>任务详情:</h4>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '5px',
              overflow: 'auto',
              maxHeight: '400px'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>

          {result.data && (
            <div style={{ marginTop: '15px' }}>
              <h4>任务状态解析:</h4>
              <ul>
                <li><strong>任务ID:</strong> {result.data.id}</li>
                <li><strong>模型:</strong> {result.data.model}</li>
                <li><strong>状态:</strong>
                  <span style={{
                    color: result.data.status === 'completed' ? 'green' :
                           result.data.status === 'failed' ? 'red' : 'orange'
                  }}>
                    {result.data.status}
                  </span>
                </li>
                <li><strong>进度:</strong> {result.data.progress}%</li>
                <li><strong>创建时间:</strong> {new Date(result.data.created * 1000).toLocaleString()}</li>
                {result.data.task_info && (
                  <li><strong>预估时间:</strong> {result.data.task_info.estimated_time}秒</li>
                )}
                {result.data.results && result.data.results.length > 0 && (
                  <li>
                    <strong>结果链接:</strong>
                    <ul>
                      {result.data.results.map((url: string, index: number) => (
                        <li key={index}>
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3' }}>
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '15px',
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3>📝 说明:</h3>
        <p>这个页面可以查询Evolink异步任务的状态。</p>
        <p><strong>使用方法:</strong></p>
        <ol>
          <li>输入视频生成任务返回的task_id</li>
          <li>点击"查询任务状态"</li>
          <li>查看任务的实时状态、进度和结果</li>
        </ol>
        <p><strong>任务状态说明:</strong></p>
        <ul>
          <li><strong>pending:</strong> 任务排队中，等待处理</li>
          <li><strong>processing:</strong> 任务处理中</li>
          <li><strong>completed:</strong> 任务完成，可下载视频</li>
          <li><strong>failed:</strong> 任务失败</li>
        </ul>
      </div>
    </div>
  );
}