import Papa from 'papaparse';
import {
  CSVSceneData,
  CSVImportResult,
  CSVImportError,
  CSVImportWarning,
  FieldMapping,
  CSVFieldOption,
  CSVPreviewData,
  CSVMappingConfig
} from '../types';
import { CSVImportError as ImportError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface CSVImportOptions {
  requiredColumns?: string[];
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;
  maxRows?: number;
  encoding?: string;
}

export interface CSVTemplate {
  headers: string[];
  exampleRows: string[][];
  description: string;
}

export class CSVImportService {
  private static instance: CSVImportService;

  static getInstance(): CSVImportService {
    if (!CSVImportService.instance) {
      CSVImportService.instance = new CSVImportService();
    }
    return CSVImportService.instance;
  }

  // Default CSV format for video generation workstation
  private readonly DEFAULT_HEADERS = ['sceneNumber', 'imagePrompt', 'videoPrompt'];
  private readonly REQUIRED_COLUMNS = ['sceneNumber', 'imagePrompt', 'videoPrompt'];

  // Get CSV template for users
  getCSVTemplate(): CSVTemplate {
    return {
      headers: [...this.DEFAULT_HEADERS],
      exampleRows: [
        ['1', 'A serene mountain landscape at sunrise', 'Slow pan across mountain range with gentle clouds moving'],
        ['2', 'A close-up of a blooming flower', 'Time-lapse of flower opening with morning dew drops'],
        ['3', 'A bustling city street at night', 'Dynamic camera movement through neon-lit streets with traffic']
      ],
      description: 'CSV file should contain scene number, image prompt, and video prompt for each scene'
    };
  }

  // Generate CSV template as string
  generateTemplateCSV(): string {
    const template = this.getCSVTemplate();
    const csvContent = [
      template.headers.join(','),
      ...template.exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // Download CSV template
  downloadTemplate(): void {
    const csvContent = this.generateTemplateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'video-workstation-template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logger.logFeature.used('csv-template-download', { size: csvContent.length });
    }
  }

  // Preview CSV file before import (for field mapping)
  async previewCSVFile(file: File): Promise<CSVPreviewData> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        trimHeaders: true,
        preview: 5, // Only read first 5 rows for preview
        encoding: 'UTF-8', // 明确指定UTF-8编码
        complete: (results) => {
          try {
            // 数据验证：检查解析结果
            if (!results.data || !Array.isArray(results.data) || results.data.length === 0) {
              throw new ImportError('CSV文件为空或格式无效');
            }

            // 验证表头和数据结构
            if (!results.meta.fields || results.meta.fields.length === 0) {
              throw new ImportError('CSV文件缺少表头');
            }

            // 检查数据行的一致性
            const maxCols = Math.max(...results.data.map((row: any) => Array.isArray(row) ? row.length : 0));
            const headerCount = results.meta.fields.length;

            if (maxCols !== headerCount) {
              logger.warn('CSV数据列数不一致', {
                headerCount,
                maxDataCols: maxCols,
                fileName: file.name
              }, 'csv-import');
            }

            const previewData: CSVPreviewData = {
              headers: results.meta.fields || [],
              rows: results.data.slice(0, 5).map(row =>
                Array.isArray(row) ? row : [row]
              ) as string[][],
              totalRows: results.data.length,
              suggestedMapping: this.suggestFieldMapping(results.meta.fields || [])
            };

            // 记录原始数据用于调试
            logger.info('CSV preview completed', {
              fileName: file.name,
              headers: previewData.headers,
              rowCount: previewData.totalRows,
              suggestedMapping: previewData.suggestedMapping
            }, 'csv-import');

            resolve(previewData);
          } catch (error) {
            reject(new ImportError(`Failed to preview CSV: ${error.message}`));
          }
        },
        error: (error) => {
          logger.error('CSV preview failed', { error, fileName: file.name }, 'csv-import');
          reject(new ImportError(`Failed to preview CSV: ${error.message}`));
        }
      });
    });
  }

  // Suggest field mapping based on available columns
  suggestFieldMapping(headers: string[]): FieldMapping {
    const mapping: FieldMapping = {
      sceneNumber: '',
      imagePrompt: '',
      videoPrompt: ''
    };

    // Try to detect scene number column
    const sceneNumberPatterns = [
      'sceneNumber', 'scene', 'Scene', 'SCENE', '序号', '场景序号', '场景编号', '编号', 'No.', 'number', 'Number', 'seq', 'Seq'
    ];
    mapping.sceneNumber = this.findBestMatch(headers, sceneNumberPatterns) || '';

    // Try to detect image prompt column
    const imagePromptPatterns = [
      'imagePrompt', 'image', 'Image', 'IMAGE', '图片描述', '图片提示词', '图片', '图像描述', 'prompt', 'Prompt', 'description', 'Description', 'desc', 'Desc'
    ];
    mapping.imagePrompt = this.findBestMatch(headers, imagePromptPatterns) || '';

    // Try to detect video prompt column
    const videoPromptPatterns = [
      'videoPrompt', 'video', 'Video', 'VIDEO', '视频描述', '视频提示词', '视频', '动态描述', '动态说明', 'animation', 'Animation', 'motion', 'Motion', 'move', 'Move'
    ];
    mapping.videoPrompt = this.findBestMatch(headers, videoPromptPatterns) || '';

    return mapping;
  }

  // Find best matching column header
  private findBestMatch(headers: string[], patterns: string[]): string {
    let bestMatch = '';
    let bestScore = 0;

    for (const header of headers) {
      for (const pattern of patterns) {
        const score = this.calculateMatchScore(header, pattern);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = header;
        }
      }
    }

    return bestMatch;
  }

  // Calculate match score between header and pattern
  private calculateMatchScore(header: string, pattern: string): number {
    const headerLower = header.toLowerCase().trim();
    const patternLower = pattern.toLowerCase().trim();

    // Exact match
    if (headerLower === patternLower) return 100;

    // Contains match
    if (headerLower.includes(patternLower) || patternLower.includes(headerLower)) return 80;

    // Partial match (character overlap)
    let overlap = 0;
    const headerChars = headerLower.split('');
    const patternChars = patternLower.split('');

    for (const hChar of headerChars) {
      if (patternChars.includes(hChar)) {
        overlap++;
      }
    }

    const headerRatio = overlap / headerChars.length;
    const patternRatio = overlap / patternChars.length;

    return Math.round((headerRatio + patternRatio) * 50);
  }

  // Get field options for mapping dropdowns
  getFieldOptions(headers: string[]): Record<keyof FieldMapping, CSVFieldOption[]> {
    const allOptions: Record<keyof FieldMapping, CSVFieldOption[]> = {
      sceneNumber: [],
      imagePrompt: [],
      videoPrompt: []
    };

    // Generate options for each field
    const requiredFields: Array<keyof FieldMapping> = ['sceneNumber', 'imagePrompt', 'videoPrompt'];

    requiredFields.forEach(field => {
      const options: CSVFieldOption[] = headers.map(header => ({
        value: header,
        label: header,
        sample: this.getSampleValue(header, headers),
        detected: this.isFieldDetected(header, field)
      }));

      // Sort by detection priority, then by alphabetical
      options.sort((a, b) => {
        if (a.detected && !b.detected) return -1;
        if (!a.detected && b.detected) return 1;
        return a.label.localeCompare(b.label);
      });

      allOptions[field] = options;
    });

    return allOptions;
  }

  // Get sample value for a field (from preview data)
  private getSampleValue(header: string, headers: string[]): string {
    // This would typically use preview data, but for now we'll return a generic sample
    const sampleValues: Record<string, string> = {
      'scene': '1',
      'Scene': '1',
      'number': '1',
      '序号': '1',
      '场景': '1',
      'prompt': '示例提示词',
      'Prompt': '示例提示词',
      'description': '示例描述'
    };

    const headerLower = header.toLowerCase();
    for (const [key, value] of Object.entries(sampleValues)) {
      if (headerLower.includes(key.toLowerCase())) {
        return value;
      }
    }

    return '';
  }

  // Check if a field is detected for a specific target field
  private isFieldDetected(header: string, targetField: keyof FieldMapping): boolean {
    const patterns = {
      sceneNumber: ['scene', 'Scene', 'SCENE', '序号', '场景', 'No.', 'number', 'Number', 'seq', 'Seq'],
      imagePrompt: ['image', 'Image', 'IMAGE', '图片', '图像', 'prompt', 'Prompt', 'description', 'Description', 'desc', 'Desc'],
      videoPrompt: ['video', 'Video', 'VIDEO', '视频', '动态', 'animation', 'Animation', 'motion', 'Motion', 'move', 'Move']
    };

    const fieldPatterns = patterns[targetField] || [];
    return this.findBestMatch([header], fieldPatterns) === header;
  }

  // Parse CSV file with field mapping
  async parseCSVFile(file: File, fieldMapping?: FieldMapping, options: CSVImportOptions = {}): Promise<CSVImportResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting CSV file parsing', {
        fileName: file.name,
        fileSize: file.size,
        fieldMapping,
        options
      }, 'csv-import');

      const defaultOptions: CSVImportOptions = {
        requiredColumns: this.REQUIRED_COLUMNS,
        skipEmptyRows: true,
        trimWhitespace: true,
        maxRows: 1000,
        encoding: 'UTF-8'
      };

      const parseOptions = { ...defaultOptions, ...options };

      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: parseOptions.skipEmptyRows,
          trimHeaders: parseOptions.trimWhitespace,
          complete: (results) => {
            try {
              const importResult = this.processCSVData(results.data, parseOptions, fieldMapping);

              logger.info('CSV parsing completed', {
                duration: Date.now() - startTime,
                totalRows: results.data.length,
                validScenes: importResult.scenes.length,
                errors: importResult.errors.length,
                warnings: importResult.warnings.length,
                fieldMapping: fieldMapping ? 'custom' : 'default'
              }, 'csv-import');

              resolve(importResult);
            } catch (error) {
              logger.error('CSV processing failed', { error, fileName: file.name }, 'csv-import');
              reject(new ImportError(`Failed to process CSV: ${error.message}`));
            }
          },
          error: (error) => {
            logger.error('CSV parsing failed', { error, fileName: file.name }, 'csv-import');
            reject(new ImportError(`Failed to parse CSV file: ${error.message}`));
          }
        });
      });
    } catch (error) {
      logger.error('CSV import failed', { error, fileName: file.name }, 'csv-import');
      throw new ImportError(`CSV import failed: ${error.message}`);
    }
  }

  // Process parsed CSV data
  private processCSVData(data: any[], options: CSVImportOptions, fieldMapping?: FieldMapping): CSVImportResult {
    const scenes: CSVSceneData[] = [];
    const errors: CSVImportError[] = [];
    const warnings: CSVImportWarning[] = [];

    if (data.length === 0) {
      errors.push({
        row: 0,
        field: 'general',
        message: 'CSV文件为空或格式无效',
        value: data
      });
      return { scenes, errors, warnings, fieldMapping };
    }

    // Validate headers and field mapping
    const headers = Object.keys(data[0] || {});

    if (fieldMapping) {
      // Validate field mapping
      this.validateFieldMapping(fieldMapping, headers, errors);
    } else {
      // Use default header validation
      this.validateHeaders(headers, options.requiredColumns || this.REQUIRED_COLUMNS, errors);
    }

    // Process each row
    data.forEach((row, index) => {
      try {
        const sceneData = this.processRow(row, index + 1, options, fieldMapping);
        if (sceneData) {
          scenes.push(sceneData);
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push({
            row: index + 1,
            field: error.field || 'unknown',
            message: error.message,
            value: error.value
          });
        } else {
          errors.push({
            row: index + 1,
            field: 'general',
            message: error.message,
            value: row
          });
        }
      }
    });

    // Check for duplicate scene numbers
    this.checkDuplicateSceneNumbers(scenes, warnings);

    // Validate max rows
    if (options.maxRows && scenes.length > options.maxRows) {
      warnings.push({
        row: 0,
        field: 'general',
        message: `Too many scenes (${scenes.length}). Only first ${options.maxRows} will be imported.`,
        value: scenes.length
      });
      scenes.splice(options.maxRows);
    }

    // Validate scene sequence
    this.validateSceneSequence(scenes, warnings);

    logger.info('CSV data processing completed', {
      totalRows: data.length,
      validScenes: scenes.length,
      errors: errors.length,
      warnings: warnings.length
    }, 'csv-import');

    return { scenes, errors, warnings };
  }

  // Validate CSV headers
  private validateHeaders(headers: string[], requiredColumns: string[], errors: CSVImportError[]): void {
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      errors.push({
        row: 0,
        field: 'headers',
        message: `Missing required columns: ${missingColumns.join(', ')}`,
        value: headers
      });
    }

    const extraColumns = headers.filter(col => !requiredColumns.includes(col));
    if (extraColumns.length > 0) {
      // This is just a warning, not an error
      logger.warn(`Extra columns found and will be ignored: ${extraColumns.join(', ')}`, { extraColumns }, 'csv-import');
    }
  }

  // Validate field mapping configuration
  private validateFieldMapping(fieldMapping: FieldMapping, headers: string[], errors: CSVImportError[]): void {
    const requiredFields: Array<keyof FieldMapping> = ['sceneNumber', 'imagePrompt', 'videoPrompt'];

    for (const field of requiredFields) {
      const mappedColumn = fieldMapping[field];

      if (!mappedColumn) {
        errors.push({
          row: 0,
          field: 'fieldMapping',
          message: `Field mapping is missing for required field: ${field}`,
          value: fieldMapping
        });
        continue;
      }

      if (!headers.includes(mappedColumn)) {
        errors.push({
          row: 0,
          field: 'fieldMapping',
          message: `Mapped column "${mappedColumn}" for field "${field}" does not exist in CSV`,
          value: { field, mappedColumn, availableHeaders: headers }
        });
      }
    }

    // Check for duplicate mapping
    const mappedColumns = Object.values(fieldMapping).filter(col => col);
    const duplicates = mappedColumns.filter((col, index) => mappedColumns.indexOf(col) !== index);

    if (duplicates.length > 0) {
      errors.push({
        row: 0,
        field: 'fieldMapping',
        message: `Duplicate column mapping detected: ${duplicates.join(', ')}`,
        value: { duplicates, mapping: fieldMapping }
      });
    }
  }

  // Process individual CSV row
  private processRow(row: any, rowNumber: number, options: CSVImportOptions, fieldMapping?: FieldMapping): CSVSceneData | null {
    const trimmedRow = options.trimWhitespace ? this.trimRowValues(row) : row;

    // Skip completely empty rows
    if (this.isEmptyRow(trimmedRow)) {
      return null;
    }

    let sceneNumberValue: string, imagePromptValue: string, videoPromptValue: string;

    if (fieldMapping) {
      // Use field mapping to extract values
      sceneNumberValue = trimmedRow[fieldMapping.sceneNumber] || '';
      imagePromptValue = trimmedRow[fieldMapping.imagePrompt] || '';
      videoPromptValue = trimmedRow[fieldMapping.videoPrompt] || '';
    } else {
      // Use default field names
      sceneNumberValue = trimmedRow.sceneNumber || '';
      imagePromptValue = trimmedRow.imagePrompt || '';
      videoPromptValue = trimmedRow.videoPrompt || '';
    }

    // Parse scene number
    const sceneNumber = this.parseSceneNumber(sceneNumberValue, rowNumber);

    // Parse prompts
    const imagePrompt = this.parsePrompt(imagePromptValue, 'imagePrompt', rowNumber);
    const videoPrompt = this.parsePrompt(videoPromptValue, 'videoPrompt', rowNumber);

    // Validate prompts
    this.validatePrompt(imagePrompt, 'imagePrompt', rowNumber);
    this.validatePrompt(videoPrompt, 'videoPrompt', rowNumber);

    return {
      sceneNumber,
      imagePrompt: imagePrompt.trim(),
      videoPrompt: videoPrompt.trim()
    };
  }

  // Trim whitespace from row values
  private trimRowValues(row: any): any {
    const trimmed: any = {};
    for (const [key, value] of Object.entries(row)) {
      trimmed[key] = typeof value === 'string' ? value.trim() : value;
    }
    return trimmed;
  }

  // Check if row is empty
  private isEmptyRow(row: any): boolean {
    return Object.values(row).every(value =>
      value === null || value === undefined || value === ''
    );
  }

  // Parse scene number
  private parseSceneNumber(value: any, rowNumber: number): number {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError('Scene number is required', 'sceneNumber', value);
    }

    const sceneNumber = parseInt(value.toString(), 10);
    if (isNaN(sceneNumber) || sceneNumber < 1) {
      throw new ValidationError('Scene number must be a positive integer', 'sceneNumber', value);
    }

    return sceneNumber;
  }

  // Parse prompt
  private parsePrompt(value: any, fieldName: string, rowNumber: number): string {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }

    return value.toString();
  }

  // Validate prompt content
  private validatePrompt(prompt: string, fieldName: string, rowNumber: number): void {
    if (prompt.length < 10) {
      throw new ValidationError(`${fieldName} must be at least 10 characters long`, fieldName, prompt);
    }

    if (prompt.length > 2000) {
      throw new ValidationError(`${fieldName} must be less than 2000 characters long`, fieldName, prompt);
    }
  }

  // Check for duplicate scene numbers
  private checkDuplicateSceneNumbers(scenes: CSVSceneData[], warnings: CSVImportWarning[]): void {
    const sceneNumbers = scenes.map(s => s.sceneNumber);
    const duplicates = sceneNumbers.filter((num, index) => sceneNumbers.indexOf(num) !== index);

    [...new Set(duplicates)].forEach(sceneNumber => {
      const count = scenes.filter(s => s.sceneNumber === sceneNumber).length;
      warnings.push({
        row: 0,
        field: 'sceneNumber',
        message: `Scene number ${sceneNumber} appears ${count} times. Scenes will be renumbered automatically.`,
        value: sceneNumber
      });
    });
  }

  // Validate scene sequence
  private validateSceneSequence(scenes: CSVSceneData[], warnings: CSVImportWarning[]): void {
    if (scenes.length === 0) return;

    scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);

    // Check if scenes start from a reasonable number (1-10)
    if (scenes[0].sceneNumber > 10) {
      warnings.push({
        row: 0,
        field: 'sceneNumber',
        message: `Scene numbers start from ${scenes[0].sceneNumber}. For new projects, consider starting from 1.`,
        value: scenes[0].sceneNumber
      });
    }

    // Check for gaps in sequence
    for (let i = 1; i < scenes.length; i++) {
      const currentScene = scenes[i];
      const previousScene = scenes[i - 1];

      if (currentScene.sceneNumber - previousScene.sceneNumber > 1) {
        warnings.push({
          row: 0,
          field: 'sceneNumber',
          message: `Gap in scene sequence between ${previousScene.sceneNumber} and ${currentScene.sceneNumber}`,
          value: { previous: previousScene.sceneNumber, current: currentScene.sceneNumber }
        });
      }
    }
  }

  // Validate CSV format before parsing
  validateCSVFile(file: File): Promise<{ valid: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.csv')) {
        resolve({
          valid: false,
          error: 'File must have .csv extension'
        });
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        resolve({
          valid: false,
          error: 'File size must be less than 10MB'
        });
        return;
      }

      // Quick parse to validate basic format
      Papa.parse(file, {
        header: true,
        preview: 5, // Only read first 5 rows for validation
        complete: (results) => {
          if (results.errors.length > 0) {
            resolve({
              valid: false,
              error: `CSV format error: ${results.errors[0].message}`
            });
            return;
          }

          // Check if file has headers and data
          const headers = Object.keys(results.data[0] || {});
          if (headers.length === 0) {
            resolve({
              valid: false,
              error: 'CSV file must have headers'
            });
            return;
          }

          // Check if file has at least one row of data
          if (results.data.length === 0) {
            resolve({
              valid: false,
              error: 'CSV file must contain at least one row of data'
            });
            return;
          }

          // Remove strict column validation - allow any CSV format
          // Field mapping will handle column mapping later
          resolve({ valid: true });
        },
        error: (error) => {
          resolve({
            valid: false,
            error: `Failed to read CSV file: ${error.message}`
          });
        }
      });
    });
  }
}

// Export singleton instance
export const csvImportService = CSVImportService.getInstance();

// Export convenience functions
export const importCSV = (file: File, options?: CSVImportOptions) =>
  csvImportService.parseCSVFile(file, options);

export const validateCSV = (file: File) =>
  csvImportService.validateCSVFile(file);

export const downloadCSVTemplate = () =>
  csvImportService.downloadTemplate();