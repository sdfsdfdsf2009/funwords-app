import { useState, useCallback, useEffect, useRef } from 'react';
import { errorMonitor } from '../utils/errorMonitor';

// 验证规则接口
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// 字段验证配置接口
export interface FieldValidation {
  [fieldName: string]: ValidationRule;
}

// 表单状态接口
export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  submitCount: number;
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  firstError?: string;
}

// Hook选项接口
interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  showErrorSummary?: boolean;
  focusFirstError?: boolean;
  scrollOnError?: boolean;
  debounceMs?: number;
}

/**
 * 表单验证Hook
 */
export function useFormValidation<T extends Record<string, any> = Record<string, any>>(
  initialValues: T,
  validationRules: FieldValidation,
  options: UseFormValidationOptions = {}
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    showErrorSummary = true,
    focusFirstError = true,
    scrollOnError = true,
    debounceMs = 300
  } = options;

  const [formState, setFormState] = useState<FormState>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
    submitCount: 0
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  // 清理防抖
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // 安全的状态更新
  const safeSetFormState = useCallback((updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  }, []);

  // 验证单个字段
  const validateField = useCallback((
    fieldName: string,
    value: any,
    rules?: ValidationRule
  ): string | null => {
    const fieldRules = rules || validationRules[fieldName];
    if (!fieldRules) return null;

    // 必填验证
    if (fieldRules.required) {
      if (value === null || value === undefined || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        return fieldRules.message || `${fieldName}是必填项`;
      }
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        return fieldRules.message || `${fieldName}至少需要${fieldRules.minLength}个字符`;
      }

      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        return fieldRules.message || `${fieldName}不能超过${fieldRules.maxLength}个字符`;
      }
    }

    // 数组长度验证
    if (Array.isArray(value)) {
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        return fieldRules.message || `${fieldName}至少需要选择${fieldRules.minLength}项`;
      }

      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        return fieldRules.message || `${fieldName}不能超过${fieldRules.maxLength}项`;
      }
    }

    // 正则表达式验证
    if (fieldRules.pattern && typeof value === 'string') {
      if (!fieldRules.pattern.test(value)) {
        return fieldRules.message || `${fieldName}格式不正确`;
      }
    }

    // 自定义验证
    if (fieldRules.custom) {
      const customError = fieldRules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }, [validationRules]);

  // 验证整个表单
  const validateForm = useCallback((
    values?: Record<string, any>,
    rules?: FieldValidation
  ): ValidationResult => {
    const formValues = values || formState.values;
    const formRules = rules || validationRules;
    const errors: Record<string, string> = {};
    let firstError: string | undefined;

    Object.entries(formRules).forEach(([fieldName, fieldRules]) => {
      const error = validateField(fieldName, formValues[fieldName], fieldRules);
      if (error) {
        errors[fieldName] = error;
        if (!firstError) {
          firstError = error;
        }
      }
    });

    const isValid = Object.keys(errors).length === 0;

    // 记录验证结果
    errorMonitor.logUserAction('form-validation', 'complete', {
      fieldCount: Object.keys(formRules).length,
      errorCount: Object.keys(errors).length,
      isValid,
      firstError
    });

    return {
      isValid,
      errors,
      firstError
    };
  }, [formState.values, validationRules, validateField]);

  // 更新字段值
  const setFieldValue = useCallback((
    fieldName: string,
    value: any,
    validate: boolean = validateOnChange
  ) => {
    const newValues = { ...formState.values, [fieldName]: value };
    const newTouched = { ...formState.touched, [fieldName]: true };

    let newErrors = { ...formState.errors };

    // 验证字段
    if (validate && (formState.touched[fieldName] || validateOnChange)) {
      const error = validateField(fieldName, value);
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
    }

    // 防抖验证
    if (validateOnChange && debounceMs > 0) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const validationResult = validateField(fieldName, value);
        safeSetFormState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            [fieldName]: validationResult || undefined
          }
        }));
      }, debounceMs);

      // 立即更新值和触摸状态
      safeSetFormState({
        values: newValues,
        touched: newTouched
      });
    } else {
      // 立即验证
      safeSetFormState({
        values: newValues,
        touched: newTouched,
        errors: newErrors
      });
    }

    // 记录字段变化
    errorMonitor.logUserAction('form-field', 'change', {
      fieldName,
      value: typeof value === 'string' ? value.substring(0, 100) : value,
      validate
    });
  }, [
    formState.values,
    formState.touched,
    formState.errors,
    validateOnChange,
    debounceMs,
    validateField,
    safeSetFormState
  ]);

  // 批量更新字段值
  const setFieldValues = useCallback((
    values: Partial<T>,
    validate: boolean = true
  ) => {
    const newValues = { ...formState.values, ...values };
    const newTouched = { ...formState.touched };
    const newErrors = { ...formState.errors };

    // 标记所有更新的字段为已触摸
    Object.keys(values).forEach(fieldName => {
      newTouched[fieldName] = true;

      if (validate) {
        const error = validateField(fieldName, values[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
      }
    });

    safeSetFormState({
      values: newValues,
      touched: newTouched,
      errors: newErrors
    });

    // 记录批量更新
    errorMonitor.logUserAction('form-fields', 'batch-change', {
      fieldCount: Object.keys(values).length,
      validate
    });
  }, [formState.values, formState.touched, formState.errors, validateField, safeSetFormState]);

  // 处理字段失焦
  const handleFieldBlur = useCallback((
    fieldName: string,
    validate: boolean = validateOnBlur
  ) => {
    if (validate) {
      const error = validateField(fieldName, formState.values[fieldName]);
      safeSetFormState(prev => ({
        ...prev,
        touched: { ...prev.touched, [fieldName]: true },
        errors: {
          ...prev.errors,
          [fieldName]: error || undefined
        }
      }));
    } else {
      safeSetFormState(prev => ({
        ...prev,
        touched: { ...prev.touched, [fieldName]: true }
      }));
    }

    errorMonitor.logUserAction('form-field', 'blur', {
      fieldName,
      validate
    });
  }, [
    formState.values,
    validateOnBlur,
    validateField,
    safeSetFormState
  ]);

  // 提交表单
  const handleSubmit = useCallback(async (
    onSubmit: (values: T) => void | Promise<void>,
    customValidation?: FieldValidation
  ) => {
    safeSetFormState({ isSubmitting: true });

    try {
      // 验证表单
      const validationResult = validateForm(formState.values, customValidation);

      if (!validationResult.isValid && validateOnSubmit) {
        safeSetFormState({
          isSubmitting: false,
          submitCount: formState.submitCount + 1,
          errors: validationResult.errors
        });

        // 记录提交失败
        errorMonitor.logUserAction('form-submit', 'validation-error', {
          errorCount: Object.keys(validationResult.errors).length,
          errors: validationResult.errors
        });

        // 聚焦第一个错误字段
        if (focusFirstError && validationResult.firstError) {
          const firstErrorField = Object.keys(validationResult.errors)[0];
          const element = fieldRefs.current[firstErrorField];
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }

        // 滚动到错误区域
        if (scrollOnError) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        throw new Error('表单验证失败');
      }

      // 记录提交成功
      errorMonitor.logUserAction('form-submit', 'success', {
        fieldCount: Object.keys(formState.values).length
      });

      // 执行提交回调
      await onSubmit(formState.values);

      safeSetFormState({
        isSubmitting: false,
        submitCount: formState.submitCount + 1,
        isValid: true
      });

    } catch (error) {
      safeSetFormState({
        isSubmitting: false,
        submitCount: formState.submitCount + 1,
        isValid: false
      });

      throw error;
    }
  }, [
    formState.values,
    formState.submitCount,
    validateForm,
    validateOnSubmit,
    focusFirstError,
    scrollOnError,
    safeSetFormState
  ]);

  // 重置表单
  const resetForm = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;

    safeSetFormState({
      values: resetValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      submitCount: 0
    });

    errorMonitor.logUserAction('form-reset', 'complete', {
      hasNewValues: !!newValues,
      fieldCount: Object.keys(resetValues).length
    });
  }, [initialValues, safeSetFormState]);

  // 清除错误
  const clearErrors = useCallback((fieldNames?: string[]) => {
    if (fieldNames) {
      const newErrors = { ...formState.errors };
      fieldNames.forEach(fieldName => {
        delete newErrors[fieldName];
      });

      safeSetFormState({ errors: newErrors });
    } else {
      safeSetFormState({ errors: {} });
    }

    errorMonitor.logUserAction('form-clear-errors', 'complete', {
      fieldNames,
      clearAll: !fieldNames
    });
  }, [formState.errors, safeSetFormState]);

  // 设置字段引用
  const setFieldRef = useCallback((fieldName: string, element: HTMLElement | null) => {
    fieldRefs.current[fieldName] = element;
  }, []);

  // 检查字段是否有效
  const isFieldValid = useCallback((fieldName: string) => {
    return !formState.errors[fieldName];
  }, [formState.errors]);

  // 检查字段是否被触摸过
  const isFieldTouched = useCallback((fieldName: string) => {
    return !!formState.touched[fieldName];
  }, [formState.touched]);

  // 检查字段是否有错误
  const hasFieldError = useCallback((fieldName: string) => {
    return !!formState.errors[fieldName];
  }, [formState.errors]);

  // 获取字段错误消息
  const getFieldError = useCallback((fieldName: string) => {
    return formState.errors[fieldName] || '';
  }, [formState.errors]);

  // 计算表单有效性
  useEffect(() => {
    const hasErrors = Object.keys(formState.errors).length > 0;
    const isTouched = Object.keys(formState.touched).length > 0;

    const isValid = !hasErrors || !isTouched;
    if (isValid !== formState.isValid) {
      safeSetFormState({ isValid });
    }
  }, [formState.errors, formState.touched, formState.isValid, safeSetFormState]);

  return {
    // 状态
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    submitCount: formState.submitCount,
    hasErrors: Object.keys(formState.errors).length > 0,
    isDirty: Object.keys(formState.touched).length > 0,

    // 方法
    setFieldValue,
    setFieldValues,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    clearErrors,
    validateField,
    validateForm,

    // 辅助方法
    setFieldRef,
    isFieldValid,
    isFieldTouched,
    hasFieldError,
    getFieldError,

    // 工具
    getFieldProps: (fieldName: string) => ({
      value: formState.values[fieldName],
      onChange: (e: any) => {
        const value = e?.target?.type === 'checkbox' ? e.target.checked :
                     e?.target?.type === 'file' ? e.target.files :
                     e?.target?.value ?? e;
        setFieldValue(fieldName, value);
      },
      onBlur: () => handleFieldBlur(fieldName),
      ref: (element: HTMLElement | null) => setFieldRef(fieldName, element),
      error: hasFieldError(fieldName),
      helperText: hasFieldError(fieldName) ? getFieldError(fieldName) : ''
    })
  };
}

/**
 * 常用验证规则
 */
export const ValidationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || '此字段为必填项'
  }),

  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || '请输入有效的邮箱地址'
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: /^1[3-9]\d{9}$/,
    message: message || '请输入有效的手机号码'
  }),

  url: (message?: string): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message: message || '请输入有效的URL地址'
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `最少需要${min}个字符`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `不能超过${max}个字符`
  }),

  number: (message?: string): ValidationRule => ({
    pattern: /^\d+$/,
    message: message || '请输入数字'
  }),

  positiveNumber: (message?: string): ValidationRule => ({
    pattern: /^[1-9]\d*$/,
    message: message || '请输入正数'
  }),

  alphaNumeric: (message?: string): ValidationRule => ({
    pattern: /^[a-zA-Z0-9]+$/,
    message: message || '只能包含字母和数字'
  }),

  chineseName: (message?: string): ValidationRule => ({
    pattern: /^[\u4e00-\u9fa5]{2,10}$/,
    message: message || '请输入2-10个中文字符'
  }),

  password: (message?: string): ValidationRule => ({
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message: message || '密码至少8位，包含大小写字母和数字'
  }),

  confirmPassword: (passwordFieldName: string, message?: string): ValidationRule => ({
    custom: (value: any, allValues: any) => {
      if (value !== allValues[passwordFieldName]) {
        return message || '两次输入的密码不一致';
      }
      return null;
    }
  })
};

export default useFormValidation;