import { create } from 'zustand';
import { VideoTask, VideoTaskStatus } from '@/components/video-generation/ProgressContainer';

// 数据库API客户端
class VideoTaskAPI {
  private baseUrl = '/api/video-tasks';

  async getTasks(): Promise<VideoTask[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) throw new Error('Failed to fetch video tasks');
      const data = await response.json();
      return data.data?.tasks || data.tasks || [];
    } catch (error) {
      console.warn('Database fetch failed, returning empty array:', error);
      return [];
    }
  }

  async createTask(task: Omit<VideoTask, 'id' | 'createdAt'>): Promise<VideoTask> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!response.ok) throw new Error('Failed to create video task');
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.warn('Database create failed:', error);
      // 返回临时任务用于localStorage回退
      return {
        ...task,
        id: `temp_${Date.now()}`,
        createdAt: new Date()
      };
    }
  }

  async updateTask(id: string, updates: Partial<VideoTask>): Promise<VideoTask | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update video task');
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.warn('Database update failed:', error);
      return null;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.warn('Database delete failed:', error);
      return false;
    }
  }
}

const videoTaskAPI = new VideoTaskAPI();

interface VideoTaskStore {
  // 状态
  tasks: VideoTask[];
  isLoading: boolean;
  error: string | null;

  // 操作
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<VideoTask, 'id' | 'createdAt'>) => Promise<VideoTask>;
  updateTask: (id: string, updates: Partial<VideoTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearAllTasks: () => Promise<void>;
  getTaskById: (id: string) => VideoTask | undefined;
  getTasksByStatus: (status: VideoTaskStatus) => VideoTask[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // localStorage回退
  saveTasksToStorage: (tasks: VideoTask[]) => void;
  loadTasksFromStorage: () => VideoTask[];
}

export const useVideoTaskStore = create<VideoTaskStore>((set, get) => ({
  // 初始状态
  tasks: [],
  isLoading: false,
  error: null,

  // 加载任务 - 优先使用数据库，回退到localStorage
  loadTasks: async () => {
    try {
      set({ isLoading: true, error: null });

      // 首先尝试从数据库加载
      const dbTasks = await videoTaskAPI.getTasks();

      if (dbTasks.length > 0) {
        set({ tasks: dbTasks, isLoading: false });
        return;
      }

      // 数据库为空，尝试从localStorage加载
      console.log('Database empty, falling back to localStorage');
      const localTasks = get().loadTasksFromStorage();
      set({ tasks: localTasks, isLoading: false });

    } catch (error) {
      console.error('Failed to load tasks:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load tasks',
        isLoading: false
      });
    }
  },

  // 添加任务 - 优先保存到数据库，同时保存到localStorage作为备份
  addTask: async (taskData) => {
    try {
      // 创建新任务
      const newTask = await videoTaskAPI.createTask(taskData);

      set(state => ({
        tasks: [newTask, ...state.tasks]
      }));

      // 保存到localStorage作为备份
      const currentTasks = get().tasks;
      get().saveTasksToStorage(currentTasks);

      return newTask;
    } catch (error) {
      console.error('Failed to add task:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add task'
      });
      throw error;
    }
  },

  // 更新任务 - 同步到数据库和localStorage
  updateTask: async (id, updates) => {
    try {
      // 更新数据库
      const updatedTask = await videoTaskAPI.updateTask(id, updates);

      if (updatedTask) {
        set(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? updatedTask : task
          )
        }));
      } else {
        // 数据库更新失败，只更新本地状态
        set(state => ({
          tasks: state.tasks.map(task =>
            task.id === id ? { ...task, ...updates } : task
          )
        }));
      }

      // 保存到localStorage作为备份
      const currentTasks = get().tasks;
      get().saveTasksToStorage(currentTasks);

    } catch (error) {
      console.error('Failed to update task:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update task'
      });
    }
  },

  // 删除任务 - 从数据库和localStorage删除
  deleteTask: async (id) => {
    try {
      // 从数据库删除
      await videoTaskAPI.deleteTask(id);

      set(state => ({
        tasks: state.tasks.filter(task => task.id !== id)
      }));

      // 更新localStorage
      const currentTasks = get().tasks;
      get().saveTasksToStorage(currentTasks);

    } catch (error) {
      console.error('Failed to delete task:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task'
      });
    }
  },

  // 清空所有任务
  clearAllTasks: async () => {
    try {
      // 批量删除数据库中的任务
      const currentTasks = get().tasks;
      await Promise.all(
        currentTasks.map(task => videoTaskAPI.deleteTask(task.id))
      );

      set({ tasks: [] });
      localStorage.removeItem('videoTasks');

    } catch (error) {
      console.error('Failed to clear tasks:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to clear tasks'
      });
    }
  },

  // 工具方法
  getTaskById: (id) => {
    return get().tasks.find(task => task.id === id);
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter(task => task.status === status);
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // localStorage辅助方法
  saveTasksToStorage: (tasks) => {
    try {
      localStorage.setItem('videoTasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save tasks to localStorage:', error);
    }
  },

  loadTasksFromStorage: () => {
    try {
      const stored = localStorage.getItem('videoTasks');
      if (stored) {
        const parsedTasks = JSON.parse(stored, (key, value) => {
          if (key === 'createdAt' || key === 'completedAt') {
            return value ? new Date(value) : undefined;
          }
          return value;
        });
        return parsedTasks;
      }
    } catch (error) {
      console.error('Failed to load tasks from localStorage:', error);
    }
    return [];
  }
}));