import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../src/stores/projectStore';
import { useAPIConfigStore } from '../src/stores/apiConfigStore';

export default function DataCheckPage() {
  const { projects, currentProject } = useProjectStore();
  const { configurations } = useAPIConfigStore();
  const [localStorageData, setLocalStorageData] = useState<any>({});

  useEffect(() => {
    // 检查所有localStorage数据
    const data: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        try {
          data[key] = JSON.parse(value || '{}');
        } catch {
          data[key] = value;
        }
      }
    }
    setLocalStorageData(data);
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 数据检查页面</h1>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h2>📊 应用状态</h2>
        <p><strong>项目数量:</strong> {projects.length}</p>
        <p><strong>当前项目:</strong> {currentProject?.name || '无'}</p>
        <p><strong>当前项目场景数:</strong> {currentProject?.scenes?.length || 0}</p>
        <p><strong>API配置数量:</strong> {configurations.length}</p>
      </div>

      <div style={{
        backgroundColor: '#fff3cd',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ffc107'
      }}>
        <h2>🗂️ localStorage内容</h2>
        <p><strong>存储项数量:</strong> {Object.keys(localStorageData).length}</p>

        {Object.entries(localStorageData).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '10px' }}>
            <strong>{key}:</strong>
            {typeof value === 'object' ? (
              <div style={{ marginLeft: '20px', fontSize: '14px' }}>
                {key.includes('project') && (
                  <>
                    <p>项目数量: {(value as any)?.state?.projects?.length || (value as any)?.projects?.length || 0}</p>
                    {(value as any).state?.currentProject && (
                      <p>当前项目: {(value as any).state.currentProject.name} ({(value as any).state.currentProject.scenes?.length || 0} 场景)</p>
                    )}
                  </>
                )}
                {key.includes('api') && (
                  <>
                    <p>配置数量: {(value as any)?.state?.configurations?.length || (value as any)?.configurations?.length || 0}</p>
                  </>
                )}
              </div>
            ) : (
              <span style={{ marginLeft: '10px', fontSize: '12px' }}>{String(value).substring(0, 100)}...</span>
            )}
          </div>
        ))}
      </div>

      {currentProject && (
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #28a745'
        }}>
          <h2>📋 当前项目详情</h2>
          <h3>{currentProject.name}</h3>
          <p><strong>场景数量:</strong> {currentProject.scenes?.length || 0}</p>

          {currentProject.scenes && currentProject.scenes.length > 0 && (
            <div>
              <h4>场景列表:</h4>
              <ol>
                {currentProject.scenes.map((scene, idx) => (
                  <li key={scene.id}>
                    <strong>场景 {scene.sceneNumber}:</strong> {(scene as any).description || (scene as any).title || '无标题'}
                    <span style={{ marginLeft: '10px', color: '#666' }}>
                      ({scene.images?.length || 0} 张图片)
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {projects.length > 0 && !currentProject && (
        <div style={{
          backgroundColor: '#ffe8e8',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #dc3545'
        }}>
          <h2>⚠️ 有项目但未选中当前项目</h2>
          <h3>可用项目:</h3>
          <ul>
            {projects.map(project => (
              <li key={project.id}>
                {project.name} ({project.scenes?.length || 0} 场景)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{
        backgroundColor: '#e8f4ff',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #0070f3'
      }}>
        <h2>🔧 操作建议</h2>
        {projects.length === 0 ? (
          <p>❌ 没有找到任何项目数据。你可能需要重新导入CSV文件或从备份恢复。</p>
        ) : !currentProject ? (
          <p>⚠️ 有项目数据但没有选中当前项目。请到项目选择器中选择一个项目。</p>
        ) : currentProject.scenes?.length === 0 ? (
          <p>⚠️ 当前项目没有场景。请导入CSV数据来创建场景。</p>
        ) : (
          <p>✅ 数据看起来正常！你有 {currentProject.scenes.length} 个场景。</p>
        )}

        <div style={{ marginTop: '10px' }}>
          <a href="/" style={{
            background: '#0070f3',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            textDecoration: 'none',
            marginRight: '10px'
          }}>
            返回主页
          </a>
          <a href="/data-recovery.html" style={{
            background: '#28a745',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            textDecoration: 'none'
          }}>
            数据恢复工具
          </a>
        </div>
      </div>
    </div>
  );
}