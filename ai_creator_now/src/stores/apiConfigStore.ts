import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APIConfiguration, APIGenerationRequest, APIGenerationResult } from '../types';
import { apiConfigService } from '../services/apiConfig';
import { logger, logUser } from '../utils/logger';
import ConfigDataHealer from '../utils/configDataHealer';

interface APIConfigStore {
  // Current state
  selectedConfigId: string | null;
  configurations: APIConfiguration[];
  isLoading: boolean;
  error: string | null;

  // Generation state
  generationHistory: APIGenerationResult[];
  activeGenerations: Record<string, APIGenerationRequest>;

  // Actions
  loadConfigurations: () => void;
  selectConfig: (configId: string) => void;
  clearSelectedConfig: () => void;

  // Configuration management
  addConfiguration: (config: Omit<APIConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => APIConfiguration;
  updateConfiguration: (id: string, updates: Partial<APIConfiguration>) => APIConfiguration | null;
  deleteConfiguration: (id: string) => boolean;
  toggleConfiguration: (id: string) => boolean;
  testConfiguration: (config: APIConfiguration) => Promise<{ success: boolean; message: string; data?: any }>;

  // Template management
  getTemplates: () => any[];
  createFromTemplate: (templateId: string, name: string) => APIConfiguration | null;

  // Generation management
  addToHistory: (result: APIGenerationResult) => void;
  clearHistory: () => void;
  getHistoryByConfig: (configId: string) => APIGenerationResult[];

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  getActiveConfig: (type?: string) => APIConfiguration | null;
}

export const useAPIConfigStore = create<APIConfigStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedConfigId: null,
      configurations: [],
      isLoading: false,
      error: null,
      generationHistory: [],
      activeGenerations: {},

      // Load configurations - 现在主要依赖Zustand persist，服务层仅作为备份
      loadConfigurations: () => {
        try {
          logger.info('Loading API configurations - primarily from Zustand persistence');

          // Zustand persist会自动处理，这里只需要同步到服务层
          let currentConfigs = get().configurations;

          // 新增：配置数据完整性检查和修复
          currentConfigs = currentConfigs.map(config => {
            // 检查关键配置字段的完整性
            if (!config.headers || config.headers.length === 0) {
              logger.warn('Configuration missing headers, attempting to restore from localStorage', {
                configId: config.id,
                configName: config.name
              });

              // 尝试从localStorage恢复完整的配置数据
              try {
                const localStorageData = localStorage.getItem('api-config-storage');
                if (localStorageData) {
                  const parsedData = JSON.parse(localStorageData);
                  const storedConfig = parsedData.state?.configurations?.find((c: any) => c.id === config.id);

                  if (storedConfig && storedConfig.headers && storedConfig.headers.length > 0) {
                    logger.info('Restored headers from localStorage', {
                      configId: config.id,
                      headersCount: storedConfig.headers.length
                    });
                    return {
                      ...config,
                      headers: storedConfig.headers
                    };
                  }
                }
              } catch (restoreError) {
                logger.error('Failed to restore configuration from localStorage', {
                  configId: config.id,
                  error: restoreError.message
                });
              }
            }

            // 确保Authorization头部存在且格式正确
            if (config.headers && config.headers.length > 0) {
              const authHeader = config.headers.find(h =>
                h.key?.toLowerCase() === 'authorization'
              );

              if (!authHeader) {
                logger.warn('Configuration missing Authorization header', {
                  configId: config.id,
                  configName: config.name,
                  existingHeaders: config.headers.map(h => h.key)
                });
              } else if (!authHeader.value || !authHeader.value.startsWith('Bearer ')) {
                logger.warn('Authorization header has incorrect format', {
                  configId: config.id,
                  hasValue: !!authHeader.value,
                  startsWithBearer: authHeader.value?.startsWith('Bearer ')
                });
              }
            }

            return config;
          });

          // 更新修复后的配置到store
          set({ configurations: currentConfigs });

          // 配置疗愈 - 关键修复
          const configsNeedingHealing = currentConfigs.filter(config => ConfigDataHealer.needsHealing(config));

          if (configsNeedingHealing.length > 0) {
            logger.warn('Found configurations that need healing', {
              totalConfigs: currentConfigs.length,
              configsNeedingHealing: configsNeedingHealing.length,
              configIds: configsNeedingHealing.map(c => c.id)
            });

            // 批量疗愈配置
            const healingResults = ConfigDataHealer.healConfigs(configsNeedingHealing);

            let healedCount = 0;
            const updatedConfigs = currentConfigs.map(config => {
              const healingResult = healingResults.find(result => result.finalConfig.id === config.id);
              if (healingResult && healingResult.healed) {
                healedCount++;
                logger.info('Configuration healed successfully', {
                  configId: config.id,
                  originalIssues: healingResult.originalIssues,
                  fixedIssues: healingResult.fixedIssues
                });
                return healingResult.finalConfig;
              }
              return config;
            });

            // 更新store中的配置
            set({ configurations: updatedConfigs });
            currentConfigs = updatedConfigs;

            logger.info('Configuration healing completed', {
              totalConfigs: updatedConfigs.length,
              healedConfigs: healedCount
            });
          }

          logger.info('Current store configurations', {
            count: currentConfigs.length,
            configs: currentConfigs.map(c => ({ id: c.id, name: c.name, isActive: c.isActive }))
          });

          // 同步到服务层以确保一致性
          apiConfigService.configurations = [...currentConfigs];

          // 检查并更新Evolink配置以支持异步
          const evolinkConfigs = currentConfigs.filter(config =>
            config.endpoint.includes('evolink.ai') &&
            !config.responseParser?.taskIdPath
          );

          if (evolinkConfigs.length > 0) {
            logger.info('Found Evolink configs without async support - updating them', {
              count: evolinkConfigs.length
            });

            // 使用store的updateConfiguration方法而不是this
            evolinkConfigs.forEach(config => {
              const { updateConfiguration } = get();
              if (updateConfiguration) {
                updateConfiguration(config.id, {
                  responseParser: {
                    ...config.responseParser,
                    taskIdPath: '{taskId}'
                  }
                });
              }
            });
          }

          // 如果store中没有配置，尝试从服务层恢复（向后兼容）
          if (currentConfigs.length === 0) {
            const serviceConfigs = apiConfigService.getConfigurations();
            if (serviceConfigs.length > 0) {
              logger.info('Restoring configurations from service layer', { count: serviceConfigs.length });
              set({ configurations: serviceConfigs });
            } else {
              // 如果没有任何配置，创建基础配置让用户自定义
              logger.info('Creating basic configurations for user customization');

              const basicVideoConfig = {
                id: crypto.randomUUID(),
                name: 'Default Video API',
                type: 'video',
                endpoint: '',
                method: 'POST',
                headers: [],
                requestParams: {
                  model: 'veo3.1-fast',
                  aspect_ratio: '16:9'
                },
                responseParser: {
                  successCode: 200,
                  resultPath: '$.data[0].url',
                  errorPath: '$.error'
                },
                isActive: false, // 默认不激活，让用户配置后激活
                createdAt: new Date(),
                updatedAt: new Date()
              };

              const basicImageConfig = {
                id: crypto.randomUUID(),
                name: 'Default Image API',
                type: 'image',
                endpoint: '',
                method: 'POST',
                headers: [],
                requestParams: {
                  model: 'stable-diffusion-v1-5',
                  width: 1024,
                  height: 1024
                },
                responseParser: {
                  successCode: 200,
                  resultPath: '$.data[0].url',
                  errorPath: '$.error'
                },
                isActive: false, // 默认不激活
                createdAt: new Date(),
                updatedAt: new Date()
              };

              set({ configurations: [basicImageConfig, basicVideoConfig] });
            }
          }

          logger.info('Configuration loading completed', { storeConfigCount: get().configurations.length });
        } catch (error) {
          logger.error('Failed to load API configurations', error);
          set({ error: '加载API配置失败' });
        }
      },

      // Select configuration
      selectConfig: (configId: string) => {
        set({ selectedConfigId: configId });
        logUser.action('api-config-selected', { configId });
      },

      // Clear selected configuration
      clearSelectedConfig: () => {
        set({ selectedConfigId: null });
      },

      // Add configuration
      addConfiguration: (config) => {
        try {
          logger.info('Adding new API configuration', { configName: config.name, type: config.type });

          // 直接在store中创建新配置，不依赖服务层
          const newConfig: APIConfiguration = {
            ...config,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: config.isActive ?? true
          };

          set(state => ({
            configurations: [...state.configurations, newConfig]
          }));

          // 同步到服务层（仅用于向后兼容）
          apiConfigService.configurations.push(newConfig);

          // 为异步API更新默认配置
          if (newConfig.endpoint.includes('evolink.ai')) {
            logger.info('Detected Evolink API - updating for async support');
            const { updateConfiguration } = get();
            if (updateConfiguration) {
              updateConfiguration(newConfig.id, {
                responseParser: {
                  ...newConfig.responseParser,
                  taskIdPath: '{taskId}'
                }
              });
            }
          }

          logger.info('Configuration added successfully', { configId: newConfig.id, storeConfigCount: get().configurations.length });
          logUser.action('api-config-added', { configId: newConfig.id });
          return newConfig;
        } catch (error) {
          logger.error('Failed to add API configuration', error);
          set({ error: '添加API配置失败' });
          throw error;
        }
      },

      // Update configuration
      updateConfiguration: (id, updates) => {
        try {
          // 首先在store层面查找现有配置
          const existingConfig = get().configurations.find(c => c.id === id);

          if (existingConfig) {
            // 保留现有配置的完整数据，特别是headers
            const mergedConfig = {
              ...existingConfig,
              ...updates,
              updatedAt: new Date()
            };

            // 确保headers数据的完整性
            if (!mergedConfig.headers || mergedConfig.headers.length === 0) {
              if (existingConfig.headers && existingConfig.headers.length > 0) {
                mergedConfig.headers = existingConfig.headers;
                logger.warn('Restoring missing headers from existing configuration', { configId: id });
              }
            }

            // 更新store
            set(state => ({
              configurations: state.configurations.map(config =>
                config.id === id ? mergedConfig : config
              )
            }));

            // 同步到服务层（但不依赖服务层返回的数据）
            try {
              apiConfigService.configurations = apiConfigService.configurations.map(c =>
                c.id === id ? mergedConfig : c
              );
            } catch (serviceError) {
              logger.warn('Failed to sync to service layer, but store update succeeded', {
                configId: id,
                error: serviceError.message
              });
            }

            logUser.action('api-config-updated', { configId: id });
            return mergedConfig;
          } else {
            // 如果现有配置不存在，回退到服务层
            const updatedConfig = apiConfigService.updateConfiguration(id, updates);
            if (!updatedConfig) return null;

            set(state => ({
              configurations: state.configurations.map(config =>
                config.id === id ? updatedConfig : config
              )
            }));
            logUser.action('api-config-updated', { configId: id });
            return updatedConfig;
          }
        } catch (error) {
          logger.error('Failed to update API configuration', error);
          set({ error: '更新API配置失败' });
          return null;
        }
      },

      // Delete configuration
      deleteConfiguration: (id) => {
        try {
          const success = apiConfigService.deleteConfiguration(id);
          if (success) {
            set(state => ({
              configurations: state.configurations.filter(config => config.id !== id),
              selectedConfigId: state.selectedConfigId === id ? null : state.selectedConfigId
            }));
            logUser.action('api-config-deleted', { configId: id });
          }
          return success;
        } catch (error) {
          logger.error('Failed to delete API configuration', error);
          set({ error: '删除API配置失败' });
          return false;
        }
      },

      // Toggle configuration
      toggleConfiguration: (id) => {
        try {
          const success = apiConfigService.toggleConfiguration(id);
          if (success) {
            set(state => ({
              configurations: state.configurations.map(config =>
                config.id === id ? { ...config, isActive: !config.isActive } : config
              )
            }));
            logUser.action('api-config-toggled', { configId: id });
          }
          return success;
        } catch (error) {
          logger.error('Failed to toggle API configuration', error);
          set({ error: '切换API配置状态失败' });
          return false;
        }
      },

      // Test configuration
      testConfiguration: async (config) => {
        try {
          set({ isLoading: true, error: null });
          const result = await apiConfigService.testConfiguration(config);
          logUser.action('api-config-tested', {
            configId: config.id,
            success: result.success
          });
          return result;
        } catch (error) {
          logger.error('Failed to test API configuration', error);
          const errorMessage = '测试API配置失败';
          set({ error: errorMessage });
          return { success: false, message: errorMessage };
        } finally {
          set({ isLoading: false });
        }
      },

      // Get templates
      getTemplates: () => {
        try {
          return apiConfigService.getTemplates();
        } catch (error) {
          logger.error('Failed to get API templates', error);
          return [];
        }
      },

      // Create from template
      createFromTemplate: (templateId, name) => {
        try {
          const newConfig = apiConfigService.createFromTemplate(templateId, name);
          if (newConfig) {
            set(state => ({
              configurations: [...state.configurations, newConfig]
            }));
            logUser.action('api-config-created-from-template', { templateId, name });
          }
          return newConfig;
        } catch (error) {
          logger.error('Failed to create config from template', error);
          set({ error: '从模板创建配置失败' });
          return null;
        }
      },

      // Add to generation history
      addToHistory: (result) => {
        set(state => ({
          generationHistory: [result, ...state.generationHistory].slice(0, 100) // Keep last 100 items
        }));
        logUser.action('generation-added-to-history', {
          configId: result.configId,
          success: result.success
        });
      },

      // Clear history
      clearHistory: () => {
        set({ generationHistory: [] });
        logUser.action('generation-history-cleared');
      },

      // Get history by config
      getHistoryByConfig: (configId) => {
        return get().generationHistory.filter(result => result.configId === configId);
      },

      // Update configuration for Evolink async API
      updateConfigurationForEvolink: (configId) => {
        try {
          logger.info('Updating Evolink configuration for async support', { configId });

          const currentConfigs = get().configurations;
          const configIndex = currentConfigs.findIndex(config => config.id === configId);

          if (configIndex === -1) {
            logger.error('Configuration not found for Evolink update', { configId });
            return;
          }

          const config = currentConfigs[configIndex];

          // Update response parser with async settings
          const updatedConfig = {
            ...config,
            responseParser: {
              ...config.responseParser,
              taskIdPath: '$.id',
              pollEndpoint: 'https://api.evolink.ai/v1/tasks/{taskId}',
              pollMethod: 'GET',
              asyncSettings: {
                maxPollingTime: 180000, // 3 minutes
                pollingInterval: 2000, // 2 seconds
                completedStatus: 'completed',
                failedStatus: 'failed'
              }
            },
            updatedAt: new Date()
          };

          // Update store
          set(state => ({
            configurations: state.configurations.map(c =>
              c.id === configId ? updatedConfig : c
            )
          }));

          // Update service layer
          apiConfigService.configurations = apiConfigService.configurations.map(c =>
            c.id === configId ? updatedConfig : c
          );

          logger.info('Evolink configuration updated for async support', { configId });
        } catch (error) {
          logger.error('Failed to update Evolink configuration', { configId, error });
        }
      },

      // Utility
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Get active configuration by type
      getActiveConfig: (type?: string) => {
        const configurations = get().configurations;
        const activeConfigs = configurations.filter(config => config.isActive);

        if (type) {
          return activeConfigs.find(config => config.type === type) || null;
        }

        return activeConfigs[0] || null;
      }
    }),
    {
      name: 'api-config-store',
      partialize: (state) => ({
        selectedConfigId: state.selectedConfigId,
        configurations: state.configurations,
        generationHistory: state.generationHistory
      })
    }
  )
);