/**
 * 安全确认面板
 * 为用户提供AI建议的审查和确认功能
 */

import React, { useState, useEffect } from 'react';
import { safeErrorWorkflowController, HumanConfirmationRequest, ConfirmationResult, SafetyLevel } from '../../utils/safeErrorWorkflowController';

interface SafetyConfirmationPanelProps {
  onSettingsChange?: (level: SafetyLevel) => void;
}

const SafetyConfirmationPanel: React.FC<SafetyConfirmationPanelProps> = ({ onSettingsChange }) => {
  const [pendingRequests, setPendingRequests] = useState<HumanConfirmationRequest[]>([]);
  const [safetyLevel, setSafetyLevel] = useState<SafetyLevel>(SafetyLevel.CONFIRM_REQUIRED);
  const [selectedRequest, setSelectedRequest] = useState<HumanConfirmationRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [feedback, setFeedback] = useState('');

  // 加载待确认请求
  useEffect(() => {
    const loadRequests = () => {
      const requests = safeErrorWorkflowController.getPendingConfirmations();
      setPendingRequests(requests);
    };

    loadRequests();
    const interval = setInterval(loadRequests, 5000); // 每5秒刷新一次

    return () => clearInterval(interval);
  }, []);

  // 处理确认结果
  const handleConfirmation = async (approved: boolean) => {
    if (!selectedRequest) return;

    const result: ConfirmationResult = {
      approved,
      feedback: feedback || undefined,
      confirmedBy: 'user',
      confirmedAt: new Date()
    };

    try {
      await safeErrorWorkflowController.handleConfirmation(selectedRequest.id, result);

      // 重新加载请求列表
      const requests = safeErrorWorkflowController.getPendingConfirmations();
      setPendingRequests(requests);

      // 重置状态
      setSelectedRequest(null);
      setShowDetails(false);
      setFeedback('');
    } catch (error) {
      console.error('处理确认失败:', error);
      alert('处理确认失败，请重试');
    }
  };

  // 处理安全级别变更
  const handleSafetyLevelChange = (newLevel: SafetyLevel) => {
    setSafetyLevel(newLevel);
    safeErrorWorkflowController.setSafetyLevel(newLevel);
    onSettingsChange?.(newLevel);
  };

  // 获取安全级别信息
  const getSafetyLevelInfo = (level: SafetyLevel) => {
    const levelMap = {
      [SafetyLevel.READ_ONLY]: {
        label: '只读模式',
        description: '仅分析问题，不修改任何代码',
        color: 'bg-blue-100 text-blue-800',
        icon: '👁️'
      },
      [SafetyLevel.SUGGEST_ONLY]: {
        label: '建议模式',
        description: '提供修复建议，等待手动执行',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '💡'
      },
      [SafetyLevel.CONFIRM_REQUIRED]: {
        label: '确认模式',
        description: '提供修复方案，需要人工确认后执行',
        color: 'bg-orange-100 text-orange-800',
        icon: '✋'
      },
      [SafetyLevel.AUTO_REPAIR]: {
        label: '自动修复',
        description: '完全自动化处理，无需人工干预',
        color: 'bg-red-100 text-red-800',
        icon: '🤖'
      }
    };

    return levelMap[level];
  };

  // 获取风险级别信息
  const getRiskLevelInfo = (risk: string) => {
    const riskMap = {
      low: { label: '低风险', color: 'bg-green-100 text-green-800', icon: '✅' },
      medium: { label: '中风险', color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' },
      high: { label: '高风险', color: 'bg-red-100 text-red-800', icon: '🚨' }
    };

    return riskMap[risk as keyof typeof riskMap] || riskMap.low;
  };

  const currentSafetyInfo = getSafetyLevelInfo(safetyLevel);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 头部 */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            🔒 安全控制面板
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {pendingRequests.length} 个待确认请求
            </span>
          </div>
        </div>

        {/* 安全级别选择 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">当前安全级别:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentSafetyInfo.color}`}>
              {currentSafetyInfo.icon} {currentSafetyInfo.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{currentSafetyInfo.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.values(SafetyLevel) as SafetyLevel[]).map((level) => {
              const info = getSafetyLevelInfo(level);
              return (
                <button
                  key={level}
                  onClick={() => handleSafetyLevelChange(level)}
                  className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                    safetyLevel === level
                      ? info.color + ' ring-2 ring-offset-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {info.icon} {info.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 待确认请求列表 */}
      <div className="divide-y">
        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🛡️</div>
            <p>暂无待确认的请求</p>
            <p className="text-sm mt-1">系统将在检测到问题时显示确认请求</p>
          </div>
        ) : (
          <>
            {/* 请求列表 */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">待确认请求</h3>
              <div className="space-y-2">
                {pendingRequests.map((request) => {
                  const riskInfo = getRiskLevelInfo(request.riskLevel);
                  return (
                    <div
                      key={request.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRequest?.id === request.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {request.title}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded ${riskInfo.color}`}>
                              {riskInfo.icon} {riskInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {request.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>📁 {request.proposedChanges.length} 个文件</span>
                            <span>⏱️ {request.estimatedTime} 分钟</span>
                            <span>👤 {request.expertType}</span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <span className="text-xs text-gray-500">
                            {request.createdAt.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 详细信息和确认界面 */}
            {selectedRequest && (
              <div className="p-6 bg-gray-50 border-t">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {selectedRequest.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{selectedRequest.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-700">风险级别</div>
                      <div className={`mt-1 px-2 py-1 rounded text-sm ${getRiskLevelInfo(selectedRequest.riskLevel).color}`}>
                        {getRiskLevelInfo(selectedRequest.riskLevel).icon} {getRiskLevelInfo(selectedRequest.riskLevel).label}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-700">预估时间</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {selectedRequest.estimatedTime} 分钟
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-700">负责专家</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900 capitalize">
                        {selectedRequest.expertType}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 提议的变更 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">提议的变更</h4>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showDetails ? '隐藏详情' : '显示详情'}
                    </button>
                  </div>

                  {showDetails && (
                    <div className="space-y-2">
                      {selectedRequest.proposedChanges.map((change, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{change.file}</span>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                change.changeType === 'create' ? 'bg-green-100 text-green-800' :
                                change.changeType === 'modify' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {change.changeType === 'create' ? '新增' :
                                 change.changeType === 'modify' ? '修改' : '删除'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{change.description}</p>
                          {change.diff && (
                            <details className="mt-2">
                              <summary className="text-sm text-blue-600 cursor-pointer">查看代码差异</summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                {change.diff}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 用户反馈 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    反馈意见（可选）
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="如果你有任何疑虑或建议修改，请在此说明..."
                  />
                </div>

                {/* 确认按钮 */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <p>⚠️ 请仔细审查以上变更内容</p>
                    <p>📅 请求过期时间: {selectedRequest.expiresAt.toLocaleString()}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleConfirmation(false)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      拒绝执行
                    </button>
                    <button
                      onClick={() => handleConfirmation(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      批准执行
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            💡 提示: 你可以随时调整安全级别来控制AI的自动化程度
          </div>
          <button
            onClick={() => safeErrorWorkflowController.cleanupExpiredRequests()}
            className="text-blue-600 hover:text-blue-800"
          >
            清理过期请求
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyConfirmationPanel;