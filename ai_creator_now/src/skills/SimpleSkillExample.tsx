/**
 * 简单的技能使用示例
 * 展示如何使用错误调试技能
 */

import React, { useState, useCallback } from 'react';
import { errorDebuggingSkill, useErrorDebuggingSkill } from './ErrorDebuggingSkill';

// 简单的错误触发器组件
export function ErrorTrigger() {
  const [errorHistory, setErrorHistory] = useState<string[]>([]);

  const triggerError = useCallback((errorType: string) => {
    let error: Error;

    switch (errorType) {
      case 'api':
        error = new Error('API request failed: 500 Internal Server Error');
        break;
      case 'react':
        error = new Error('Cannot read prop "name" of undefined');
        break;
      case 'network':
        error = new Error('Network request failed: Unable to reach server');
        break;
      case 'timeout':
        error = new Error('Request timeout after 30 seconds');
        break;
      default:
        error = new Error('Unknown error occurred');
    }

    // 启动技能
    const skillId = errorDebuggingSkill.detectAndStart(error);

    if (skillId !== 'skipped' && skillId !== 'queue_full') {
      setErrorHistory(prev => [`技能启动: ${skillId} - ${error.message}`, ...prev.slice(0, 4)]);
    }
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">错误调试技能测试</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => triggerError('api')}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          触发API错误
        </button>

        <button
          onClick={() => triggerError('react')}
          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          触发React错误
        </button>

        <button
          onClick={() => triggerError('network')}
          className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          触发网络错误
        </button>

        <button
          onClick={() => triggerError('timeout')}
          className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          触发超时错误
        </button>
      </div>

      {errorHistory.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">错误历史:</h4>
          <div className="space-y-1">
            {errorHistory.map((entry, index) => (
              <div key={index} className="text-sm text-gray-600 p-2 bg-gray-100 rounded">
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 状态监控组件
export function SkillStatusMonitor() {
  const { skills, stats, cleanup, isRunning } = useErrorDebuggingSkill();

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">技能状态监控</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm text-gray-600">
            {isRunning ? '运行中' : '空闲'}
          </span>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-xs text-gray-600">进行中</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-600">已完成</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-gray-600">失败</div>
          </div>
        </div>
      )}

      {skills.size > 0 && (
        <div>
          <h4 className="font-medium mb-2">活跃技能:</h4>
          <div className="space-y-2">
            {Array.from(skills.entries()).map(([skillId, skill]) => (
              <div key={skillId} className="text-sm p-2 border rounded">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{skillId}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    skill.stage === 'completed' ? 'bg-green-100 text-green-800' :
                    skill.stage === 'failed' ? 'bg-red-100 text-red-800' :
                    skill.stage === 'product' ? 'bg-pink-100 text-pink-800' :
                    skill.stage === 'test' ? 'bg-orange-100 text-orange-800' :
                    skill.stage === 'dev' ? 'bg-blue-100 text-blue-800' :
                    skill.stage === 'debug' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {skill.stage}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {skill.originalError.message}
                </div>
                {skill.finalRecommendation && (
                  <div className="text-xs text-blue-600 mt-1 italic">
                    💡 {skill.finalRecommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={cleanup}
        className="mt-4 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
      >
        清理完成的技能
      </button>
    </div>
  );
}

// 演示页面
export default function SkillDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔧 错误调试技能演示</h1>
        <p className="text-gray-600 mt-2">
          当用户提到错误、bug等问题时，先找调试专家进行错误调试，找出错误，开发专家修正后，找测试专家进行测试
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ErrorTrigger />
        <SkillStatusMonitor />
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">技能说明</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>🔍 <strong>调试专家</strong>: 分析错误根本原因，提供诊断建议</p>
          <p>👨‍💻 <strong>开发专家</strong>: 基于诊断结果制定修复方案</p>
          <p>🧪 <strong>测试专家</strong>: 验证修复效果，确保质量</p>
          <p>📦 <strong>产品专家</strong>: 评估是否偏离产品需求，确保符合用户期望</p>
          <p>💡 <strong>智能建议</strong>: 综合四专家意见，给出最终建议</p>
        </div>
      </div>
    </div>
  );
}