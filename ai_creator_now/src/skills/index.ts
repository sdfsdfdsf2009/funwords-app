/**
 * AI Creator Now 技能模块注册表
 * 集成所有自动化技能，提供统一的技能管理接口
 */

import { RequirementProposalSkill } from './requirement-proposal-generator';

// 技能接口定义
export interface Skill {
  name: string;
  description: string;
  shouldTrigger(userInput: string): boolean;
  execute(input: string): Promise<any>;
}

// 技能注册表
export const SKILL_REGISTRY: Skill[] = [
  {
    name: 'requirement-proposal-generator',
    description: '自动生成需求提案，包含产品分析、开发分析和OpenSpec文档',
    shouldTrigger: RequirementProposalSkill.shouldTrigger,
    execute: RequirementProposalSkill.execute
  }
];

/**
 * 技能管理器
 */
export class SkillManager {
  /**
   * 检查用户输入是否触发任何技能
   */
  static findTriggeredSkill(userInput: string): Skill | null {
    for (const skill of SKILL_REGISTRY) {
      if (skill.shouldTrigger(userInput)) {
        return skill;
      }
    }
    return null;
  }

  /**
   * 执行触发的技能
   */
  static async executeTriggeredSkill(userInput: string): Promise<any> {
    const skill = this.findTriggeredSkill(userInput);

    if (!skill) {
      throw new Error('没有找到匹配的技能');
    }

    console.log(`🎯 触发技能: ${skill.name}`);
    console.log(`📝 技能描述: ${skill.description}`);

    try {
      const result = await skill.execute(userInput);
      console.log(`✅ 技能执行完成: ${skill.name}`);
      return result;
    } catch (error) {
      console.error(`❌ 技能执行失败: ${skill.name}`, error);
      throw error;
    }
  }

  /**
   * 获取所有可用技能列表
   */
  static getAllSkills(): Skill[] {
    return [...SKILL_REGISTRY];
  }

  /**
   * 根据名称查找技能
   */
  static getSkillByName(name: string): Skill | null {
    return SKILL_REGISTRY.find(skill => skill.name === name) || null;
  }

  /**
   * 检查是否有技能会被触发
   */
  static hasTriggeredSkill(userInput: string): boolean {
    return this.findTriggeredSkill(userInput) !== null;
  }
}

// 导出具体技能类
export { RequirementProposalSkill } from './requirement-proposal-generator';

// 导出类型定义
export type { RequirementInput, RequirementAnalysis } from './requirement-proposal-generator';

/**
 * 技能使用示例
 *
 * // 检查是否有技能被触发
 * if (SkillManager.hasTriggeredSkill("我想新增一个视频剪辑功能")) {
 *   // 执行技能
 *   const result = await SkillManager.executeTriggeredSkill("我想新增一个视频剪辑功能");
 *   console.log("提案生成结果:", result);
 * }
 *
 * // 获取所有技能
 * const allSkills = SkillManager.getAllSkills();
 * console.log("可用技能:", allSkills.map(s => s.name));
 */