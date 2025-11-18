/**
 * 自动化需求提案生成技能（支持交互式需求澄清）
 * 当用户说"新增需求"时自动触发，通过需求澄清Subagent交互式明确需求后生成完整提案文档
 */

import { Task } from '../agents';
import RequirementClarifierAgent from '../agents/requirement-clarifier';
import DomainAnalyzer, { type ComprehensiveAnalysis } from '../agents/domain-analyzer';

// 导入Subagent的类型定义
import type { RequirementInput } from '../agents/requirement-clarifier';

export interface RequirementAnalysis {
  productAnalysis: {
    userValue: string;
    businessImpact: string;
    marketNeed: string;
    competitiveAdvantage: string;
    riskAssessment: string;
  };
  developmentAnalysis: {
    technicalFeasibility: string;
    effortEstimate: string;
    requiredSkills: string[];
    dependencies: string[];
    testingRequirements: string;
  };
  domainAnalysis?: ComprehensiveAnalysis;
  proposal: {
    title: string;
    executiveSummary: string;
    scope: string;
    deliverables: string[];
    timeline: string;
    resources: string[];
    successMetrics: string[];
  };
}

export class RequirementProposalSkill {
  private static readonly TRIGGER_PHRASES = [
    '新增需求',
    '添加需求',
    '我想增加',
    '我需要新增',
    '我想添加',
    '有个新需求',
    '新增功能',
    '添加功能'
  ];

  // Subagent状态管理 - 节省上下文
  private static clarifierAgents = new Map<string, RequirementClarifierAgent>();

  /**
   * 检查用户输入是否触发了需求提案技能
   */
  static shouldTrigger(userInput: string): boolean {
    return this.TRIGGER_PHRASES.some(phrase =>
      userInput.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  /**
   * 执行交互式需求提案生成流程
   */
  static async execute(requirement: string, userId?: string): Promise<RequirementAnalysis | { needClarification: boolean; question: string; stateId: string }> {
    console.log('🚀 启动交互式需求提案生成流程（使用Subagent）...');

    try {
      const agentId = userId || `user-${Date.now()}`;

      // 获取或创建需求澄清Subagent
      let clarifier = this.clarifierAgents.get(agentId);
      if (!clarifier) {
        clarifier = new RequirementClarifierAgent(requirement);
        this.clarifierAgents.set(agentId, clarifier);
      }

      // 开始或继续需求澄清
      const clarificationResult = clarifier.startClarification();

      if (clarificationResult.status === 'continue') {
        return {
          needClarification: true,
          question: clarificationResult.question!,
          stateId: agentId
        };
      }

      // 如果澄清完成，生成完整提案
      if (clarificationResult.status === 'completed' && clarificationResult.requirement) {
        const finalRequirement = clarificationResult.requirement;

        // 清理Subagent状态
        this.clarifierAgents.delete(agentId);

        return await this.generateFullProposal(finalRequirement);
      }

    } catch (error) {
      console.error('❌ 需求提案生成失败:', error);
      throw error;
    }
  }

  /**
   * 处理用户对澄清问题的回复
   */
  static async processClarificationResponse(stateId: string, userResponse: string): Promise<RequirementAnalysis | { needClarification: boolean; question: string; stateId: string }> {
    console.log('💬 处理用户澄清回复（使用Subagent）...');

    try {
      const clarifier = this.clarifierAgents.get(stateId);
      if (!clarifier) {
        throw new Error(`找不到状态ID为 ${stateId} 的需求澄清Subagent`);
      }

      const clarificationResult = clarifier.processUserResponse(userResponse);

      if (clarificationResult.status === 'continue') {
        return {
          needClarification: true,
          question: clarificationResult.question!,
          stateId
        };
      }

      // 如果澄清完成，生成完整提案
      if (clarificationResult.status === 'completed' && clarificationResult.requirement) {
        const finalRequirement = clarificationResult.requirement;

        // 清理Subagent状态
        this.clarifierAgents.delete(stateId);

        return await this.generateFullProposal(finalRequirement);
      }

    } catch (error) {
      console.error('❌ 处理用户回复失败:', error);
      throw error;
    }
  }

  /**
   * 生成完整项目提案
   */
  private static async generateFullProposal(requirement: RequirementInput): Promise<RequirementAnalysis> {
    console.log('📄 生成完整项目提案...');

    // 产品分析
    const productAnalysis = await this.performProductAnalysis(requirement);

    // 开发分析
    const developmentAnalysis = await this.performDevelopmentAnalysis(requirement);

    // 🔍 新增：领域分析
    console.log('🔍 开始进行多领域分析...');
    const domainAnalyzer = new DomainAnalyzer();
    const domainAnalysis = await domainAnalyzer.analyzeRequirementDomains(requirement);
    console.log(`✅ 领域分析完成，共分析 ${domainAnalysis.identifiedDomains.length} 个领域`);

    // 生成提案（现在包含领域分析结果）
    const proposal = await this.generateProposal(requirement, productAnalysis, developmentAnalysis, domainAnalysis);

    // 创建OpenSpec提案
    await this.createOpenSpecProposal(requirement, proposal);

    console.log('✅ 需求提案生成完成！');

    return {
      productAnalysis,
      developmentAnalysis,
      domainAnalysis,
      proposal
    };
  }

  /**
   * 解析用户需求
   */
  private static async parseRequirement(requirement: string): Promise<RequirementInput> {
    console.log('📋 正在解析需求...');

    // 使用AI模型解析需求
    const analysisPrompt = `
请解析以下用户需求，提取关键信息：

需求描述：${requirement}

请以JSON格式返回以下信息：
{
  "title": "需求标题",
  "description": "详细描述",
  "priority": "high|medium|low",
  "userStories": ["用户故事1", "用户故事2"],
  "acceptanceCriteria": ["验收标准1", "验收标准2"],
  "timeline": "预期时间线",
  "stakeholders": ["相关方1", "相关方2"]
}

确保所有输出内容都是中文。
`;

    const result = await this.callAI(analysisPrompt);

    try {
      return JSON.parse(result);
    } catch (error) {
      // 如果解析失败，返回基础结构
      return {
        title: requirement.slice(0, 50),
        description: requirement,
        priority: 'medium',
        userStories: [],
        acceptanceCriteria: [],
        timeline: '',
        stakeholders: []
      };
    }
  }

  /**
   * 执行产品分析
   */
  private static async performProductAnalysis(requirement: RequirementInput): Promise<RequirementAnalysis['productAnalysis']> {
    console.log('🎯 正在进行产品分析...');

    const analysisPrompt = `
作为产品经理，请分析以下需求：

需求标题：${requirement.title}
需求描述：${requirement.description}
用户故事：${requirement.userStories?.join(', ')}
验收标准：${requirement.acceptanceCriteria?.join(', ')}

请从以下维度进行产品分析：

1. 用户价值：这个需求为用户带来什么价值？
2. 业务影响：对业务有什么积极影响？
3. 市场需求：市场上的需求程度如何？
4. 竞争优势：相比竞争对手的优势？
5. 风险评估：存在哪些风险？

请以JSON格式返回分析结果：
{
  "userValue": "用户价值分析",
  "businessImpact": "业务影响分析",
  "marketNeed": "市场需求分析",
  "competitiveAdvantage": "竞争优势分析",
  "riskAssessment": "风险评估"
}

确保所有输出内容都是中文，分析要具体且深入。
`;

    const result = await this.callAI(analysisPrompt);

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        userValue: '需要进一步分析用户价值',
        businessImpact: '需要评估业务影响',
        marketNeed: '需要调研市场需求',
        competitiveAdvantage: '需要分析竞争环境',
        riskAssessment: '需要识别潜在风险'
      };
    }
  }

  /**
   * 执行开发分析
   */
  private static async performDevelopmentAnalysis(requirement: RequirementInput): Promise<RequirementAnalysis['developmentAnalysis']> {
    console.log('💻 正在进行开发分析...');

    const analysisPrompt = `
作为技术负责人，请分析以下需求的开发可行性：

需求标题：${requirement.title}
需求描述：${requirement.description}
验收标准：${requirement.acceptanceCriteria?.join(', ')}

请从以下维度进行开发分析：

1. 技术可行性：技术上是否可行？需要什么技术栈？
2. 工作量估算：大概需要多少开发时间？
3. 技能要求：需要哪些技术技能？
4. 依赖关系：依赖哪些外部系统或模块？
5. 测试要求：需要什么样的测试？

请以JSON格式返回分析结果：
{
  "technicalFeasibility": "技术可行性分析",
  "effortEstimate": "工作量估算",
  "requiredSkills": ["技能1", "技能2"],
  "dependencies": ["依赖1", "依赖2"],
  "testingRequirements": "测试要求"
}

确保所有输出内容都是中文，分析要基于AI Creator Now项目的技术栈。
`;

    const result = await this.callAI(analysisPrompt);

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        technicalFeasibility: '需要进一步技术调研',
        effortEstimate: '需要详细评估',
        requiredSkills: ['前端开发', '后端开发'],
        dependencies: ['数据库', 'API'],
        testingRequirements: '需要制定测试计划'
      };
    }
  }

  /**
   * 生成完整提案
   */
  private static async generateProposal(
    requirement: RequirementInput,
    productAnalysis: RequirementAnalysis['productAnalysis'],
    developmentAnalysis: RequirementAnalysis['developmentAnalysis'],
    domainAnalysis?: ComprehensiveAnalysis
  ): Promise<RequirementAnalysis['proposal']> {
    console.log('📄 正在生成完整提案...');

    let proposalPrompt = `
基于以下分析结果，生成一个完整的项目提案：

需求信息：
标题：${requirement.title}
描述：${requirement.description}
优先级：${requirement.priority}

产品分析：
用户价值：${productAnalysis.userValue}
业务影响：${productAnalysis.businessImpact}
市场需求：${productAnalysis.marketNeed}
竞争优势：${productAnalysis.competitiveAdvantage}
风险评估：${productAnalysis.riskAssessment}

开发分析：
技术可行性：${developmentAnalysis.technicalFeasibility}
工作量估算：${developmentAnalysis.effortEstimate}
技能要求：${developmentAnalysis.requiredSkills.join(', ')}
依赖关系：${developmentAnalysis.dependencies.join(', ')}
测试要求：${developmentAnalysis.testingRequirements}
`;

    // 如果有领域分析结果，添加到提示词中
    if (domainAnalysis) {
      proposalPrompt += `
多领域分析结果：
识别的领域：${domainAnalysis.identifiedDomains.join(', ')}
整体可行性：${domainAnalysis.summary.overallFeasibility}
关键洞察：${domainAnalysis.summary.keyInsights.slice(0, 3).join('; ')}
主要建议：${domainAnalysis.summary.primaryRecommendations.slice(0, 3).join('; ')}
风险因素：${domainAnalysis.summary.riskFactors.slice(0, 2).join('; ')}
成功因素：${domainAnalysis.summary.successFactors.slice(0, 2).join('; ')}

跨领域洞察：
${domainAnalysis.integration.crossDomainInsights.slice(0, 2).join('; ')}
实施优先级：
${domainAnalysis.integration.implementationPriority.slice(0, 3).join('; ')}
`;
    }

    proposalPrompt += `
请生成一个完整的提案，包含：
1. 执行摘要（概述项目价值和目标，结合多领域分析的关键洞察）
2. 项目范围（明确包含和不包含的内容）
3. 交付物（具体的产出清单，考虑多领域建议）
4. 时间线（关键里程碑，参考实施优先级）
5. 资源需求（人力、技术、工具等，考虑各领域的技能要求）
6. 成功指标（如何衡量项目成功，结合多领域成功因素）

请以JSON格式返回：
{
  "title": "提案标题",
  "executiveSummary": "执行摘要",
  "scope": "项目范围",
  "deliverables": ["交付物1", "交付物2"],
  "timeline": "时间线规划",
  "resources": ["资源1", "资源2"],
  "successMetrics": ["成功指标1", "成功指标2"]
}

确保所有输出内容都是中文，提案要专业、全面且具有说服力。在提案中充分体现多领域分析的洞察和建议。
`;

    const result = await this.callAI(proposalPrompt);

    try {
      return JSON.parse(result);
    } catch (error) {
      return {
        title: requirement.title,
        executiveSummary: '基于用户需求的技术解决方案',
        scope: '待进一步明确',
        deliverables: ['功能实现', '测试验证'],
        timeline: requirement.timeline || '待评估',
        resources: ['开发人员', '测试环境'],
        successMetrics: ['功能完成度', '用户满意度']
      };
    }
  }

  /**
   * 创建OpenSpec提案
   */
  private static async createOpenSpecProposal(
    requirement: RequirementInput,
    proposal: RequirementAnalysis['proposal']
  ): Promise<void> {
    console.log('📋 正在创建OpenSpec提案...');

    const changeId = this.generateChangeId(requirement.title);

    const openSpecPrompt = `
请为AI Creator Now项目创建一个OpenSpec提案，使用以下信息：

变更ID：${changeId}
提案标题：${proposal.title}
执行摘要：${proposal.executiveSummary}
项目范围：${proposal.scope}
交付物：${proposal.deliverables.join(', ')}
时间线：${proposal.timeline}
资源需求：${proposal.resources.join(', ')}
成功指标：${proposal.successMetrics.join(', ')}

需求详情：
标题：${requirement.title}
描述：${requirement.description}
优先级：${requirement.priority}
用户故事：${requirement.userStories?.join(', ')}
验收标准：${requirement.acceptanceCriteria?.join(', ')}

请创建符合OpenSpec格式的提案，包含：
1. proposal.md - 提案主体
2. tasks.md - 任务分解
3. design.md - 设计考虑
4. governance/spec.md - 治理规范

使用openspec change命令创建提案。确保所有输出内容都是中文。
`;

    await this.callAI(openSpecPrompt);

    // 实际创建OpenSpec提案
    await this.executeOpenSpecCommand(`openspec change create ${changeId}`);
  }

  /**
   * 生成变更ID
   */
  private static generateChangeId(title: string): string {
    // 简化标题，移除特殊字符，用连字符连接
    const sanitized = title
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);

    return `${sanitized}-${Date.now()}`;
  }

  /**
   * 调用AI模型
   */
  private static async callAI(prompt: string): Promise<string> {
    // 这里可以集成具体的AI模型调用
    // 为了演示，返回模拟响应
    return `{
      "message": "AI模型响应结果",
      "timestamp": "${new Date().toISOString()}"
    }`;
  }

  /**
   * 执行OpenSpec命令
   */
  private static async executeOpenSpecCommand(command: string): Promise<void> {
    console.log(`🔧 执行OpenSpec命令: ${command}`);
    // 这里可以集成实际的OpenSpec命令执行
  }
}

export default RequirementProposalSkill;