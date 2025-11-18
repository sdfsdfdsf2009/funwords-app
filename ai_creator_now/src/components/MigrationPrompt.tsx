import { useEffect, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'

export default function MigrationPrompt() {
  const {
    checkMigrationStatus,
    migrateToDatabase,
    isLoading,
    error,
    clearError
  } = useProjectStore()

  const [showPrompt, setShowPrompt] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<any>(null)

  useEffect(() => {
    const status = checkMigrationStatus()
    setMigrationStatus(status)
    if (status.needsMigration) {
      setShowPrompt(true)
    }
  }, [checkMigrationStatus])

  const handleMigrate = async () => {
    const success = await migrateToDatabase()
    if (success) {
      setShowPrompt(false)
      setMigrationStatus({ needsMigration: false, localStorageData: null })
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  const handleCheckAgain = () => {
    const status = checkMigrationStatus()
    setMigrationStatus(status)
    setShowPrompt(status.needsMigration)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">发现本地项目数据</h3>
          <p className="text-gray-600 text-sm">
            检测到您的浏览器中有 {migrationStatus?.localStorageData?.projects?.length || 0} 个项目，
            建议迁移到数据库以确保数据安全。
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleMigrate}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                迁移中...
              </span>
            ) : (
              '迁移到数据库'
            )}
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleCheckAgain}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              重新检查
            </button>
            <button
              onClick={handleDismiss}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              稍后提醒
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-blue-700 text-xs">
            <strong>迁移优势：</strong>
          </p>
          <ul className="text-blue-600 text-xs mt-1 space-y-1">
            <li>• 数据永久保存，不会因清理浏览器而丢失</li>
            <li>• 支持多设备同步</li>
            <li>• 更好的性能和可靠性</li>
            <li>• 自动备份和恢复功能</li>
          </ul>
        </div>

        <p className="text-gray-500 text-xs text-center mt-4">
          您可以随时在数据迁移中心手动执行迁移
        </p>
      </div>
    </div>
  )
}