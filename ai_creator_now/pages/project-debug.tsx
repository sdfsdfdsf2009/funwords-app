import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../src/stores/projectStore';

export default function ProjectDebugPage() {
  const { currentProject, projects } = useProjectStore();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  useEffect(() => {
    // 确保store已正确hydration
    if (typeof window !== 'undefined') {
      useProjectStore.persist.rehydrate();

      // 检查localStorage数据
      try {
        const stored = localStorage.getItem('project-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          setLocalStorageData(parsed);
        }
      } catch (error) {
        console.error('localStorage读取失败:', error);
      }
    }

    // 收集调试信息
    setDebugInfo({
      hasCurrentProject: !!currentProject,
      currentProjectName: currentProject?.name,
      currentProjectScenes: currentProject?.scenes?.length || 0,
      allProjectsCount: projects?.length || 0,
      allProjectNames: projects?.map(p => p.name) || [],
      scenes: currentProject?.scenes?.map(scene => ({
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        hasGeneratedVideo: !!scene.generatedVideo,
        generatedVideosCount: scene.generatedVideos?.length || 0,
        totalVideos: (scene.generatedVideos ? scene.generatedVideos.length : 0) + (scene.generatedVideo ? 1 : 0)
      })) || []
    });
  }, [currentProject, projects]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 项目数据调试页面</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>📊 Store 状态</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {localStorageData && (
        <div style={{ marginBottom: '20px' }}>
          <h2>💾 localStorage 数据</h2>
          <pre style={{ backgroundColor: '#e8f4fd', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify({
              hasData: !!localStorageData,
              hasState: !!localStorageData.state,
              currentProjectName: localStorageData.state?.currentProject?.name,
              projectsCount: localStorageData.state?.projects?.length || 0
            }, null, 2)}
          </pre>
        </div>
      )}

      {currentProject?.scenes && (
        <div style={{ marginBottom: '20px' }}>
          <h2>🎬 场景视频详情</h2>
          {currentProject.scenes.map((scene, index) => {
            const videos = scene.generatedVideos || (scene.generatedVideo ? [scene.generatedVideo] : []);
            return (
              <div key={scene.id} style={{
                border: '1px solid #ddd',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '5px'
              }}>
                <h3>场景 {scene.sceneNumber} (ID: {scene.id})</h3>
                <p><strong>视频总数:</strong> {videos.length}</p>
                {videos.map((video, videoIndex) => (
                  <div key={videoIndex} style={{
                    backgroundColor: '#f9f9f9',
                    padding: '8px',
                    margin: '5px 0',
                    borderRadius: '3px'
                  }}>
                    <p><strong>视频 {videoIndex + 1}:</strong></p>
                    <p>ID: {video.id}</p>
                    <p>URL: {video.url?.substring(0, 100)}...</p>
                    <p>Prompt: {video.prompt}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2>🔧 测试按钮</h2>
        <button
          onClick={() => {
            console.log('当前项目:', currentProject);
            console.log('所有项目:', projects);
            console.log('localStorage:', localStorageData);
            alert('请查看浏览器控制台');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          输出调试信息到控制台
        </button>
      </div>

      <div>
        <h2>🔗 快速链接</h2>
        <ul>
          <li><a href="/" style={{ color: '#0070f3' }}>返回主页</a></li>
          <li><a href="/remotion-editor" style={{ color: '#0070f3' }}>Remotion编辑器</a></li>
          <li><a href="/test-remotion" style={{ color: '#0070f3' }}>Remotion测试</a></li>
        </ul>
      </div>
    </div>
  );
}