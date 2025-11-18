import { useEffect } from 'react'
import { useDatabaseProjectStore } from '@/stores/databaseProjectStore'

export default function TestDBStorePage() {
  const {
    projects,
    currentProject,
    isLoading,
    error,
    loadProjects,
    createProject,
    setCurrentProject,
    addScene
  } = useDatabaseProjectStore()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = async () => {
    const name = prompt('请输入项目名称:')
    if (name) {
      await createProject({ name })
      await loadProjects()
    }
  }

  const handleAddScene = async () => {
    if (!currentProject) {
      alert('请先选择一个项目')
      return
    }

    const title = prompt('请输入场景标题:')
    if (title) {
      await addScene({
        title,
        description: '测试场景描述',
        videoPrompt: '测试视频提示词',
        duration: 10
      })
    }
  }

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">数据库项目Store测试</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">状态信息</h2>
          <div className="space-y-2">
            <p><span className="font-medium">加载状态:</span> {isLoading ? '加载中...' : '完成'}</p>
            {error && <p className="text-red-600"><span className="font-medium">错误:</span> {error}</p>}
            <p><span className="font-medium">项目数量:</span> {projects.length}</p>
            <p><span className="font-medium">当前项目:</span> {currentProject?.name || '无'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleCreateProject}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              创建新项目
            </button>
            <button
              onClick={handleAddScene}
              disabled={isLoading || !currentProject}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              添加场景
            </button>
            <button
              onClick={() => loadProjects()}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              刷新项目列表
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">项目列表</h2>
          {projects.length === 0 ? (
            <p className="text-gray-500">暂无项目</p>
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    currentProject?.id === project.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectProject(project.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                      <p className="text-gray-600 text-sm">{project.description}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        创建时间: {new Date(project.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {project.scenes.length} 个场景
                      </p>
                      <p className="text-xs text-gray-400">
                        {(project as any).status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {currentProject && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">当前项目详情</h2>
            <div className="space-y-2">
              <p><span className="font-medium">项目ID:</span> {currentProject.id}</p>
              <p><span className="font-medium">项目名称:</span> {currentProject.name}</p>
              <p><span className="font-medium">描述:</span> {currentProject.description}</p>
              <p><span className="font-medium">状态:</span> {(currentProject as any).status}</p>
              <p><span className="font-medium">更新时间:</span> {new Date(currentProject.updatedAt).toLocaleString()}</p>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">场景列表</h3>
              {currentProject.scenes.length === 0 ? (
                <p className="text-gray-500">暂无场景</p>
              ) : (
                <div className="space-y-2">
                  {currentProject.scenes.map(scene => (
                    <div key={scene.id} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">场景 {scene.sceneNumber}</p>
                          <p className="text-sm text-gray-600">{scene.imagePrompt}</p>
                          {scene.videoPrompt && (
                            <p className="text-xs text-gray-500 mt-1">提示词: {scene.videoPrompt}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>图片: {scene.images.length}</p>
                          <p>视频: {scene.generatedVideos.length}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}