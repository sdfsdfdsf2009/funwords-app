import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  type: 'video_generation' | 'image_generation' | 'text_generation' | 'other';
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptTemplatesState {
  templates: PromptTemplate[];
  favorites: string[];
  recentlyUsed: string[];

  // Actions
  addTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addToRecentlyUsed: (id: string) => void;

  // Getters
  getTemplateById: (id: string) => PromptTemplate | undefined;
  getTemplatesByCategory: (category: string) => PromptTemplate[];
  getTemplatesByType: (type: PromptTemplate['type']) => PromptTemplate[];
  getFavoriteTemplates: () => PromptTemplate[];
  getRecentlyUsedTemplates: () => PromptTemplate[];
  searchTemplates: (query: string) => PromptTemplate[];
}

const defaultTemplates: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '电影感视频生成',
    description: '适合生成具有电影质感的视频内容',
    content: '电影级画质，{场景}，{时间}，{氛围}，使用{镜头类型}拍摄，{色调}色调，专业灯光布置，高质量细节，8K分辨率',
    category: '视频风格',
    tags: ['电影', '专业', '高质量'],
    type: 'video_generation',
    isSystem: true
  },
  {
    name: '产品展示视频',
    description: '用于展示产品的特点和优势',
    content: '产品展示视频，突出{产品特点}，{背景环境}，{拍摄角度}视角，清晰细节，专业光线，简洁背景，品牌色调',
    category: '商业',
    tags: ['产品', '商业', '展示'],
    type: 'video_generation',
    isSystem: true
  },
  {
    name: '自然风景纪录片',
    description: '生成自然风景类的纪录片风格视频',
    content: '自然纪录片风格，{地点}的{自然景观}，{季节}时节，{天气条件}，航拍镜头，自然光线，环保主题，4K超高清',
    category: '纪录片',
    tags: ['自然', '纪录片', '航拍'],
    type: 'video_generation',
    isSystem: true
  },
  {
    name: '人物访谈视频',
    description: '适合人物访谈和对话类视频',
    content: '人物访谈场景，{访谈环境}，{灯光布置}，{机位角度}，专业收音，{人物表情}自然，背景虚化，温暖色调',
    category: '访谈',
    tags: ['人物', '访谈', '对话'],
    type: 'video_generation',
    isSystem: true
  },
  {
    name: '美食制作视频',
    description: '美食制作过程的视频展示',
    content: '美食制作视频，{菜品类型}，{制作环境}，特写镜头，{烹饪动作}详细展示，食材新鲜度，蒸汽效果，诱人色泽',
    category: '美食',
    tags: ['美食', '制作', '特写'],
    type: 'video_generation',
    isSystem: true
  },
  {
    name: '科技产品介绍',
    description: '科技产品的功能和使用介绍',
    content: '科技产品介绍，{产品名称}，{使用场景}，功能展示，界面操作演示，科技感背景，蓝色调，现代简约风格',
    category: '科技',
    tags: ['科技', '产品', '演示'],
    type: 'video_generation',
    isSystem: true
  },
  {
    name: '运动健身视频',
    description: '运动健身指导和展示视频',
    content: '运动健身视频，{运动类型}，{健身环境}，专业教练，动作标准示范，肌肉细节展示，活力背景音乐，激励氛围',
    category: '运动',
    tags: ['运动', '健身', '指导'],
    type: 'video_generation',
    isSystem: true
  },
  {
    name: '艺术创作过程',
    description: '艺术创作过程的记录和展示',
    content: '艺术创作视频，{艺术类型}，{创作环境}，创作过程记录，工具特写，{创作风格}，艺术家手法，作品完成展示',
    category: '艺术',
    tags: ['艺术', '创作', '过程'],
    type: 'video_generation',
    isSystem: true
  }
];

export const usePromptTemplatesStore = create<PromptTemplatesState>()(
  persist(
    (set, get) => ({
      templates: [],
      favorites: [],
      recentlyUsed: [],

      addTemplate: (templateData) => {
        const newTemplate: PromptTemplate = {
          ...templateData,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === id
              ? { ...template, ...updates, updatedAt: new Date() }
              : template
          ),
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((template) => template.id !== id),
          favorites: state.favorites.filter((favId) => favId !== id),
          recentlyUsed: state.recentlyUsed.filter((usedId) => usedId !== id),
        }));
      },

      duplicateTemplate: (id) => {
        const template = get().getTemplateById(id);
        if (template) {
          const duplicatedTemplate: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
            ...template,
            name: `${template.name} (副本)`,
            isSystem: false,
          };
          get().addTemplate(duplicatedTemplate);
        }
      },

      toggleFavorite: (id) => {
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((favId) => favId !== id)
            : [...state.favorites, id],
        }));
      },

      addToRecentlyUsed: (id) => {
        set((state) => {
          const filtered = state.recentlyUsed.filter((usedId) => usedId !== id);
          return {
            recentlyUsed: [id, ...filtered].slice(0, 10), // Keep only last 10
          };
        });
      },

      getTemplateById: (id) => {
        return get().templates.find((template) => template.id === id);
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter((template) => template.category === category);
      },

      getTemplatesByType: (type) => {
        return get().templates.filter((template) => template.type === type);
      },

      getFavoriteTemplates: () => {
        const { templates, favorites } = get();
        return templates.filter((template) => favorites.includes(template.id));
      },

      getRecentlyUsedTemplates: () => {
        const { templates, recentlyUsed } = get();
        return recentlyUsed
          .map((id) => templates.find((template) => template.id === id))
          .filter((template): template is PromptTemplate => template !== undefined);
      },

      searchTemplates: (query) => {
        const { templates } = get();
        const lowercaseQuery = query.toLowerCase();

        return templates.filter(
          (template) =>
            template.name.toLowerCase().includes(lowercaseQuery) ||
            template.description.toLowerCase().includes(lowercaseQuery) ||
            template.content.toLowerCase().includes(lowercaseQuery) ||
            template.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
            template.category.toLowerCase().includes(lowercaseQuery)
        );
      },
    }),
    {
      name: 'prompt-templates-storage',
      onRehydrateStorage: () => (state) => {
        // Initialize default templates if store is empty
        if (state && state.templates.length === 0) {
          defaultTemplates.forEach((template) => {
            state.addTemplate(template);
          });
        }
      },
    }
  )
);

// Initialize default templates on first load
if (typeof window !== 'undefined') {
  const store = usePromptTemplatesStore.getState();
  if (store.templates.length === 0) {
    defaultTemplates.forEach((template) => {
      store.addTemplate(template);
    });
  }
}