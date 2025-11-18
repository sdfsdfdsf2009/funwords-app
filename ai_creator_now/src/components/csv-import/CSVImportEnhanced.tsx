import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, AlertCircle, CheckCircle, FileText, X, Info } from 'lucide-react';
import { csvImportService, CSVImportResult } from '../../services/csvImport';
import { enhancedCSVImportService, ConflictStrategy, ConflictOptions } from '../../services/csvImportEnhanced';
import { CSVPreviewData, FieldMapping, Scene } from '../../types';
import { useProjectStore } from '../../stores/projectStore';
import { logger, logFeature } from '../../utils/logger';
import CSVFieldMapper from './CSVFieldMapper';
import CSVConflictResolver from './CSVConflictResolver';

interface CSVImportProps {
  onComplete?: (result: CSVImportResult) => void;
  onError?: (error: Error) => void;
}

export const CSVImportEnhanced: React.FC<CSVImportProps> = ({ onComplete, onError }) => {
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVPreviewData | null>(null);
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [needsFieldMapping, setNeedsFieldMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New states for conflict resolution
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [detectedFieldMapping, setDetectedFieldMapping] = useState<FieldMapping | null>(null);

  const { currentProject, importScenesFromCSV } = useProjectStore();

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);
    setError(null);

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

      if (detectedAll && preview.suggestedMapping) {
        // All fields detected, store mapping and proceed to conflict detection
        setDetectedFieldMapping(detectedMapping);
        await checkForConflicts(file, detectedMapping);
      } else if (preview.suggestedMapping &&
                 Object.values(preview.suggestedMapping).every(val => val)) {
        // Use suggested mapping from CSV service
        setDetectedFieldMapping(preview.suggestedMapping);
        await checkForConflicts(file, preview.suggestedMapping);
      } else {
        // Cannot auto-detect, show field mapper
        setNeedsFieldMapping(true);
        setShowFieldMapper(true);
      }

    } catch (error) {
      logger.error('CSV processing failed', { error: error.message, fileName: file.name }, 'csv-import');
      setError(error.message);
      onError?.(error);
      setSelectedFile(null);
      setPreviewData(null);
    }
  }, [setError, onError, currentProject]);

  // Check for conflicts before importing
  const checkForConflicts = async (file: File, fieldMapping: FieldMapping) => {
    if (!currentProject) {
      throw new Error('No current project selected');
    }

    try {
      // Parse CSV with field mapping
      const result = await csvImportService.parseCSVFile(file, fieldMapping);

      // Detect conflicts
      const conflictResult = await enhancedCSVImportService.detectConflicts(
        result.scenes,
        currentProject.scenes
      );

      if (conflictResult.hasConflicts) {
        logger.info('Conflicts detected', {
          conflictCount: conflictResult.conflicts.length,
          safeSceneCount: conflictResult.safeScenes.length
        }, 'csv-import');

        setConflicts(conflictResult.conflicts);
        setShowConflictResolver(true);
      } else {
        // No conflicts, proceed with import
        await importWithStrategy(file, fieldMapping, 'skip_duplicates', {});
      }

    } catch (error) {
      logger.error('Conflict detection failed', { error: error.message }, 'csv-import');
      throw error;
    }
  };

  // Import with a specific strategy
  const importWithStrategy = async (
    file: File,
    fieldMapping: FieldMapping,
    strategy: ConflictStrategy,
    options: ConflictOptions
  ) => {
    if (!currentProject) {
      throw new Error('No current project selected');
    }

    setIsImporting(true);
    setShowConflictResolver(false);

    try {
      logger.info('Starting CSV import with conflict resolution', {
        fileName: file.name,
        strategy,
        options,
        fieldMapping
      });

      // Use enhanced import service
      const result = await enhancedCSVImportService.importWithConflictResolution(file, {
        projectId: currentProject.id,
        existingScenes: currentProject.scenes,
        conflictStrategy: strategy,
        conflictOptions: options
      });

      setImportResult(result);

      // Import scenes if there are any
      if (result.scenes.length > 0) {
        await importScenesFromCSV(result.scenes);
        logger.info('Successfully imported scenes', {
          count: result.scenes.length,
          fileName: file.name,
          strategy
        }, 'csv-import');
      }

      // Show enhanced result with resolution summary
      onComplete?.(result);

    } catch (error) {
      logger.error('Enhanced CSV import failed', {
        error: error.message,
        fileName: file.name,
        strategy
      }, 'csv-import');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsImporting(false);
      // Clear all related states after a short delay
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewData(null);
        setNeedsFieldMapping(false);
        setError(null);
        setDetectedFieldMapping(null);
      }, 1000);
    }
  };

  // Handle conflict resolution
  const handleConflictResolution = async (strategy: ConflictStrategy, options: ConflictOptions) => {
    if (!selectedFile || !detectedFieldMapping) return;

    await importWithStrategy(selectedFile, detectedFieldMapping, strategy, options);
  };

  // Handle field mapping import
  const handleFieldMappingImport = async (fieldMapping: FieldMapping) => {
    if (!selectedFile) return;

    try {
      setDetectedFieldMapping(fieldMapping);
      await checkForConflicts(selectedFile, fieldMapping);
      setShowFieldMapper(false);
    } catch (error) {
      logger.error('Field mapping import failed', {
        error: error.message,
        fileName: selectedFile.name
      }, 'csv-import');
      setError(error.message);
      onError?.(error);
    }
  };

  // Cancel field mapping
  const handleFieldMappingCancel = () => {
    setShowFieldMapper(false);
    setSelectedFile(null);
    setPreviewData(null);
    setNeedsFieldMapping(false);
  };

  // Cancel conflict resolution
  const handleConflictCancel = () => {
    setShowConflictResolver(false);
    setSelectedFile(null);
    setPreviewData(null);
    setConflicts([]);
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

  // Show conflict resolver if needed
  if (showConflictResolver && conflicts.length > 0) {
    return (
      <CSVConflictResolver
        conflicts={conflicts}
        onResolve={handleConflictResolution}
        onCancel={handleConflictCancel}
      />
    );
  }

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
                <p className="text-sm font-sf-pro-text text-gray-500">智能冲突检测与解决方案</p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="btn-secondary"
            >
              <Download className="w-4 h-4" />
              <span>下载模板</span>
            </button>
          </div>
        </div>

        {/* Apple-style Content */}
        <div className="p-apple-xl">
          {/* File Processing Status */}
          {selectedFile && !importResult && !showConflictResolver && (
            <div className="mb-apple-xl p-apple-lg bg-blue-50/50 border border-blue-200/50 rounded-apple-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <div>
                  <p className="text-sm font-sf-pro-display font-medium text-blue-900">
                    正在处理文件: {selectedFile.name}
                  </p>
                  <p className="text-xs font-sf-pro-text text-blue-700">
                    {needsFieldMapping ? '检测到非标准格式，准备字段映射...' :
                     showConflictResolver ? '检测到冲突，准备解决...' :
                     '验证文件格式并检测冲突...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conflict Detection Info */}
          {conflicts.length > 0 && !showConflictResolver && (
            <div className="mb-apple-xl p-apple-lg bg-amber-50/50 border border-amber-200/50 rounded-apple-lg">
              <div className="flex items-center space-x-3">
                <Info className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-sf-pro-display font-medium text-amber-900">
                    检测到 {conflicts.length} 个场景编号冲突
                  </p>
                  <p className="text-xs font-sf-pro-text text-amber-700">
                    系统将引导您选择处理方案
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Apple-style Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-apple-xl p-apple-2xl text-center cursor-pointer transition-all duration-300
              ${isDragActive || dragActive
                ? 'border-blue-400 bg-blue-50/50 scale-[1.02] shadow-apple-md'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
              }
              ${isImporting || selectedFile ? 'pointer-events-none opacity-50' : ''}
            `}
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
          {selectedFile && !isImporting && !showConflictResolver && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData(null);
                  setImportResult(null);
                  setConflicts([]);
                  setDetectedFieldMapping(null);
                }}
                className="px-apple-lg py-apple-sm text-sm font-sf-pro-text text-gray-600 bg-gray-100 rounded-apple-md hover:bg-gray-200 transition-colors"
              >
                选择其他文件
              </button>
            </div>
          )}

          {/* Enhanced Import Result */}
          {importResult && (
            <div className="mt-apple-xl animate-fade-in">
              <div className="flex items-center justify-between mb-apple-lg">
                <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">导入结果</h3>
                <button
                  onClick={() => {
                    setImportResult(null);
                    setSelectedFile(null);
                    setPreviewData(null);
                    setConflicts([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-apple-md transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Enhanced Summary with Resolution Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-apple-lg mb-apple-lg">
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

                {/* Resolution Summary */}
                {'resolutionSummary' in importResult && (
                  <>
                    <div className="glass-card border-blue-200 bg-blue-50/80 p-apple-lg animate-fade-in">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-apple flex items-center justify-center">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-sf-pro-text font-medium text-blue-900">已创建</span>
                      </div>
                      <p className="text-3xl font-sf-pro-display font-bold text-blue-900 mt-apple-sm">
                        {(importResult as any).resolutionSummary.created}
                      </p>
                      <p className="text-sm font-sf-pro-text text-blue-700">个新场景</p>
                    </div>

                    {(importResult as any).resolutionSummary.updated > 0 && (
                      <div className="glass-card border-orange-200 bg-orange-50/80 p-apple-lg animate-fade-in">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-500 rounded-apple flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-sf-pro-text font-medium text-orange-900">已更新</span>
                        </div>
                        <p className="text-3xl font-sf-pro-display font-bold text-orange-900 mt-apple-sm">
                          {(importResult as any).resolutionSummary.updated}
                        </p>
                        <p className="text-sm font-sf-pro-text text-orange-700">个场景</p>
                      </div>
                    )}

                    {(importResult as any).resolutionSummary.skipped > 0 && (
                      <div className="glass-card border-gray-200 bg-gray-50/80 p-apple-lg animate-fade-in">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-500 rounded-apple flex items-center justify-center">
                            <X className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-sf-pro-text font-medium text-gray-900">已跳过</span>
                        </div>
                        <p className="text-3xl font-sf-pro-display font-bold text-gray-900 mt-apple-sm">
                          {(importResult as any).resolutionSummary.skipped}
                        </p>
                        <p className="text-sm font-sf-pro-text text-gray-700">个重复</p>
                      </div>
                    )}
                  </>
                )}

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
                  <div className="glass-card border-yellow-200 bg-yellow-50/80 p-apple-lg animate-fade-in">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-apple flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-sf-pro-text font-medium text-yellow-900">警告</span>
                    </div>
                    <p className="text-3xl font-sf-pro-display font-bold text-yellow-900 mt-apple-sm">
                      {importResult.warnings.length}
                    </p>
                    <p className="text-sm font-sf-pro-text text-yellow-700">个警告</p>
                  </div>
                )}
              </div>

              {/* Strategy Applied */}
              {'resolutionSummary' in importResult && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">应用的解决策略</h4>
                  <p className="text-sm text-blue-800">
                    策略: {(importResult as any).resolutionSummary.strategy} |
                    创建: {(importResult as any).resolutionSummary.created} |
                    更新: {(importResult as any).resolutionSummary.updated} |
                    跳过: {(importResult as any).resolutionSummary.skipped}
                  </p>
                </div>
              )}

              {/* Errors and Warnings (existing code) */}
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

          {/* Enhanced Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">使用说明</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 支持标准格式和自定义格式的CSV文件</li>
              <li>• 标准格式应包含：sceneNumber (场景编号), imagePrompt (图片提示词), videoPrompt (视频提示词)</li>
              <li>• 自定义格式会自动引导您进行字段映射配置</li>
              <li>• <strong>智能冲突检测：</strong>系统会自动检测场景编号冲突并提供解决方案</li>
              <li>• <strong>多种处理策略：</strong>跳过重复、自动重编号、更新现有场景等</li>
              <li>• 场景编号必须是正整数</li>
              <li>• 提示词长度应在10-2000字符之间</li>
              <li>• 可以先下载模板文件作为参考</li>
              <li>• 文件大小不能超过10MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVImportEnhanced;