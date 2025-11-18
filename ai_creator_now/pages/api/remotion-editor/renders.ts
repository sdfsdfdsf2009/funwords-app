import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import { RemotionTimeline, RemotionSettings } from '@/src/types'

// 渲染任务状态存储（内存中，实际项目中应该使用Redis或数据库）
const renderJobs = new Map<string, {
  id: string
  projectId: string
  timeline: RemotionTimeline
  settings: RemotionSettings
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  resultUrl?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}>()

// 全局共享renderJobs map
if (typeof globalThis !== 'undefined') {
  (globalThis as any).renderJobs = renderJobs
} else if (typeof global !== 'undefined') {
  (global as any).renderJobs = renderJobs
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req

  try {
    if (method === 'POST') {
      // 开始新的渲染任务
      const { projectId, timeline, settings } = req.body

      if (!projectId || !timeline) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and timeline are required'
        })
      }

      const renderId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const renderJob = {
        id: renderId,
        projectId,
        timeline,
        settings: settings || {},
        status: 'pending' as const,
        progress: 0,
        createdAt: new Date(),
      }

      renderJobs.set(renderId, renderJob)

      // 启动模拟渲染过程
      startRenderProcess(renderId)

      return res.status(201).json({
        success: true,
        data: {
          renderId,
          status: 'pending',
          message: 'Render job created successfully'
        }
      })
    }

    res.setHeader('Allow', ['POST'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in Remotion renders API:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 模拟渲染过程
async function startRenderProcess(renderId: string) {
  const renderJob = renderJobs.get(renderId)
  if (!renderJob) return

  try {
    // 更新状态为处理中
    renderJob.status = 'processing'

    // 模拟渲染进度
    for (let progress = 0; progress <= 100; progress += 5) {
      if (renderJobs.get(renderId)?.status === 'processing') {
        renderJob.progress = progress
        await new Promise(resolve => setTimeout(resolve, 200)) // 200ms per step
      } else {
        // 渲染被取消
        return
      }
    }

    // 渲染完成
    renderJob.status = 'completed'
    renderJob.progress = 100
    renderJob.completedAt = new Date()
    renderJob.resultUrl = `/api/remotion-editor/renders/${renderId}/result`

    console.log(`✅ Render ${renderId} completed successfully`)

  } catch (error) {
    console.error(`❌ Render ${renderId} failed:`, error)
    renderJob.status = 'failed'
    renderJob.error = error instanceof Error ? error.message : 'Unknown error'
  }
}