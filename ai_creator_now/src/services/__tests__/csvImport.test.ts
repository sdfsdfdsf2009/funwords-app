import { CSVImportService } from '../csvImport';
import { CSVImportError, ValidationError } from '../../utils/errors';

// Mock Papa Parse
jest.mock('papaparse', () => ({
  parse: jest.fn()
}));

import Papa from 'papaparse';

describe('CSVImportService', () => {
  let csvService: CSVImportService;

  beforeEach(() => {
    csvService = CSVImportService.getInstance();
    jest.clearAllMocks();
  });

  describe('getCSVTemplate', () => {
    it('should return correct template structure', () => {
      const template = csvService.getCSVTemplate();

      expect(template.headers).toEqual(['sceneNumber', 'imagePrompt', 'videoPrompt']);
      expect(template.exampleRows).toHaveLength(3);
      expect(template.exampleRows[0]).toEqual([
        '1',
        'A serene mountain landscape at sunrise',
        'Slow pan across mountain range with gentle clouds moving'
      ]);
      expect(template.description).toContain('scene number, image prompt, and video prompt');
    });
  });

  describe('generateTemplateCSV', () => {
    it('should generate valid CSV content', () => {
      const csvContent = csvService.generateTemplateCSV();

      expect(csvContent).toContain('sceneNumber,imagePrompt,videoPrompt');
      expect(csvContent).toContain('"1","A serene mountain landscape at sunrise"');
      expect(csvContent).toContain('"2","A close-up of a blooming flower"');
      expect(csvContent).toContain('"3","A bustling city street at night"');
    });
  });

  describe('validateCSVFile', () => {
    it('should accept valid CSV files', async () => {
      const mockFile = new File(['test,content'], 'test.csv', { type: 'text/csv' });

      // Mock successful Papa parse
      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        if (options.preview) {
          options.complete({
            data: [{ sceneNumber: '1', imagePrompt: 'test', videoPrompt: 'test' }],
            errors: []
          });
        }
      });

      const result = await csvService.validateCSVFile(mockFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-CSV files', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      const result = await csvService.validateCSVFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must have .csv extension');
    });

    it('should reject oversized files', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const mockFile = new File([largeContent], 'large.csv', { type: 'text/csv' });

      const result = await csvService.validateCSVFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('less than 10MB');
    });

    it('should reject CSV files with missing columns', async () => {
      const mockFile = new File(['test,content'], 'test.csv', { type: 'text/csv' });

      // Mock Papa parse with missing columns
      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        if (options.preview) {
          options.complete({
            data: [{ sceneNumber: '1', imagePrompt: 'test' }], // Missing videoPrompt
            errors: []
          });
        }
      });

      const result = await csvService.validateCSVFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required columns: videoPrompt');
    });

    it('should reject CSV files with parsing errors', async () => {
      const mockFile = new File(['invalid,csv'], 'test.csv', { type: 'text/csv' });

      // Mock Papa parse with errors
      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        if (options.preview) {
          options.error(new Error('Invalid CSV format'));
        }
      });

      const result = await csvService.validateCSVFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid CSV format');
    });
  });

  describe('parseCSVFile', () => {
    it('should parse valid CSV data correctly', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      // Mock successful Papa parse
      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: '1', imagePrompt: 'Mountain landscape', videoPrompt: 'Pan across mountains' },
            { sceneNumber: '2', imagePrompt: 'Ocean waves', videoPrompt: 'Wave crashing' }
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.scenes).toHaveLength(2);
      expect(result.scenes[0]).toEqual({
        sceneNumber: 1,
        imagePrompt: 'Mountain landscape',
        videoPrompt: 'Pan across mountains'
      });
      expect(result.scenes[1]).toEqual({
        sceneNumber: 2,
        imagePrompt: 'Ocean waves',
        videoPrompt: 'Wave crashing'
      });
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle empty rows', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: '1', imagePrompt: 'Test', videoPrompt: 'Test' },
            { sceneNumber: '', imagePrompt: '', videoPrompt: '' }, // Empty row
            { sceneNumber: '2', imagePrompt: 'Test2', videoPrompt: 'Test2' }
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.scenes).toHaveLength(2);
      expect(result.scenes[0].sceneNumber).toBe(1);
      expect(result.scenes[1].sceneNumber).toBe(2);
    });

    it('should validate required fields', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: '', imagePrompt: 'Test', videoPrompt: 'Test' }, // Missing sceneNumber
            { sceneNumber: '2', imagePrompt: '', videoPrompt: 'Test' }, // Missing imagePrompt
            { sceneNumber: '3', imagePrompt: 'Test', videoPrompt: '' } // Missing videoPrompt
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.scenes).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].field).toBe('sceneNumber');
      expect(result.errors[1].field).toBe('imagePrompt');
      expect(result.errors[2].field).toBe('videoPrompt');
    });

    it('should validate scene number format', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: 'invalid', imagePrompt: 'Test', videoPrompt: 'Test' },
            { sceneNumber: '-1', imagePrompt: 'Test', videoPrompt: 'Test' },
            { sceneNumber: '0', imagePrompt: 'Test', videoPrompt: 'Test' }
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.scenes).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.every(e => e.field === 'sceneNumber')).toBe(true);
    });

    it('should validate prompt length', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: '1', imagePrompt: 'short', videoPrompt: 'Test' }, // Too short
            { sceneNumber: '2', imagePrompt: 'x'.repeat(2001), videoPrompt: 'Test' }, // Too long
            { sceneNumber: '3', imagePrompt: 'Test', videoPrompt: 'x'.repeat(2001) } // Too long
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.scenes).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
    });

    it('should warn about duplicate scene numbers', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: '1', imagePrompt: 'Test', videoPrompt: 'Test' },
            { sceneNumber: '1', imagePrompt: 'Test2', videoPrompt: 'Test2' },
            { sceneNumber: '1', imagePrompt: 'Test3', videoPrompt: 'Test3' }
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.scenes).toHaveLength(3);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('sceneNumber');
      expect(result.warnings[0].message).toContain('appears 3 times');
    });

    it('should warn about gaps in scene sequence', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: '1', imagePrompt: 'Test', videoPrompt: 'Test' },
            { sceneNumber: '5', imagePrompt: 'Test2', videoPrompt: 'Test2' },
            { sceneNumber: '10', imagePrompt: 'Test3', videoPrompt: 'Test3' }
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.scenes).toHaveLength(3);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings.some(w => w.message.includes('Gap between 1 and 5'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Gap between 5 and 10'))).toBe(true);
    });

    it('should respect max rows limit', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      // Generate 100 test rows
      const testData = Array.from({ length: 100 }, (_, i) => ({
        sceneNumber: (i + 1).toString(),
        imagePrompt: `Test ${i + 1}`,
        videoPrompt: `Test ${i + 1}`
      }));

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: testData,
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile, { maxRows: 50 });

      expect(result.scenes).toHaveLength(50);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Only first 50 will be imported');
    });

    it('should handle whitespace trimming', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [
            { sceneNumber: ' 1 ', imagePrompt: ' Test prompt ', videoPrompt: ' Test video ' }
          ],
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile, { trimWhitespace: true });

      expect(result.scenes[0]).toEqual({
        sceneNumber: 1,
        imagePrompt: 'Test prompt',
        videoPrompt: 'Test video'
      });
    });
  });

  describe('error handling', () => {
    it('should handle parsing errors gracefully', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.error(new Error('Parse error'));
      });

      await expect(csvService.parseCSVFile(mockFile)).rejects.toThrow(CSVImportError);
    });

    it('should handle processing errors gracefully', async () => {
      const mockFile = new File(['test,csv'], 'test.csv', { type: 'text/csv' });

      (Papa.parse as jest.Mock).mockImplementation((file, options) => {
        options.complete({
          data: [{ invalid: 'data' }], // Missing required columns
          errors: []
        });
      });

      const result = await csvService.parseCSVFile(mockFile);

      expect(result.errors).toBeGreaterThan(0);
      expect(result.scenes).toHaveLength(0);
    });
  });
});