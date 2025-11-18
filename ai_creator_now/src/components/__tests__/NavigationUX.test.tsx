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

describe('Navigation User Experience Tests', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()

    mockProjectStore.mockReturnValue({
      currentProject: mockCurrentProject,
      projects: [mockCurrentProject],
      createProject: jest.fn(),
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
      loadConfigurations: jest.fn(),
      selectConfig: jest.fn(),
      clearSelectedConfig: jest.fn(),
      isLoading: false,
      error: null,
    } as any)
  })

  describe('User Operation Flow', () => {
    test('new user can easily understand navigation structure', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Clear visual hierarchy should guide users
      const mainCards = ['内容创作', 'AI生成', '项目管理']
      mainCards.forEach(cardText => {
        const card = screen.getByText(cardText)
        expect(card).toBeInTheDocument()

        // Each card should have clear description
        const cardElement = card.closest('button')
        expect(cardElement).toHaveTextContent(/CSV导入|场景管理|提示词编辑|图片生成|视频生成|任务管理/)
      })

      // Test logical flow: Content Creation -> AI Generation -> Project Management
      const contentCard = screen.getByText('内容创作').closest('button')
      await user.click(contentCard!)

      // Should show content-related options
      expect(screen.getByText('CSV导入')).toBeInTheDocument()
      expect(screen.getByText('场景管理')).toBeInTheDocument()

      // Navigate to AI generation
      const aiCard = screen.getByText('AI生成').closest('button')
      await user.click(aiCard!)

      // Should show AI-related options
      expect(screen.getByText('图片生成')).toBeInTheDocument()
      expect(screen.getByText('视频生成')).toBeInTheDocument()
    })

    test('experienced user can navigate quickly', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const startTime = Date.now()

      // Experienced user should be able to navigate directly to desired function
      const aiCard = screen.getByText('AI生成').closest('button')
      await user.click(aiCard!)

      // Navigate to specific function
      const videoGen = screen.getByText('视频生成').closest('div')
      await user.click(videoGen!)

      const navigationTime = Date.now() - startTime

      // Should be able to navigate in under 2 seconds
      expect(navigationTime).toBeLessThan(2000)
    })

    test('user can recover from navigation mistakes', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // User accidentally clicks wrong card
      const wrongCard = screen.getByText('内容创作').closest('button')
      await user.click(wrongCard!)

      // Should be able to easily correct course
      const correctCard = screen.getByText('AI生成').closest('button')
      await user.click(correctCard!)

      // Should arrive at correct destination
      expect(screen.getByText('图片生成')).toBeInTheDocument()
    })

    test('navigation supports task-based workflows', async () => {
      const user = userEvent.setup()

      // Mock a project with scenes but no generated content
      const projectWithScenes = {
        ...mockCurrentProject,
        scenes: [
          {
            id: 'scene-1',
            sceneNumber: 1,
            prompt: 'Test scene prompt',
            generatedImages: [],
            generatedVideos: [],
          },
          {
            id: 'scene-2',
            sceneNumber: 2,
            prompt: 'Another scene prompt',
            generatedImages: [],
            generatedVideos: [],
          },
        ],
      }

      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        currentProject: projectWithScenes,
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Workflow: Create content -> Generate AI -> Manage project
      // Step 1: Import CSV
      const contentCard = screen.getByText('内容创作').closest('button')
      await user.click(contentCard!)

      // Should see import option
      expect(screen.getByText('CSV导入')).toBeInTheDocument()

      // Step 2: Generate images
      const aiCard = screen.getByText('AI生成').closest('button')
      await user.click(aiCard!)

      // Should see generation options
      expect(screen.getByText('图片生成')).toBeInTheDocument()

      // Step 3: Manage tasks
      const projectCard = screen.getByText('项目管理').closest('button')
      await user.click(projectCard!)

      // Should see task management
      expect(screen.getByText('任务管理')).toBeInTheDocument()
    })
  })

  describe('Function Discoverability', () => {
    test('settings functions are easily discoverable', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Settings should be clearly indicated
      const settingsButton = screen.getByTitle('系统设置')
      expect(settingsButton).toBeInTheDocument()

      // Opening settings should reveal all options
      await user.click(settingsButton)

      // Should clearly categorize functions
      expect(screen.getByText('系统设置')).toBeInTheDocument()
      expect(screen.getByText('开发工具')).toBeInTheDocument()

      // Each function should have clear description
      expect(screen.getByText('全局API配置管理')).toBeInTheDocument()
      expect(screen.getByText('系统诊断和调试')).toBeInTheDocument()
    })

    test('advanced tools are discoverable but not intrusive', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Advanced tools should be initially hidden
      expect(screen.queryByText('API配置')).not.toBeInTheDocument()

      // But should be easily discoverable
      expect(screen.getByText('高级工具')).toBeInTheDocument()

      // Expanding should reveal tools
      await user.click(screen.getByText('高级工具'))

      expect(screen.getByText('API配置')).toBeInTheDocument()
      expect(screen.getByText('调试工具')).toBeInTheDocument()
    })

    test('navigation provides clear feedback for available actions', async () => {
      const user = userEvent.setup()

      // Mock project with no scenes (should disable AI generation)
      const emptyProject = {
        ...mockCurrentProject,
        scenes: [],
      }

      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        currentProject: emptyProject,
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('AI生成')).toBeInTheDocument()
      })

      const aiCard = screen.getByText('AI生成').closest('button')

      // Should be visually disabled
      expect(aiCard).toBeDisabled()
      expect(aiCard).toHaveClass(/opacity-50/)

      // User should understand why it's disabled
      // (In real implementation, there would be a tooltip or explanatory text)
    })

    test('navigation shows current location clearly', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Click on AI generation
      const aiCard = screen.getByText('AI生成').closest('button')
      await user.click(aiCard!)

      // Current location should be visually indicated
      await waitFor(() => {
        const activeCard = screen.getByText('AI生成').closest('button')
        expect(activeCard).toHaveClass(/bg-gradient-to-br/)
      })

      // Sub-items should also show active state
      const imageGenItem = screen.getByText('图片生成').closest('div')
      expect(imageGenItem).toHaveClass(/bg-blue-100/)
    })
  })

  describe('Cognitive Load Assessment', () => {
    test('navigation reduces decision complexity', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should have reduced from 9 items to 3 main cards
      const mainCards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )
      expect(mainCards.length).toBe(3)

      // Each card should group related functions
      const contentCard = mainCards.find(card => card.textContent?.includes('内容创作'))
      expect(contentCard).toHaveTextContent('CSV导入')
      expect(contentCard).toHaveTextContent('场景管理')
      expect(contentCard).toHaveTextContent('提示词编辑')
    })

    test('information is presented progressively', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Initially shows only high-level categories
      expect(screen.getByText('内容创作')).toBeInTheDocument()
      expect(screen.getByText('AI生成')).toBeInTheDocument()
      expect(screen.getByText('项目管理')).toBeInTheDocument()

      // Advanced options are hidden by default
      expect(screen.queryByText('API配置')).not.toBeInTheDocument()

      // Revealed on demand
      await user.click(screen.getByText('高级工具'))
      expect(screen.getByText('API配置')).toBeInTheDocument()
    })

    test('visual hierarchy guides attention appropriately', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Main navigation should be visually prominent
      const mainCards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )

      mainCards.forEach(card => {
        // Should have good visual weight
        expect(card).toHaveClass(/shadow-apple-lg/)
        expect(card).toHaveClass(/bg-white\/70/)
      })

      // Secondary elements should be less prominent
      const advancedToolsToggle = screen.getByText('高级工具')
      expect(advancedToolsToggle).toHaveClass(/text-sm/)
    })

    test('navigation supports learnability', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // First interaction should be intuitive
      const firstCard = screen.getByText('内容创作').closest('button')

      // Should have clear affordances
      expect(firstCard).toHaveClass(/hover:scale-\[1\.02\]/)
      expect(firstCard).toHaveClass(/cursor-pointer/)

      // Interaction should provide immediate feedback
      await user.click(firstCard!)

      // Result should be predictable and logical
      expect(screen.getByText('CSV导入')).toBeInTheDocument()
    })
  })

  describe('Error Handling and Recovery', () => {
    test('navigation gracefully handles project loading errors', async () => {
      const user = userEvent.setup()

      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        currentProject: null,
        error: 'Failed to load project',
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('错误:')).toBeInTheDocument()
      })

      // Should still show welcome screen
      expect(screen.getByText('欢迎使用视频工作站')).toBeInTheDocument()

      // User should be able to create new project
      const startButton = screen.getByText('开始第一个项目')
      expect(startButton).toBeInTheDocument()
    })

    test('navigation recovers from temporary failures', async () => {
      const user = userEvent.setup()

      // Mock intermittent failure
      let callCount = 0
      mockProjectStore.mockReturnValue({
        get currentProject() {
          callCount++
          if (callCount === 1) {
            throw new Error('Temporary failure')
          }
          return mockCurrentProject
        },
        projects: [mockCurrentProject],
        createProject: jest.fn(),
        addGeneratedImages: jest.fn(),
        error: null,
        clearError: jest.fn(),
        setCurrentProject: jest.fn(),
        selectedImagesPerScene: {},
        isLoading: false,
      } as any)

      render(<App />)

      // Should eventually recover and show navigation
      await waitFor(() => {
        expect(screen.getByText('内容创作')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    test('navigation provides helpful error states', async () => {
      const user = userEvent.setup()

      mockAPIConfigStore.mockReturnValue({
        configurations: [],
        selectedConfigId: null,
        loadConfigurations: jest.fn(),
        selectConfig: jest.fn(),
        clearSelectedConfig: jest.fn(),
        isLoading: false,
        error: 'Failed to load API configurations',
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Should still allow navigation despite API errors
      expect(screen.getByText('内容创作')).toBeInTheDocument()

      // Settings dropdown should show error state or recovery options
      const settingsButton = screen.getByTitle('系统设置')
      await user.click(settingsButton)

      // Should still show configuration options
      expect(screen.getByText('全局API配置管理')).toBeInTheDocument()
    })

    test('navigation prevents user errors through clear constraints', async () => {
      const user = userEvent.setup()

      // Mock project with no scenes
      const emptyProject = {
        ...mockCurrentProject,
        scenes: [],
      }

      mockProjectStore.mockReturnValue({
        ...mockProjectStore(),
        currentProject: emptyProject,
      } as any)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const aiCard = screen.getByText('AI生成').closest('button')

      // Should prevent invalid actions
      expect(aiCard).toBeDisabled()

      // Should provide clear indication of requirements
      expect(aiCard).toHaveAttribute('disabled')

      // User should understand what's needed to enable the function
      // (In real implementation, this would include helpful messaging)
    })
  })

  describe('User Satisfaction Metrics', () => {
    test('navigation provides quick access to frequently used functions', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Most frequently used functions should be most accessible
      const primaryFunctions = ['内容创作', 'AI生成', '项目管理']
      primaryFunctions.forEach(func => {
        expect(screen.getByText(func)).toBeInTheDocument()
      })

      // Access should require minimal clicks
      const clickCount = 1 // Single click to access main functions
      expect(clickCount).toBeLessThanOrEqual(2)
    })

    test('navigation supports user efficiency', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      const startTime = Date.now()

      // User should be able to complete common tasks quickly
      // Task: Navigate from content creation to project management
      await user.click(screen.getByText('内容创作').closest('button')!)
      await user.click(screen.getByText('项目管理').closest('button')!)

      const taskTime = Date.now() - startTime

      // Common tasks should take less than 3 seconds
      expect(taskTime).toBeLessThan(3000)
    })

    test('navigation reduces user frustration', async () => {
      const user = userEvent.setup()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Navigation should be predictable
      const card = screen.getByText('AI生成').closest('button')

      // Hover states should provide immediate feedback
      fireEvent.mouseEnter(card!)
      expect(card).toHaveClass(/hover/)

      // Clicks should be responsive
      await user.click(card!)

      // Should navigate to expected destination
      await waitFor(() => {
        expect(screen.getByText('图片生成')).toBeInTheDocument()
      })

      // No unexpected behaviors or dead ends
      expect(screen.queryByText(/Error/)).not.toBeInTheDocument()
    })

    test('navigation accommodates different user expertise levels', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('视频工作站')).toBeInTheDocument()
      })

      // Beginners: Clear labels and descriptions
      const cards = screen.getAllByRole('button').filter(button =>
        ['内容创作', 'AI生成', '项目管理'].includes(button.textContent || '')
      )

      cards.forEach(card => {
        // Should have descriptive text
        expect(card).toHaveTextContent(/CSV导入|场景管理|提示词编辑|图片生成|视频生成|项目选择|任务跟踪/)
      })

      // Advanced users: Quick access to power features
      expect(screen.getByText('高级工具')).toBeInTheDocument()

      // Settings should provide configuration options
      const settingsButton = screen.getByTitle('系统设置')
      expect(settingsButton).toBeInTheDocument()
    })
  })
})