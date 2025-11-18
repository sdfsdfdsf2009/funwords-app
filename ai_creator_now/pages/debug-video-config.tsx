import React, { useEffect, useState } from 'react';
import { useAPIConfigStore } from '../src/stores/apiConfigStore';

export default function DebugConfigPage() {
  const { configurations, selectedConfigId, updateConfiguration } = useAPIConfigStore();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeConfigs = () => {
    console.log('🔍 开始配置分析...');

    const analysis = {
      totalConfigs: configurations.length,
      selectedConfigId,
      configs: configurations.map(config => {
        const isActive = config.isActive;
        const isVideoType = config.type === 'video' || config.type === 'both';
        const hasVideoInName = config.name.toLowerCase().includes('video') ||
                             config.name.toLowerCase().includes('视频');
        const hasVideoInEndpoint = config.endpoint.toLowerCase().includes('video') ||
                                  config.endpoint.toLowerCase().includes('videos');
        const hasEvolinkInName = config.name.toLowerCase().includes('evolink');
        const hasVeonInEndpoint = config.endpoint.toLowerCase().includes('veo');

        const shouldInclude = (isActive && (isVideoType || hasVideoInName || hasVideoInEndpoint || hasEvolinkInName || hasVeonInEndpoint)) ||
                             hasVideoInName ||
                             hasEvolinkInName ||
                             (hasVeonInEndpoint && hasEvolinkInName);

        return {
          id: config.id,
          name: config.name,
          type: config.type,
          isActive: config.isActive,
          endpoint: config.endpoint,
          isVideoConfig: shouldInclude,
          reasons: {
            isActive,
            isVideoType,
            hasVideoInName,
            hasVideoInEndpoint,
            hasEvolinkInName,
            hasVeonInEndpoint
          }
        };
      }),
      videoConfigs: configurations.filter(config => {
        const isActive = config.isActive;
        const isVideoType = config.type === 'video' || config.type === 'both';
        const hasVideoInName = config.name.toLowerCase().includes('video') ||
                             config.name.toLowerCase().includes('视频');
        const hasEvolinkInName = config.name.toLowerCase().includes('evolink');
        const hasVeonInEndpoint = config.endpoint.toLowerCase().includes('veo');

        return (isActive && (isVideoType || hasVideoInName || hasEvolinkInName || hasVeonInEndpoint)) ||
               hasVideoInName ||
               hasEvolinkInName ||
               (hasVeonInEndpoint && hasEvolinkInName);
      })
    };

    setDebugInfo(analysis);
    console.log('📊 配置分析结果:', analysis);
    return analysis;
  };

  const fixConfigs = async () => {
    setLoading(true);
    console.log('🔧 开始修复配置...');

    const configsToFix = configurations.filter(config => {
      const hasEvolinkInName = config.name.toLowerCase().includes('evolink');
      return hasEvolinkInName && (!config.isActive || config.type === 'image');
    });

    for (const config of configsToFix) {
      console.log('修复配置:', config.name);
      await updateConfiguration(config.id, {
        ...config,
        isActive: true,
        type: 'both',
        updatedAt: new Date()
      });
    }

    setLoading(false);
    console.log('✅ 配置修复完成！');
    analyzeConfigs(); // 重新分析
  };

  useEffect(() => {
    analyzeConfigs();
  }, [configurations]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 视频配置调试工具</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={analyzeConfigs}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          重新分析配置
        </button>

        <button
          onClick={fixConfigs}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '修复中...' : '一键修复Evolink配置'}
        </button>
      </div>

      {debugInfo && (
        <div>
          <h2>📊 配置分析结果</h2>
          <p>总配置数量: {debugInfo.totalConfigs}</p>
          <p>视频配置数量: {debugInfo.videoConfigs.length}</p>
          <p>当前选中配置ID: {debugInfo.selectedConfigId || '未选中'}</p>

          <h3>📋 所有配置详情</h3>
          {debugInfo.configs.map((config: any, index: number) => (
            <div
              key={config.id}
              style={{
                border: '1px solid #ddd',
                padding: '10px',
                margin: '10px 0',
                borderRadius: '5px',
                backgroundColor: config.isVideoConfig ? '#e8f5e8' : '#ffe8e8'
              }}
            >
              <h4>配置 {index + 1}: {config.name}</h4>
              <p><strong>ID:</strong> {config.id}</p>
              <p><strong>类型:</strong> {config.type}</p>
              <p><strong>状态:</strong> {config.isActive ? '激活' : '未激活'}</p>
              <p><strong>端点:</strong> {config.endpoint}</p>
              <p><strong>是否为视频配置:</strong> {config.isVideoConfig ? '✅ 是' : '❌ 否'}</p>

              <details>
                <summary>匹配条件分析</summary>
                <ul>
                  <li>激活状态: {config.reasons.isActive ? '✅' : '❌'}</li>
                  <li>视频类型: {config.reasons.isVideoType ? '✅' : '❌'}</li>
                  <li>名称含"视频": {config.reasons.hasVideoInName ? '✅' : '❌'}</li>
                  <li>端点含"video": {config.reasons.hasVideoInEndpoint ? '✅' : '❌'}</li>
                  <li>名称含"evolink": {config.reasons.hasEvolinkInName ? '✅' : '❌'}</li>
                  <li>端点含"veo": {config.reasons.hasVeonInEndpoint ? '✅' : '❌'}</li>
                </ul>
              </details>
            </div>
          ))}

          <h3>🎥 视频配置列表</h3>
          {debugInfo.videoConfigs.length > 0 ? (
            debugInfo.videoConfigs.map((config: any, index: number) => (
              <div key={config.id} style={{
                border: '1px solid #28a745',
                padding: '10px',
                margin: '10px 0',
                borderRadius: '5px',
                backgroundColor: '#e8f5e8'
              }}>
                <h4>✅ 视频配置 {index + 1}: {config.name}</h4>
                <p><strong>类型:</strong> {config.type}</p>
                <p><strong>状态:</strong> {config.isActive ? '激活' : '未激活'}</p>
              </div>
            ))
          ) : (
            <p style={{ color: 'red' }}>❌ 未找到可用的视频配置</p>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>🚀 使用说明</h3>
        <ol>
          <li>点击"重新分析配置"查看当前配置状态</li>
          <li>如果找到Evolink配置但状态不正确，点击"一键修复Evolink配置"</li>
          <li>修复后返回视频生成页面重新尝试</li>
        </ol>

        <h3>🔧 手动修复步骤</h3>
        <p>如果自动修复无效，请手动进入API配置页面：</p>
        <ul>
          <li>找到名称包含"evolink"的配置</li>
          <li>确保 `isActive` 设置为 `true`</li>
          <li>确保 `type` 设置为 `video` 或 `both`</li>
        </ul>
      </div>
    </div>
  );
}