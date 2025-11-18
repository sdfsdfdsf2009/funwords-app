/**
 * 配置数据疗愈器 - 修复不一致的API配置数据
 */

import { APIConfiguration } from '../types';
import { logger } from './logger';

export interface ConfigHealingResult {
  healed: boolean;
  originalIssues: string[];
  fixedIssues: string[];
  finalConfig: APIConfiguration;
}

export class ConfigDataHealer {
  /**
   * 疗愈API配置数据，修复不一致性问题
   */
  static healConfig(rawConfig: any): ConfigHealingResult {
    const issues: string[] = [];
    const fixes: string[] = [];

    logger.info('Starting configuration healing process', {
      configId: rawConfig?.id,
      hasHeaders: !!rawConfig?.headers
    });

    // 创建配置副本
    const config = { ...rawConfig };

    // 修复1: 检查必需字段
    if (!config.id) {
      issues.push('缺少ID字段');
      config.id = `healed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      fixes.push('生成了新的配置ID');
    }

    if (!config.name) {
      issues.push('缺少名称字段');
      config.name = `修复的配置 ${config.id}`;
      fixes.push('设置了默认配置名称');
    }

    if (!config.type) {
      issues.push('缺少类型字段');
      config.type = 'both'; // 默认支持图片和视频
      fixes.push('设置为默认类型(both)');
    }

    if (!config.endpoint) {
      issues.push('缺少endpoint字段');
      // 尝试从其他字段推断或使用默认值
      config.endpoint = 'https://api.evolink.ai/v1/images/generations';
      fixes.push('设置了默认endpoint');
    }

    // 修复2: headers字段的关键修复
    if (!config.headers || !Array.isArray(config.headers)) {
      issues.push('headers字段缺失或格式错误');
      config.headers = [];
      fixes.push('创建了空的headers数组');
    }

    // 修复3: 确保基本headers存在
    const hasContentType = config.headers.some(h => h.key === 'Content-Type');
    if (!hasContentType) {
      config.headers.push({
        key: 'Content-Type',
        value: 'application/json'
      });
      fixes.push('添加了Content-Type头');
    }

    // 修复4: 验证每个header的格式
    const validHeaders = config.headers.filter(header => {
      if (!header || typeof header !== 'object') {
        issues.push('发现无效的header对象');
        return false;
      }

      if (!header.key || typeof header.key !== 'string') {
        issues.push('header缺少有效的key');
        return false;
      }

      if (header.value === undefined || header.value === null) {
        issues.push(`header ${header.key} 的值为null或undefined`);
        return false;
      }

      if (typeof header.value !== 'string') {
        header.value = String(header.value);
        fixes.push(`将header ${header.key} 的值转换为字符串`);
      }

      return true;
    });

    if (validHeaders.length !== config.headers.length) {
      config.headers = validHeaders;
      fixes.push('移除了无效的header项');
    }

    // 修复5: 验证endpoint格式 - 支持相对路径和绝对路径
    try {
      // 如果是相对路径（以/开头），则跳过URL验证
      if (!config.endpoint.startsWith('/')) {
        new URL(config.endpoint);
      }
    } catch (error) {
      issues.push(`endpoint格式无效: ${config.endpoint}`);
      // 尝试修复常见的格式问题
      if (!config.endpoint.startsWith('http://') && !config.endpoint.startsWith('https://') && !config.endpoint.startsWith('/')) {
        config.endpoint = `https://${config.endpoint}`;
        fixes.push('添加了https://前缀');
      }

      // 再次验证（如果不是相对路径）
      if (!config.endpoint.startsWith('/')) {
        try {
          new URL(config.endpoint);
        } catch (secondError) {
          // 如果还是无效，使用安全的默认值
          config.endpoint = 'https://api.evolink.ai/v1/images/generations';
          fixes.push('使用了安全的默认endpoint');
        }
      }
    }

    // 修复6: 设置合理的默认值
    if (!config.method || !['GET', 'POST'].includes(config.method)) {
      config.method = 'POST';
      fixes.push('设置了默认POST方法');
    }

    if (config.isActive === undefined || config.isActive === null) {
      config.isActive = true;
      fixes.push('设置了默认活跃状态');
    }

    const result: ConfigHealingResult = {
      healed: issues.length > 0,
      originalIssues: issues,
      fixedIssues: fixes,
      finalConfig: config as APIConfiguration
    };

    logger.info('Configuration healing completed', {
      configId: config.id,
      healed: result.healed,
      issueCount: issues.length,
      fixCount: fixes.length
    });

    return result;
  }

  /**
   * 批量疗愈配置数组
   */
  static healConfigs(rawConfigs: any[]): ConfigHealingResult[] {
    logger.info('Starting batch configuration healing', {
      configCount: rawConfigs.length
    });

    return rawConfigs.map((config, index) => {
      try {
        return this.healConfig(config);
      } catch (error) {
        logger.error(`Failed to heal config at index ${index}`, {
          error: error.message,
          config
        });

        // 返回一个基本的配置对象
        return {
          healed: true,
          originalIssues: [`疗愈失败: ${error.message}`],
          fixedIssues: ['创建了基础配置对象'],
          finalConfig: {
            id: `emergency_${Date.now()}_${index}`,
            name: `紧急修复配置 ${index}`,
            type: 'both',
            endpoint: 'https://api.evolink.ai/v1/images/generations',
            method: 'POST',
            headers: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            requestTemplate: {},
            responseParser: { successCode: 200, resultPath: 'results', errorPath: 'error' },
            testSettings: {},
            isActive: true
          } as APIConfiguration
        };
      }
    });
  }

  /**
   * 检查配置是否需要疗愈
   */
  static needsHealing(config: any): boolean {
    if (!config) return true;
    if (!config.headers || !Array.isArray(config.headers)) return true;
    if (!config.id || !config.endpoint) return true;

    // 检查headers格式
    const hasValidHeaders = config.headers.every(header =>
      header &&
      typeof header === 'object' &&
      header.key &&
      typeof header.key === 'string' &&
      header.value !== undefined &&
      header.value !== null
    );

    return !hasValidHeaders;
  }

  /**
   * 获取配置健康报告
   */
  static getHealthReport(config: any): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!config) {
      issues.push('配置对象为空');
      recommendations.push('创建新的API配置');
      return { isHealthy: false, issues, recommendations };
    }

    if (!config.id) {
      issues.push('缺少配置ID');
      recommendations.push('生成唯一的配置ID');
    }

    if (!config.endpoint) {
      issues.push('缺少API端点');
      recommendations.push('设置有效的API端点URL');
    }

    if (!config.headers || !Array.isArray(config.headers)) {
      issues.push('headers字段缺失或格式错误');
      recommendations.push('创建标准headers数组');
    } else {
      // 检查headers内容
      config.headers.forEach((header, index) => {
        if (!header || typeof header !== 'object') {
          issues.push(`Header ${index} 格式无效`);
          recommendations.push(`修复或移除Header ${index}`);
        } else if (!header.key) {
          issues.push(`Header ${index} 缺少key`);
          recommendations.push(`为Header ${index} 设置有效的key`);
        } else if (header.value === undefined || header.value === null) {
          issues.push(`Header ${header.key} 值为空`);
          recommendations.push(`为Header ${header.key} 设置有效的值`);
        }
      });
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}

export default ConfigDataHealer;