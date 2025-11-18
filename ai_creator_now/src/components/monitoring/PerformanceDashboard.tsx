import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { webVitalsMonitor, useWebVitals } from '@/lib/monitoring/webVitals';
import { componentMonitor } from '@/lib/monitoring/componentMonitor';
import { apiMonitor } from '@/lib/monitoring/apiMonitor';

interface PerformanceDashboardProps {
  className?: string;
  visible?: boolean;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  visible = true
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [refreshTime, setRefreshTime] = useState(Date.now());
  const [showDetails, setShowDetails] = useState(false);

  const { report: webVitalsReport, isMonitoring: webVitalsMonitoring } = useWebVitals();
  const [componentReport, setComponentReport] = useState(() => componentMonitor.getPerformanceReport());
  const [apiReport, setApiReport] = useState(() => apiMonitor.getPerformanceReport());

  // 刷新数据
  const refreshData = () => {
    setComponentReport(componentMonitor.getPerformanceReport());
    setApiReport(apiMonitor.getPerformanceReport());
    setRefreshTime(Date.now());
  };

  // 自动刷新
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(refreshData, 5000); // 每5秒刷新
    return () => clearInterval(interval);
  }, [visible]);

  // 获取总体评分
  const getOverallScore = () => {
    const webVitalsScore = webVitalsReport.score;
    const componentScore = componentReport.score;
    const apiScore = apiReport.score;

    return Math.round((webVitalsScore + componentScore + apiScore) / 3);
  };

  // 获取总体评级
  const getOverallGrade = () => {
    const score = getOverallScore();
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  // 获取评级颜色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-yellow-600 bg-yellow-50';
      case 'D': return 'text-orange-600 bg-orange-50';
      case 'F': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // 获取状态图标
  const getStatusIcon = (grade: string) => {
    switch (grade) {
      case 'A':
      case 'B':
        return <CheckCircle className="w-5 h-5" />;
      case 'C':
        return <AlertTriangle className="w-5 h-5" />;
      case 'D':
      case 'F':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  if (!visible) return null;

  const overallScore = getOverallScore();
  const overallGrade = getOverallGrade();
  const gradeColorClass = getGradeColor(overallGrade);

  return (
    <div className={`bg-white rounded-lg border shadow-lg ${className}`}>
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="font-semibold text-lg">性能监控仪表板</h3>
              <p className="text-sm text-gray-500">
                最后更新: {new Date(refreshTime).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title={showDetails ? '隐藏详情' : '显示详情'}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={refreshData}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 总体评分 */}
      <div className="p-4 border-b">
        <div className={`flex items-center justify-between p-4 rounded-lg ${gradeColorClass}`}>
          <div className="flex items-center gap-3">
            {getStatusIcon(overallGrade)}
            <div>
              <h4 className="font-semibold text-lg">总体性能评分</h4>
              <p className="text-sm opacity-75">
                综合Web Vitals、组件和API性能
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{overallScore}</div>
            <div className="text-sm font-medium">{overallGrade}级</div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 分项评分 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Web Vitals */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <h4 className="font-medium">Web Vitals</h4>
                </div>
                <div className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(webVitalsReport.status)}`}>
                  {webVitalsReport.status.toUpperCase()}
                </div>
              </div>
              <div className="text-2xl font-bold mb-2">{webVitalsReport.score}</div>
              {webVitalsMonitoring ? (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  监控中
                </div>
              ) : (
                <div className="text-xs text-gray-500">未监控</div>
              )}
              {showDetails && webVitalsReport.metrics.length > 0 && (
                <div className="mt-3 space-y-1">
                  {webVitalsReport.metrics.map((metric, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-600">{metric.name}:</span>
                      <span className={metric.rating === 'good' ? 'text-green-600' :
                                     metric.rating === 'needs-improvement' ? 'text-yellow-600' :
                                     'text-red-600'}>
                        {metric.value}ms
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 组件性能 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  <h4 className="font-medium">组件性能</h4>
                </div>
                <div className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(componentReport.grade)}`}>
                  {componentReport.grade}级
                </div>
              </div>
              <div className="text-2xl font-bold mb-2">{componentReport.score}</div>
              <div className="text-xs text-gray-600 mb-1">
                {componentReport.stats.totalComponents} 个组件
              </div>
              {componentReport.stats.expensiveComponents > 0 && (
                <div className="text-xs text-orange-600">
                  {componentReport.stats.expensiveComponents} 个需要优化
                </div>
              )}
              {showDetails && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">平均渲染:</span>
                    <span>{componentReport.stats.averageRenderTime.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">最慢组件:</span>
                    <span className="text-red-600">
                      {componentReport.stats.slowestComponent?.time.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* API性能 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-500" />
                  <h4 className="font-medium">API性能</h4>
                </div>
                <div className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(apiReport.grade)}`}>
                  {apiReport.grade}级
                </div>
              </div>
              <div className="text-2xl font-bold mb-2">{apiReport.score}</div>
              <div className="text-xs text-gray-600 mb-1">
                {apiReport.stats.totalRequests} 个请求
              </div>
              <div className="text-xs text-gray-600">
                平均响应: {apiReport.stats.averageResponseTime}ms
              </div>
              {showDetails && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">错误率:</span>
                    <span className={apiReport.stats.errorRate > 5 ? 'text-red-600' : 'text-green-600'}>
                      {apiReport.stats.errorRate}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">缓存命中:</span>
                    <span className="text-green-600">{apiReport.stats.cacheHitRate}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 优化建议 */}
          {showDetails && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">优化建议</h4>
              <div className="space-y-2">
                {[...webVitalsReport.recommendations, ...componentReport.recommendations, ...apiReport.recommendations]
                  .slice(0, 5) // 只显示前5条建议
                  .map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{recommendation}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 性能问题 */}
          {showDetails && apiReport.issues.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">性能问题</h4>
              <div className="space-y-2">
                {apiReport.issues.slice(0, 3).map((issue, index) => (
                  <div key={index} className={`flex items-start gap-2 text-sm p-2 rounded ${
                    issue.severity === 'high' ? 'bg-red-50' :
                    issue.severity === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'
                  }`}>
                    <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                      issue.severity === 'high' ? 'text-red-500' :
                      issue.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <span className="text-gray-600">{issue.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

PerformanceDashboard.displayName = 'PerformanceDashboard';