import { setupServer } from 'msw/node'

// Mock API handlers for MSW v2
export const handlers = [
  // API Configurations
  {
    method: 'GET',
    path: '/api/configs',
    response: () => ({
      success: true,
      data: [
        {
          id: '1',
          name: 'OpenAI DALL-E 3',
          type: 'image',
          provider: 'OpenAI',
          modelSupportMode: 'single',
          endpoint: 'https://api.openai.com/v1/images/generations',
          method: 'POST',
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    })
  },

  {
    method: 'POST',
    path: '/api/configs',
    response: ({ request }) => ({
      success: true,
      data: {
        id: '2',
        ...(JSON.parse(request.body as string))
      }
    })
  },

  // Projects
  {
    method: 'GET',
    path: '/api/projects',
    response: () => ({
      success: true,
      data: [
        {
          id: '1',
          name: '测试项目',
          description: '这是一个测试项目',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    })
  },

  {
    method: 'POST',
    path: '/api/projects',
    response: ({ request }) => ({
      success: true,
      data: {
        id: '2',
        ...(JSON.parse(request.body as string))
      }
    })
  },

  // Scenes
  {
    method: 'GET',
    path: '/api/scenes',
    response: () => ({
      success: true,
      data: [
        {
          id: '1',
          name: '场景1',
          prompt: '美丽的风景',
          duration: 5,
          projectId: '1',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          name: '场景2',
          prompt: '城市夜景',
          duration: 8,
          projectId: '1',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    })
  },

  {
    method: 'POST',
    path: '/api/scenes/import',
    response: () => ({
      success: true,
      data: {
        imported: 2,
        scenes: [
          {
            id: '3',
            name: '导入场景1',
            prompt: '测试提示词1',
            duration: 5
          },
          {
            id: '4',
            name: '导入场景2',
            prompt: '测试提示词2',
            duration: 8
          }
        ]
      }
    })
  },

  // Video Generation
  {
    method: 'POST',
    path: '/api/videos/generations',
    response: () => ({
      success: true,
      data: {
        taskId: 'task_' + Date.now(),
        status: 'pending',
        estimatedTime: 60
      }
    })
  },

  {
    method: 'GET',
    path: '/api/tasks/:taskId',
    response: ({ params }) => {
      const taskId = params.taskId as string

      // Simulate task progress
      if (taskId.includes('completed')) {
        return {
          success: true,
          data: {
            taskId,
            status: 'completed',
            result: {
              videoUrl: 'https://example.com/generated-video.mp4',
              thumbnailUrl: 'https://example.com/thumbnail.jpg'
            }
          }
        }
      } else if (taskId.includes('failed')) {
        return {
          success: false,
          error: 'Video generation failed',
          data: {
            taskId,
            status: 'failed',
            error: 'API rate limit exceeded'
          }
        }
      } else {
        return {
          success: true,
          data: {
            taskId,
            status: 'processing',
            progress: 75
          }
        }
      }
    }
  },

  // Image Generation
  {
    method: 'POST',
    path: '/api/images/generations',
    response: () => ({
      success: true,
      data: {
        taskId: 'img_task_' + Date.now(),
        status: 'pending'
      }
    })
  },

  // System Status
  {
    method: 'GET',
    path: '/api/health',
    response: () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: 'test',
      version: '1.0.0',
      port: 3003,
      services: {
        database: 'connected',
        apis: 'available',
        filesystem: 'accessible'
      }
    })
  },

  {
    method: 'GET',
    path: '/api/system-status',
    response: () => ({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          projectCount: 5,
          sceneCount: 25
        },
        application: {
          status: 'running',
          version: '1.0.0',
          environment: 'test'
        },
        services: {
          api: 'available',
          filesystem: 'accessible'
        }
      }
    })
  }
]

// Create server
export const server = setupServer(...handlers)