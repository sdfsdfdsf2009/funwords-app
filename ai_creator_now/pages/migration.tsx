import { useEffect, useState } from 'react'
import { migrationService } from '@/lib/migration'

interface MigrationDetails {
  detectedProjects: number
  detectedScenes: number
  processingErrors: string[]
  dataLossWarnings: string[]
}

interface MigrationResult {
  success: boolean
  migratedProjects: number
  migratedScenes: number
  errors: string[]
  skippedProjects: string[]
  details: MigrationDetails
}

export default function MigrationPage() {
  const [loading, setLoading] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState(0)
  const [migrationStage, setMigrationStage] = useState('')
  const [migrationDetails, setMigrationDetails] = useState<MigrationDetails | null>(null)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [needsMigration, setNeedsMigration] = useState(false)

  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/migration')
      const data = await response.json()

      if (data.success) {
        setNeedsMigration(data.data.needsMigration)
        setMigrationDetails(data.data.details)
      }
    } catch (error) {
      console.error('Failed to check migration status:', error)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' })
      })

      const data = await response.json()

      if (data.success) {
        alert('备份创建成功！文件已下载到您的设备。')
      } else {
        alert(`创建备份失败: ${data.error}`)
      }
    } catch (error) {
      alert(`创建备份时发生错误: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMigration = async () => {
    if (!confirm('确定要开始数据迁移吗？此过程将把localStorage中的所有项目数据迁移到数据库。迁移过程中会自动创建备份。')) {
      return
    }

    try {
      setLoading(true)
      setMigrationProgress(0)
      setMigrationStage('准备迁移')
      setMigrationResult(null)

      const response = await fetch('/api/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' })
      })

      const data = await response.json()

      if (data.success) {
        setMigrationResult(data.data)
        setNeedsMigration(false)
        setMigrationDetails(null)

        // 刷新页面以显示新的状态
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setMigrationResult(data.data)
      }
    } catch (error) {
      alert(`迁移过程中发生错误: ${error}`)
    } finally {
      setLoading(false)
      setMigrationProgress(0)
      setMigrationStage('')
    }
  }

  const handleProgressUpdate = (progress: number, stage: string) => {
    setMigrationProgress(progress)
    setMigrationStage(stage)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">数据迁移中...</h2>
            <p className="text-gray-600 mb-4">{migrationStage}</p>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${migrationProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{migrationProgress}%</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">数据迁移中心</h1>

          {/* 迁移状态 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">迁移状态</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">需要迁移</p>
                <p className={`text-2xl font-bold ${needsMigration ? 'text-orange-600' : 'text-green-600'}`}>
                  {needsMigration ? '是' : '否'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">本地项目</p>
                <p className="text-2xl font-bold text-blue-600">
                  {migrationDetails?.detectedProjects || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">本地场景</p>
                <p className="text-2xl font-bold text-blue-600">
                  {migrationDetails?.detectedScenes || 0}
                </p>
              </div>
            </div>
          </div>

          {/* 数据详情 */}
          {migrationDetails && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">数据详情</h3>

              {/* 数据完整性检查 */}
              {(migrationDetails.processingErrors.length > 0 || migrationDetails.dataLossWarnings.length > 0) && (
                <div className="space-y-4">
                  {migrationDetails.processingErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800 mb-2">⚠️ 数据完整性问题</h4>
                      <ul className="space-y-1">
                        {migrationDetails.processingErrors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {migrationDetails.dataLossWarnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 数据丢失警告</h4>
                      <ul className="space-y-1">
                        {migrationDetails.dataLossWarnings.map((warning, index) => (
                          <li key={index} className="text-sm text-yellow-700">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 迁移结果 */}
          {migrationResult && (
            <div className={`rounded-lg p-6 mb-8 ${
              migrationResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                migrationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {migrationResult.success ? '✅ 迁移成功' : '❌ 迁移失败'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">已迁移项目</p>
                  <p className="text-xl font-bold">{migrationResult.migratedProjects}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">已迁移场景</p>
                  <p className="text-xl font-bold">{migrationResult.migratedScenes}</p>
                </div>
              </div>

              {migrationResult.skippedProjects.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <h4 className="font-semibold text-blue-800 mb-2">跳过的项目</h4>
                  <ul className="space-y-1">
                    {migrationResult.skippedProjects.map((skipped, index) => (
                      <li key={index} className="text-sm text-blue-700">• {skipped}</li>
                    ))}
                  </ul>
                </div>
              )}

              {migrationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <h4 className="font-semibold text-red-800 mb-2">错误信息</h4>
                  <ul className="space-y-1">
                    {migrationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-4">
            {needsMigration ? (
              <>
                <button
                  onClick={handleCreateBackup}
                  disabled={loading}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  创建数据备份
                </button>
                <button
                  onClick={handleMigration}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  开始数据迁移
                </button>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">🎉 无需迁移</h3>
                <p className="text-green-700">您的数据已经在数据库中，无需进行迁移操作。</p>
              </div>
            )}

            <button
              onClick={checkMigrationStatus}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              刷新状态
            </button>
          </div>

          {/* 使用说明 */}
          <div className="bg-gray-100 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold mb-4">使用说明</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>📊 检测数据：</strong>系统会自动检测localStorage中的项目数据。</p>
              <p><strong>💾 创建备份：</strong>在迁移前强烈建议创建数据备份，以防意外情况。</p>
              <p><strong>🔄 执行迁移：</strong>将所有项目和场景数据从localStorage迁移到PostgreSQL数据库。</p>
              <p><strong>✅ 验证结果：</strong>迁移完成后系统会验证数据完整性。</p>
              <p><strong>🚀 自动清理：</strong>成功迁移后会自动清理localStorage数据。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}