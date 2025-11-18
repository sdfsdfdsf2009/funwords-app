import React, { useState } from 'react';
import { useProjectStore } from '../src/stores/projectStore';
import { useAPIConfigStore } from '../src/stores/apiConfigStore';
import { GeneratedVideo } from '../src/types';

export default function AddVideoPage() {
  const { currentProject, addGeneratedVideo } = useProjectStore();
  const scenes = currentProject?.scenes || [];
  const { configurations } = useAPIConfigStore();
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('task-unified-1763006917-xp4neusl');
  const [result, setResult] = useState<string>('');

  const handleAddVideo = async () => {
    if (!selectedSceneId) {
      alert('请选择场景');
      return;
    }

    if (!videoUrl) {
      alert('请输入视频URL');
      return;
    }

    try {
      const newVideo: GeneratedVideo = {
        id: taskId,
        url: videoUrl,
        thumbnailUrl: '', // 可以后续添加
        provider: 'Evolink (手动添加)',
        sourceImageId: '',
        prompt: '手动添加的视频',
        settings: {
          duration: 8,
          fps: 30,
          quality: 'high',
          motionIntensity: 'medium',
          motionStrength: 'medium',
          style: 'realistic',
          aspectRatio: '16:9',
          promptEnhancement: true
        },
        metadata: {
          duration: 8,
          format: 'mp4',
          fileSize: 5242880,
          dimensions: { width: 1280, height: 720 },
          fps: 30,
          generationTime: 120
        },
        createdAt: new Date()
      };

      addGeneratedVideo(selectedSceneId, newVideo);
      setResult(`✅ 视频已成功添加到场景 ${selectedSceneId}`);

      // 清空表单
      setVideoUrl('');
      setTaskId('');

    } catch (error) {
      console.error('添加视频失败:', error);
      setResult(`❌ 添加失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🎬 手动添加视频</h1>

      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #16a34a',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h3>📋 使用说明:</h3>
        <p>这个页面用于手动添加已经在Evolink官网生成的视频URL到系统中。</p>
        <ol>
          <li>从Evolink官网复制生成的视频URL</li>
          <li>选择要添加视频的场景</li>
          <li>输入视频URL和任务ID</li>
          <li>点击"添加视频"</li>
        </ol>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="scene-select" style={{ display: 'block', marginBottom: '5px' }}>
          <strong>选择场景:</strong>
        </label>
        <select
          id="scene-select"
          value={selectedSceneId}
          onChange={(e) => setSelectedSceneId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        >
          <option value="">请选择场景</option>
          {scenes?.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {`场景 ${scene.sceneNumber}`}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <strong>任务ID:</strong>
        </label>
        <input
          type="text"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="输入任务ID (可选)"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px',
            marginBottom: '10px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <strong>视频URL:</strong>
        </label>
        <textarea
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="粘贴从Evolink官网复制的视频URL"
          rows={4}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      <button
        onClick={handleAddVideo}
        disabled={!selectedSceneId || !videoUrl}
        style={{
          padding: '10px 20px',
          backgroundColor: (!selectedSceneId || !videoUrl) ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: (!selectedSceneId || !videoUrl) ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        添加视频
      </button>

      {result && (
        <div style={{
          backgroundColor: result.includes('✅') ? '#e8f5e8' : '#ffe8e8',
          border: `1px solid ${result.includes('✅') ? '#00ff00' : '#ff0000'}`,
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>{result.includes('✅') ? '✅ 成功' : '❌ 错误'}:</h3>
          <p>{result}</p>
        </div>
      )}

      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '15px',
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3>🔍 调试信息:</h3>
        <p><strong>当前项目:</strong> {currentProject?.name || '未加载'}</p>
        <p><strong>场景数量:</strong> {scenes.length}</p>
        <p><strong>API配置数量:</strong> {configurations?.length || 0}</p>

        {scenes.length > 0 && (
          <details>
            <summary>查看所有场景</summary>
            <ul>
              {scenes.map((scene, index) => (
                <li key={scene.id}>
                  <strong>{index + 1}. 场景 {scene.sceneNumber}</strong>
                  <br />
                  ID: {scene.id}
                  <br />
                  图片数量: {scene.images?.length || 0}
                  <br />
                  已有视频: {scene.generatedVideo ? '是' : '否'}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}