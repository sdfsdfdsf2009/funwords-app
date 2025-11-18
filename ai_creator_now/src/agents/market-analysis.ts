/**
 * 市场分析Subagent
 * 专门负责从市场角度分析需求的商业价值、目标用户、竞争环境、市场机会等
 */

export interface MarketAnalysisInput {
  requirement: {
    title: string;
    description: string;
    targetAudience?: string;
    expectedOutcome?: string;
    userStories?: string[];
  };
  projectContext: {
    industry: string;
    currentMarket: string;
    businessModel: string;
  };
}

export interface MarketAnalysisResult {
  marketOpportunity: {
    size: 'small' | 'medium' | 'large';
    growth: 'low' | 'medium' | 'high';
    potential: string;
  };
  targetAudience: {
    primary: string[];
    secondary: string[];
    demographics: string;
    needs: string[];
    painPoints: string[];
  };
  competitiveLandscape: {
    directCompetitors: string[];
    indirectCompetitors: string[];
    competitiveAdvantage: string[];
    marketGaps: string[];
  };
  businessValue: {
    revenuePotential: string;
    costSavings: string;
    strategicValue: string;
    riskMitigation: string;
  };
  marketStrategy: {
    positioning: string;
    pricing: string;
    distribution: string[];
    marketing: string[];
  };
  risks: {
    market: string[];
    competitive: string[];
    regulatory: string[];
    technological: string[];
  };
}

/**
 * 市场分析Subagent
 */
export class MarketAnalysisAgent {
  private context: {
    input: MarketAnalysisInput;
    analysisProgress: 'initialized' | 'analyzing' | 'completed';
    currentFocus: string;
    findings: any[];
  };

  constructor(input: MarketAnalysisInput) {
    this.context = {
      input,
      analysisProgress: 'initialized',
      currentFocus: '',
      findings: []
    };
  }

  /**
   * 开始市场分析
   */
  startAnalysis(): MarketAnalysisResult {
    console.log('📊 市场分析Agent开始工作...');

    this.context.analysisProgress = 'analyzing';

    // 分析市场机会
    const marketOpportunity = this.analyzeMarketOpportunity();

    // 分析目标受众
    const targetAudience = this.analyzeTargetAudience();

    // 分析竞争环境
    const competitiveLandscape = this.analyzeCompetitiveLandscape();

    // 分析商业价值
    const businessValue = this.analyzeBusinessValue();

    // 分析市场策略
    const marketStrategy = this.analyzeMarketStrategy();

    // 分析风险
    const risks = this.analyzeRisks();

    this.context.analysisProgress = 'completed';

    console.log('✅ 市场分析完成');

    return {
      marketOpportunity,
      targetAudience,
      competitiveLandscape,
      businessValue,
      marketStrategy,
      risks
    };
  }

  /**
   * 分析市场机会
   */
  private analyzeMarketOpportunity(): MarketAnalysisResult['marketOpportunity'] {
    const { requirement, projectContext } = this.context.input;

    // 基于需求内容推断市场机会
    let size: 'small' | 'medium' | 'large' = 'medium';
    let growth: 'low' | 'medium' | 'high' = 'medium';
    let potential = '具有中等市场潜力，需要进一步验证';

    // 根据需求特征评估市场规模
    const highDemandIndicators = [
      'AI', '人工智能', '机器学习',
      '大数据', '云计算', '物联网',
      '移动', '社交', '电商',
      '教育', '医疗', '金融'
    ];

    const hasHighDemand = highDemandIndicators.some(indicator =>
      requirement.description.toLowerCase().includes(indicator.toLowerCase())
    );

    if (hasHighDemand) {
      size = 'large';
      growth = 'high';
      potential = '处于高增长市场，具有巨大的商业潜力';
    }

    // 检查目标受众规模
    if (requirement.targetAudience) {
      const broadAudienceIndicators = ['所有用户', '大众', '所有人', '广泛'];
      const hasBroadAudience = broadAudienceIndicators.some(indicator =>
        requirement.targetAudience!.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasBroadAudience) {
        size = 'large';
        potential = '目标受众广泛，市场空间巨大';
      }
    }

    // 根据预期成果评估潜力
    if (requirement.expectedOutcome) {
      const highValueIndicators = ['革命性', '突破性', '颠覆性', '创新'];
      const hasHighValue = highValueIndicators.some(indicator =>
        requirement.expectedOutcome!.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasHighValue) {
        growth = 'high';
        potential = '具有颠覆性潜力，可能创造新的市场机会';
      }
    }

    return {
      size,
      growth,
      potential
    };
  }

  /**
   * 分析目标受众
   */
  private analyzeTargetAudience(): MarketAnalysisResult['targetAudience'] {
    const { requirement } = this.context.input;

    const primary: string[] = [];
    const secondary: string[] = [];
    const needs: string[] = [];
    const painPoints: string[] = [];

    // 基于需求描述推断目标受众
    if (requirement.targetAudience) {
      primary.push(requirement.targetAudience);
    } else {
      // 根据需求内容推断受众
      if (requirement.description.includes('企业') || requirement.description.includes('B2B')) {
        primary.push('企业用户', 'IT管理者', '业务决策者');
        secondary.push('技术开发人员', '普通员工');
        needs.push('提高效率', '降低成本', '增强竞争力');
        painPoints.push('流程复杂', '成本高昂', '技术门槛');
      } else if (requirement.description.includes('个人') || requirement.description.includes('消费者')) {
        primary.push('个人用户', '消费者');
        secondary.push('家庭用户', '学生群体');
        needs.push('便利性', '性价比', '用户体验');
        painPoints.push('操作复杂', '价格昂贵', '功能不够');
      } else if (requirement.description.includes('开发者') || requirement.description.includes('技术')) {
        primary.push('软件开发者', '技术团队');
        secondary.push('产品经理', '设计师');
        needs.push('开发效率', '技术支持', '集成便利');
        painPoints.push('开发复杂', '文档不足', '集成困难');
      } else {
        primary.push('通用用户');
        needs.push('简单易用', '功能实用', '稳定可靠');
        painPoints.push('学习成本', '功能复杂', '性能问题');
      }
    }

    // 根据用户故事推断更多需求
    if (requirement.userStories) {
      requirement.userStories.forEach(story => {
        if (story.includes('快速') || story.includes('效率')) {
          needs.push('提高效率');
        }
        if (story.includes('简单') || story.includes('容易')) {
          needs.push('简化操作');
        }
        if (story.includes('成本') || story.includes('价格')) {
          needs.push('成本控制');
        }
      });
    }

    return {
      primary: [...new Set(primary)],
      secondary: [...new Set(secondary)],
      demographics: '根据具体需求进一步细化用户画像',
      needs: [...new Set(needs)],
      painPoints: [...new Set(painPoints)]
    };
  }

  /**
   * 分析竞争环境
   */
  private analyzeCompetitiveLandscape(): MarketAnalysisResult['competitiveLandscape'] {
    const { requirement, projectContext } = this.context.input;

    const directCompetitors: string[] = [];
    const indirectCompetitors: string[] = [];
    const competitiveAdvantage: string[] = [];
    const marketGaps: string[] = [];

    // 基于需求领域推断竞争对手
    if (requirement.description.includes('AI') || requirement.description.includes('人工智能')) {
      directCompetitors.push('OpenAI', '百度AI', '腾讯AI', '阿里云AI');
      indirectCompetitors.push('传统软件厂商', '咨询公司');
      competitiveAdvantage.push('技术领先', '算法优势', '数据积累');
      marketGaps.push('垂直领域应用', '定制化解决方案');
    }

    if (requirement.description.includes('视频') || requirement.description.includes('媒体')) {
      directCompetitors.push('Adobe', 'Final Cut Pro', '剪映', '快剪辑');
      indirectCompetitors.push('传统制作公司', '外包服务');
      competitiveAdvantage.push('AI智能化', '操作简便', '成本优势');
      marketGaps.push('自动化制作', '个性化内容');
    }

    if (requirement.description.includes('协作') || requirement.description.includes('团队')) {
      directCompetitors.push('钉钉', '企业微信', '飞书', 'Slack');
      indirectCompetitors.push('传统协作工具', '邮件系统');
      competitiveAdvantage.push('集成度高', '用户体验', '性价比');
      marketGaps.push('AI辅助协作', '智能工作流');
    }

    // 通用竞争优势
    if (competitiveAdvantage.length === 0) {
      competitiveAdvantage.push('技术创新', '用户洞察', '快速响应');
    }

    // 通用市场空白
    if (marketGaps.length === 0) {
      marketGaps.push('细分市场需求', '用户体验优化', '服务差异化');
    }

    return {
      directCompetitors: [...new Set(directCompetitors)],
      indirectCompetitors: [...new Set(indirectCompetitors)],
      competitiveAdvantage: [...new Set(competitiveAdvantage)],
      marketGaps: [...new Set(marketGaps)]
    };
  }

  /**
   * 分析商业价值
   */
  private analyzeBusinessValue(): MarketAnalysisResult['businessValue'] {
    const { requirement } = this.context.input;

    let revenuePotential = '中等收入潜力，取决于市场接受度';
    let costSavings = '可通过技术手段降低运营成本';
    let strategicValue = '有助于提升产品竞争力和市场份额';
    let riskMitigation = '降低手动操作风险，提高数据安全性';

    // 根据需求特征调整价值评估
    if (requirement.description.includes('自动化') || requirement.description.includes('效率')) {
      revenuePotential = '显著的效率提升带来成本节约和收入增长';
      costSavings = '大幅减少人工成本，提高运营效率';
    }

    if (requirement.description.includes('AI') || requirement.description.includes('智能')) {
      revenuePotential = 'AI技术带来的创新价值，具有高收入潜力';
      strategicValue = '技术领先优势，提升品牌价值和市场地位';
    }

    if (requirement.description.includes('平台') || requirement.description.includes('生态')) {
      revenuePotential = '平台模式具有网络效应，收入潜力巨大';
      strategicValue = '构建生态系统，形成长期竞争优势';
    }

    if (requirement.expectedOutcome) {
      if (requirement.expectedOutcome.includes('用户体验') || requirement.expectedOutcome.includes('满意度')) {
        revenuePotential = '用户体验提升带来用户留存和收入增长';
      }

      if (requirement.expectedOutcome.includes('创新') || requirement.expectedOutcome.includes('突破')) {
        strategicValue = '创新能力提升，有助于开拓新市场';
      }
    }

    return {
      revenuePotential,
      costSavings,
      strategicValue,
      riskMitigation
    };
  }

  /**
   * 分析市场策略
   */
  private analyzeMarketStrategy(): MarketAnalysisResult['marketStrategy'] {
    const { requirement } = this.context.input;

    let positioning = '面向目标用户的专业解决方案';
    let pricing = '基于价值的定价策略';
    const distribution: string[] = ['线上直销', '合作伙伴渠道'];
    const marketing: string[] = ['数字营销', '内容营销', '社区运营'];

    // 根据需求特征调整策略
    if (requirement.description.includes('企业') || requirement.description.includes('B2B')) {
      positioning = '企业级解决方案，专注提升业务价值';
      pricing = '基于ROI的价值定价，可提供定制方案';
      distribution.push('直销团队', '系统集成商', '行业代理');
      marketing.push('行业展会', '客户案例', '专业媒体');
    }

    if (requirement.description.includes('个人') || requirement.description.includes('消费者')) {
      positioning = '用户友好的消费级产品，注重体验和性价比';
      pricing = '竞争性定价，可提供免费试用';
      distribution.push('应用商店', '电商平台', '社交媒体');
      marketing.push('社交媒体营销', 'KOL合作', '用户推荐');
    }

    if (requirement.description.includes('技术') || requirement.description.includes('开发者')) {
      positioning = '技术领先的开发工具，专注开发者体验';
      pricing = '免费增值模式，按使用量付费';
      distribution.push('开源社区', '技术论坛', '开发者平台');
      marketing.push('技术博客', '开源贡献', '技术大会');
    }

    return {
      positioning,
      pricing,
      distribution: [...new Set(distribution)],
      marketing: [...new Set(marketing)]
    };
  }

  /**
   * 分析风险
   */
  private analyzeRisks(): MarketAnalysisResult['risks'] {
    const { requirement } = this.context.input;

    const market: string[] = ['市场需求变化', '用户接受度不确定'];
    const competitive: string[] = ['竞争对手跟进', '价格竞争'];
    const regulatory: string[] = ['数据保护法规', '行业监管要求'];
    const technological: string[] = ['技术迭代风险', '技术依赖风险'];

    // 根据需求特征添加特定风险
    if (requirement.description.includes('AI') || requirement.description.includes('机器学习')) {
      regulatory.push('AI伦理规范', '算法透明度要求');
      technological.push('算法偏见风险', '模型性能衰减');
    }

    if (requirement.description.includes('数据') || requirement.description.includes('隐私')) {
      regulatory.push('数据保护法规', '隐私合规要求');
      market.push('用户隐私担忧', '数据泄露风险');
    }

    if (requirement.description.includes('金融') || requirement.description.includes('支付')) {
      regulatory.push('金融监管要求', '支付安全规范');
      competitive.push('金融科技公司竞争');
    }

    return {
      market: [...new Set(market)],
      competitive: [...new Set(competitive)],
      regulatory: [...new Set(regulatory)],
      technological: [...new Set(technological)]
    };
  }

  /**
   * 获取分析上下文
   */
  getContext() {
    return { ...this.context };
  }
}

export default MarketAnalysisAgent;