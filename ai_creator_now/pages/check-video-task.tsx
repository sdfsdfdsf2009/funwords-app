import React, { useState, useEffect } from 'react';
import { useAPIConfigStore } from '../src/stores/apiConfigStore';
import { useProjectStore } from '../src/stores/projectStore';

export default function CheckVideoTaskPage() {
  const { configurations } = useAPIConfigStore();
  const { currentProject, addGeneratedVideo } = useProjectStore();
  const scenes = currentProject?.scenes || [];
  const [taskId, setTaskId] = useState('task-unified-1763006917-xp4neusl');
  const [loading, setLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState<any>(null);
  const [result, setResult] = useState<string>('');

  // 查找Evolink配置
  const evolinkConfig = configurations.find(config =>
    config.name.toLowerCase().includes('evolink')
  );

  const checkTaskStatus = async () => {
    if (!taskId || !evolinkConfig) {
      setResult(`❌ 缺少任务ID或Evolink配置\n任务ID: ${taskId}\nEvolink配置: ${evolinkConfig ? '找到' : '未找到'}`);
      return;
    }

    setLoading(true);
    setResult('');

    // 调试信息
    console.log('🔍 开始检查任务:', {
      taskId,
      configName: evolinkConfig.name,
      configType: evolinkConfig.type,
      isActive: evolinkConfig.isActive,
      headersCount: evolinkConfig.headers?.length || 0
    });

    try {
      // 直接调用Evolink官方API查询任务状态
      // 从配置中提取API密钥
      const authHeader = evolinkConfig.headers?.find((h: any) => h.key === 'Authorization' && h.enabled);
      if (!authHeader || !authHeader.value) {
        throw new Error('配置中未找到有效的Authorization头部');
      }

      const apiKey = authHeader.value.replace(/^Bearer\s+/, '');

      console.log('🔍 直接调用Evolink API:', {
        taskId,
        apiKey: apiKey.substring(0, 10) + '...'
      });

      // 创建请求头，避免编码问题
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('Authorization', `Bearer ${apiKey}`);

      const response = await fetch(`https://api.evolink.ai/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: headers
      });

      console.log('🔍 API响应状态:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      let responseText = '';
      try {
        responseText = await response.text();
        console.log('🔍 响应内容长度:', responseText.length);
        console.log('🔍 响应内容预览:', responseText.substring(0, 200));

        if (!responseText) {
          throw new Error('API返回空响应');
        }
      } catch (textError) {
        console.error('❌ 读取响应失败:', textError);
        throw new Error(`无法读取响应内容: ${textError instanceof Error ? textError.message : '未知错误'}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON解析失败，响应内容:', responseText);
        throw new Error(`JSON解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
      }
      setTaskStatus(data);

      console.log('📊 任务状态:', data);

      if (response.ok && data.status === 'completed' && data.results && data.results.length > 0) {
        // 任务完成，添加视频到系统
        const videoUrl = data.results[0];

        // 找到第一个场景
        const firstScene = scenes?.[0];
        if (firstScene) {
          const newVideo = {
            id: data.id,
            url: videoUrl,
            thumbnailUrl: videoUrl, // 临时使用视频URL作为缩略图
            provider: 'Evolink (自动检查)',
            sourceImageId: '',
            prompt: '自动检查任务',
            settings: {
              duration: 8,
              fps: 30,
              quality: 'high' as const,
              motionIntensity: 'medium' as const,
              motionStrength: 'medium' as const,
              style: 'realistic' as const,
              aspectRatio: '16:9' as const,
              promptEnhancement: true
            },
            metadata: {
              duration: 8,
              format: 'mp4',
              fileSize: 5242880,
              dimensions: { width: 1280, height: 720 },
              fps: 30,
              generationTime: 120,
              cost: 0.05
            },
            createdAt: new Date()
          };

          addGeneratedVideo(firstScene.id, newVideo);
          setResult(`✅ 视频已自动添加到场景 ${firstScene.sceneNumber}: ${firstScene.id}`);
        } else {
          setResult('✅ 任务已完成，但没有找到场景');
        }
      } else if (data.status === 'pending' || data.status === 'processing') {
        setResult(`⏳ 任务进行中: ${data.status} (进度: ${data.progress}%)`);
      } else if (data.status === 'failed') {
        setResult(`❌ 任务失败: ${data.error?.message || '未知错误'}`);
      } else {
        setResult(`ℹ️ 任务状态: ${data.status}`);
      }

    } catch (error) {
      console.error('检查任务失败:', error);
      if (error instanceof Error) {
        setResult(`❌ 检查失败: ${error.message}`);
      } else {
        setResult(`❌ 检查失败: 未知错误`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动检查一次
  useEffect(() => {
    checkTaskStatus();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 自动检查视频任务</h1>

      {evolinkConfig ? (
        <div style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #00ff00',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>✅ 找到Evolink API配置</h3>
          <p><strong>配置名称:</strong> {evolinkConfig.name}</p>
          <p><strong>配置类型:</strong> {evolinkConfig.type}</p>
          <p><strong>配置状态:</strong> {evolinkConfig.isActive ? '激活' : '未激活'}</p>
          <p><strong>说明:</strong> 从此配置中提取API密钥来查询视频任务状态</p>
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '8px',
            borderRadius: '4px',
            marginTop: '10px',
            fontSize: '14px'
          }}>
            📝 <strong>注意:</strong> 页面将直接调用 Evolink 官方 API (<code>https://api.evolink.ai/v1/tasks/{taskId}</code>) 查询任务状态，不使用配置中的代理端点
          </div>
          <details style={{ marginTop: '10px' }}>
            <summary>查看配置详情</summary>
            <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(evolinkConfig, null, 2)}
            </pre>
          </details>
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
          <p>找到的配置数量: {configurations.length}</p>
          <ul>
            {configurations.map((config, index) => (
              <li key={index}>{config.name} ({config.type})</li>
            ))}
          </ul>
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
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? '检查中...' : '检查任务状态'}
      </button>

      {result && (
        <div style={{
          backgroundColor: result.includes('✅') ? '#e8f5e8' :
                        result.includes('❌') ? '#ffe8e8' :
                        result.includes('⏳') ? '#fff3cd' : '#e8f4ff',
          border: `1px solid ${result.includes('✅') ? '#00ff00' :
                              result.includes('❌') ? '#ff0000' :
                              result.includes('⏳') ? '#ffc107' : '#0070f3'}`,
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>{result.includes('✅') ? '✅ 成功' :
                  result.includes('❌') ? '❌ 错误' :
                  result.includes('⏳') ? '⏳ 进行中' : 'ℹ️ 信息'}:</h3>
          <p>{result}</p>
        </div>
      )}

      {taskStatus && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>📊 任务详情:</h3>
          <pre style={{
            backgroundColor: '#ffffff',
            padding: '10px',
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '300px',
            fontSize: '12px'
          }}>
            {JSON.stringify(taskStatus, null, 2)}
          </pre>
        </div>
      )}

      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '15px',
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3>🚀 自动操作说明:</h3>
        <p>这个页面会自动检查Evolink任务状态，如果视频已完成，会自动添加到系统中。</p>
        <ul>
          <li>✅ 页面加载时自动检查任务状态</li>
          <li>✅ 如果任务完成，自动提取视频URL</li>
          <li>✅ 自动添加到第一个可用场景</li>
          <li>✅ 显示详细的任务状态信息</li>
        </ul>
        <p><strong>使用方法:</strong></p>
        <ol>
          <li>页面会自动检查默认任务ID</li>
          <li>如果需要检查其他任务，修改任务ID后点击"检查任务状态"</li>
          <li>如果任务完成，视频会自动添加到系统</li>
          <li>然后可以到视频生成页面查看和播放</li>
        </ol>
      </div>
    </div>
  );
}