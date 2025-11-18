/**
 * 需求澄清专用Subagent
 * 负责通过交互式对话收集和明确用户需求细节
 */

export interface RequirementInput {
  title?: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  userStories?: string[];
  acceptanceCriteria?: string[];
  timeline?: string;
  stakeholders?: string[];
  targetAudience?: string;
  expectedOutcome?: string;
  constraints?: string[];
  budget?: string;
}

export interface ClarificationResult {
  status: 'continue' | 'completed';
  question?: string;
  requirement?: RequirementInput;
  summary?: string;
}

export interface ClarificationContext {
  phase: 'initial' | 'clarifying' | 'confirming' | 'completed';
  answeredQuestions: string[];
  missingInformation: string[];
  currentRequirement: Partial<RequirementInput>;
  conversationHistory: Array<{
    role: 'assistant' | 'user';
    content: string;
    timestamp: string;
    questionType?: 'clarification' | 'confirmation' | 'detail';
  }>;
}

/**
 * 需求澄清Subagent
 */
export class RequirementClarifierAgent {
  private context: ClarificationContext;

  constructor(initialRequirement: string) {
    this.context = {
      phase: 'initial',
      answeredQuestions: [],
      missingInformation: [],
      currentRequirement: {
        description: initialRequirement,
        priority: 'medium'
      },
      conversationHistory: []
    };
  }

  /**
   * 开始需求澄清流程
   */
  startClarification(): ClarificationResult {
    console.log('🔍 需求澄清Agent开始工作...');

    // 分析初始需求，识别缺失信息
    this.context.missingInformation = this.analyzeMissingInformation(this.context.currentRequirement);
    this.context.phase = 'clarifying';

    // 生成第一个澄清问题
    const question = this.generateClarificationQuestion();

    // 添加系统消息到对话历史
    this.addMessage('assistant', `我收到了您的需求："${this.context.currentRequirement.description}"。为了更好地理解您的需求并生成准确的提案，我需要向您确认一些细节。`, 'clarification');

    return {
      status: 'continue',
      question
    };
  }

  /**
   * 处理用户回复
   */
  processUserResponse(userResponse: string): ClarificationResult {
    console.log('💬 需求澄清Agent处理用户回复...');

    // 添加用户回复到对话历史
    this.addMessage('user', userResponse);

    // 解析用户回复，更新需求信息
    this.updateRequirementFromResponse(userResponse);

    // 检查是否还需要更多信息
    this.context.missingInformation = this.analyzeMissingInformation(this.context.currentRequirement);

    if (this.context.missingInformation.length === 0) {
      // 需求信息已足够，确认并完成
      return this.completeClarification();
    }

    // 生成下一个澄清问题
    const question = this.generateClarificationQuestion();

    return {
      status: 'continue',
      question
    };
  }

  /**
   * 完成需求澄清
   */
  private completeClarification(): ClarificationResult {
    console.log('✅ 需求澄清完成...');

    this.context.phase = 'confirming';

    // 生成需求确认摘要
    const summary = this.generateRequirementSummary();
    const requirement = this.context.currentRequirement as RequirementInput;

    // 添加确认消息到对话历史
    this.addMessage('assistant', `非常感谢！我已经收集到足够的信息。以下是我理解的需求摘要：\n\n${summary}\n\n如果这个理解准确，我将开始生成完整的项目提案。如果需要修改，请告诉我具体哪里需要调整。`, 'confirmation');

    this.context.phase = 'completed';

    return {
      status: 'completed',
      requirement,
      summary
    };
  }

  /**
   * 分析缺失的信息
   */
  private analyzeMissingInformation(requirement: Partial<RequirementInput>): string[] {
    const missingInfo: string[] = [];

    if (!requirement.title || requirement.title.length < 5) {
      missingInfo.push('需求标题');
    }

    if (!requirement.description || requirement.description.length < 20) {
      missingInfo.push('详细描述');
    }

    if (!requirement.targetAudience) {
      missingInfo.push('目标用户');
    }

    if (!requirement.expectedOutcome) {
      missingInfo.push('预期成果');
    }

    if (!requirement.timeline) {
      missingInfo.push('期望时间线');
    }

    if (!requirement.priority) {
      missingInfo.push('优先级');
    }

    if (!requirement.userStories || requirement.userStories.length === 0) {
      missingInfo.push('用户故事');
    }

    if (!requirement.acceptanceCriteria || requirement.acceptanceCriteria.length === 0) {
      missingInfo.push('验收标准');
    }

    return missingInfo;
  }

  /**
   * 生成澄清问题
   */
  private generateClarificationQuestion(): string {
    const questionTemplates = {
      '需求标题': '为了更好地理解您的需求，请给这个需求起一个简洁明确的标题（建议5-20个字）。',
      '详细描述': '请您详细描述一下这个需求的具体内容和背景，比如要解决什么问题，达到什么效果？',
      '目标用户': '这个需求主要针对哪些用户群体？请描述一下他们的特征和需求。',
      '预期成果': '您希望这个功能实现后，用户能够获得什么具体的收益或体验改善？',
      '期望时间线': '您希望这个需求在什么时间前完成？有没有明确的时间要求？',
      '优先级': '在所有待办需求中，这个需求的优先级如何？（高/中/低）',
      '用户故事': '从用户的角度来看，请描述一下用户会如何使用这个功能？可以描述几个典型的使用场景。',
      '验收标准': '如何判断这个需求已经成功实现？请列出具体的验收标准。'
    };

    // 选择最重要的缺失信息提问
    const primaryMissing = this.context.missingInformation[0];
    let question = questionTemplates[primaryMissing] || `请您详细说明一下${primaryMissing}的具体要求。`;

    // 如果已经问过一些问题，添加上下文
    if (this.context.answeredQuestions.length > 0) {
      question = `感谢您的回复！接下来我想了解一下：${question}`;
    }

    return question;
  }

  /**
   * 从用户回复中更新需求信息
   */
  private updateRequirementFromResponse(userResponse: string): void {
    // 简化的信息提取逻辑（实际应用中可以集成AI进行智能解析）
    const response = userResponse.toLowerCase();

    // 提取标题
    if (!this.context.currentRequirement.title && userResponse.length < 30 && !response.includes('用户') && !response.includes('功能')) {
      this.context.currentRequirement.title = userResponse;
      this.context.answeredQuestions.push('title');
    }

    // 提取目标用户
    if (response.includes('用户') || response.includes('目标') || response.includes('人群')) {
      if (!this.context.currentRequirement.targetAudience) {
        this.context.currentRequirement.targetAudience = userResponse;
        this.context.answeredQuestions.push('targetAudience');
      }
    }

    // 提取预期成果
    if (response.includes('效果') || response.includes('收益') || response.includes('改善') || response.includes('体验')) {
      if (!this.context.currentRequirement.expectedOutcome) {
        this.context.currentRequirement.expectedOutcome = userResponse;
        this.context.answeredQuestions.push('expectedOutcome');
      }
    }

    // 提取时间线
    if (response.includes('时间') || response.includes('天') || response.includes('周') || response.includes('月')) {
      if (!this.context.currentRequirement.timeline) {
        this.context.currentRequirement.timeline = userResponse;
        this.context.answeredQuestions.push('timeline');
      }
    }

    // 提取优先级
    if (response.includes('高') || response.includes('紧急')) {
      this.context.currentRequirement.priority = 'high';
      this.context.answeredQuestions.push('priority');
    } else if (response.includes('低') || response.includes('不急')) {
      this.context.currentRequirement.priority = 'low';
      this.context.answeredQuestions.push('priority');
    } else if (response.includes('中') || response.includes('一般')) {
      this.context.currentRequirement.priority = 'medium';
      this.context.answeredQuestions.push('priority');
    }

    // 提取用户故事
    if (response.includes('场景') || response.includes('使用') || response.includes('故事')) {
      if (!this.context.currentRequirement.userStories) {
        this.context.currentRequirement.userStories = [];
      }
      this.context.currentRequirement.userStories.push(userResponse);
      this.context.answeredQuestions.push('userStories');
    }

    // 提取验收标准
    if (response.includes('标准') || response.includes('要求') || response.includes('判断') || response.includes('验证')) {
      if (!this.context.currentRequirement.acceptanceCriteria) {
        this.context.currentRequirement.acceptanceCriteria = [];
      }
      this.context.currentRequirement.acceptanceCriteria.push(userResponse);
      this.context.answeredQuestions.push('acceptanceCriteria');
    }
  }

  /**
   * 生成需求摘要
   */
  private generateRequirementSummary(): string {
    const req = this.context.currentRequirement;
    const summary = `
**需求标题**: ${req.title || '待明确'}

**需求描述**: ${req.description}

**目标用户**: ${req.targetAudience || '待明确'}

**预期成果**: ${req.expectedOutcome || '待明确'}

**优先级**: ${req.priority || 'medium'}

**时间线**: ${req.timeline || '待明确'}

**用户故事**: ${req.userStories?.join('\n- ') || '待明确'}

**验收标准**: ${req.acceptanceCriteria?.join('\n- ') || '待明确'}
    `.trim();

    return summary;
  }

  /**
   * 添加消息到对话历史
   */
  private addMessage(role: 'assistant' | 'user', content: string, questionType?: 'clarification' | 'confirmation' | 'detail'): void {
    this.context.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      questionType
    });
  }

  /**
   * 获取当前上下文
   */
  getContext(): ClarificationContext {
    return { ...this.context };
  }

  /**
   * 获取完整的需求信息
   */
  getRequirement(): RequirementInput | null {
    if (this.context.phase === 'completed') {
      return this.context.currentRequirement as RequirementInput;
    }
    return null;
  }
}

export default RequirementClarifierAgent;