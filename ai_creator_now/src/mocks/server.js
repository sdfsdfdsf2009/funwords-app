import { setupServer } from 'msw/node'
import { rest } from 'msw'

// Mock API handlers
export const handlers = [
  // Mock API configuration endpoints
  rest.get('/api/evolink/v1/tasks/:taskId', (req, res, ctx) => {
    const { taskId } = req.params
    return res(
      ctx.status(200),
      ctx.json({
        id: taskId,
        status: 'completed',
        result: {
          id: 'mock-result-id',
          url: 'https://example.com/mock-image.jpg',
          thumbnailUrl: 'https://example.com/mock-thumbnail.jpg',
        },
      })
    )
  }),

  rest.post('/api/evolink/v1/images/generations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'mock-task-id',
        status: 'pending',
      })
    )
  }),

  rest.post('/api/evolink/v1/videos/generations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'mock-video-task-id',
        status: 'pending',
      })
    )
  }),

  // Mock project endpoints
  rest.get('/api/projects', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'mock-project-1',
          name: 'Test Project 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          scenes: [],
        },
        {
          id: 'mock-project-2',
          name: 'Test Project 2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          scenes: [],
        },
      ])
    )
  }),

  rest.post('/api/projects', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'new-mock-project',
        name: 'New Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scenes: [],
      })
    )
  }),

  // Mock scene endpoints
  rest.get('/api/scenes', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'mock-scene-1',
          sceneNumber: 1,
          prompt: 'Test scene 1',
          projectId: 'mock-project-1',
        },
        {
          id: 'mock-scene-2',
          sceneNumber: 2,
          prompt: 'Test scene 2',
          projectId: 'mock-project-1',
        },
      ])
    )
  }),

  // Mock debug endpoints
  rest.get('/api/system-logs', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Test log message',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
        },
      })
    )
  }),
]

// Setup MSW server
export const server = setupServer(...handlers)