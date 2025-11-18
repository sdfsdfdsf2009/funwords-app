import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../App'
import { useProjectStore } from '../../stores/projectStore'
import { useAPIConfigStore } from '../../stores/apiConfigStore'

// Mock stores
jest.mock('../../stores/projectStore')
jest.mock('../../stores/apiConfigStore')

const mockProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>
const mockAPIConfigStore = useAPIConfigStore as jest.MockedFunction<typeof useAPIConfigStore>

// Mock router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

describe('Navigation System Tests', () => {
  const mockCurrentProject = {
    id: 'test-project-1',
    name: 'Test Project',
    createdAt: new Date(),
    updatedAt: new Date(),
    scenes: [
      {
        id: 'scene-1',
        sceneNumber: 1,
        prompt: 'Test scene prompt',
        generatedImages: [],
        generatedVideos: [],
      },
    ],
  }

  const mockCreateProject = jest.fn()
  const mockLoadConfigurations = jest.fn()
  const mockSelectConfig = jest.fn()

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup mock store implementations
    mockProjectStore.mockReturnValue({
      currentProject: mockCurrentProject,
      projects: [mockCurrentProject],
      createProject: mockCreateProject,
      addGeneratedImages: jest.fn(),
      error: null,
      clearError: jest.fn(),
      setCurrentProject: jest.fn(),
      selectedImagesPerScene: {},
      isLoading: false,
    } as any)

    mockAPIConfigStore.mockReturnValue({
      configurations: [],
      selectedConfigId: null,
      loadConfigurations: mockLoadConfigurations,
      selectConfig: mockSelectConfig,
      clearSelectedConfig: jest.fn(),
      isLoading: false,
      error: null,
    } as any)
  })

  describe('Desktop Navigation', () => {
    test('renders 3 primary navigation cards when project exists', async () => {
      render(<App />)

      // Wait for client-side hydration
      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check primary navigation cards are visible on desktop
      const contentCreationCard = screen.getByText('内容创作')
      const aiGenerationCard = screen.getByText('AI生成')
      const projectManagementCard = screen.getByText('项目管理')

      expect(contentCreationCard).toBeInTheDocument()
      expect(aiGenerationCard).toBeInTheDocument()
      expect(projectManagementCard).toBeInTheDocument()
    })

    test('navigation cards show correct sub-items', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check sub-items for each card
      expect(screen.getByText('CSV导入')).toBeInTheDocument()
      expect(screen.getByText('场景管理')).toBeInTheDocument()
      expect(screen.getByText('提示词编辑')).toBeInTheDocument()

      expect(screen.getByText('图片生成')).toBeInTheDocument()
      expect(screen.getByText('视频生成')).toBeInTheDocument()

      expect(screen.getByText('任务管理')).toBeInTheDocument()
      expect(screen.getByText('视频编辑')).toBeInTheDocument()
      expect(screen.getByText('Remotion编辑器')).toBeInTheDocument()
    })

    test('clicking primary navigation card navigates to first sub-item', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Click on content creation card
      const contentCreationCard = screen.getByText('内容创作').closest('button')
      expect(contentCreationCard).not.toBeDisabled()

      await user.click(contentCreationCard!)

      // Should navigate to import (first sub-item)
      await waitFor(() => {
        expect(screen.getByText('CSV导入')).toBeInTheDocument()
      })
    })

    test('disabled navigation cards are properly styled and non-interactive', async () => {
      // Mock no current project
      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        currentProject: null,
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Navigation should not be visible when no project
      expect(screen.queryByText('内容创作')).not.toBeInTheDocument()
    })

    test('advanced tools section can be expanded and collapsed', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('高级工具')).toBeInTheDocument()
      })

      // Initially collapsed
      expect(screen.queryByText('API配置')).not.toBeInTheDocument()
      expect(screen.queryByText('调试工具')).not.toBeInTheDocument()

      // Click to expand
      const advancedToolsButton = screen.getByText('高级工具')
      await user.click(advancedToolsButton)

      // Should show advanced tools
      await waitFor(() => {
        expect(screen.getByText('API配置')).toBeInTheDocument()
        expect(screen.getByText('调试工具')).toBeInTheDocument()
      })

      // Click to collapse
      await user.click(advancedToolsButton)

      await waitFor(() => {
        expect(screen.queryByText('API配置')).not.toBeInTheDocument()
        expect(screen.queryByText('调试工具')).not.toBeInTheDocument()
      })
    })

    test('active navigation state is visually indicated', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Click on AI generation card
      const aiGenerationCard = screen.getByText('AI生成').closest('button')
      await user.click(aiGenerationCard!)

      // Should show active state
      await waitFor(() => {
        const aiCard = screen.getByText('AI生成').closest('button')
        expect(aiCard).toHaveClass(/bg-gradient-to-br.*from-blue-500.*to-blue-700/)
      })
    })
  })

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })
    })

    test('renders bottom navigation on mobile', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check bottom navigation is visible on mobile
      const bottomNav = screen.getByText('内容创作').closest('nav')
      expect(bottomNav).toBeInTheDocument()
      expect(bottomNav).toHaveClass(/md:hidden/)
    })

    test('mobile navigation has correct touch targets', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Check that mobile navigation buttons have minimum touch targets
      const mobileButtons = screen.getAllByRole('button').filter(button =>
        button.closest('nav') && button.closest('nav')?.classList.contains('md:hidden')
      )

      mobileButtons.forEach(button => {
        expect(button).toHaveClass(/min-h-\[60px\]/)
        expect(button).toHaveClass(/min-w-\[60px\]/)
      })
    })

    test('mobile navigation includes settings button', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check settings button is present in mobile navigation
      const mobileSettingsButton = screen.getByText('设置')
      expect(mobileSettingsButton).toBeInTheDocument()
    })

    test('mobile navigation navigation works correctly', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      })

      // Click on AI generation in mobile nav
      const mobileAiButton = screen.getByText('AI生成').closest('button')
      await user.click(mobileAiButton!)

      // Should navigate to AI generation
      await waitFor(() => {
        expect(screen.getByText('图片生成')).toBeInTheDocument()
      })
    })
  })

  describe('Settings Dropdown', () => {
    test('settings dropdown opens and closes correctly', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Initially closed
      expect(screen.queryByText('全局API配置管理')).not.toBeInTheDocument()

      // Click settings button
      const settingsButton = screen.getByTitle('系统设置')
      await user.click(settingsButton)

      // Should open dropdown
      await waitFor(() => {
        expect(screen.getByText('全局API配置管理')).toBeInTheDocument()
        expect(screen.getByText('界面主题、快捷键等')).toBeInTheDocument()
        expect(screen.getByText('存储空间、备份等')).toBeInTheDocument()
        expect(screen.getByText('系统诊断和调试')).toBeInTheDocument()
      })

      // Click outside to close
      fireEvent.mouseDown(document.body)

      await waitFor(() => {
        expect(screen.queryByText('全局API配置管理')).not.toBeInTheDocument()
      })
    })

    test('settings dropdown items navigate correctly', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Open settings dropdown
      const settingsButton = screen.getByTitle('系统设置')
      await user.click(settingsButton)

      // Click API configuration
      const apiConfigButton = screen.getByText('全局API配置管理')
      await user.click(apiConfigButton)

      // Should navigate to API config
      await waitFor(() => {
        expect(screen.queryByText('全局API配置管理')).not.toBeInTheDocument()
      })
    })

    test('settings dropdown groups items correctly', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Open settings dropdown
      const settingsButton = screen.getByTitle('系统设置')
      await user.click(settingsButton)

      // Check system settings group
      expect(screen.getByText('系统设置')).toBeInTheDocument()
      expect(screen.getByText('API配置')).toBeInTheDocument()
      expect(screen.getByText('偏好设置')).toBeInTheDocument()
      expect(screen.getByText('数据管理')).toBeInTheDocument()

      // Check development tools group
      expect(screen.getByText('开发工具')).toBeInTheDocument()
      expect(screen.getByText('调试工具')).toBeInTheDocument()
      expect(screen.getByText('配置检查')).toBeInTheDocument()
      expect(screen.getByText('快速修复')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    test('desktop navigation hides on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767, // Just below md breakpoint
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Desktop navigation should be hidden
      const desktopNav = screen.getByText('内容创作').closest('nav')
      expect(desktopNav).toHaveClass(/hidden.*md:block/)
    })

    test('mobile navigation hides on desktop viewport', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024, // Above md breakpoint
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Mobile navigation should be hidden
      const mobileNavs = screen.getAllByRole('navigation').filter(nav =>
        nav.classList.contains('md:hidden')
      )
      expect(mobileNavs.length).toBe(0)
    })
  })

  describe('Accessibility', () => {
    test('navigation elements have proper ARIA labels', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Check settings button has proper title
      const settingsButton = screen.getByTitle('系统设置')
      expect(settingsButton).toBeInTheDocument()

      // Check navigation cards are buttons
      const navCards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )
      expect(navCards.length).toBe(3)
    })

    test('keyboard navigation works correctly', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Test Tab navigation
      const settingsButton = screen.getByTitle('系统设置')
      settingsButton.focus()
      expect(settingsButton).toHaveFocus()

      // Test Enter key
      fireEvent.keyPress(settingsButton, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('全局API配置管理')).toBeInTheDocument()
      })

      // Test Escape key to close dropdown
      fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByText('全局API配置管理')).not.toBeInTheDocument()
      })
    })
  })
})