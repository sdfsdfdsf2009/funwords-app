import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

// 冲突解决策略类型
export type ConflictResolutionStrategy = 'skip' | 'renumber' | 'update' | 'merge'

export interface BatchImportRequest {
  projectId: string
  scenes: Array<{
    sceneNumber?: number
    title: string
    description?: string
    videoPrompt?: string
    model?: string
    duration?: number
    status?: string
    transition?: string
    focusPeriods?: string
    images?: string[]
    videos?: string[]
    generatedVideos?: string[]
  }>
  strategy: ConflictResolutionStrategy
}

export interface BatchImportResult {
  success: boolean
  message: string
  results: {
    successful: Array<{
      sceneNumber: number
      sceneId: string
      title: string
      action: 'created' | 'updated' | 'skipped'
    }>
    failed: Array<{
      sceneNumber: number
      title: string
      error: string
    }>
    conflicts: Array<{
      sceneNumber: number
      existingScene: {
        id: string
        title: string
        sceneNumber: number
      }
      csvScene: {
        title: string
        sceneNumber: number
      }
    }>
  }
  summary: {
    total: number
    successful: number
    failed: number
    conflicts: number
    skipped: number
    created: number
    updated: number
  }
}

/**
 * 检测场景冲突
 */
async function detectConflicts(projectId: string, scenes: BatchImportRequest['scenes']) {
  const existingScenes = await prismaHelpers.getScenesByProject(projectId)
  const conflicts: BatchImportResult['results']['conflicts'] = []

  for (const csvScene of scenes) {
    if (csvScene.sceneNumber) {
      const existingScene = existingScenes.find(s => s.sceneNumber === csvScene.sceneNumber)
      if (existingScene) {
        conflicts.push({
          sceneNumber: csvScene.sceneNumber,
          existingScene: {
            id: existingScene.id,
            title: existingScene.title,
            sceneNumber: existingScene.sceneNumber
          },
          csvScene: {
            title: csvScene.title,
            sceneNumber: csvScene.sceneNumber
          }
        })
      }
    }
  }

  return conflicts
}

/**
 * 获取下一个可用的场景编号
 */
async function getNextAvailableSceneNumber(projectId: string) {
  const existingScenes = await prismaHelpers.getScenesByProject(projectId)
  const existingNumbers = existingScenes.map(s => s.sceneNumber).sort((a, b) => a - b)

  let nextNumber = 1
  for (const existingNumber of existingNumbers) {
    if (nextNumber < existingNumber) {
      break
    }
    if (nextNumber === existingNumber) {
      nextNumber++
    }
  }

  return nextNumber
}

/**
 * 批量导入场景
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchImportResult>
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        results: { successful: [], failed: [], conflicts: [] },
        summary: { total: 0, successful: 0, failed: 0, conflicts: 0, skipped: 0, created: 0, updated: 0 }
      })
    }

    const { projectId, scenes, strategy }: BatchImportRequest = req.body

    // 验证输入
    if (!projectId || !scenes || !Array.isArray(scenes) || !strategy) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input: projectId, scenes array, and strategy are required',
        results: { successful: [], failed: [], conflicts: [] },
        summary: { total: 0, successful: 0, failed: 0, conflicts: 0, skipped: 0, created: 0, updated: 0 }
      })
    }

    // 检测冲突
    const conflicts = await detectConflicts(projectId, scenes)

    const result: BatchImportResult = {
      success: true,
      message: '',
      results: {
        successful: [],
        failed: [],
        conflicts
      },
      summary: {
        total: scenes.length,
        successful: 0,
        failed: 0,
        conflicts: conflicts.length,
        skipped: 0,
        created: 0,
        updated: 0
      }
    }

    // 处理每个场景
    for (const csvScene of scenes) {
      try {
        let sceneResult: any
        let action: 'created' | 'updated' | 'skipped'

        if (csvScene.sceneNumber) {
          const conflict = conflicts.find(c => c.sceneNumber === csvScene.sceneNumber)

          if (conflict) {
            // 处理冲突场景
            switch (strategy) {
              case 'skip':
                action = 'skipped'
                result.summary.skipped++
                result.results.successful.push({
                  sceneNumber: csvScene.sceneNumber,
                  sceneId: conflict.existingScene.id,
                  title: conflict.existingScene.title,
                  action
                })
                continue

              case 'renumber':
                const newSceneNumber = await getNextAvailableSceneNumber(projectId)
                sceneResult = await prismaHelpers.createSceneWithExplicitNumber(
                  projectId,
                  newSceneNumber,
                  {
                    title: csvScene.title,
                    description: csvScene.description || null,
                    videoPrompt: csvScene.videoPrompt || null,
                    model: csvScene.model || null,
                    duration: csvScene.duration || 8,
                    status: csvScene.status || 'PENDING',
                    transition: csvScene.transition || null,
                    focusPeriods: csvScene.focusPeriods || null,
                    images: csvScene.images || [],
                    videos: csvScene.videos || [],
                    generatedVideos: csvScene.generatedVideos || []
                  }
                )
                action = 'created'
                result.summary.created++
                result.results.successful.push({
                  sceneNumber: newSceneNumber,
                  sceneId: sceneResult.id,
                  title: sceneResult.title,
                  action
                })
                break

              case 'update':
                sceneResult = await prismaHelpers.updateScene(conflict.existingScene.id, {
                  title: csvScene.title,
                  description: csvScene.description || null,
                  videoPrompt: csvScene.videoPrompt || null,
                  model: csvScene.model || null,
                  duration: csvScene.duration || 8,
                  status: csvScene.status || 'PENDING',
                  transition: csvScene.transition || null,
                  focusPeriods: csvScene.focusPeriods || null,
                  images: csvScene.images || [],
                  videos: csvScene.videos || [],
                  generatedVideos: csvScene.generatedVideos || []
                })
                action = 'updated'
                result.summary.updated++
                result.results.successful.push({
                  sceneNumber: csvScene.sceneNumber,
                  sceneId: sceneResult.id,
                  title: sceneResult.title,
                  action
                })
                break

              case 'merge':
                // 简单合并策略：更新非空字段
                const updateData: any = {}
                if (csvScene.title) updateData.title = csvScene.title
                if (csvScene.description) updateData.description = csvScene.description
                if (csvScene.videoPrompt) updateData.videoPrompt = csvScene.videoPrompt
                if (csvScene.model) updateData.model = csvScene.model
                if (csvScene.duration) updateData.duration = csvScene.duration
                if (csvScene.status) updateData.status = csvScene.status
                if (csvScene.transition) updateData.transition = csvScene.transition
                if (csvScene.focusPeriods) updateData.focusPeriods = csvScene.focusPeriods
                if (csvScene.images) updateData.images = csvScene.images
                if (csvScene.videos) updateData.videos = csvScene.videos
                if (csvScene.generatedVideos) updateData.generatedVideos = csvScene.generatedVideos

                if (Object.keys(updateData).length > 0) {
                  sceneResult = await prismaHelpers.updateScene(conflict.existingScene.id, updateData)
                  action = 'updated'
                  result.summary.updated++
                } else {
                  action = 'skipped'
                  result.summary.skipped++
                  sceneResult = conflict.existingScene
                }

                result.results.successful.push({
                  sceneNumber: csvScene.sceneNumber,
                  sceneId: sceneResult.id,
                  title: sceneResult.title,
                  action
                })
                break

              default:
                throw new Error(`Unknown strategy: ${strategy}`)
            }
          } else {
            // 无冲突，直接创建
            sceneResult = await prismaHelpers.createSceneWithExplicitNumber(
              projectId,
              csvScene.sceneNumber,
              {
                title: csvScene.title,
                description: csvScene.description || null,
                videoPrompt: csvScene.videoPrompt || null,
                model: csvScene.model || null,
                duration: csvScene.duration || 8,
                status: csvScene.status || 'PENDING',
                transition: csvScene.transition || null,
                focusPeriods: csvScene.focusPeriods || null,
                images: csvScene.images || [],
                videos: csvScene.videos || [],
                generatedVideos: csvScene.generatedVideos || []
              }
            )
            action = 'created'
            result.summary.created++
            result.results.successful.push({
              sceneNumber: csvScene.sceneNumber,
              sceneId: sceneResult.id,
              title: sceneResult.title,
              action
            })
          }
        } else {
          // 自动分配场景编号
          const nextSceneNumber = await getNextAvailableSceneNumber(projectId)
          sceneResult = await prismaHelpers.createSceneWithAtomicNumber(projectId, {
            title: csvScene.title,
            description: csvScene.description || null,
            videoPrompt: csvScene.videoPrompt || null,
            model: csvScene.model || null,
            duration: csvScene.duration || 8,
            status: csvScene.status || 'PENDING',
            transition: csvScene.transition || null,
            focusPeriods: csvScene.focusPeriods || null,
            images: csvScene.images || [],
            videos: csvScene.videos || [],
            generatedVideos: csvScene.generatedVideos || []
          })
          action = 'created'
          result.summary.created++
          result.results.successful.push({
            sceneNumber: nextSceneNumber,
            sceneId: sceneResult.id,
            title: sceneResult.title,
            action
          })
        }

      } catch (error: any) {
        console.error('Failed to process scene:', {
          sceneNumber: csvScene.sceneNumber,
          title: csvScene.title,
          error: error.message
        })

        result.results.failed.push({
          sceneNumber: csvScene.sceneNumber || 0,
          title: csvScene.title,
          error: error.message
        })
        result.summary.failed++
      }
    }

    // 计算成功数量
    result.summary.successful = result.results.successful.length

    // 确定消息
    if (result.summary.failed === 0) {
      result.success = true
      if (result.summary.conflicts > 0) {
        result.message = `批量导入成功！处理了 ${result.summary.total} 个场景，解决了 ${result.summary.conflicts} 个冲突。`
      } else {
        result.message = `批量导入成功！创建了 ${result.summary.created} 个新场景。`
      }
    } else {
      result.success = false
      result.message = `批量导入部分成功。${result.summary.successful} 个成功，${result.summary.failed} 个失败。`
    }

    return res.status(200).json(result)

  } catch (error: any) {
    console.error('Batch import error:', error)

    return res.status(500).json({
      success: false,
      message: `批量导入失败: ${error.message}`,
      results: { successful: [], failed: [], conflicts: [] },
      summary: { total: 0, successful: 0, failed: 0, conflicts: 0, skipped: 0, created: 0, updated: 0 }
    })
  }
}