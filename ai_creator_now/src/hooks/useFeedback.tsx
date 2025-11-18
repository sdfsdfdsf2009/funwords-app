import { useCallback } from 'react';
import { useToastHelpers } from '../components/ui/Toast';
import { useGlobalLoading } from '../components/ui/LoadingIndicator';

// 反馈Hook - 统一管理Toast和Loading状态
export const useFeedback = () => {
  const toast = useToastHelpers();
  const { setGlobalLoading } = useGlobalLoading();

  // 成功反馈
  const success = useCallback((title: string, message?: string) => {
    toast.success(title, message);
  }, [toast]);

  // 错误反馈
  const error = useCallback((title: string, message?: string, persistent = true) => {
    toast.error(title, message, { persistent });
  }, [toast]);

  // 警告反馈
  const warning = useCallback((title: string, message?: string) => {
    toast.warning(title, message);
  }, [toast]);

  // 信息反馈
  const info = useCallback((title: string, message?: string) => {
    toast.info(title, message);
  }, [toast]);

  // 加载状态
  const loading = useCallback((show: boolean, message?: string) => {
    setGlobalLoading(show, message);
  }, [setGlobalLoading]);

  // 异步操作包装器 - 自动处理loading和错误状态
  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T | null> => {
    const {
      loadingMessage = '处理中...',
      successMessage,
      errorMessage = '操作失败',
      onSuccess,
      onError
    } = options;

    try {
      loading(true, loadingMessage);
      const result = await operation();

      if (successMessage) {
        success(successMessage);
      }

      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      error(errorMessage, error.message);
      onError?.(error);
      return null;
    } finally {
      loading(false);
    }
  }, [loading, success, error]);

  // 文件操作反馈
  const fileOperation = useCallback({
    upload: (fileName: string) => success('上传成功', `文件 ${fileName} 已上传`),
    uploadError: (fileName: string, err: Error) => error('上传失败', `文件 ${fileName} 上传失败: ${err.message}`),
    download: (fileName: string) => success('下载成功', `文件 ${fileName} 已下载`),
    downloadError: (fileName: string, err: Error) => error('下载失败', `文件 ${fileName} 下载失败: ${err.message}`),
    delete: (itemName: string) => success('删除成功', `${itemName} 已删除`),
    deleteError: (itemName: string, err: Error) => error('删除失败', `删除 ${itemName} 失败: ${err.message}`)
  }, [success, error]);

  // 表单操作反馈
  const formOperation = useCallback({
    submit: (formName: string) => success('提交成功', `${formName} 已保存`),
    submitError: (formName: string, err: Error) => error('提交失败', `保存 ${formName} 失败: ${err.message}`),
    validate: (fieldName: string) => warning('验证失败', `${fieldName} 格式不正确`),
    required: (fieldName: string) => warning('必填项', `${fieldName} 是必填项`)
  }, [success, error, warning]);

  // API操作反馈
  const apiOperation = useCallback({
    success: (action: string) => success('操作成功', `${action} 已完成`),
    error: (action: string, err: Error) => error('API错误', `${action} 失败: ${err.message}`),
    networkError: (action: string) => error('网络错误', `${action} 失败，请检查网络连接`),
    unauthorized: (action: string) => warning('权限不足', `您没有权限执行 ${action}`),
    rateLimit: (action: string) => warning('请求频繁', `${action} 请求过于频繁，请稍后再试`),
    serverError: (action: string) => error('服务器错误', `${action} 失败，服务器出现错误`)
  }, [success, error, warning]);

  // CSV操作反馈
  const csvOperation = useCallback({
    import: (rowCount: number) => success('导入成功', `已导入 ${rowCount} 条记录`),
    importError: (err: Error) => error('导入失败', `CSV导入失败: ${err.message}`),
    export: () => success('导出成功', '数据已导出'),
    exportError: (err: Error) => error('导出失败', `数据导出失败: ${err.message}`),
    invalidFormat: (details: string) => error('格式错误', `CSV格式不正确: ${details}`),
    duplicateData: (count: number) => warning('重复数据', `发现 ${count} 条重复数据`)
  }, [success, error, warning]);

  // 图片/视频生成反馈
  const generationOperation = useCallback({
    start: (type: string) => info('开始生成', `正在${type}，请稍候...`),
    progress: (type: string, progress: number) => info('生成中', `${type}进度: ${progress}%`),
    success: (type: string, count: number) => success('生成完成', `已${type} ${count} 个`),
    error: (type: string, err: Error) => error('生成失败', `${type}失败: ${err.message}`),
    queueFull: (type: string) => warning('队列已满', `${type}队列已满，请稍后再试`),
    insufficientCredits: (type: string) => warning('余额不足', `账户余额不足，无法${type}`)
  }, [info, success, error, warning]);

  // 项目操作反馈
  const projectOperation = useCallback({
    create: (name: string) => success('创建成功', `项目 ${name} 已创建`),
    createError: (name: string, err: Error) => error('创建失败', `创建项目 ${name} 失败: ${err.message}`),
    save: (name: string) => success('保存成功', `项目 ${name} 已保存`),
    saveError: (name: string, err: Error) => error('保存失败', `保存项目 ${name} 失败: ${err.message}`),
    delete: (name: string) => success('删除成功', `项目 ${name} 已删除`),
    deleteError: (name: string, err: Error) => error('删除失败', `删除项目 ${name} 失败: ${err.message}`),
    load: (name: string) => success('加载成功', `项目 ${name} 已加载`),
    loadError: (name: string, err: Error) => error('加载失败', `加载项目 ${name} 失败: ${err.message}`)
  }, [success, error]);

  return {
    // 基础反馈方法
    success,
    error,
    warning,
    info,
    loading,
    withLoading,

    // 专项操作反馈
    fileOperation,
    formOperation,
    apiOperation,
    csvOperation,
    generationOperation,
    projectOperation
  };
};

export default useFeedback;