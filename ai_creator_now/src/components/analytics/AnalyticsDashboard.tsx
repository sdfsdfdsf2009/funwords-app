import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Activity, Eye, Download, Settings, Filter, Calendar, RefreshCw, Target, Zap, Award, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalProjects: number;
    activeUsers: number;
    totalViews: number;
    avgSessionTime: number;
    completionRate: number;
    errorRate: number;
  };
  userBehavior: {
    dailyActiveUsers: { date: string; users: number }[];
    popularFeatures: { feature: string; usage: number; trend: 'up' | 'down' | 'stable' }[];
    userFlow: { step: string; count: number; dropoff: number }[];
    deviceUsage: { device: string; percentage: number }[];
  };
  performance: {
    pageLoadTimes: { page: string; avgTime: number; threshold: number }[];
    errorRates: { type: string; count: number; severity: 'low' | 'medium' | 'high' }[];
    apiPerformance: { endpoint: string; avgResponseTime: number; successRate: number }[];
  };
  engagement: {
    timeSpentOnFeatures: { feature: string; avgTime: number; users: number }[];
    userSatisfaction: { metric: string; score: number; maxScore: number }[];
    retentionRates: { period: string; rate: number }[];
  };
}

interface AnalyticsDashboardProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  refreshInterval?: number;
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  timeRange = '30d',
  refreshInterval = 60000,
  className = ""
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'behavior' | 'performance' | 'engagement'>('overview');

  // 模拟获取分析数据
  const fetchAnalyticsData = useCallback(async (range: string): Promise<AnalyticsData> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          overview: {
            totalProjects: 1247,
            activeUsers: 342,
            totalViews: 15678,
            avgSessionTime: 8.5,
            completionRate: 78.3,
            errorRate: 2.1
          },
          userBehavior: {
            dailyActiveUsers: [
              { date: '2025-11-11', users: 280 },
              { date: '2025-11-12', users: 315 },
              { date: '2025-11-13', users: 298 },
              { date: '2025-11-14', users: 332 },
              { date: '2025-11-15', users: 358 },
              { date: '2025-11-16', users: 342 },
              { date: '2025-11-17', users: 367 }
            ],
            popularFeatures: [
              { feature: '视频生成', usage: 89, trend: 'up' },
              { feature: '场景编辑', usage: 76, trend: 'up' },
              { feature: '模板库', usage: 65, trend: 'stable' },
              { feature: '批量处理', usage: 45, trend: 'down' },
              { feature: '协作功能', usage: 38, trend: 'up' }
            ],
            userFlow: [
              { step: '访问首页', count: 1000, dropoff: 0 },
              { step: '创建项目', count: 750, dropoff: 25 },
              { step: '添加场景', count: 620, dropoff: 17 },
              { step: '生成视频', count: 480, dropoff: 23 },
              { step: '导出成品', count: 420, dropoff: 13 }
            ],
            deviceUsage: [
              { device: 'Desktop', percentage: 58 },
              { device: 'Mobile', percentage: 32 },
              { device: 'Tablet', percentage: 10 }
            ]
          },
          performance: {
            pageLoadTimes: [
              { page: '首页', avgTime: 1.2, threshold: 2.0 },
              { page: '项目列表', avgTime: 1.8, threshold: 2.0 },
              { page: '视频编辑器', avgTime: 2.8, threshold: 3.0 },
              { page: '导出页面', avgTime: 1.5, threshold: 2.0 }
            ],
            errorRates: [
              { type: 'JavaScript错误', count: 23, severity: 'medium' },
              { type: '网络错误', count: 15, severity: 'high' },
              { type: 'API错误', count: 8, severity: 'low' },
              { type: '渲染错误', count: 5, severity: 'medium' }
            ],
            apiPerformance: [
              { endpoint: '/api/projects', avgResponseTime: 245, successRate: 98.5 },
              { endpoint: '/api/videos/generate', avgResponseTime: 1200, successRate: 95.2 },
              { endpoint: '/api/images/generate', avgResponseTime: 890, successRate: 97.1 },
              { endpoint: '/api/scenes', avgResponseTime: 156, successRate: 99.2 }
            ]
          },
          engagement: {
            timeSpentOnFeatures: [
              { feature: '视频编辑器', avgTime: 12.5, users: 280 },
              { feature: '场景管理', avgTime: 8.3, users: 320 },
              { feature: '模板浏览', avgTime: 6.7, users: 180 },
              { feature: '协作中心', avgTime: 4.2, users: 95 }
            ],
            userSatisfaction: [
              { metric: '整体满意度', score: 4.2, maxScore: 5.0 },
              { metric: '易用性', score: 4.5, maxScore: 5.0 },
              { metric: '功能完整性', score: 3.9, maxScore: 5.0 },
              { metric: '性能表现', score: 4.1, maxScore: 5.0 }
            ],
            retentionRates: [
              { period: 'Day 1', rate: 85 },
              { period: 'Day 7', rate: 62 },
              { period: 'Day 30', rate: 41 },
              { period: 'Day 90', rate: 28 }
            ]
          }
        });
      }, 1000);
    });
  }, []);

  // 初始化数据
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAnalyticsData(selectedTimeRange);
        setAnalyticsData(data);
      } catch (error) {
        console.error('加载分析数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [selectedTimeRange, fetchAnalyticsData]);

  // 自动刷新
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, selectedTimeRange]);

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchAnalyticsData(selectedTimeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('刷新分析数据失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedTimeRange, fetchAnalyticsData]);

  // 获取状态颜色
  const getStatusColor = (value: number, threshold: number, reverse = false) => {
    const ratio = value / threshold;
    if (reverse) {
      if (ratio <= 0.5) return 'text-green-600 bg-green-100';
      if (ratio <= 0.8) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    } else {
      if (ratio >= 0.8) return 'text-green-600 bg-green-100';
      if (ratio >= 0.6) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    }
  };

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  // 渲染概览卡片
  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    const { overview } = analyticsData;
    const cards = [
      {
        title: '总项目数',
        value: overview.totalProjects.toLocaleString(),
        icon: <BarChart3 className="w-6 h-6" />,
        change: '+12%',
        positive: true
      },
      {
        title: '活跃用户',
        value: overview.activeUsers.toLocaleString(),
        icon: <Users className="w-6 h-6" />,
        change: '+8%',
        positive: true
      },
      {
        title: '总浏览量',
        value: overview.totalViews.toLocaleString(),
        icon: <Eye className="w-6 h-6" />,
        change: '+15%',
        positive: true
      },
      {
        title: '平均会话时长',
        value: `${overview.avgSessionTime}分钟`,
        icon: <Clock className="w-6 h-6" />,
        change: '+1.2分钟',
        positive: true
      },
      {
        title: '完成率',
        value: `${overview.completionRate}%`,
        icon: <Target className="w-6 h-6" />,
        change: '+3.1%',
        positive: true,
        color: getStatusColor(overview.completionRate, 80)
      },
      {
        title: '错误率',
        value: `${overview.errorRate}%`,
        icon: <AlertCircle className="w-6 h-6" />,
        change: '-0.5%',
        positive: true,
        color: getStatusColor(overview.errorRate, 5, true)
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.color || 'bg-blue-100'}`}>
                <div className={card.color ? card.color.split(' ')[0] : 'text-blue-600'}>
                  {card.icon}
                </div>
              </div>
              <div className={`flex items-center space-x-1 text-sm ${
                card.positive ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{card.change}</span>
                {getTrendIcon(card.positive ? 'up' : 'down')}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
            <p className="text-sm text-gray-600">{card.title}</p>
          </div>
        ))}
      </div>
    );
  };

  // 渲染用户行为分析
  const renderUserBehavior = () => {
    if (!analyticsData) return null;

    const { userBehavior } = analyticsData;

    return (
      <div className="space-y-6">
        {/* 热门功能 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">热门功能使用情况</h3>
          <div className="space-y-3">
            {userBehavior.popularFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900">{feature.feature}</span>
                  {getTrendIcon(feature.trend)}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${feature.usage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{feature.usage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 用户流程 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">用户转化流程</h3>
          <div className="space-y-3">
            {userBehavior.userFlow.map((step, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{step.step}</span>
                    <span className="text-sm text-gray-600">{step.count}人</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(step.count / 1000) * 100}%` }}
                    ></div>
                  </div>
                  {step.dropoff > 0 && (
                    <p className="text-xs text-red-600 mt-1">流失 {step.dropoff}%</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 设备使用情况 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">设备使用分布</h3>
          <div className="space-y-3">
            {userBehavior.deviceUsage.map((device, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{device.device}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{device.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染性能监控
  const renderPerformance = () => {
    if (!analyticsData) return null;

    const { performance } = analyticsData;

    return (
      <div className="space-y-6">
        {/* 页面加载时间 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">页面加载性能</h3>
          <div className="space-y-3">
            {performance.pageLoadTimes.map((page, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{page.page}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        page.avgTime <= page.threshold ? 'bg-green-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min((page.avgTime / page.threshold) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm w-16 text-right ${
                    page.avgTime <= page.threshold ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {page.avgTime}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API性能 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API性能监控</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-700">端点</th>
                  <th className="text-left py-2 text-gray-700">响应时间</th>
                  <th className="text-left py-2 text-gray-700">成功率</th>
                  <th className="text-left py-2 text-gray-700">状态</th>
                </tr>
              </thead>
              <tbody>
                {performance.apiPerformance.map((api, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 text-gray-900">{api.endpoint}</td>
                    <td className="py-2">
                      <span className={`${
                        api.avgResponseTime <= 500 ? 'text-green-600' :
                        api.avgResponseTime <= 1000 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {api.avgResponseTime}ms
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`${
                        api.successRate >= 99 ? 'text-green-600' :
                        api.successRate >= 95 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {api.successRate}%
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        api.successRate >= 99 ? 'bg-green-100 text-green-700' :
                        api.successRate >= 95 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {api.successRate >= 99 ? '优秀' :
                         api.successRate >= 95 ? '良好' : '需优化'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 错误监控 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">错误监控</h3>
          <div className="space-y-3">
            {performance.errorRates.map((error, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    error.severity === 'high' ? 'bg-red-500' :
                    error.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{error.type}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{error.count}次</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    error.severity === 'high' ? 'bg-red-100 text-red-700' :
                    error.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {error.severity === 'high' ? '高' :
                     error.severity === 'medium' ? '中' : '低'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染用户参与度
  const renderEngagement = () => {
    if (!analyticsData) return null;

    const { engagement } = analyticsData;

    return (
      <div className="space-y-6">
        {/* 功能使用时长 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">功能使用时长</h3>
          <div className="space-y-3">
            {engagement.timeSpentOnFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">{feature.feature}</span>
                  <p className="text-xs text-gray-500">{feature.users}用户</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(feature.avgTime / 15) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">{feature.avgTime}分钟</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 用户满意度 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">用户满意度评分</h3>
          <div className="space-y-3">
            {engagement.userSatisfaction.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{metric.metric}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${(metric.score / metric.maxScore) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">
                    {metric.score}/{metric.maxScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 留存率 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">用户留存率</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {engagement.retentionRates.map((period, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 mb-1">{period.rate}%</div>
                <div className="text-sm text-gray-600">{period.period}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-8 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">数据分析中心</h3>
              <p className="text-sm text-gray-600">用户行为与系统性能分析</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* 时间范围选择 */}
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
              <option value="90d">最近90天</option>
              <option value="1y">最近1年</option>
            </select>

            {/* 刷新按钮 */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* 导出按钮 */}
            <button className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>导出报告</span>
            </button>
          </div>
        </div>

        {/* 快速统计 */}
        {analyticsData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.overview.activeUsers}
              </div>
              <div className="text-sm text-blue-700">活跃用户</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.overview.completionRate}%
              </div>
              <div className="text-sm text-green-700">完成率</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {analyticsData.overview.avgSessionTime}分钟
              </div>
              <div className="text-sm text-yellow-700">平均会话</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {analyticsData.overview.errorRate}%
              </div>
              <div className="text-sm text-red-700">错误率</div>
            </div>
          </div>
        )}
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveSection('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>总览</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSection('behavior')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'behavior'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>用户行为</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSection('performance')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'performance'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>性能监控</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSection('engagement')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'engagement'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>用户参与度</span>
            </div>
          </button>
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {activeSection === 'overview' && renderOverviewCards()}
        {activeSection === 'behavior' && renderUserBehavior()}
        {activeSection === 'performance' && renderPerformance()}
        {activeSection === 'engagement' && renderEngagement()}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;