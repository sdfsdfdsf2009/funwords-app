import { ConflictResolutionStrategy, BatchImportRequest, BatchImportResult } from '@/pages/api/scenes/batch-import'
import Papa from 'papaparse'
import { csvImportService } from './csvImport'
import { logger } from '../utils/logger'
import { rateLimitHandler, withRateLimitRetry, RetryConfig } from '../utils/rateLimitHandler'
import { withCSVDeduplication } from '../utils/requestDeduplicator'

export interface CSVSceneData {
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
}

export interface ConflictInfo {
  sceneNumber: number
  existingScene: {
    id: string
    title: string
    sceneNumber: number
    description?: string
    videoPrompt?: string
  }
  csvScene: {
    title: string
    sceneNumber: number
    description?: string
    videoPrompt?: string
  }
}

export interface ConflictDetectionResult {
  hasConflicts: boolean
  conflicts: ConflictInfo[]
  strategyRecommendations: StrategyRecommendation[]
}

export interface StrategyRecommendation {
  strategy: ConflictResolutionStrategy
  name: string
  description: string
  icon: string
  recommended: boolean
  impact: {
    created: number
    updated: number
    skipped: number
  }
}

export class CSVImportEnhancedService {
  /**
   * 验证数据转换过程中的完整性
   */
  private static validateDataIntegrity(
    originalScenes: any[],
    convertedScenes: CSVSceneData[]
  ): {
    isValid: boolean
    totalScenes: number
    dataLoss: boolean
    issues: string[]
    details: any
  } {
    const issues: string[] = []
    let dataLoss = false

    // 检查场景数量
    if (originalScenes.length !== convertedScenes.length) {
      issues.push(`场景数量不匹配: 原始${originalScenes.length}个，转换后${convertedScenes.length}个`)
      dataLoss = true
    }

    // 检查每个场景的数据完整性
    convertedScenes.forEach((scene, index) => {
      const original = originalScenes[index]
      if (!original) return

      // 检查场景编号
      if (scene.sceneNumber !== original.sceneNumber) {
        issues.push(`场景${index+1}编号变更: ${original.sceneNumber} → ${scene.sceneNumber}`)
      }

      // 检查图片提示词（转换为description）
      const originalImagePrompt = original.imagePrompt || ''
      if (scene.description !== originalImagePrompt) {
        issues.push(`场景${index+1}图片提示词变更: 长度${originalImagePrompt.length} → ${scene.description?.length || 0}`)
        if (originalImagePrompt.length > 0 && !scene.description) {
          dataLoss = true
        }
      }

      // 检查视频提示词
      const originalVideoPrompt = original.videoPrompt || ''
      if (scene.videoPrompt !== originalVideoPrompt) {
        issues.push(`场景${index+1}视频提示词变更: 长度${originalVideoPrompt.length} → ${scene.videoPrompt?.length || 0}`)
        if (originalVideoPrompt.length > 0 && !scene.videoPrompt) {
          dataLoss = true
        }
      }
    })

    const isValid = !dataLoss && issues.length === 0

    return {
      isValid,
      totalScenes: convertedScenes.length,
      dataLoss,
      issues,
      details: {
        originalSample: originalScenes.slice(0, 2).map(s => ({
          sceneNumber: s.sceneNumber,
          imagePromptLength: s.imagePrompt?.length || 0,
          videoPromptLength: s.videoPrompt?.length || 0
        })),
        convertedSample: convertedScenes.slice(0, 2).map(s => ({
          sceneNumber: s.sceneNumber,
          descriptionLength: s.description?.length || 0,
          videoPromptLength: s.videoPrompt?.length || 0
        }))
      }
    }
  }

  /**
   * 验证CSV数据完整性
   */
  static validateCSVData(scenes: CSVSceneData[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!scenes || scenes.length === 0) {
      errors.push('CSV数据为空或无效')
      return { isValid: false, errors, warnings }
    }

    // 检查必需字段
    scenes.forEach((scene, index) => {
      const rowNumber = index + 1

      if (!scene.sceneNumber || isNaN(scene.sceneNumber) || scene.sceneNumber < 1) {
        errors.push(`第${rowNumber}行: 场景编号无效，必须是大于0的整数`)
      }

      if (!scene.title || scene.title.trim().length === 0) {
        errors.push(`第${rowNumber}行: 场景标题不能为空`)
      }

      if (scene.title && scene.title.length > 200) {
        warnings.push(`第${rowNumber}行: 场景标题过长(${scene.title.length}字符)，建议不超过200字符`)
      }

      if (scene.description && scene.description.length > 2000) {
        warnings.push(`第${rowNumber}行: 图片描述过长(${scene.description.length}字符)，建议不超过2000字符`)
      }

      if (scene.videoPrompt && scene.videoPrompt.length > 2000) {
        warnings.push(`第${rowNumber}行: 视频提示词过长(${scene.videoPrompt.length}字符)，建议不超过2000字符`)
      }

      if (scene.duration && (isNaN(scene.duration) || scene.duration < 1 || scene.duration > 60)) {
        warnings.push(`第${rowNumber}行: 场景时长无效，使用默认值8秒`)
        scene.duration = 8
      }
    })

    // 检查场景编号重复
    const sceneNumbers = scenes.filter(s => s.sceneNumber).map(s => s.sceneNumber!)
    const duplicates = sceneNumbers.filter((num, index) => sceneNumbers.indexOf(num) !== index)
    if (duplicates.length > 0) {
      warnings.push(`发现重复的场景编号: ${[...new Set(duplicates)].join(', ')}，系统将自动重新编号`)
    }

    // 检查场景编号连续性
    const sortedNumbers = [...new Set(sceneNumbers)].sort((a, b) => a - b)
    if (sortedNumbers.length > 1) {
      const gaps = []
      for (let i = 1; i < sortedNumbers.length; i++) {
        if (sortedNumbers[i] - sortedNumbers[i-1] > 1) {
          gaps.push(`${sortedNumbers[i-1]+1}-${sortedNumbers[i]-1}`)
        }
      }
      if (gaps.length > 0) {
        warnings.push(`场景编号不连续，缺失编号: ${gaps.join(', ')}`)
      }
    }

    const isValid = errors.length === 0
    return { isValid, errors, warnings }
  }

  /**
   * 检测CSV导入中的冲突
   */
  static async detectConflicts(
    projectId: string,
    scenes: CSVSceneData[]
  ): Promise<ConflictDetectionResult> {
    const conflicts: ConflictInfo[] = []

    // 这里应该调用API检测冲突，现在先返回模拟数据
    for (const scene of scenes) {
      if (scene.sceneNumber) {
        // 模拟检测到冲突
        if (scene.sceneNumber <= 12) { // 假设1-12已存在
          conflicts.push({
            sceneNumber: scene.sceneNumber,
            existingScene: {
              id: `existing-${scene.sceneNumber}`,
              title: `现有场景 ${scene.sceneNumber}`,
              sceneNumber: scene.sceneNumber,
              description: `现有场景${scene.sceneNumber}的描述`,
              videoPrompt: `现有场景${scene.sceneNumber}的视频提示`
            },
            csvScene: {
              title: scene.title,
              sceneNumber: scene.sceneNumber,
              description: scene.description,
              videoPrompt: scene.videoPrompt
            }
          })
        }
      }
    }

    const hasConflicts = conflicts.length > 0
    const strategyRecommendations = this.generateStrategyRecommendations(conflicts)

    return {
      hasConflicts,
      conflicts,
      strategyRecommendations
    }
  }

  /**
   * 生成策略推荐
   */
  private static generateStrategyRecommendations(
    conflicts: ConflictInfo[]
  ): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [
      {
        strategy: 'skip',
        name: '跳过重复项',
        description: '保留现有场景，只导入新的场景。这是最安全的选择。',
        icon: '✓',
        recommended: true,
        impact: {
          created: 0,
          updated: 0,
          skipped: conflicts.length
        }
      },
      {
        strategy: 'renumber',
        name: '重新编号',
        description: '为冲突的场景分配新的编号，保留所有内容。',
        icon: '🔢',
        recommended: false,
        impact: {
          created: conflicts.length,
          updated: 0,
          skipped: 0
        }
      },
      {
        strategy: 'update',
        name: '更新现有',
        description: '用CSV数据替换现有场景的内容。',
        icon: '🔄',
        recommended: false,
        impact: {
          created: 0,
          updated: conflicts.length,
          skipped: 0
        }
      },
      {
        strategy: 'merge',
        name: '智能合并',
        description: '智能合并现有内容和CSV数据。',
        icon: '🤝',
        recommended: false,
        impact: {
          created: 0,
          updated: Math.min(conflicts.length, Math.ceil(conflicts.length * 0.7)),
          skipped: Math.max(0, conflicts.length - Math.ceil(conflicts.length * 0.7))
        }
      }
    ]

    return recommendations
  }

  /**
   * 执行批量导入 - 使用智能速率限制处理和请求去重
   */
  static async executeBatchImport(
    projectId: string,
    scenes: CSVSceneData[],
    strategy: ConflictResolutionStrategy
  ): Promise<BatchImportResult> {
    const request: BatchImportRequest = {
      projectId,
      scenes,
      strategy
    }

    // 检查是否应该阻止请求（基于历史速率限制）
    const requestUrl = '/api/scenes/batch-import'
    if (rateLimitHandler.shouldBlockRequest(requestUrl)) {
      throw new Error('检测到频繁的请求，为避免触发速率限制，请等待片刻后重试。\n\n建议：\n1. 等待1-2分钟后重试\n2. 分批导入较小的文件\n3. 检查是否有其他程序在同时发送请求')
    }

    // 记录请求元数据
    rateLimitHandler.recordRequest(requestUrl, 'POST')

    // 配置智能重试策略，特别针对CSV导入场景
    const retryConfig: Partial<RetryConfig> = {
      maxRetries: 6, // 增加重试次数
      baseDelay: 3000, // 3秒基础延迟，更保守
      maxDelay: 120000, // 最大2分钟
      backoffFactor: 2.0, // 适中的退避因子
      jitter: true, // 启用抖动避免雷群效应
      retryableErrors: [
        'Too Many Requests',
        'rate limit',
        'rate_limit_exceeded',
        '429',
        'quota exceeded',
        'throttled',
        'network timeout',
        'connection failed',
        'Failed to fetch'
      ],
      retryableStatusCodes: [429, 502, 503, 504, 520, 521, 522, 523, 524, 408]
    }

    logger.info('Starting batch import with intelligent rate limiting and deduplication', {
      projectId,
      sceneCount: scenes.length,
      strategy,
      retryConfig
    })

    // 使用请求去重和智能重试机制执行请求
    return await withCSVDeduplication(projectId, `batch-import-${strategy}`, async (signal) => {
      return await withRateLimitRetry(async () => {
        // 构建更安全的User-Agent
        let userAgent = 'AI-Creator-App/1.0'
        if (typeof navigator !== 'undefined' && navigator.userAgent) {
          // 如果User-Agent包含可能触发CORS检测的关键词，使用标准User-Agent
          const ua = navigator.userAgent
          if (ua.includes('Mozilla') && (ua.includes('Chrome') || ua.includes('Safari') || ua.includes('Firefox'))) {
            userAgent = ua
          }
        }

        // 检查是否请求已被取消
        if (signal.aborted) {
          throw new Error('请求被取消')
        }

        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            // 添加请求ID以便调试
            'X-Request-ID': `csv-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          },
          body: JSON.stringify(request),
          signal: signal // 传入取消信号
        })

        // 记录详细的响应信息用于调试
        const rateLimitInfo = rateLimitHandler.analyzeRateLimit(response)
        if (rateLimitInfo.isRateLimited) {
          logger.warn('Rate limit detected in batch import response', {
            projectId,
            sceneCount: scenes.length,
            rateLimitInfo,
            responseStatus: response.status,
            responseHeaders: Object.fromEntries(response.headers.entries())
          })
        }

        if (!response.ok) {
          // 针对不同类型的错误提供特定的处理
          if (response.status === 429) {
            // 速率限制错误 - 让重试机制处理
            const errorText = await response.text()
            const error = new Error(`请求频率过高: ${response.statusText} (${response.status})`)
            ;(error as any).response = response
            ;(error as any).rateLimitInfo = rateLimitInfo
            throw error
          }

          // 检查是否是CORS相关的错误
          if (response.status === 400 || response.status === 403) {
            const errorText = await response.text()
            if (errorText.includes('CORS') || errorText.includes('User-Agent')) {
              throw new Error(`安全验证失败: ${errorText}`)
            }
          }

          // 其他HTTP错误
          throw new Error(`导入失败: ${response.statusText} (${response.status})`)
        }

        const result: BatchImportResult = await response.json()

        logger.info('Batch import successful', {
          projectId,
          sceneCount: scenes.length,
          strategy,
          result,
          rateLimitStats: rateLimitHandler.getRateLimitStats()
        })

        return result
      }, retryConfig)
    })
  }

  /**
   * 解析CSV数据 - 使用专业的CSV解析服务确保数据完整性
   */
  static async parseCSVFromFile(file: File, fieldMapping?: any): Promise<CSVSceneData[]> {
    try {
      logger.info('Starting enhanced CSV parsing with professional service', {
        fileName: file.name,
        fileSize: file.size,
        fieldMapping
      })

      // 使用专业的CSV导入服务进行解析，确保UTF-8编码和字段映射
      const importResult = await csvImportService.parseCSVFile(file, fieldMapping, {
        encoding: 'UTF-8',
        trimWhitespace: true,
        skipEmptyRows: true
      })

      logger.info('Enhanced CSV parsing completed', {
        totalScenes: importResult.scenes.length,
        errors: importResult.errors.length,
        warnings: importResult.warnings.length
      })

      // 转换为增强服务所需的格式 - 修复数据丢失问题
      const enhancedScenes: CSVSceneData[] = importResult.scenes.map(scene => {
        // 验证原始数据完整性
        logger.debug('Converting scene data', {
          sceneNumber: scene.sceneNumber,
          hasImagePrompt: !!scene.imagePrompt,
          imagePromptLength: scene.imagePrompt?.length || 0,
          hasVideoPrompt: !!scene.videoPrompt,
          videoPromptLength: scene.videoPrompt?.length || 0
        });

        // 生成智能标题，优先使用有意义的描述
        let title = `场景 ${scene.sceneNumber}`;
        if (scene.imagePrompt && scene.imagePrompt.trim().length > 0) {
          // 使用图片提示词的前50个字符作为标题，如果提示词太长
          const shortPrompt = scene.imagePrompt.length > 50
            ? scene.imagePrompt.substring(0, 47) + '...'
            : scene.imagePrompt;
          title = shortPrompt;
        }

        return {
          sceneNumber: scene.sceneNumber,
          title: title, // 使用有意义的标题
          description: scene.imagePrompt, // 保持原始图片提示词
          videoPrompt: scene.videoPrompt,
          duration: 8 // 默认时长
        };
      })

      // 记录数据转换详情用于调试
      logger.info('CSV data conversion completed', {
        originalScenes: importResult.scenes.length,
        convertedScenes: enhancedScenes.length,
        sampleData: enhancedScenes.slice(0, 2).map(scene => ({
          sceneNumber: scene.sceneNumber,
          titleLength: scene.title?.length || 0,
          descriptionLength: scene.description?.length || 0,
          videoPromptLength: scene.videoPrompt?.length || 0
        }))
      })

      // 验证数据完整性，确保转换过程中没有数据丢失
      const integrityReport = this.validateDataIntegrity(importResult.scenes, enhancedScenes)
      logger.info('Data integrity validation completed', integrityReport)

      return enhancedScenes

    } catch (error) {
      logger.error('Enhanced CSV parsing failed', {
        error: error.message,
        fileName: file.name,
        stack: error.stack
      })
      throw new Error(`CSV解析失败: ${error.message}`)
    }
  }

  /**
   * 解析CSV数据 - 兼容性方法，保持向后兼容
   * @deprecated 请使用 parseCSVFromFile 方法
   */
  static parseCSV(csvText: string): CSVSceneData[] {
    logger.warn('Using deprecated parseCSV method, please migrate to parseCSVFromFile', {
      textLength: csvText.length
    })

    // 创建一个临时文件对象来使用专业解析服务
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
    const file = new File([blob], 'temp.csv', { type: 'text/csv;charset=utf-8;' })

    // 同步解析以保持向后兼容性
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      return []
    }

    try {
      // 使用Papa Parse进行更好的解析
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        transformHeader: (header) => header.trim().replace(/"/g, ''),
        transform: (value) => value.trim().replace(/"/g, '')
      })

      if (!parseResult.data || parseResult.data.length === 0) {
        return []
      }

      const scenes: CSVSceneData[] = []

      parseResult.data.forEach((row: any, index: number) => {
        try {
          // 智能字段检测
          const sceneNumber = this.extractSceneNumber(row)
          const title = this.extractTitle(row)
          const description = this.extractDescription(row)
          const videoPrompt = this.extractVideoPrompt(row)

          if (sceneNumber && title) {
            scenes.push({
              sceneNumber,
              title,
              description,
              videoPrompt,
              duration: 8
            })
          }
        } catch (error) {
          logger.warn(`Failed to parse CSV row ${index + 1}`, {
            row,
            error: error.message
          })
        }
      })

      logger.info('Legacy CSV parsing completed', {
        totalRows: parseResult.data.length,
        validScenes: scenes.length
      })

      return scenes

    } catch (error) {
      logger.error('Legacy CSV parsing failed, falling back to basic parsing', {
        error: error.message
      })

      // 回退到基本解析
      return this.fallbackParseCSV(csvText)
    }
  }

  /**
   * 回退的CSV解析方法
   */
  private static fallbackParseCSV(csvText: string): CSVSceneData[] {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      return []
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const scenes: CSVSceneData[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))

      if (values.length >= 2) {
        const sceneData: CSVSceneData = {
          title: values[0] || `场景 ${i}`,
          sceneNumber: parseInt(values[1]) || i
        }

        if (values[2]) sceneData.description = values[2]
        if (values[3]) sceneData.videoPrompt = values[3]
        if (values[4]) sceneData.duration = parseInt(values[4]) || 8

        scenes.push(sceneData)
      }
    }

    return scenes
  }

  /**
   * 从CSV行中提取场景编号
   */
  private static extractSceneNumber(row: any): number | undefined {
    const possibleFields = ['sceneNumber', 'scene', 'Scene', '序号', '场景编号', '编号', 'No.', 'number', 'Number']

    for (const field of possibleFields) {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        const parsed = parseInt(row[field].toString(), 10)
        if (!isNaN(parsed) && parsed > 0) {
          return parsed
        }
      }
    }

    return undefined
  }

  /**
   * 从CSV行中提取标题
   */
  private static extractTitle(row: any): string {
    const possibleFields = ['title', 'Title', '标题', '名称', 'name', 'Name']

    for (const field of possibleFields) {
      if (row[field] && row[field].trim()) {
        return row[field].trim()
      }
    }

    // 如果没有找到标题字段，使用第一个非空字段作为标题
    const values = Object.values(row).filter(v => v && v.toString().trim())
    return values.length > 0 ? values[0].toString().trim() : '未命名场景'
  }

  /**
   * 从CSV行中提取描述（图片提示词）
   */
  private static extractDescription(row: any): string | undefined {
    const possibleFields = ['imagePrompt', 'image', 'description', 'Description', '图片描述', '图片提示词', 'prompt', 'Prompt']

    for (const field of possibleFields) {
      if (row[field] && row[field].trim()) {
        return row[field].trim()
      }
    }

    return undefined
  }

  /**
   * 从CSV行中提取视频提示词
   */
  private static extractVideoPrompt(row: any): string | undefined {
    const possibleFields = ['videoPrompt', 'video', 'Video', '视频描述', '视频提示词', 'animation', 'Animation', 'motion', 'Motion']

    for (const field of possibleFields) {
      if (row[field] && row[field].trim()) {
        return row[field].trim()
      }
    }

    return undefined
  }

  /**
   * 获取策略的详细描述
   */
  static getStrategyDescription(strategy: ConflictResolutionStrategy): string {
    const descriptions: Record<ConflictResolutionStrategy, string> = {
      skip: '跳过所有冲突的场景，保持现有项目不变。这是最安全的选项，适用于只想添加新内容而不影响现有内容的场景。',
      renumber: '自动为冲突的场景分配新的编号，确保所有内容都能导入。适用于保留所有内容但需要重新整理场景顺序的场景。',
      update: '用CSV数据完全替换冲突的现有场景。适用于需要更新现有项目内容的场景。',
      merge: '智能合并现有内容和CSV数据，保留有价值的更新。适用于需要整合新旧内容的场景。'
    }

    return descriptions[strategy] || '未知策略'
  }

  /**
   * 获取策略的图标
   */
  static getStrategyIcon(strategy: ConflictResolutionStrategy): string {
    const icons: Record<ConflictResolutionStrategy, string> = {
      skip: '✅',
      renumber: '🔢',
      update: '🔄',
      merge: '🤝'
    }

    return icons[strategy] || '❓'
  }

  /**
   * 验证CSV数据格式
   */
  static validateCSVData(scenes: CSVSceneData[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    scenes.forEach((scene, index) => {
      const lineNumber = index + 1

      if (!scene.title || scene.title.trim() === '') {
        errors.push(`第${lineNumber}行：标题不能为空`)
      }

      if (!scene.sceneNumber && scene.sceneNumber !== 0) {
        warnings.push(`第${lineNumber}行：场景编号为空，将自动分配`)
      }

      if (scene.sceneNumber && scene.sceneNumber < 1) {
        errors.push(`第${lineNumber}行：场景编号必须大于0`)
      }

      if (scene.sceneNumber && scene.sceneNumber > 1000) {
        warnings.push(`第${lineNumber}行：场景编号过大 (${scene.sceneNumber})，请确认是否正确`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 格式化导入结果为用户友好的消息
   */
  static formatImportResult(result: BatchImportResult): {
    title: string
    message: string
    details: string[]
  } {
    const { summary } = result

    let title = ''
    let message = ''
    const details: string[] = []

    if (result.success) {
      title = '导入成功！'

      if (summary.conflicts > 0) {
        message = `成功处理了 ${summary.total} 个场景，解决了 ${summary.conflicts} 个冲突。`
        details.push(`✅ 成功处理: ${summary.successful} 个场景`)
        details.push(`🔀 冲突解决: ${summary.conflicts} 个场景`)
      } else {
        message = `成功创建了 ${summary.created} 个新场景。`
        details.push(`✅ 创建成功: ${summary.created} 个场景`)
      }
    } else {
      title = '导入部分成功'
      message = `${summary.successful} 个成功，${summary.failed} 个失败。`
      details.push(`✅ 成功处理: ${summary.successful} 个场景`)
      details.push(`❌ 处理失败: ${summary.failed} 个场景`)

      if (summary.conflicts > 0) {
        details.push(`🔀 冲突解决: ${summary.conflicts} 个场景`)
      }
    }

    if (summary.created > 0) {
      details.push(`➕ 新建场景: ${summary.created} 个`)
    }
    if (summary.updated > 0) {
      details.push(`🔄 更新场景: ${summary.updated} 个`)
    }
    if (summary.skipped > 0) {
      details.push(`⏭️ 跳过场景: ${summary.skipped} 个`)
    }

    return { title, message, details }
  }

  /**
   * 获取默认策略（基于用户友好的推荐）
   */
  static getDefaultStrategy(hasConflicts: boolean): ConflictResolutionStrategy {
    // 对于有冲突的情况，默认推荐跳过策略（最安全）
    return hasConflicts ? 'skip' : 'renumber'
  }

  /**
   * 检查是否可以自动解决冲突（无用户交互）
   */
  static canAutoResolve(conflicts: ConflictInfo[]): boolean {
    // 如果冲突数量较少且都是简单的重复编号冲突，可以自动解决
    return conflicts.length <= 5 && conflicts.every(c =>
      c.csvScene.title === c.existingScene.title ||
      c.csvScene.description === c.existingScene.description
    )
  }

  /**
   * 预览导入结果
   */
  static previewImportResult(
    strategy: ConflictResolutionStrategy,
    conflicts: ConflictInfo[]
  ): {
    preview: string
    confidence: number
    estimatedTime: string
  } {
    const recommendations = this.generateStrategyRecommendations(conflicts)
    const recommendation = recommendations.find(r => r.strategy === strategy)

    if (!recommendation) {
      return {
        preview: '无效策略',
        confidence: 0,
        estimatedTime: '未知'
      }
    }

    const confidence = recommendation.recommended ? 95 : 70
    const estimatedTime = this.estimateProcessingTime(conflicts.length)

    return {
      preview: this.getStrategyDescription(strategy),
      confidence,
      estimatedTime
    }
  }

  /**
   * 估算处理时间
   */
  private static estimateProcessingTime(conflictCount: number): string {
    if (conflictCount === 0) return '5秒'
    if (conflictCount <= 5) return '10秒'
    if (conflictCount <= 10) return '15秒'
    return '约30秒'
  }
}

// 导出单例实例
export const csvImportEnhancedService = new CSVImportEnhancedService()