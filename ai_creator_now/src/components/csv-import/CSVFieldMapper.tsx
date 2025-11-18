import React, { useState, useEffect } from 'react';
import { ChevronRight, AlertCircle, CheckCircle, Eye, EyeOff, Settings, ArrowLeft } from 'lucide-react';
import { CSVPreviewData, FieldMapping, CSVFieldOption, CSVImportResult } from '../../types';
import { logger } from '../../utils/logger';

interface CSVFieldMapperProps {
  file: File;
  previewData: CSVPreviewData;
  onMappingChange: (mapping: FieldMapping) => void;
  onImport: (mapping: FieldMapping) => void;
  onCancel: () => void;
  isImporting?: boolean;
  importResult?: CSVImportResult;
}

export const CSVFieldMapper: React.FC<CSVFieldMapperProps> = ({
  file,
  previewData,
  onMappingChange,
  onImport,
  onCancel,
  isImporting = false,
  importResult
}) => {
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>(previewData.suggestedMapping);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setFieldMapping(previewData.suggestedMapping);
  }, [previewData.suggestedMapping]);

  useEffect(() => {
    // Validate mapping whenever it changes
    const isValidMapping = validateMapping(fieldMapping);
    setIsValid(isValidMapping);
    onMappingChange(fieldMapping);
  }, [fieldMapping, onMappingChange]);

  const validateMapping = (mapping: FieldMapping): boolean => {
    const requiredFields: Array<keyof FieldMapping> = ['sceneNumber', 'imagePrompt', 'videoPrompt'];

    return requiredFields.every(field => {
      const mappedColumn = mapping[field];
      return mappedColumn && previewData.headers.includes(mappedColumn);
    });
  };

  const handleFieldChange = (field: keyof FieldMapping, value: string) => {
    const newMapping = { ...fieldMapping, [field]: value };
    setFieldMapping(newMapping);
  };

  const handleAutoDetect = () => {
    setFieldMapping(previewData.suggestedMapping);
    logger.logUser.action('csv-field-auto-detect', {
      fileName: file.name,
      mapping: previewData.suggestedMapping
    });
  };

  const getFieldOptions = (field: keyof FieldMapping): CSVFieldOption[] => {
    return previewData.headers.map(header => ({
      value: header,
      label: header,
      sample: getSampleValue(header),
      detected: previewData.suggestedMapping[field] === header
    }));
  };

  const getSampleValue = (header: string): string => {
    if (previewData.rows.length === 0) return '';

    const firstRow = previewData.rows[0];
    const headerIndex = previewData.headers.indexOf(header);

    return headerIndex >= 0 ? (firstRow[headerIndex] || '') : '';
  };

  const getFieldName = (field: keyof FieldMapping): string => {
    const fieldNames = {
      sceneNumber: '场景序号 (必需)',
      imagePrompt: '图片提示词 (必需)',
      videoPrompt: '视频提示词 (必需)'
    };
    return fieldNames[field];
  };

  const getFieldDescription = (field: keyof FieldMapping): string => {
    const descriptions = {
      sceneNumber: '用于标识场景的唯一序号（如：1, 2, 3）',
      imagePrompt: '用于生成图片的详细描述文字',
      videoPrompt: '用于生成视频的动态描述文字'
    };
    return descriptions[field];
  };

  const getRequiredFields = (): Array<keyof FieldMapping> => ['sceneNumber', 'imagePrompt', 'videoPrompt'];

  return (
    <div className="glass-card shadow-apple-lg animate-fade-in">
      {/* Header */}
      <div className="px-apple-xl py-apple-lg border-b border-gray-200/50 bg-gray-50/50 rounded-t-apple-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onCancel}
              className="p-apple-sm hover:bg-gray-200 rounded-apple-md text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-apple flex items-center justify-center shadow-apple-md">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-sf-pro-display font-semibold text-gray-900">CSV字段映射</h2>
              <p className="text-sm font-sf-pro-text text-gray-500">配置CSV列与系统字段的对应关系</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="glass-card px-apple-lg py-apple-sm">
              <span className="text-sm font-sf-pro-text font-medium text-gray-700">
                {file.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-apple-xl">
        {/* File Info */}
        <div className="mb-apple-xl p-apple-lg bg-blue-50/50 border border-blue-200/50 rounded-apple-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-sf-pro-display font-semibold text-blue-900 mb-1">检测到非标准CSV格式</h4>
              <p className="text-sm font-sf-pro-text text-blue-800 leading-relaxed">
                系统检测到您的CSV文件格式与标准格式不完全匹配。请手动配置每个CSV列对应的系统字段，以确保数据正确导入。
              </p>
            </div>
          </div>
        </div>

        {/* CSV Preview */}
        <div className="mb-apple-xl">
          <div className="flex items-center justify-between mb-apple-lg">
            <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">CSV文件预览</h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm font-sf-pro-text text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showAdvanced ? '隐藏预览' : '显示预览'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="overflow-x-auto border border-gray-200 rounded-apple-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-apple-lg py-apple-md text-left text-xs font-sf-pro-display font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-apple-lg py-apple-md text-sm font-sf-pro-text text-gray-900 whitespace-nowrap"
                        >
                          {cell || <span className="text-gray-400">空</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Field Mapping Configuration */}
        <div className="space-y-apple-xl mb-apple-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-sf-pro-display font-semibold text-gray-900">字段映射配置</h3>
            <button
              onClick={handleAutoDetect}
              className="flex items-center space-x-2 px-apple-lg py-apple-sm bg-blue-100 text-blue-800 rounded-apple-md hover:bg-blue-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-sf-pro-text font-medium">自动检测</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-apple-xl">
            {getRequiredFields().map((field) => (
              <div key={field} className="space-y-apple-md">
                <div>
                  <label className="block text-sm font-sf-pro-display font-medium text-gray-900 mb-apple-sm">
                    {getFieldName(field)}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <p className="text-xs font-sf-pro-text text-gray-500">
                    {getFieldDescription(field)}
                  </p>
                </div>

                <select
                  value={fieldMapping[field] || ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className={`w-full px-apple-lg py-apple-md border rounded-apple-md text-sm font-sf-pro-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    fieldMapping[field] && previewData.headers.includes(fieldMapping[field])
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">请选择对应列...</option>
                  {getFieldOptions(field).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.detected ? '🎯 ' : ''}{option.label}
                      {option.sample && ` (示例: ${option.sample})`}
                    </option>
                  ))}
                </select>

                {fieldMapping[field] && previewData.headers.includes(fieldMapping[field]) && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-sf-pro-text font-medium">
                      已映射到: {fieldMapping[field]}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className={`p-apple-lg rounded-apple-lg mb-apple-xl ${
            importResult.errors.length > 0
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-start space-x-3">
              {importResult.errors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className={`text-sm font-sf-pro-display font-semibold mb-2 ${
                  importResult.errors.length > 0 ? 'text-red-900' : 'text-green-900'
                }`}>
                  导入{importResult.errors.length > 0 ? '失败' : '成功'}
                </h4>

                <div className="space-y-1">
                  <div className="text-sm font-sf-pro-text text-gray-700">
                    成功导入场景: {importResult.scenes.length} 个
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="text-sm font-sf-pro-text text-red-700">
                      错误: {importResult.errors.length} 个
                    </div>
                  )}
                  {importResult.warnings.length > 0 && (
                    <div className="text-sm font-sf-pro-text text-yellow-700">
                      警告: {importResult.warnings.length} 个
                    </div>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {importResult.errors.slice(0, 3).map((error, index) => (
                      <div key={index} className="text-xs font-sf-pro-text text-red-600">
                        第{error.row}行 {error.field}: {error.message}
                      </div>
                    ))}
                    {importResult.errors.length > 3 && (
                      <div className="text-xs font-sf-pro-text text-red-500">
                        还有 {importResult.errors.length - 3} 个错误...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            disabled={isImporting}
            className="px-apple-xl py-apple-lg text-sm font-sf-pro-text font-medium text-gray-700 bg-gray-100 rounded-apple-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消导入
          </button>

          <button
            onClick={() => onImport(fieldMapping)}
            disabled={!isValid || isImporting}
            className={`btn-primary ${
              !isValid || isImporting
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>导入中...</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4" />
                <span>确认导入 ({previewData.totalRows} 场景)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSVFieldMapper;