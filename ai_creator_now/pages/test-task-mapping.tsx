import { NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useState } from 'react';

const TestTaskMapping: NextPage = () => {
  const [result, setResult] = useState<{ message: string; type: string }>({
    message: '',
    type: 'info'
  });

  const showResult = (message: string, type = 'info') => {
    setResult({ message, type });
  };

  const testSpecificTask = async () => {
    const taskId = 'task-unified-1763010650-rd7uj8zg';
    showResult(`🔍 测试任务映射系统...\n\n任务ID: ${taskId}`, 'info');

    try {
      // 首先检查我们是否能从主应用获取任务配置映射
      console.log('📋 检查任务配置映射...');

      // 尝试通过本地存储获取任务信息
      const taskConfigsKey = 'video-task-configs';
      const storedConfigs = localStorage.getItem(taskConfigsKey);

      let message = `🔍 任务映射系统测试\n\n`;
      message += `任务ID: ${taskId}\n\n`;

      if (storedConfigs) {
        try {
          const configs = JSON.parse(storedConfigs);
          message += `✅ 找到存储的任务配置映射\n`;
          message += `存储的配置数量: ${Object.keys(configs).length}\n\n`;

          if (configs[taskId]) {
            message += `✅ 找到任务 ${taskId} 的配置信息\n`;
            message += `配置名称: ${configs[taskId].name}\n`;
            message += `配置端点: ${configs[taskId].endpoint}\n`;
            message += `API密钥前缀: ${configs[taskId].apiKey ? configs[taskId].apiKey.substring(0, 10) + '...' : 'N/A'}\n\n`;
          } else {
            message += `❌ 未找到任务 ${taskId} 的配置信息\n\n`;
          }
        } catch (parseError) {
          message += `❌ 解析存储配置失败: ${(parseError as Error).message}\n\n`;
        }
      } else {
        message += `⚠️ 未找到存储的任务配置映射\n`;
        message += `这可能意味着:\n`;
        message += `1. 主应用还未生成任务\n`;
        message += `2. 映射数据存储在其他位置\n`;
        message += `3. 数据已被清理\n\n`;
      }

      // 现在尝试通过代理API检查任务状态
      message += `🔄 通过代理API检查任务状态...\n`;
      showResult(message, 'info');

      const proxyResponse = await fetch(`/api/evolink/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const proxyData = await proxyResponse.text();

      let finalMessage = message;
      finalMessage += `\n📡 代理API响应:\n`;
      finalMessage += `状态码: ${proxyResponse.status}\n`;
      finalMessage += `状态文本: ${proxyResponse.statusText}\n`;
      finalMessage += `响应长度: ${proxyData.length} 字符\n`;

      if (proxyData.length > 0) {
        try {
          const parsedData = JSON.parse(proxyData);
          finalMessage += `\n✅ JSON解析成功\n`;
          finalMessage += `任务状态: ${parsedData.status}\n`;
          finalMessage += `进度: ${parsedData.progress}%\n`;
          finalMessage += `模型: ${parsedData.model}\n`;

          if (parsedData.results && parsedData.results.length > 0) {
            finalMessage += `\n🎬 视频已生成!\n`;
            finalMessage += `视频链接: ${parsedData.results[0]}\n`;
          }

          // 检查是否是403错误
          if (proxyResponse.status === 403) {
            finalMessage += `\n❌ 仍然遇到403权限错误\n`;
            finalMessage += `这表明任务映射系统可能还未完全解决问题\n`;
          } else if (proxyResponse.status === 200) {
            finalMessage += `\n✅ 任务状态查询成功!\n`;
            finalMessage += `这表明任务映射系统正在正常工作\n`;
          }

        } catch (parseError) {
          finalMessage += `\n❌ JSON解析失败: ${(parseError as Error).message}\n`;
          finalMessage += `原始响应: ${proxyData.substring(0, 500)}...\n`;
        }
      } else {
        finalMessage += `\n❌ API返回空响应\n`;
      }

      showResult(finalMessage, proxyResponse.ok ? 'success' : 'error');

    } catch (error) {
      showResult(`❌ 测试失败\n\n错误: ${(error as Error).message}\n\n堆栈:\n${(error as Error).stack}`, 'error');
    }
  };

  const checkSystemStatus = () => {
    showResult(`🔍 检查系统状态...`, 'info');

    try {
      let message = `📊 系统状态检查\n\n`;

      // 检查本地存储中的视频
      const videos = JSON.parse(localStorage.getItem('aiCreatorVideos') || '[]');
      message += `📹 本地存储的视频数量: ${videos.length}\n`;

      if (videos.length > 0) {
        message += `\n最近的视频:\n`;
        videos.slice(-3).forEach((video: any, index: number) => {
          message += `${index + 1}. ${video.prompt || '无描述'} (${video.provider})\n`;
          message += `   任务ID: ${video.taskId || 'N/A'}\n`;
          message += `   状态: ${video.metadata?.status || '未知'}\n`;
        });
      }

      // 检查任务配置映射
      const taskConfigsKey = 'video-task-configs';
      const taskConfigs = localStorage.getItem(taskConfigsKey);
      message += `\n🗺️ 任务配置映射: ${taskConfigs ? '已存储' : '未存储'}\n`;

      if (taskConfigs) {
        try {
          const configs = JSON.parse(taskConfigs);
          message += `映射数量: ${Object.keys(configs).length}\n`;
        } catch (e) {
          message += `映射数据解析失败\n`;
        }
      }

      // 检查API配置
      const apiConfigs = localStorage.getItem('api-configurations');
      message += `\n⚙️ API配置: ${apiConfigs ? '已存储' : '未存储'}\n`;

      if (apiConfigs) {
        try {
          const configs = JSON.parse(apiConfigs);
          const videoConfigs = configs.filter((config: any) =>
            config.type === 'video' ||
            config.type === 'both' ||
            config.name.toLowerCase().includes('video') ||
            config.name.toLowerCase().includes('evolink')
          );
          message += `视频相关配置数量: ${videoConfigs.length}\n`;
        } catch (e) {
          message += `API配置解析失败\n`;
        }
      }

      showResult(message, 'success');

    } catch (error) {
      showResult(`❌ 系统状态检查失败: ${(error as Error).message}`, 'error');
    }
  };

  const clearTestData = () => {
    if (confirm('确定要清理所有测试数据吗？这将删除本地存储的所有视频和任务映射。')) {
      localStorage.removeItem('aiCreatorVideos');
      localStorage.removeItem('video-task-configs');
      showResult('🧹 测试数据已清理', 'info');
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const getContainerClass = () => {
    const baseClass = 'result ';
    switch (result.type) {
      case 'success':
        return baseClass + 'success';
      case 'error':
        return baseClass + 'error';
      default:
        return baseClass + 'info';
    }
  };

  return (
    <>
      <Head>
        <title>测试任务映射系统</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
          }
          .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .info {
            background: #e2e3e5;
            color: #383d41;
            border: 1px solid #d6d8db;
          }
          button {
            background: #0070f3;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
            margin-bottom: 10px;
          }
          button:hover {
            background: #0056b3;
          }
        `}</style>
      </Head>

      <div className="container">
        <h1>🧪 测试任务映射系统</h1>

        <div className="info" style={{
          background: '#e2e3e5',
          color: '#383d41',
          padding: '15px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #d6d8db'
        }}>
          <h3>📋 测试目标:</h3>
          <p>验证我们修复的任务到配置映射系统是否能正确工作，确保使用相同的API密钥进行任务状态查询。</p>
        </div>

        <button onClick={testSpecificTask}>
          测试最新任务: task-unified-1763010650-rd7uj8zg
        </button>
        <button onClick={checkSystemStatus}>
          检查系统状态
        </button>
        <button onClick={clearTestData}>
          清理测试数据
        </button>

        <div className={getContainerClass()}>
          {result.message}
        </div>
      </div>
    </>
  );
};

export default TestTaskMapping;