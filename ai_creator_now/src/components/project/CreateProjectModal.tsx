import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, Calendar, Lightbulb, AlertCircle } from 'lucide-react';
import UserFriendlyError from '../ui/UserFriendlyError';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, description?: string) => Promise<void>;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  description: string;
}

interface ValidationError {
  field: 'name' | 'description';
  message: string;
}

// 项目模板
const PROJECT_TEMPLATES = [
  {
    name: '营销视频',
    description: '用于产品营销的短视频内容',
    icon: '📱'
  },
  {
    name: '产品演示',
    description: '产品功能展示和使用指南',
    icon: '🎯'
  },
  {
    name: '教程视频',
    description: '操作教程和技能培训内容',
    icon: '📚'
  },
  {
    name: '品牌宣传',
    description: '品牌形象和文化传播',
    icon: '🏢'
  },
  {
    name: '活动记录',
    description: '会议、活动和精彩瞬间',
    icon: '🎬'
  }
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: ''
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitError, setSubmitError] = useState<Error | string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 重置表单状态
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', description: '' });
      setValidationErrors([]);
      setShowSuggestions(false);
      setSubmitError(null);
      // 聚焦到名称输入框
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // ESC键关闭模态框
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isLoading]);

  // 验证项目名称
  const validateName = (name: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!name.trim()) {
      errors.push({
        field: 'name',
        message: '项目名称不能为空'
      });
      return errors;
    }

    if (name.length > 50) {
      errors.push({
        field: 'name',
        message: `项目名称不能超过50个字符，当前${name.length}个字符`
      });
    }

    // 检查无效字符
    const invalidChars = /[<>{}[\]\\]/;
    if (invalidChars.test(name)) {
      errors.push({
        field: 'name',
        message: '项目名称包含无效字符，请使用中文、英文、数字、空格、连字符或下划线'
      });
    }

    return errors;
  };

  // 处理名称输入
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({ ...prev, name }));

    // 实时验证
    const errors = validateName(name);
    const nameErrors = errors.filter(error => error.field === 'name');
    setValidationErrors(prev => [
      ...prev.filter(error => error.field !== 'name'),
      ...nameErrors
    ]);
  };

  // 处理描述输入
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const description = e.target.value;
    setFormData(prev => ({ ...prev, description }));
  };

  // 应用模板
  const applyTemplate = (template: typeof PROJECT_TEMPLATES[0]) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });

    setFormData({
      name: `${template.name} - ${dateStr}`,
      description: template.description
    });
    setShowSuggestions(false);

    // 聚焦到描述字段
    setTimeout(() => {
      const descInput = document.getElementById('project-description') as HTMLTextAreaElement;
      descInput?.focus();
    }, 100);
  };

  // 提交创建项目
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateName(formData.name);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitError(null);
    try {
      await onCreateProject(formData.name.trim(), formData.description.trim());
      // 成功后父组件会关闭模态框
    } catch (error) {
      // 使用用户友好的错误处理
      setSubmitError(error instanceof Error ? error : String(error));
    }
  };

  // 重试创建项目
  const handleRetry = async () => {
    if (submitError) {
      setSubmitError(null);
      await handleSubmit(new Event('submit') as any);
    }
  };

  // 关闭模态框
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // 获取字符计数样式
  const getCharCountStyle = () => {
    const length = formData.name.length;
    if (length > 50) return 'text-red-500';
    if (length > 40) return 'text-yellow-500';
    return 'text-gray-500';
  };

  // 获取提交按钮状态
  const getSubmitButtonState = () => {
    if (isLoading) return { disabled: true, text: '创建中...' };
    if (!formData.name.trim()) return { disabled: true, text: '创建项目' };
    if (validationErrors.some(e => e.field === 'name')) return { disabled: true, text: '创建项目' };
    return { disabled: false, text: '创建项目' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">创建新项目</h2>
              <p className="text-sm text-gray-500">开始您的视频创作之旅</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 项目名称 */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                id="project-name"
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="例如：营销视频 - 11月17日"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isLoading}
                maxLength={50}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm">
                <span className={getCharCountStyle()}>
                  {formData.name.length}/50
                </span>
              </div>
            </div>

            {/* 名称建议 */}
            {formData.name.length === 0 && (
              <div className="mt-2 flex items-start space-x-2">
                <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    需要灵感？试试这些模板
                  </button>
                </div>
              </div>
            )}

            {/* 模板建议 */}
            {showSuggestions && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {PROJECT_TEMPLATES.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left"
                  >
                    <span className="text-lg">{template.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {template.description}
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            {/* 错误提示 */}
            {validationErrors
              .filter(error => error.field === 'name')
              .map((error, index) => (
                <div key={index} className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error.message}</span>
                </div>
              ))}
          </div>

          {/* 项目描述 */}
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-2">
              项目描述 <span className="text-gray-400">（可选）</span>
            </label>
            <textarea
              id="project-description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="简单描述一下这个项目的内容和目标..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              disabled={isLoading}
              maxLength={200}
            />
            <div className="mt-1 text-xs text-gray-500">
              {formData.description.length}/200
            </div>
          </div>

          {/* 快速提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">💡 专业提示</p>
                <p>一个清晰的项目名称和描述能帮助您更好地组织和管理创作内容。创建项目后，您可以随时添加场景并开始AI生成。</p>
              </div>
            </div>
          </div>
        </form>

        {/* Error Display */}
        {submitError && (
          <div className="px-6 pb-4">
            <UserFriendlyError
              error={submitError}
              context="项目创建"
              onRetry={handleRetry}
              onDismiss={() => setSubmitError(null)}
              showDetails={true}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={getSubmitButtonState().disabled}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
            )}
            {getSubmitButtonState().text}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;