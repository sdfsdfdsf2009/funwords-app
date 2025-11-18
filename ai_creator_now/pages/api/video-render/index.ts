import type { NextApiRequest, NextApiResponse } from 'next'
import { bundle } from '@remotion/bundler'
import { renderMedia, RenderMediaOnProgress } from '@remotion/renderer'
import { webpackOverride } from '../../../src/remotion/webpack'
import path from 'path'
import fs from 'fs'

// 渲染任务状态存储
const renderJobs = new Map<string, {
  status: 'pending' | 'rendering' | 'completed' | 'error'
  progress: number
  outputUrl?: string
  error?: string
  createdAt: Date
  updatedAt: Date
}>()

// 渲染请求接口
interface RenderRequest {
  compositionId: string
  inputProps: {
    timeline: any
    settings: any
  }
  outputFormat: 'mp4' | 'webm'
  codec: 'h264' | 'vp8' | 'vp9'
  quality: number
  fps?: number
  width?: number
  height?: number
  durationInSeconds?: number
}

// 渲染响应接口
interface RenderResponse {
  success: boolean
  renderId?: string
  status?: string
  message?: string
  outputUrl?: string
  progress?: number
  error?: string
}

// 生成唯一的渲染ID
function generateRenderId(): string {
  return `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 清理旧的渲染任务
function cleanupOldJobs() {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24小时

  for (const [renderId, job] of renderJobs.entries()) {
    if (now - job.createdAt.getTime() > maxAge) {
      renderJobs.delete(renderId)

      // 清理输出文件
      if (job.outputUrl && job.status === 'completed') {
        try {
          const filePath = path.join(process.cwd(), 'public', job.outputUrl)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (error) {
          console.warn('Failed to cleanup render file:', error)
        }
      }
    }
  }
}

// 主要API处理器
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 清理旧任务
    cleanupOldJobs()

    switch (req.method) {
      case 'POST':
        return await handleStartRender(req, res)
      case 'GET':
        return await handleGetStatus(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Video render API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 开始渲染
async function handleStartRender(req: NextApiRequest, res: NextApiResponse) {
  const renderRequest: RenderRequest = req.body

  if (!renderRequest.compositionId || !renderRequest.inputProps) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: compositionId, inputProps'
    })
  }

  try {
    const renderId = generateRenderId()

    // 初始化渲染任务
    renderJobs.set(renderId, {
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // 立即返回渲染ID
    res.status(200).json({
      success: true,
      renderId,
      status: 'started',
      message: '渲染任务已启动'
    } as RenderResponse)

    // 异步执行渲染
    startRenderProcess(renderId, renderRequest)

  } catch (error) {
    console.error('Failed to start render:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to start render',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 获取渲染状态
async function handleGetStatus(req: NextApiRequest, res: NextApiResponse) {
  const { renderId } = req.query

  if (!renderId || typeof renderId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Render ID is required'
    })
  }

  const job = renderJobs.get(renderId)

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Render job not found'
    })
  }

  return res.status(200).json({
    success: true,
    status: job.status,
    progress: job.progress,
    outputUrl: job.outputUrl,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  })
}

// 执行实际的渲染过程
async function startRenderProcess(renderId: string, request: RenderRequest) {
  const job = renderJobs.get(renderId)
  if (!job) return

  try {
    // 更新状态为渲染中
    job.status = 'rendering'
    job.progress = 1
    job.updatedAt = new Date()

    // 确保输出目录存在
    const outputDir = path.join(process.cwd(), 'public', 'renders')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, `${renderId}.${request.outputFormat}`)

    // 创建进度回调
    // bundle进度回调
  const bundleProgress = (progress: number) => {
    job.progress = Math.round(progress * 50) // bundle占50%进度
    job.updatedAt = new Date()
  }

    // Remotion渲染进度回调
    const renderProgress: RenderMediaOnProgress = ({ progress }) => {
      job.progress = 50 + Math.round(progress * 50) // 渲染占50%进度
      job.updatedAt = new Date()
    }

    // 使用Remotion进行真实渲染
    const bundled = await bundle(
      path.join(process.cwd(), 'src/remotion/index.ts'),
      bundleProgress,
      {
        webpackOverride: webpackOverride
      }
    )

    await renderMedia({
      composition: request.compositionId as any,
      serveUrl: bundled as any,
      codec: request.codec,
      outputLocation: outputPath,
      inputProps: request.inputProps,
      onProgress: renderProgress
    } as any)
    // 渲染完成
    job.status = 'completed'
    job.progress = 100
    job.outputUrl = `/renders/${renderId}.${request.outputFormat}`
    job.updatedAt = new Date()

    console.log(`✅ Render completed: ${renderId}`)

  } catch (error) {
    console.error(`❌ Render failed: ${renderId}`, error)

    // 更新错误状态
    job.status = 'error'
    job.error = error instanceof Error ? error.message : 'Unknown error'
    job.updatedAt = new Date()
  }
}

// 清理函数（可选，用于清理资源）
export async function cleanup() {
  renderJobs.clear()

  // 清理所有渲染文件
  const outputDir = path.join(process.cwd(), 'public', 'renders')
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir)
    for (const file of files) {
      fs.unlinkSync(path.join(outputDir, file))
    }
  }
}