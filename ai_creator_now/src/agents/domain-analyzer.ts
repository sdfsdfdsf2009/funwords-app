/**
 * 领域识别器
 * 负责从需求中自动识别涉及的领域，并协调相应的专业分析Subagents
 */

import type { RequirementInput } from './requirement-clarifier';
import TechnicalAnalysisAgent, { type TechnicalAnalysisResult } from './technical-analysis';
import MarketAnalysisAgent, { type MarketAnalysisResult } from './market-analysis';
import UXAnalysisAgent, { type UXAnalysisResult } from './ux-analysis';

export type DomainType = 'technical' | 'market' | 'ux' | 'business' | 'legal' | 'security';

export interface DomainAnalysisResult {
  domain: DomainType;
  relevance: 'high' | 'medium' | 'low';
  confidence: number;
  analysis?: TechnicalAnalysisResult | MarketAnalysisResult | UXAnalysisResult;
  insights: string[];
  recommendations: string[];
}

export interface ComprehensiveAnalysis {
  identifiedDomains: DomainType[];
  domainResults: DomainAnalysisResult[];
  summary: {
    overallFeasibility: 'high' | 'medium' | 'low';
    keyInsights: string[];
    primaryRecommendations: string[];
    riskFactors: string[];
    successFactors: string[];
  };
  integration: {
    crossDomainInsights: string[];
    conflictingRequirements: string[];
    synergisticOpportunities: string[];
    implementationPriority: string[];
  };
}

/**
 * 领域分析器
 */
export class DomainAnalyzer {
  private projectContext = {
    currentTechStack: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'PostgreSQL'],
    architecture: '全栈Web应用架构',
    knownConstraints: ['预算限制', '时间限制', '团队规模'],
    industry: 'AI创意工具',
    currentMarket: '创意内容生成市场',
    businessModel: 'SaaS订阅模式',
    currentUXPatterns: ['现代化UI设计', '响应式布局', '组件化开发'],
    designSystem: '基于Tailwind CSS的设计系统',
    userResearch: '创意工作者和内容创作者'
  };

  /**
   * 分析需求涉及的领域
   */
  async analyzeRequirementDomains(requirement: RequirementInput): Promise<ComprehensiveAnalysis> {
    console.log('🔍 开始领域分析...');

    // 识别相关领域
    const identifiedDomains = this.identifyDomains(requirement);
    console.log(`📋 识别到 ${identifiedDomains.length} 个相关领域:`, identifiedDomains);

    // 对每个领域进行专业分析
    const domainResults: DomainAnalysisResult[] = [];

    for (const domain of identifiedDomains) {
      console.log(`🎯 正在进行 ${domain} 领域分析...`);
      const result = await this.analyzeDomain(requirement, domain);
      domainResults.push(result);
    }

    // 生成综合分析
    const summary = this.generateSummary(domainResults);
    const integration = this.generateIntegrationInsights(domainResults);

    console.log('✅ 领域分析完成');

    return {
      identifiedDomains,
      domainResults,
      summary,
      integration
    };
  }

  /**
   * 识别需求涉及的领域
   */
  private identifyDomains(requirement: RequirementInput): DomainType[] {
    const domains: DomainType[] = [];
    const fullText = [
      requirement.title,
      requirement.description,
      requirement.targetAudience,
      requirement.expectedOutcome,
      ...(requirement.userStories || []),
      ...(requirement.acceptanceCriteria || [])
    ].join(' ').toLowerCase();

    // 技术领域识别
    const technicalKeywords = [
      '技术', '开发', '架构', '系统', '数据库', 'API', 'AI', '人工智能',
      '机器学习', '算法', '性能', '安全', '部署', '集成', '实时',
      '云计算', '移动', 'Web', '前端', '后端', '框架', '编程'
    ];

    if (this.hasKeywordMatches(fullText, technicalKeywords, 2)) {
      domains.push('technical');
    }

    // 市场领域识别
    const marketKeywords = [
      '市场', '商业', '竞争', '用户', '客户', '收入', '成本', '利润',
      '营销', '销售', '定价', '策略', '机会', '趋势', '需求', '供给'
    ];

    if (this.hasKeywordMatches(fullText, marketKeywords, 2)) {
      domains.push('market');
    }

    // UX领域识别
    const uxKeywords = [
      '用户体验', 'UX', 'UI', '界面', '交互', '设计', '可用性',
      '易用性', '导航', '布局', '视觉', '响应式', '移动端',
      '用户旅程', '用户故事', '用户需求', '用户反馈'
    ];

    if (this.hasKeywordMatches(fullText, uxKeywords, 2)) {
      domains.push('ux');
    }

    // 商业领域识别
    const businessKeywords = [
      '业务', '流程', '效率', '优化', '自动化', '协作', '管理',
      '决策', '分析', '报告', '监控', '评估', '改进'
    ];

    if (this.hasKeywordMatches(fullText, businessKeywords, 2)) {
      domains.push('business');
    }

    // 法律领域识别
    const legalKeywords = [
      '法律', '合规', '隐私', '数据保护', '知识产权', '许可',
      '条款', '条件', '政策', '监管', '审计', '认证'
    ];

    if (this.hasKeywordMatches(fullText, legalKeywords, 1)) {
      domains.push('legal');
    }

    // 安全领域识别
    const securityKeywords = [
      '安全', '加密', '认证', '授权', '防护', '漏洞', '威胁',
      '风险', '备份', '恢复', '访问控制', '数据安全'
    ];

    if (this.hasKeywordMatches(fullText, securityKeywords, 1)) {
      domains.push('security');
    }

    // 如果没有识别到任何领域，默认包含核心领域
    if (domains.length === 0) {
      domains.push('technical', 'market', 'ux');
    }

    return [...new Set(domains)];
  }

  /**
   * 检查关键词匹配
   */
  private hasKeywordMatches(text: string, keywords: string[], threshold: number): boolean {
    const matches = keywords.filter(keyword => text.includes(keyword.toLowerCase()));
    return matches.length >= threshold;
  }

  /**
   * 对特定领域进行专业分析
   */
  private async analyzeDomain(requirement: RequirementInput, domain: DomainType): Promise<DomainAnalysisResult> {
    const relevance = this.calculateDomainRelevance(requirement, domain);
    const confidence = this.calculateConfidence(requirement, domain);

    let analysis: TechnicalAnalysisResult | MarketAnalysisResult | UXAnalysisResult | undefined;
    let insights: string[] = [];
    let recommendations: string[] = [];

    try {
      switch (domain) {
        case 'technical':
          const techAgent = new TechnicalAnalysisAgent({
            requirement: {
              title: requirement.title || '',
              description: requirement.description,
              userStories: requirement.userStories || [],
              acceptanceCriteria: requirement.acceptanceCriteria || [],
              constraints: requirement.constraints
            },
            projectContext: {
              currentTechStack: this.projectContext.currentTechStack,
              architecture: this.projectContext.architecture,
              knownConstraints: this.projectContext.knownConstraints
            }
          });
          analysis = techAgent.startAnalysis();
          insights = this.extractTechnicalInsights(analysis as TechnicalAnalysisResult);
          recommendations = this.extractTechnicalRecommendations(analysis as TechnicalAnalysisResult);
          break;

        case 'market':
          const marketAgent = new MarketAnalysisAgent({
            requirement: {
              title: requirement.title || '',
              description: requirement.description,
              targetAudience: requirement.targetAudience,
              expectedOutcome: requirement.expectedOutcome,
              userStories: requirement.userStories
            },
            projectContext: {
              industry: this.projectContext.industry,
              currentMarket: this.projectContext.currentMarket,
              businessModel: this.projectContext.businessModel
            }
          });
          analysis = marketAgent.startAnalysis();
          insights = this.extractMarketInsights(analysis as MarketAnalysisResult);
          recommendations = this.extractMarketRecommendations(analysis as MarketAnalysisResult);
          break;

        case 'ux':
          const uxAgent = new UXAnalysisAgent({
            requirement: {
              title: requirement.title || '',
              description: requirement.description,
              targetAudience: requirement.targetAudience,
              userStories: requirement.userStories,
              acceptanceCriteria: requirement.acceptanceCriteria,
              expectedOutcome: requirement.expectedOutcome
            },
            projectContext: {
              currentUXPatterns: this.projectContext.currentUXPatterns,
              designSystem: this.projectContext.designSystem,
              userResearch: this.projectContext.userResearch
            }
          });
          analysis = uxAgent.startAnalysis();
          insights = this.extractUXInsights(analysis as UXAnalysisResult);
          recommendations = this.extractUXRecommendations(analysis as UXAnalysisResult);
          break;

        case 'business':
          insights = ['需要业务流程分析', '考虑效率提升机会', '评估自动化可能性'];
          recommendations = ['建议进行业务流程梳理', '识别关键绩效指标', '制定改进计划'];
          break;

        case 'legal':
          insights = ['需要考虑合规要求', '数据保护法律风险', '知识产权问题'];
          recommendations = ['咨询法律专家', '制定隐私政策', '确保合规性'];
          break;

        case 'security':
          insights = ['需要安全评估', '识别潜在威胁', '数据保护需求'];
          recommendations = '进行安全审计', '实施安全措施', '制定安全策略'];
          break;
      }
    } catch (error) {
      console.error(`领域 ${domain} 分析失败:`, error);
      insights = ['分析过程中出现错误，建议手动审查'];
      recommendations = ['建议进行更详细的专业分析'];
    }

    return {
      domain,
      relevance,
      confidence,
      analysis,
      insights,
      recommendations: Array.isArray(recommendations) ? recommendations : [recommendations]
    };
  }

  /**
   * 计算领域相关性
   */
  private calculateDomainRelevance(requirement: RequirementInput, domain: DomainType): 'high' | 'medium' | 'low' {
    const fullText = [
      requirement.title,
      requirement.description,
      requirement.targetAudience,
      requirement.expectedOutcome
    ].join(' ').toLowerCase();

    const domainKeywordMap: Record<DomainType, string[]> = {
      technical: ['技术', '开发', '系统', 'AI', '算法', '性能'],
      market: ['市场', '用户', '商业', '竞争', '收入'],
      ux: ['用户体验', '界面', '设计', '交互', '易用性'],
      business: ['业务', '流程', '效率', '管理', '协作'],
      legal: ['法律', '合规', '隐私', '条款', '政策'],
      security: ['安全', '加密', '认证', '保护', '风险']
    };

    const keywords = domainKeywordMap[domain] || [];
    const matchCount = keywords.filter(keyword => fullText.includes(keyword)).length;

    if (matchCount >= 3) return 'high';
    if (matchCount >= 1) return 'medium';
    return 'low';
  }

  /**
   * 计算分析置信度
   */
  private calculateConfidence(requirement: RequirementInput, domain: DomainType): number {
    let confidence = 0.5; // 基础置信度

    // 根据需求完整性调整置信度
    if (requirement.title && requirement.title.length > 10) confidence += 0.1;
    if (requirement.description && requirement.description.length > 50) confidence += 0.2;
    if (requirement.userStories && requirement.userStories.length > 0) confidence += 0.1;
    if (requirement.acceptanceCriteria && requirement.acceptanceCriteria.length > 0) confidence += 0.1;

    // 根据领域相关性调整置信度
    const relevance = this.calculateDomainRelevance(requirement, domain);
    if (relevance === 'high') confidence += 0.2;
    else if (relevance === 'medium') confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * 提取技术洞察
   */
  private extractTechnicalInsights(analysis: TechnicalAnalysisResult): string[] {
    return [
      `技术可行性: ${analysis.feasibility.level}`,
      `推荐架构: ${analysis.architecture.recommendedPattern}`,
      `实现复杂度: ${analysis.implementation.estimatedComplexity}`,
      `所需技能: ${analysis.implementation.requiredSkills.join(', ')}`
    ];
  }

  /**
   * 提取技术建议
   */
  private extractTechnicalRecommendations(analysis: TechnicalAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (analysis.feasibility.level === 'low') {
      recommendations.push('建议重新评估技术方案或降低复杂度');
    }

    if (analysis.implementation.estimatedComplexity === 'complex') {
      recommendations.push('建议分阶段实施，先实现核心功能');
    }

    recommendations.push(...analysis.implementation.keyChallenges);
    recommendations.push(...analysis.performance.optimization);

    return recommendations;
  }

  /**
   * 提取市场洞察
   */
  private extractMarketInsights(analysis: MarketAnalysisResult): string[] {
    return [
      `市场规模: ${analysis.marketOpportunity.size}`,
      `增长潜力: ${analysis.marketOpportunity.growth}`,
      `目标用户: ${analysis.targetAudience.primary.join(', ')}`,
      `竞争优势: ${analysis.competitiveLandscape.competitiveAdvantage.slice(0, 3).join(', ')}`
    ];
  }

  /**
   * 提取市场建议
   */
  private extractMarketRecommendations(analysis: MarketAnalysisResult): string[] {
    const recommendations: string[] = [];

    recommendations.push(`市场定位: ${analysis.marketStrategy.positioning}`);
    recommendations.push(`定价策略: ${analysis.marketStrategy.pricing}`);

    if (analysis.marketOpportunity.size === 'large') {
      recommendations.push('建议抓住市场机会，快速推进');
    }

    recommendations.push(...analysis.risks.market.slice(0, 2));

    return recommendations;
  }

  /**
   * 提取UX洞察
   */
  private extractUXInsights(analysis: UXAnalysisResult): string[] {
    return [
      `可用性水平: ${analysis.userExperience.usability}`,
      `学习难度: ${analysis.userExperience.learnability}`,
      `关键用户旅程阶段: ${analysis.userJourney.keyStages.slice(0, 3).join(', ')}`,
      `主要设计需求: ${analysis.designRequirements.visualDesign.slice(0, 2).join(', ')}`
    ];
  }

  /**
   * 提取UX建议
   */
  private extractUXRecommendations(analysis: UXAnalysisResult): string[] {
    const recommendations: string[] = [];

    recommendations.push(...analysis.usability.recommendations.slice(0, 3));
    recommendations.push(...analysis.userJourney.opportunities.slice(0, 2));
    recommendations.push(...analysis.accessibility.improvements.slice(0, 2));

    return recommendations;
  }

  /**
   * 生成综合分析摘要
   */
  private generateSummary(domainResults: DomainAnalysisResult[]): ComprehensiveAnalysis['summary'] {
    const highRelevanceDomains = domainResults.filter(r => r.relevance === 'high');
    const lowFeasibilityDomains = domainResults.filter(r =>
      r.analysis && 'feasibility' in r.analysis && r.analysis.feasibility.level === 'low'
    );

    // 计算整体可行性
    let overallFeasibility: 'high' | 'medium' | 'low' = 'high';
    if (lowFeasibilityDomains.length > 0) {
      overallFeasibility = lowFeasibilityDomains.length > 1 ? 'low' : 'medium';
    }

    // 收集关键洞察
    const keyInsights = domainResults.flatMap(r => r.insights.slice(0, 2));

    // 收集主要建议
    const primaryRecommendations = domainResults
      .filter(r => r.relevance === 'high')
      .flatMap(r => r.recommendations.slice(0, 2));

    // 识别风险因素
    const riskFactors = domainResults.flatMap(r =>
      r.analysis && 'risks' in r.analysis ?
        Object.values(r.analysis.risks as any).flat().slice(0, 1) :
        ['需要进一步分析']
    );

    // 识别成功因素
    const successFactors = domainResults
      .filter(r => r.relevance === 'high')
      .map(r => `${r.domain}领域支持度高`);

    return {
      overallFeasibility,
      keyInsights: [...new Set(keyInsights)],
      primaryRecommendations: [...new Set(primaryRecommendations)],
      riskFactors: [...new Set(riskFactors)],
      successFactors: [...new Set(successFactors)]
    };
  }

  /**
   * 生成跨领域整合洞察
   */
  private generateIntegrationInsights(domainResults: DomainAnalysisResult[]): ComprehensiveAnalysis['integration'] {
    // 跨领域洞察
    const crossDomainInsights = [
      '技术与用户体验的平衡是成功关键',
      '市场定位需要与技术实现能力相匹配',
      '用户需求应该指导技术架构选择'
    ];

    // 冲突识别
    const conflictingRequirements = domainResults
      .filter(r => r.analysis && 'feasibility' in r.analysis && r.analysis.feasibility.level === 'low')
      .map(r => `${r.domain}领域存在挑战，需要权衡`);

    // 协同机会
    const synergisticOpportunities = [
      '技术优势可以支撑市场差异化',
      '优秀的用户体验可以提升商业价值',
      '跨领域协作能够创造更大价值'
    ];

    // 实施优先级
    const implementationPriority = [
      '1. 核心技术架构设计',
      '2. 关键用户体验流程',
      '3. 市场验证与反馈收集',
      '4. 迭代优化与扩展'
    ];

    return {
      crossDomainInsights,
      conflictingRequirements: [...new Set(conflictingRequirements)],
      synergisticOpportunities: [...new Set(synergisticOpportunities)],
      implementationPriority
    };
  }
}

export default DomainAnalyzer;