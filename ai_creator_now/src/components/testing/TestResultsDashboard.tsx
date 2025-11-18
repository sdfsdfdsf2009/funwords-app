/**
 * Test Results Dashboard - 显示测试结果的面板
 */

import React, { useState } from 'react';
import { TestResult, OverallTestResults } from './Phase4TestingSuite';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  Users,
  BarChart3,
  Smartphone,
  GitBranch,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface TestResultsDashboardProps {
  testResults: OverallTestResults;
  onRunFullTests: () => void;
  onRunCategoryTests: (category: string) => void;
  onExportReport: () => void;
  onRerunFailed: () => void;
  isRunning: boolean;
  currentTest: string | null;
  progress: number;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const TestResultsDashboard: React.FC<TestResultsDashboardProps> = ({
  testResults,
  onRunFullTests,
  onRunCategoryTests,
  onExportReport,
  onRerunFailed,
  isRunning,
  currentTest,
  progress,
  selectedCategory,
  onCategoryChange
}) => {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  // 获取分类信息
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'aiRecommendationEngine':
        return {
          name: 'AI推荐引擎',
          icon: <Activity className="w-5 h-5 text-blue-600" />,
          color: 'blue',
          description: '智能推荐系统测试'
        };
      case 'collaborationHub':
        return {
          name: '协作中心',
          icon: <Users className="w-5 h-5 text-purple-600" />,
          color: 'purple',
          description: '实时协作功能测试'
        };
      case 'analyticsDashboard':
        return {
          name: '分析仪表板',
          icon: <BarChart3 className="w-5 h-5 text-indigo-600" />,
          color: 'indigo',
          description: '数据分析与可视化测试'
        };
      case 'mobileOptimizedInterface':
        return {
          name: '移动端优化',
          icon: <Smartphone className="w-5 h-5 text-green-600" />,
          color: 'green',
          description: '移动端适配与性能测试'
        };
      case 'integrationTests':
        return {
          name: '集成测试',
          icon: <GitBranch className="w-5 h-5 text-orange-600" />,
          color: 'orange',
          description: '功能间集成与交互测试'
        };
      default:
        return {
          name: category,
          icon: <FileText className="w-5 h-5 text-gray-600" />,
          color: 'gray',
          description: '其他测试'
        };
    }
  };

  // 获取趋势图标
  const getTrendIcon = (score: number) => {
    if (score >= 95) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (score >= 80) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // 获取测试列表
  const getTestsForCategory = (category: string): TestResult[] => {
    switch (category) {
      case 'aiRecommendationEngine':
        return testResults.aiRecommendationEngine;
      case 'collaborationHub':
        return testResults.collaborationHub;
      case 'analyticsDashboard':
        return testResults.analyticsDashboard;
      case 'mobileOptimizedInterface':
        return testResults.mobileOptimizedInterface;
      case 'integrationTests':
        return testResults.integrationTests;
      default:
        return [];
    }
  };

  // 切换测试详情展开状态
  const toggleTestExpansion = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  // 切换详情显示
  const toggleDetails = (testId: string) => {
    setShowDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  // 计算分类统计
  const getCategoryStats = (tests: TestResult[]) => {
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const pending = tests.filter(t => t.status === 'pending').length;
    const total = tests.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { passed, failed, pending, total, score };
  };

  // 过滤测试结果
  const filteredTests = selectedCategory === 'all'
    ? Object.entries(testResults)
        .filter(([key]) => key !== 'summary')
        .flatMap(([_, tests]) => Array.isArray(tests) ? tests : [])
    : getTestsForCategory(selectedCategory);

  const categories = [
    { key: 'all', name: '全部测试', tests: filteredTests },
    { key: 'aiRecommendationEngine', ...getCategoryInfo('aiRecommendationEngine'), tests: testResults.aiRecommendationEngine },
    { key: 'collaborationHub', ...getCategoryInfo('collaborationHub'), tests: testResults.collaborationHub },
    { key: 'analyticsDashboard', ...getCategoryInfo('analyticsDashboard'), tests: testResults.analyticsDashboard },
    { key: 'mobileOptimizedInterface', ...getCategoryInfo('mobileOptimizedInterface'), tests: testResults.mobileOptimizedInterface },
    { key: 'integrationTests', ...getCategoryInfo('integrationTests'), tests: testResults.integrationTests }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部概览 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">测试结果面板</h1>
                <p className="text-gray-600">阶段4高级功能测试完成报告</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                完成时间: {new Date().toLocaleString('zh-CN')}
              </span>
              {getTrendIcon(testResults.summary.overallScore)}
            </div>
          </div>

          {/* 总体统计 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">总测试数</p>
                  <p className="text-2xl font-bold text-blue-900">{testResults.summary.totalTests}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">通过测试</p>
                  <p className="text-2xl font-bold text-green-900">{testResults.summary.passedTests}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">失败测试</p>
                  <p className="text-2xl font-bold text-red-900">{testResults.summary.failedTests}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-200" />
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">总体评分</p>
                  <p className="text-2xl font-bold text-purple-900">{testResults.summary.overallScore}%</p>
                </div>
                {testResults.summary.overallScore >= 90 ? (
                  <TrendingUp className="w-8 h-8 text-purple-200" />
                ) : testResults.summary.overallScore >= 70 ? (
                  <Minus className="w-8 h-8 text-purple-200" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-purple-200" />
                )}
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onRunFullTests}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>运行中...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>重新运行全部测试</span>
                </>
              )}
            </button>
            <button
              onClick={onRerunFailed}
              disabled={isRunning || testResults.summary.failedTests === 0}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重新运行失败测试</span>
            </button>
            <button
              onClick={onExportReport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>导出测试报告</span>
            </button>
          </div>

          {/* 进度显示 */}
          {isRunning && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{currentTest}</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* 分类统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {categories.filter(cat => cat.key !== 'all').map(category => {
            const stats = getCategoryStats(category.tests);
            const info = getCategoryInfo(category.key);

            return (
              <div
                key={category.key}
                className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedCategory === category.key ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => onCategoryChange(category.key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 bg-${info.color}-100 rounded-lg`}>
                    {info.icon}
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.score}%</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{info.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{info.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600">{stats.passed} 通过</span>
                  <span className="text-red-600">{stats.failed} 失败</span>
                  <span className="text-gray-500">{stats.total} 总计</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 分类过滤器 */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">过滤器:</span>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.key}
                  onClick={() => onCategoryChange(category.key)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                  {category.key !== 'all' && (
                    <span className="ml-1 text-xs">
                      ({getCategoryStats(category.tests).total})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 测试结果列表 */}
        <div className="space-y-4">
          {filteredTests.map((test, index) => (
            <div
              key={`${test.category}-${test.testName}-${index}`}
              className="bg-white rounded-lg shadow-sm border overflow-hidden"
            >
              {/* 测试头部 */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleTestExpansion(`${test.category}-${test.testName}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{test.testName}</h3>
                      <p className="text-sm text-gray-500">
                        {getCategoryInfo(test.category).name} • 耗时 {test.duration}ms
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      test.status === 'passed' ? 'bg-green-100 text-green-700' :
                      test.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {test.status === 'passed' ? '通过' :
                       test.status === 'failed' ? '失败' : '待定'}
                    </span>
                    {expandedTests.has(`${test.category}-${test.testName}`) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* 测试详情 */}
              {expandedTests.has(`${test.category}-${test.testName}`) && (
                <div className="border-t border-gray-200 p-4">
                  {/* 错误和警告 */}
                  {(test.errors?.length || 0) > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-red-700 mb-2">错误信息:</h4>
                      <div className="space-y-1">
                        {test.errors?.map((error, idx) => (
                          <div key={idx} className="flex items-start space-x-2">
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-600">{error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(test.warnings?.length || 0) > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-yellow-700 mb-2">警告信息:</h4>
                      <div className="space-y-1">
                        {test.warnings?.map((warning, idx) => (
                          <div key={idx} className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-yellow-600">{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 详细信息 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">测试详情</h4>
                      <button
                        onClick={() => toggleDetails(`${test.category}-${test.testName}`)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {showDetails.has(`${test.category}-${test.testName}`) ? '隐藏' : '显示'}详细信息
                      </button>
                    </div>
                    {showDetails.has(`${test.category}-${test.testName}`) && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onRunCategoryTests(test.category)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors"
                    >
                      重新运行此分类测试
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {filteredTests.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">没有测试结果</h3>
            <p className="text-gray-500">请运行测试以查看结果</p>
          </div>
        )}
      </div>
    </div>
  );
};