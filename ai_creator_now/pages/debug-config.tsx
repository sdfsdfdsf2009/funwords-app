import { GetServerSideProps } from 'next';
import { useAPIConfigStore } from '@/stores/apiConfigStore';

export default function DebugConfig() {
  const { configurations } = useAPIConfigStore();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API配置调试信息</h1>

      <h2>所有配置：</h2>
      {configurations.map((config, index) => (
        <div key={config.id} style={{
          border: '1px solid #ccc',
          padding: '10px',
          margin: '10px 0',
          backgroundColor: config.isActive ? '#e8f5e8' : '#ffebee'
        }}>
          <h3>配置 #{index + 1}: {config.name}</h3>
          <p><strong>ID:</strong> {config.id}</p>
          <p><strong>类型:</strong> {config.type}</p>
          <p><strong>端点:</strong> {config.endpoint}</p>
          <p><strong>方法:</strong> {config.method}</p>
          <p><strong>状态:</strong> {config.isActive ? '启用' : '禁用'}</p>

          <h4>请求头:</h4>
          <pre>{JSON.stringify(config.headers, null, 2)}</pre>

          <h4>响应解析器:</h4>
          <pre>{JSON.stringify(config.responseParser, null, 2)}</pre>

          <h4>请求模板:</h4>
          <pre>{config.requestTemplate.template}</pre>
        </div>
      ))}

      <h2>当前选择的配置ID:</h2>
      <p>请在图片生成页面查看当前选择的配置</p>

      <button
        onClick={() => window.location.href = '/'}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        返回主页
      </button>
    </div>
  );
}