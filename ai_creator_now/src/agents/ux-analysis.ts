/**
 * 用户体验分析Subagent
 * 专门负责从用户体验角度分析需求的可用性、易用性、用户旅程、界面设计等
 */

export interface UXAnalysisInput {
  requirement: {
    title: string;
    description: string;
    targetAudience?: string;
    userStories?: string[];
    acceptanceCriteria?: string[];
    expectedOutcome?: string;
  };
  projectContext: {
    currentUXPatterns: string[];
    designSystem: string;
    userResearch: string;
  };
}

export interface UXAnalysisResult {
  userExperience: {
    usability: 'high' | 'medium' | 'low';
    learnability: 'high' | 'medium' | 'low';
    efficiency: 'high' | 'medium' | 'low';
    satisfaction: 'high' | 'medium' | 'low';
  };
  userJourney: {
    keyStages: string[];
    touchpoints: string[];
    painPoints: string[];
    opportunities: string[];
  };
  interfaceDesign: {
    layout: string;
    navigation: string;
    interactions: string[];
    feedback: string[];
  };
  accessibility: {
    compliance: string;
    features: string[];
    improvements: string[];
  };
  usability: {
    heuristics: string[];
    recommendations: string[];
    testing: string[];
  };
  designRequirements: {
    visualDesign: string[];
    interactionDesign: string[];
    contentStrategy: string[];
    responsiveDesign: string[];
  };
}

/**
 * 用户体验分析Subagent
 */
export class UXAnalysisAgent {
  private context: {
    input: UXAnalysisInput;
    analysisProgress: 'initialized' | 'analyzing' | 'completed';
    currentFocus: string;
    findings: any[];
  };

  constructor(input: UXAnalysisInput) {
    this.context = {
      input,
      analysisProgress: 'initialized',
      currentFocus: '',
      findings: []
    };
  }

  /**
   * 开始UX分析
   */
  startAnalysis(): UXAnalysisResult {
    console.log('🎨 用户体验分析Agent开始工作...');

    this.context.analysisProgress = 'analyzing';

    // 分析用户体验指标
    const userExperience = this.analyzeUserExperience();

    // 分析用户旅程
    const userJourney = this.analyzeUserJourney();

    // 分析界面设计
    const interfaceDesign = this.analyzeInterfaceDesign();

    // 分析可访问性
    const accessibility = this.analyzeAccessibility();

    // 分析可用性
    const usability = this.analyzeUsability();

    // 分析设计需求
    const designRequirements = this.analyzeDesignRequirements();

    this.context.analysisProgress = 'completed';

    console.log('✅ 用户体验分析完成');

    return {
      userExperience,
      userJourney,
      interfaceDesign,
      accessibility,
      usability,
      designRequirements
    };
  }

  /**
   * 分析用户体验指标
   */
  private analyzeUserExperience(): UXAnalysisResult['userExperience'] {
    const { requirement } = this.context.input;

    let usability: 'high' | 'medium' | 'low' = 'medium';
    let learnability: 'high' | 'medium' | 'low' = 'medium';
    let efficiency: 'high' | 'medium' | 'low' = 'medium';
    let satisfaction: 'high' | 'medium' | 'low' = 'medium';

    // 基于需求描述评估用户体验指标
    const positiveIndicators = [
      '简单', '易用', '直观', '清晰', '友好',
      '快速', '便捷', '流畅', '响应', '即时'
    ];

    const negativeIndicators = [
      '复杂', '困难', '繁琐', '混乱', '难以',
      '缓慢', '延迟', '卡顿', '错误', '故障'
    ];

    const hasPositiveFeatures = positiveIndicators.some(indicator =>
      requirement.description.toLowerCase().includes(indicator.toLowerCase())
    );

    const hasNegativeFeatures = negativeIndicators.some(indicator =>
      requirement.description.toLowerCase().includes(indicator.toLowerCase())
    );

    if (hasPositiveFeatures) {
      usability = 'high';
      learnability = 'high';
      efficiency = 'high';
      satisfaction = 'high';
    }

    if (hasNegativeFeatures) {
      usability = 'low';
      learnability = 'low';
      efficiency = 'low';
      satisfaction = 'low';
    }

    // 根据用户故事调整评估
    if (requirement.userStories) {
      const efficiencyStories = requirement.userStories.filter(story =>
        story.includes('快速') || story.includes('效率') || story.includes('时间')
      );

      if (efficiencyStories.length > 0) {
        efficiency = 'high';
      }

      const learnabilityStories = requirement.userStories.filter(story =>
        story.includes('学习') || story.includes('上手') || story.includes('理解')
      );

      if (learnabilityStories.length > 0) {
        learnability = 'high';
      }
    }

    return {
      usability,
      learnability,
      efficiency,
      satisfaction
    };
  }

  /**
   * 分析用户旅程
   */
  private analyzeUserJourney(): UXAnalysisResult['userJourney'] {
    const { requirement } = this.context.input;

    const keyStages = ['发现', '注册', '学习', '使用', '分享', '留存'];
    const touchpoints = ['网站访问', '移动应用', '客户支持', '社交媒体'];
    const painPoints: string[] = [];
    const opportunities: string[] = [];

    // 基于需求内容识别关键阶段和触点
    if (requirement.description.includes('注册') || requirement.description.includes('登录')) {
      keyStages.push('认证');
      touchpoints.push('登录页面');
      painPoints.push('注册流程复杂', '密码忘记');
      opportunities.push('社交登录', '一键注册');
    }

    if (requirement.description.includes('搜索') || requirement.description.includes('查找')) {
      keyStages.push('搜索');
      touchpoints.push('搜索界面');
      painPoints.push('搜索结果不准确', '搜索速度慢');
      opportunities.push('智能搜索', '搜索建议');
    }

    if (requirement.description.includes('购买') || requirement.description.includes('支付')) {
      keyStages.push('购买', '支付');
      touchpoints.push('购物车', '支付页面');
      painPoints.push('支付复杂', '安全担忧');
      opportunities.push('一键支付', '多种支付方式');
    }

    if (requirement.description.includes('协作') || requirement.description.includes('分享')) {
      keyStages.push('协作', '分享');
      touchpoints.push('协作界面', '分享功能');
      painPoints.push('协作不便', '分享复杂');
      opportunities.push('实时协作', '一键分享');
    }

    // 根据预期成果识别机会点
    if (requirement.expectedOutcome) {
      if (requirement.expectedOutcome.includes('体验') || requirement.expectedOutcome.includes('满意')) {
        opportunities.push('提升用户体验', '增强用户满意度');
      }

      if (requirement.expectedOutcome.includes('效率') || requirement.expectedOutcome.includes('快速')) {
        opportunities.push('优化操作流程', '提高使用效率');
      }
    }

    return {
      keyStages: [...new Set(keyStages)],
      touchpoints: [...new Set(touchpoints)],
      painPoints: [...new Set(painPoints)],
      opportunities: [...new Set(opportunities)]
    };
  }

  /**
   * 分析界面设计
   */
  private analyzeInterfaceDesign(): UXAnalysisResult['interfaceDesign'] {
    const { requirement } = this.context.input;

    let layout = '响应式布局，适配多种设备';
    let navigation = '清晰的导航结构，易于理解和操作';
    const interactions: string[] = ['按钮点击', '表单输入', '页面切换'];
    const feedback: string[] = ['加载状态', '操作确认', '错误提示'];

    // 基于需求内容推断界面设计需求
    if (requirement.description.includes('仪表盘') || requirement.description.includes('管理')) {
      layout = '仪表盘布局，信息层次清晰';
      navigation = '侧边栏导航，便于功能切换';
      interactions.push('数据筛选', '图表交互', '拖拽操作');
      feedback.push('数据更新', '状态变化', '进度指示');
    }

    if (requirement.description.includes('移动') || requirement.description.includes('手机')) {
      layout = '移动优先设计，触屏友好';
      navigation = '底部导航，拇指操作区域';
      interactions.push('手势操作', '滑动切换', '长按菜单');
      feedback.push('触觉反馈', '动画过渡', '微交互');
    }

    if (requirement.description.includes('表格') || requirement.description.includes('列表')) {
      layout = '表格布局，支持排序和筛选';
      interactions.push('表格操作', '批量处理', '数据导出');
      feedback.push('选中状态', '操作结果', '数据统计');
    }

    if (requirement.description.includes('表单') || requirement.description.includes('输入')) {
      layout = '表单布局，分组清晰';
      interactions.push('表单验证', '自动保存', '智能提示');
      feedback.push('验证错误', '保存成功', '格式检查');
    }

    return {
      layout,
      navigation,
      interactions: [...new Set(interactions)],
      feedback: [...new Set(feedback)]
    };
  }

  /**
   * 分析可访问性
   */
  private analyzeAccessibility(): UXAnalysisResult['accessibility'] {
    const { requirement } = this.context.input;

    let compliance = '符合WCAG 2.1 AA级别标准';
    const features = [
      '键盘导航支持',
      '屏幕阅读器兼容',
      '高对比度模式',
      '字体大小调节',
      '焦点管理',
      '语义化HTML'
    ];

    const improvements: string[] = [];

    // 基于需求内容添加特定可访问性需求
    if (requirement.description.includes('视频') || requirement.description.includes('音频')) {
      features.push('字幕支持', '音频描述', '手语翻译');
      improvements.push('媒体内容可访问性优化');
    }

    if (requirement.description.includes('图表') || requirement.description.includes('数据')) {
      features.push('数据表格化', '图表替代文本', '数据语音播报');
      improvements.push('数据可视化可访问性');
    }

    if (requirement.description.includes('颜色') || requirement.description.includes('视觉')) {
      features.push('色盲友好设计', '不仅依赖颜色传达信息');
      improvements.push('视觉设计可访问性增强');
    }

    // 根据目标受众调整
    if (requirement.targetAudience) {
      if (requirement.targetAudience.includes('老年') || requirement.targetAudience.includes('视障')) {
        compliance = '符合WCAG 2.1 AAA级别标准';
        improvements.push('高对比度优化', '字体放大支持', '语音导航');
      }
    }

    return {
      compliance,
      features: [...new Set(features)],
      improvements: [...new Set(improvements)]
    };
  }

  /**
   * 分析可用性
   */
  private analyzeUsability(): UXAnalysisResult['usability'] {
    const { requirement } = this.context.input;

    const heuristics = [
      '系统状态可见性',
      '系统与现实世界匹配',
      '用户控制与自由度',
      '一致性与标准',
      '错误预防',
      '识别而非回忆',
      '使用灵活性和效率',
      '美学与最小化设计',
      '帮助用户识别、诊断和恢复错误',
      '帮助和文档'
    ];

    const recommendations: string[] = [];
    const testing: string[] = ['用户测试', '启发式评估', '认知走查'];

    // 基于需求内容生成具体建议
    if (requirement.description.includes('复杂') || requirement.description.includes('困难')) {
      recommendations.push('简化操作流程', '提供清晰指引', '渐进式信息披露');
      testing.push('任务完成度测试', '学习曲线测试');
    }

    if (requirement.description.includes('错误') || requirement.description.includes('异常')) {
      recommendations.push('错误预防机制', '友好的错误提示', '错误恢复方案');
      testing.push('错误处理测试', '异常情况模拟');
    }

    if (requirement.description.includes('新手') || requirement.description.includes('初学者')) {
      recommendations.push('新手引导', '交互提示', '帮助文档');
      testing.push('新手用户测试', '学习效率评估');
    }

    if (requirement.userStories && requirement.userStories.length > 5) {
      recommendations.push('任务优先级设计', '快捷操作支持', '个性化定制');
      testing.push('专家用户测试', '效率对比测试');
    }

    return {
      heuristics,
      recommendations: [...new Set(recommendations)],
      testing: [...new Set(testing)]
    };
  }

  /**
   * 分析设计需求
   */
  private analyzeDesignRequirements(): UXAnalysisResult['designRequirements'] {
    const { requirement } = this.context.input;

    const visualDesign = ['一致的视觉风格', '清晰的层级关系', '品牌色彩应用'];
    const interactionDesign = ['流畅的动画效果', '即时的交互反馈', '自然的手势支持'];
    const contentStrategy = ['简洁明了的文案', '多语言支持', '内容层次化'];
    const responsiveDesign = ['移动端适配', '平板端优化', '桌面端体验'];

    // 基于需求内容添加特定设计需求
    if (requirement.description.includes('品牌') || requirement.description.includes('形象')) {
      visualDesign.push('品牌元素融入', '视觉识别系统', '品牌一致性检查');
    }

    if (requirement.description.includes('动画') || requirement.description.includes('特效')) {
      interactionDesign.push('微交互动画', '转场效果', '加载动画');
    }

    if (requirement.description.includes('国际化') || requirement.description.includes('多语言')) {
      contentStrategy.push('本地化适配', '文化敏感性', '文字排版优化');
      responsiveDesign.push('RTL语言支持', '不同语言布局调整');
    }

    if (requirement.description.includes('数据') || requirement.description.includes('图表')) {
      visualDesign.push('数据可视化设计', '信息图表样式', '数据色彩编码');
    }

    return {
      visualDesign: [...new Set(visualDesign)],
      interactionDesign: [...new Set(interactionDesign)],
      contentStrategy: [...new Set(contentStrategy)],
      responsiveDesign: [...new Set(responsiveDesign)]
    };
  }

  /**
   * 获取分析上下文
   */
  getContext() {
    return { ...this.context };
  }
}

export default UXAnalysisAgent;