import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, AlertCircle, CheckCircle, FileText, X } from 'lucide-react';
import { csvImportService, CSVImportResult } from '../../services/csvImport';
import { CSVPreviewData, FieldMapping } from '../../types';
import { useProjectStore } from '../../stores/projectStore';
import { useDatabaseProjectStore } from '../../stores/databaseProjectStore';
import { logger, logFeature } from '../../utils/logger';
import CSVFieldMapper from './CSVFieldMapper';
import ConflictResolutionModal from './ConflictResolutionModal';
import ImportProgressModal from './ImportProgressModal';
import { CSVImportEnhancedService, ConflictResolutionStrategy } from '@/services/csvImportEnhanced';
import { BatchImportResult } from '@/pages/api/scenes/batch-import';
import RateLimitErrorModal from '../ui/RateLimitErrorModal';

interface CSVImportProps {
  onComplete?: (result: CSVImportResult) => void;
  onError?: (error: Error) => void;
}

export const CSVImport: React.FC<CSVImportProps> = ({ onComplete, onError }) => {
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVPreviewData | null>(null);
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [needsFieldMapping, setNeedsFieldMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conflict resolution states
  const [conflictResolution, setConflictResolution] = useState<{
    show: boolean
    conflicts: any
    csvData: any[]
  }>({ show: false, conflicts: null, csvData: [] });

  const [importProgress, setImportProgress] = useState<{
    show: boolean
    isProcessing: boolean
    result: BatchImportResult | null
    error: string | null
    progress?: { current: number; total: number; currentScene?: string }
  }>({ show: false, isProcessing: false, result: null, error: null });

  // Rate limit error handling
  const [rateLimitError, setRateLimitError] = useState<{
    show: boolean
    error: Error | null
    retryCount: number
    estimatedWaitTime: number
  }>({ show: false, error: null, retryCount: 0, estimatedWaitTime: 0 });

  const { importScenesFromCSV, setCurrentProject } = useProjectStore();
  const databaseStore = useDatabaseProjectStore();
  const { currentProject } = databaseStore;

  // 增强的项目数据刷新函数
  const refreshProjectDataWithSync = async (projectId: string, maxRetries: number = 3) => {
    const delays = [800, 1500, 2500]; // 递增延迟，确保数据库事务完成

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[refreshProjectDataWithSync] 开始第 ${attempt + 1} 次刷新尝试，项目ID: ${projectId}`);

        // 等待一段时间确保数据库写入完成
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));

        // 强制刷新数据库store
        await databaseStore.refreshCurrentProject(0, projectId);

        // 验证刷新结果
        const refreshedProject = databaseStore.currentProject;
        const sceneCount = refreshedProject?.scenes?.length || 0;

        console.log(`[refreshProjectDataWithSync] 第 ${attempt + 1} 次刷新完成，场景数量: ${sceneCount}`);
        console.log(`[refreshProjectDataWithSync] 项目ID: ${refreshedProject?.id}, 期望: ${projectId}`);

        // 验证项目ID是否匹配
        if (refreshedProject && refreshedProject.id === projectId && sceneCount > 0) {
          console.log(`[refreshProjectDataWithSync] 项目ID匹配，场景数量 > 0，开始同步到ProjectStore`);

          // 同步到旧版本的store
          await setCurrentProject(projectId);

          // 验证同步结果
          await new Promise(resolve => setTimeout(resolve, 100));
          const finalProject = databaseStore.currentProject;
          const finalSceneCount = finalProject?.scenes?.length || 0;

          if (finalSceneCount > 0) {
            console.log(`[refreshProjectDataWithSync] 同步成功！最终场景数量: ${finalSceneCount}`);

            // 显示成功提示
            setError(null); // 清除任何之前的错误
            return true;
          }
        }

        // 如果场景数量为0但项目ID匹配，可能需要更长时间等待
        if (refreshedProject && refreshedProject.id === projectId && sceneCount === 0) {
          console.warn(`[refreshProjectDataWithSync] 项目ID匹配但场景数量为0，可能需要更长时间等待`);
          continue; // 继续下一次重试
        }

        // 如果项目ID不匹配，说明可能有并发问题
        if (refreshedProject && refreshedProject.id !== projectId) {
          console.warn(`[refreshProjectDataWithSync] 项目ID不匹配: 期望 ${projectId}, 实际 ${refreshedProject.id}`);
          continue;
        }

      } catch (error) {
        console.error(`[refreshProjectDataWithSync] 第 ${attempt + 1} 次刷新失败:`, error);

        if (attempt === maxRetries - 1) {
          // 最后一次尝试失败
          setError('数据保存成功，但界面刷新失败。请手动刷新页面或检查网络连接。');
        }
      }
    }

    // 所有重试都失败
    console.error(`[refreshProjectDataWithSync] 所有 ${maxRetries} 次刷新尝试都失败`);
    return false;
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);

    try {
      logger.info('Processing CSV file', { fileName: file.name, fileSize: file.size });

      // Validate file first
      const validation = await csvImportService.validateCSVFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Preview CSV to detect if field mapping is needed
      const preview = await csvImportService.previewCSVFile(file);
      setPreviewData(preview);

      // Check if field mapping is needed
      const standardHeaders = {
        sceneNumber: ['sceneNumber', 'scene', '序号', '场景序号', '场景编号', '编号', 'number', 'No.'],
        imagePrompt: ['imagePrompt', 'image', '图片描述', '图片提示词', '图片', '图像描述', 'prompt', 'description'],
        videoPrompt: ['videoPrompt', 'video', '视频描述', '视频提示词', '视频', '动态描述', '动态说明', 'animation', 'motion']
      };

      // Try to auto-detect field mapping
      const detectedMapping: FieldMapping = {
        sceneNumber: '',
        imagePrompt: '',
        videoPrompt: ''
      };

      let detectedAll = true;

      // Detect each required field
      Object.entries(standardHeaders).forEach(([field, possibleHeaders]) => {
        const matchedHeader = preview.headers.find(header =>
          possibleHeaders.some(possible =>
            header.toLowerCase().includes(possible.toLowerCase()) ||
            possible.toLowerCase().includes(header.toLowerCase())
          )
        );

        if (matchedHeader) {
          detectedMapping[field as keyof FieldMapping] = matchedHeader;
        } else {
          detectedAll = false;
        }
      });

      // 更宽松的检测条件 - 如果有预览数据就显示字段映射界面，让用户确认
      if (preview.suggestedMapping) {
        // Always show field mapper for user confirmation, even if auto-detected
        setNeedsFieldMapping(true);
        setShowFieldMapper(true);
        logger.info('Showing field mapper for user confirmation', {
          detectedAll,
          suggestedMapping: preview.suggestedMapping
        }, 'csv-import');
      } else {
        // Fallback to manual field mapping
        setNeedsFieldMapping(true);
        setShowFieldMapper(true);
        logger.warn('No field mapping available, showing manual mapper', 'csv-import');
      }

    } catch (error) {
      logger.error('CSV processing failed', { error: error.message, fileName: file.name }, 'csv-import');
      setError(error.message);
      onError?.(error);
      setSelectedFile(null);
      setPreviewData(null);
    }
  }, [setError, onError]);

  // Enhanced CSV import with conflict detection
  const importWithConflictDetection = async (file: File, fieldMapping?: FieldMapping) => {
    const currentProject = databaseStore.currentProject;
    if (!currentProject) {
      throw new Error('请先选择一个项目');
    }

    setIsImporting(true);

    try {
      logger.info('Starting enhanced CSV import with conflict detection', {
        fileName: file.name,
        projectId: currentProject.id,
        fieldMapping
      });

      // Parse CSV file using enhanced service with proper UTF-8 encoding
      const csvScenes = await CSVImportEnhancedService.parseCSVFromFile(file, fieldMapping);
      logger.info('Parsed CSV scenes with enhanced service', {
        count: csvScenes.length,
        fileName: file.name,
        hasFieldMapping: !!fieldMapping
      });

      if (csvScenes.length === 0) {
        throw new Error('CSV文件中没有找到有效的场景数据');
      }

      // Validate CSV data
      const validation = CSVImportEnhancedService.validateCSVData(csvScenes);
      if (!validation.isValid) {
        throw new Error(`CSV数据验证失败:\n${validation.errors.join('\n')}`);
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('CSV validation warnings', { warnings: validation.warnings });
      }

      // Detect conflicts
      const conflicts = await CSVImportEnhancedService.detectConflicts(currentProject.id, csvScenes);
      logger.info('Conflict detection completed', {
        hasConflicts: conflicts.hasConflicts,
        conflictCount: conflicts.conflicts.length
      });

      if (conflicts.hasConflicts) {
        // Show conflict resolution modal
        setConflictResolution({
          show: true,
          conflicts,
          csvData: csvScenes
        });
      } else {
        // No conflicts, proceed directly with import
        await executeBatchImport(csvScenes, 'skip'); // Use skip strategy when no conflicts
      }

    } catch (error) {
      // 检查是否是速率限制错误
      if (isRateLimitError(error)) {
        logger.warn('Rate limit error detected in CSV import', {
          error: error.message,
          fileName: file.name,
          projectId: currentProject?.id
        }, 'csv-import');

        // 提取重试次数和等待时间
        const retryCount = extractRetryCount(error.message) || 0;
        const estimatedWaitTime = extractWaitTime(error.message) || calculateEstimatedWaitTime(retryCount);

        setRateLimitError({
          show: true,
          error,
          retryCount,
          estimatedWaitTime
        });
        return;
      }

      // 详细的错误处理，特别针对网络和CORS错误
      let errorMessage = error.message;

      if (error.message.includes('CORS') || error.message.includes('cors')) {
        errorMessage = '网络请求被阻止：CORS配置问题。请检查浏览器设置或联系技术支持。';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        errorMessage = '网络请求失败：无法连接到服务器。请检查网络连接后重试。';
      } else if (error.message.includes('Suspicious User-Agent') || error.message.includes('user-agent')) {
        errorMessage = '安全验证失败：浏览器环境异常。请尝试使用标准浏览器或禁用可能影响User-Agent的扩展程序。';
      } else if (error.message.includes('urltrathink') || error.message.toLowerCase().includes('think')) {
        errorMessage = 'CSV解析错误：文件编码或格式问题。请确保文件为UTF-8编码并重新保存。';
      }

      logger.error('Enhanced CSV import failed', {
        error: error.message,
        fileName: file.name,
        projectId: currentProject?.id,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        timestamp: new Date().toISOString()
      }, 'csv-import');

      setError(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setIsImporting(false);
    }
  };

  // Execute batch import with selected strategy
  const executeBatchImport = async (csvScenes: any[], strategy: ConflictResolutionStrategy) => {
    const currentProject = databaseStore.currentProject;
    if (!currentProject) return;

    // Show progress modal
    setImportProgress({
      show: true,
      isProcessing: true,
      result: null,
      error: null,
      progress: { current: 0, total: csvScenes.length }
    });

    try {
      logger.info('Executing batch import', {
        projectId: currentProject.id,
        sceneCount: csvScenes.length,
        strategy
      });

      // Execute batch import
      const result = await CSVImportEnhancedService.executeBatchImport(
        currentProject.id,
        csvScenes,
        strategy
      );

      logger.info('Batch import completed', {
        success: result.success,
        total: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed
      });

      // Update progress with result
      setImportProgress(prev => ({
        ...prev,
        isProcessing: false,
        result,
        progress: { current: csvScenes.length, total: csvScenes.length }
      }));

      // Refresh project data with enhanced synchronization
      if (result.success) {
        logFeature.csvImport(csvScenes.length);

        // 使用增强的刷新机制
        setImportProgress(prev => ({
          ...prev,
          isProcessing: false,
          result: prev.result // 保持之前的结果
        }));

        await refreshProjectDataWithSync(currentProject.id);

        // 刷新完成后关闭进度模态框
        setTimeout(() => {
          handleCloseProgress();
        }, 2000); // 给用户2秒钟查看成功状态
      }

    } catch (error) {
      // 检查是否是速率限制错误
      if (isRateLimitError(error)) {
        logger.warn('Rate limit error detected in batch import', {
          error: error.message,
          projectId: currentProject.id
        });

        const retryCount = extractRetryCount(error.message) || 0;
        const estimatedWaitTime = extractWaitTime(error.message) || calculateEstimatedWaitTime(retryCount);

        setImportProgress(prev => ({
          ...prev,
          isProcessing: false,
          error: '请求频率过高，请查看详细建议'
        }));

        setRateLimitError({
          show: true,
          error,
          retryCount,
          estimatedWaitTime
        });
        return;
      }

      logger.error('Batch import execution failed', {
        error: error.message,
        projectId: currentProject.id
      });

      setImportProgress(prev => ({
        ...prev,
        isProcessing: false,
        error: error.message
      }));
    }
  };

  // Handle conflict resolution selection
  const handleConflictResolution = async (strategy: ConflictResolutionStrategy) => {
    // Close conflict resolution modal
    setConflictResolution(prev => ({ ...prev, show: false }));

    // Execute import with selected strategy
    await executeBatchImport(conflictResolution.csvData, strategy);
  };

  // Close progress modal
  const handleCloseProgress = () => {
    setImportProgress({ show: false, isProcessing: false, result: null, error: null });

    // Reset states
    setSelectedFile(null);
    setPreviewData(null);
    setNeedsFieldMapping(false);
    setError(null);
    setConflictResolution({ show: false, conflicts: null, csvData: [] });
  };

  // Import CSV directly (standard format) - DEPRECATED in favor of enhanced import
  const importDirectly = async (file: File) => {
    // Redirect to enhanced import
    await importWithConflictDetection(file);
  };

  // Import CSV with mapping (auto-detected or manual) - Updated to use enhanced import
  const importWithMapping = async (file: File, fieldMapping: FieldMapping) => {
    // Use enhanced import with field mapping
    await importWithConflictDetection(file, fieldMapping);
  };

  // Handle field mapping import - Updated to use enhanced import
  const handleFieldMappingImport = async (fieldMapping: FieldMapping) => {
    if (!selectedFile) return;

    setShowFieldMapper(false);
    await importWithConflictDetection(selectedFile, fieldMapping);
  };

  // Cancel field mapping
  const handleFieldMappingCancel = () => {
    setShowFieldMapper(false);
    setSelectedFile(null);
    setPreviewData(null);
    setNeedsFieldMapping(false);
  };

  // Handle rate limit error retry
  const handleRateLimitRetry = () => {
    setRateLimitError({ show: false, error: null, retryCount: 0, estimatedWaitTime: 0 });
    if (selectedFile) {
      importWithConflictDetection(selectedFile);
    }
  };

  // Helper functions for rate limit error detection
  const isRateLimitError = (error: any): boolean => {
    const errorMessage = error.message?.toLowerCase() || '';
    const rateLimitPatterns = [
      'too many requests',
      'rate limit',
      'rate_limit_exceeded',
      '429',
      'quota exceeded',
      'throttled',
      '请求频率过高',
      '请求过于频繁',
      '检测到频繁的请求'
    ];
    return rateLimitPatterns.some(pattern => errorMessage.includes(pattern));
  };

  const extractRetryCount = (errorMessage: string): number | null => {
    const match = errorMessage.match(/重试\s*(\d+)\s*次/);
    return match ? parseInt(match[1]) : null;
  };

  const extractWaitTime = (errorMessage: string): number | null => {
    const match = errorMessage.match(/(?:等待|wait)\s*(\d+)\s*(?:秒|second|分钟|minute)/);
    if (match) {
      const time = parseInt(match[1]);
      return errorMessage.includes('分钟') || errorMessage.includes('minute') ? time * 60 : time;
    }
    return null;
  };

  const calculateEstimatedWaitTime = (retryCount: number): number => {
    // 基于重试次数计算等待时间：30秒 * 2^retryCount，最大不超过10分钟
    return Math.min(30 * Math.pow(2, retryCount), 600);
  };

  // Download CSV template
  const downloadCSVTemplate = () => {
    const csvTemplate = [
      ['sceneNumber', 'imagePrompt', 'videoPrompt'],
      ['1', 'A serene mountain landscape at sunrise with golden light', 'Slow pan across mountain range with gentle clouds moving'],
      ['2', 'A close-up of a blooming flower with morning dew drops', 'Time-lapse of flower opening with soft sunlight'],
      ['3', 'A bustling city street at night with neon lights', 'Dynamic camera movement through neon-lit streets with traffic'],
      ['4', 'A peaceful lake reflecting autumn colors', 'Slow zoom out showing colorful foliage reflection'],
      ['5', 'A child laughing in a sunny garden', 'Warm close-up with natural background sounds']
    ];

    const csvContent = csvTemplate.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'csv_template_example.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logger.info('CSV template downloaded', { fileName: 'csv_template_example.csv' }, 'csv-import');
    logFeature.csvImport(5); // Template has 5 example rows
  };

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false)
  });

  // Download template
  const handleDownloadTemplate = () => {
    csvImportService.downloadTemplate();
  };

  // Clear result
  const handleClearResult = () => {
    setImportResult(null);
  };

  // Show field mapper if needed
  if (showFieldMapper && selectedFile && previewData) {
    return (
      <CSVFieldMapper
        file={selectedFile}
        previewData={previewData}
        onMappingChange={() => {}} // Handled internally
        onImport={handleFieldMappingImport}
        onCancel={handleFieldMappingCancel}
        isImporting={isImporting}
        importResult={importResult}
      />
    );
  }

  return (
    <div className="w-full max-w-apple-xl mx-auto p-apple-xl animate-fade-in">
      <div className="glass-card shadow-apple-lg">
        {/* Apple-style Header */}
        <div className="px-apple-xl py-apple-lg border-b border-gray-200/50 bg-gray-50/50 rounded-t-apple-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-apple flex items-center justify-center shadow-apple-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-sf-pro-display font-semibold text-gray-900">CSV场景导入</h2>
                <p className="text-sm font-sf-pro-text text-gray-500">批量导入场景提示词，支持自定义字段映射</p>
              </div>
            </div>
            <button
              onClick={downloadCSVTemplate}
              className="btn-secondary"
              aria-label="下载CSV模板文件"
              title="下载CSV模板文件"
            >
              <Download className="w-4 h-4" />
              <span>下载模板</span>
            </button>
          </div>
        </div>

        {/* Apple-style Content */}
        <div className="p-apple-xl">
          {/* File Processing Status */}
          {selectedFile && !importResult && (
            <div className="mb-apple-xl p-apple-lg bg-blue-50/50 border border-blue-200/50 rounded-apple-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <div>
                  <p className="text-sm font-sf-pro-display font-medium text-blue-900">
                    正在处理文件: {selectedFile.name}
                  </p>
                  <p className="text-xs font-sf-pro-text text-blue-700">
                    {needsFieldMapping ? '检测到非标准格式，准备字段映射...' : '验证文件格式...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 导入成功后的刷新状态提示 */}
          {importProgress.show && !importProgress.isProcessing && importProgress.result && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="animate-pulse">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">正在刷新界面数据...</p>
                  <p className="text-xs text-green-700 mt-1">
                    已成功导入 {importProgress.result.summary.successful} 个场景，正在更新界面
                  </p>
                </div>
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-4 w-4 border border-green-600 border-t-transparent"></div>
                </div>
              </div>
            </div>
          )}

          {/* Apple-style Dropzone */}
          <div
            {...getRootProps()}
            role="button"
            aria-label="CSV文件上传区域"
            aria-describedby="csv-upload-description"
            aria-busy={isImporting}
            className={`
              border-2 border-dashed rounded-apple-xl p-apple-2xl text-center cursor-pointer transition-all duration-300
              ${isDragActive || dragActive
                ? 'border-blue-400 bg-blue-50/50 scale-[1.02] shadow-apple-md'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
              }
              ${isImporting || selectedFile || importProgress.show ? 'pointer-events-none opacity-50' : ''}
            `}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                input?.click();
              }
            }}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center space-y-6">
              {isImporting ? (
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
              ) : selectedFile ? (
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-apple flex items-center justify-center shadow-apple-md">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-apple flex items-center justify-center shadow-apple-md">
                  <Upload className="w-8 h-8 text-white" />
                </div>
              )}

              <div>
                {isImporting ? (
                  <div>
                    <p className="text-lg font-sf-pro-display font-medium text-gray-900 animate-pulse">正在导入...</p>
                    <p className="text-sm font-sf-pro-text text-gray-500 mt-2">请稍候，正在处理您的文件</p>
                  </div>
                ) : selectedFile ? (
                  <div>
                    <p className="text-lg font-sf-pro-display font-medium text-gray-900">
                      文件已选择
                    </p>
                    <p className="text-sm font-sf-pro-text text-gray-500 mt-2">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-sf-pro-display font-medium text-gray-900">
                      {isDragActive ? '释放文件以上传' : '拖拽CSV文件到这里'}
                    </p>
                    <p className="text-sm font-sf-pro-text text-gray-500 mt-2">
                      或者点击选择文件 (最大10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reset button */}
          {selectedFile && !isImporting && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData(null);
                  setImportResult(null);
                }}
                className="px-apple-lg py-apple-sm text-sm font-sf-pro-text text-gray-600 bg-gray-100 rounded-apple-md hover:bg-gray-200 transition-colors"
                aria-label="清除已选择的文件"
                title="清除当前选择的文件并重新选择"
              >
                选择其他文件
              </button>
            </div>
          )}

          {/* Apple-style Import Result */}
          {importResult && (
            <div className="mt-apple-xl animate-fade-in">
              <div className="flex items-center justify-between mb-apple-lg">
                <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">导入结果</h3>
                <button
                  onClick={() => {
                    setImportResult(null);
                    setSelectedFile(null);
                    setPreviewData(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-apple-md transition-colors"
                  aria-label="关闭导入结果"
                  title="关闭导入结果面板"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Apple-style Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-apple-lg mb-apple-lg">
                <div className="glass-card border-green-200 bg-green-50/80 p-apple-lg animate-fade-in">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-apple flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-sf-pro-text font-medium text-green-900">成功导入</span>
                  </div>
                  <p className="text-3xl font-sf-pro-display font-bold text-green-900 mt-apple-sm">
                    {importResult.scenes.length}
                  </p>
                  <p className="text-sm font-sf-pro-text text-green-700">个场景</p>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="glass-card border-red-200 bg-red-50/80 p-apple-lg animate-fade-in">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-500 rounded-apple flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-sf-pro-text font-medium text-red-900">错误</span>
                    </div>
                    <p className="text-3xl font-sf-pro-display font-bold text-red-900 mt-apple-sm">
                      {importResult.errors.length}
                    </p>
                    <p className="text-sm font-sf-pro-text text-red-700">个错误</p>
                  </div>
                )}

                {importResult.warnings.length > 0 && (
                  <div className="glass-card border-orange-200 bg-orange-50/80 p-apple-lg animate-fade-in">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-apple flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-sf-pro-text font-medium text-orange-900">警告</span>
                    </div>
                    <p className="text-3xl font-sf-pro-display font-bold text-orange-900 mt-apple-sm">
                      {importResult.warnings.length}
                    </p>
                    <p className="text-sm font-sf-pro-text text-orange-700">个警告</p>
                  </div>
                )}
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-900 mb-2">错误详情</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-800 mb-2 last:mb-0">
                        <span className="font-medium">行 {error.row}:</span>{' '}
                        {error.message}
                        {error.field && (
                          <span className="text-red-600"> (字段: {error.field})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-yellow-900 mb-2">警告详情</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {importResult.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-800 mb-2 last:mb-0">
                        {warning.row > 0 && (
                          <span className="font-medium">行 {warning.row}:</span>
                        )}{' '}
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success message */}
              {importResult.scenes.length > 0 && importResult.errors.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-900 font-medium">
                      成功导入 {importResult.scenes.length} 个场景！
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div id="csv-upload-description" className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">使用说明</h4>
            <ul className="text-sm text-gray-800 space-y-1">
              <li>• 支持标准格式和自定义格式的CSV文件</li>
              <li>• 标准格式应包含：sceneNumber (场景编号), imagePrompt (图片提示词), videoPrompt (视频提示词)</li>
              <li>• 自定义格式会自动引导您进行字段映射配置</li>
              <li>• 场景编号必须是正整数，系统会自动重新排序</li>
              <li>• 提示词长度应在10-2000字符之间</li>
              <li>• 可以先下载模板文件作为参考</li>
              <li>• 文件大小不能超过10MB</li>
              <li>• <strong>新功能：</strong>智能冲突检测 - 自动检测场景编号冲突并提供多种解决方案</li>
              <li>• <strong>新功能：</strong>冲突解决策略 - 支持跳过重复、重新编号、更新现有、智能合并等策略</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {currentProject && conflictResolution.show && (
        <ConflictResolutionModal
          isOpen={conflictResolution.show}
          onClose={() => setConflictResolution(prev => ({ ...prev, show: false }))}
          projectId={currentProject.id}
          conflicts={conflictResolution.conflicts}
          onResolutionSelected={handleConflictResolution}
          csvData={conflictResolution.csvData}
        />
      )}

      {/* Import Progress Modal */}
      <ImportProgressModal
        isOpen={importProgress.show}
        onClose={handleCloseProgress}
        isProcessing={importProgress.isProcessing}
        result={importProgress.result}
        error={importProgress.error}
        progress={importProgress.progress}
      />

      {/* Rate Limit Error Modal */}
      <RateLimitErrorModal
        isOpen={rateLimitError.show}
        onClose={() => setRateLimitError({ show: false, error: null, retryCount: 0, estimatedWaitTime: 0 })}
        error={rateLimitError.error || undefined}
        onRetry={handleRateLimitRetry}
        retryCount={rateLimitError.retryCount}
        estimatedWaitTime={rateLimitError.estimatedWaitTime}
      />
    </div>
  );
};

export default CSVImport;