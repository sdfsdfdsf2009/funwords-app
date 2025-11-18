import React from 'react';
import Head from 'next/head';
import { ErrorTrigger } from '../src/skills/SimpleSkillExample';
import { SkillStatusMonitor } from '../src/skills/SimpleSkillExample';

export default function SkillDemo() {
  return (
    <>
      <Head>
        <title>错误调试技能演示</title>
        <meta name="description" content="演示AI驱动的错误调试技能" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🔧 错误调试技能
            </h1>
            <p className="text-xl text-gray-600">
              当用户提到错误、bug等问题时，先找调试专家进行错误调试，找出错误，开发专家修正后，找测试专家进行测试
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  🎯 触发错误测试
                </h2>
                <p className="text-gray-600 mb-6">
                  点击下面的按钮来触发不同类型的错误，观察AI专家如何分析和解决问题
                </p>
                <ErrorTrigger />
              </div>

              <div className="mt-6 bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  💡 技能说明
                </h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex items-start space-x-2">
                    <span>🔍</span>
                    <div>
                      <strong>调试专家</strong> - 分析错误根本原因，提供诊断建议
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span>👨‍💻</span>
                    <div>
                      <strong>开发专家</strong> - 基于诊断结果制定修复方案
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span>🧪</span>
                    <div>
                      <strong>测试专家</strong> - 验证修复效果，确保质量
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span>📦</span>
                    <div>
                      <strong>产品专家</strong> - 评估是否偏离产品需求
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span>💡</span>
                    <div>
                      <strong>智能建议</strong> - 综合四专家意见，给出最终建议
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  📊 技能状态监控
                </h2>
                <p className="text-gray-600 mb-6">
                  实时查看技能的执行状态、专家分析结果和最终建议
                </p>
                <SkillStatusMonitor />
              </div>

              <div className="mt-6 bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  ✨ 特性
                </h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>• 自动检测和处理应用错误</li>
                  <li>• 智能错误分类和严重性评估</li>
                  <li>• 三阶段专家协作（调试→开发→测试）</li>
                  <li>• 实时状态监控和进度跟踪</li>
                  <li>• 基于AI的智能建议生成</li>
                  <li>• 完整的错误处理工作流</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              📖 使用方法
            </h2>
            <div className="prose max-w-none text-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 mt-6">在现有项目中使用</h3>
              <div className="bg-gray-100 rounded p-4 mt-2">
                <pre className="text-sm overflow-x-auto">
{`import { errorDebuggingSkill } from '../src/skills/ErrorDebuggingSkill';

// 手动触发技能
errorDebuggingSkill.detectAndStart(error);

// Hook方式
import { useErrorDebuggingSkill } from '../src/skills/ErrorDebuggingSkill';
const { handleError } = useErrorDebuggingSkill();`}
                </pre>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mt-6">自动集成</h3>
              <p>系统会自动监听全局错误和Promise拒绝，自动启动技能处理。</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}