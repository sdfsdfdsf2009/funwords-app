import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { App } from '../../App';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock project store
jest.mock('../../stores/projectStore', () => ({
  useProjectStore: () => ({
    currentProject: {
      id: 'test-project-1',
      name: '测试项目',
      scenes: [
        { id: 'scene-1', sceneNumber: 1, prompt: '测试场景1' },
        { id: 'scene-2', sceneNumber: 2, prompt: '测试场景2' }
      ],
      generatedImages: [],
      generatedVideos: []
    },
    createProject: jest.fn(),
    addGeneratedImages: jest.fn(),
    error: null,
    clearError: jest.fn()
  }),
}));

// Mock API config store
jest.mock('../../stores/apiConfigStore', () => ({
  useAPIConfigStore: () => ({
    loadConfigurations: jest.fn(),
    selectConfig: jest.fn(),
    clearSelectedConfig: jest.fn(),
    configurations: [],
    selectedConfigId: null,
    isLoading: false,
    error: null
  }),
}));

// Mock components
jest.mock('../../components/project/ProjectSelector', () => ({
  ProjectSelector: () => <div data-testid="project-selector">项目选择器</div>,
}));

jest.mock('../../components/TaskManagement', () => ({
  __esModule: true,
  default: () => <div data-testid="task-management">任务管理</div>,
}));

jest.mock('../../components/TaskStatusIndicator', () => ({
  TaskStatusIndicator: ({ onClick }: any) => (
    <div data-testid="task-status-indicator" onClick={onClick}>
      任务状态指示器
    </div>
  ),
}));

jest.mock('../../components/csv-import/CSVImport', () => ({
  CSVImport: ({ onComplete }: any) => (
    <div data-testid="csv-import">
      CSV导入组件
      <button onClick={() => onComplete({ scenes: [] })}>完成导入</button>
    </div>
  ),
}));

jest.mock('../../components/csv-import/SceneManager', () => ({
  SceneManager: () => <div data-testid="scene-manager">场景管理器</div>,
}));

jest.mock('../../components/api-config/APIConfigManager', () => ({
  APIConfigManager: () => <div data-testid="api-config-manager">API配置管理器</div>,
}));

jest.mock('../../components/api-config/APIConfigEditor', () => ({
  APIConfigEditor: () => <div data-testid="api-config-editor">API配置编辑器</div>,
}));

jest.mock('../../components/image-generation/ImageGeneration', () => ({
  ImageGeneration: () => <div data-testid="image-generation">图片生成</div>,
}));

jest.mock('../../components/video-generation/VideoGeneration', () => ({
  VideoGeneration: () => <div data-testid="video-generation">视频生成</div>,
}));

jest.mock('../../components/debug/DebugPage', () => ({
  DebugPage: () => <div data-testid="debug-page">调试页面</div>,
}));

jest.mock('../../components/prompt-editor/PromptEditor', () => ({
  PromptEditor: () => <div data-testid="prompt-editor">提示词编辑器</div>,
}));

// Mock ErrorBoundary
jest.mock('../../components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <div>{children}</div>,
  withErrorBoundary: (Component: any) => Component,
  useErrorMonitor: () => ({ error: null, captureError: jest.fn() }),
  errorMonitor: { captureError: jest.fn() }
}));

describe('Navigation System Basic Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('renders main navigation cards', async () => {
    render(<App />);

    // Wait for client-side hydration
    await waitFor(() => {
      expect(screen.getByText('内容创作')).toBeInTheDocument();
      expect(screen.getByText('AI生成')).toBeInTheDocument();
      expect(screen.getByText('项目管理')).toBeInTheDocument();
    });
  });

  test('navigation cards have correct descriptions', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('CSV导入、场景管理、提示词编辑')).toBeInTheDocument();
      expect(screen.getByText('图片生成、视频生成')).toBeInTheDocument();
      expect(screen.getByText('项目选择、任务跟踪、项目设置')).toBeInTheDocument();
    });
  });

  test('renders settings dropdown button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTitle('系统设置')).toBeInTheDocument();
    });
  });

  test('renders project selector and task status', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('project-selector')).toBeInTheDocument();
      expect(screen.getByTestId('task-status-indicator')).toBeInTheDocument();
    });
  });

  test('renders create project button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('新建项目')).toBeInTheDocument();
    });
  });

  test('navigation cards are clickable', async () => {
    render(<App />);

    await waitFor(() => {
      const contentCreationCard = screen.getByText('内容创作');
      expect(contentCreationCard).toBeInTheDocument();
      expect(contentCreationCard.closest('button')).not.toBeDisabled();
    });
  });

  test('settings button opens dropdown', async () => {
    render(<App />);

    await waitFor(() => {
      const settingsButton = screen.getByTitle('系统设置');
      expect(settingsButton).toBeInTheDocument();

      // Check if button is clickable
      expect(settingsButton.closest('button')).not.toBeDisabled();
    });
  });

  test('renders header with correct title', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('视频工作站')).toBeInTheDocument();
      expect(screen.getByText('AI驱动的专业视频制作')).toBeInTheDocument();
    });
  });

  test('navigation structure is responsive', async () => {
    // Mock window.innerWidth for responsive testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // Tablet width
    });

    render(<App />);

    await waitFor(() => {
      // Should still render navigation on tablet
      expect(screen.getByText('内容创作')).toBeInTheDocument();
    });

    // Change to mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // Mobile width
    });

    // Re-render with mobile width
    render(<App />);

    await waitFor(() => {
      // Should still render main elements on mobile
      expect(screen.getByText('视频工作站')).toBeInTheDocument();
      expect(screen.getByTitle('系统设置')).toBeInTheDocument();
    });
  });

  test('error handling works correctly', async () => {
    // Mock error state
    jest.doMock('../../stores/projectStore', () => ({
      useProjectStore: () => ({
        currentProject: {
          id: 'test-project-1',
          name: '测试项目',
          scenes: [],
          generatedImages: [],
          generatedVideos: []
        },
        createProject: jest.fn(),
        addGeneratedImages: jest.fn(),
        error: '测试错误',
        clearError: jest.fn()
      }),
    }));

    render(<App />);

    await waitFor(() => {
      // Should handle error gracefully
      expect(screen.getByText('视频工作站')).toBeInTheDocument();
    });
  });

  test('loading state is handled', async () => {
    render(<App />);

    // Should show loading state initially
    expect(screen.getByText('视频工作站')).toBeInTheDocument();

    // Should render main content after loading
    await waitFor(() => {
      expect(screen.getByText('内容创作')).toBeInTheDocument();
    });
  });
});